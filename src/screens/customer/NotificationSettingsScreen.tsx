import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppHeader, Card, Button } from '../../components';
import { colors } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { notificationService } from '../../services/notificationService';
import { isTablet, isSmallDevice, getResponsivePadding, getResponsiveFontSize } from '../../utils/responsive';

const NotificationSettingsScreen = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const padding = getResponsivePadding();

  const [pushEnabled, setPushEnabled] = useState(true);
  const [orderNotifications, setOrderNotifications] = useState(true);
  const [deliveryNotifications, setDeliveryNotifications] = useState(true);
  const [paymentNotifications, setPaymentNotifications] = useState(true);
  const [generalNotifications, setGeneralNotifications] = useState(true);

  // Fetch preferences
  const { data: preferences } = useQuery({
    queryKey: ['notificationPreferences', user?.id],
    queryFn: () => notificationService.getPreferences(user?.id || ''),
    enabled: !!user?.id,
  });

  // Update state when preferences are loaded
  useEffect(() => {
    if (preferences) {
      setPushEnabled(preferences.push_enabled);
      setOrderNotifications(preferences.order_notifications);
      setDeliveryNotifications(preferences.delivery_notifications);
      setPaymentNotifications(preferences.payment_notifications);
      setGeneralNotifications(preferences.general_notifications);
    }
  }, [preferences]);

  // Update preferences
  const updateMutation = useMutation({
    mutationFn: (prefs: any) => notificationService.updatePreferences(user?.id || '', prefs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      push_enabled: pushEnabled,
      order_notifications: orderNotifications,
      delivery_notifications: deliveryNotifications,
      payment_notifications: paymentNotifications,
      general_notifications: generalNotifications,
    });
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Notification Settings" showBack />
      <ScrollView
        style={styles.content}
        contentContainerStyle={{
          padding: padding.vertical,
          maxWidth: isTablet() ? 600 : '100%',
          alignSelf: isTablet() ? 'center' : 'stretch',
        }}
      >
        <Card style={styles.section}>
          <Text 
            style={styles.sectionTitle}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            Push Notifications
          </Text>
          <View style={styles.settingRow}>
            <View style={styles.settingContent}>
              <Text style={styles.settingLabel}>Enable Push Notifications</Text>
              <Text style={styles.settingDescription}>
                Receive push notifications on your device
              </Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={setPushEnabled}
              trackColor={{ false: '#ddd', true: '#007AFF' }}
              thumbColor={colors.white}
            />
          </View>
        </Card>

        <Card style={styles.section}>
          <Text 
            style={styles.sectionTitle}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            Notification Types
          </Text>

          <View style={styles.settingRow}>
            <View style={styles.settingContent}>
              <Text 
                style={styles.settingLabel}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                Order Notifications
              </Text>
              <Text 
                style={styles.settingDescription}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                Get notified when your order is confirmed
              </Text>
            </View>
            <Switch
              value={orderNotifications}
              onValueChange={setOrderNotifications}
              disabled={!pushEnabled}
              trackColor={{ false: '#ddd', true: '#007AFF' }}
              thumbColor={colors.white}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingContent}>
              <Text 
                style={styles.settingLabel}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                Delivery Notifications
              </Text>
              <Text 
                style={styles.settingDescription}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                Get notified about delivery updates
              </Text>
            </View>
            <Switch
              value={deliveryNotifications}
              onValueChange={setDeliveryNotifications}
              disabled={!pushEnabled}
              trackColor={{ false: '#ddd', true: '#007AFF' }}
              thumbColor={colors.white}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingContent}>
              <Text 
                style={styles.settingLabel}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                Payment Notifications
              </Text>
              <Text 
                style={styles.settingDescription}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                Get notified about payment status
              </Text>
            </View>
            <Switch
              value={paymentNotifications}
              onValueChange={setPaymentNotifications}
              disabled={!pushEnabled}
              trackColor={{ false: '#ddd', true: '#007AFF' }}
              thumbColor={colors.white}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingContent}>
              <Text 
                style={styles.settingLabel}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                General Notifications
              </Text>
              <Text 
                style={styles.settingDescription}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                Receive general updates and announcements
              </Text>
            </View>
            <Switch
              value={generalNotifications}
              onValueChange={setGeneralNotifications}
              disabled={!pushEnabled}
              trackColor={{ false: '#ddd', true: '#007AFF' }}
              thumbColor={colors.white}
            />
          </View>
        </Card>

        <Button
          title="Save Settings"
          onPress={handleSave}
          loading={updateMutation.isPending}
          fullWidth
          style={styles.saveButton}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.tertiary,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: getResponsiveFontSize(18),
    flexShrink: 1,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: isSmallDevice() ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: isSmallDevice() ? 'flex-start' : 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: isSmallDevice() ? 8 : 0,
  },
  settingContent: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
    flexShrink: 1,
  },
  settingDescription: {
    fontSize: 12,
    color: '#666',
    flexShrink: 1,
  },
  saveButton: {
    marginTop: 8,
    marginBottom: 16,
  },
});

export default NotificationSettingsScreen;

