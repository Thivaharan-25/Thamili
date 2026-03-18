/**
 * Enhanced Order Status Timeline
 * With progress bar, estimated times, and better visualization
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { OrderStatus, Order } from '../types';
import { colors } from '../theme';
import { useTheme } from '../hooks/useTheme';

interface EnhancedOrderStatusTimelineProps {
  order: Order;
  estimatedDeliveryTime?: Date;
  showMapButton?: boolean;
  onMapPress?: () => void;
  style?: any;
}

const AnimatedView = Animated.createAnimatedComponent(View);

const EnhancedOrderStatusTimeline: React.FC<EnhancedOrderStatusTimelineProps> = ({
  order,
  estimatedDeliveryTime,
  showMapButton = false,
  onMapPress,
  style,
}) => {
  const { colors: themeColors } = useTheme();
  const currentStatus = order.status;

  const statuses: Array<{ status: OrderStatus; label: string; icon: string; estimatedTime?: string }> = [
    { status: 'pending', label: 'Order Placed', icon: 'receipt' },
    { status: 'confirmed', label: 'Confirmed', icon: 'check-circle' },
    { status: 'out_for_delivery', label: 'Out for Delivery', icon: 'truck-delivery' },
    { status: 'delivered', label: 'Delivered', icon: 'package-variant' },
  ];

  const getStatusIndex = (status: OrderStatus): number => {
    const index = statuses.findIndex(s => s.status === status);
    return index === -1 ? 0 : index;
  };

  const currentIndex = getStatusIndex(currentStatus);
  const progress = useSharedValue((currentIndex + 1) / statuses.length);

  React.useEffect(() => {
    progress.value = withTiming((currentIndex + 1) / statuses.length, { duration: 500 });
  }, [currentIndex]);

  const progressStyle = useAnimatedStyle(() => {
    const width = interpolate(progress.value, [0, 1], [0, 100]);
    return {
      width: `${width}%`,
    };
  });

  const getStatusConfig = (status: OrderStatus, index: number) => {
    const isCompleted = index <= currentIndex;
    const isCurrent = index === currentIndex;
    const isCanceled = currentStatus === 'canceled';

    if (isCanceled && status !== 'canceled') {
      return {
        icon: 'circle-outline',
        color: themeColors.neutral[400],
        label: statuses[index]?.label || status,
        isCompleted: false,
        isCurrent: false,
      };
    }

    if (isCurrent) {
      return {
        icon: isCanceled ? 'close-circle' : 'circle',
        color: isCanceled ? themeColors.error[500] : themeColors.primary[500],
        label: statuses[index]?.label || status,
        isCompleted: true,
        isCurrent: true,
      };
    }

    if (isCompleted) {
      return {
        icon: 'check-circle',
        color: themeColors.success[500],
        label: statuses[index]?.label || status,
        isCompleted: true,
        isCurrent: false,
      };
    }

    return {
      icon: 'circle-outline',
      color: themeColors.neutral[400],
      label: statuses[index]?.label || status,
      isCompleted: false,
      isCurrent: false,
    };
  };

  const getEstimatedTime = (index: number): string | undefined => {
    if (index === currentIndex && estimatedDeliveryTime) {
      const now = new Date();
      const diff = estimatedDeliveryTime.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        return `~${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        return `~${minutes}m`;
      }
    }
    return undefined;
  };

  if (currentStatus === 'canceled') {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background.card }, style]}>
        <View style={styles.timelineItem}>
          <Icon name="close-circle" size={24} color={themeColors.error[500]} />
          <View style={styles.timelineContent}>
            <Text style={[styles.statusLabel, { color: themeColors.error[500] }]}>Cancelled</Text>
            <Text style={[styles.statusDescription, { color: themeColors.text.secondary }]}>
              This order has been cancelled
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background.card }, style]}>
      {/* Progress Bar */}
      <View style={[styles.progressBarContainer, { backgroundColor: themeColors.neutral[200] }]}>
        <AnimatedView
          style={[
            styles.progressBar,
            { backgroundColor: themeColors.primary[500] },
            progressStyle,
          ]}
        />
      </View>

      {/* Timeline Items */}
      {statuses.map((statusItem, index) => {
        const config = getStatusConfig(statusItem.status, index);
        const isLast = index === statuses.length - 1;
        const estimatedTime = getEstimatedTime(index);

        return (
          <View key={statusItem.status} style={styles.timelineRow}>
            <View style={styles.timelineIconContainer}>
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: config.isCurrent
                      ? `${themeColors.primary[500]}20`
                      : config.isCompleted
                        ? `${themeColors.success[500]}20`
                        : 'transparent',
                  },
                ]}
              >
                <Icon name={config.icon as any} size={24} color={config.color} />
              </View>
              {!isLast && (
                <View
                  style={[
                    styles.timelineLine,
                    { backgroundColor: themeColors.neutral[300] },
                    config.isCompleted && { backgroundColor: themeColors.success[500] },
                  ]}
                />
              )}
            </View>
            <View style={styles.timelineContent}>
              <View style={styles.timelineHeader}>
                <Text
                  style={[
                    styles.statusLabel,
                    {
                      color: config.isCompleted
                        ? themeColors.text.primary
                        : themeColors.text.secondary,
                    },
                  ]}
                >
                  {config.label}
                </Text>
                {estimatedTime && (
                  <Text style={[styles.estimatedTime, { color: themeColors.primary[500] }]}>
                    {estimatedTime}
                  </Text>
                )}
              </View>
              {config.isCurrent && (
                <Text style={[styles.statusDescription, { color: themeColors.text.secondary }]}>
                  Current status
                </Text>
              )}
              {index === 2 && config.isCurrent && showMapButton && (
                <TouchableOpacity
                  style={[styles.mapButton, { backgroundColor: themeColors.primary[50] }]}
                  onPress={onMapPress}
                  accessibilityLabel="View delivery map"
                  accessibilityRole="button"
                >
                  <Icon name="map" size={16} color={themeColors.primary[500]} />
                  <Text style={[styles.mapButtonText, { color: themeColors.primary[500] }]}>
                    Track on Map
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressBarContainer: {
    height: 4,
    borderRadius: 2,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineIconContainer: {
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  timelineLine: {
    position: 'absolute',
    top: 48,
    left: 23,
    width: 2,
    height: 40,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 12,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  estimatedTime: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  mapButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default EnhancedOrderStatusTimeline;

