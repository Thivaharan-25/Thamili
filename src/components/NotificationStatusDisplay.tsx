import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { NotificationStatus } from '../types/notifications';

interface NotificationStatusDisplayProps {
  status: NotificationStatus;
  style?: any;
}

const NotificationStatusDisplay: React.FC<NotificationStatusDisplayProps> = ({
  status,
  style,
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'sent':
        return {
          icon: 'send',
          color: '#007AFF',
          backgroundColor: '#E6F2FF',
          label: 'Sent',
        };
      case 'delivered':
        return {
          icon: 'check-circle',
          color: '#34C759',
          backgroundColor: '#E6F9ED',
          label: 'Delivered',
        };
      case 'failed':
        return {
          icon: 'alert-circle',
          color: '#FF3B30',
          backgroundColor: '#FFE6E6',
          label: 'Failed',
        };
      case 'pending':
        return {
          icon: 'clock-outline',
          color: '#FF9500',
          backgroundColor: '#FFF4E6',
          label: 'Pending',
        };
      default:
        return {
          icon: 'help-circle',
          color: '#666',
          backgroundColor: '#F5F5F5',
          label: status,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <View style={[styles.container, { backgroundColor: config.backgroundColor }, style]}>
      <Icon name={config.icon as any} size={16} color={config.color} />
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default NotificationStatusDisplay;

