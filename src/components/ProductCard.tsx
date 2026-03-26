/**
 * Modern ProductCard with Clean Design
 * Matching the new UI mockup with FREE DELIVERY badge, ratings, and sold count
 */

import React, { useCallback } from 'react';
import { View, Text, Pressable, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import ProgressiveImage from './ProgressiveImage';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Product } from '../types';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { productService } from '../services';
import { COUNTRIES } from '../constants';
import type { Country } from '../constants';
import { colors } from '../theme';
import { EASING, ANIMATION_DURATION } from '../utils/animations';
import { mediumHaptic, errorHaptic } from '../utils/hapticFeedback';
import { formatCurrency } from '../utils/regionalFormatting';
import { isProductWeightBased, getProductStock, formatPrice, isInStock } from '../utils/productUtils';

// Use Pressable instead of TouchableOpacity to avoid button nesting on web
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Design colors
const cardColors = {
  teal: '#3AB5D1',
  orange: '#E85D04',
  green: '#22C55E',
  blue: '#3B82F6',
  gray: '#6B7280',
  lightGray: '#9CA3AF',
  stockGreen: '#22C55E',
};

interface ProductCardProps {
  product: Product;
  country?: Country;
  onPress?: () => void;
  onAddToCart?: (quantity: number) => void;
  index?: number;
  style?: any;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  country,
  onPress,
  onAddToCart,
  index = 0,
  style,
}) => {
  const { t } = useTranslation();
  const { addItem } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();
  const selectedCountry = country || (user?.country_preference || COUNTRIES.GERMANY) as Country;
  const price = productService.getProductPrice(product, selectedCountry);
  const stock = selectedCountry === COUNTRIES.GERMANY
    ? product.stock_germany
    : product.stock_denmark;

  // Sell Type logic - Matching productUtils.ts for consistency
  const isLoose = isProductWeightBased(product);
  const productIsInStock = isInStock(product, selectedCountry);

  // Local state for quantity input (before adding to cart)
  const [quantity, setQuantity] = React.useState(isLoose ? 100 : 1);

  const scale = useSharedValue(1);

  React.useEffect(() => {
    // Reset quantity when sell_type changes or product changes (if recycled)
    setQuantity(isLoose ? 100 : 1);
  }, [product.id, isLoose]);

  const handlePressIn = useCallback(() => {
    scale.value = withTiming(0.98, { duration: ANIMATION_DURATION.fast, easing: EASING.easeOut });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: ANIMATION_DURATION.fast, easing: EASING.easeOut });
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleAddToCart = useCallback((e?: any) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }

    // Check if user is authenticated — parent screens handle the auth modal
    if (!isAuthenticated) {
      errorHaptic();
      return;
    }

    if (productIsInStock) {
      mediumHaptic();
      if (onAddToCart) {
        onAddToCart(quantity);
      } else {
        addItem(product, quantity, selectedCountry).catch((error) => {
          if (__DEV__) console.error('Error adding to cart:', error);
        });
      }
    }
  }, [isAuthenticated, productIsInStock, onAddToCart, quantity, addItem, product, selectedCountry]);

  const incrementQty = useCallback(() => {
    const stockKg = getProductStock(product, selectedCountry);
    const maxQty = isLoose ? stockKg * 1000 : Math.floor(stockKg / ((product.pack_size_grams || 1000) / 1000));

    if (isLoose) {
      setQuantity(prev => Math.min(maxQty, prev + 100));
    } else {
      setQuantity(prev => Math.min(maxQty, prev + 1));
    }
  }, [product, selectedCountry, isLoose]);

  const decrementQty = useCallback(() => {
    if (isLoose) {
      setQuantity(prev => Math.max(100, prev - 100)); // Min 100g step
    } else {
      setQuantity(prev => Math.max(1, prev - 1));
    }
  }, [isLoose]);

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle, cardStyles.container, style]}
    >
      {/* Image Section */}
      <View style={cardStyles.imageContainer}>
        {product.image_url && !product.image_url.endsWith('/undefined') ? (
          <ProgressiveImage
            source={{ uri: product.image_url }}

            placeholder="skeleton"
            style={cardStyles.image}
            containerStyle={cardStyles.image}
            // Add key to force re-render when image_url changes
            key={`product-card-${product.id}-${product.image_url}`}
            onError={() => {
              if (__DEV__) {
                console.error('[ProductCard] Failed to load image for product:', product.id, product.name);
              }
            }}
          />
        ) : (
          <View style={cardStyles.imagePlaceholder}>
            <Icon name="image-off" size={40} color={colors.neutral[300]} />
          </View>
        )}

        {/* Category Badge */}
        <View style={[
          cardStyles.categoryBadge,
          { backgroundColor: product.category === 'fresh' ? cardColors.green : cardColors.blue }
        ]}>
          <Text style={cardStyles.categoryText}>
            {product.category.toUpperCase()}
          </Text>
        </View>

        {/* Out of Stock Overlay */}
        {!productIsInStock && (
          <View style={cardStyles.outOfStockOverlay}>
            <View style={cardStyles.outOfStockBadge}>
              <Text style={cardStyles.outOfStockText}>{t('products.outOfStock')}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Content Section */}
      <View style={cardStyles.content}>
        {/* Product Name */}
        <Text
          style={cardStyles.productName}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {product.name}
        </Text>

        {/* Price */}
        <Text style={cardStyles.price}>
          {formatCurrency(price, selectedCountry)}
          <Text style={cardStyles.unitText}>
            {isLoose ? ` /kg` : ` /${product.unit || 'pkt'}`}
          </Text>
        </Text>

        {/* Stock Info */}
        <Text style={cardStyles.stockText}>
          {isLoose
            ? `${stock >= 1 ? stock.toFixed(2) + 'kg' : (stock * 1000).toFixed(0) + 'g'} ${t('products.inStock').toLowerCase()}`
            : `${Math.floor(stock)} ${product.unit || 'packets'} ${t('products.inStock').toLowerCase()}`}
        </Text>

        {/* Controls */}
        <View style={cardStyles.controlsContainer}>
          {/* Quantity Selector */}
          <View style={cardStyles.qtyContainer}>
            <TouchableOpacity onPress={decrementQty} style={cardStyles.qtyBtn}>
              <Icon name="minus" size={12} color="black" />
            </TouchableOpacity>

            {isLoose ? (
              <View style={cardStyles.looseInputContainer}>
                <Text style={cardStyles.qtyText}>{quantity}</Text>
                <Text style={cardStyles.qtyUnit}>g</Text>
              </View>
            ) : (
              <Text style={cardStyles.qtyText}>{quantity}</Text>
            )}

            <TouchableOpacity onPress={incrementQty} style={cardStyles.qtyBtn}>
              <Icon name="plus" size={12} color="black" />
            </TouchableOpacity>
          </View>

          {/* Add Button */}
          <TouchableOpacity
            style={[
              cardStyles.addButton,
              !productIsInStock && cardStyles.addButtonDisabled
            ]}
            onPress={handleAddToCart}
            disabled={!productIsInStock}
            activeOpacity={0.7}
          >
            <Icon name="cart-plus" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </View>

    </AnimatedPressable>
  );
};

const cardStyles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    flex: 1,
    minHeight: 240, // Increased height for controls
  },

  imageContainer: {
    width: '100%',
    height: 110,
    backgroundColor: '#F5F5F5',
    position: 'relative',
    overflow: 'hidden',
  },

  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  freeDeliveryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#3AB5D1',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 5,
  },
  freeDeliveryText: {
    color: 'white',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  categoryBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    zIndex: 5,
  },
  categoryText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  outOfStockBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'white',
  },
  outOfStockText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  content: {
    padding: 10,
    flex: 1,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
    height: 30,
  },

  price: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E85D04',
    marginBottom: 2,
  },
  unitText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: 'normal',
  },

  stockText: {
    fontSize: 10,
    color: '#22C55E',
    fontWeight: '500',
    marginBottom: 8,
    lineHeight: 14,
  },

  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    padding: 2,
  },
  qtyBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  qtyText: {
    fontSize: 12,
    fontWeight: '600',
    marginHorizontal: 8,
    minWidth: 16,
    textAlign: 'center',
  },
  looseInputContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  qtyUnit: {
    fontSize: 10,
    color: '#6B7280',
  },

  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3AB5D1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3AB5D1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  addButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
  },
});

export default React.memo(ProductCard);
