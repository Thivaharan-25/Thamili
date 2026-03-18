import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { OrderStatus } from '../types';
import OrderStatusBadge from './OrderStatusBadge';

import ConfirmationModal from './modals/ConfirmationModal';

interface OrderStatusUpdateProps {
  currentStatus: OrderStatus;
  onStatusChange: (newStatus: OrderStatus) => void;
  disabled?: boolean;
  style?: any;
}

const OrderStatusUpdate: React.FC<OrderStatusUpdateProps> = ({
  currentStatus,
  onStatusChange,
  disabled = false,
  style,
}) => {
  const { t } = useTranslation();

  // Modal State
  const [confirmModalVisible, setConfirmModalVisible] = React.useState(false);
  const [pendingStatus, setPendingStatus] = React.useState<OrderStatus | null>(null);

  const getNextStatuses = (): OrderStatus[] => {
    switch (currentStatus) {
      case 'pending':
        // Allow going directly to delivery to trigger assignment
        return ['out_for_delivery', 'canceled'];
      case 'confirmed':
        return ['delivered', 'canceled'];
      case 'out_for_delivery':
        return ['delivered'];
      case 'delivered':
        return [];
      case 'canceled':
        return [];
      default:
        return [];
    }
  };

  const getStatusLabel = (status: OrderStatus): string => {
    switch (status) {
      case 'pending':
        return t('orders.confirmOrder');
      case 'confirmed':
        return t('orders.confirmOrder');
      case 'out_for_delivery':
        return t('orders.markOutForDelivery');
      case 'delivered':
        return t('orders.markDelivered');
      case 'canceled':
        return t('orders.canceled');
      default:
        return status;
    }
  };

  const getStatusIcon = (status: OrderStatus): string => {
    switch (status) {
      case 'confirmed':
        return 'check-circle';
      case 'out_for_delivery':
        return 'truck-delivery';
      case 'delivered':
        return 'check-circle';
      case 'canceled':
        return 'close-circle';
      default:
        return 'arrow-right';
    }
  };

  const handleStatusChange = (newStatus: OrderStatus) => {
    // If status is 'out_for_delivery', skip the alert and let the parent handle the modal
    if (newStatus === 'out_for_delivery') {
      onStatusChange(newStatus);
      return;
    }

    setPendingStatus(newStatus);
    setConfirmModalVisible(true);
  };

  const confirmStatusChange = () => {
    if (pendingStatus) {
      onStatusChange(pendingStatus);
      setPendingStatus(null);
    }
  };

  const nextStatuses = getNextStatuses();

  if (nextStatuses.length === 0) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.currentStatusLabel}>{t('orders.currentStatus')}</Text>
        <OrderStatusBadge status={currentStatus} />
        <Text style={styles.finalStatusText}>
          {t('orders.finalStatusReached')}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.currentStatusLabel}>{t('orders.currentStatus')}</Text>
      <OrderStatusBadge status={currentStatus} style={styles.statusBadge} />

      <Text style={styles.updateLabel}>{t('orders.updateStatus')}</Text>
      <View style={styles.buttonsContainer}>
        {nextStatuses.map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.statusButton,
              status === 'canceled' && styles.cancelButton,
            ]}
            onPress={() => handleStatusChange(status)}
            disabled={disabled}
          >
            <Icon
              name={getStatusIcon(status) as any}
              size={20}
              color={status === 'canceled' ? '#FF3B30' : '#007AFF'}
            />
            <Text
              style={[
                styles.statusButtonText,
                status === 'canceled' && styles.cancelButtonText,
              ]}
            >
              {getStatusLabel(status)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ConfirmationModal
        visible={confirmModalVisible}
        onDismiss={() => setConfirmModalVisible(false)}
        onConfirm={confirmStatusChange}
        title={t('orders.updateOrderStatus')}
        message={`${t('orders.confirmStatusChange')} "${pendingStatus ? getStatusLabel(pendingStatus) : ''}"?`}
        confirmLabel={t('cart.update')}
        cancelLabel={t('common.cancel')}
        confirmColor={pendingStatus === 'canceled' ? '#EF4444' : '#3B82F6'}
        icon={pendingStatus === 'canceled' ? 'alert-octagon-outline' : 'alert-circle-outline'}
      />
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
  currentStatusLabel: {
    fontSize: 14,
    lineHeight: 22, // Increased
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  statusBadge: {
    marginBottom: 16,
  },
  finalStatusText: {
    fontSize: 12,
    lineHeight: 18, // Increased
    color: '#999',
    fontStyle: 'italic',
    marginTop: 8,
  },
  updateLabel: {
    fontSize: 14,
    lineHeight: 22, // Increased
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  buttonsContainer: {
    gap: 8,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14, // Increased padding
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    backgroundColor: '#f0f7ff',
    gap: 8,
  },
  cancelButton: {
    borderColor: '#FF3B30',
    backgroundColor: '#ffe6e6',
  },
  statusButtonText: {
    fontSize: 14,
    lineHeight: 22, // Increased
    fontWeight: '600',
    color: '#007AFF',
  },
  cancelButtonText: {
    color: '#FF3B30',
  },
});

export default OrderStatusUpdate;

