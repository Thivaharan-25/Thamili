import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Order } from '../types';
import OrderStatusBadge from './OrderStatusBadge';
import { formatPrice } from '../utils/productUtils';
import { formatDate } from '../utils/regionalFormatting';
import { COUNTRIES } from '../constants';
import type { Country } from '../constants';

interface OrderCardProps {
  order: Order;
  country: Country;
  onPress: () => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, country, onPress }) => {
  const { t } = useTranslation();
  const formatOrderNumber = (orderId: string) => {
    return `#${orderId.slice(0, 8).toUpperCase()}`;
  };

  const calculateDisplayTotal = () => {
    let total = order.total_amount;
    // Match OrderReceipt logic: if pickup fee implies a higher total, show that.
    if (order.pickup_point?.delivery_fee !== undefined) {
      const orderDeliveryFee = order.delivery_fee || 0;
      const pickupDeliveryFee = order.pickup_point.delivery_fee;
      // If pickup fee is higher than the fee recorded in order, add the difference
      if (pickupDeliveryFee > orderDeliveryFee) {
        total += (pickupDeliveryFee - orderDeliveryFee);
      }
    }
    return total;
  };

  const displayTotal = calculateDisplayTotal();

  const orderNumber = formatOrderNumber(order.id);
  const formattedDate = formatDate(order.created_at, country);
  const paymentMethod = order.payment_method === 'online' ? t('orders.onlinePayment') : t('orders.cashOnDelivery');
  const accessibilityLabel = `Order ${orderNumber}, ${formattedDate}, ${order.status}, Total ${formatPrice(displayTotal, country)}`;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.9} // Slightly closer to 1 for a "solid" feel
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Double tap to view order details"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text
            style={styles.orderNumber}
            accessibilityRole="header"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {orderNumber}
          </Text>
          <Text
            style={styles.orderDate}
            accessibilityLabel={`Order date: ${formattedDate}`}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {formattedDate}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <OrderStatusBadge status={order.status} />
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.details} accessibilityRole="text">
        <View style={styles.detailRow}>
          <View style={styles.iconContainer}>
            <Icon name="credit-card-outline" size={18} color="#666" accessibilityElementsHidden />
          </View>
          <Text
            style={styles.detailText}
            accessibilityLabel={`Payment method: ${paymentMethod}`}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {paymentMethod}
          </Text>
        </View>

        {order.pickup_point_id && (
          <View style={styles.detailRow}>
            <View style={styles.iconContainer}>
              <Icon name="store-marker-outline" size={18} color="#666" accessibilityElementsHidden />
            </View>
            <Text
              style={styles.detailText}
              accessibilityLabel="Pickup point delivery"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {t('checkout.pickupPoint')}
            </Text>
          </View>
        )}

        {order.delivery_address && (
          <View style={styles.detailRow}>
            <View style={styles.iconContainer}>
              <Icon name="truck-delivery-outline" size={18} color="#666" accessibilityElementsHidden />
            </View>
            <Text
              style={styles.detailText}
              accessibilityLabel="Home delivery"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {t('checkout.homeDelivery')}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.totalContainer}>
          <Text
            style={styles.totalLabel}
            accessibilityLabel="Total amount"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {t('orders.total')}
          </Text>
          <Text
            style={styles.totalAmount}
            accessibilityLabel={`Total: ${formatPrice(displayTotal, country)}`}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {formatPrice(displayTotal, country)}
          </Text>
        </View>

        <View style={styles.actionButton}>
          <Text style={styles.viewDetailsText}>{t('orders.viewDetails')}</Text>
          <Icon name="chevron-right" size={16} color="#007AFF" style={{ marginLeft: 2 }} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', // Align center vertically
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  headerRight: {
    // Keep badge from shrinking
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginBottom: 12,
  },
  details: {
    marginBottom: 16,
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 24,
    alignItems: 'center', // Center icon in a fixed width for alignment
    marginRight: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#4A4A4A',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    marginTop: 4, // subtle differentiation
  },
  totalContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  totalLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF', // Brand color for primary action/info
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)', // Light blue bg
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  viewDetailsText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
});

// Custom comparison for memoization
const areEqual = (prevProps: OrderCardProps, nextProps: OrderCardProps) => {
  return (
    prevProps.order.id === nextProps.order.id &&
    prevProps.order.status === nextProps.order.status &&
    prevProps.order.total_amount === nextProps.order.total_amount &&
    prevProps.order.pickup_point?.delivery_fee === nextProps.order.pickup_point?.delivery_fee &&
    prevProps.country === nextProps.country
  );
};

const MemoizedOrderCard = React.memo(OrderCard, areEqual);
MemoizedOrderCard.displayName = 'OrderCard';

export default MemoizedOrderCard;

