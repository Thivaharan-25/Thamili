import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { CartItem as CartItemType } from '../types';
import QuantitySelector from './QuantitySelector';
import { formatPrice, isInStock } from '../utils/productUtils';
import { calculateItemSubtotal } from '../utils/cartUtils';
import { COUNTRIES } from '../constants';
import type { Country } from '../constants';

interface CartItemProps {
  item: CartItemType;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
  country: Country;
}

const CartItem: React.FC<CartItemProps> = ({
  item,
  onQuantityChange,
  onRemove,
  country,
}) => {
  const { t } = useTranslation();
  const isLoose = item.product.sell_type === 'loose';
  const price = country === COUNTRIES.GERMANY
    ? item.product.price_germany
    : item.product.price_denmark;

  const stock = country === COUNTRIES.GERMANY
    ? item.product.stock_germany
    : item.product.stock_denmark;

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        {item.product.image_url ? (
          <Image
            source={{ uri: item.product.image_url }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Icon name="image-off" size={32} color="#ccc" />
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={2}>
            {item.product.name}
          </Text>
          <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
            <Icon name="close" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>

        <Text style={styles.category}>
          {item.product.category === 'fresh' ? 'Fresh' : 'Frozen'}
        </Text>

        <View style={styles.priceRow}>
          <Text style={styles.price}>
            {formatPrice(price, country)}
            {isLoose ? ' / kg' : ` / ${item.product.unit || 'packet'}`}
          </Text>
          {isInStock(item.product, country) && (
            <Text style={styles.stock}>
              {isLoose
                ? `${stock >= 1 ? stock.toFixed(2) + 'kg' : (stock * 1000).toFixed(0) + 'g'} in stock`
                : `${Math.floor(stock / ((item.product.pack_size_grams || 1000) / 1000))} in stock`}
            </Text>
          )}
        </View>

        <View style={styles.controlsColumn}>
          <View style={styles.quantityWrapper}>
            <QuantitySelector
              value={item.quantity}
              onChange={onQuantityChange}
              min={isLoose ? 100 : 1}
              max={isLoose ? stock * 1000 : Math.floor(stock / ((item.product.pack_size_grams || 1000) / 1000))}
              disabled={!isInStock(item.product, country)}
              isWeightBased={isLoose}
              style={styles.quantitySelector}
            />
          </View>
          <View style={styles.priceContainer}>
            <Text style={[styles.subtotal, { color: '#3AB5D1' }]}>
              {formatPrice(calculateItemSubtotal(item, country), country)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
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
    backgroundColor: '#f0f0f0',
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
    color: '#000',
    marginRight: 8,
  },
  removeButton: {
    padding: 4,
  },
  category: {
    fontSize: 12,
    color: '#666',
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
    color: '#007AFF',
  },
  stock: {
    fontSize: 12,
    color: '#666',
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
    height: 36,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  subtotalLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  subtotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
});

// Custom comparison for memoization
const areEqual = (prevProps: CartItemProps, nextProps: CartItemProps) => {
  return (
    prevProps.item.product.id === nextProps.item.product.id &&
    prevProps.item.quantity === nextProps.item.quantity &&
    prevProps.country === nextProps.country
  );
};

// Set displayName for better debugging and NativeWind compatibility
const MemoizedCartItem = React.memo(CartItem, areEqual);
MemoizedCartItem.displayName = 'CartItem';

export default MemoizedCartItem;

