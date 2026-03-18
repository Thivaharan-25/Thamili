/**
 * Swipeable Cart Item Component
 * Enhanced cart item with swipe-to-delete functionality
 */

import React, { useRef, memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Swipeable } from 'react-native-gesture-handler';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { CartItem as CartItemType } from '../types';
import QuantitySelector from './QuantitySelector';
import { formatPrice, isInStock } from '../utils/productUtils';
import { COUNTRIES } from '../constants';
import type { Country } from '../constants';
import { useTheme } from '../hooks/useTheme';
import { useSavedForLaterStore } from '../store/savedForLaterStore';
import ProgressiveImage from './ProgressiveImage';

interface SwipeableCartItemProps {
  item: CartItemType;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
  onSaveForLater?: () => void;
  country: Country;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  showCheckbox?: boolean;
}

const SwipeableCartItem: React.FC<SwipeableCartItemProps> = ({
  item,
  onQuantityChange,
  onRemove,
  onSaveForLater,
  country,
  isSelected = false,      // ✅ ADD THIS
  onToggleSelect,          // ✅ ADD THIS
  showCheckbox = false,
}) => {
  const { t } = useTranslation();
  const { colors: themeColors } = useTheme();
  const { addItem: saveForLater, isSaved } = useSavedForLaterStore();
  const swipeableRef = useRef<Swipeable>(null);

  const handleSaveForLater = () => {
    if (onSaveForLater) {
      onSaveForLater();
    } else {
      saveForLater(item.product, country);
      onRemove(); // Remove from cart after saving
    }
    swipeableRef.current?.close();
  };

  const isLoose = item.product.sell_type === 'loose';
  const price = country === COUNTRIES.GERMANY
    ? item.product.price_germany
    : item.product.price_denmark;
  const subtotal = isLoose ? (price * item.quantity) / 1000 : price * item.quantity;
  const stock = country === COUNTRIES.GERMANY
    ? item.product.stock_germany
    : item.product.stock_denmark;
  const packSize = item.product.pack_size_grams || 1000;
  const maxQuantity = isLoose
    ? stock * 1000
    : Math.floor(stock / (packSize / 1000));

  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.rightActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: themeColors.info[500] }]}
          onPress={handleSaveForLater}
          accessibilityLabel="Save for later"
          accessibilityRole="button"
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <Icon
              name={isSaved(item.product.id) ? "bookmark" : "bookmark-outline"}
              size={24}
              color="#FFFFFF"
            />
          </Animated.View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: themeColors.error[500] }]}
          onPress={() => {
            swipeableRef.current?.close();
            onRemove();
          }}
          accessibilityLabel="Remove item"
          accessibilityRole="button"
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <Icon name="delete-outline" size={24} color="#FFFFFF" />
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      overshootRight={false}
    >
      <View style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
        {/* Checkbox - Only show if showCheckbox is true */}
        {showCheckbox && (
          <TouchableOpacity
            onPress={onToggleSelect}
            style={styles.checkboxContainer}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon
              name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
              size={28}
              color={isSelected ? themeColors.primary[600] : '#9CA3AF'}
            />
          </TouchableOpacity>
        )}

        <View style={styles.imageContainer}>
          {item.product.image_url && !item.product.image_url.endsWith('/undefined') ? (
            <ProgressiveImage
              source={{ uri: item.product.image_url }}
              style={styles.image}
              containerStyle={styles.image}
              placeholder="skeleton"
              lazy={false}
              cachePolicy="memory-disk"
              // Add key to force re-render when image_url changes
              key={`cart-item-${item.product.id}-${item.product.image_url}`}
              // Add error handler to log image loading issues
              onError={() => {
                console.error('[SwipeableCartItem] ❌ Failed to load image for product:', item.product.id, item.product.name);
                console.error('[SwipeableCartItem] Image URL:', item.product.image_url);
              }}
              onLoadEnd={() => {
                console.log('[SwipeableCartItem] ✅ Image loaded successfully:', item.product.image_url);
              }}
            />
          ) : (
            <View style={[styles.placeholderImage, { backgroundColor: '#F3F4F6' }]}>
              <Icon name="image-off" size={32} color="#9CA3AF" />
            </View>
          )}
        </View>

        <View style={[styles.content, showCheckbox ? { marginLeft: 8 } : {}]}>
          <View style={styles.header}>
            <Text
              style={[styles.name, { color: '#111827' }]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {item.product.name}
            </Text>
            <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
              <Icon name="close" size={20} color={themeColors.error[500]} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.category, { color: '#6B7280' }]}>
            {item.product.category === 'fresh' ? 'Fresh' : 'Frozen'}
          </Text>

          <View style={styles.priceRow}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
              <Text style={[styles.price, { color: themeColors.primary[500] }]}>
                {formatPrice(price, country)}
                {isLoose ? <Text style={{ fontSize: 12, fontWeight: 'normal' }}> / kg</Text> : <Text style={{ fontSize: 12, fontWeight: 'normal' }}> / pkt</Text>}
              </Text>
              {isInStock(item.product, country) && (
                <Text style={[styles.stock, { color: '#6B7280', marginLeft: 8 }]}>
                  • {isLoose ? `${stock >= 1 ? stock.toFixed(2) + 'kg' : (stock * 1000).toFixed(0) + 'g'} available` : `${Math.floor(stock / ((item.product.pack_size_grams || 1000) / 1000))} packets in stock`}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.controlsColumn}>
            <View style={styles.quantityWrapper}>
              <QuantitySelector
                value={item.quantity}
                onChange={onQuantityChange}
                min={isLoose ? 100 : 1}
                max={maxQuantity}
                disabled={!isInStock(item.product, country)}
                isWeightBased={isLoose}
                style={styles.quantitySelector}
              />
            </View>
            <View style={styles.priceContainer}>
              <Text style={[styles.subtotal, { color: themeColors.primary[500] }]}>
                {formatPrice(subtotal, country)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(58, 181, 209, 0.15)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  removeButton: {
    padding: 4,
  },
  category: {
    fontSize: 12,
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
  },
  stock: {
    fontSize: 12,
  },
  controlsColumn: {
    marginTop: 8,
    alignItems: 'flex-end',
    gap: 8,
  },
  quantityWrapper: {
    width: 140,
  },
  quantitySelector: {
    height: 36, // Even more compact
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  subtotalLabel: {
    fontSize: 12,
    color: '#64748B', // slate-500
    fontWeight: '500',
  },
  subtotal: {
    fontSize: 18,
    fontWeight: '700',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 12,
  },
  actionButton: {
    width: 80,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderRadius: 12,
  },
  checkboxContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginRight: 8,
  },
});

// Memoize the component to prevent unnecessary re-renders
export default memo(SwipeableCartItem);

