import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useCartStore } from '../store/cartStore';

interface CartBadgeProps {
  style?: any;
}

const CartBadge: React.FC<CartBadgeProps> = ({ style }) => {
  const itemCount = useCartStore((state) => state.getItemCount());

  if (itemCount === 0) {
    return null;
  }

  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.badgeText}>
        {itemCount > 99 ? '99+' : itemCount}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default CartBadge;

