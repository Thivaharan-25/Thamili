import React, { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { View, ScrollView, StyleSheet, FlatList, TouchableOpacity, Image, RefreshControl, Platform, SafeAreaView, StatusBar } from 'react-native';
import { Text, Card, Button, IconButton, Searchbar, Badge, Divider, Portal, Modal, Surface, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../../theme';
import { AnimatedView, AlertModal, useToast } from '../../components';
import { formatCurrency } from '../../utils/regionalFormatting';
import { productService } from '../../services/productService';
import { Product } from '../../types';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { isProductWeightBased } from '../../utils/productUtils';
import { useTranslation } from 'react-i18next';

const DeliveryVanSalesScreen = () => {
    const navigation = useNavigation();
    const { t } = useTranslation();
    const { selectedCountry } = useCartStore(); // Fix: Use selectedCountry (string) instead of countrySelected (boolean)
    const { user } = useAuthStore();
    const [activeTab, setActiveTab] = useState<'sales' | 'inventory'>('sales');
    const [searchQuery, setSearchQuery] = useState('');
    const [cart, setCart] = useState<{ [key: string]: number }>({}); // { itemId: quantity }
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showCheckout, setShowCheckout] = useState(false);
    const [successVisible, setSuccessVisible] = useState(false);
    const { showToast } = useToast();

    // Alert Modal state
    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean;
        title?: string;
        message: string;
        type?: 'error' | 'success' | 'warning' | 'info';
        onConfirm?: () => void;
    }>({ visible: false, message: '' });

    const showAlert = (message: string, title?: string, type: 'error' | 'success' | 'warning' | 'info' = 'info', onConfirm?: () => void) => {
        setAlertConfig({ visible: true, title, message, type, onConfirm });
    };

    // Data State
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState<Product[]>([]);

    useEffect(() => {
        loadInventory();
    }, []);

    const loadInventory = async () => {
        try {
            setLoading(true);
            // For now, we fetch ALL active products as "Van Stock" foundation.
            // Ideally, there would be a specific API: deliveryService.getVanInventory(userId)
            const data = await productService.getProducts({ active: true });
            setProducts(data);
        } catch (error) {
            console.error('Failed to load van inventory:', error);
            showToast({ message: t('errors.failedToLoad'), type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    // Filter products based on search
    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getPrice = (product: Product) => {
        // Determine price based on selected country context or fallback to user's assigned region
        const effectiveCountry = selectedCountry || user?.country_preference || 'germany';
        return effectiveCountry === 'denmark' ? product.price_denmark : product.price_germany;
    };

    // Mock Stock Logic: Since we don't have real "van stock" counts from API yet,
    // we will simulate a random stock or use the product's main stock for now.
    const getStock = (product: Product) => {
        const effectiveCountry = selectedCountry || user?.country_preference || 'germany';
        return effectiveCountry === 'denmark' ? product.stock_denmark : product.stock_germany;
    };

    const addToCart = (product: Product) => {
        const isLoose = isProductWeightBased(product);
        const increment = isLoose ? 100 : 1;
        const maxStock = getStock(product);

        setCart(prev => {
            const currentQty = prev[product.id] || 0;
            const newQty = currentQty + increment;
            const availableQty = isLoose ? maxStock * 1000 : maxStock;

            if (newQty <= availableQty) {
                return { ...prev, [product.id]: newQty };
            } else {
                showAlert(t('vanSales.stockLimitMsg'), t('vanSales.stockLimit'), 'warning');
                return prev;
            }
        });
    };

    const removeFromCart = (product: Product) => {
        const isLoose = isProductWeightBased(product);
        const decrement = isLoose ? 100 : 1;

        setCart(prev => {
            const currentQty = prev[product.id];
            if (!currentQty) return prev;
            const newQty = currentQty - decrement;
            if (newQty <= 0) {
                const { [product.id]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [product.id]: newQty };
        });
    };

    const getCartTotal = () => {
        const { calculateItemSubtotalValue } = require('../../utils/productUtils');
        return Object.entries(cart).reduce((total, [id, qty]) => {
            const product = products.find(p => p.id === id);
            return total + (product ? calculateItemSubtotalValue(qty, getPrice(product), product) : 0);
        }, 0);
    };

    const handleCheckout = () => {
        // 1. Validate Cart
        if (Object.keys(cart).length === 0) {
            showToast({ message: t('errors.fillAllFields'), type: 'warning' });
            return;
        }
        setShowCheckout(true);
    };

    const completeSale = async () => {
        if (!user || !user.id) {
            showToast({ message: 'User session not found', type: 'error' });
            return;
        }



        const effectiveCountry = selectedCountry || user?.country_preference || 'germany';
        const totalAmount = formatCurrency(getCartTotal(), effectiveCountry);

        setIsSubmitting(true);
        try {
            // Prepare items for API
            const orderItems = Object.entries(cart).map(([id, qty]) => {
                const product = products.find(p => p.id === id);
                return {
                    product_id: id,
                    quantity: qty,
                    price: product ? getPrice(product) : 0
                };
            });

            // Call API
            const { deliveryService } = require('../../services/deliveryService');
            const result = await deliveryService.createVanSalesOrder(
                user.id,
                orderItems,
                effectiveCountry, // Default if null, though validation should catch it
                'cash' // Hardcoded to 'cash' as per requirement
            );

            if (result.success) {
                setShowCheckout(false);
                setSuccessVisible(true);
                // Reload inventory to show updated stock
                loadInventory();
            } else {
                showAlert(result.error || 'Unknown error occurred.', 'Sale Failed', 'error');
            }

        } catch (error: any) {
            showAlert(error.message || 'Failed to complete sale', 'Error', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetAfterSale = () => {
        setSuccessVisible(false);
        setCart({});
        // Optionally deduct stock from local state here if not refetching
    };

    const renderProductItem = ({ item }: { item: Product }) => {
        const qtyInCart = cart[item.id] || 0;
        const price = getPrice(item);
        const stock = getStock(item);

        return (
            <View style={styles.productCard}>
                <View style={styles.productIcon}>
                    {/* Fallback to icon if no image, or use Image component if available */}
                    {item.image_url ?
                        <Image source={{ uri: item.image_url }} style={{ width: 50, height: 50, borderRadius: 8 }} />
                        :
                        <IconButton icon="package-variant" size={24} iconColor={colors.primary[600]} style={{ margin: 0 }} />
                    }
                </View>
                <View style={styles.productInfo}>
                    <Text variant="titleMedium" style={styles.productName}>{item.name}</Text>
                    <Text variant="bodySmall" style={{ color: colors.neutral[500] }}>
                        {t('vanSales.inventory')}: {isProductWeightBased(item) ? `${stock.toFixed(1)} Kg` : `${stock} Units`}
                    </Text>
                    <Text variant="titleSmall" style={{ marginTop: 4, fontWeight: 'bold', color: colors.primary[700] }}>
                        {formatCurrency(price, selectedCountry || user?.country_preference || 'germany')}
                        <Text style={{ fontSize: 10, fontWeight: 'normal', color: colors.neutral[500] }}>
                            {isProductWeightBased(item) ? ' /kg' : ' /pkt'}
                        </Text>
                    </Text>
                </View>

                {activeTab === 'sales' && (
                    <View style={styles.actionContainer}>
                        {qtyInCart > 0 ? (
                            <View style={styles.qtyControl}>
                                <IconButton
                                    icon="minus"
                                    size={20}
                                    style={styles.qtyBtn}
                                    onPress={() => removeFromCart(item)}
                                />
                                <Text style={{ marginHorizontal: 8, fontWeight: '700' }}>
                                    {isProductWeightBased(item) ? `${(qtyInCart / 1000).toFixed(1)} Kg` : `${qtyInCart} Pkt`}
                                </Text>
                                <IconButton
                                    icon="plus"
                                    size={20}
                                    style={styles.qtyBtn}
                                    iconColor={colors.primary[500]}
                                    onPress={() => addToCart(item)}
                                />
                            </View>
                        ) : (
                            <Button
                                mode="outlined"
                                compact
                                onPress={() => addToCart(item)}
                                style={{ borderRadius: 12, borderColor: colors.primary[200] }}
                                labelStyle={{ fontSize: 13 }}
                            >
                                {t('vanSales.addToCart')}
                            </Button>
                        )}
                    </View>
                )}
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={colors.primary[500]} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Premium Header */}
            <LinearGradient
                colors={[colors.navy[900], colors.navy[700]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <View style={[styles.headerTop, { justifyContent: 'center' }]}>
                    <Text style={styles.headerTitle}>{t('vanSales.title')}</Text>
                </View>
            </LinearGradient>

            {/* Search */}
            <View style={styles.searchContainer}>
                <Searchbar
                    placeholder={t('vanSales.searchPlaceholder')}
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                    elevation={0}
                    style={styles.searchBar}
                    inputStyle={{ minHeight: 0 }}
                />
            </View>

            {/* Product List */}
            <FlatList
                data={filteredProducts}
                renderItem={renderProductItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={loadInventory} colors={[colors.primary[500]]} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Icon name="package-variant" size={48} color={colors.neutral[300]} />
                        <Text style={{ color: colors.neutral[400], marginTop: 12 }}>{t('delivery.noMatch')}</Text>
                    </View>
                }
            />

            {/* Cart Summary (Floating) */}
            {activeTab === 'sales' && Object.keys(cart).length > 0 && (
                <AnimatedView animation="slide" enterFrom="bottom" style={styles.cartFooter}>
                    <View style={styles.cartInfo}>
                        <View style={styles.cartTotalRow}>
                            <Text style={styles.cartLabel}>{t('vanSales.totalEstimate')}</Text>
                            <Text style={styles.cartTotal}>
                                {formatCurrency(getCartTotal(), selectedCountry || user?.country_preference || 'germany')}
                            </Text>
                        </View>
                        <Text style={styles.cartWeight}>
                            {Object.entries(cart).map(([id, q]) => {
                                const p = products.find(x => x.id === id);
                                if (!p) return null;
                                return isProductWeightBased(p) ? `${(q / 1000).toFixed(1)}kg` : `${q}pkt`;
                            }).filter(Boolean).join(', ')}
                        </Text>
                    </View>
                    <Button
                        mode="contained"
                        buttonColor="white"
                        textColor={colors.navy[900]}
                        onPress={handleCheckout}
                        style={styles.checkoutBtn}
                        contentStyle={{ height: 48 }}
                        labelStyle={{ fontWeight: 'bold', fontSize: 16 }}
                        icon="arrow-right"
                    >
                        {t('vanSales.checkout')}
                    </Button>
                </AnimatedView>
            )
            }

            {/* Checkout Modal */}
            <Portal>
                <Modal visible={showCheckout} onDismiss={() => !isSubmitting && setShowCheckout(false)} contentContainerStyle={styles.modalContainer}>
                    <Surface style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t('vanSales.confirmSale')}</Text>
                        <Divider style={{ marginVertical: 16 }} />
                        <ScrollView style={{ maxHeight: 200 }}>
                            {Object.entries(cart).map(([id, qty]) => {
                                const item = products.find(p => p.id === id);
                                if (!item) return null;
                                return (
                                    <View key={id} style={styles.cartItemRow}>
                                        <Text style={styles.cartItemName}>{item.name}</Text>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={styles.cartItemPrice}>{formatCurrency(getPrice(item), selectedCountry || user?.country_preference || 'germany')}</Text>
                                            <Text style={styles.cartItemQty}>
                                                x {isProductWeightBased(item) ? `${(qty / 1000).toFixed(1)} Kg` : `${qty} Pkt`}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </ScrollView>

                        <Divider style={{ marginVertical: 16 }} />

                        <View style={styles.modalTotalRow}>
                            <Text style={styles.modalTotalLabel}>{t('vanSales.totalCollect')}</Text>
                            <Text style={styles.modalTotalValue}>
                                {formatCurrency(getCartTotal(), selectedCountry || user?.country_preference || 'germany')}
                            </Text>
                        </View>

                        <Button
                            mode="contained"
                            style={styles.modalBtn}
                            buttonColor={colors.success[600]}
                            icon="cash"
                            onPress={completeSale}
                            loading={isSubmitting}
                            disabled={isSubmitting}
                        >
                            {t('vanSales.collectCash')}
                        </Button>
                        <Button
                            mode="text"
                            onPress={() => setShowCheckout(false)}
                            style={{ marginTop: 8 }}
                            textColor={colors.neutral[500]}
                            disabled={isSubmitting}
                        >
                            {t('common.cancel')}
                        </Button>
                    </Surface>
                </Modal>
            </Portal>

            {/* Success Modal */}
            <Portal>
                <Modal visible={successVisible} onDismiss={resetAfterSale} contentContainerStyle={styles.modalContainer}>
                    <Surface style={[styles.modalContent, { alignItems: 'center' }]}>
                        <View style={styles.successIcon}>
                            <Icon name="check" size={40} color={colors.success[600]} />
                        </View>
                        <Text style={styles.successTitle}>{t('vanSales.saleComplete')}</Text>
                        <Text style={styles.successText}>
                            {t('vanSales.cashCollected')}
                        </Text>
                        <Button mode="contained" onPress={resetAfterSale} style={styles.modalBtn} buttonColor={colors.navy[900]}>
                            {t('deliveryDashboard.newSale')}
                        </Button>
                    </Surface>
                </Modal>
            </Portal>

            {/* Alert Modal */}
            <AlertModal
                visible={alertConfig.visible}
                onClose={() => setAlertConfig({ ...alertConfig, visible: false })}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                onConfirm={alertConfig.onConfirm}
            />

        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Header
    header: {
        backgroundColor: colors.navy[900],
        paddingTop: Platform.OS === 'android' ? 40 : 10,
        paddingBottom: 24,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        zIndex: 10,
    },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: 'white' },

    // Tabs
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginHorizontal: 20,
        marginTop: 16,
        borderRadius: 12,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    tabActive: {
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    tabText: { fontWeight: '600', color: colors.primary[200], fontSize: 13 },
    tabTextActive: { color: colors.navy[900] },

    // Search
    searchContainer: { padding: 16 },
    searchBar: {
        backgroundColor: 'white',
        borderRadius: 12,
        height: 48,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },

    // List
    listContent: { padding: 16, paddingBottom: 120 },
    emptyState: { alignItems: 'center', marginTop: 60 },

    // Product Card
    productCard: {
        flexDirection: 'row',
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 16,
        marginBottom: 12,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
    },
    productIcon: {
        width: 56,
        height: 56,
        backgroundColor: '#F0F9FF',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    productInfo: { flex: 1 },
    productName: { fontSize: 15, fontWeight: '700', color: colors.navy[900], marginBottom: 4 },
    actionContainer: { justifyContent: 'center' },

    // Quantity Controls
    qtyControl: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        borderRadius: 8,
        padding: 4,
    },
    qtyBtn: { margin: 0, width: 28, height: 28, borderRadius: 6 },

    // Footer
    cartFooter: {
        position: 'absolute',
        bottom: 110, // Increased further to show above tab bar
        left: 20,
        right: 20,
        backgroundColor: colors.navy[900],
        borderRadius: 20,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        elevation: 10,
        zIndex: 100, // Ensure it's on top
        shadowColor: colors.navy[900],
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    cartInfo: { flex: 1 },
    cartTotalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
    cartLabel: { color: colors.primary[200], fontSize: 11, fontWeight: '600' },
    cartTotal: { color: 'white', fontSize: 20, fontWeight: '700' },
    cartWeight: { color: colors.neutral[400], fontSize: 11, marginTop: 2 },
    checkoutBtn: { borderRadius: 12, minWidth: 120 },

    // Modals
    modalContainer: { padding: 20, justifyContent: 'center' },
    modalContent: { backgroundColor: 'white', padding: 24, borderRadius: 24, elevation: 6 },
    modalTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center', color: colors.navy[900] },
    cartItemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    cartItemName: { flex: 1, fontSize: 14, color: colors.navy[900], fontWeight: '500' },
    cartItemPrice: { fontWeight: '700', color: colors.navy[900] },
    cartItemQty: { fontSize: 11, color: colors.neutral[500] },
    modalTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTotalLabel: { fontSize: 16, color: colors.neutral[600] },
    modalTotalValue: { fontSize: 24, fontWeight: '800', color: colors.primary[700] },
    modalBtn: { paddingVertical: 6, borderRadius: 12 },

    // Success
    successIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    successTitle: { fontSize: 22, fontWeight: '800', color: colors.success[700], marginBottom: 8 },
    successText: { textAlign: 'center', color: colors.neutral[500], marginBottom: 24, fontSize: 15 },


});

export default DeliveryVanSalesScreen;
