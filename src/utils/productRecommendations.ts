/**
 * Product Recommendations Utility
 * Provides product recommendations and trending products
 */

import { Product } from '../types';
import { getRecentlyViewed } from './recentlyViewed';
import { isInStock } from './productUtils';
import { Country } from '../constants';

/**
 * Get trending products (based on stock availability and recency)
 */
export function getTrendingProducts(
  products: Product[],
  country: string,
  limit: number = 10
): Product[] {
  return products
    .filter((product) => {
      return isInStock(product, country as Country) && product.active;
    })
    .sort((a, b) => {
      // Sort by stock availability (higher stock = more trending)
      const stockA = country === 'germany' ? a.stock_germany : a.stock_denmark;
      const stockB = country === 'germany' ? b.stock_germany : b.stock_denmark;
      return stockB - stockA;
    })
    .slice(0, limit);
}

/**
 * Get recommended products based on recently viewed
 */
export async function getRecommendedProducts(
  products: Product[],
  excludeProductIds: string[] = [],
  limit: number = 10
): Promise<Product[]> {
  const recentlyViewed = await getRecentlyViewed();
  
  if (recentlyViewed.length === 0) {
    // If no recently viewed, return trending
    return getTrendingProducts(products, 'germany', limit);
  }

  // Get categories from recently viewed
  const viewedCategories = recentlyViewed
    .map((item) => item.category)
    .filter((cat): cat is string => !!cat);

  // Find products in same categories
  const recommended = products
    .filter((product) => {
      return (
        product.active &&
        !excludeProductIds.includes(product.id) &&
        viewedCategories.includes(product.category)
      );
    })
    .slice(0, limit);

  // If not enough recommendations, fill with trending
  if (recommended.length < limit) {
    const trending = getTrendingProducts(products, 'germany', limit - recommended.length);
    const trendingIds = recommended.map((p) => p.id);
    const additional = trending.filter((p) => !trendingIds.includes(p.id));
    return [...recommended, ...additional].slice(0, limit);
  }

  return recommended;
}

/**
 * Get related products (same category)
 */
export function getRelatedProducts(
  products: Product[],
  productId: string,
  category: string,
  limit: number = 5
): Product[] {
  return products
    .filter(
      (product) =>
        product.id !== productId &&
        product.category === category &&
        product.active
    )
    .slice(0, limit);
}

