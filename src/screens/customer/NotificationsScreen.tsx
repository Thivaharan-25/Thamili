import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList, Notification } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { notificationService } from '../../services/notificationService';
import {
  AppHeader,
  NotificationCard,
  EmptyState,
  LoadingScreen,
  ErrorMessage,
  Button,
} from '../../components';
import { COUNTRIES } from '../../constants';
import type { Country } from '../../constants';
import { isTablet, getResponsivePadding } from '../../utils/responsive';

type NotificationsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Notifications'>;

const NotificationsScreen = () => {
  const navigation = useNavigation<NotificationsScreenNavigationProp>();
  const { user, isAuthenticated } = useAuthStore();
  const { selectedCountry } = useCartStore();
  const queryClient = useQueryClient();
  const padding = getResponsivePadding();

  // Use user's country preference if authenticated, otherwise use selected country from cart store
  const country = (isAuthenticated && user?.country_preference)
    ? user.country_preference
    : (selectedCountry || COUNTRIES.GERMANY) as Country;

  // Fetch notifications
  const {
    data: notifications = [],
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => notificationService.getNotifications(user?.id || ''),
    enabled: !!user?.id,
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      notificationService.markAsRead(user?.id || '', notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(user?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  // Auto-mark all as read when focusing the screen
  useFocusEffect(
    useCallback(() => {
      if (unreadCount > 0 && user?.id) {
        handleMarkAllAsRead();
      }
    }, [unreadCount, user?.id])
  );

  const handleClearAll = () => {
    // TODO: Implement clear all functionality
  };

  if (isLoading) {
    return <LoadingScreen message="Loading notifications..." />;
  }

  if (error) {
    return (
      <View style={styles.container}>
        <AppHeader title="Notifications" />
        <ErrorMessage
          message="Failed to load notifications. Please try again."
          error={error}
          onRetry={async () => { await refetch(); }}
          retryWithBackoff={true}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title="Notifications"
        rightAction={
          unreadCount > 0
            ? (
              <TouchableOpacity
                onPress={handleMarkAllAsRead}
                style={{
                  padding: 8,
                  borderRadius: 8,
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }}
              >
                <Icon name="check-all" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            )
            : undefined
        }
      />

      {notifications.length === 0 ? (
        <EmptyState
          icon="bell-off"
          title="No notifications"
          message="You're all caught up! We'll notify you about order updates and special offers."
          suggestions={[
            'Order updates will appear here',
            'Enable push notifications in settings for real-time alerts',
          ]}
        />
      ) : (
        <>
          {unreadCount > 0 && (
            <View style={[styles.headerActions, { paddingHorizontal: padding.horizontal, paddingBottom: padding.vertical * 0.5 }]}>
              <Button
                title={`Mark all as read (${unreadCount})`}
                onPress={handleMarkAllAsRead}
                variant="outline"
                style={styles.markAllButton}
              />
            </View>
          )}

          <FlatList
            data={notifications}
            keyExtractor={useCallback((item: Notification) => item.id, [])}
            renderItem={useCallback(({ item }: { item: Notification }) => (
              <NotificationCard
                notification={item}
                country={country}
                onPress={() => {
                  if (!item.read) {
                    handleMarkAsRead(item.id);
                  }
                }}
                onMarkAsRead={() => handleMarkAsRead(item.id)}
              />
            ), [country, handleMarkAsRead])}
            contentContainerStyle={[
              styles.listContent,
              {
                padding: padding.vertical,
                paddingTop: unreadCount > 0 ? padding.vertical * 0.5 : padding.vertical,
                maxWidth: isTablet() ? 600 : '100%',
                alignSelf: isTablet() ? 'center' : 'stretch',
              }
            ]}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
            }
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={10}
            windowSize={10}
            getItemLayout={(data, index) => ({
              length: 100, // Approximate notification card height
              offset: 100 * index,
              index,
            })}
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerActions: {
    // padding will be set dynamically
  },
  markAllButton: {
    marginBottom: 0,
  },
  listContent: {
    // padding will be set dynamically
  },
});

export default NotificationsScreen;

