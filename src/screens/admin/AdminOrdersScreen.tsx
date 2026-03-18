import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Platform,
  StatusBar
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { Button } from 'react-native-paper';

import { RootStackParamList, OrderStatus } from '../../types';
import { orderService } from '../../services/orderService';
import { useOrderRealtime } from '../../hooks/useOrderRealtime';
import { useAuthStore } from '../../store/authStore';
import { EmptyState, SkeletonCard, AnimatedView, GlassStatCard } from '../../components';
import AssignmentModal from '../../components/modals/AssignmentModal';
import SuccessModal from '../../components/modals/SuccessModal';

import { debounce } from '../../utils/debounce';
import { colors } from '../../theme';
import { getResponsivePadding, isTablet } from '../../utils/responsive';

// --- Premium Design Colors (Synced with Dashboard) ---
// const designColors = { ... } -> We will use `colors` from theme directly where possible for consistency

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return dateString;
  }
};

type AdminOrdersScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AdminOrders'>;

const AdminOrdersScreen = () => {
  const navigation = useNavigation<AdminOrdersScreenNavigationProp>();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const padding = getResponsivePadding();
  const isTabletDevice = isTablet();

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | 'all'>('all');
  const [selectedCountry, setSelectedCountry] = useState<'all' | 'germany' | 'denmark'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Assignment Modal State
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', message: '' });

  // Real-time updates
  useOrderRealtime(user?.id || '');

  // Debounce search
  const debouncedSearch = useMemo(
    () => debounce((query: string) => setDebouncedSearchQuery(query), 300),
    []
  );

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    debouncedSearch(text);
  };

  // Fetch all orders
  const {
    data: orders = [],
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['allOrders'],
    queryFn: () => orderService.getAllOrders(),
  });

  // Filter orders logic
  const filteredOrders = useMemo(() => {
    let filtered = orders;
    if (selectedCountry !== 'all') filtered = filtered.filter((order) => order.country === selectedCountry);
    if (selectedStatus !== 'all') filtered = filtered.filter((order) => order.status === selectedStatus);
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter((order) => order.id.toLowerCase().includes(query));
    }
    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [orders, selectedStatus, selectedCountry, debouncedSearchQuery]);

  // Stats logic
  const stats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    delivery: orders.filter(o => o.status === 'out_for_delivery').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
  }), [orders]);

  const handleOrderPress = useCallback((orderId: string) => {
    (navigation as any).navigate('OrderDetails', { orderId });
  }, [navigation]);

  const toggleSelection = (orderId: string, status: OrderStatus) => {
    if (status !== 'pending') return;

    const newSelected = new Set(selectedOrderIds);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrderIds(newSelected);

    if (newSelected.size === 0) {
      setIsSelectionMode(false);
    }
  };

  const handleLongPress = (orderId: string, status: OrderStatus) => {
    if (status !== 'pending') return;
    setIsSelectionMode(true);
    const newSelected = new Set(selectedOrderIds);
    newSelected.add(orderId);
    setSelectedOrderIds(newSelected);
  };

  const openAssignModal = () => {
    if (selectedOrderIds.size === 0) {
      Alert.alert(t('admin.orders.noOrdersSelected'));
      return;
    }
    setAssignModalVisible(true);
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return colors.warning[500];
      case 'confirmed': return colors.info[500];
      case 'out_for_delivery': return colors.primary[500];
      case 'delivered': return colors.success[500];
      case 'canceled': return colors.error[500];
      default: return colors.neutral[500];
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return t('admin.orders.pending');
      case 'confirmed': return t('orders.confirmed');
      case 'out_for_delivery': return t('admin.orders.delivery');
      case 'delivered': return t('admin.orders.delivered');
      case 'canceled': return t('orders.canceled');
      default: return status;
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'clock-outline';
      case 'confirmed': return 'check-circle-outline';
      case 'out_for_delivery': return 'truck-fast';
      case 'delivered': return 'check-decagram';
      case 'canceled': return 'close-circle';
      default: return 'help-circle';
    }
  };


  // --- Render Items ---

  const renderOrderItem = useCallback(({ item, index }: { item: typeof filteredOrders[0], index: number }) => {
    const isSelected = selectedOrderIds.has(item.id);
    const statusColor = getStatusColor(item.status);

    return (
      <AnimatedView animation="fade" delay={index * 50}>
        <TouchableOpacity
          onPress={() => {
            if (isSelectionMode) {
              toggleSelection(item.id, item.status);
            } else {
              handleOrderPress(item.id);
            }
          }}
          onLongPress={() => handleLongPress(item.id, item.status)}
          activeOpacity={0.8}
          style={[
            styles.orderCard,
            isSelected && styles.orderCardSelected
          ]}
        >
          {isSelectionMode && item.status === 'pending' && (
            <View style={styles.selectionOverlay}>
              <Icon
                name={isSelected ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"}
                size={24}
                color={isSelected ? colors.primary[500] : colors.neutral[400]}
              />
            </View>
          )}

          <View style={styles.cardHeader}>
            <View style={styles.orderIdContainer}>
              <Icon name="package-variant" size={20} color={colors.navy[600]} />
              <Text style={styles.orderId}>#{item.id.slice(0, 8).toUpperCase()}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
              <Icon name={getStatusIcon(item.status)} size={12} color={statusColor} style={{ marginRight: 4 }} />
              <Text style={[styles.statusText, { color: statusColor }]}>{getStatusLabel(item.status)}</Text>
            </View>
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.cardBody}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>{t('common.date')}</Text>
                <Text style={styles.infoValue}>{formatDate(item.created_at)}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>{t('common.country')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text>{item.country === 'germany' ? '🇩🇪' : '🇩🇰'}</Text>
                  <Text style={styles.infoValue}>
                    {item.country === 'germany' ? t('admin.orders.germany') : t('admin.orders.denmark')}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.infoRow, { marginTop: 12 }]}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>{t('orders.payment')}</Text>
                <Text style={styles.infoValue}>
                  {item.payment_method === 'online' ? t('orders.onlinePayment') : t('orders.cashOnDelivery')}
                </Text>
              </View>
            </View>

            {/* Pickup & Contact Info Badges */}
            {(item.pickup_point?.name || item.user?.phone) && (
              <View style={styles.badgesContainer}>
                {item.pickup_point?.name && (
                  <View style={[styles.miniBadge, { backgroundColor: colors.info[50] }]}>
                    <Icon name="store-marker-outline" size={12} color={colors.info[700]} />
                    <Text style={[styles.miniBadgeText, { color: colors.info[700] }]}>{item.pickup_point.name}</Text>
                  </View>
                )}
                {item.user?.phone && (
                  <View style={[styles.miniBadge, { backgroundColor: colors.success[50] }]}>
                    <Icon name="phone-outline" size={12} color={colors.success[700]} />
                    <Text style={[styles.miniBadgeText, { color: colors.success[700] }]}>{item.user.phone}</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Quick Assign Action */}
          {((item.status === 'pending' || item.status === 'confirmed' || item.status === 'out_for_delivery') && !isSelectionMode) && (
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => {
                setSelectedOrderIds(new Set([item.id]));
                setAssignModalVisible(true);
              }}
            >
              <Text style={styles.quickActionText}>{t('admin.orders.assignPartner')}</Text>
              <Icon name="arrow-right" size={16} color={colors.primary[600]} />
            </TouchableOpacity>
          )}

        </TouchableOpacity>
      </AnimatedView>
    );
  }, [handleOrderPress, isSelectionMode, selectedOrderIds, t]);


  // --- Header Component ---
  const renderHeader = useMemo(() => (
    <View style={styles.headerContainer}>
      {/* Navy Gradient Header */}
      <ExpoLinearGradient
        colors={[colors.navy[900], colors.navy[700]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerSubtitle}>{t('admin.dashboard.title').toUpperCase()}</Text>
            <Text style={styles.headerTitle}>{t('admin.orders.manageOrders')}</Text>
          </View>
          <TouchableOpacity onPress={() => refetch()} style={styles.headerIconBtn}>
            <Icon name="refresh" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Search Bar inside Header */}
        <View style={styles.searchContainer}>
          <Icon name="magnify" size={20} color="rgba(255,255,255,0.7)" />
          <TextInput
            style={styles.searchInput}
            placeholder={t('orders.searchPlaceholder')}
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearchChange('')}>
              <Icon name="close" size={20} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </ExpoLinearGradient>

      {/* Floating Stats Cards */}
      <View style={styles.statsContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 10 }}
          data={[
            { label: t('admin.orders.total'), value: stats.total, icon: 'package-variant', color: colors.primary[500] },
            { label: t('admin.orders.pending'), value: stats.pending, icon: 'clock-outline', color: colors.warning[500] },
            { label: t('admin.orders.delivery'), value: stats.delivery, icon: 'truck-delivery', color: colors.info[500] },
            { label: t('admin.orders.delivered'), value: stats.delivered, icon: 'check-circle', color: colors.success[500] },
          ]}
          keyExtractor={(item) => item.label}
          renderItem={({ item }) => (
            <GlassStatCard
              label={item.label}
              value={String(item.value)}
              icon={item.icon as any}
              color={item.color}
              compact
            />
          )}
        />
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <Text style={styles.sectionTitle}>{t('common.filter')}</Text>

        {/* Status Filter Scroll */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 12, paddingHorizontal: 20 }}
          data={[
            { key: 'all', label: t('admin.orders.allStatuses'), icon: 'apps' },
            { key: 'pending', label: t('admin.orders.pending'), icon: 'clock-outline' },
            { key: 'confirmed', label: t('orders.confirmed'), icon: 'check' },
            { key: 'out_for_delivery', label: t('admin.orders.inTransit'), icon: 'truck-fast' },
            { key: 'delivered', label: t('admin.orders.delivered'), icon: 'check-circle' },
            { key: 'canceled', label: t('orders.canceled'), icon: 'close-circle' },
          ]}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSelectedStatus(item.key as any)}
              style={[
                styles.filterPill,
                selectedStatus === item.key && styles.filterPillActive
              ]}
            >
              <Icon
                name={item.icon as any}
                size={16}
                color={selectedStatus === item.key ? 'white' : colors.neutral[500]}
              />
              <Text style={[
                styles.filterPillText,
                selectedStatus === item.key && styles.filterPillTextActive
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />

        {/* Country Filter Scroll */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 12, paddingHorizontal: 20 }}
          data={[
            { key: 'all', label: t('admin.orders.allCountries'), flag: '🌍' },
            { key: 'germany', label: t('admin.orders.germany'), flag: '🇩🇪' },
            { key: 'denmark', label: t('admin.orders.denmark'), flag: '🇩🇰' },
          ]}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSelectedCountry(item.key as any)}
              style={[
                styles.countryPill,
                selectedCountry === item.key && styles.countryPillActive
              ]}
            >
              <Text style={{ marginRight: 6 }}>{item.flag}</Text>
              <Text style={[
                styles.filterPillText,
                selectedCountry === item.key && styles.filterPillTextActive
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />

        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>
            {t('admin.orders.foundOrders', { count: filteredOrders.length })}
          </Text>
        </View>
      </View>
    </View>
  ), [stats, t, searchQuery, selectedStatus, selectedCountry, filteredOrders.length, insets.top]);

  if (error) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <EmptyState
          icon="alert-circle"
          title={t('admin.orders.failedToLoad')}
          message={t('admin.orders.pleaseTryAgain')}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />


      <FlatList
        data={filteredOrders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ padding: 20 }}>
              <SkeletonCard type="order" count={3} />
            </View>
          ) : (
            <EmptyState
              icon="package-variant"
              title={t('admin.orders.noOrdersFound')}
              message={t('admin.orders.tryAdjustingFilters')}
            />
          )
        }
        contentContainerStyle={{ paddingBottom: 140 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary[500]} />}
      />

      <AssignmentModal
        visible={assignModalVisible}
        onDismiss={() => {
          setAssignModalVisible(false);
          setIsSelectionMode(false); // Reset selection if dismissed without assigning
        }}
        onAssignSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['allOrders'] });
          setSuccessMessage({
            title: t('common.success'),
            message: t('admin.orders.assignedSuccess')
          });
          setSuccessModalVisible(true);
          setSelectedOrderIds(new Set());
          setIsSelectionMode(false);
        }}
        orderIds={Array.from(selectedOrderIds)}
        filterCountries={Array.from(new Set(
          orders.filter(o => selectedOrderIds.has(o.id)).map(o => o.country)
        ))}
      />

      {/* Floating Bulk Assign Button */}
      {isSelectionMode && selectedOrderIds.size > 0 && (
        <AnimatedView animation="slide" enterFrom="bottom" style={styles.floatingActionContainer}>
          <View style={styles.selectionInfo}>
            <Text style={styles.selectionCount}>{t('admin.orders.selectionCount', { count: selectedOrderIds.size })}</Text>
            <TouchableOpacity onPress={() => { setIsSelectionMode(false); setSelectedOrderIds(new Set()); }}>
              <Text style={styles.cancelLink}>{t('admin.orders.cancel')}</Text>
            </TouchableOpacity>
          </View>
          <Button
            mode="contained"
            icon="truck-delivery"
            onPress={openAssignModal}
            style={styles.assignBtn}
            labelStyle={{ fontWeight: 'bold' }}
            buttonColor={colors.navy[800]}
          >
            {t('admin.orders.assignPartner')}
          </Button>
        </AnimatedView>
      )}

      <SuccessModal
        visible={successModalVisible}
        onDismiss={() => setSuccessModalVisible(false)}
        title={successMessage.title}
        message={successMessage.message}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // Header
  headerContainer: {
    marginBottom: 16,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 60, // Space for overlapping stats
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerSubtitle: {
    color: colors.primary[200],
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  headerTitle: {
    color: 'white',
    fontSize: 28,
    fontWeight: '800',
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: 'white',
    fontSize: 15,
  },

  // Stats
  statsContainer: {
    marginTop: -45, // Overlap header
    marginBottom: 20,
  },

  // Filters
  filtersContainer: {

  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy[900],
    marginLeft: 20,
    marginBottom: 10,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    gap: 6,
  },
  filterPillActive: {
    backgroundColor: colors.navy[900],
    borderColor: colors.navy[900],
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[600],
  },
  filterPillTextActive: {
    color: 'white',
  },
  countryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  countryPillActive: {
    backgroundColor: colors.navy[900],
    borderColor: colors.navy[900],
  },
  resultsHeader: {
    paddingHorizontal: 20,
    marginTop: 8,
  },
  resultsCount: {
    color: colors.neutral[500],
    fontSize: 13,
  },

  // Order Card
  orderCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  orderCardSelected: {
    borderColor: colors.primary[500],
    backgroundColor: '#F0F9FF',
  },
  selectionOverlay: {
    position: 'absolute',
    right: 16,
    top: 16,
    zIndex: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderId: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy[900],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.neutral[100],
    marginBottom: 12,
  },
  cardBody: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoItem: {
    gap: 2,
  },
  infoLabel: {
    fontSize: 11,
    color: colors.neutral[400],
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[800],
  },

  badgesContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  miniBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  miniBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },

  quickActionBtn: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary[600],
  },

  // Floating Action
  floatingActionContainer: {
    position: 'absolute',
    bottom: 120,
    left: 16,
    right: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  selectionInfo: {
    flex: 1,
  },
  selectionCount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy[900],
  },
  cancelLink: {
    color: colors.neutral[500],
    fontSize: 13,
    marginTop: 2,
  },
  assignBtn: {
    borderRadius: 12,
  },

});

export default AdminOrdersScreen;
