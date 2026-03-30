import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, Platform, Dimensions, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { RootStackParamList, Product, ProductCategory } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { productService } from '../../services/productService';
import {
  AppHeader,
  Button,
  EmptyState,
  ErrorMessage,
  SearchBar,
  FilterBar,
  AnimatedView,
  SkeletonCard,
  RemoveItemModal,
  useToast,
} from '../../components';
import { getFilteredProducts } from '../../utils/productUtils';
import { formatDate, formatCurrency } from '../../utils/regionalFormatting';
import { debounce } from '../../utils/debounce';
import { COUNTRIES } from '../../constants';
import { colors } from '../../theme';
import { mediumHaptic, successHaptic } from '../../utils/hapticFeedback';
import {
  isSmallDevice,
  isTablet,
  isLandscape,
  getResponsivePadding,
} from '../../utils/responsive';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';

type AdminProductsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AdminProducts'>;

const AdminProductsScreen = () => {
  const navigation = useNavigation<AdminProductsScreenNavigationProp>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const country = (user?.country_preference || COUNTRIES.GERMANY);

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

  const bottomTabBarHeight = Platform.OS === 'ios' ? 85 : 60;

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [recentlyToggledIds, setRecentlyToggledIds] = useState<Set<string>>(new Set());
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const debouncedSearch = useMemo(
    () =>
      debounce((query: string) => {
        setDebouncedSearchQuery(query);
      }, 300),
    []
  );

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    debouncedSearch(text);
  };

  const { data: products = [], isLoading, error } = useQuery<Product[], Error>({
    queryKey: ['products', 'all'],
    queryFn: () => productService.getProducts(),
  });

  if (error) {
    return (
      <View style={styles.screenBackground}>
        <ErrorMessage
          message={t('admin.products.failedToLoad')}
          error={error}
          onRetry={async () => { await queryClient.refetchQueries({ queryKey: ['products', 'all'] }); }}

          retryWithBackoff={true}
        />
      </View>
    );
  }

  const deleteMutation = useMutation({

    mutationFn: (productId: string) => productService.deleteProduct(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      successHaptic();
    },
    onError: (error: any) => {
      Alert.alert(t('common.error'), error.message || t('admin.products.failedToDelete'));
    },
  });

  const toggleRegionalActiveMutation = useMutation({
    mutationFn: ({ productId, country, active }: { productId: string; country: 'germany' | 'denmark'; active: boolean }) =>
      productService.toggleRegionalProductActive(productId, country, active),
    onMutate: async ({ productId, country, active }) => {
      console.log(`[RegionalStatusToggle] Starting mutation for ${productId} (${country}) to ${active}`);
      await queryClient.cancelQueries({ queryKey: ['products'] });
      const previousProducts = queryClient.getQueryData<Product[]>(['products', 'all']);

      if (previousProducts) {
        queryClient.setQueryData<Product[]>(['products', 'all'], (old) =>
          old?.map((p) => (p.id === productId ? {
            ...p,
            [country === 'germany' ? 'active_germany' : 'active_denmark']: active
          } : p))
        );
      }

      setRecentlyToggledIds(prev => new Set(prev).add(productId));
      return { previousProducts };
    },
    onSuccess: (_, variables) => {
      console.log(`[RegionalStatusToggle] ✅ Success for ${variables.productId} (${variables.country})`);
      successHaptic();
      showToast({
        message: variables.country === 'germany' ? t('admin.products.germanyStatusUpdated') : t('admin.products.denmarkStatusUpdated'),
        type: 'success'
      });
    },
    onError: (error: any, variables, context) => {
      console.error(`[RegionalStatusToggle] ❌ Error for ${variables.productId}:`, error);
      if (context?.previousProducts) {
        queryClient.setQueryData(['products', 'all'], context.previousProducts);
      }
      Alert.alert(t('common.error'), error.message || t('admin.products.failedToUpdate'));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ productId, active }: { productId: string; active: boolean }) =>
      productService.toggleProductActive(productId, active),
    onMutate: async ({ productId, active }) => {
      console.log(`[StatusToggle] Starting mutation for ${productId} to ${active}`);
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['products'] });

      // Snapshot previous value
      const previousProducts = queryClient.getQueryData<Product[]>(['products', 'all']);

      // Optimistically update
      if (previousProducts) {
        queryClient.setQueryData<Product[]>(['products', 'all'], (old) =>
          old?.map((p) => (p.id === productId ? { ...p, active } : p))
        );
        console.log(`[StatusToggle] Optimistic update applied for ${productId}`);
      }

      // Add to sticky list so it doesn't disappear from current view
      setRecentlyToggledIds(prev => new Set(prev).add(productId));

      return { previousProducts };
    },
    onSuccess: (_, variables) => {
      console.log(`[StatusToggle] ✅ Success for ${variables.productId}`);
      successHaptic();
      showToast({
        message: variables.active
          ? t('admin.products.statusActivated')
          : t('admin.products.statusDeactivated'),
        type: 'success'
      });
    },
    onError: (error: any, variables, context) => {
      console.error(`[StatusToggle] ❌ Error for ${variables.productId}:`, error);
      // Rollback on error
      if (context?.previousProducts) {
        queryClient.setQueryData(['products', 'all'], context.previousProducts);
        console.log(`[StatusToggle] Rollback applied for ${variables.productId}`);
      }
      Alert.alert(t('common.error'), error.message || t('admin.products.failedToUpdate'));
    },
    onSettled: (data, error, variables) => {
      console.log(`[StatusToggle] Mutation settled for ${variables.productId}`);
      // Sync with server
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const filteredProducts = useMemo(() => {
    let filtered = getFilteredProducts(products, {
      category: selectedCategory,
      searchQuery: debouncedSearchQuery,
      sortBy: 'name',
      country,
    });

    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => {
        // Sticky logic: If an item was toggled in this view, keep it visible regardless of filter
        if (recentlyToggledIds.has(p.id)) return true;
        return p.active === (statusFilter === 'active');
      });
    }

    return filtered;
  }, [products, selectedCategory, debouncedSearchQuery, country, statusFilter, recentlyToggledIds]);

  const handleAddProduct = () => navigation.navigate('AddProduct');

  const handleEditProduct = useCallback((productId: string) => {
    navigation.navigate('EditProduct', { productId });
  }, [navigation]);

  const handleDeleteProduct = useCallback((product: Product) => {
    setProductToDelete(product);
    setDeleteModalVisible(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (productToDelete) {
      deleteMutation.mutate(productToDelete.id);
      setDeleteModalVisible(false);
      setProductToDelete(null);
    }
  }, [deleteMutation, productToDelete]);

  const handleToggleRegionalActive = useCallback((product: Product, country: 'germany' | 'denmark') => {
    mediumHaptic();
    const currentStatus = country === 'germany' ? product.active_germany : product.active_denmark;
    toggleRegionalActiveMutation.mutate({
      productId: product.id,
      country,
      active: !currentStatus,
    });
  }, [toggleRegionalActiveMutation]);

  const handleToggleActive = useCallback((product: Product) => {
    mediumHaptic();
    toggleActiveMutation.mutate({
      productId: product.id,
      active: !product.active,
    });
  }, [toggleActiveMutation]);

  // --- NEW: Professional Card Design ---
  const renderProductItem = useCallback(({ item, index }: { item: Product; index: number }) => (
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
        <View style={[styles.statusStrip, { backgroundColor: item.active ? colors.success[500] : colors.error[500] }]} />

        <View style={styles.cardInner}>
          <View style={styles.cardHeader}>
            <View style={styles.headerTopRow}>
              <Text style={styles.categoryLabel}>{t('products.' + item.category)}</Text>

              {/* Status Toggle Switch Look-alike */}
              <TouchableOpacity
                onPress={() => handleToggleActive(item)}
                disabled={toggleActiveMutation.isPending && toggleActiveMutation.variables?.productId === item.id}
                style={[
                  styles.statusToggle,
                  { backgroundColor: item.active ? colors.success[100] : colors.error[100] },
                  (toggleActiveMutation.isPending && toggleActiveMutation.variables?.productId === item.id) && { opacity: 0.6 }
                ]}
              >
                <Text style={[styles.statusText, { color: item.active ? colors.success[700] : colors.error[700] }]}>
                  {item.active ? t('admin.products.active') : t('admin.products.inactive')}
                </Text>
                <View style={[styles.statusDot, { backgroundColor: item.active ? colors.success[500] : colors.error[500] }]} />
              </TouchableOpacity>
            </View>

            <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
          </View>

          <View style={styles.multiRegionContainer}>
            {/* Germany Section */}
            <View style={styles.regionRow}>
              <View style={styles.regionLabelGroup}>
                <Text style={styles.regionFlag}>🇩🇪</Text>
                <Text style={styles.regionCode}>{t('admin.products.geShort')}</Text>
              </View>
              <View style={styles.regionDataGroup}>
                <View style={styles.dataPoint}>
                  <Text style={styles.dataLabel}>{t('products.price')}</Text>
                  <Text style={styles.dataValue}>{formatCurrency(item.price_germany, COUNTRIES.GERMANY)}</Text>
                </View>
                <View style={styles.dataDivider} />
                <View style={[styles.dataPoint, { flex: 1.5 }]}>
                  <Text style={styles.dataLabel}>{t('admin.products.inventory')}</Text>
                  <Text style={[styles.dataValue, item.stock_germany < 10 && { color: colors.error[600] }]}>
                    {item.sell_type === 'loose'
                      ? (item.stock_germany || 0).toFixed(item.stock_germany % 1 === 0 ? 0 : 2)
                      : (item.stock_germany || 0)}
                    <Text style={styles.dataUnit}> {item.sell_type === 'loose' ? t('common.kg') : t('common.units')}</Text>
                  </Text>
                </View>

                {/* Independent Toggle for Germany */}
                <TouchableOpacity
                  onPress={() => handleToggleRegionalActive(item, 'germany')}
                  disabled={toggleRegionalActiveMutation.isPending && toggleRegionalActiveMutation.variables?.productId === item.id}
                  style={[
                    styles.miniStatusToggle,
                    { backgroundColor: item.active_germany ? colors.success[500] : colors.neutral[300] }
                  ]}
                >
                  <Icon name={item.active_germany ? "check" : "close"} size={12} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.regionSeparator} />

            {/* Denmark Section */}
            <View style={styles.regionRow}>
              <View style={styles.regionLabelGroup}>
                <Text style={styles.regionFlag}>🇩🇰</Text>
                <Text style={styles.regionCode}>{t('admin.products.dkShort')}</Text>
              </View>
              <View style={styles.regionDataGroup}>
                <View style={styles.dataPoint}>
                  <Text style={styles.dataLabel}>{t('products.price')}</Text>
                  <Text style={styles.dataValue}>{formatCurrency(item.price_denmark, COUNTRIES.DENMARK)}</Text>
                </View>
                <View style={styles.dataDivider} />
                <View style={[styles.dataPoint, { flex: 1.5 }]}>
                  <Text style={styles.dataLabel}>{t('admin.products.inventory')}</Text>
                  <Text style={[styles.dataValue, item.stock_denmark < 10 && { color: colors.error[600] }]}>
                    {item.sell_type === 'loose'
                      ? (item.stock_denmark || 0).toFixed(item.stock_denmark % 1 === 0 ? 0 : 2)
                      : (item.stock_denmark || 0)}
                    <Text style={styles.dataUnit}> {item.sell_type === 'loose' ? t('common.kg') : t('common.units')}</Text>
                  </Text>
                </View>

                {/* Independent Toggle for Denmark */}
                <TouchableOpacity
                  onPress={() => handleToggleRegionalActive(item, 'denmark')}
                  disabled={toggleRegionalActiveMutation.isPending && toggleRegionalActiveMutation.variables?.productId === item.id}
                  style={[
                    styles.miniStatusToggle,
                    { backgroundColor: item.active_denmark ? colors.success[500] : colors.neutral[300] }
                  ]}
                >
                  <Icon name={item.active_denmark ? "check" : "close"} size={12} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEditProduct(item.id)}
            >
              <Icon name="pencil" size={16} color={colors.navy[600]} />
              <Text style={styles.actionText}>{t('admin.products.edit')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonDelete]}
              onPress={() => handleDeleteProduct(item)}
            >
              <Icon name="trash-can-outline" size={16} color={colors.error[600]} />
              <Text style={[styles.actionText, { color: colors.error[600] }]}>{t('admin.products.remove')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </AnimatedView>
  ), [handleEditProduct, handleDeleteProduct, handleToggleActive, country, isTabletDevice, padding.horizontal]);

  const keyExtractor = useCallback((item: Product) => item.id, []);

  // --- Header with Navy Theme & Widgets ---
  const HeaderComponent = useMemo(() => (
    <View style={styles.headerContainer}>
      <ExpoLinearGradient
        colors={[colors.navy[900], colors.navy[700]]}
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
            {t('admin.products.inventory')}
          </Text>
          <TouchableOpacity onPress={handleAddProduct} style={styles.headerAddBtn}>
            <Icon name="plus" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>

        <SearchBar
          value={searchQuery}
          onChangeText={handleSearchChange}
          onClear={() => {
            setSearchQuery('');
            setDebouncedSearchQuery('');
          }}
          placeholder={t('products.searchPlaceholder')}
          showSuggestions={false}
          style={styles.searchContainer}
        />
      </ExpoLinearGradient>

      {/* Overlapping Stats Widgets */}
      <View style={styles.widgetsContainer}>
        <View style={styles.widget}>
          <View style={[styles.widgetIcon, { backgroundColor: colors.info[50] }]}>
            <Icon name="cube-outline" size={22} color={colors.info[600]} />
          </View>
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.widgetValue} numberOfLines={1} adjustsFontSizeToFit={true} ellipsizeMode="tail">{products.length}</Text>
            <Text style={styles.widgetLabel} numberOfLines={1} adjustsFontSizeToFit={true} ellipsizeMode="tail">{t('admin.products.totalItems')}</Text>
          </View>
        </View>

        <View style={styles.widget}>
          <View style={[styles.widgetIcon, { backgroundColor: colors.success[50] }]}>
            <Icon name="check-circle-outline" size={22} color={colors.success[600]} />
          </View>
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.widgetValue} numberOfLines={1} adjustsFontSizeToFit={true} ellipsizeMode="tail">{products.filter(p => p.active).length}</Text>
            <Text style={styles.widgetLabel} numberOfLines={1} adjustsFontSizeToFit={true} ellipsizeMode="tail">{t('admin.products.active')}</Text>
          </View>
        </View>
      </View>

      {/* Status Segmented Control */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentButton, statusFilter === 'active' && styles.segmentButtonActive]}
          onPress={() => {
            setStatusFilter('active');
            setRecentlyToggledIds(new Set()); // Reset sticky items when switching tabs
          }}
        >
          <Icon name="check-circle" size={18} color={statusFilter === 'active' ? colors.white : colors.success[600]} />
          <Text style={[styles.segmentText, statusFilter === 'active' && styles.segmentTextActive]}>
            {t('admin.products.active')}
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{products.filter(p => p.active).length}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentButton, statusFilter === 'inactive' && styles.segmentButtonActive]}
          onPress={() => {
            setStatusFilter('inactive');
            setRecentlyToggledIds(new Set()); // Reset sticky items when switching tabs
          }}
        >
          <Icon name="close-circle" size={18} color={statusFilter === 'inactive' ? colors.white : colors.error[600]} />
          <Text style={[styles.segmentText, statusFilter === 'inactive' && styles.segmentTextActive]}>
            {t('admin.products.inactive')}
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{products.filter(p => !p.active).length}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentButton, statusFilter === 'all' && styles.segmentButtonActive]}
          onPress={() => {
            setStatusFilter('all');
            setRecentlyToggledIds(new Set()); // Reset sticky items when switching tabs
          }}
        >
          <Icon name="layers" size={18} color={statusFilter === 'all' ? colors.white : colors.neutral[600]} />
          <Text style={[styles.segmentText, statusFilter === 'all' && styles.segmentTextActive]}>
            {t('common.all')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: padding.horizontal, marginTop: 12 }}>
        <FilterBar
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          sortBy="name"
          onSortChange={() => { }}
          resultCount={filteredProducts.length}
        />
      </View>
    </View >
  ), [insets.top, searchQuery, handleSearchChange, products, padding.horizontal, selectedCategory]);

  if (error) {
    return (
      <View style={styles.screenBackground}>
        <ErrorMessage
          message={t('admin.products.failedToLoad')}
          error={error}
          onRetry={async () => { await queryClient.refetchQueries({ queryKey: ['products', 'all'] }); }}
          retryWithBackoff={true}
        />
      </View>
    );
  }

  return (
    <View style={styles.screenBackground}>


      <FlatList
        data={filteredProducts}
        extraData={[toggleActiveMutation.isPending, toggleActiveMutation.variables]}
        keyExtractor={keyExtractor}
        ListHeaderComponent={HeaderComponent}
        renderItem={renderProductItem}
        contentContainerStyle={{ paddingBottom: bottomTabBarHeight + 60 }}
        showsVerticalScrollIndicator={false}
        numColumns={isTabletDevice ? 2 : 1}
        key={isTabletDevice ? 'grid' : 'list'}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={Platform.OS === 'android'}
        ListEmptyComponent={
          !isLoading ? (
            <View style={{ marginTop: 40 }}>
              <EmptyState
                icon="package-variant"
                title={t('admin.products.noProductsFound')}
                message={t('admin.products.tryAdjustingFilters')}
                actionLabel={t('admin.productForm.addNewProduct')}
                onAction={handleAddProduct}
              />
            </View>
          ) : (
            <View style={{ padding: padding.horizontal, marginTop: 20 }}>
              <SkeletonCard type="product" count={3} />
            </View>
          )
        }
      />

      <RemoveItemModal
        visible={deleteModalVisible}
        onClose={() => {
          setDeleteModalVisible(false);
          setProductToDelete(null);
        }}
        onConfirm={confirmDelete}
        title={t('admin.products.deleteProduct')}
        message={
          productToDelete?.name
            ? t('admin.products.deleteConfirmMessage', { name: productToDelete.name })
            : t('admin.products.deleteConfirmBasic')
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screenBackground: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Light grey background for professional feel
  },

  // Header
  headerContainer: {
    marginBottom: 16,
  },
  headerBackground: {
    paddingHorizontal: 20,
    paddingBottom: 40, // Extra padding for search overlap
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 40, // Increased from 36
    fontWeight: '700',
    color: colors.white,
    letterSpacing: -0.5,
    flexShrink: 1,
    marginRight: 12,
    paddingVertical: 2,
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
    minHeight: 50,
  },
  searchInput: {
    color: colors.white,
    lineHeight: 24,
    paddingVertical: 10,
  },

  // Widgets
  widgetsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: -30,
    gap: 12,
    marginBottom: 16,
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
    shadowOpacity: 0.05,
    shadowRadius: 8,
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
    lineHeight: 28, // Increased from 26
    fontWeight: '700',
    color: colors.neutral[900],
    paddingTop: 2,
  },
  widgetLabel: {
    fontSize: 12,
    lineHeight: 20, // Increased from 18
    color: colors.neutral[500],
    fontWeight: '500',
    flexShrink: 1,
  },

  // Card
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  cardInactive: {
    opacity: 0.7,
    backgroundColor: colors.neutral[50],
  },
  statusStrip: {
    width: 4,
    height: '100%',
  },
  cardInner: {
    flex: 1,
    padding: 16,
  },
  cardHeader: {
    marginBottom: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryLabel: {
    fontSize: 11,
    lineHeight: 18, // Increased from 16
    fontWeight: '600',
    color: colors.primary[600],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    backgroundColor: colors.primary[50],
    paddingHorizontal: 8, // Increased
    paddingVertical: 6, // Increased
    borderRadius: 4,
  },
  statusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 6,
    paddingVertical: 8, // Increased
    borderRadius: 12,
    gap: 6,
    flexShrink: 1,
    minWidth: 80,
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 11,
    lineHeight: 18, // Increased from 16
    fontWeight: '600',
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  productName: {
    fontSize: 16,
    lineHeight: 26, // Increased from 24
    fontWeight: '700',
    color: colors.neutral[800],
    paddingVertical: 2,
  },

  // Multi-Region Info
  multiRegionContainer: {
    backgroundColor: colors.neutral[50],
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  regionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  regionSeparator: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: 8,
    marginHorizontal: -4,
  },
  regionLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 60,
    gap: 6,
  },
  regionFlag: {
    fontSize: 14,
  },
  regionCode: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.neutral[600],
  },
  regionDataGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dataPoint: {
    flex: 1,
  },
  dataDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: 12,
  },
  dataLabel: {
    fontSize: 10,
    color: colors.neutral[400],
    textTransform: 'uppercase',
    fontWeight: '500',
    marginBottom: 2,
  },
  dataValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy[700],
  },
  dataUnit: {
    fontSize: 11,
    color: colors.neutral[500],
    fontWeight: '400',
  },

  // Actions
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10, // Increased from 8
    paddingHorizontal: 14, // Increased
    borderRadius: 6,
    backgroundColor: colors.neutral[100],
  },
  actionButtonDelete: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  actionText: {
    fontSize: 13,
    lineHeight: 22,
    fontWeight: '500',
    color: colors.navy[600],
  },
  miniStatusToggle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Segmented Control
  segmentContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 8,
    gap: 8,
    flexWrap: 'wrap',
  },
  segmentButton: {
    flex: 1,
    minWidth: '30%', // Allow 3 items to fit or wrap
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    gap: 4,
  },
  segmentButtonActive: {
    backgroundColor: colors.navy[800],
    borderColor: colors.navy[800],
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[600],
  },
  segmentTextActive: {
    color: colors.white,
  },
  badge: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.neutral[500],
  },
});

export default AdminProductsScreen;
