import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { OrderStatus } from '../types';

interface OrderStatusTimelineProps {
  currentStatus: OrderStatus;
  style?: any;
}

const OrderStatusTimeline: React.FC<OrderStatusTimelineProps> = ({
  currentStatus,
  style,
}) => {
  const { t } = useTranslation();
  const statuses: OrderStatus[] = [
    'pending',
    'confirmed',
    'out_for_delivery',
    'delivered',
  ];

  const getStatusIndex = (status: OrderStatus): number => {
    const index = statuses.indexOf(status);
    return index === -1 ? 0 : index;
  };

  const currentIndex = getStatusIndex(currentStatus);

  const getStatusConfig = (status: OrderStatus, index: number) => {
    const isCompleted = index <= currentIndex;
    const isCurrent = index === currentIndex;
    const isCanceled = currentStatus === 'canceled';

    if (isCanceled && status !== 'canceled') {
      return {
        icon: 'circle-outline',
        color: '#ccc',
        label: t(`orders.${status.replace(/_([a-z])/g, (g) => g[1].toUpperCase())}`),
        isCompleted: false,
      };
    }

    if (isCurrent) {
      return {
        icon: isCanceled ? 'close-circle' : 'circle',
        color: isCanceled ? '#FF3B30' : '#007AFF',
        label: t(`orders.${status.replace(/_([a-z])/g, (g) => g[1].toUpperCase())}`),
        isCompleted: true,
      };
    }

    if (isCompleted) {
      return {
        icon: 'check-circle',
        color: '#34C759',
        label: t(`orders.${status.replace(/_([a-z])/g, (g) => g[1].toUpperCase())}`),
        isCompleted: true,
      };
    }

    return {
      icon: 'circle-outline',
      color: '#ccc',
      label: t(`orders.${status.replace(/_([a-z])/g, (g) => g[1].toUpperCase())}`),
      isCompleted: false,
    };
  };

  if (currentStatus === 'canceled') {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.timelineItem}>
          <Icon name="close-circle" size={24} color="#FF3B30" />
          <View style={styles.timelineContent}>
            <Text style={[styles.statusLabel, styles.canceledLabel]}>{t('orders.canceled')}</Text>
            <Text style={styles.statusDescription}>{t('orders.cancelConfirmMessage')}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {statuses.map((status, index) => {
        const config = getStatusConfig(status, index);
        const isLast = index === statuses.length - 1;

        return (
          <View key={status} style={styles.timelineRow}>
            <View style={styles.timelineIconContainer}>
              <Icon name={config.icon as any} size={24} color={config.color} />
              {!isLast && (
                <View
                  style={[
                    styles.timelineLine,
                    config.isCompleted && styles.timelineLineCompleted,
                  ]}
                />
              )}
            </View>
            <View style={styles.timelineContent}>
              <Text
                style={[
                  styles.statusLabel,
                  config.isCompleted && styles.statusLabelCompleted,
                ]}
              >
                {config.label}
              </Text>
              {index === currentIndex && (
                <Text style={styles.statusDescription}>{t('orders.currentStatus')}</Text>
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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineIconContainer: {
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    top: 24,
    left: 11,
    width: 2,
    height: 40,
    backgroundColor: '#e0e0e0',
  },
  timelineLineCompleted: {
    backgroundColor: '#34C759',
  },
  timelineContent: {
    flex: 1,
    paddingTop: 2,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  statusLabelCompleted: {
    color: '#000',
  },
  canceledLabel: {
    color: '#FF3B30',
  },
  statusDescription: {
    fontSize: 12,
    color: '#999',
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default OrderStatusTimeline;

