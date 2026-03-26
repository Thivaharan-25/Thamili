import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Platform, Alert, RefreshControl, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme';
import { AnimatedView, Button, DeliveryAddressForm, LoadingScreen, SuccessCelebration, AlertModal } from '../../components';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { addressService } from '../../services';
import { Address } from '../../types';

const AddressesScreen = () => {
    const navigation = useNavigation();
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const [showAddModal, setShowAddModal] = useState(false);
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Delete Confirmation State
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [addressToDelete, setAddressToDelete] = useState<string | null>(null);

    // Error Modal State
    const [errorModalVisible, setErrorModalVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Form State
    const [newAddressForm, setNewAddressForm] = useState({
        street: '',
        city: '',
        postalCode: '',
        phone: '',
        instructions: '',
        latitude: undefined as number | undefined,
        longitude: undefined as number | undefined,
    });

    useEffect(() => {
        if (user?.id) {
            loadAddresses();
        }
    }, [user?.id]);

    const loadAddresses = async () => {
        if (!user?.id) return;
        try {
            const data = await addressService.getUserAddresses(user.id);
            setAddresses(data);
        } catch (error) {
            console.error('Failed to load addresses:', error);
            setErrorMessage(t('addresses.failedToLoad'));
            setErrorModalVisible(true);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadAddresses();
    };

    const handleSaveAddress = async () => {
        if (!user?.id) return;

        // Basic validation
        if (!newAddressForm.street || !newAddressForm.city || !newAddressForm.postalCode || !newAddressForm.phone) {
            setErrorMessage(t('addresses.fillRequiredFields'));
            setErrorModalVisible(true);
            return;
        }

        setIsSaving(true);
        try {
            const newAddress: Omit<Address, 'id' | 'created_at'> = {
                user_id: user.id,
                type: 'Home', // Default
                name: user.name || 'User', // Use user's name
                street: newAddressForm.street,
                city: newAddressForm.city,
                state: 'State', // You might want to add state field to form or infer it
                postal_code: newAddressForm.postalCode,
                country: user.country_preference === 'denmark' ? 'Denmark' : 'Germany',
                phone: newAddressForm.phone,
                instructions: newAddressForm.instructions,
                latitude: newAddressForm.latitude,
                longitude: newAddressForm.longitude,
                is_default: addresses.length === 0,
            };

            await addressService.addAddress(newAddress);
            await loadAddresses();

            setShowAddModal(false);
            // Reset form
            setNewAddressForm({
                street: '',
                city: '',
                postalCode: '',
                phone: user?.phone || '',
                instructions: '',
                latitude: undefined,
                longitude: undefined,
            });
            setShowSuccess(true);
        } catch (error) {
            console.error('Failed to save address:', error);
            setErrorMessage(t('addresses.failedToSave'));
            setErrorModalVisible(true);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAddress = (id: string) => {
        setAddressToDelete(id);
        setDeleteModalVisible(true);
    };

    const performDelete = async () => {
        if (!addressToDelete) return;

        try {
            setDeleteModalVisible(false);
            await addressService.deleteAddress(addressToDelete);
            loadAddresses();
        } catch (error) {
            console.error('Delete error:', error);
            setErrorMessage(t('addresses.failedToDelete'));
            setErrorModalVisible(true);
        } finally {
            setAddressToDelete(null);
        }
    };

    if (isLoading && !refreshing && addresses.length === 0) {
        return <LoadingScreen />;
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            {/* Header */}
            <LinearGradient
                colors={[colors.navy[900], colors.navy[700]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerGradient}
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                    >
                        <Icon name="arrow-left" size={24} color={colors.text.inverse} />
                    </TouchableOpacity>
                    <Text
                        style={styles.headerTitle}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {t('addresses.title') || 'My Addresses'}
                    </Text>
                    <View style={{ width: 40 }} />
                </View>
            </LinearGradient>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {addresses.map((address, index) => (
                    <AnimatedView
                        key={address.id}
                        animation="slide"
                        enterFrom="bottom"
                        delay={index * 100}
                    >
                        <View style={styles.addressCard}>
                            <View style={styles.cardHeader}>
                                <View style={styles.typeContainer}>
                                    <Icon
                                        name={address.type.toLowerCase() === 'work' ? 'briefcase' : 'home'}
                                        size={20}
                                        color={colors.primary[600]}
                                    />
                                    <Text style={styles.addressType}>{address.type}</Text>
                                    {address.is_default && (
                                        <View style={styles.defaultBadge}>
                                            <Text style={styles.defaultText}>Default</Text>
                                        </View>
                                    )}
                                </View>
                                <TouchableOpacity
                                    onPress={() => handleDeleteAddress(address.id)}
                                    style={styles.deleteButton}
                                >
                                    <Icon name="trash-can-outline" size={20} color={colors.error[500]} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.cardBody}>
                                <Text style={styles.name}>{address.name}</Text>
                                <Text style={styles.addressLine}>{address.street}</Text>
                                <Text style={styles.addressLine}>{`${address.city}, ${address.state || ''} ${address.postal_code}`}</Text>
                                <Text style={styles.addressLine}>{address.country}</Text>
                                <Text style={styles.phone}>{address.phone}</Text>
                            </View>
                        </View>
                    </AnimatedView>
                ))}
            </ScrollView>

            {/* FAB */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => {
                    setNewAddressForm(prev => ({ ...prev, phone: user?.phone || '' }));
                    setShowAddModal(true);
                }}
                activeOpacity={0.8}
            >
                <LinearGradient
                    colors={[colors.secondary[400], colors.secondary[600]]}
                    style={styles.fabGradient}
                >
                    <Icon name="plus" size={30} color={colors.text.inverse} />
                </LinearGradient>
            </TouchableOpacity>

            {/* Add Address Modal */}
            <Modal
                visible={showAddModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowAddModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Add New Address</Text>
                        <TouchableOpacity onPress={() => setShowAddModal(false)}>
                            <Icon name="close" size={24} color={colors.neutral[500]} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalContent}>
                        <DeliveryAddressForm
                            street={newAddressForm.street}
                            city={newAddressForm.city}
                            postalCode={newAddressForm.postalCode}
                            phone={newAddressForm.phone}
                            instructions={newAddressForm.instructions}
                            onStreetChange={(text) => setNewAddressForm({ ...newAddressForm, street: text })}
                            onCityChange={(text) => setNewAddressForm({ ...newAddressForm, city: text })}
                            onPostalCodeChange={(text) => setNewAddressForm({ ...newAddressForm, postalCode: text })}
                            onPhoneChange={(text: string) => setNewAddressForm({ ...newAddressForm, phone: text })}
                            onInstructionsChange={(text) => setNewAddressForm({ ...newAddressForm, instructions: text })}
                            onLocationChange={(loc) => setNewAddressForm({
                                ...newAddressForm,
                                latitude: loc.latitude,
                                longitude: loc.longitude,
                                street: loc.address || newAddressForm.street,
                                city: loc.city || newAddressForm.city,
                                postalCode: loc.postalCode || newAddressForm.postalCode,
                            })}
                            country={user?.country_preference === 'denmark' ? 'denmark' : 'germany' as any}
                        />
                        <View style={styles.modalActions}>
                            <Button
                                title="Save Address"
                                onPress={handleSaveAddress}
                                variant="primary"
                                fullWidth
                            />
                        </View>
                    </ScrollView>
                </View>
            </Modal>
            <SuccessCelebration
                visible={showSuccess}
                message={t('addresses.addSuccess') || 'Address saved successfully!'}
                onComplete={() => setShowSuccess(false)}
            />

            {/* Delete Confirmation Modal */}
            <AlertModal
                visible={deleteModalVisible}
                title={t('addresses.deleteTitle') || "Delete Address"}
                message={t('addresses.deleteConfirm') || "Are you sure you want to delete this address?"}
                onClose={() => setDeleteModalVisible(false)}
                onConfirm={performDelete}
                showCancel
                confirmText={t('common.delete') || "Delete"}
                cancelText={t('common.cancel') || "Cancel"}
                type="error"
            />

            {/* Error Modal */}
            <AlertModal
                visible={errorModalVisible}
                title={t('common.error') || "Error"}
                message={errorMessage}
                onClose={() => setErrorModalVisible(false)}
                onConfirm={() => setErrorModalVisible(false)}
                confirmText="OK"
                type="error"
            />
        </View >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.tertiary,
    },
    headerGradient: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    backButton: {
        padding: 8,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text.inverse,
    },
    content: {
        padding: 20,
        paddingBottom: 100,
    },
    addressCard: {
        backgroundColor: colors.background.default,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: colors.neutral[900],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    typeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    addressType: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.neutral[900],
        marginLeft: 8,
        marginRight: 8,
    },
    defaultBadge: {
        backgroundColor: colors.primary[50],
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.primary[200],
    },
    defaultText: {
        fontSize: 10,
        color: colors.primary[700],
        fontWeight: '600',
    },
    deleteButton: {
        padding: 4,
    },
    cardBody: {
        gap: 4,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.neutral[900],
        marginBottom: 4,
    },
    addressLine: {
        fontSize: 14,
        color: colors.neutral[600],
        lineHeight: 20,
    },
    phone: {
        fontSize: 14,
        color: colors.neutral[600],
        marginTop: 4,
    },
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        shadowColor: colors.secondary[600],
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    fabGradient: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: colors.background.default,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.neutral[100],
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.neutral[900],
    },
    modalContent: {
        flex: 1,
    },
    modalActions: {
        marginTop: 24,
        marginBottom: 40,
        paddingHorizontal: 20,
    },
});

export default AddressesScreen;
