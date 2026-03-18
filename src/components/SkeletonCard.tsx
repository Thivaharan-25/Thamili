/**
 * Skeleton Card Component for Product/Order Cards
 * Pre-built skeleton layouts for common card types
 * Safe for Expo Go with proper displayName
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonLoader from './SkeletonLoader';

interface SkeletonCardProps {
  type?: 'product' | 'order' | 'custom';
  count?: number;
}

// Ensure SkeletonLoader is available
const SafeSkeletonLoader = SkeletonLoader || ((props: any) => <View style={{ backgroundColor: '#E0E0E0', ...props }} />);

const SkeletonCard: React.FC<SkeletonCardProps> = ({
  type = 'product',
  count = 1,
}) => {
  const renderProductSkeleton = () => (
    <View style={styles.card}>
      <SafeSkeletonLoader width="100%" height={180} borderRadius={12} style={styles.mb4} />
      <SafeSkeletonLoader width="70%" height={20} borderRadius={8} style={styles.mb2} />
      <SafeSkeletonLoader width="40%" height={16} borderRadius={8} style={styles.mb3} />
      <View style={styles.row}>
        <SafeSkeletonLoader width="30%" height={24} borderRadius={8} />
        <SafeSkeletonLoader width="50%" height={36} borderRadius={8} />
      </View>
    </View>
  );

  const renderOrderSkeleton = () => (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <SafeSkeletonLoader width="40%" height={20} borderRadius={8} />
        <SafeSkeletonLoader width="30%" height={20} borderRadius={8} />
      </View>
      <SafeSkeletonLoader width="100%" height={12} borderRadius={8} style={styles.mb2} />
      <SafeSkeletonLoader width="80%" height={12} borderRadius={8} style={styles.mb3} />
      <View style={styles.rowBetween}>
        <SafeSkeletonLoader width="25%" height={16} borderRadius={8} />
        <SafeSkeletonLoader width="35%" height={16} borderRadius={8} />
      </View>
    </View>
  );

  const renderCustomSkeleton = () => (
    <View style={styles.card}>
      <SafeSkeletonLoader width="100%" height={120} borderRadius={12} />
    </View>
  );

  const renderSkeleton = () => {
    switch (type) {
      case 'product':
        return renderProductSkeleton();
      case 'order':
        return renderOrderSkeleton();
      case 'custom':
      default:
        return renderCustomSkeleton();
    }
  };

  return (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <View key={`skeleton-${index}`}>{renderSkeleton()}</View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mb2: {
    marginBottom: 8,
  },
  mb3: {
    marginBottom: 12,
  },
  mb4: {
    marginBottom: 16,
  },
});

// Set displayName for better debugging and NativeWind compatibility
SkeletonCard.displayName = 'SkeletonCard';

export default SkeletonCard;
