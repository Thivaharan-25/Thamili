import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { NotificationTemplate, NotificationType } from '../types/notifications';

interface NotificationPreviewProps {
  template: NotificationTemplate;
  sampleData?: Record<string, any>;
  style?: any;
}

const NotificationPreview: React.FC<NotificationPreviewProps> = ({
  template,
  sampleData = {},
  style,
}) => {
  const replaceVariables = (text: string): string => {
    let result = text;
    template.variables.forEach((variable) => {
      const value = sampleData[variable] || `{${variable}}`;
      result = result.replace(new RegExp(`\\{${variable}\\}`, 'g'), value);
    });
    return result;
  };

  const getNotificationIcon = (type: NotificationType): any => {
    switch (type) {
      case 'order_confirmed':
        return 'check-circle';
      case 'order_shipped':
        return 'truck-delivery';
      case 'order_delivered':
        return 'package-variant';
      case 'payment_received':
        return 'credit-card';
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
        return '#5856D6';
      case 'payment_received':
        return '#FF9500';
      default:
        return '#666';
    }
  };

  const title = replaceVariables(template.title_template);
  const message = replaceVariables(template.message_template);
  const icon = getNotificationIcon(template.type);
  const color = getNotificationColor(template.type);

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>Preview</Text>
      <View style={[styles.previewCard, { borderLeftColor: color }]}>
        <View style={styles.previewHeader}>
          <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
            <Icon name={icon} size={24} color={color} />
          </View>
          <View style={styles.previewContent}>
            <Text style={styles.previewTitle}>{title}</Text>
            <Text style={styles.previewMessage}>{message}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  previewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  previewHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContent: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  previewMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default NotificationPreview;

