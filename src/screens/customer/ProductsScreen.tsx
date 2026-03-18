/**
 * Modern Products Screen with Grid/List Toggle, Filter Drawer, and Infinite Scroll
 * Uses NativeWind for styling and Phase 2 components
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Dimensions, TextInput, StyleSheet, StatusBar, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { RootStackParamList } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';

import { useLoading } from '../../contexts/LoadingContext';
import { useProducts } from '../../hooks/useProducts';
import { ProductCard, EmptyState, ErrorMessage, ContentFadeIn, SkeletonLoader, SkeletonCard, useToast, AuthRequiredModal } from '../../components';
import { getFilteredProducts } from '../../utils/productUtils';
import { debounce } from '../../utils/debounce';
import { COUNTRIES } from '../../constants';
import type { ProductCategory } from '../../types';
import type { Country } from '../../constants';
import { colors } from '../../theme';
import {
  isSmallDevice,
  isTablet,
  getResponsivePadding,
} from '../../utils/responsive';

type ProductsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Products'>;

const ProductsScreen = () => {
  const navigation = useNavigation<ProductsScreenNavigationProp>();
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuthStore();
  const { selectedCountry, addItem } = useCartStore();
  const { showToast } = useToast();
  const loading = useLoading();
  const insets = useSafeAreaInsets();
  const { i18n } = useTranslation();

  const [showAuthModal, setShowAuthModal] = useState(false);

  // Animation values - Using RN Animated for stability
  const scrollY = useRef(new Animated.Value(0)).current;
  const HEADER_TITLE_HEIGHT = 40;

  const headerHeight = scrollY.interpolate({
    inputRange: [0, HEADER_TITLE_HEIGHT],
    outputRange: [HEADER_TITLE_HEIGHT, 0],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 20],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_TITLE_HEIGHT],
    outputRange: [0, -10],
    extrapolate: 'clamp',
  });

  // Language switcher handler
  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ta' : 'en';
    i18n.changeLanguage(newLang);
  };

  // Use user's country preference if authenticated, otherwise use selected country from cart store
  const country = (isAuthenticated && user?.country_preference)
    ? user.country_preference
    : (selectedCountry || COUNTRIES.GERMANY) as Country;

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price_asc' | 'price_desc'>('name');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Responsive dimensions
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const isSmall = isSmallDevice();
  const isTabletDevice = isTablet();
  const numColumns = useMemo(() => {
    if (viewMode === 'list') return 1;
    if (isTabletDevice) return 3;
    return 2;
  }, [viewMode, isTabletDevice]);
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

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    debouncedSearch(text);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
  };

  // Fetch products
  const { data: products = [], isLoading, error, refetch, isRefetching } = useProducts({
    active: true,
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
    search: debouncedSearchQuery || undefined,
  });

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    return getFilteredProducts(products, {
      category: selectedCategory,
      searchQuery: debouncedSearchQuery,
      sortBy,
      country,
      hideUnavailable: true,
    });
  }, [products, selectedCategory, debouncedSearchQuery, sortBy, country]);

  const handleProductPress = (productId: string) => {
    navigation.navigate('ProductDetails', { productId });
  };

  const handleAddToCart = React.useCallback((product: any, quantity?: number) => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    const isWeightBased = product.sell_type === 'loose' || product.unit === 'gram' || product.category === 'fresh' || product.category === 'frozen';
    const quantityToAdd = quantity || (isWeightBased ? 100 : 1);

    // 1. Loading spinner-ஐ உடனடியாக show செய்யவும்
    loading.showLoading();

    setTimeout(() => {
      addItem(product, quantityToAdd, country)
        .then(() => {
          showToast({ message: `${product.name} added to cart`, type: 'success', duration: 2000 });
        })
        .catch((error: any) => {
          showToast({ message: error.message || 'Failed to add item to cart', type: 'error', duration: 3000 });
        })
        .finally(() => {
          loading.hideLoading();
        });
    }, 50);
  }, [isAuthenticated, country, addItem, loading, showToast]);

  // Memoized render item for grid - MUST be before any early returns
  const renderGridItem = React.useCallback(({ item, index }: { item: any; index: number }) => (
    <View style={{ flex: 1 / numColumns, margin: 8, maxWidth: `${100 / numColumns}%` }}>
      <ProductCard
        product={item}
        country={country}
        onPress={() => handleProductPress(item.id)}
        onAddToCart={(qty) => handleAddToCart(item, qty)}
        index={index}
      />
    </View>
  ), [country, numColumns, handleProductPress, handleAddToCart]);

  // Memoized key extractor - MUST be before any early returns
  const keyExtractor = React.useCallback((item: typeof filteredProducts[0]) => item.id, []);

  // Memoized header
  const HeaderComponent = useMemo(() => (
    <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
      {/* Results count */}
      <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 8 }}>
        {debouncedSearchQuery
          ? t('products.resultsFor', { query: debouncedSearchQuery })
          : t('products.resultsCount', { count: filteredProducts.length })}
      </Text>

      {/* Category Filter */}
      <View style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Icon name="tag" size={16} color="#6B7280" />
          <Text
            style={{ fontSize: 14, color: '#6B7280', marginLeft: 6, flexShrink: 1 }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {t('products.categoryLabel')}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {['all', 'fresh', 'frozen'].map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setSelectedCategory(cat as ProductCategory | 'all')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: selectedCategory === cat ? colors.primary[500] : 'white',
                borderWidth: 1,
                borderColor: selectedCategory === cat ? colors.primary[500] : colors.neutral[200],
                marginRight: 8,
                shadowColor: selectedCategory === cat ? colors.primary[500] : '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: selectedCategory === cat ? 0.3 : 0.05,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Icon
                name={cat === 'all' ? 'view-grid' : cat === 'fresh' ? 'leaf' : 'snowflake'}
                size={16}
                color={selectedCategory === cat ? 'white' : colors.neutral[500]}
              />
              <Text style={{
                marginLeft: 6,
                fontSize: 14,
                fontWeight: '600',
                color: selectedCategory === cat ? 'white' : colors.neutral[700],
                textTransform: 'capitalize',
              }}>
                {cat === 'all' ? t('common.all') : t(`products.${cat}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Sort Options */}
      <View style={{ marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Icon name="sort" size={16} color="#6B7280" />
          <Text
            style={{ fontSize: 14, color: '#6B7280', marginLeft: 6, flexShrink: 1 }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {t('products.sortLabel')}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[
            { key: 'name', label: 'Name', icon: 'sort-alphabetical-ascending' },
            { key: 'price_asc', label: 'Price ↑', icon: 'sort-ascending' },
            { key: 'price_desc', label: 'Price ↓', icon: 'sort-descending' },
          ].map((sort) => (
            <TouchableOpacity
              key={sort.key}
              onPress={() => setSortBy(sort.key as 'name' | 'price_asc' | 'price_desc')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: sortBy === sort.key ? colors.primary[500] : 'white',
                borderWidth: 1,
                borderColor: sortBy === sort.key ? colors.primary[500] : colors.neutral[200],
                marginRight: 8,
                shadowColor: sortBy === sort.key ? colors.primary[500] : '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: sortBy === sort.key ? 0.3 : 0.05,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Icon
                name={sort.icon as any}
                size={16}
                color={sortBy === sort.key ? 'white' : colors.neutral[500]}
              />
              <Text style={{
                marginLeft: 6,
                fontSize: 14,
                fontWeight: '600',
                color: sortBy === sort.key ? 'white' : colors.neutral[700],
              }}>
                {t(`products.sort${sort.key === 'name' ? 'Name' : sort.key === 'price_asc' ? 'PriceAsc' : 'PriceDesc'}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Products count */}
      <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 8 }}>
        {filteredProducts.length === 1
          ? t('products.productCount', { count: filteredProducts.length })
          : t('products.productCountPlural', { count: filteredProducts.length })} {t('common.found')}
      </Text>
    </View>
  ), [debouncedSearchQuery, filteredProducts.length, selectedCategory, sortBy]);

  // Main return with fixed search bar always present
  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />


      {/* Fixed Search Bar with Collapsible Title */}
      <LinearGradient
        colors={[colors.navy[900], colors.navy[700]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[productStyles.fixedHeader, { paddingTop: insets.top }]}
      >
        {/* Collapsible Title */}
        <Animated.View style={[
          {
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          },
          {
            height: headerHeight,
            opacity: headerOpacity,
            transform: [{ translateY: headerTranslateY }]
          }
        ]}>
          <Text style={{ color: 'white', fontSize: 22, fontWeight: 'bold' }}>Products</Text>
        </Animated.View>

        {/* Search Bar - Always Visible */}
        <View style={productStyles.searchBarContainer}>
          <View style={productStyles.searchInputWrapper}>
            <Icon name="magnify" size={20} color={colors.neutral[400]} />
            <TextInput
              style={productStyles.searchInput}
              placeholder={t('products.searchPlaceholder')}
              placeholderTextColor={colors.neutral[400]}
              value={searchQuery}
              onChangeText={handleSearchChange}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={() => setDebouncedSearchQuery(searchQuery)}
              editable={!isLoading}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={handleClearSearch} style={{ padding: 4 }}>
                <Icon name="close-circle" size={18} color={colors.neutral[400]} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={productStyles.searchButton}
            onPress={() => setDebouncedSearchQuery(searchQuery)}
            disabled={isLoading}
          >
            <Icon name="magnify" size={22} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={toggleLanguage}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 20,
              marginLeft: 8,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.2)',
            }}
            activeOpacity={0.7}
          >
            <Icon name="translate" size={18} color="white" />
            <Text style={{ color: 'white', fontSize: 12, fontWeight: '700', marginLeft: 4 }}>
              {i18n.language === 'en' ? 'TA' : 'EN'}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Content Area */}
      {isLoading ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <SkeletonLoader width="100%" height={48} borderRadius={12} />
          <View style={{ marginTop: 12 }}>
            <SkeletonCard type="product" count={3} />
          </View>
        </View>
      ) : error ? (
        <ErrorMessage
          message={t('products.failedToLoad')}
          error={error}
          onRetry={async () => { await refetch(); }}
          retryWithBackoff={true}
        />
      ) : filteredProducts.length === 0 ? (
        <View style={{ flex: 1 }}>
          {HeaderComponent}
          <EmptyState
            icon="magnify"
            title={searchQuery ? t('products.noProductsFound') : t('products.noProductsAvailable')}
            message={searchQuery ? t('products.tryAdjusting') : t('products.checkBackLaterSuggestion')}
          />
        </View>
      ) : (
        <FlatList
          key={`products-${numColumns}`}
          data={filteredProducts}
          keyExtractor={keyExtractor}
          numColumns={numColumns}
          ListHeaderComponent={HeaderComponent}
          renderItem={renderGridItem}
          contentContainerStyle={{ paddingBottom: 120, paddingTop: 8 }}
          columnWrapperStyle={numColumns > 1 ? { paddingHorizontal: 8 } : undefined}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          initialNumToRender={10}
          windowSize={10}
          // Animated Props
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false } // 'height' property is not supported by native driver for Views, sadly.
          )}
          scrollEventThrottle={16}
        />
      )}
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
    </View>
  );
};

export default ProductsScreen;

// Styles for ProductsScreen
const productStyles = StyleSheet.create({
  fixedHeader: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white', // White input on Navy gradient
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    marginLeft: 8,
    paddingVertical: 0,
  },
  searchButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
});
