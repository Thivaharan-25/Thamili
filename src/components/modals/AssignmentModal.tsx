import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Modal, Portal, Button, ActivityIndicator, Avatar } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';

import { userService } from '../../services/userService';
import { pickupPointService } from '../../services/pickupPointService';
import { deliveryService } from '../../services/deliveryService';
import { orderService } from '../../services/orderService';
import { User, Order, OrderStatus } from '../../types';

interface AssignmentModalProps {
    visible: boolean;
    onDismiss: () => void;
    onAssignSuccess: () => void;
    orderIds: string[]; // Changed from single orderId to array
    targetStatus?: OrderStatus; // Optional status to set after assignment
    filterCountries?: string[]; // New prop for filtering partners
}

const AssignmentModal: React.FC<AssignmentModalProps> = ({
    visible,
    onDismiss,
    onAssignSuccess,
    orderIds,
    targetStatus,
    filterCountries
}) => {
    const [deliveryPartners, setDeliveryPartners] = useState<User[]>([]);
    const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
    const [loadingData, setLoadingData] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const { t } = useTranslation();

    // We need to fetch the order details if not implicitly passed.
    // Actually, for simplicity, we'll fetch order details inside if we need pickup point info.
    // Or we can rely on `orderService` to get it.

    useEffect(() => {
        if (visible) {
            fetchData();
            setSelectedPartnerId(null);
        }
    }, [visible, filterCountries]); // Added filterCountries to dependencies

    const fetchData = async () => {
        try {
            setLoadingData(true);
            let partners = await userService.getDeliveryPartners();

            // Filter by country if filterCountries is provided and not empty
            if (filterCountries && filterCountries.length > 0) {
                partners = partners.filter(partner =>
                    partner.country_preference && filterCountries.includes(partner.country_preference)
                );
            }

            setDeliveryPartners(partners);
        } catch (err) {
            console.error('Failed to load partners', err);
            // Optional: Show error
        } finally {
            setLoadingData(false);
        }
    };

    const handleAssign = async (partnerId: string | null = null) => {
        const finalPartnerId = partnerId || selectedPartnerId;
        if (orderIds.length === 0 || !finalPartnerId) return;

        try {
            setAssigning(true);
            let successCount = 0;
            let failCount = 0;

            // Iterate over all selected orders
            for (const id of orderIds) {
                try {
                    // Check if schedule already exists
                    const existingSchedule = await deliveryService.getDeliveryScheduleByOrderId(id);

                    if (existingSchedule) {
                        // Reassignment: Update existing schedule
                        await deliveryService.updateDeliverySchedule(existingSchedule.id, {
                            delivery_partner_id: finalPartnerId,
                            // If it was failed, maybe reset to scheduled? For now just update partner
                        });
                        console.log(`✅ [AssignmentModal] Reassigned order ${id} to ${finalPartnerId}`);
                    } else {
                        // New Assignment: Create new schedule
                        // We need to get the order to find the pickup point
                        const order = await orderService.getOrderById(id);

                        if (!order) {
                            console.warn(`Order ${id} not found`);
                            failCount++;
                            continue;
                        }

                        let pickupPointId = order.pickup_point_id;

                        if (!pickupPointId) {
                            // Fallback logic
                            const pickupPoints = await pickupPointService.getPickupPoints();
                            if (pickupPoints.length > 0) {
                                pickupPointId = pickupPoints[0].id;
                            }
                        }

                        if (!pickupPointId) {
                            console.warn(`No pickup point for order ${id}`);
                            failCount++;
                            continue;
                        }

                        await deliveryService.createDeliverySchedule({
                            order_id: id,
                            delivery_partner_id: finalPartnerId,
                            status: 'scheduled',
                            pickup_point_id: pickupPointId,
                            delivery_date: new Date().toISOString()
                        });
                        console.log(`✅ [AssignmentModal] Assigned order ${id} to ${finalPartnerId}`);
                    }

                    // Update Order Status
                    try {
                        const order = await orderService.getOrderById(id);
                        if (order) {
                            const newStatus = targetStatus || (order.status === 'pending' ? 'confirmed' : null);
                            if (newStatus && newStatus !== order.status) {
                                console.log(`🔄 [AssignmentModal] Updating order ${id} status from ${order.status} to ${newStatus}`);
                                await orderService.updateOrderStatus(id, newStatus);
                            }
                        }
                    } catch (e) {
                        console.log(`Status update failed for ${id}:`, e);
                    }
                    successCount++;

                } catch (err: any) {
                    console.error(`Failed to assign/reassign order ${id}`, err);
                    Alert.alert(t('common.error'), `Order ${id.slice(0, 8)}: ${err.message || 'Unknown error'}`);
                    failCount++;
                }
            }

            if (failCount > 0) {
                Alert.alert(t('delivery.assignmentReport'), `${t('delivery.assignedCount', { success: successCount })}\n${t('delivery.failedCount', { fail: failCount })}`);
            }
            // Success alert removed to prevent double popup (handled by parent component)

            onAssignSuccess();
            onDismiss();

        } catch (err: any) {
            Alert.alert(t('common.error'), err.message || t('delivery.failedToAssign'));
        } finally {
            setAssigning(false);
        }
    };

    const designColors = {
        teal: '#3AB5D1',
        gray: '#6B7280',
    };

    return (
        <Portal>
            <Modal
                visible={visible}
                onDismiss={onDismiss}
            >
                <Text style={styles.title}>{t('delivery.assignPartnerTitle')}</Text>

                {loadingData ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={designColors.teal} />
                        <Text style={{ marginTop: 10, color: designColors.gray }}>{t('delivery.loadingPartners')}</Text>
                    </View>
                ) : (
                    <View style={{ maxHeight: 300 }}>
                        {deliveryPartners.length === 0 ? (
                            <Text style={styles.emptyText}>{t('delivery.noPartnersFound')}</Text>
                        ) : (
                            <FlatList
                                data={deliveryPartners}
                                keyExtractor={item => item.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[
                                            styles.partnerItem,
                                            selectedPartnerId === item.id && styles.partnerItemSelected
                                        ]}
                                        onPress={() => setSelectedPartnerId(item.id)}
                                    >
                                        <Avatar.Text
                                            size={40}
                                            label={(item.name || '?')[0]}
                                            style={{ backgroundColor: designColors.teal }}
                                        />
                                        <View style={{ marginLeft: 12, flex: 1 }}>
                                            <Text style={styles.partnerName}>{item.name || t('delivery.unknownPartner')}</Text>

                                            {/* Country Badge */}
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                                <Text style={{ fontSize: 16, marginRight: 6 }}>
                                                    {item.country_preference === 'germany' ? '🇩🇪' : item.country_preference === 'denmark' ? '🇩🇰' : '🌍'}
                                                </Text>
                                                <Text style={[styles.partnerPhone, { marginTop: 0, color: '#4B5563' }]}>
                                                    {item.country_preference
                                                        ? t('common.' + item.country_preference.toLowerCase())
                                                        : t('delivery.noCountryPreference')}
                                                </Text>
                                            </View>

                                            <Text style={styles.partnerPhone}>{item.phone || t('delivery.noPhone')}</Text>
                                        </View>
                                        {selectedPartnerId === item.id && (
                                            <Icon name="check-circle" size={24} color={designColors.teal} />
                                        )}
                                    </TouchableOpacity>
                                )}
                            />
                        )}
                    </View>
                )}

                <View style={styles.actions}>
                    <Button
                        mode="text"
                        onPress={onDismiss}
                        textColor={designColors.gray}
                        disabled={assigning}
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button
                        mode="contained"
                        onPress={() => handleAssign()}
                        loading={assigning}
                        disabled={assigning || !selectedPartnerId}
                        buttonColor={designColors.teal}
                        style={{ flex: 1, marginLeft: 10 }}
                    >
                        {t('admin.orders.assignPartner')}
                    </Button>
                </View>
            </Modal>
        </Portal>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        padding: 24,
        margin: 20,
        borderRadius: 16,
        maxHeight: '80%'
    },
    title: {
        fontSize: 20,
        lineHeight: 28, // Increased for Tamil
        fontWeight: '700',
        marginBottom: 20,
        color: '#1F2937',
        textAlign: 'center',
    },
    loadingContainer: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center'
    },
    emptyText: {
        textAlign: 'center',
        color: '#6B7280',
        padding: 20,
        lineHeight: 24, // Added
    },
    partnerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14, // Increased padding
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 10,
        backgroundColor: '#FAFAFA'
    },
    partnerItemSelected: {
        borderColor: '#3AB5D1',
        backgroundColor: '#F0FDFA', // Light teal bg
    },
    partnerName: {
        fontSize: 16,
        lineHeight: 24, // Increased for Tamil
        fontWeight: '600',
        color: '#1F2937',
    },
    partnerPhone: {
        fontSize: 13,
        lineHeight: 20, // Increased for Tamil
        color: '#6B7280',
        marginTop: 2
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 20,
        alignItems: 'center'
    },
});

export default AssignmentModal;
