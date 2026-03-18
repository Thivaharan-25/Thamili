/**
 * Product Recommendations Component
 * Displays personalized product recommendations
 */

import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { getRecommendedProducts } from '../utils/productRecommendations';
import { productService } from '../services/productService';
import ProductCard from './ProductCard';
import { Product } from '../types';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import { COUNTRIES } from '../constants';
import type { Country } from '../constants';

interface ProductRecommendationsProps {
  userId?: string;
  country: Country;
  onProductPress: (productId: string) => void;
  onAddToCart: (product: Product, quantity?: number) => void;
  limit?: number;
  style?: any;
  hideHeader?: boolean;
}

const ProductRecommendations: React.FC<ProductRecommendationsProps> = ({
  userId,
  country,
  onProductPress,
  onAddToCart,
  limit = 5,
  style,
  hideHeader = false,
}) => {
  const { t } = useTranslation();
  const { colors: themeColors } = useTheme();

  const { data: allProducts = [] } = useQuery({
    queryKey: ['products', { active: true }],
    queryFn: () => productService.getProducts({ active: true }),
  });

  const { data: recommendations = [], isLoading } = useQuery({
    queryKey: ['productRecommendations', userId, country, allProducts.length],
    queryFn: async () => {
      if (allProducts.length === 0) return [];
      return await getRecommendedProducts(allProducts, [], limit);
    },
    enabled: allProducts.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return null; // Don't show loading state, just return null
  }

  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      {!hideHeader && (
        <View style={styles.header}>
          <Icon name="star-circle" size={20} color={themeColors.primary[500]} />
          <Text style={[styles.title, { color: themeColors.text.primary }]}>
            {t('home.recommendedForYou')}
          </Text>
        </View>
      )}
      <FlatList
        data={recommendations}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            country={country}
            onPress={() => onProductPress(item.id)}
            onAddToCart={(qty) => onAddToCart(item, qty)}
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

export default ProductRecommendations;

