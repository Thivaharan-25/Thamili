import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Notification, NotificationType } from '../types/notifications';
import { formatDate, formatDateTime } from '../utils/regionalFormatting';
import { COUNTRIES } from '../constants';
import type { Country } from '../constants';

interface NotificationCardProps {
  notification: Notification;
  onPress?: () => void;
  onMarkAsRead?: () => void;
  country?: Country;
}

const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onPress,
  onMarkAsRead,
  country = COUNTRIES.GERMANY,
}) => {
  const getNotificationIcon = (type: NotificationType): any => {
    switch (type) {
      case 'order_confirmed':
        return 'check-circle';
      case 'order_shipped':
        return 'truck-delivery';
      case 'order_delivered':
        return 'package-variant';
      case 'ready_for_pickup':
        return 'store-check';
      case 'task_assigned':
        return 'clipboard-account';
      case 'delivery_failed':
      case 'task_cancelled':
        return 'alert-circle';
      case 'order_canceled':
        return 'package-variant-remove';
      case 'payment_received':
        return 'credit-card';
      case 'stock_alert':
        return 'package-variant-closed-remove';
      default:
        return 'bell';
    }
  };

  const getNotificationColor = (type: NotificationType): string => {
    switch (type) {
      case 'order_confirmed':
        return '#34C759';
      case 'order_shipped':
        return '#007AFF';
      case 'order_delivered':
      case 'ready_for_pickup':
        return '#5856D6';
      case 'task_assigned':
        return '#FFCC00';
      case 'delivery_failed':
      case 'task_cancelled':
      case 'order_canceled':
      case 'stock_alert':
        return '#FF3B30';
      case 'payment_received':
        return '#FF9500';
      default:
        return '#666';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDate(dateString, country);
  };

  const icon = getNotificationIcon(notification.type);
  const color = getNotificationColor(notification.type);

  const accessibilityLabel = `${notification.title}. ${notification.message}. ${formatTime(notification.created_at)}`;

  return (
    <TouchableOpacity
      style={[styles.container, !notification.read && styles.unread, { minHeight: 44 }]} // WCAG minimum touch target
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={onPress ? "Double tap to view notification details" : undefined}
      accessibilityState={{ selected: !notification.read }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]} accessibilityElementsHidden>
        <Icon name={icon} size={24} color={color} />
      </View>
      <View style={styles.content} accessibilityRole="text">
        <View style={styles.header}>
          <Text
            style={styles.title}
            accessibilityRole="header"
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {notification.title}
          </Text>
          {!notification.read && <View style={styles.unreadDot} accessibilityElementsHidden />}
        </View>
        <Text
          style={styles.message}
          numberOfLines={2}
          ellipsizeMode="tail"
          accessibilityLabel={notification.message}
        >
          {notification.message}
        </Text>
        <Text
          style={styles.time}
          accessibilityLabel={`Time: ${formatTime(notification.created_at)}`}
        >
          {formatTime(notification.created_at)}
        </Text>
      </View>
      {!notification.read && onMarkAsRead && (
        <TouchableOpacity
          style={[styles.markReadButton, { minHeight: 44, minWidth: 44 }]}
          onPress={onMarkAsRead}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Mark as read"
          accessibilityHint="Double tap to mark this notification as read"
        >
          <Icon name="check" size={20} color="#007AFF" accessibilityElementsHidden />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unread: {
    backgroundColor: '#f0f7ff',
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },
  message: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    color: '#999',
  },
  markReadButton: {
    padding: 4,
    marginLeft: 8,
    minHeight: 44, // WCAG minimum touch target
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// Custom comparison for memoization
const areEqual = (prevProps: NotificationCardProps, nextProps: NotificationCardProps) => {
  return (
    prevProps.notification.id === nextProps.notification.id &&
    prevProps.notification.read === nextProps.notification.read &&
    prevProps.country === nextProps.country
  );
};

const MemoizedNotificationCard = React.memo(NotificationCard, areEqual);
MemoizedNotificationCard.displayName = 'NotificationCard';

export default MemoizedNotificationCard;

