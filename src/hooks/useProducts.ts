import { useQuery } from '@tanstack/react-query';
import { productService, ProductFilters } from '../services/productService';
import { Product } from '../types';
import { withTimeout, DEFAULT_TIMEOUTS } from '../utils/requestTimeout';
import { useProductStore } from '../store/productStore';
import { QUERY_KEYS } from '../constants/queryKeys';

export const useProducts = (filters?: ProductFilters) => {
  const setProducts = useProductStore((state) => state.setProducts);
  const cachedProducts = useProductStore((state) => state.products);

  return useQuery<Product[]>({
    queryKey: QUERY_KEYS.products(filters?.active, filters?.search, filters?.category),
    queryFn: async ({ signal }) => {
      const products = await withTimeout(
        productService.getProducts(filters, signal),
        {
          timeout: DEFAULT_TIMEOUTS.MEDIUM,
          errorMessage: 'Failed to fetch products: request timed out',
        }
      );
      
      // Update store/cache when fresh data arrives
      if (products && products.length > 0 && !filters?.search) {
        setProducts(products);
      }
      
      return products;
    },
    // Use cached products from store as initial/placeholder data
    placeholderData: filters?.search ? undefined : cachedProducts,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useProduct = (productId: string) => {
  const cachedProducts = useProductStore((state) => state.products);

  return useQuery<Product | null>({
    queryKey: QUERY_KEYS.product(productId),
    queryFn: async ({ signal }) => {
      return withTimeout(
        productService.getProductById(productId, signal),
        {
          timeout: DEFAULT_TIMEOUTS.MEDIUM,
          errorMessage: 'Failed to fetch product: request timed out',
        }
      );
    },
    placeholderData: cachedProducts.find((p) => p.id === productId) ?? null,
    enabled: !!productId,
  });
};

