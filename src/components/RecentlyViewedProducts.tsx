/**
 * Recently Viewed Products Component
 */

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Product } from '../types';
import { getRecentlyViewed } from '../utils/recentlyViewed';
import ProductCard from './ProductCard';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { COUNTRIES } from '../constants';
import type { Country } from '../constants';

interface RecentlyViewedProductsProps {
  products: Product[];
  country: Country;
  onProductPress: (productId: string) => void;
  limit?: number;
  style?: any;
  hideHeader?: boolean;
}

const RecentlyViewedProducts: React.FC<RecentlyViewedProductsProps> = ({
  products,
  country,
  onProductPress,
  limit = 10,
  style,
  hideHeader = false,
}) => {
  const { t } = useTranslation();
  const { colors: themeColors } = useTheme();
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);

  useEffect(() => {
    loadRecentlyViewed();
  }, []);

  const loadRecentlyViewed = async () => {
    const history = await getRecentlyViewed();
    setRecentlyViewedIds(history.map((item) => item.productId).slice(0, limit));
  };

  const recentlyViewedProducts = products.filter((product) =>
    recentlyViewedIds.includes(product.id)
  );

  if (recentlyViewedProducts.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      {!hideHeader && (
        <View style={styles.header}>
          <Icon name="clock-outline" size={20} color={themeColors.primary[500]} />
          <Text style={[styles.title, { color: themeColors.text.primary }]}>
            {t('home.recentlyViewed')}
          </Text>
        </View>
      )}
      <FlatList
        data={recentlyViewedProducts}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            country={country}
            onPress={() => onProductPress(item.id)}
            style={styles.productCard}
          />
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
    fontWeight: '600',
    marginLeft: 8,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  productCard: {
    marginRight: 12,
    width: 160,
  },
});

export default RecentlyViewedProducts;

