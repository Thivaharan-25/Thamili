/**
 * Modern Cart Screen with Swipe-to-Delete, Quantity Animations, Sticky Total,
 * and Item Selection (Checkbox + Select All + Bulk Actions)
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  TouchableOpacity,
  StyleSheet,
  Platform,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../types';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { useProducts } from '../../hooks/useProducts';
import { useLoading } from '../../contexts/LoadingContext';
import {
  SwipeableCartItem,
  AppHeader,
  Button,
  EmptyState,
  Card,
  AnimatedView,
  useToast,
  AuthRequiredModal,
  RemoveItemModal
} from '../../components';
import { successHaptic, errorHaptic, warningHaptic } from '../../utils/hapticFeedback';
import { formatCartSummary } from '../../utils/cartUtils';
import { validateCart, updateCartWithProductData } from '../../utils/cartValidation';
import { getProductStock } from '../../utils/productUtils';
import { COUNTRIES } from '../../constants';
import type { Country } from '../../constants';
import { colors } from '../../theme';
import {
  isSmallDevice,
  isTablet,
  isLandscape,
  getResponsivePadding,
} from '../../utils/responsive';

type CartScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Cart'>;

const CartScreen = () => {
  const navigation = useNavigation<CartScreenNavigationProp>();
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuthStore();
  const { selectedCountry } = useCartStore();
  const { showToast } = useToast();
  const loading = useLoading();
  const insets = useSafeAreaInsets();

  const rawCountry = (isAuthenticated && user?.country_preference)
    ? user.country_preference
    : (selectedCountry || COUNTRIES.GERMANY);

  // Normalize country for consistent usage
  const country = (rawCountry?.toLowerCase() || COUNTRIES.GERMANY) as Country;

  const [showAuthModal, setShowAuthModal] = useState(false);

  // Remove Item Modal State
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<string | null>(null);
  const [isRemovingMultiple, setIsRemovingMultiple] = useState(false);

  const isSmall = isSmallDevice();
  const isTabletDevice = isTablet();
  const isLandscapeMode = isLandscape();
  const padding = getResponsivePadding();

  const tabBarHeight = Platform.OS === 'ios' ? 60 : 56;
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 8 : 4);
  const totalTabBarHeight = tabBarHeight + bottomPadding;

  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    loadCart,
    toggleItemSelection,
    toggleAllItems,
    getSelectedCount,
    getTotal,
  } = useCartStore();

  const { data: products = [] } = useProducts({ active: true });

  const isAllSelected = items.length > 0 && items.every((i) => i.isSelected);
  const hasSelection = items.some((i) => i.isSelected);
  const selectedCount = getSelectedCount();

  const handleRemoveSelected = () => {
    setIsRemovingMultiple(true);
    setShowRemoveModal(true);
  };

  useEffect(() => {
    loadCart();
  }, []);

  useEffect(() => {
    if (products.length === 0 || items.length === 0) return;

    const currentItems = useCartStore.getState().items;
    const syncItems = updateCartWithProductData(currentItems, products);

    // Deduplicate
    const updatedItems: typeof currentItems = [];
    const seenKeys = new Set<string>();
    syncItems.forEach(item => {
      const key = `${item.product.id}-${item.selectedCountry}`;
      if (!seenKeys.has(key)) { updatedItems.push(item); seenKeys.add(key); }
    });

    // Detect changes with a fast length-first check
    let hasChanges = updatedItems.length !== currentItems.length;
    if (!hasChanges) {
      const updatedMap = new Map(updatedItems.map(i => [i.product.id, i]));
      hasChanges = currentItems.some(item => {
        const u = updatedMap.get(item.product.id);
        if (!u) return true;
        return (
          item.product.image_url !== u.product.image_url ||
          item.product.price_germany !== u.product.price_germany ||
          item.product.price_denmark !== u.product.price_denmark ||
          item.product.stock_germany !== u.product.stock_germany ||
          item.product.stock_denmark !== u.product.stock_denmark ||
          item.product.active !== u.product.active
        );
      });
    }

    if (hasChanges) {
      const validatedItems = updatedItems.map(item =>
        item.product.sell_type === 'loose' && item.quantity < 100
          ? { ...item, quantity: 100 }
          : item
      );
      useCartStore.setState({ items: validatedItems });
      useCartStore.getState().saveCart(validatedItems).catch(console.error);
    }
  }, [products]);

  const selectedItems = useMemo(() => items.filter(i => i.isSelected), [items]);
  const cartValidation = useMemo(() => validateCart(selectedItems), [selectedItems]);

  const cartSummary = useMemo(() => {
    return formatCartSummary(selectedItems, country, null, false);
  }, [selectedItems, country]);

  const handleQuantityChange = async (productId: string, newQuantity: number) => {
    const item = items.find((i) => i.product.id === productId);
    if (!item) return;

    const isLoose = item.product.sell_type === 'loose';

    // Delete handling
    if (newQuantity <= 0) {
      if (isLoose) {
        // For loose products (grams), Typing 0 shouldn't delete the item immediately
        // as the user might be starting to type a larger number (e.g. 500)
        // We'll let the user delete explicitly via the X button or swipe.
        return;
      }
      await removeItem(productId);
      return;
    }

    const stockKg = getProductStock(item.product, item.selectedCountry);
    const packSize = item.product.pack_size_grams || 1000;
    const maxQuantity = isLoose
      ? stockKg * 1000
      : Math.floor(stockKg / (packSize / 1000));
    const minQuantity = isLoose ? 100 : 1;

    // Validation
    if (newQuantity > maxQuantity) {
      warningHaptic();
      const displayMax = isLoose
        ? (maxQuantity >= 1000 ? `${maxQuantity / 1000}kg` : `${maxQuantity}g`)
        : maxQuantity;
      showToast({
        message: t('cart.onlyAvailable', { displayMax, itemName: item.product.name }),
        type: 'warning',
        duration: 3000,
      });
      await updateQuantity(productId, maxQuantity);
    } else {
      // For min quantity, we DON'T enforce it aggressively while typing (newQuantity < minQuantity)
      // because it makes typing numbers like 500 impossible (it pops back to 100 as soon as you type '5').
      // The QuantitySelector component will handle enforcing the 100g minimum on BLUR.
      await updateQuantity(productId, newQuantity);
    }
  };

  const handleRemoveItem = (productId: string) => {
    setItemToRemove(productId);
    setIsRemovingMultiple(false);
    setShowRemoveModal(true);
  };

  const confirmRemove = async () => {
    setShowRemoveModal(false);

    if (isRemovingMultiple) {
      // Remove multiple items
      try {
        const selectedItems = items.filter(i => i.isSelected);
        for (const item of selectedItems) {
          await removeItem(item.product.id);
        }
        successHaptic();
        showToast({
          message: t('cart.itemsRemoved', { count: selectedCount, plural: selectedCount > 1 ? 's' : '' }),
          type: 'success',
          duration: 2500,
        });
      } catch (error) {
        errorHaptic();
        showToast({ message: t('cart.failedToRemoveItems'), type: 'error' });
      }
    } else if (itemToRemove) {
      // Remove single item
      const item = items.find((i) => i.product.id === itemToRemove);
      try {
        await removeItem(itemToRemove);
        successHaptic();
        showToast({
          message: t('cart.itemRemoved', { itemName: item?.product.name || t('common.item') }),
          type: 'success',
          duration: 2000,
        });
      } catch (error) {
        errorHaptic();
        showToast({
          message: t('cart.failedToRemoveItem'),
          type: 'error',
        });
      }
    }

    // Reset state
    setItemToRemove(null);
    setIsRemovingMultiple(false);
  };

  const handleCheckout = () => {
    const { isAuthenticated } = useAuthStore.getState();

    if (!isAuthenticated) {
      warningHaptic();
      setShowAuthModal(true);
      return;
    }

    if (selectedItems.length === 0) {
      Alert.alert(t('cart.noItemsSelected'), t('cart.selectItemToCheckout'));
      return;
    }

    if (!cartValidation.isValid) {
      Alert.alert(t('cart.cartIssues'), cartValidation.errors.join('\n') + '\n\n' + t('cart.updateCartBeforeCheckout'));
      return;
    }

    navigation.navigate('Checkout');
  };

  const handleContinueShopping = () => {
    // 1. Loading spinner-ஐ உடனடியாக show செய்யவும்
    loading.showLoading();

    // ✅ KEY FIX: setTimeout wraps the async work to allow UI paint
    setTimeout(() => {
      console.log('🕒 [CartScreen] Timer fired, navigating to Products');

      navigation.navigate('Main', { screen: 'Products' });

      // 4. Loading spinner-ஐ hide செய்யவும்
      // Add a small delay to ensure the UI update doesn't block the spinner hiding
      setTimeout(() => {
        console.log('🏁 [CartScreen] Executing hideLoading');
        loading.hideLoading();
      }, 500); // 500ms allows for screen transition
    }, 50);
  };

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <AppHeader title={t('cart.title')} showCart={false} />
        <EmptyState
          icon="cart-off"
          title={t('cart.empty')}
          message={t('cart.emptyMessage')}
          actionLabel={t('cart.continueShopping')}
          onAction={() => navigation.navigate('Main', { screen: 'Products' })}
          suggestions={[
            t('cart.suggestion1'),
            t('cart.suggestion2'),
            t('cart.suggestion3'),
          ]}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
      <AppHeader title={t('cart.title')} showCart={false} showLogo={false} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: 16,
            paddingBottom: totalTabBarHeight + 320, // Increased further from 220 to 320
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={loadCart} tintColor={colors.primary[500]} colors={[colors.primary[500]]} />
        }
      >
        <View
          style={[
            styles.content,
            {
              paddingHorizontal: padding.horizontal,
              maxWidth: isTabletDevice && !isLandscapeMode ? 600 : '100%',
              alignSelf: isTabletDevice && !isLandscapeMode ? 'center' : 'stretch',
            },
          ]}
        >
          {/* Selection Header - Modern Card Style */}
          <View style={styles.selectionCard}>
            <TouchableOpacity onPress={() => toggleAllItems(!isAllSelected)} style={styles.selectAllRow}>
              <View style={[styles.checkbox, isAllSelected && styles.checkboxSelected]}>
                <Icon
                  name={isAllSelected ? 'check' : undefined}
                  size={16}
                  color={isAllSelected ? 'white' : 'transparent'}
                />
              </View>
              <Text style={styles.selectAllText}>
                {isAllSelected ? t('cart.deselectAll') : t('cart.selectAll')}
              </Text>
            </TouchableOpacity>

            {hasSelection && (
              <View style={styles.selectionActions}>
                <Text style={styles.selectionCount}>
                  {t('common.selectedCount', { count: selectedCount })}
                </Text>
                <TouchableOpacity onPress={handleRemoveSelected} style={styles.deleteButton}>
                  <Icon name="trash-can-outline" size={20} color={colors.error[500]} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Cart Validation Warning */}
          {!cartValidation.isValid && (
            <AnimatedView animation="fade" delay={0}>
              <View style={styles.warningCard}>
                <View style={styles.warningHeader}>
                  <Icon name="alert-circle" size={20} color="#D97706" />
                  <Text style={styles.warningTitle}>{t('common.actionRequired')}</Text>
                </View>
                <Text style={styles.warningText}>{cartValidation.errors.join(', ')}</Text>
              </View>
            </AnimatedView>
          )}

          {/* Cart Items */}
          <View style={styles.cartItemsContainer}>
            {items.map((item) => (
              <SwipeableCartItem
                key={`${item.product.id}-${item.selectedCountry}`}
                item={item}
                onQuantityChange={(quantity) => handleQuantityChange(item.product.id, quantity)}
                onRemove={() => handleRemoveItem(item.product.id)}
                country={country}
                isSelected={item.isSelected ?? true}
                onToggleSelect={() => toggleItemSelection(item.product.id)}
                showCheckbox={true}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Modern Sticky Footer */}
      <AnimatedView
        animation="slide"
        delay={100}
        enterFrom="bottom"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: totalTabBarHeight, // Sit above tab bar
          backgroundColor: 'white',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingHorizontal: 20,
          paddingVertical: 20,
          shadowColor: '#091E42',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
          elevation: 20,
          maxWidth: isTabletDevice && !isLandscapeMode ? 600 : '100%',
          alignSelf: isTabletDevice && !isLandscapeMode ? 'center' : 'stretch',
        }}
      >

        {/* Discount section removed as it's not supported by formatCartSummary yet */}

        <View style={styles.divider} />
        <View style={[styles.summaryRow, { marginBottom: 20 }]}>
          <Text style={styles.totalLabel}>{t('cart.total')}</Text>
          <View>
            <Text style={styles.totalValue}>{cartSummary.total}</Text>
          </View>
        </View>

        <Button
          title={t('cart.checkout') || 'Checkout'}
          onPress={handleCheckout}
          disabled={!cartValidation.isValid}
          fullWidth
          size={i18n.language === 'ta' ? 'md' : 'lg'}
          variant="primary"
          icon={<Icon name="arrow-right" size={20} color="white" />}
          style={{ shadowColor: colors.primary[500], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 }}
        />

        {!cartValidation.isValid && (
          <Text style={styles.disabledHint}>{t('cart.fixCartIssues')}</Text>
        )}
      </AnimatedView>

      <AuthRequiredModal
        visible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={() => {
          setShowAuthModal(false);
          navigation.navigate('Login');
        }}
        onRegister={() => {
          setShowAuthModal(false);
          navigation.navigate('Register');
        }}
      />

      <RemoveItemModal
        visible={showRemoveModal}
        onClose={() => setShowRemoveModal(false)}
        onConfirm={confirmRemove}
        itemName={itemToRemove ? items.find(i => i.product.id === itemToRemove)?.product.name : ''}
        count={selectedCount}
        isMultiple={isRemovingMultiple}
      />
    </View >
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 6,
    paddingBottom: 140,
  },
  content: {},

  // New Selection Header - Card Style
  selectionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary[500],
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxSelected: {
    backgroundColor: colors.primary[500],
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[800],
  },
  selectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectionCount: {
    fontSize: 13,
    color: colors.neutral[500],
    fontWeight: '500',
    marginRight: 12,
  },
  deleteButton: {
    padding: 6,
    backgroundColor: colors.error[50], // Light red bg
    borderRadius: 8,
  },

  // Warning Card
  warningCard: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#FFFBEB', // Amber 50
    borderWidth: 1,
    borderColor: '#FCD34D', // Amber 300
    borderRadius: 12,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#B45309', // Amber 700
    marginLeft: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#92400E', // Amber 800
    lineHeight: 20,
  },

  cartItemsContainer: {
    marginBottom: 16,
  },

  // Footer Summary Styles
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 15,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 15,
    color: colors.neutral[800],
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral[100],
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.neutral[900],
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary[600],
    textAlign: 'right',
  },
  taxLabel: {
    fontSize: 11,
    color: colors.neutral[400],
    textAlign: 'right',
    marginTop: 2,
  },
  disabledHint: {
    fontSize: 13,
    color: colors.error[500],
    textAlign: 'center',
    marginTop: 12,
  },
});

CartScreen.displayName = 'CartScreen';

export default CartScreen;