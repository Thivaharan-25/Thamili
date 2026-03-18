import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product, ProductCategory, PickupPoint } from '../types';
import { productService } from '../services/productService';
import { pickupPointService } from '../services/pickupPointService';
import { STORAGE_KEYS } from '../constants';

interface ProductState {
  products: Product[];
  categories: ProductCategory[];
  pickupPoints: PickupPoint[];
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
  
  // Actions
  setProducts: (products: Product[]) => void;
  setCategories: (categories: ProductCategory[]) => void;
  setPickupPoints: (points: PickupPoint[]) => void;
  loadFromCache: () => Promise<void>;
  fetchProducts: (filters?: any) => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchPickupPoints: (country?: string) => Promise<void>;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  categories: [],
  pickupPoints: [],
  isLoading: false,
  error: null,
  lastFetched: null,

  setProducts: (products) => {
    set({ products, lastFetched: Date.now() });
    AsyncStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  },

  setCategories: (categories) => {
    set({ categories });
    AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  },

  setPickupPoints: (pickupPoints) => {
    set({ pickupPoints });
    AsyncStorage.setItem(STORAGE_KEYS.PICKUP_POINTS, JSON.stringify(pickupPoints));
  },

  loadFromCache: async () => {
    try {
      const [cachedProducts, cachedCategories, cachedPoints] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.PRODUCTS),
        AsyncStorage.getItem(STORAGE_KEYS.CATEGORIES),
        AsyncStorage.getItem(STORAGE_KEYS.PICKUP_POINTS),
      ]);

      if (cachedProducts) {
        set({ products: JSON.parse(cachedProducts) });
      }
      if (cachedCategories) {
        set({ categories: JSON.parse(cachedCategories) });
      }
      if (cachedPoints) {
        set({ pickupPoints: JSON.parse(cachedPoints) });
      }
    } catch (error) {
      console.error('Error loading data from cache:', error);
    }
  },

  fetchProducts: async (filters) => {
    set({ isLoading: true, error: null });
    try {
      const products = await productService.getProducts(filters);
      get().setProducts(products);
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch products' });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchCategories: async () => {
    // Categories are currently static in index.ts, but if they become dynamic:
    // try { ... } catch (error) { ... }
  },

  fetchPickupPoints: async (country) => {
    try {
      const points = await pickupPointService.getPickupPoints(country);
      get().setPickupPoints(points);
    } catch (error) {
      console.error('Error fetching pickup points:', error);
    }
  },
}));
