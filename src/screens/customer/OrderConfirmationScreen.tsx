import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { useQuery } from '@tanstack/react-query';
import { orderService } from '../../services/orderService';
import { pickupPointService } from '../../services';
import { productService } from '../../services/productService';
import { AppHeader, OrderReceipt, Button, LoadingScreen, ErrorMessage, SuccessCelebration } from '../../components';
import { colors } from '../../theme';
import { COUNTRIES } from '../../constants';
import type { Country } from '../../constants';
import type { OrderItem } from '../../types';
import { isTablet, isSmallDevice, getResponsivePadding } from '../../utils/responsive';

type OrderConfirmationScreenRouteProp = RouteProp<RootStackParamList, 'OrderConfirmation'>;
type OrderConfirmationScreenNavigationProp = StackNavigationProp<RootStackParamList, 'OrderConfirmation'>;

const OrderConfirmationScreen = () => {
  const route = useRoute<OrderConfirmationScreenRouteProp>();
  const navigation = useNavigation<OrderConfirmationScreenNavigationProp>();
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuthStore();
  const { selectedCountry } = useCartStore();
  const { orderId } = route.params;
  const padding = getResponsivePadding();

  // Use user's country preference if authenticated, otherwise use selected country from cart store
  const country = (isAuthenticated && user?.country_preference)
    ? user.country_preference
    : (selectedCountry || COUNTRIES.GERMANY) as Country;
  const [showCelebration, setShowCelebration] = useState(true);

  // Fetch order
  const { data: order, isLoading: loadingOrder, error: orderError } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderService.getOrderById(orderId),
    enabled: !!orderId,
  });

  // Fetch order items
  const { data: orderItems = [], isLoading: loadingItems } = useQuery({
    queryKey: ['orderItems', orderId],
    queryFn: () => orderService.getOrderItems(orderId),
    enabled: !!orderId,
  });

  // Fetch pickup point if applicable
  const { data: pickupPoint } = useQuery({
    queryKey: ['pickupPoint', order?.pickup_point_id],
    queryFn: () => order?.pickup_point_id
      ? pickupPointService.getPickupPointById(order.pickup_point_id)
      : null,
    enabled: !!order?.pickup_point_id,
  });

  // Fetch product details for order items
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => productService.getProducts({ active: true }),
  });

  // Auto-redirect after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.navigate('Main', { screen: 'Cart' });
    }, 5000);
    return () => clearTimeout(timer);
  }, [navigation]);

  // Enrich order items with product data
  const enrichedOrderItems = React.useMemo(() => {
    return orderItems.map((item) => ({
      ...item,
      product: products.find((p) => p.id === item.product_id),
    }));
  }, [orderItems, products]);

  if (loadingOrder || loadingItems) {
    return <LoadingScreen message={t('orderConfirmation.loading')} />;
  }

  if (orderError || !order) {
    return (
      <View style={styles.container}>
        <AppHeader title={t('orderConfirmation.title')} showBack />
        <ErrorMessage message={t('orderConfirmation.failed')} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title={t('orderConfirmation.title')} showBack />

      <SuccessCelebration
        visible={showCelebration}
        message={t('orderConfirmation.success')}
        onComplete={() => setShowCelebration(false)}
        duration={2500}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={{
          padding: padding.vertical,
          maxWidth: isTablet() ? 600 : '100%',
          alignSelf: isTablet() ? 'center' : 'stretch',
        }}
      >
        <OrderReceipt
          order={order}
          orderItems={enrichedOrderItems}
          country={country}
          deliveryFeeOverride={pickupPoint?.delivery_fee}
        />
      </ScrollView>

      <View style={[styles.footer, { padding: padding.vertical }]}>
        <Button
          title={t('orderConfirmation.viewOrders')}
          onPress={() => navigation.navigate('Main', { screen: 'Orders' })}
          fullWidth
          style={styles.button}
        />
        <Button
          title={t('cart.continueShopping')}
          onPress={() => navigation.navigate('Main', { screen: 'Products' })}
          variant="outline"
          fullWidth
          style={styles.button}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  content: {
    flex: 1,
  },
  footer: {
    // padding will be set dynamically
    backgroundColor: colors.background.default,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 12,
  },
  button: {
    marginTop: 0,
  },
});

export default OrderConfirmationScreen;
