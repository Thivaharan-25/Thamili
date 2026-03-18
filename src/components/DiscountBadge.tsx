/**
 * Discount Badge Component
 * Shows discount percentage on product cards
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

interface DiscountBadgeProps {
  discount: number; // Discount percentage (0-100)
  style?: any;
}

const DiscountBadge: React.FC<DiscountBadgeProps> = ({
  discount,
  style,
}) => {
  if (!discount || discount <= 0) {
    return null;
  }

  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.badgeText}>
        -{Math.round(discount)}%
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.error[500],
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    zIndex: 10,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});

// Set displayName for better debugging
DiscountBadge.displayName = 'DiscountBadge';

export default DiscountBadge;

