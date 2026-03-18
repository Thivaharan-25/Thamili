import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { CartItem } from '../types';
import { formatPrice, formatItemQuantity, formatItemSubtotal } from '../utils/productUtils';
import { COUNTRIES } from '../constants';
import type { Country } from '../constants';

interface OrderSummaryProps {
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  paymentFee?: number;
  total: number;
  country: Country;
  showTotal?: boolean;
  style?: any;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({
  items,
  subtotal,
  deliveryFee,
  paymentFee = 0,
  total,
  country,
  showTotal = true,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>Order Summary</Text>

      <ScrollView style={styles.itemsList} nestedScrollEnabled>
        {items.map((item) => {
          if (!item.product) return null;

          const price = country === COUNTRIES.GERMANY
            ? item.product.price_germany
            : item.product.price_denmark;

          return (
            <View key={item.product.id} style={styles.item}>
              <View style={styles.itemImage}>
                {item.product.image_url ? (
                  <Image
                    source={{ uri: item.product.image_url }}
                    style={styles.image}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Icon name="image-off" size={24} color="#ccc" />
                  </View>
                )}
              </View>
              <View style={styles.itemContent}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.product.name}
                </Text>
                <Text style={styles.itemQuantity}>
                  {formatItemQuantity(item.quantity, item.product)} × {formatPrice(price, country)}
                </Text>
              </View>
              <Text style={styles.itemSubtotal}>
                {formatItemSubtotal(item.quantity, price, item.product, country)}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.totals}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>{formatPrice(subtotal, country)}</Text>
        </View>

        {showTotal && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Delivery Fee</Text>
            <Text style={styles.totalValue}>{formatPrice(deliveryFee, country)}</Text>
          </View>
        )}

        {showTotal && paymentFee > 0 && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Payment Fee (Stripe)</Text>
            <Text style={styles.totalValue}>{formatPrice(paymentFee, country)}</Text>
          </View>
        )}

        {showTotal && (
          <View style={[styles.totalRow, styles.finalTotal]}>
            <Text style={styles.finalTotalLabel}>Total</Text>
            <Text style={styles.finalTotalValue}>{formatPrice(total, country)}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 20,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  itemsList: {
    maxHeight: 240,
    marginBottom: 24,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    overflow: 'hidden',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#F2F2F7',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
    marginRight: 12,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
    lineHeight: 20,
  },
  itemQuantity: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  itemSubtotal: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    minWidth: 70,
    textAlign: 'right',
  },
  totals: {
    backgroundColor: '#F9FAFB',
    marginHorizontal: -24,
    marginBottom: -24,
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 15,
    color: '#4B5563',
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  finalTotal: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginBottom: 0,
  },
  finalTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.3,
  },
  finalTotalValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#007AFF',
    letterSpacing: -0.5,
  },
});

export default OrderSummary;

