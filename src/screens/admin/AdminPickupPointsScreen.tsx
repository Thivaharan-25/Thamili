import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Dimensions, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { RootStackParamList, PickupPoint } from '../../types';
import { pickupPointService } from '../../services';
import {
  AppHeader,
  Button,
  EmptyState,
  LoadingScreen,
  ErrorMessage,
  SearchBar,
  AnimatedView,
  SkeletonCard,
  RemoveItemModal,
  SuccessCelebration
} from '../../components';
import { useAuthStore } from '../../store/authStore';
import { formatPrice } from '../../utils/productUtils';
import { COUNTRIES } from '../../constants';
import type { Country } from '../../constants';
import { isTablet, isSmallDevice, getResponsivePadding } from '../../utils/responsive';
import { colors } from '../../theme';

type AdminPickupPointsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AdminPickupPoints'>;

const AdminPickupPointsScreen = () => {
  const navigation = useNavigation<AdminPickupPointsScreenNavigationProp>();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const country = (user?.country_preference || COUNTRIES.GERMANY) as Country;

  // Responsive dimensions
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const isTabletDevice = isTablet();
  const padding = getResponsivePadding();

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData(window);
    });
    return () => subscription?.remove();
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [pickupPointToDelete, setPickupPointToDelete] = useState<PickupPoint | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Fetch all pickup points
  const { data: pickupPoints = [], isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['pickupPoints', 'all'],
    queryFn: () => pickupPointService.getPickupPoints(undefined, true), // Pass true to include inactive
  });

  // Filter pickup points
  const filteredPickupPoints = useMemo(() => {
    if (!searchQuery.trim()) return pickupPoints;
    const query = searchQuery.toLowerCase();
    return pickupPoints.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.address.toLowerCase().includes(query) ||
      p.country.toLowerCase().includes(query)
    );
  }, [pickupPoints, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: pickupPoints.length,
      active: pickupPoints.filter(p => p.active).length,
      inactive: pickupPoints.filter(p => !p.active).length
    };
  }, [pickupPoints]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (pickupPointId: string) => pickupPointService.deletePickupPoint(pickupPointId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pickupPoints'] });
      setShowSuccessModal(true);
    },
    onError: (error: any) => {
      Alert.alert(t('common.error'), error.message || t('admin.pickupPoints.failedToDelete'));
    },
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: ({ pickupPointId, active }: { pickupPointId: string; active: boolean }) =>
      pickupPointService.updatePickupPoint(pickupPointId, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pickupPoints'] });
    },
    onError: (error: any) => {
      Alert.alert(t('common.error'), error.message || t('admin.pickupPoints.failedToUpdate'));
    },
  });

  const handleAddPickupPoint = useCallback(() => {
    (navigation as any).navigate('AddPickupPoint');
  }, [navigation]);

  const handleEditPickupPoint = useCallback((pickupPointId: string) => {
    (navigation as any).navigate('EditPickupPoint', { pickupPointId });
  }, [navigation]);

  const handleDeletePickupPoint = useCallback((point: PickupPoint) => {
    setPickupPointToDelete(point);
    setDeleteModalVisible(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (pickupPointToDelete) {
      deleteMutation.mutate(pickupPointToDelete.id);
      setDeleteModalVisible(false);
      setPickupPointToDelete(null);
    }
  }, [deleteMutation, pickupPointToDelete]);

  const handleToggleActive = useCallback((point: PickupPoint) => {
    toggleActiveMutation.mutate({
      pickupPointId: point.id,
      active: !point.active,
    });
  }, [toggleActiveMutation]);

  // Memoized render item
  const renderPickupPointItem = useCallback(({ item, index }: { item: PickupPoint; index: number }) => (
    <AnimatedView
      animation="fade"
      delay={index * 50}
      style={{
        marginBottom: 12,
        marginHorizontal: isTabletDevice ? 8 : padding.horizontal,
        flex: isTabletDevice ? 0.5 : 1,
      }}
    >
      <View style={[styles.card, !item.active && styles.cardInactive]}>
        {/* Status Strip */}
        <View style={[styles.statusStrip, { backgroundColor: item.active ? colors.success[500] : colors.neutral[400] }]} />

        <View style={styles.cardInner}>
          <View style={styles.cardHeader}>
            <View style={styles.headerTopRow}>
              <View style={[styles.countryBadge, { backgroundColor: colors.primary[50] }]}>
                <Text style={[styles.countryText, { color: colors.primary[700] }]}>
                  {item.country.toUpperCase()}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => handleToggleActive(item)}
                style={[styles.statusToggle, { backgroundColor: item.active ? colors.success[100] : colors.neutral[100] }]}
              >
                <Text style={[styles.statusText, { color: item.active ? colors.success[700] : colors.neutral[500] }]}>
                  {item.active ? t('admin.pickupPoints.active') : t('admin.pickupPoints.inactive')}
                </Text>
                <View style={[styles.statusDot, { backgroundColor: item.active ? colors.success[500] : colors.neutral[400] }]} />
              </TouchableOpacity>
            </View>

            <Text
              style={styles.pickupPointName}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.name}
            </Text>
          </View>

          <View style={styles.cardContent}>
            <View style={styles.infoRow}>
              <Icon name="map-marker-outline" size={16} color={colors.neutral[500]} />
              <Text
                style={styles.addressText}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {item.address}
              </Text>
            </View>

            {item.working_hours && (
              <View style={styles.infoRow}>
                <Icon name="clock-outline" size={16} color={colors.neutral[500]} />
                <Text style={styles.addressText} numberOfLines={1}>{item.working_hours}</Text>
              </View>
            )}

            {item.contact_number && (
              <View style={styles.infoRow}>
                <Icon name="phone-outline" size={16} color={colors.neutral[500]} />
                <Text style={styles.addressText} numberOfLines={1}>{item.contact_number}</Text>
              </View>
            )}

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>{t('admin.pickupPoints.fee')}</Text>
                <Text style={styles.statValue}>{formatPrice(item.delivery_fee, item.country as Country)}</Text>
              </View>
              <View style={styles.statDivider} />
              {item.latitude && item.longitude ? (
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>{t('admin.pickupPoints.coordinates')}</Text>
                  <Text style={styles.statValue}>{t('admin.pickupPoints.set')}</Text>
                </View>
              ) : (
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>{t('admin.pickupPoints.coordinates')}</Text>
                  <Text style={[styles.statValue, { color: colors.warning[600] }]}>{t('admin.pickupPoints.missing')}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEditPickupPoint(item.id)}
            >
              <Icon name="pencil" size={16} color={colors.navy[600]} />
              <Text style={styles.actionText}>{t('admin.pickupPoints.edit')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDeletePickupPoint(item)}
            >
              <Icon name="trash-can-outline" size={16} color={colors.error[600]} />
              <Text style={[styles.actionText, styles.deleteText]}>{t('admin.pickupPoints.delete')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </AnimatedView>
  ), [handleToggleActive, handleEditPickupPoint, handleDeletePickupPoint, isTabletDevice, padding.horizontal, t]);

  // Memoized key extractor
  const keyExtractor = useCallback((item: PickupPoint) => item.id, []);

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
          <Text style={styles.headerTitle}>{t('admin.pickupPoints.title')}</Text>
          <TouchableOpacity onPress={handleAddPickupPoint} style={styles.headerAddBtn}>
            <Icon name="plus" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>

        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={() => setSearchQuery('')}
          placeholder={t('admin.pickupPoints.searchPlaceholder')}
          style={styles.searchContainer}
          showSuggestions={false}
        />
      </ExpoLinearGradient>

      {/* Widgets */}
      <View style={styles.widgetsContainer}>
        <View style={styles.widget}>
          <View style={[styles.widgetIcon, { backgroundColor: colors.primary[50] }]}>
            <Icon name="map-marker-radius-outline" size={22} color={colors.primary[600]} />
          </View>
          <View>
            <Text style={styles.widgetValue}>{stats.total}</Text>
            <Text style={styles.widgetLabel}>{t('admin.pickupPoints.locationsCount')}</Text>
          </View>
        </View>

        <View style={styles.widget}>
          <View style={[styles.widgetIcon, { backgroundColor: colors.success[50] }]}>
            <Icon name="check-circle-outline" size={22} color={colors.success[600]} />
          </View>
          <View>
            <Text style={styles.widgetValue}>{stats.active}</Text>
            <Text style={styles.widgetLabel}>{t('admin.pickupPoints.active')}</Text>
          </View>
        </View>
      </View>
    </View>
  ), [insets.top, searchQuery, stats.total, stats.active]);

  if (error) {
    return (
      <View style={styles.screenBackground}>
        <ErrorMessage
          message={t('admin.pickupPoints.failedToLoad')}
          error={error}
          onRetry={async () => { await refetch(); }}
          retryWithBackoff={true}
        />
      </View>
    );
  }

  return (
    <View style={styles.screenBackground}>


      <FlatList
        data={filteredPickupPoints}
        keyExtractor={keyExtractor}
        renderItem={renderPickupPointItem}
        ListHeaderComponent={HeaderComponent}
        contentContainerStyle={{
          paddingBottom: 120, // Increased for better scrolling
        }}
        showsVerticalScrollIndicator={false}
        numColumns={isTabletDevice ? 2 : 1}
        key={isTabletDevice ? 'grid' : 'list'}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ paddingHorizontal: padding.horizontal, marginTop: 20 }}>
              <SkeletonCard type="order" count={3} />
            </View>
          ) : (
            <EmptyState
              icon="map-marker-off"
              title={t('admin.pickupPoints.noPickupPoints')}
              message={t('admin.pickupPoints.addFirstLocation')}
              actionLabel={t('admin.pickupPoints.addPickupPoint')}
              onAction={handleAddPickupPoint}
            />
          )
        }
      />

      <RemoveItemModal
        visible={deleteModalVisible}
        onClose={() => {
          setDeleteModalVisible(false);
          setPickupPointToDelete(null);
        }}
        onConfirm={confirmDelete}
        title={t('admin.pickupPoints.deletePickupPoint')}
        message={`${t('admin.products.deleteConfirm')} "${pickupPointToDelete?.name}"?`}
      />

      <SuccessCelebration
        visible={showSuccessModal}
        message={t('admin.pickupPoints.deletedSuccess')}
        onComplete={() => setShowSuccessModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screenBackground: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },

  // Header
  headerContainer: {
    marginBottom: 16,
  },
  headerBackground: {
    paddingHorizontal: 20,
    paddingBottom: 60, // Increased extra padding for overlap
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
    fontWeight: '700',
    color: colors.white,
    letterSpacing: -0.5,
  },
  headerAddBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
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
    fontWeight: '700',
    color: colors.neutral[900],
  },
  widgetLabel: {
    fontSize: 12,
    color: colors.neutral[500],
    fontWeight: '500',
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
    borderWidth: 0, // Removed border
    marginTop: 4, // Slight separation
  },
  cardInactive: {
    opacity: 0.85,
    backgroundColor: '#F9FAFB',
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
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  countryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  countryText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 4,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
    flexShrink: 1,
    minWidth: 80,
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  pickupPointName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
  },

  // Card Content
  cardContent: {
    backgroundColor: colors.neutral[50],
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: colors.neutral[700],
    flexShrink: 1,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  statItem: {
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.neutral[200],
    marginHorizontal: 12,
  },
  statLabel: {
    fontSize: 11,
    color: colors.neutral[400],
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.navy[700],
  },

  // Actions
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.neutral[50], // Slightly darker bg for button
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.navy[600],
  },
  deleteText: {
    color: colors.error[600],
  },
});

export default AdminPickupPointsScreen;
