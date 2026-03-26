/**
 * Modern Home Screen with Hero Section, Featured Products, and Smooth Scrolling
 * Uses NativeWind for styling and Phase 2 components
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, RefreshControl, Dimensions, Image, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CommonActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useProducts } from '../../hooks/useProducts';
import { useCartStore } from '../../store/cartStore';
import { useLoading } from '../../contexts/LoadingContext';
import { ProductCard, SearchBar, FilterBar, EmptyState, LoadingScreen, ErrorMessage, Button, AnimatedView, SkeletonCard, ContentFadeIn, SkeletonLoader, PromotionalBanner, CategoryIconRow, RecentlyViewedProducts, TrendingProducts, ProductRecommendations, useToast, AuthRequiredModal, HomeHeader } from '../../components';
import { getFilteredProducts, isProductWeightBased } from '../../utils/productUtils';
import { debounce } from '../../utils/debounce';
import { requireAuth } from '../../utils/requireAuth';
import { COUNTRIES, PRODUCT_CATEGORIES } from '../../constants';
import { ASSETS } from '../../constants/assets';
import type { ProductCategory } from '../../types';
import type { Country } from '../../constants';
import { colors } from '../../theme';
import { successHaptic, errorHaptic } from '../../utils/hapticFeedback';
import {
  isSmallDevice,
  isTablet,
  getColumnCount,
  getResponsivePadding,
} from '../../utils/responsive';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'> | BottomTabNavigationProp<any>;

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useAuthStore();
  const { addItem, selectedCountry, countrySelected, setSelectedCountry, loadCountry } = useCartStore();
  const { showToast } = useToast();
  const { i18n } = useTranslation();
  const loading = useLoading();

  // Language switcher handler - stable ref so HeaderComponent useMemo doesn't re-run
  const toggleLanguage = useCallback(() => {
    const newLang = i18n.language === 'en' ? 'ta' : 'en';
    i18n.changeLanguage(newLang);
  }, [i18n]);

  // Load country on mount
  useEffect(() => {
    loadCountry();
  }, [loadCountry]);

  // Use user's country preference if authenticated, otherwise use selected country
  const country = (isAuthenticated && user?.country_preference && (user.country_preference === COUNTRIES.GERMANY || user.country_preference === COUNTRIES.DENMARK))
    ? user.country_preference as Country
    : (selectedCountry || COUNTRIES.GERMANY) as Country;

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price_asc' | 'price_desc'>('name');
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Responsive dimensions
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const isSmall = isSmallDevice();
  const isTabletDevice = isTablet();
  const numColumns = useMemo(() => {
    if (isTabletDevice) return 3;
    return 2;
  }, [isTabletDevice]);
  const padding = getResponsivePadding();

  // Update dimensions on orientation change
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenData(window);
    });
    return () => subscription?.remove();
  }, []);

  // Debounce search query
  const debouncedSearch = useMemo(
    () =>
      debounce((query: string) => {
        setDebouncedSearchQuery(query);
      }, 300),
    []
  );

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    debouncedSearch(text);
  }, [debouncedSearch]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
  }, []);

  // Fetch products
  const { data: products = [], isLoading, error, refetch, isRefetching } = useProducts({
    active: true,
  });

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    return getFilteredProducts(products, {
      searchQuery: debouncedSearchQuery,
      category: selectedCategory === 'all' ? undefined : selectedCategory,
      sortBy,
      country,
    });
  }, [products, debouncedSearchQuery, selectedCategory, sortBy, country]);

  // Featured products (first 3)
  const featuredProducts = useMemo(() => {
    return filteredProducts.slice(0, 3);
  }, [filteredProducts]);

  const handleProductPress = React.useCallback((productId: string) => {
    (navigation as any).navigate('ProductDetails', { productId });
  }, [navigation]);

  // ✅ OPTIMIZED: Add to Cart with Immediate Spinner
  const handleAddToCart = React.useCallback((product: any, quantity?: number) => {
    if (!countrySelected && !selectedCountry) {
      Alert.alert(
        t('country.selectCountry'),
        t('country.selectCountryFirst'),
      );
      return;
    }

    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    const isWeightBased = isProductWeightBased(product);
    // Use provided quantity if available, otherwise default to 100g (loose) or 1 unit (pack)
    const quantityToAdd = quantity || (isWeightBased ? 100 : 1);

    // 1. Loading spinner-ஐ உடனடியாக show செய்யவும்
    loading.showLoading();

    setTimeout(async () => {
      try {
        await addItem(product, quantityToAdd, country);
        successHaptic();
        showToast({ message: t('products.addedToCart'), type: 'success', duration: 2000 });
      } catch (error: any) {
        errorHaptic();
        showToast({ message: error.message || t('errors.somethingWentWrong'), type: 'error', duration: 3000 });
      } finally {
        loading.hideLoading();
      }
    }, 50);
  }, [countrySelected, selectedCountry, isAuthenticated, country, addItem, t, showToast, loading]);

  const handleSearchPress = useCallback(() => {
    if (searchQuery.trim()) {
      setDebouncedSearchQuery(searchQuery);
    }
  }, [searchQuery]);

  // Removed handleCountrySelect as the dedicated screen is now used

  // Stable style refs to avoid creating new objects each render
  const gridCardStyle = useMemo((): any => (
    numColumns > 1
      ? { flex: 1 / numColumns, margin: 8, maxWidth: `${100 / numColumns}%` }
      : { flex: 1, marginBottom: 16 }
  ), [numColumns]);

  // Memoized render item — uses stable style ref and avoids inline arrow closures
  const renderProductItem = React.useCallback(({ item, index }: { item: any; index: number }) => {
    return (
      <View style={gridCardStyle}>
        <ProductCard
          product={item}
          country={country}
          onPress={() => handleProductPress(item.id)}
          onAddToCart={(qty: number) => handleAddToCart(item, qty)}
          index={index}
        />
      </View>
    );
  }, [country, handleProductPress, handleAddToCart, gridCardStyle]);

  // Memoized key extractor
  const keyExtractor = React.useCallback((item: any) => item.id, []);

  // Stable helpers for featured FlatList
  const featuredKeyExtractor = React.useCallback((item: any) => `featured-${item.id}`, []);
  const featuredContentStyle = useMemo(() => ({ paddingLeft: 24, paddingRight: 24 }), []);
  const renderFeaturedItem = React.useCallback(({ item, index }: { item: any; index: number }) => (
    <AnimatedView
      animation="slide"
      delay={350 + index * 50}
      enterFrom="right"
      style={{ marginRight: 12, width: 165 }}
    >
      <ProductCard
        product={item}
        country={country}
        onPress={() => handleProductPress(item.id)}
        onAddToCart={(qty: number) => handleAddToCart(item, qty)}
        index={index}
      />
    </AnimatedView>
  ), [country, handleProductPress, handleAddToCart]);

  // Memoized Header to prevent remounting search bar on every type
  const HeaderComponent = useMemo(() => (
    <>

      <HomeHeader
        isAuthenticated={isAuthenticated}
        user={user}
        selectedCountry={selectedCountry}
        toggleLanguage={toggleLanguage}
        language={i18n.language}
      />

      {/* Search and Filters - OVERLAPPING STYLE */}
      <AnimatedView
        animation="slide"
        delay={100}
        enterFrom="bottom"
        style={{
          paddingHorizontal: 16,
          marginTop: isAuthenticated ? -28 : 12,
          marginBottom: 16,
          zIndex: 10,
        }}
      >
        <SearchBar
          value={searchQuery}
          onChangeText={handleSearchChange}
          onClear={handleClearSearch}
          placeholder={t('products.searchPlaceholder')}
          style={{
            marginBottom: 12,
          }}
          onSearchPress={handleSearchPress}
        />
        <FilterBar
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
      </AnimatedView>

      {/* Categories */}
      {!searchQuery && selectedCategory === 'all' && (
        <AnimatedView animation="fade" delay={200} style={{ marginBottom: 20 }}>
          <CategoryIconRow
            categories={[
              { id: 'all', name: t('common.all'), icon: 'view-grid', category: 'all' },
              { id: 'fresh', name: t('products.fresh'), icon: 'fish', category: 'fresh' },
              { id: 'frozen', name: t('products.frozen'), icon: 'snowflake', category: 'frozen' },
              { id: 'delivery', name: t('common.free'), icon: 'truck-delivery' },
              { id: 'special', name: t('common.offers'), icon: 'tag', badge: 'NEW' },
            ]}
            onCategoryPress={(category) => {
              if (category.category) setSelectedCategory(category.category as ProductCategory | 'all');
            }}
            selectedCategory={selectedCategory}
          />
        </AnimatedView>
      )}


      {/* Featured Products */}
      {featuredProducts.length > 0 && !searchQuery && selectedCategory === 'all' && (
        <AnimatedView animation="fade" delay={300} style={{ marginBottom: 32 }}>
          <View className="flex-row items-center justify-between mb-4 px-6">
            <Text className="text-xl font-bold text-neutral-900 tracking-tight">{t('home.featuredProducts')}</Text>
            <TouchableOpacity onPress={() => setSelectedCategory('all')}>
              <Text className="text-primary-500 text-sm font-semibold">{t('common.seeAll')}</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            horizontal
            data={featuredProducts}
            keyExtractor={featuredKeyExtractor}
            renderItem={renderFeaturedItem}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={featuredContentStyle}
          />
        </AnimatedView>
      )}

      {/* Recently Viewed */}
      {!searchQuery && selectedCategory === 'all' && isAuthenticated && (
        <AnimatedView animation="fade" delay={400} style={{ marginBottom: 32 }}>
          <View className="px-6 mb-4">
            <Text className="text-xl font-bold text-neutral-900 tracking-tight">{t('home.recentlyViewed')}</Text>
          </View>
          <RecentlyViewedProducts
            products={products}
            country={country}
            onProductPress={handleProductPress}
            limit={10}
            hideHeader={true}
          />
        </AnimatedView>
      )}

      {/* Recommended */}
      {!searchQuery && selectedCategory === 'all' && isAuthenticated && (
        <AnimatedView animation="fade" delay={500} style={{ marginBottom: 32 }}>
          <View className="px-6 mb-4">
            <Text className="text-xl font-bold text-neutral-900 tracking-tight">{t('home.recommendedForYou')}</Text>
          </View>
          <ProductRecommendations
            userId={user?.id}
            country={country}
            onProductPress={handleProductPress}
            onAddToCart={handleAddToCart}
            limit={5}
            hideHeader={true}
          />
        </AnimatedView>
      )}

      {/* Trending */}
      {!searchQuery && selectedCategory === 'all' && (
        <AnimatedView animation="fade" delay={600} style={{ marginBottom: 32 }}>
          <View className="px-6 mb-4">
            <Text className="text-xl font-bold text-neutral-900 tracking-tight">{t('home.trendingNow')}</Text>
          </View>
          <TrendingProducts
            products={products}
            country={country}
            onProductPress={handleProductPress}
            limit={10}
            hideHeader={true}
          />
        </AnimatedView>
      )}

      {/* All Products Header */}
      <View className="px-6 pt-2 pb-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-xl font-bold text-neutral-900 tracking-tight">
              {searchQuery ? t('home.searchResults') : selectedCategory !== 'all' ? `${t(`products.${selectedCategory}`)} ${t('home.collection')}` : t('home.ourCollection')}
            </Text>
            <Text className="text-xs text-neutral-400 font-medium mt-1 uppercase tracking-wider">
              {t('home.itemsAvailable', { count: filteredProducts.length })}
            </Text>
          </View>
        </View>
      </View>
    </>
  ), [
    countrySelected,
    isAuthenticated,
    selectedCountry,
    t,
    searchQuery,
    selectedCategory,
    handleSearchChange,
    handleClearSearch,
    handleSearchPress,
    sortBy,
    featuredProducts,
    country,
    handleProductPress,
    handleAddToCart,
    products,
    user,
    filteredProducts.length,
    i18n.language,
    toggleLanguage
  ]);

  // Show loading skeleton only on initial load
  if (isLoading && products.length === 0) {
    if (isAuthenticated && (user?.role?.toLowerCase().trim() === 'admin')) {
      return (
        <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
          <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: 'rgba(58, 181, 209, 0.1)' }}>
            <SkeletonLoader width="100%" height={48} borderRadius={12} className="mb-4" />
            <SkeletonLoader width="60%" height={32} borderRadius={8} />
          </View>
          <View className="px-4 pt-4">
            <SkeletonCard type="product" count={3} />
          </View>
        </View>
      );
    }

    // Guest Users or Customers get the complex LoadingScreen skeleton
    return <LoadingScreen message={t('common.loading')} />;
  }

  // Handle errors gracefully - don't block the whole screen
  // This allows the header and other content to remain visible
  if (error && products.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        {HeaderComponent}
        <View className="flex-1 mt-8">
          <ErrorMessage
            message={t('errors.failedToLoadProducts')}
            error={error}
            onRetry={async () => { await refetch(); }}
            retryWithBackoff={true}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* Auth Required Modal */}
      <AuthRequiredModal
        visible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={() => {
          setShowAuthModal(false);
          (navigation as any).navigate('Login');
        }}
        onRegister={() => {
          setShowAuthModal(false);
          (navigation as any).navigate('Register');
        }}
      />

      {filteredProducts.length === 0 ? (
        <View className="flex-1">
          {HeaderComponent}
          <EmptyState
            icon="store-off"
            title={t('products.noProductsFound')}
            message={t('products.tryAdjusting')}
            suggestions={[
              t('products.clearSearchSuggestion'),
              t('products.differentFilterSuggestion'),
              t('products.checkBackLaterSuggestion'),
            ]}
          />
        </View>
      ) : (
        <FlatList
          key={`products-${numColumns}`}
          data={filteredProducts}
          keyExtractor={keyExtractor}
          numColumns={numColumns}
          renderItem={renderProductItem}
          ListHeaderComponent={HeaderComponent}
          contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: numColumns > 1 ? 0 : 16 }}
          columnWrapperStyle={numColumns > 1 ? { paddingHorizontal: 4 } : undefined}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary[500]} />
          }
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={Platform.OS === 'android'}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          windowSize={10}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
};

export default HomeScreen;
