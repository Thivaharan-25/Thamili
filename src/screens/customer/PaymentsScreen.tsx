import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, Platform, Alert, RefreshControl, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme';
import { AnimatedView, Button, PaymentForm, LoadingScreen } from '../../components';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { paymentMethodService } from '../../services';
import { useStripe } from '@stripe/stripe-react-native';

import { SavedPaymentMethod } from '../../types';

const PaymentsScreen = () => {
    const navigation = useNavigation();
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const [showAddModal, setShowAddModal] = useState(false);
    const [cards, setCards] = useState<SavedPaymentMethod[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const { createPaymentMethod } = useStripe();

    // New Card State
    const [cardholderName, setCardholderName] = useState('');
    const [cardDetails, setCardDetails] = useState<any>(null);

    useEffect(() => {
        if (user?.id) {
            loadCards();
        }
    }, [user?.id]);

    const loadCards = async () => {
        if (!user?.id) return;
        try {
            const data = await paymentMethodService.getUserPaymentMethods(user.id);
            setCards(data);
        } catch (error) {
            console.error('Failed to load cards:', error);
            Alert.alert(t('common.error'), t('payments.failedToLoad'));
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadCards();
    };

    const handleSaveCard = async () => {
        if (!user?.id) return;

        // Basic validation
        if (!cardholderName || !cardDetails?.complete) {
            Alert.alert(t('common.error'), t('payments.fillAllDetails'));
            return;
        }

        setIsSaving(true);
        try {
            // Create Payment Method via Stripe
            const { error, paymentMethod } = await createPaymentMethod({
                paymentMethodType: 'Card',
                paymentMethodData: {
                    billingDetails: {
                        name: cardholderName,
                    },
                },
            });

            if (error) {
                Alert.alert(t('common.error'), error.message || t('payments.failedToCreate'));
                return;
            }

            if (paymentMethod) {
                // Save reference to Supabase
                const method: Omit<SavedPaymentMethod, 'id' | 'created_at'> = {
                    user_id: user.id,
                    type: 'card',
                    brand: paymentMethod.Card.brand as any || 'other',
                    last4: paymentMethod.Card.last4 || '',
                    expiry_month: (paymentMethod.Card.expMonth || 0).toString(),
                    expiry_year: (paymentMethod.Card.expYear || 0).toString(),
                    cardholder_name: cardholderName,
                    is_default: cards.length === 0,
                    stripe_payment_method_id: paymentMethod.id,
                };

                await paymentMethodService.addPaymentMethod(method);
                await loadCards();

                setShowAddModal(false);
                setCardholderName('');
                setCardDetails(null);
                Alert.alert(t('common.success'), t('payments.addSuccess'));
            }
        } catch (error: any) {
            console.error('Failed to add card:', error);
            Alert.alert(t('common.error'), t('payments.failedToDelete'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteCard = (id: string) => {
        Alert.alert(
            t('payments.removeTitle'),
            t('payments.removeConfirm'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.remove'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await paymentMethodService.deletePaymentMethod(id);
                            loadCards();
                        } catch (error) {
                            Alert.alert(t('common.error'), t('payments.failedToDelete'));
                        }
                    }
                }
            ]
        );
    };

    const getBrandIcon = (brand: string) => {
        switch (brand.toLowerCase()) {
            case 'visa': return 'credit-card';
            case 'mastercard': return 'credit-card-outline';
            default: return 'credit-card';
        }
    };

    const getGradient = (brand: string): [string, string] => {
        switch (brand.toLowerCase()) {
            case 'visa': return ['#1A1F71', '#004E92']; // Visa Blue
            case 'mastercard': return ['#232526', '#414345']; // Dark Premium
            default: return ['#4e54c8', '#8f94fb'];
        }
    };


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
                        <Icon name="arrow-left" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text
                        style={styles.headerTitle}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {t('payments.title') || 'Payment Methods'}
                    </Text>
                    <View style={{ width: 40 }} />
                </View>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.content}>
                {cards.map((card, index) => (
                    <AnimatedView
                        key={card.id}
                        animation="zoom"
                        delay={index * 100}
                    >
                        <View style={styles.cardContainer}>
                            <LinearGradient
                                colors={getGradient(card.brand)}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.creditCard}
                            >
                                <View style={styles.cardTop}>
                                    <Icon name="chip" size={32} color="rgba(255,255,255,0.8)" />
                                    <Icon name={getBrandIcon(card.brand)} size={32} color="#fff" />
                                </View>

                                <Text style={styles.cardNumber}>
                                    **** **** **** {card.last4}
                                </Text>

                                <View style={styles.cardBottom}>
                                    <View>
                                        <Text style={styles.cardLabel}>Card Holder</Text>
                                        <Text style={styles.cardValue}>{card.cardholder_name}</Text>
                                    </View>
                                    <View>
                                        <Text style={styles.cardLabel}>Expires</Text>
                                        <Text style={styles.cardValue}>
                                            {card.expiry_month}/{card.expiry_year}
                                        </Text>
                                    </View>
                                </View>
                            </LinearGradient>

                            <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={() => handleDeleteCard(card.id)}
                            >
                                <Text style={styles.deleteText}>Remove</Text>
                            </TouchableOpacity>
                        </View>
                    </AnimatedView>
                ))}

                <View style={styles.secureBadge}>
                    <Icon name="shield-check" size={20} color={colors.success[500]} />
                    <Text style={styles.secureText}>Payments are secure and encrypted</Text>
                </View>
            </ScrollView>

            {/* FAB */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => setShowAddModal(true)}
                activeOpacity={0.8}
            >
                <LinearGradient
                    colors={[colors.secondary[400], colors.secondary[600]]}
                    style={styles.fabGradient}
                >
                    <Icon name="plus" size={30} color="#fff" />
                </LinearGradient>
            </TouchableOpacity>

            {/* Add Card Modal */}
            <Modal
                visible={showAddModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowAddModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Add New Card</Text>
                        <TouchableOpacity onPress={() => setShowAddModal(false)}>
                            <Icon name="close" size={24} color={colors.neutral[500]} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalContent}>
                        <PaymentForm
                            cardholderName={cardholderName}
                            onCardholderNameChange={setCardholderName}
                            onCardChange={setCardDetails}
                        />

                        <View style={styles.modalActions}>
                            <Button
                                title="Save Card"
                                onPress={handleSaveCard}
                                variant="primary"
                                fullWidth
                            />
                        </View>
                    </ScrollView>
                </View>
            </Modal>
        </View>
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
        color: '#fff',
    },
    content: {
        padding: 20,
        paddingBottom: 100,
    },
    cardContainer: {
        marginBottom: 20,
        shadowColor: colors.neutral[900],
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
    },
    creditCard: {
        padding: 24,
        borderRadius: 20,
        height: 200,
        justifyContent: 'space-between',
    },
    cardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardNumber: {
        fontSize: 22,
        color: '#fff',
        fontWeight: '600',
        letterSpacing: 2,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        marginTop: 10,
    },
    cardBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    cardLabel: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.7)',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    cardValue: {
        fontSize: 14,
        color: '#fff',
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    deleteButton: {
        alignSelf: 'flex-end',
        padding: 8,
        marginTop: 8,
    },
    deleteText: {
        color: colors.error[500],
        fontSize: 14,
        fontWeight: '500',
    },
    secureBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        backgroundColor: colors.success[50],
        padding: 12,
        borderRadius: 12,
    },
    secureText: {
        color: colors.success[700],
        marginLeft: 8,
        fontSize: 14,
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
    // Modal
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
        padding: 20,
    },
    modalActions: {
        marginTop: 24,
        marginBottom: 40,
    },
});

export default PaymentsScreen;
