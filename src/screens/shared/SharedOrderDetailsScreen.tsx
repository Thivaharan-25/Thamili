import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, Alert, StatusBar, Platform, Linking } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { RootStackParamList, OrderStatus, DeliveryStatus } from '../../types';
import { QUERY_KEYS } from '../../constants/queryKeys';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { orderService } from '../../services/orderService';
import { userService } from '../../services/userService';
import { pickupPointService, deliveryService } from '../../services';
import { productService } from '../../services/productService';
import { formatItemQuantity, getItemUnitLabel, formatItemSubtotal } from '../../utils/productUtils';
import { useOrderRealtime } from '../../hooks/useOrderRealtime';
import { useOrderPolling } from '../../hooks/useOrderPolling';

import {
    LoadingScreen,
    ErrorMessage,
    OrderStatusUpdate,
    AnimatedView,
    AlertModal,
    AppHeader
} from '../../components';
import AssignmentModal from '../../components/modals/AssignmentModal';
import SuccessModal from '../../components/modals/SuccessModal';

import { colors } from '../../theme';
import { COUNTRIES } from '../../constants';
import type { Country } from '../../constants';
import {
    isTablet,
    getResponsivePadding,
    isSmallDevice,
    isLandscape
} from '../../utils/responsive';
import { formatCurrency, formatDateTime } from '../../utils/regionalFormatting';

const SharedOrderDetailsScreen = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { user, isAuthenticated } = useAuthStore();
    const { selectedCountry } = useCartStore();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();

    // Extract params. We support either orderId or scheduleId
    const orderId = route.params?.orderId;
    const scheduleId = route.params?.scheduleId;

    const userRole = user?.role ? user.role.toLowerCase().trim() : 'customer';
    const country = (isAuthenticated && user?.country_preference)
        ? user.country_preference
        : (selectedCountry || COUNTRIES.GERMANY) as Country;

    // Real-time updates for Admin
    if (userRole === 'admin') {
        useOrderRealtime(user?.id || '');
    }

    // Modals state
    const [assignmentModalVisible, setAssignmentModalVisible] = useState(false);
    const [successModalVisible, setSuccessModalVisible] = useState(false);
    const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [requestedStatus, setRequestedStatus] = useState<OrderStatus | undefined>(undefined);

    const isTabletDevice = isTablet();
    const padding = getResponsivePadding();

    // 1. If we only have scheduleId (from Delivery Dashboard), fetch schedule first to get orderId
    const { data: initialSchedule, isLoading: loadingInitialSchedule } = useQuery({
        queryKey: QUERY_KEYS.deliverySchedule(scheduleId!),
        queryFn: () => deliveryService.getDeliveryScheduleById(scheduleId!),
        enabled: !!scheduleId && !orderId,
    });

    const effectiveOrderId = orderId || initialSchedule?.order_id;
    console.log('🔍 [SharedOrderDetails] User Role:', userRole);
    console.log('🔍 [SharedOrderDetails] Order ID:', effectiveOrderId);
    console.log('🔍 [SharedOrderDetails] Schedule ID:', scheduleId);

    // 2. Fetch Order
    const { data: order, isLoading: loadingOrder, error: orderError } = useQuery({
        queryKey: QUERY_KEYS.order(effectiveOrderId!),
        queryFn: () => orderService.getOrderById(effectiveOrderId!),
        enabled: !!effectiveOrderId,
    });

    // Polling for customer (like original OrderDetailsScreen)
    const shouldPoll = userRole === 'customer' && order?.status && ['pending', 'confirmed', 'out_for_delivery'].includes(order.status);
    const { order: polledOrder } = useOrderPolling({
        orderId: effectiveOrderId!,
        enabled: !!shouldPoll && !!effectiveOrderId,
        pollInterval: 10000,
        onStatusChange: (newStatus) => {
            if (newStatus === 'out_for_delivery') {
                Alert.alert(t('orders.orderUpdate'), t('orders.orderOutForDelivery'));
            } else if (newStatus === 'delivered') {
                Alert.alert(t('orders.orderUpdate'), t('orders.orderDelivered'));
            }
        },
    });

    const activeOrder = polledOrder || order;

    // 3. Fetch Items
    const { data: orderItems = [], isLoading: loadingItems } = useQuery({
        queryKey: QUERY_KEYS.orderItems(effectiveOrderId!),
        queryFn: () => orderService.getOrderItems(effectiveOrderId!),
        enabled: !!effectiveOrderId,
    });

    // 4. Fetch Products
    const { data: products = [] } = useQuery({
        queryKey: QUERY_KEYS.products(true),
        queryFn: () => productService.getProducts({ active: true }),
    });

    // 5. Fetch Schedule (if we don't have it yet and we have an orderId)
    const { data: fetchedSchedule } = useQuery({
        queryKey: QUERY_KEYS.deliveryScheduleByOrder(effectiveOrderId!),
        queryFn: () => deliveryService.getDeliveryScheduleByOrderId(effectiveOrderId!),
        enabled: !!effectiveOrderId && !scheduleId,
        retry: false, // If no schedule found, don't keep retrying
    });

    const schedule = useMemo(() => {
        // Favor freshest fetched data first
        if (fetchedSchedule) return fetchedSchedule;
        if (activeOrder?.delivery_schedule && activeOrder.delivery_schedule.length > 0) {
            return activeOrder.delivery_schedule[0];
        }
        return initialSchedule || null;
    }, [initialSchedule, activeOrder?.delivery_schedule, fetchedSchedule]);

    // 6. Fetch Pickup Point
    const { data: pickupPoint } = useQuery({
        queryKey: ['pickupPoint', activeOrder?.pickup_point_id],
        queryFn: () => activeOrder?.pickup_point_id
            ? pickupPointService.getPickupPointById(activeOrder.pickup_point_id)
            : null,
        enabled: !!activeOrder?.pickup_point_id,
    });

    // 7. Fetch Assigned Partner (for Admin)
    const { data: assignedPartner, isLoading: loadingPartner } = useQuery({
        queryKey: ['user', schedule?.delivery_partner_id],
        queryFn: () => schedule?.delivery_partner_id
            ? userService.getUserById(schedule.delivery_partner_id)
            : null,
        enabled: userRole === 'admin' && !!schedule?.delivery_partner_id,
    });

    // Enrich order items
    const enrichedOrderItems = useMemo(() => {
        console.log('📊 [SharedOrderDetails] Enriched Items calculation - Items Count:', orderItems?.length || 0);
        return orderItems.map((item) => ({
            ...item,
            product: products.find((p) => p.id === item.product_id) || item.product,
        }));
    }, [orderItems, products]);

    useEffect(() => {
        if (enrichedOrderItems.length > 0) {
            console.log('✅ [SharedOrderDetails] Items Loaded:', enrichedOrderItems.length);
        } else if (!loadingItems) {
            console.warn('⚠️ [SharedOrderDetails] No items found for order:', effectiveOrderId);
        }
    }, [enrichedOrderItems, loadingItems, effectiveOrderId]);

    if (loadingInitialSchedule || loadingOrder || loadingItems || isCancelling) {
        return <LoadingScreen message={isCancelling ? t('common.processing') : t('common.loading')} />;
    }

    if (orderError || !activeOrder) {
        return (
            <View style={styles.container}>
                <AppHeader title={t('delivery.orderDetails')} showBack />
                <ErrorMessage message={t('delivery.failedToLoad')} error={orderError} />
            </View>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return colors.warning[500];
            case 'confirmed': return colors.info[500];
            case 'out_for_delivery': return colors.primary[500];
            case 'delivered': return colors.success[500];
            case 'canceled': return colors.error[500];
            default: return colors.neutral[500];
        }
    };

    // --- ACTIONS ---

    // Customer Cancel Action
    const confirmCancelOrder = async () => {
        try {
            setIsCancelling(true);
            await orderService.cancelOrder(activeOrder.id);
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.order(activeOrder.id) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ordersAll() });
            setShowCancelModal(false);
            setSuccessMessage({ title: t('common.success'), message: t('orders.cancelSuccess') });
            setSuccessModalVisible(true);
        } catch (error: any) {
            Alert.alert(t('common.error'), error.message || t('orders.cancelError'));
        } finally {
            setIsCancelling(false);
        }
    };

    // Delivery Partner Status Update Action
    const handleDeliveryStatusUpdate = async (newStatus: DeliveryStatus) => {
        if (!schedule) return;
        try {
            setIsUpdatingStatus(true);
            await deliveryService.updateDeliverySchedule(schedule.id, { status: newStatus });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.deliverySchedule(schedule.id) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.order(activeOrder.id) });
        } catch (error) {
            Alert.alert(t('common.error'), t('errors.updateFailed'));
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleSecureCall = () => {
        const phone = activeOrder.user?.phone || schedule?.customer?.phone;
        if (!phone) {
            Alert.alert(t('common.information'), t('delivery.noPhone'));
            return;
        }
        Linking.openURL(`tel:${phone}`);
    };

    const isCancellable = userRole === 'customer' && (activeOrder.status === 'pending' || activeOrder.status === 'confirmed') && !schedule;

    return (
        <View style={styles.container}>

            {/* Header */}
            <View style={styles.headerContainer}>
                <LinearGradient
                    colors={[colors.navy[800], colors.navy[600]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.headerBackground, { paddingTop: insets.top + 10 }]}
                >
                    <View style={styles.headerTop}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackButton}>
                            <Icon name="arrow-left" size={24} color={colors.white} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle} numberOfLines={1}>{t('delivery.orderNo')}{activeOrder.id?.slice(0, 8).toUpperCase() || 'N/A'}</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <View style={styles.headerStatsRow}>
                        <View style={styles.headerStat}>
                            <Text style={styles.headerStatLabel}>{t('common.date')}</Text>
                            <Text style={styles.headerStatValue}>{activeOrder.created_at ? formatDateTime(activeOrder.created_at, country).split(',')[0] : 'N/A'}</Text>
                        </View>
                        <View style={styles.headerStatDivider} />
                        <View style={styles.headerStat}>
                            <Text style={styles.headerStatLabel}>{t('common.total')}</Text>
                            <Text style={styles.headerStatValue}>{formatCurrency(activeOrder.total_amount || 0, country)}</Text>
                        </View>
                        <View style={styles.headerStatDivider} />
                        <View style={styles.headerStat}>
                            <Text style={styles.headerStatLabel}>{t('common.status')}</Text>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(activeOrder.status || 'pending') }]}>
                                <Text style={[styles.statusText, { color: colors.white }]}>{t(`delivery.status.${activeOrder.status || 'pending'}`)}</Text>
                            </View>
                        </View>
                    </View>
                </LinearGradient>
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={{
                    paddingTop: 24,
                    paddingBottom: padding.vertical * 2 + 140 + insets.bottom,
                    paddingHorizontal: padding.horizontal
                }}
                showsVerticalScrollIndicator={false}
            >
                {/* Admin Order Status Management */}
                {userRole === 'admin' && activeOrder.status !== 'delivered' && activeOrder.status !== 'canceled' && (
                    <AnimatedView animation="fade" delay={100} style={styles.card}>
                        <View style={styles.cardHeaderRow}>
                            <Icon name="truck-delivery" size={20} color={colors.primary[500]} />
                            <Text style={styles.cardTitle}>{t('admin.orders.deliveryAssignment')}</Text>
                        </View>

                        {schedule ? (
                            <View style={styles.assignedPartnerContainer}>
                                <View style={styles.partnerInfo}>
                                    <View style={styles.partnerAvatar}>
                                        <Text style={styles.partnerAvatarText}>
                                            {(assignedPartner?.name || 'D')[0].toUpperCase()}
                                        </Text>
                                    </View>
                                    <View style={styles.partnerDetails}>
                                        <Text style={styles.partnerNameLabel}>{t('admin.orders.assignedPartner')}</Text>
                                        <Text style={styles.partnerNameValue}>
                                            {loadingPartner
                                                ? t('common.loading')
                                                : (assignedPartner?.name || schedule?.delivery_person_name || t('delivery.unassigned'))}
                                        </Text>
                                        <Text style={styles.partnerPhoneValue}>
                                            {loadingPartner
                                                ? '...'
                                                : (assignedPartner?.phone || schedule?.delivery_person_phone || t('auth.enterPhone'))}
                                        </Text>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={styles.reassignButton}
                                    onPress={() => {
                                        setRequestedStatus(undefined); // Reassign doesn't change status
                                        setAssignmentModalVisible(true);
                                    }}
                                >
                                    <Icon name="account-convert" size={20} color={colors.primary[600]} />
                                    <Text style={styles.reassignButtonText}>{t('admin.orders.reassignPartner')}</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.unassignedContainer}>
                                <Text style={styles.unassignedText}>{t('admin.orders.noPartnerAssigned')}</Text>
                                <TouchableOpacity
                                    style={styles.assignButton}
                                    onPress={() => {
                                        setRequestedStatus(undefined); // Normal assignment -> Confirmed
                                        setAssignmentModalVisible(true);
                                    }}
                                >
                                    <Icon name="account-plus" size={20} color={colors.white} />
                                    <Text style={styles.assignButtonText}>{t('admin.orders.assignPartner')}</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Status override if needed, but secondary now */}
                        <View style={[styles.divider, { marginVertical: 16 }]} />
                        <Text style={styles.sectionTitle}>{t('admin.orders.manualStatusUpdate')}</Text>
                        <OrderStatusUpdate
                            currentStatus={activeOrder.status}
                            onStatusChange={async (newStatus) => {
                                if (newStatus === 'out_for_delivery') {
                                    setRequestedStatus('out_for_delivery');
                                    setAssignmentModalVisible(true);
                                    return;
                                }
                                try {
                                    await orderService.updateOrderStatus(activeOrder.id, newStatus);
                                    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.order(activeOrder.id) });
                                    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ordersAll() });
                                    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allOrders() });
                                    setSuccessMessage({ title: t('common.success'), message: t('delivery.statusUpdated') });
                                    setSuccessModalVisible(true);
                                } catch (error: any) {
                                    Alert.alert(t('common.error'), error.message || t('errors.updateFailed'));
                                }
                            }}
                        />
                    </AnimatedView>
                )}

                <View style={isTabletDevice ? styles.row : styles.column}>
                    {/* Customer / Delivery Info */}
                    <AnimatedView animation="fade" delay={200} style={[styles.card, { flex: 1, marginRight: isTabletDevice ? 16 : 0 }] as any}>
                        <View style={styles.cardHeaderRow}>
                            <Icon name={userRole === 'delivery_partner' ? "map-marker" : "account"} size={20} color={colors.navy[500]} />
                            <Text style={styles.cardTitle}>{userRole === 'delivery_partner' ? t('delivery.deliveryDetails') : t('delivery.customerDetails')}</Text>
                            {userRole === 'delivery_partner' && (
                                <TouchableOpacity onPress={handleSecureCall} style={{ marginLeft: 'auto', backgroundColor: colors.success[50], padding: 6, borderRadius: 20 }}>
                                    <Icon name="phone" size={18} color={colors.success[600]} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {userRole !== 'customer' && (
                            <>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>{t('delivery.customerName')}</Text>
                                    <Text style={styles.infoValue}>{activeOrder.user?.name || schedule?.customer?.name || t('common.na')}</Text>
                                </View>
                                <View style={styles.divider} />
                            </>
                        )}

                        {pickupPoint ? (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>{t('delivery.pickupPoint')}</Text>
                                <Text style={styles.infoValue}>{pickupPoint.name}</Text>
                                <Text style={styles.infoSubtext}>{pickupPoint.address}</Text>
                                {userRole === 'customer' && <Text style={styles.infoFee}>{t('delivery.deliveryFee')}: {formatCurrency(pickupPoint.delivery_fee, country)}</Text>}
                            </View>
                        ) : activeOrder.delivery_address ? (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>{t('delivery.deliveryAddress') || t('addresses.title')}</Text>
                                <Text style={styles.infoValue}>{activeOrder.delivery_address}</Text>
                            </View>
                        ) : (
                            <Text style={styles.infoSubtext}>{t('delivery.noSchedules')}</Text>
                        )}
                    </AnimatedView>

                    <AnimatedView animation="fade" delay={300} style={[styles.card, { flex: 1, marginTop: isTabletDevice ? 0 : 16 }] as any}>
                        <View style={styles.cardHeaderRow}>
                            <Icon name="credit-card" size={20} color={colors.navy[500]} />
                            <Text style={styles.cardTitle}>{t('delivery.paymentInfo')}</Text>
                        </View>

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>{t('delivery.method')}</Text>
                            <Text style={styles.infoValue}>{activeOrder.payment_method === 'online' ? t('orders.onlinePayment') : t('orders.cashOnDelivery')}</Text>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>{t('delivery.paymentStatus')}</Text>
                            <View style={styles.rowCentered}>
                                <Icon
                                    name={activeOrder.payment_status === 'paid' ? 'check-circle' : 'alert-circle'}
                                    size={16}
                                    color={activeOrder.payment_status === 'paid' ? colors.success[500] : colors.warning[500]}
                                    style={{ marginRight: 6 }}
                                />
                                <Text style={[styles.infoValue, { color: activeOrder.payment_status === 'paid' ? colors.success[700] : colors.warning[700] }]}>
                                    {t(`paymentStatus.${activeOrder.payment_status}`) || activeOrder.payment_status.toUpperCase()}
                                </Text>
                            </View>
                        </View>
                    </AnimatedView>
                </View>

                {/* Order Items */}
                <AnimatedView animation="fade" delay={400} style={[styles.card, { marginTop: 16 }] as any}>
                    <View style={styles.cardHeaderRow}>
                        <Icon name="basket" size={20} color={colors.navy[500]} />
                        <Text style={styles.cardTitle}>{t('delivery.orderItems')} ({enrichedOrderItems.length})</Text>
                    </View>

                    {enrichedOrderItems.map((item, index) => (
                        <View key={item.id}>
                            {index > 0 && <View style={styles.divider} />}
                            <View style={styles.itemRow}>
                                <View style={styles.itemIcon}>
                                    <Icon name="package-variant" size={24} color={colors.neutral[400]} />
                                </View>
                                <View style={styles.itemDetails}>
                                    <Text style={styles.itemName}>{item.product?.name || t('delivery.unknownProduct')}</Text>
                                    <Text style={styles.itemSubtext}>
                                        {formatItemQuantity(item.quantity, item.product)} x {formatCurrency(item.price, country)}{getItemUnitLabel(item.product)}
                                    </Text>
                                </View>
                                <Text style={styles.itemTotal}>
                                    {formatItemSubtotal(item.quantity, item.price, item.product, country)}
                                </Text>
                            </View>
                        </View>
                    ))}

                    <View style={[styles.divider, { marginVertical: 16 }]} />

                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>{t('common.subtotal')}</Text>
                        <Text style={styles.summaryValue}>
                            {formatCurrency(activeOrder.total_amount - (activeOrder.delivery_fee || 0) - (activeOrder.payment_fee || 0), country)}
                        </Text>
                    </View>

                    {typeof activeOrder.delivery_fee === 'number' ? (
                        <View style={[styles.summaryRow, { marginTop: 8 }]}>
                            <Text style={styles.summaryLabel}>{t('delivery.deliveryFee')}</Text>
                            <Text style={styles.summaryValue}>
                                + {formatCurrency(activeOrder.delivery_fee, country)}
                            </Text>
                        </View>
                    ) : null}

                    <View style={[styles.summaryRow, { marginTop: 12 }]}>
                        <Text style={styles.totalLabel}>{t('products.grandTotal')}</Text>
                        <Text style={styles.totalValue}>
                            {formatCurrency(activeOrder.total_amount, country)}
                        </Text>
                    </View>
                </AnimatedView>

                {isCancellable && (
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => setShowCancelModal(true)}
                        disabled={isCancelling}
                    >
                        <View className="flex-row items-center justify-center">
                            <Icon name="close-circle-outline" size={20} color={colors.error[500]} />
                            <Text style={styles.cancelButtonText}>
                                {isCancelling ? t('common.processing') : t('orders.cancelOrder')}
                            </Text>
                        </View>
                    </TouchableOpacity>
                )}

            </ScrollView>

            {(userRole === 'delivery' || userRole === 'delivery_partner') && schedule && schedule.status !== 'delivered' && schedule.status !== 'canceled' && (
                <View style={[styles.footer, { paddingBottom: Math.max(20, insets.bottom + 10) }]}>
                    {(schedule.status === 'scheduled' || schedule.status === 'accepted') && (
                        <TouchableOpacity style={styles.deliveryActionBtn} onPress={() => handleDeliveryStatusUpdate('picked_up')} disabled={isUpdatingStatus}>
                            <Text style={styles.deliveryActionText}>{t('delivery.orderPickedUp')}</Text>
                        </TouchableOpacity>
                    )}
                    {(schedule.status === 'picked_up' || schedule.status === 'in_transit') && (
                        <TouchableOpacity style={[styles.deliveryActionBtn, { backgroundColor: colors.success[600] }]} onPress={() => handleDeliveryStatusUpdate('delivered')} disabled={isUpdatingStatus}>
                            <Text style={styles.deliveryActionText}>{t('delivery.confirmDelivered')}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Modals */}
            <AlertModal
                visible={showCancelModal}
                title={t('orders.cancelOrder')}
                message={t('delivery.cancelOrderConfirm')}
                type="warning"
                onClose={() => setShowCancelModal(false)}
                onConfirm={confirmCancelOrder}
                showCancel
            />

            <AssignmentModal
                visible={assignmentModalVisible}
                onDismiss={() => {
                    setAssignmentModalVisible(false);
                    setRequestedStatus(undefined);
                }}
                onAssignSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.order(activeOrder.id) });
                    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.deliveryScheduleByOrder(activeOrder.id) });
                    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allOrders() });

                    const successMsg = requestedStatus === 'out_for_delivery'
                        ? t('delivery.outForDeliverySuccess')
                        : t('delivery.partnerAssignedSuccess');

                    setSuccessMessage({
                        title: requestedStatus === 'out_for_delivery' ? t('delivery.statusUpdated') : t('delivery.assignedTitle'),
                        message: successMsg
                    });

                    setTimeout(() => setSuccessModalVisible(true), 500);
                    setRequestedStatus(undefined);
                }}
                orderIds={[activeOrder.id]}
                targetStatus={requestedStatus}
            />

            <SuccessModal
                visible={successModalVisible}
                title={successMessage.title}
                message={successMessage.message}
                onDismiss={() => setSuccessModalVisible(false)}
            />

        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background.secondary },
    headerContainer: { marginBottom: 0 },
    headerBackground: { paddingHorizontal: 20, paddingBottom: 40, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, zIndex: 10 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    headerBackButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.white, flex: 1, textAlign: 'center' },
    headerStatsRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    headerStat: { alignItems: 'center', flex: 1 },
    headerStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', height: '80%', alignSelf: 'center' },
    headerStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600', marginBottom: 4, letterSpacing: 1 },
    headerStatValue: { fontSize: 15, color: colors.white, fontWeight: '700' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    statusText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },

    content: { flex: 1 },
    row: { flexDirection: 'row' },
    column: { flexDirection: 'column' },
    rowCentered: { flexDirection: 'row', alignItems: 'center' },

    card: { backgroundColor: colors.white, borderRadius: 16, padding: 20, elevation: 2, borderWidth: 1, borderColor: colors.neutral[100], marginBottom: 16 },
    cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: colors.navy[900] },
    sectionTitle: { fontSize: 14, fontWeight: '600', color: colors.neutral[500], textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5 },

    infoRow: { marginBottom: 8 },
    infoLabel: { fontSize: 12, color: colors.neutral[500], marginBottom: 4, textTransform: 'uppercase' },
    infoValue: { fontSize: 15, fontWeight: '600', color: colors.neutral[900] },
    infoSubtext: { fontSize: 13, color: colors.neutral[500], marginTop: 2 },
    infoFee: { fontSize: 13, fontWeight: '700', color: colors.primary[600], marginTop: 4 },
    divider: { height: 1, backgroundColor: colors.neutral[100], marginVertical: 12 },

    itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
    itemIcon: { width: 48, height: 48, borderRadius: 8, backgroundColor: colors.neutral[50], justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    itemDetails: { flex: 1 },
    itemName: { fontSize: 15, fontWeight: '600', color: colors.neutral[900] },
    itemSubtext: { fontSize: 13, color: colors.neutral[500], marginTop: 2 },
    itemTotal: { fontSize: 15, fontWeight: '700', color: colors.navy[700] },

    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryLabel: { fontSize: 14, color: colors.neutral[600] },
    summaryValue: { fontSize: 14, fontWeight: '600', color: colors.neutral[900] },
    totalLabel: { fontSize: 16, fontWeight: '700', color: colors.navy[900] },
    totalValue: { fontSize: 18, fontWeight: '800', color: colors.navy[700] },

    cancelButton: { marginTop: 16, marginBottom: 32, paddingVertical: 16, borderRadius: 16, backgroundColor: colors.error[50], borderWidth: 1, borderColor: colors.error[100], alignItems: 'center' },
    cancelButtonText: { fontSize: 16, fontWeight: '700', color: colors.error[600], marginLeft: 8 },

    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 8 },
    deliveryActionBtn: { backgroundColor: colors.primary[600], paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
    deliveryActionText: { color: colors.text.inverse, fontWeight: 'bold', fontSize: 16 },

    // Assignment UI for Admin
    assignedPartnerContainer: {
        marginTop: 8,
    },
    partnerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.neutral[50],
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
    },
    partnerAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.primary[100],
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    partnerAvatarText: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.primary[700],
    },
    partnerDetails: {
        flex: 1,
    },
    partnerNameLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.neutral[500],
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    partnerNameValue: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.neutral[900],
    },
    partnerPhoneValue: {
        fontSize: 14,
        color: colors.neutral[600],
    },
    reassignButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.primary[200],
        backgroundColor: colors.primary[50],
        gap: 8,
    },
    reassignButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.primary[700],
    },
    unassignedContainer: {
        alignItems: 'center',
        padding: 24,
        backgroundColor: colors.neutral[50],
        borderRadius: 16,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: colors.neutral[300],
    },
    unassignedText: {
        fontSize: 14,
        color: colors.neutral[500],
        marginBottom: 16,
    },
    assignButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary[600],
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
    },
    assignButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.white,
    },
});

export default SharedOrderDetailsScreen;
