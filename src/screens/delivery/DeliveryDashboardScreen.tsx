import React, { useEffect, useState } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet, Alert, TouchableOpacity, Platform, SafeAreaView, StatusBar } from 'react-native';
import { Text, Card, Button, ActivityIndicator, Badge, Divider, Chip, Portal, Modal, RadioButton, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { deliveryService, DeliverySchedule } from '../../services/deliveryService';
import { pickupPointService } from '../../services/pickupPointService';
import { notificationService } from '../../services/notificationService';
import { PickupPoint } from '../../types';
import { useDeliveryRealtime } from '../../hooks/useDeliveryRealtime';
import { AppHeader, AlertModal, SuccessCelebration } from '../../components';
import { formatDate } from '../../utils/regionalFormatting';
import { useTranslation } from 'react-i18next';

// Translation strings (English)
// Redundant TEXT constant removed in favor of t()

const DeliveryDashboardScreen = () => {
    const navigation = useNavigation<any>();
    const { t, i18n } = useTranslation();
    const { user } = useAuthStore();

    // Language switcher handler
    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'ta' : 'en';
        i18n.changeLanguage(newLang);
    };
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [schedules, setSchedules] = useState<DeliverySchedule[]>([]);
    const [assignedPickupPoints, setAssignedPickupPoints] = useState<(PickupPoint & { parcelCount: number, pendingCount: number })[]>([]);
    const [confirmingPickup, setConfirmingPickup] = useState(false);

    // New Modal State
    const [confirmModalVisible, setConfirmModalVisible] = useState(false);
    const [successModalVisible, setSuccessModalVisible] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [pickupToConfirm, setPickupToConfirm] = useState<{ id: string, name: string } | null>(null);
    const [scheduleToConfirm, setScheduleToConfirm] = useState<DeliverySchedule | null>(null);
    const [actionType, setActionType] = useState<'single' | 'bulk'>('bulk');

    // Filter State
    const [selectedPickupId, setSelectedPickupId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'in_transit' | 'delivered'>('all');
    const [deliveryTypeFilter, setDeliveryTypeFilter] = useState<'all' | 'pickup' | 'home'>('all');

    // Bulk Notification State
    const [bulkModalVisible, setBulkModalVisible] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<'STARTED' | 'REACHED' | 'DELAY'>('STARTED');
    const [sendingBulk, setSendingBulk] = useState(false);

    // Notification templates
    const NOTIFICATION_TEMPLATES = {
        STARTED: t('delivery.templates.started'),
        REACHED: t('delivery.templates.reached'),
        DELAY: t('delivery.templates.delay'),
    };

    // Enable realtime updates
    // useDeliveryRealtime(user?.id || ''); // Logic moved below loadData

    const loadData = async () => {
        try {
            // No full loader on refresh/realtime mostly, but we trigger it initially
            // If refreshing, don't show full screen loader
            if (!refreshing && loading) setLoading(true);

            // 1. Get delivery schedules for this partner
            if (user?.id) {
                const mySchedules = await deliveryService.getDeliverySchedules({
                    delivery_partner_id: user.id
                });

                setSchedules(mySchedules);

                mySchedules.forEach(s => {
                    if (s.pickup_point_id) {
                        const isAtive = s.status !== 'delivered' && s.status !== 'canceled';
                        const isPending = ['scheduled', 'accepted', 'picked_up'].includes(s.status);

                        // Use a composite key or just track counts in the map value
                        // Since Map values are primitives (number), we need an object or separate map
                        // But since we are rebuilding the array anyway, let's use an object map
                    }
                });

                // Better approach with object map
                const pickupDataMap = new Map<string, { total: number, pending: number }>();

                mySchedules.forEach(s => {
                    if (s.pickup_point_id) {
                        const isAtive = s.status !== 'delivered' && s.status !== 'canceled';
                        const isPending = ['scheduled', 'accepted', 'picked_up'].includes(s.status);

                        if (!pickupDataMap.has(s.pickup_point_id)) {
                            pickupDataMap.set(s.pickup_point_id, { total: 0, pending: 0 });
                        }

                        const data = pickupDataMap.get(s.pickup_point_id)!;

                        if (isAtive) {
                            data.total += 1;
                        }
                        if (isPending) {
                            data.pending += 1;
                        }
                    }
                });

                const pickupPointIds = [...pickupDataMap.keys()];
                const points: (PickupPoint & { parcelCount: number, pendingCount: number })[] = [];

                for (const id of pickupPointIds) {
                    const data = pickupDataMap.get(id)!;
                    // Only include if there are ACTIVE parcels
                    if (data.total > 0) {
                        const point = await pickupPointService.getPickupPointById(id);
                        if (point) {
                            points.push({
                                ...point,
                                parcelCount: data.total,
                                pendingCount: data.pending
                            });
                        }
                    }
                }
                setAssignedPickupPoints(points);
            } else {
                setSchedules([]);
            }

        } catch (error) {
            console.error('Error loading dashboard:', error);
            Alert.alert(t('common.error'), t('errors.failedToLoad'));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleBulkSend = async () => {
        if (!selectedPickupId || !user?.id) return;

        try {
            setSendingBulk(true);
            const templateMessage = NOTIFICATION_TEMPLATES[selectedTemplate];

            const result = await notificationService.sendBulkNotification(
                selectedPickupId,
                'Delivery Update',
                templateMessage,
                user.id
            );

            setBulkModalVisible(false);

            if (result.successCount > 0) {
                Alert.alert(t('common.success'), `${t('delivery.bulkSuccess')}\n(${result.successCount}/${result.recipientCount} sent)`);
            } else {
                Alert.alert(t('common.information'), t('delivery.noUsersToNotify'));
            }

        } catch (error: any) {
            Alert.alert(t('common.error'), error.message || t('errors.somethingWentWrong'));
        } finally {
            setSendingBulk(false);
        }
    };

    const handleConfirmPickup = (pickupPointId: string, pickupPointName: string) => {
        setActionType('bulk');
        setPickupToConfirm({ id: pickupPointId, name: pickupPointName });
        setScheduleToConfirm(null);
        setConfirmModalVisible(true);
    };

    const handleSingleUpdate = (schedule: DeliverySchedule) => {
        setActionType('single');
        setScheduleToConfirm(schedule);
        setPickupToConfirm(null);
        setConfirmModalVisible(true);
    };

    const performPickupConfirmation = async () => {
        if (!user?.id) return;
        if (actionType === 'bulk' && !pickupToConfirm) return;
        if (actionType === 'single' && !scheduleToConfirm) return;

        try {
            setConfirmingPickup(true);
            setConfirmModalVisible(false);

            let successCount = 0;
            let failedCount = 0;

            if (actionType === 'bulk' && pickupToConfirm) {
                const result = await deliveryService.confirmPickupPoint(
                    pickupToConfirm.id,
                    user.id
                );
                successCount = result.successCount;
                failedCount = result.failedCount;
            } else if (actionType === 'single' && scheduleToConfirm) {
                try {
                    const nextStatus = (scheduleToConfirm.status === 'picked_up' || scheduleToConfirm.status === 'in_transit') ? 'delivered' : 'picked_up';
                    console.log(`🚚 [DeliveryDashboard] Updating single order ${scheduleToConfirm.id} from ${scheduleToConfirm.status} to ${nextStatus}`);

                    await deliveryService.updateDeliverySchedule(scheduleToConfirm.id, {
                        status: nextStatus
                    });
                    successCount = 1;
                } catch (err) {
                    failedCount = 1;
                    console.error('Error updating single schedule:', err);
                }
            }

            if (successCount > 0) {
                const isDelivered = (scheduleToConfirm?.status === 'picked_up' || scheduleToConfirm?.status === 'in_transit');
                const nextStatusLabel = isDelivered ? 'delivered' : 'picked up';

                // Only show celebration for 'delivered' status
                if (isDelivered || actionType === 'bulk') {
                    setSuccessMessage(
                        actionType === 'bulk'
                            ? t('delivery.ordersConfirmed', { count: successCount })
                            : t('delivery.orderDeliveredSuccess', { id: scheduleToConfirm?.order?.id.slice(0, 8).toUpperCase() })
                    );
                    setSuccessModalVisible(true);
                }

                loadData();
            } else if (failedCount > 0) {
                Alert.alert(
                    t('errors.updateFailed'),
                    actionType === 'bulk'
                        ? t('errors.failedToUpdateOrders')
                        : `${t('errors.failedToUpdateOrder')} #${scheduleToConfirm?.order?.id.slice(0, 8)}`
                );
            } else {
                Alert.alert(t('common.information'), t('deliveryDashboard.noOrdersUpdated'));
            }
        } catch (error: any) {
            Alert.alert(t('common.error'), error.message || t('errors.somethingWentWrong'));
        } finally {
            setConfirmingPickup(false);
            setPickupToConfirm(null);
            setScheduleToConfirm(null);
        }
    };

    const renderStatusBadge = (status: string) => {
        switch (status) {
            case 'scheduled':
            case 'accepted':
                return <Badge style={{ backgroundColor: colors.warning[500] }}>{t('delivery.status.scheduled')}</Badge>;
            case 'picked_up':
            case 'in_transit':
                return <Badge style={{ backgroundColor: colors.info[500] }}>{t('delivery.status.in_transit')}</Badge>;
            case 'delivered':
                return <Badge style={{ backgroundColor: colors.success[500] }}>{t('delivery.status.delivered')}</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    };

    const renderPaymentBadge = (method?: string) => {
        if (method === 'cod') {
            return (
                <View style={[styles.paymentBadge, { backgroundColor: colors.error[50], borderColor: colors.error[200] }]}>
                    <Icon name="cash" size={12} color={colors.error[700]} />
                    <Text style={[styles.paymentText, { color: colors.error[700] }]}>COD</Text>
                </View>
            );
        } else if (method === 'online') {
            return (
                <View style={[styles.paymentBadge, { backgroundColor: colors.success[50], borderColor: colors.success[200] }]}>
                    <Icon name="credit-card-check" size={12} color={colors.success[700]} />
                    <Text style={[styles.paymentText, { color: colors.success[700] }]}>PAID</Text>
                </View>
            );
        }
        return null;
    };

    // Filter Logic
    let displayedSchedules = [...schedules];

    // Filter by Pickup Point
    if (selectedPickupId) {
        displayedSchedules = displayedSchedules.filter(s => s.pickup_point_id === selectedPickupId);
    }

    // Filter by Status
    if (statusFilter !== 'all') {
        if (statusFilter === 'in_transit') {
            displayedSchedules = displayedSchedules.filter(s => s.status === 'in_transit' || s.status === 'picked_up');
        } else {
            displayedSchedules = displayedSchedules.filter(s => s.status === statusFilter);
        }
    }

    // Filter by Type
    if (deliveryTypeFilter === 'pickup') {
        displayedSchedules = displayedSchedules.filter(s =>
            s.order?.delivery_method === 'pickup' || (!s.order?.delivery_address && !s.order?.delivery_method)
        );
    } else if (deliveryTypeFilter === 'home') {
        displayedSchedules = displayedSchedules.filter(s =>
            s.order?.delivery_method === 'home' || (!!s.order?.delivery_address && !s.order?.delivery_method)
        );
    }

    if (loading && !refreshing) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary[500]} />
            </View>
        );
    }

    return (
        <View style={styles.container}>

            {/* Premium Header */}
            <AppHeader
                title={t('deliveryDashboard.title')}
                showCart={false}
                rightAction={
                    <TouchableOpacity
                        onPress={toggleLanguage}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: 'rgba(255,255,255,0.15)',
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 20,
                            borderWidth: 1,
                            borderColor: 'rgba(255,255,255,0.1)',
                            marginRight: 8,
                        }}
                        activeOpacity={0.7}
                    >
                        <Icon name="translate" size={18} color="#FFFFFF" />
                        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700', marginLeft: 4 }}>
                            {i18n.language.startsWith('en') ? 'TA' : 'EN'}
                        </Text>
                    </TouchableOpacity>
                }
            >
                <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
                    <View style={{ marginTop: 8 }}>
                        <Text style={{
                            color: 'rgba(255,255,255,0.7)',
                            fontSize: 13,
                            fontWeight: '500',
                            letterSpacing: 0.2
                        }}>
                            {t('deliveryDashboard.greeting', { name: user?.name || 'Partner' })} 👋
                        </Text>
                    </View>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ marginTop: 20 }}
                        contentContainerStyle={{ paddingRight: 20 }}
                    >
                        <TouchableOpacity
                            style={[styles.headerChip, statusFilter === 'all' && styles.headerChipActive]}
                            onPress={() => setStatusFilter('all')}
                        >
                            <Text style={[styles.headerChipText, statusFilter === 'all' && styles.headerChipTextActive]}>{t('common.all')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.headerChip, statusFilter === 'scheduled' && styles.headerChipActive]}
                            onPress={() => setStatusFilter('scheduled')}
                        >
                            <Text style={[styles.headerChipText, statusFilter === 'scheduled' && styles.headerChipTextActive]}>{t('delivery.status.scheduled')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.headerChip, statusFilter === 'in_transit' && styles.headerChipActive]}
                            onPress={() => setStatusFilter('in_transit')}
                        >
                            <Text style={[styles.headerChipText, statusFilter === 'in_transit' && styles.headerChipTextActive]}>{t('delivery.active')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.headerChip, statusFilter === 'delivered' && styles.headerChipActive]}
                            onPress={() => setStatusFilter('delivered')}
                        >
                            <Text style={[styles.headerChipText, statusFilter === 'delivered' && styles.headerChipTextActive]}>{t('delivery.status.delivered')}</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </AppHeader>

            <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary[500]]} />}>
                {assignedPickupPoints.length > 0 && (
                    <View style={styles.section}>
                        <Text variant="titleMedium" style={styles.sectionTitle}>{t('deliveryDashboard.pickupPoints')}</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {assignedPickupPoints.map((point) => (
                                <View
                                    key={point.id}
                                    style={[styles.pickupCard, selectedPickupId === point.id && styles.pickupCardSelected]}
                                >
                                    <TouchableOpacity
                                        style={styles.pickupCardContent}
                                        onPress={() => setSelectedPickupId(point.id === selectedPickupId ? null : point.id)}
                                    >
                                        <View style={styles.pickupHeader}>
                                            <Icon name="map-marker-radius" size={20} color={selectedPickupId === point.id ? colors.primary[500] : colors.neutral[400]} />
                                            <View style={[styles.parcelBadge, { backgroundColor: colors.primary[50] }]}>
                                                <Text style={{ color: colors.primary[700], fontWeight: 'bold', fontSize: 10 }}>{point.parcelCount} {t('common.units')}</Text>
                                            </View>
                                        </View>

                                        <Text style={styles.pickupName} numberOfLines={1}>{point.name}</Text>
                                        <Text style={styles.pickupAddress} numberOfLines={2}>{point.address}</Text>

                                        {point.pendingCount > 0 && (
                                            <Button
                                                mode="contained"
                                                icon="check-all"
                                                style={{ marginTop: 12, borderRadius: 8 }}
                                                buttonColor={colors.primary[600]}
                                                compact
                                                labelStyle={{ fontSize: 11 }}
                                                onPress={(e) => {
                                                    e.stopPropagation();
                                                    handleConfirmPickup(point.id, point.name);
                                                }}
                                            >
                                                {t('delivery.confirm')} ({point.pendingCount})
                                            </Button>
                                        )}

                                        {selectedPickupId === point.id && (
                                            <Button
                                                mode="text"
                                                icon="bell-ring"
                                                style={{ marginTop: 4 }}
                                                textColor={colors.primary[600]}
                                                compact
                                                labelStyle={{ fontSize: 11 }}
                                                onPress={() => setBulkModalVisible(true)}
                                            >
                                                {t('deliveryDashboard.notifications')}
                                            </Button>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                )}

                <View style={[styles.section, { marginBottom: 140 }]}>
                    <View style={styles.sectionHeaderRow}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Icon name="clipboard-list-outline" size={20} color={colors.neutral[700]} style={{ marginRight: 8 }} />
                            <Text variant="titleMedium" style={styles.sectionTitle}>
                                {t('deliveryDashboard.myDeliveries')} ({displayedSchedules.length})
                            </Text>
                        </View>
                        {selectedPickupId && (
                            <TouchableOpacity onPress={() => setSelectedPickupId(null)} style={styles.clearFilterBtn}>
                                <Text style={styles.clearFilterText}>{t('delivery.clear')}</Text>
                                <Icon name="close-circle" size={16} color={colors.error[500]} />
                            </TouchableOpacity>
                        )}
                    </View>

                    {displayedSchedules.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconContainer}>
                                <Icon name="package-variant-closed" size={40} color={colors.neutral[300]} />
                            </View>
                            <Text variant="bodyMedium" style={{ color: colors.neutral[400], marginTop: 12 }}>{t('delivery.noDeliveriesFound')}</Text>
                        </View>
                    ) : (
                        displayedSchedules.map((schedule) => (
                            <View
                                key={schedule.id}
                                style={styles.taskCard}
                            >
                                <TouchableOpacity
                                    style={styles.taskCardContent}
                                    onPress={() => navigation.navigate('DeliveryOrderDetails', { scheduleId: schedule.id })}
                                >
                                    <View style={styles.taskHeader}>
                                        <View>
                                            <Text style={styles.orderId}>{t('delivery.orderNo')}{schedule.order?.id.slice(0, 8) || '???'}</Text>
                                            {renderPaymentBadge(schedule.order?.payment_method)}
                                            <Text style={styles.timeLabel}>{schedule.estimated_time || `${t('delivery.assignedTime')} ${formatDate(schedule.created_at, schedule.order?.country || 'germany')}`}</Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            {renderStatusBadge(schedule.status)}
                                            {(schedule.order?.delivery_method === 'home' || (!!schedule.order?.delivery_address && !schedule.order?.delivery_method)) ? (
                                                <Text style={styles.typeLabelHome}>{t('delivery.homeDelivery')}</Text>
                                            ) : (
                                                <Text style={styles.typeLabelHub}>{t('delivery.pickupPoint')}</Text>
                                            )}
                                        </View>
                                    </View>

                                    <Divider style={{ backgroundColor: colors.neutral[100], marginVertical: 12 }} />

                                    <View style={styles.customerRow}>
                                        <View style={styles.customerAvatar}>
                                            <Text style={{ color: colors.primary[700], fontWeight: 'bold' }}>
                                                {schedule.customer?.name?.charAt(0) || 'C'}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.customerName}>{schedule.customer?.name || t('common.customer')}</Text>
                                            {schedule.pickup_point?.name && (
                                                <Text style={styles.hubName}>
                                                    {t('delivery.via')} {schedule.pickup_point.name}
                                                </Text>
                                            )}
                                        </View>
                                    </View>

                                    <View style={styles.addressContainer}>
                                        <Icon name="map-marker-outline" size={16} color={colors.neutral[400]} style={{ marginTop: 2, marginRight: 4 }} />
                                        <Text style={styles.addressText} numberOfLines={2}>
                                            {schedule.order?.delivery_address || schedule.pickup_point?.address || t('common.latitude') + '/' + t('common.longitude')}
                                        </Text>
                                    </View>

                                    <View style={styles.cardActions}>
                                        <Button
                                            mode="text"
                                            textColor={colors.neutral[500]}
                                            compact
                                            onPress={() => navigation.navigate('DeliveryOrderDetails', { scheduleId: schedule.id })}
                                        >
                                            {t('common.details')}
                                        </Button>

                                        {schedule.status === 'delivered' ? (
                                            <View style={styles.deliveredBadge}>
                                                <Icon name="check" size={14} color="white" />
                                                <Text style={styles.deliveredText}>{t('delivery.status.delivered')}</Text>
                                            </View>
                                        ) : (
                                            <TouchableOpacity
                                                style={[
                                                    styles.deliverBtn,
                                                    schedule.status === 'in_transit' && { backgroundColor: colors.success[600] }
                                                ]}
                                                onPress={() => handleSingleUpdate(schedule)}
                                            >
                                                <Icon
                                                    name={(schedule.status === 'picked_up' || schedule.status === 'in_transit') ? "check-circle" : "truck-delivery"}
                                                    size={16}
                                                    color="white"
                                                    style={{ marginRight: 6 }}
                                                />
                                                <Text style={styles.deliverBtnText}>
                                                    {(schedule.status === 'picked_up' || schedule.status === 'in_transit') ? t('delivery.delivered') : t('delivery.startDelivery')}
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>

            <Portal>
                <Modal visible={bulkModalVisible} onDismiss={() => !sendingBulk && setBulkModalVisible(false)} contentContainerStyle={styles.modalContainer}>
                    <Text variant="titleLarge" style={{ marginBottom: 16, fontWeight: 'bold', color: colors.navy[900] }}>{t('deliveryDashboard.notifications')}</Text>
                    <RadioButton.Group onValueChange={v => setSelectedTemplate(v as any)} value={selectedTemplate}>
                        <View style={styles.radioRow}><RadioButton value="STARTED" color={colors.primary[500]} /><Text>{t('deliveryDashboard.statusOverview') || "Starting Deliveries"}</Text></View>
                        <View style={styles.radioRow}><RadioButton value="REACHED" color={colors.primary[500]} /><Text>{t('deliveryDashboard.pickupPoints')}</Text></View>
                        <View style={styles.radioRow}><RadioButton value="DELAY" color={colors.primary[500]} /><Text>{t('delivery.status.failed')}</Text></View>
                    </RadioButton.Group>
                    <View style={styles.modalActions}>
                        <Button mode="text" onPress={() => setBulkModalVisible(false)} disabled={sendingBulk} textColor={colors.neutral[500]}>{t('common.cancel')}</Button>
                        <Button mode="contained" onPress={handleBulkSend} loading={sendingBulk} disabled={sendingBulk} buttonColor={colors.success[600]} style={{ borderRadius: 8 }}>{t('deliveryDashboard.notifications')}</Button>
                    </View>
                </Modal>
            </Portal>

            {/* Confirmation Modal */}
            <AlertModal
                visible={confirmModalVisible}
                title={actionType === 'bulk' ? t('delivery.updateStatusTitle') : t('delivery.updateStatusTitle')}
                message={
                    actionType === 'bulk'
                        ? t('delivery.updateStatusConfirm')
                        : (scheduleToConfirm?.status === 'picked_up' || scheduleToConfirm?.status === 'in_transit')
                            ? t('delivery.updateStatusConfirm')
                            : t('delivery.updateStatusConfirm')
                }
                onClose={() => setConfirmModalVisible(false)}
                onConfirm={performPickupConfirmation}
                showCancel
                confirmText={t('common.confirm')}
                cancelText={t('common.cancel')}
                type="info"
            />

            {/* Success Modal */}
            <SuccessCelebration
                visible={successModalVisible}
                message={successMessage}
                onComplete={() => setSuccessModalVisible(false)}
            />
        </View >
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Header
    header: {
        backgroundColor: colors.navy[900],
        paddingTop: Platform.OS === 'android' ? 40 : 10,
        paddingBottom: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        zIndex: 10,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    headerTitle: { fontSize: 24, fontWeight: '800', color: 'white', letterSpacing: -0.5 },
    subHeader: { color: colors.primary[200], fontSize: 14, fontWeight: '500' },

    vanSalesBtn: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)'
    },
    vanSalesText: { color: 'white', fontWeight: '600', fontSize: 12, marginLeft: 6 },

    // Filter Chips
    filterContainer: { paddingLeft: 20 },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.white, // Changed to white for light bg
        marginRight: 8,
        borderWidth: 1,
        borderColor: colors.neutral[200], // Changed border
    },
    chipActive: {
        backgroundColor: colors.primary[500],
        borderColor: colors.primary[400],
    },
    chipText: { color: colors.neutral[600], fontWeight: '600', fontSize: 12 }, // Darker text
    chipTextActive: { color: 'white' },
    filterDivider: { width: 1, height: 24, backgroundColor: colors.neutral[200], marginHorizontal: 8, alignSelf: 'center' }, // Darker divider

    content: { padding: 16 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.navy[900], marginBottom: 12 },

    // Pickup Cards
    pickupCard: {
        width: 200,
        marginRight: 12,
        backgroundColor: 'white',
        borderRadius: 16,
        // Shadow for iOS
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        // Elevation for Android
        elevation: 3,
        borderWidth: 2,
        borderColor: 'transparent'
    },
    pickupCardSelected: { borderColor: colors.primary[500], backgroundColor: '#F0FDFF' },
    pickupCardContent: { padding: 12 },
    pickupHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    parcelBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    pickupName: { fontWeight: '700', color: colors.navy[900], fontSize: 14, marginBottom: 2 },
    pickupAddress: { fontSize: 11, color: colors.neutral[500], height: 32 },

    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    clearFilterBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.error[50], paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    clearFilterText: { color: colors.error[500], fontSize: 11, fontWeight: '600', marginRight: 4 },

    // Task Cards
    emptyState: { padding: 40, alignItems: 'center', justifyContent: 'center' },
    emptyIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center' },

    taskCard: {
        marginBottom: 16,
        backgroundColor: 'white',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    taskCardContent: { padding: 16 },
    taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    orderId: { fontSize: 16, fontWeight: '700', color: colors.navy[900] },
    timeLabel: { fontSize: 11, color: colors.neutral[400], marginTop: 2, fontWeight: '500' },
    typeLabelHome: { fontSize: 9, fontWeight: '800', color: colors.warning[600], marginTop: 4, textAlign: 'right' },
    typeLabelHub: { fontSize: 9, fontWeight: '800', color: colors.info[600], marginTop: 4, textAlign: 'right' },

    customerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    customerAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    customerName: { fontSize: 14, fontWeight: '600', color: colors.neutral[800] },
    hubName: { fontSize: 11, color: colors.neutral[500] },

    addressContainer: { flexDirection: 'row', backgroundColor: '#F8FAFC', padding: 8, borderRadius: 8, marginBottom: 16 },
    addressText: { fontSize: 13, color: colors.neutral[600], flex: 1, lineHeight: 18 },

    cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

    // Buttons
    deliverBtn: {
        flexDirection: 'row',
        backgroundColor: colors.success[600],
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 30,
        alignItems: 'center',
        elevation: 2
    },
    deliverBtnText: { color: 'white', fontWeight: '700', fontSize: 13 },

    deliveredBadge: {
        flexDirection: 'row',
        backgroundColor: colors.success[600],
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        alignItems: 'center',
        opacity: 0.8
    },
    deliveredText: { color: 'white', fontWeight: '700', fontSize: 11, marginLeft: 4 },

    // Modal
    modalContainer: { backgroundColor: 'white', padding: 24, margin: 20, borderRadius: 24, elevation: 5 },
    radioRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24, gap: 12 },

    // Header Chips (Dark Background)
    headerChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginRight: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    headerChipActive: {
        backgroundColor: colors.primary[400], // Lighter blue for better contrast on dark
        borderColor: colors.primary[300],
    },
    headerChipText: { color: 'rgba(255,255,255,0.7)', fontWeight: '600', fontSize: 12 },
    headerChipTextActive: { color: 'white' },

    // Payment Badge
    paymentBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginTop: 4,
        marginBottom: 2,
        borderWidth: 1,
        alignSelf: 'flex-start'
    },
    paymentText: {
        fontSize: 10,
        fontWeight: '700',
        marginLeft: 4
    }
});

export default DeliveryDashboardScreen;
