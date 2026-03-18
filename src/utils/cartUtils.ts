import { CartItem } from '../types';
import { PickupPoint } from '../types';
import { COUNTRIES } from '../constants';
import type { Country } from '../constants';
import { formatPrice } from './productUtils';

/**
 * Calculate item subtotal
 */
export const calculateItemSubtotal = (
  item: CartItem,
  country: Country
): number => {
  const price = country === COUNTRIES.GERMANY
    ? item.product.price_germany
    : item.product.price_denmark;
  
  // Price is per unit (packet or gram)
  // For loose items, price is usually per KG, so divide by 1000 if quantity is in grams
  const isLoose = item.product.sell_type === 'loose';
  
  let effectiveQty = item.quantity;
  if (!isLoose && item.quantity < 1 && item.quantity > 0) {
    effectiveQty = Math.round(item.quantity * 1000);
  }

  if (isLoose) {
    return (price * effectiveQty) / 1000;
  }
  
  return price * effectiveQty;
};

/**
 * Calculate cart subtotal (sum of all items)
 */
export const calculateCartSubtotal = (
  items: CartItem[],
  country: Country
): number => {
  return items.reduce((total, item) => {
    return total + calculateItemSubtotal(item, country);
  }, 0);
};

/**
 * Calculate delivery fee based on distance
 */
export const calculateDeliveryFee = (
  pickupPoint: PickupPoint | null,
  isHomeDelivery: boolean,
  customerLocation?: { latitude?: number; longitude?: number }
): number => {
  if (!isHomeDelivery) {
    return pickupPoint?.delivery_fee || 0;
  }

  // Home delivery logic - use admin settings from pickupPoint
  const baseFee = pickupPoint?.base_delivery_fee ?? 0;
  const freeRadius = pickupPoint?.free_delivery_radius ?? 0;
  const perKmRate = pickupPoint?.extra_km_fee ?? 0;

  if (pickupPoint && pickupPoint.latitude && pickupPoint.longitude && customerLocation?.latitude && customerLocation?.longitude) {
    const { getHaversineDistance } = require('./productUtils');
    const distance = getHaversineDistance(
      pickupPoint.latitude,
      pickupPoint.longitude,
      customerLocation.latitude,
      customerLocation.longitude
    );

    if (distance > freeRadius) {
      const extraKm = distance - freeRadius;
      return baseFee + (extraKm * perKmRate);
    }
    return baseFee;
  }

  // Fallback if coordinates are missing - still use the base fee the admin set
  return baseFee;
};

/**
 * Calculate final total (subtotal + delivery fee)
 */
export const calculateFinalTotal = (
  items: CartItem[],
  country: Country,
  pickupPoint: PickupPoint | null,
  isHomeDelivery: boolean,
  customerLocation?: { latitude?: number; longitude?: number }
): number => {
  const subtotal = calculateCartSubtotal(items, country);
  const deliveryFee = calculateDeliveryFee(pickupPoint, isHomeDelivery, customerLocation);
  return subtotal + deliveryFee;
};

/**
 * Calculate payment processing fee (Stripe: 2.9% + 0.30)
 */
export const calculatePaymentFee = (
  amount: number,
  paymentMethod: string | null
): number => {
  if (paymentMethod !== 'online') return 0;
  // Stripe standard fee: 2.9% + 0.30
  const fee = (amount * 0.029) + 0.30;
  return Number(fee.toFixed(2));
};

/**
 * Format cart summary for display
 */
export const formatCartSummary = (
  items: CartItem[],
  country: Country,
  pickupPoint: PickupPoint | null,
  isHomeDelivery: boolean,
  paymentMethod: string | null = null,
  customerLocation?: { latitude?: number; longitude?: number }
): {
  subtotal: string;
  deliveryFee: string;
  paymentFee: string;
  total: string;
  subtotalValue: number;
  deliveryFeeValue: number;
  paymentFeeValue: number;
  totalValue: number;
} => {
  const subtotalValue = calculateCartSubtotal(items, country);
  const deliveryFeeValue = calculateDeliveryFee(pickupPoint, isHomeDelivery, customerLocation);
  const intermediateTotal = subtotalValue + deliveryFeeValue;
  const paymentFeeValue = calculatePaymentFee(intermediateTotal, paymentMethod);
  const totalValue = intermediateTotal + paymentFeeValue;

  return {
    subtotal: formatPrice(subtotalValue, country),
    deliveryFee: formatPrice(deliveryFeeValue, country),
    paymentFee: formatPrice(paymentFeeValue, country),
    total: formatPrice(totalValue, country),
    subtotalValue,
    deliveryFeeValue,
    paymentFeeValue,
    totalValue,
  };
};

