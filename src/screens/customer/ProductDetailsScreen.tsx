/**
 * Modern Product Details Screen with Image Gallery, Sticky Add-to-Cart, and Smooth Transitions
 * Uses NativeWind for styling and Phase 2 components
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity, StyleSheet, Platform, Share } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { RootStackParamList } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { useProduct, useProducts } from '../../hooks/useProducts';
import { requireAuth } from '../../utils/requireAuth';
import { ImageGallery, Button, LoadingScreen, ErrorMessage, AppHeader, QuantitySelector, Badge, AnimatedView, FavoriteButton, ProductCard, AuthRequiredModal, useToast } from '../../components';
import { useLoading } from '../../contexts/LoadingContext';
import { productService } from '../../services/productService';
import { formatPrice, isInStock, getProductStock, isProductWeightBased } from '../../utils/productUtils';
import { mediumHaptic, successHaptic } from '../../utils/hapticFeedback';
import { COUNTRIES, PLAY_STORE_LINK, APP_NAME } from '../../constants';
import type { Country } from '../../constants';
import { colors } from '../../theme';
import {
  isSmallDevice,
  isTablet,
  isLandscape,
  getResponsivePadding,
  getResponsiveFontSize,
  responsiveWidth,
} from '../../utils/responsive';
import { addToRecentlyViewed } from '../../utils/recentlyViewed';

type ProductDetailsScreenRouteProp = RouteProp<RootStackParamList, 'ProductDetails'>;
type ProductDetailsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ProductDetails'>;

const ProductDetailsScreen = () => {
  const route = useRoute<ProductDetailsScreenRouteProp>();
  const navigation = useNavigation<ProductDetailsScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const { productId } = route.params;
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuthStore();
  const { addItem, selectedCountry } = useCartStore();
  const { showToast } = useToast();
  const loading = useLoading();
  const [quantity, setQuantity] = useState(1);

  const [showAuthModal, setShowAuthModal] = useState(false);

  // Responsive dimensions
  const isSmall = isSmallDevice();
  const isTabletDevice = isTablet();
  const isLandscapeMode = isLandscape();
  const padding = getResponsivePadding();

  // Calculate tab bar height to position sticky button above it
  const tabBarHeight = Platform.OS === 'ios' ? 60 : 56;
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 8 : 4);
  const totalTabBarHeight = tabBarHeight + bottomPadding;

  const country = (user?.country_preference || selectedCountry || COUNTRIES.GERMANY) as Country;
  const { data: product, isLoading, error, refetch } = useProduct(productId);

  // Add to recently viewed when product loads
  useEffect(() => {
    if (product) {
      addToRecentlyViewed(product.id, product.category);
      // Set default quantity
      const isLoose = isProductWeightBased(product);
      if (isLoose) {
        setQuantity(100);
      } else {
        setQuantity(1);
      }
    }
  }, [product]);

  // Get country-specific stock
  const stock = product ? getProductStock(product, country) : 0;

  // Fetch all products for related products
  const { data: allProducts = [] } = useProducts({ active: true });

  // Get related products (same category, excluding current product)
  const relatedProducts = React.useMemo(() => {
    if (!product || !allProducts.length) return [];
    return allProducts
      .filter(p => p.id !== product.id && p.category === product.category && p.active)
      .slice(0, 4);
  }, [product, allProducts]);

  // Share functionality
  const handleShare = async () => {
    if (!product) return;

    try {
      // Use the Vercel link as a "Smart Bridge" (Universal Link)
      // This is the ONLY link that Chat Apps (WhatsApp/etc) will make clickable 
      // AND that can take a user directly to a specific product inside the app.
      const productLink = `https://1st-project-g992.vercel.app/product/${product.id}`;

      const shareMessage = t('products.shareMessage', {
        name: product.name,
        appName: APP_NAME,
        link: productLink,
        appStoreLink: PLAY_STORE_LINK
      });

      await Share.share(
        {
          message: shareMessage,
          url: productLink,
          title: t('products.shareTitle', { name: product.name }),
        },
        {
          dialogTitle: t('products.shareTitle', { name: product.name }),
        }
      );
    } catch (error: any) {
      showToast({
        message: t('products.failedToShare'),
        type: 'error',
        duration: 3000,
      });
    }
  };

  if (isLoading) {
    return <LoadingScreen message={t('products.loadingDetails')} />;
  }

  if (error || !product) {
    return (
      <View style={{ flex: 1, backgroundColor: 'rgba(245, 245, 250, 0.95)' }}>
        <AppHeader title={t('products.detailsTitle')} showBack />
        <ErrorMessage
          message={t('products.failedToLoadDetails')}
          error={error}
          onRetry={() => { refetch?.(); }}
          retryWithBackoff={true}
        />
      </View>
    );
  }

  const price = product ? productService.getProductPrice(product, country) : 0;
  const inStock = isInStock(product, country);

  // Calculate availability based on price and regional active flag
  const isGermany = country === COUNTRIES.GERMANY;
  const isDenmark = country === COUNTRIES.DENMARK;
  const regionalActive = isGermany ? product.active_germany : isDenmark ? product.active_denmark : false;
  const isAvailableInRegion = (regionalActive !== false) && (price > 0);
  const images = product.image_url ? [product.image_url] : [];
  const isLoose = isProductWeightBased(product);

  const handleAddToCart = async () => {
    // Check authentication - if not authenticated, prompt to login/register
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    if (!isAvailableInRegion) {
      showToast({
        message: t('products.notAvailableInRegion'),
        type: 'error',
        duration: 3000,
      });
      return;
    }

    if (!inStock) {
      showToast({
        message: t('products.outOfStock'),
        type: 'warning',
        duration: 3000,
      });
      return;
    }

    // 1. Loading spinner-ஐ உடனடியாக show செய்யவும்
    loading.showLoading();

    // ✅ KEY FIX: setTimeout wraps the async work to allow UI paint
    // We use 50ms to guarantee the JS thread yields to the specific Native UI thread for the spinner to appear
    setTimeout(() => {
      console.log('🕒 [ProductDetailsScreen] Timer fired, starting addItem');

      addItem(product, quantity, country)
        .then(() => {
          console.log('🛒 [ProductDetailsScreen] addItem completed');
          // 3. Success feedback
          successHaptic();
          showToast({
            message: t('products.addedToCart'),
            type: 'success',
            duration: 2000,
          });
        })
        .catch((error: any) => {
          console.error('Error adding to cart:', error);
          showToast({
            message: error.message || t('cart.failedToAdd'),
            type: 'error',
            duration: 3000,
          });
        })
        .finally(() => {
          console.log('🏁 [ProductDetailsScreen] Finally block reached, scheduling hideLoading in 100ms');
          // 4. Loading spinner-ஐ hide செய்யவும்
          // Add a small delay to ensure the Cart UI update (which is heavy) doesn't block the spinner hiding
          setTimeout(() => {
            console.log('🏁 [ProductDetailsScreen] Executing hideLoading');
            loading.hideLoading();
          }, 100);
        });
    }, 50);
  };

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    const stockKg = getProductStock(product, country);
    const isLoose = isProductWeightBased(product);
    const minQty = isLoose ? 100 : 1;
    const maxQty = isLoose ? stockKg * 1000 : Math.floor(stockKg / ((product.pack_size_grams || 1000) / 1000));

    if (newQuantity >= minQty && newQuantity <= maxQty) {
      setQuantity(newQuantity);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <AppHeader title={product.name} showBack showCart={false} />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 140,
          paddingHorizontal: isTabletDevice && !isLandscapeMode ? padding.horizontal * 2 : 0,
        }}
      >
        {/* Image Gallery */}
        <AnimatedView animation="fade" delay={0}>
          <ImageGallery images={images} />
        </AnimatedView>

        {/* Product Info Section */}
        <AnimatedView
          animation="slide"
          delay={100}
          enterFrom="bottom"
          style={{
            paddingHorizontal: padding.horizontal,
            paddingTop: padding.vertical * 1.5,
            maxWidth: isTabletDevice && !isLandscapeMode ? 600 : '100%',
            alignSelf: isTabletDevice && !isLandscapeMode ? 'center' : 'stretch',
          }}
        >
          {/* Category & Stock Row */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-2">
              <Badge
                variant={product.category === 'fresh' ? 'success' : 'secondary'}
                size="sm"
                className="rounded-full px-3"
              >
                {product.category === 'fresh' ? t('products.fresh') : t('products.frozen')}
              </Badge>
              {!isAvailableInRegion ? (
                <View className="flex-row items-center bg-neutral-100 px-2 py-1 rounded-full">
                  <Icon name="map-marker-off" size={14} color={colors.neutral[500]} />
                  <Text className="text-xs text-neutral-600 ml-1 font-semibold uppercase tracking-wider">
                    {t('products.unavailableInRegion', { region: t(`common.${country}`) })}
                  </Text>
                </View>
              ) : inStock ? (
                <View className="flex-row items-center bg-success-50 px-2 py-1 rounded-full">
                  <Icon name="check-circle" size={14} color={colors.success[500]} />
                  <Text className="text-xs text-success-600 ml-1 font-semibold uppercase tracking-wider">
                    {t('products.inStock')}
                  </Text>
                </View>
              ) : (
                <View className="flex-row items-center bg-error-50 px-2 py-1 rounded-full">
                  <Icon name="close-circle" size={14} color={colors.error[500]} />
                  <Text className="text-xs text-error-600 ml-1 font-semibold uppercase tracking-wider">
                    {t('products.outOfStock')}
                  </Text>
                </View>
              )}
            </View>

            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={handleShare}
                className="p-2 bg-neutral-100 rounded-full"
                accessibilityRole="button"
                accessibilityLabel="Share product"
              >
                <Icon name="share-variant" size={20} color={colors.neutral[700]} />
              </TouchableOpacity>

            </View>
          </View>

          {/* Title & Price */}
          <Text className="text-3xl font-extrabold text-neutral-900 mb-2 leading-tight">
            {product.name}
          </Text>

          <View className="flex-row items-baseline gap-2 mb-6">
            <Text className="text-3xl font-bold text-primary-600">
              {formatPrice(price, country)}
            </Text>
            <Text className="text-sm text-neutral-400 font-medium">
              / {isLoose ? 'kg' : t('common.packet')}
            </Text>
          </View>

          {/* Availability Detail */}
          {inStock && (
            <Text className="text-neutral-500 text-sm mb-6 bg-neutral-50 p-3 rounded-xl border border-neutral-100">
              <Icon name="information-outline" size={14} color={colors.neutral[500]} />
              {' '}{t('products.availableStock')} <Text className="font-bold text-neutral-800">
                {isLoose ? `${stock >= 1 ? stock.toFixed(2) + 'kg' : (stock * 1000).toFixed(0) + 'g'}` : `${Math.floor(stock / ((product.pack_size_grams || 1000) / 1000))} ${t('products.packets')}`}
              </Text>
            </Text>
          )}

          {/* Description */}
          {product.description && (
            <View className="mb-8">
              <Text className="text-lg font-bold text-neutral-900 mb-2">
                {t('products.aboutTitle')}
              </Text>
              <Text className="text-base text-neutral-600 leading-relaxed">
                {product.description}
              </Text>
            </View>
          )}

          {/* Selection Area */}
          {inStock && (
            <View className="mb-8 bg-neutral-50 p-6 rounded-3xl border border-neutral-100">
              <View className="flex-row justify-between items-center mb-4">
                <View>
                  <Text className="text-lg font-bold text-neutral-900">
                    {isLoose ? t('products.weightBasedQuantity') : t('products.quantity')}
                  </Text>
                  <Text className="text-xs text-neutral-500 font-medium uppercase tracking-tighter">
                    {isLoose ? t('products.weightBasedHelper') : t('products.unitBasedHelper')}
                  </Text>
                </View>
              </View>

              <QuantitySelector
                value={quantity}
                onChange={(newQuantity) => {
                  const stockKg = getProductStock(product, country);
                  const maxQuantity = isLoose ? stockKg * 1000 : Math.floor(stockKg / ((product.pack_size_grams || 1000) / 1000));
                  if (newQuantity >= (isLoose ? 100 : 1) && newQuantity <= maxQuantity) {
                    setQuantity(newQuantity);
                  }
                }}
                min={isLoose ? 100 : 1}
                max={isLoose ? getProductStock(product, country) * 1000 : Math.floor(getProductStock(product, country) / ((product.pack_size_grams || 1000) / 1000))}
                isWeightBased={isLoose}
                step={isLoose ? 100 : 1}
              />
            </View>
          )}

          {/* Related Products Section */}
          {relatedProducts.length > 0 && (
            <View className="mb-8">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-xl font-bold text-neutral-900">
                  {t('products.relatedProducts')}
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Main', { screen: 'Products' })}
                >
                  <Text className="text-sm font-bold text-primary-500 uppercase tracking-widest">{t('products.seeAll')}</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 16 }}
              >
                {relatedProducts.map((relatedProduct, index) => (
                  <View
                    key={relatedProduct.id}
                    style={{
                      marginRight: 16,
                      width: isSmall ? responsiveWidth(42) : isTabletDevice ? 220 : 180,
                    }}
                  >
                    <ProductCard
                      product={relatedProduct}
                      country={country}
                      onPress={() => {
                        navigation.replace('ProductDetails', { productId: relatedProduct.id });
                      }}
                      index={index}
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </AnimatedView>
      </ScrollView>

      {/* Sticky Bottom Bar - Premium Redesign */}
      <View
        style={[
          styles.stickyContainer,
          {
            paddingBottom: insets.bottom + 12,
            paddingHorizontal: 24,
          }
        ]}
      >
        <View style={styles.stickyContent}>
          <View style={styles.totalInfo}>
            <Text style={styles.totalLabel}>{t('products.grandTotal')}</Text>
            <Text style={styles.totalValue}>
              {formatPrice(
                isLoose ? (price * quantity) / 1000 : price * quantity,
                country
              )}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleAddToCart}
            disabled={!inStock || !isAvailableInRegion}
            activeOpacity={0.8}
            style={[
              styles.cartIconButton,
              (!inStock || !isAvailableInRegion) && styles.disabledButton,
              { backgroundColor: (inStock && isAvailableInRegion) ? colors.primary[500] : colors.neutral[300] }
            ]}
          >
            {(!isAvailableInRegion) ? (
              <Icon name="map-marker-remove" size={28} color="white" />
            ) : inStock ? (
              <Icon name="cart-plus" size={28} color="white" />
            ) : (
              <Icon name="cart-off" size={28} color="white" />
            )}
            {(!inStock || !isAvailableInRegion) && (
              <Text style={styles.outOfStockText}>{!isAvailableInRegion ? t('products.regionBadge') : t('products.waitBadge')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Auth Required Modal */}
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
    </View >
  );
};

const styles = StyleSheet.create({
  stickyContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 20,
    // Modern shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 20,
  },
  stickyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalInfo: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#10B981', // Premium green
  },
  cartIconButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    // Button shadow
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  disabledButton: {
    shadowOpacity: 0.1,
    elevation: 2,
  },
  outOfStockText: {
    position: 'absolute',
    bottom: 8,
    fontSize: 8,
    color: 'white',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
});

export default ProductDetailsScreen;


