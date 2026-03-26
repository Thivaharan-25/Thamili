/**
 * Skeleton Card Component
 * Pre-built skeleton layouts for common card types
 * Safe for Expo Go with proper displayName
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonLoader from './SkeletonLoader';

interface SkeletonCardProps {
  type?: 'product' | 'order' | 'custom' | 'profile' | 'cart' | 'detail' | 'delivery';
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

  const renderProfileSkeleton = () => (
    <View>
      {/* Avatar + name area */}
      <View style={[styles.card, { alignItems: 'center', paddingVertical: 24 }]}>
        <SafeSkeletonLoader width={80} height={80} borderRadius={40} style={styles.mb3} />
        <SafeSkeletonLoader width={140} height={20} borderRadius={8} style={styles.mb2} />
        <SafeSkeletonLoader width={180} height={14} borderRadius={7} />
      </View>

      {/* Stats row */}
      <View style={[styles.card, { flexDirection: 'row', justifyContent: 'space-around' }]}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ alignItems: 'center' }}>
            <SafeSkeletonLoader width={36} height={20} borderRadius={6} style={styles.mb2} />
            <SafeSkeletonLoader width={50} height={12} borderRadius={6} />
          </View>
        ))}
      </View>

      {/* Menu items */}
      <View style={styles.card}>
        {[1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={[styles.row, { paddingVertical: 14, borderBottomWidth: i < 5 ? 1 : 0, borderBottomColor: '#f3f4f6' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <SafeSkeletonLoader width={24} height={24} borderRadius={6} />
              <SafeSkeletonLoader width={120} height={14} borderRadius={7} />
            </View>
            <SafeSkeletonLoader width={16} height={16} borderRadius={4} />
          </View>
        ))}
      </View>
    </View>
  );

  const renderCartSkeleton = () => (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {/* Product image */}
        <SafeSkeletonLoader width={80} height={80} borderRadius={10} />
        {/* Product info */}
        <View style={{ flex: 1, justifyContent: 'space-between' }}>
          <SafeSkeletonLoader width="80%" height={16} borderRadius={6} />
          <SafeSkeletonLoader width="50%" height={14} borderRadius={6} />
          <View style={styles.row}>
            <SafeSkeletonLoader width={80} height={28} borderRadius={14} />
            <SafeSkeletonLoader width={60} height={18} borderRadius={6} />
          </View>
        </View>
      </View>
    </View>
  );

  const renderDetailSkeleton = () => (
    <View>
      {/* Hero image */}
      <SafeSkeletonLoader width="100%" height={280} borderRadius={0} />
      <View style={{ padding: 16 }}>
        {/* Category badge */}
        <SafeSkeletonLoader width={70} height={22} borderRadius={11} style={styles.mb3} />
        {/* Title */}
        <SafeSkeletonLoader width="85%" height={24} borderRadius={8} style={styles.mb2} />
        {/* Price */}
        <SafeSkeletonLoader width="40%" height={28} borderRadius={8} style={styles.mb4} />
        {/* Stock info */}
        <SafeSkeletonLoader width="55%" height={14} borderRadius={7} style={styles.mb4} />
        {/* Description block */}
        <SafeSkeletonLoader width="100%" height={14} borderRadius={7} style={styles.mb2} />
        <SafeSkeletonLoader width="100%" height={14} borderRadius={7} style={styles.mb2} />
        <SafeSkeletonLoader width="70%" height={14} borderRadius={7} style={styles.mb4} />
        {/* Quantity selector + add button */}
        <View style={[styles.row, { marginTop: 8 }]}>
          <SafeSkeletonLoader width={120} height={40} borderRadius={20} />
          <SafeSkeletonLoader width="55%" height={48} borderRadius={12} />
        </View>
      </View>
    </View>
  );

  const renderDeliverySkeleton = () => (
    <View>
      {/* Stats cards row */}
      <View style={[styles.row, { gap: 12, marginBottom: 16 }]}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.card, { flex: 1, alignItems: 'center', marginBottom: 0 }]}>
            <SafeSkeletonLoader width={36} height={36} borderRadius={18} style={styles.mb2} />
            <SafeSkeletonLoader width={40} height={20} borderRadius={6} style={styles.mb2} />
            <SafeSkeletonLoader width={55} height={12} borderRadius={6} />
          </View>
        ))}
      </View>
      {/* Filter tabs */}
      <View style={[styles.row, { gap: 8, marginBottom: 16 }]}>
        <SafeSkeletonLoader width={70} height={32} borderRadius={16} />
        <SafeSkeletonLoader width={80} height={32} borderRadius={16} />
        <SafeSkeletonLoader width={90} height={32} borderRadius={16} />
      </View>
      {/* Order items */}
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.card}>
          <View style={styles.rowBetween}>
            <SafeSkeletonLoader width="35%" height={16} borderRadius={6} />
            <SafeSkeletonLoader width={60} height={22} borderRadius={11} />
          </View>
          <SafeSkeletonLoader width="100%" height={12} borderRadius={6} style={styles.mb2} />
          <SafeSkeletonLoader width="65%" height={12} borderRadius={6} />
        </View>
      ))}
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
      case 'profile':
        return renderProfileSkeleton();
      case 'cart':
        return renderCartSkeleton();
      case 'detail':
        return renderDetailSkeleton();
      case 'delivery':
        return renderDeliverySkeleton();
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
