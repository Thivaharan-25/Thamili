/**
 * Trending Products Component
 */

import React, { useMemo } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Product } from '../types';
import { getTrendingProducts } from '../utils/productRecommendations';
import ProductCard from './ProductCard';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { COUNTRIES } from '../constants';
import type { Country } from '../constants';

interface TrendingProductsProps {
  products: Product[];
  country: Country;
  onProductPress: (productId: string) => void;
  limit?: number;
  style?: any;
  hideHeader?: boolean;
}

const TrendingProducts: React.FC<TrendingProductsProps> = ({
  products,
  country,
  onProductPress,
  limit = 10,
  style,
  hideHeader = false,
}) => {
  const { t } = useTranslation();
  const { colors: themeColors } = useTheme();

  const trendingProducts = useMemo(() => {
    // Recommendation utility treats unknown countries as germany by default
    const validCountry = (country === 'germany' || country === 'denmark') ? country : 'germany';
    return getTrendingProducts(products, validCountry, limit);
  }, [products, country, limit]);

  if (trendingProducts.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      {!hideHeader && (
        <View style={styles.header}>
          <Icon name="trending-up" size={20} color="#3AB5D1" />
          <Text style={styles.title}>
            {t('home.trendingNow')}
          </Text>
        </View>
      )}
      <FlatList
        data={trendingProducts}
        renderItem={({ item }) => (
          <View style={styles.productCard}>
            <ProductCard
              product={item}
              country={country}
              onPress={() => onProductPress(item.id)}
            />
          </View>
        )}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#1A1A1A',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  productCard: {
    marginRight: 12,
    width: 160,
  },

});

export default TrendingProducts;

