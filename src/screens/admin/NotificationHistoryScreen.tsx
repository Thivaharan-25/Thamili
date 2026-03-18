import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from 'react-i18next';
import { notificationService } from '../../services/notificationService';
import { formatDateTime } from '../../utils/regionalFormatting';
import { useAuthStore } from '../../store/authStore';
import { COUNTRIES } from '../../constants';
import type { Country } from '../../constants';
import { isTablet, isSmallDevice, getResponsivePadding } from '../../utils/responsive';
import { colors } from '../../theme';
import { LoadingScreen, ErrorMessage, AnimatedView } from '../../components';
import { Notification } from '../../types/notifications';

const NotificationHistoryScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [typeFilter, setTypeFilter] = useState<'all' | 'order' | 'delivery' | 'promo' | 'general'>('all');
  const { user } = useAuthStore();
  const country = (user?.country_preference || COUNTRIES.GERMANY) as Country;
  const insets = useSafeAreaInsets();
  const padding = getResponsivePadding();

  // Fetch in-app notification history
  const {
    data: notifications = [],
    isLoading,
    error,
    refetch,
    isRefetching
  } = useQuery({
    queryKey: ['notificationHistory', user?.id, typeFilter],
    queryFn: async () => {
      if (!user?.id) return [];
      const allNotifications = await notificationService.getNotifications(user.id);

      if (typeFilter === 'all') return allNotifications;

      return allNotifications.filter((n: Notification) => {
        if (typeFilter === 'order') {
          return ['order', 'order_confirmed', 'order_shipped', 'order_delivered', 'order_canceled'].includes(n.type);
        }
        if (typeFilter === 'delivery') {
          return ['delivery', 'task_assigned', 'ready_for_pickup', 'delivery_failed', 'task_cancelled'].includes(n.type);
        }
        return n.type === typeFilter;
      });
    },
    enabled: !!user?.id,
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order':
      case 'order_confirmed':
      case 'order_shipped':
      case 'order_delivered':
      case 'order_canceled':
        return 'package-variant';
      case 'delivery':
      case 'task_assigned':
      case 'ready_for_pickup':
      case 'delivery_failed':
      case 'task_cancelled':
        return 'truck-delivery';
      case 'promo': return 'tag-heart';
      case 'general': return 'bell';
      default: return 'bell-outline';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'order':
      case 'order_confirmed':
      case 'order_shipped':
      case 'order_delivered':
        return colors.primary[500];
      case 'order_canceled':
        return colors.error[500];
      case 'delivery':
      case 'task_assigned':
      case 'ready_for_pickup':
        return colors.secondary[500];
      case 'delivery_failed':
      case 'task_cancelled':
        return colors.error[500];
      case 'promo': return colors.warning[500];
      case 'general': return colors.info[500];
      default: return colors.neutral[500];
    }
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <ExpoLinearGradient
        colors={[colors.navy[900], colors.navy[700]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: insets.top + 20 }]}
      >
        <View style={[styles.headerContent, { paddingHorizontal: padding.horizontal }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="arrow-left" size={24} color={colors.white} />
          </TouchableOpacity>
          <Text
            style={styles.headerTitle}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {t('admin.history.title')}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Filter Pills */}
        <View style={styles.filterContainer}>
          {(['all', 'order', 'delivery', 'promo', 'general'] as const).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterPill,
                typeFilter === type && styles.filterPillActive,
              ]}
              onPress={() => setTypeFilter(type)}
            >
              <Text
                style={[
                  styles.filterText,
                  typeFilter === type && styles.filterTextActive
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {t('admin.history.filters.' + type)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ExpoLinearGradient>
    </View>
  );

  if (isLoading && !isRefetching && notifications.length === 0) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <LoadingScreen message={t('admin.history.loading')} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.content}>
          <ErrorMessage
            message={t('admin.history.failed')}
            onRetry={async () => { await refetch(); }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      {renderHeader()}

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: padding.horizontal,
          paddingBottom: padding.vertical * 2,
          paddingTop: 20
        }}
        showsVerticalScrollIndicator={false}
        onRefresh={refetch}
        refreshing={isRefetching}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Icon name="bell-outline" size={32} color={colors.neutral[400]} />
            </View>
            <Text style={styles.emptyTitle}>{t('admin.history.noNotifications')}</Text>
            <Text style={styles.emptyText}>{t('admin.history.emptyMessage')}</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <AnimatedView animation="fade" delay={index * 50}>
            <View style={styles.notificationCard}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconBadge, { backgroundColor: getNotificationColor(item.type) + '15' }]}>
                  <Icon name={getNotificationIcon(item.type)} size={20} color={getNotificationColor(item.type)} />
                </View>
                <View style={styles.headerTextContainer}>
                  <Text style={styles.titleText} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.dateText}>
                    {formatDateTime(item.created_at, country)}
                  </Text>
                </View>
                {!item.read && <View style={styles.unreadDot} />}
              </View>

              <Text style={styles.messageText}>{item.message}</Text>

              {item.data?.orderId && (
                <View style={styles.orderBadge}>
                  <Icon name="pound" size={12} color={colors.primary[600]} />
                  <Text style={styles.orderId}>{item.data.orderId.slice(0, 8).toUpperCase()}</Text>
                </View>
              )}
            </View>
          </AnimatedView>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerContainer: {
    marginBottom: 0,
    zIndex: 10,
  },
  headerGradient: {
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },

  // Filters
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    flexWrap: 'wrap',
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  filterPillActive: {
    backgroundColor: colors.white,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    flexShrink: 1,
  },
  filterTextActive: {
    color: colors.navy[900],
  },

  content: {
    flex: 1,
    justifyContent: 'center',
  },

  // Card
  notificationCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.navy[900],
    marginBottom: 2,
  },
  dateText: {
    fontSize: 11,
    color: colors.neutral[400],
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary[500],
  },
  messageText: {
    fontSize: 14,
    color: colors.neutral[700],
    lineHeight: 20,
    marginBottom: 12,
  },
  orderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[50],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    gap: 4,
  },
  orderId: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary[700],
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: colors.neutral[500],
  },
});

export default NotificationHistoryScreen;
