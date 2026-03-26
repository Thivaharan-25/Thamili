/**
 * Admin Delivery Management Screen
 * Allows admins to view and manage delivery schedules, update delivery status,
 * and access customer contact information - all delivery partner features
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity, Alert, StyleSheet, Dimensions, StatusBar, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../../types';
import { deliveryService, DeliveryStatus } from '../../services/deliveryService';
import { useAuthStore } from '../../store/authStore';
import {
  SearchBar,
  EmptyState,
  ErrorMessage,
  AnimatedView,
  Badge,
  SkeletonCard,
  DeliveryStatusModal,
  ContactCustomerModal,
} from '../../components';
import { COUNTRIES } from '../../constants';
import type { Country } from '../../constants';
import { colors } from '../../theme';
import {
  isSmallDevice,
  isTablet,
  getResponsivePadding,
} from '../../utils/responsive';
import { formatCurrency } from '../../utils/regionalFormatting';

// Simple date formatter (avoiding date-fns dependency)
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate().toString().padStart(2, '0')}, ${date.getFullYear()}`;
  } catch {
    return dateString;
  }
};

type AdminDeliveryScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AdminDelivery'>;

const AdminDeliveryScreen = () => {
  const navigation = useNavigation<AdminDeliveryScreenNavigationProp>();
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const country = (user?.country_preference || COUNTRIES.GERMANY) as Country;

  // Responsive dimensions
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const isTabletDevice = isTablet();
  const padding = getResponsivePadding();

  // Update dimensions on orientation change
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData(window);
    });
    return () => subscription?.remove();
  }, []);

  const [selectedStatus, setSelectedStatus] = useState<DeliveryStatus | 'all'>('all');
  const [selectedCountry, setSelectedCountry] = useState<'all' | 'germany' | 'denmark'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [targetStatus, setTargetStatus] = useState<DeliveryStatus | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);

  // Contact Modal State
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [contactPhone, setContactPhone] = useState('');
  const [contactName, setContactName] = useState('');

  // Debounce search
  const debouncedSearch = useMemo(
    () =>
      (query: string) => {
        setTimeout(() => setDebouncedSearchQuery(query), 300);
      },
    []
  );

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    debouncedSearch(text);
  };

  // Fetch delivery schedules
  const {
    data: schedules = [],
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['deliverySchedules', selectedStatus !== 'all' ? selectedStatus : undefined, selectedCountry !== 'all' ? selectedCountry : undefined],
    queryFn: () =>
      deliveryService.getDeliverySchedules({
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        country: selectedCountry !== 'all' ? selectedCountry : undefined,
      }),
  });

  const selectedOrder = useMemo(() =>
    schedules.find(s => s.id === selectedScheduleId),
    [schedules, selectedScheduleId]
  );

  // Filter schedules by search query
  const filteredSchedules = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return schedules;

    const query = debouncedSearchQuery.toLowerCase();
    return schedules.filter((schedule) => {
      const orderId = schedule.order_id.toLowerCase();
      const customerName = schedule.customer?.name?.toLowerCase() || '';
      const customerEmail = schedule.customer?.email?.toLowerCase() || '';
      const pickupPointName = schedule.pickup_point?.name?.toLowerCase() || '';

      return (
        orderId.includes(query) ||
        customerName.includes(query) ||
        customerEmail.includes(query) ||
        pickupPointName.includes(query)
      );
    });
  }, [schedules, debouncedSearchQuery]);

  // Update delivery status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ scheduleId, status }: { scheduleId: string; status: DeliveryStatus }) =>
      deliveryService.updateDeliverySchedule(scheduleId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliverySchedules'] });
      queryClient.invalidateQueries({ queryKey: ['allOrders'] });
    },
  });

  const handleStatusUpdate = useCallback((scheduleId: string, newStatus: DeliveryStatus) => {
    setSelectedScheduleId(scheduleId);
    setTargetStatus(newStatus);
    setModalVisible(true);
  }, []);

  const confirmStatusUpdate = () => {
    if (selectedScheduleId && targetStatus) {
      updateStatusMutation.mutate({ scheduleId: selectedScheduleId, status: targetStatus });
      setModalVisible(false);
      setSelectedScheduleId(null);
      setTargetStatus(null);
    }
  };

  const handleSchedulePress = useCallback((scheduleId: string) => {
    // Navigate to order details or delivery details
    const schedule = schedules.find((s) => s.id === scheduleId);
    if (schedule?.order_id) {
      navigation.navigate('OrderDetails', { orderId: schedule.order_id });
    }
  }, [navigation, schedules]);

  const getStatusColor = (status: DeliveryStatus) => {
    switch (status) {
      case 'scheduled':
        return colors.neutral[500];
      case 'in_transit':
        return colors.primary[500];
      case 'delivered':
        return colors.success[500];
      case 'canceled':
        return colors.error[500];
      case 'failed':
        return colors.error[600];
      default:
        return colors.neutral[500];
    }
  };

  const getStatusIcon = (status: DeliveryStatus) => {
    switch (status) {
      case 'scheduled':
        return 'calendar-clock';
      case 'in_transit':
        return 'truck-delivery';
      case 'delivered':
        return 'check-circle';
      case 'canceled':
        return 'cancel';
      case 'failed':
        return 'alert-circle';
      default:
        return 'help-circle';
    }
  };

  // Memoized render item
  const renderScheduleItem = useCallback(({ item, index }: { item: typeof filteredSchedules[0]; index: number }) => (
    <AnimatedView
      animation="fade"
      delay={index * 50}
      style={{
        marginBottom: 12,
        marginHorizontal: isTabletDevice ? 8 : padding.horizontal,
        flex: isTabletDevice ? 0.5 : 1,
      }}
    >
      <TouchableOpacity
        onPress={() => handleSchedulePress(item.id)}
        activeOpacity={0.9}
        style={styles.card}
      >
        {/* Status Strip */}
        <View style={[styles.statusStrip, { backgroundColor: getStatusColor(item.status) }]} />

        <View style={styles.cardInner}>
          <View style={styles.cardHeader}>
            <View style={styles.headerTopRow}>
              <Text style={styles.orderId}>{t('delivery.orderNo')}{item.order_id.slice(0, 8)}</Text>

              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                <Icon name={getStatusIcon(item.status)} size={12} color={getStatusColor(item.status)} style={{ marginRight: 4 }} />
                <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                  {t(`delivery.status.${item.status}`)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.cardGrid}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>{t('common.date')}</Text>
              <View style={styles.gridValueRow}>
                <Icon name="calendar" size={14} color={colors.neutral[500]} style={{ marginRight: 4 }} />
                <Text style={styles.gridValue}>{formatDate(item.delivery_date)}</Text>
              </View>
            </View>
            <View style={styles.gridBorder} />
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>{t('orders.totalAmount')}</Text>
              <Text style={styles.gridValue}>
                {item.order ? formatCurrency(item.order.total_amount, item.order.country as Country) : '-'}
              </Text>
            </View>
          </View>

          <View style={styles.cardGrid}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>{t('common.customer')}</Text>
              <Text style={styles.gridValue} numberOfLines={1}>
                {item.customer?.name || item.customer?.email || t('common.na')}
              </Text>
            </View>
            <View style={styles.gridBorder} />
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>{t('delivery.destination')}</Text>
              <View style={styles.gridValueRow}>
                <Icon name={item.pickup_point ? "map-marker" : "home"} size={14} color={colors.neutral[500]} style={{ marginRight: 4 }} />
                <Text style={styles.gridValue} numberOfLines={1}>
                  {item.pickup_point ? t('delivery.pickupPoint') : t('delivery.homeDelivery')}
                </Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.cardActions}>
            {item.status === 'scheduled' && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary[50], borderColor: colors.primary[100] }]}
                onPress={() => handleStatusUpdate(item.id, 'in_transit')}
              >
                <Icon name="truck-fast" size={16} color={colors.primary[600]} />
                <Text style={[styles.actionText, { color: colors.primary[600] }]}>{t('delivery.startDeliveryAction')}</Text>
              </TouchableOpacity>
            )}

            {item.status === 'in_transit' && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.success[50], borderColor: colors.success[100] }]}
                  onPress={() => handleStatusUpdate(item.id, 'delivered')}
                >
                  <Icon name="check" size={16} color={colors.success[600]} />
                  <Text style={[styles.actionText, { color: colors.success[600] }]}>{t('delivery.deliveredAction')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonDelete]}
                  onPress={() => handleStatusUpdate(item.id, 'canceled')}
                >
                  <Icon name="close" size={16} color={colors.error[600]} />
                  <Text style={[styles.actionText, { color: colors.error[600] }]}>{t('delivery.cancelAction')}</Text>
                </TouchableOpacity>
              </>
            )}

            {item.customer?.phone && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => {
                  if (item.customer?.phone) {
                    setContactPhone(item.customer.phone);
                    setContactName(item.customer.name || t('common.customer'));
                    setContactModalVisible(true);
                  }
                }}
              >
                <Icon name="phone" size={18} color={colors.neutral[600]} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </AnimatedView>
  ), [handleSchedulePress, handleStatusUpdate, padding.horizontal, isTabletDevice, t]);

  // Memoized key extractor
  const keyExtractor = useCallback((item: typeof filteredSchedules[0]) => item.id, []);

  // stats
  const stats = useMemo(() => {
    return {
      total: schedules.length,
      active: schedules.filter(s => ['scheduled', 'in_transit'].includes(s.status)).length,
      delivered: schedules.filter(s => s.status === 'delivered').length,
    };
  }, [schedules]);

  // Memoized Header
  const HeaderComponent = useMemo(() => (
    <View style={styles.headerContainer}>
      <ExpoLinearGradient
        colors={[colors.navy[800], colors.navy[600]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerBackground, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.headerTop}>
          <Text
            style={styles.headerTitle}
            numberOfLines={1}
            ellipsizeMode="tail"
            adjustsFontSizeToFit={true}
            allowFontScaling={false}
          >
            {t('delivery.title')}
          </Text>
          <View style={styles.headerBadge}>
            <Text
              style={styles.headerBadgeText}
              numberOfLines={1}
              ellipsizeMode="tail"
              adjustsFontSizeToFit={true}
            >
              {stats.total}
            </Text>
          </View>
        </View>

        <SearchBar
          value={searchQuery}
          onChangeText={handleSearchChange}
          onClear={() => {
            setSearchQuery('');
            setDebouncedSearchQuery('');
          }}
          placeholder={t('delivery.searchPlaceholder')}
          style={styles.searchContainer}
          showSuggestions={false}
        />
      </ExpoLinearGradient>

      {/* Overlapping Stats Widgets */}
      <View style={styles.widgetsContainer}>
        <View style={styles.widget}>
          <View style={[styles.widgetIcon, { backgroundColor: colors.info[50] }]}>
            <Icon name="truck-fast-outline" size={22} color={colors.info[600]} />
          </View>
          <View>
            <Text style={styles.widgetValue} numberOfLines={1} adjustsFontSizeToFit={true}>{stats.active}</Text>
            <Text style={styles.widgetLabel} numberOfLines={1} adjustsFontSizeToFit={true}>{t('delivery.active')}</Text>
          </View>
        </View>

        <View style={styles.widget}>
          <View style={[styles.widgetIcon, { backgroundColor: colors.success[50] }]}>
            <Icon name="check-all" size={22} color={colors.success[600]} />
          </View>
          <View>
            <Text style={styles.widgetValue} numberOfLines={1} adjustsFontSizeToFit={true}>{stats.delivered}</Text>
            <Text style={styles.widgetLabel} numberOfLines={1} adjustsFontSizeToFit={true}>{t('delivery.delivered')}</Text>
          </View>
        </View>
      </View>

      {/* Filters */}
      <View style={{ paddingHorizontal: padding.horizontal, marginTop: 4, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text style={styles.sectionTitle}>{t('common.filter')}</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('PickupPoints' as any)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Text style={{ color: colors.primary[600], fontSize: 13, fontWeight: '600' }}>{t('delivery.manageLocations')}</Text>
            <Icon name="arrow-right" size={16} color={colors.primary[600]} />
          </TouchableOpacity>
        </View>

        {/* Country Filter */}
        <View style={[styles.filterRow, { marginBottom: 12 }]}>
          {(['all', 'germany', 'denmark'] as const).map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setSelectedCountry(c)}
              style={[
                styles.filterPill,
                selectedCountry === c && styles.filterPillActive,
                { marginRight: 8 }
              ]}
            >
              <Text style={[
                styles.filterPillText,
                selectedCountry === c && styles.filterPillTextActive,
              ]}>
                {c === 'all' ? t('admin.orders.allCountries') : t('admin.orders.' + c)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Status Filter */}
        <View style={styles.filterRow}>
          {(['all', 'scheduled', 'in_transit', 'delivered', 'canceled'] as const).map((status) => (
            <TouchableOpacity
              key={status}
              onPress={() => setSelectedStatus(status)}
              style={[
                styles.filterPill,
                selectedStatus === status && styles.filterPillActive,
              ]}
            >
              <Text style={[
                styles.filterPillText,
                selectedStatus === status && styles.filterPillTextActive,
              ]}>
                {status === 'all' ? t('delivery.status.all') : t('delivery.status.' + status)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  ), [insets.top, stats.total, stats.active, stats.delivered, searchQuery, handleSearchChange, padding.horizontal, navigation, selectedCountry, selectedStatus, t]);

  if (error) {
    return (
      <View style={styles.screenBackground}>
        <View style={{ paddingTop: insets.top }}>
          <ErrorMessage
            message={t('delivery.failedToLoad')}
            error={error}
            onRetry={async () => { await refetch(); }}
            retryWithBackoff={true}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screenBackground}>

      <FlatList
        data={filteredSchedules}
        renderItem={renderScheduleItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={HeaderComponent}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ paddingHorizontal: padding.horizontal, marginTop: 20 }}>
              <SkeletonCard type="order" count={3} />
            </View>
          ) : (
            <EmptyState
              icon="truck-delivery-outline"
              title={t('delivery.noDeliveriesFound')}
              message={
                filteredSchedules.length === 0 && schedules.length > 0
                  ? t('delivery.noMatch')
                  : t('delivery.noSchedules')
              }
              suggestions={
                filteredSchedules.length === 0 && schedules.length > 0
                  ? [
                      t('delivery.matchSuggestion1', { defaultValue: 'Try changing the filter criteria' }),
                      t('delivery.matchSuggestion2', { defaultValue: 'Clear all filters to see all deliveries' }),
                    ]
                  : [
                      t('delivery.scheduleSuggestion1', { defaultValue: 'Assign orders to delivery partners to create schedules' }),
                    ]
              }
            />
          )
        }
        contentContainerStyle={{
          paddingBottom: 120, // Increased for better scrolling
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary[500]}
          />
        }
        showsVerticalScrollIndicator={false}
        numColumns={isTabletDevice ? 2 : 1}
        key={isTabletDevice ? 'grid' : 'list'}
      />

      <DeliveryStatusModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setSelectedScheduleId(null);
          setTargetStatus(null);
        }}
        onConfirm={confirmStatusUpdate}
        status={targetStatus || 'scheduled'}
        orderId={selectedOrder?.order_id}
      />

      <ContactCustomerModal
        visible={contactModalVisible}
        onClose={() => setContactModalVisible(false)}
        phone={contactPhone}
        customerName={contactName}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screenBackground: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // Header
  headerContainer: {
    marginBottom: 8,
  },
  headerBackground: {
    paddingHorizontal: 20,
    paddingBottom: 60, // Increased extra padding for search/widget overlap
    borderBottomLeftRadius: 32, // More rounded
    borderBottomRightRadius: 32,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 36, // Increased
    fontWeight: '700',
    color: colors.white,
    letterSpacing: -0.5,
  },
  headerBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  headerBadgeText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 20, // Increased
  },
  searchContainer: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 0,
    borderRadius: 12,
  },

  // Widgets
  widgetsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: -40, // Increased overlap
    gap: 16, // Increased gap
    marginBottom: 24,
  },
  widget: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, // Softer opacity
    shadowRadius: 12, // More spread
    elevation: 3,
  },
  widgetIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  widgetValue: {
    fontSize: 18,
    lineHeight: 26, // Increased
    fontWeight: '700',
    color: colors.neutral[900],
  },
  widgetLabel: {
    fontSize: 12,
    lineHeight: 18, // Increased
    color: colors.neutral[500],
    fontWeight: '500',
  },

  // Section Title
  sectionTitle: {
    fontSize: 14,
    lineHeight: 22, // Increased
    fontWeight: '600',
    color: colors.neutral[500],
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Filters
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8, // Increased
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  filterPillActive: {
    backgroundColor: colors.navy[50],
    borderColor: colors.navy[500],
  },
  filterPillText: {
    fontSize: 13,
    lineHeight: 20, // Increased
    color: colors.neutral[600],
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  filterPillTextActive: {
    color: colors.navy[700],
    fontWeight: '600',
  },

  // Card
  card: {
    backgroundColor: colors.white,
    borderRadius: 20, // More rounded
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12, // More spread
    elevation: 2,
    borderWidth: 0, // Removed border for cleaner look
    marginTop: 4, // Slight separation
  },
  statusStrip: {
    width: 4,
    height: '100%',
  },
  cardInner: {
    flex: 1,
    padding: 20, // Increased padding
  },
  cardHeader: {
    marginBottom: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderId: {
    fontSize: 16,
    lineHeight: 24, // Increased
    fontWeight: '700',
    color: colors.neutral[900],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    lineHeight: 16, // Increased
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  // Grid Info
  cardGrid: {
    flexDirection: 'row',
    backgroundColor: colors.neutral[50],
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  gridItem: {
    flex: 1,
  },
  gridBorder: {
    width: 1,
    backgroundColor: colors.neutral[200],
    marginHorizontal: 12,
  },
  gridLabel: {
    fontSize: 11,
    lineHeight: 16, // Increased
    color: colors.neutral[400],
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  gridValue: {
    fontSize: 14,
    lineHeight: 22, // Increased
    fontWeight: '600',
    color: colors.navy[700],
  },
  gridValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Actions
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10, // Increased
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: colors.neutral[50],
    borderColor: colors.neutral[200],
  },
  actionButtonDelete: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  actionText: {
    fontSize: 13,
    lineHeight: 20, // Increased
    fontWeight: '600',
    color: colors.neutral[700],
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AdminDeliveryScreen;
