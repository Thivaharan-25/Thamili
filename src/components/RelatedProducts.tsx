/**
 * Related Products Component
 * Displays related products in a horizontal scrollable list
 */

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Product } from '../types';
import ProductCard from './ProductCard';
import type { Country } from '../constants';
import { colors } from '../theme';

interface RelatedProductsProps {
  products: Product[];
  country: Country;
  onProductPress: (productId: string) => void;
  onViewAll?: () => void;
  title?: string;
}

const RelatedProducts: React.FC<RelatedProductsProps> = ({
  products,
  country,
  onProductPress,
  onViewAll,
  title = 'Related Products',
}) => {
  if (!products || products.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {onViewAll && (
          <TouchableOpacity
            onPress={onViewAll}
            accessibilityRole="button"
            accessibilityLabel="View all products"
          >
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {products.map((product, index) => (
          <View key={product.id} style={styles.productWrapper}>
            <ProductCard
              product={product}
              country={country}
              onPress={() => onProductPress(product.id)}
              index={index}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  viewAll: {
    fontSize: 14,
    color: colors.primary[500],
    fontWeight: '500',
  },
  scrollContent: {
    paddingRight: 16,
  },
  productWrapper: {
    marginRight: 12,
    width: 180,
  },
});

export default RelatedProducts;

