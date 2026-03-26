/**
 * Saved For Later Store
 * Manages items saved for later (wishlist-like functionality)
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '../types';
import { COUNTRIES } from '../constants';
import type { Country } from '../constants';

const SAVED_FOR_LATER_KEY = '@thamili_saved_for_later';

export interface SavedItem {
  product: Product;
  selectedCountry: Country;
  savedAt: number;
}

interface SavedForLaterState {
  items: SavedItem[];
  addItem: (product: Product, country: Country) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clearAll: () => Promise<void>;
  loadSavedItems: () => Promise<void>;
  isSaved: (productId: string) => boolean;
  saveItems: () => Promise<void>;
}

export const useSavedForLaterStore = create<SavedForLaterState>((set, get) => ({
  items: [],

  addItem: async (product, country) => {
    const existingItem = get().items.find(
      (item) => item.product.id === product.id && item.selectedCountry === country
    );

    if (existingItem) {
      return; // Already saved
    }

    const newItem: SavedItem = {
      product,
      selectedCountry: country,
      savedAt: Date.now(),
    };

    set((state) => ({
      items: [...state.items, newItem],
    }));

    await get().saveItems();
  },

  removeItem: async (productId) => {
    set((state) => ({
      items: state.items.filter((item) => item.product.id !== productId),
    }));
    await get().saveItems();
  },

  clearAll: async () => {
    set({ items: [] });
    await AsyncStorage.removeItem(SAVED_FOR_LATER_KEY);
  },

  loadSavedItems: async () => {
    try {
      const data = await AsyncStorage.getItem(SAVED_FOR_LATER_KEY);
      if (data) {
        const items = JSON.parse(data) as SavedItem[];
        set({ items });
      }
    } catch (error) {
      if (__DEV__) console.error('Error loading saved items:', error);
    }
  },

  isSaved: (productId) => {
    return get().items.some((item) => item.product.id === productId);
  },

  saveItems: async () => {
    try {
      await AsyncStorage.setItem(SAVED_FOR_LATER_KEY, JSON.stringify(get().items));
    } catch (error) {
      if (__DEV__) console.error('Error saving items:', error);
    }
  },
}));

