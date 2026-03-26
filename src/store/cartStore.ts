import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartItem, Product } from '../types';
import { STORAGE_KEYS } from '../constants';
import { validateStock, validateQuantity } from '../utils/cartValidation';
import { calculateItemSubtotal } from '../utils/cartUtils';
import { getProductStock, isInStock } from '../utils/productUtils';
import { COUNTRIES, Country } from '../constants';

// Mutex to prevent concurrent cart operations
let cartMutex = false;
let cartMutexQueue: Array<() => void> = [];

const acquireCartMutex = async (): Promise<() => void> => {
  return new Promise((resolve) => {
    const tryAcquire = () => {
      cartMutex = true;
      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        cartMutex = false;
        if (cartMutexQueue.length > 0) {
          const next = cartMutexQueue.shift();
          if (next) next();
        }
      };
      // Safety: force-release after 1 second to prevent permanent lock
      setTimeout(() => {
        if (!released) {
          if (__DEV__) console.warn('[cartStore] Mutex force-released after 1s timeout');
          release();
        }
      }, 1000);
      resolve(release);
    };

    if (!cartMutex) {
      tryAcquire();
    } else {
      cartMutexQueue.push(tryAcquire);
    }
  });
};

// Debounced save to prevent multiple rapid AsyncStorage writes
let saveTimer: ReturnType<typeof setTimeout> | null = null;
const debouncedSaveCart = (saveFn: () => Promise<void>) => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveFn().catch((err) => {
      if (__DEV__) console.error('Error in debounced cart save:', err);
    });
  }, 300);
};

interface CartState {
  items: CartItem[];
  selectedCountry: 'germany' | 'denmark' | null;
  countrySelected: boolean;
  hasLoadedCountry: boolean; // New flag to track if initialization is complete
  addItem: (product: Product, quantity: number, country: 'germany' | 'denmark') => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  toggleItemSelection: (productId: string) => Promise<void>;
  toggleAllItems: (selected: boolean) => Promise<void>;
  removeSelectedItems: () => Promise<void>;
  clearCart: () => Promise<void>;
  getTotal: () => number;
  getItemCount: () => number;
  getSelectedCount: () => number;
  loadCart: () => Promise<void>;
  saveCart: (items?: CartItem[]) => Promise<void>;
  setSelectedCountry: (country: 'germany' | 'denmark') => Promise<void>;
  loadCountry: () => Promise<void>;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  selectedCountry: null,
  countrySelected: false,
  hasLoadedCountry: false, // Default to false until loaded

  addItem: async (product, quantity, country) => {
    const release = await acquireCartMutex();
    try {
      // Validate stock
      const stockValidation = validateStock(product, quantity, country);
      if (!stockValidation.isValid) {
        if (__DEV__) console.warn(stockValidation.error);
        return;
      }

      let newItems: CartItem[] | null = null;
      set((state) => {
        const isLoose = product.sell_type === 'loose';
        const packSize = product.pack_size_grams || 1000;
        const minQuantity = isLoose ? 100 : 1;

        // stock from DB is in KG. Convert to available display units (grams or packets)
        const stock = country === 'denmark' ? product.stock_denmark : product.stock_germany;

        const maxQuantity = isLoose
          ? stock * 1000
          : Math.floor(stock / (packSize / 1000));

        // Validate quantity
        const quantityValidation = validateQuantity(quantity, minQuantity, maxQuantity);
        if (!quantityValidation.isValid) {
          return state;
        }

        const existingItem = state.items.find(
          (item) => item.product.id === product.id && item.selectedCountry === country
        );

        if (existingItem) {
          const newQuantity = existingItem.quantity + quantity;
          // Check if new quantity exceeds stock
          if (newQuantity > maxQuantity) {
            if (__DEV__) console.warn(`Cannot add more than ${maxQuantity} ${isLoose ? 'g' : 'packets/items'}`);
            return state;
          }
          newItems = state.items.map((item) =>
            item.product.id === product.id && item.selectedCountry === country
              ? { ...item, quantity: newQuantity, isSelected: true } // Auto-select when adding/updating
              : item
          );
        } else {
          const initialQuantity = isLoose ? Math.max(quantity, 100) : quantity;
          newItems = [...state.items, {
            product,
            quantity: initialQuantity,
            selectedCountry: country,
            isSelected: true,
            unit: (isLoose ? 'gram' : 'packet') as 'gram' | 'packet'
          }];
        }

        return { items: newItems };
      });
      // Save outside set() with debounce to batch rapid operations
      if (newItems) {
        debouncedSaveCart(() => get().saveCart(newItems!));
      }
    } finally {
      release();
    }
  },

  removeItem: async (productId) => {
    const release = await acquireCartMutex();
    try {
      let newItems: CartItem[] | null = null;
      set((state) => {
        newItems = state.items.filter((item) => item.product.id !== productId);
        return { items: newItems };
      });
      if (newItems) {
        debouncedSaveCart(() => get().saveCart(newItems!));
      }
    } finally {
      release();
    }
  },

  updateQuantity: async (productId, quantity) => {
    if (quantity <= 0) {
      await get().removeItem(productId);
      return;
    }

    const release = await acquireCartMutex();
    try {
      let newItems: CartItem[] | null = null;
      set((state) => {
        const item = state.items.find((item) => item.product.id === productId);
        if (!item) return state;

        const isLoose = item.product.sell_type === 'loose';
        const packSize = item.product.pack_size_grams || 1000;
        let stockKg = 0;
        if (item.selectedCountry === 'germany') stockKg = item.product.stock_germany;
        else if (item.selectedCountry === 'denmark') stockKg = item.product.stock_denmark;

        const maxQuantity = isLoose
          ? stockKg * 1000
          : Math.floor(stockKg / (packSize / 1000));

        // Validate stock
        if (!isInStock(item.product, item.selectedCountry as Country)) {
          if (__DEV__) console.warn(`${item.product.name} is out of stock`);
          return state;
        }

        if (quantity > maxQuantity) {
          if (__DEV__) console.warn(`Cannot set quantity to ${quantity}, max is ${maxQuantity}`);
          return state;
        }

        // Validate quantity
        const minQuantity = isLoose ? 100 : 1;
        const quantityValidation = validateQuantity(quantity, minQuantity, maxQuantity);

        if (!quantityValidation.isValid && quantity !== 0) {
          return state;
        }

        newItems = state.items.map((item) =>
          item.product.id === productId
            ? { ...item, quantity }
            : item
        );
        return { items: newItems };
      });
      if (newItems) {
        debouncedSaveCart(() => get().saveCart(newItems!));
      }
    } finally {
      release();
    }
  },

  toggleItemSelection: async (productId) => {
    let newItems: CartItem[] | null = null;
    set((state) => {
      newItems = state.items.map((item) =>
        item.product.id === productId
          ? { ...item, isSelected: !item.isSelected }
          : item
      );
      return { items: newItems };
    });
    if (newItems) {
      debouncedSaveCart(() => get().saveCart(newItems!));
    }
  },

  toggleAllItems: async (selected) => {
    let newItems: CartItem[] | null = null;
    set((state) => {
      newItems = state.items.map((item) => ({
        ...item,
        isSelected: selected,
      }));
      return { items: newItems };
    });
    if (newItems) {
      debouncedSaveCart(() => get().saveCart(newItems!));
    }
  },

  removeSelectedItems: async () => {
    const release = await acquireCartMutex();
    try {
      let newItems: CartItem[] | null = null;
      set((state) => {
        newItems = state.items.filter((item) => !item.isSelected);
        return { items: newItems };
      });
      if (newItems) {
        debouncedSaveCart(() => get().saveCart(newItems!));
      }
    } finally {
      release();
    }
  },

  clearCart: async () => {
    const release = await acquireCartMutex();
    try {
      set({ 
        items: [], 
        selectedCountry: null, 
        countrySelected: false 
      });
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.CART,
        STORAGE_KEYS.SELECTED_COUNTRY
      ]);
    } finally {
      release();
    }
  },

  getTotal: () => {
    const { items, selectedCountry } = get();
    if (!selectedCountry) return 0;
    return items.reduce((total, item) => {
      if (!item.isSelected) return total;
      return total + calculateItemSubtotal(item, selectedCountry);
    }, 0);
  },

  getItemCount: () => {
    // Return total count of items. For grams, each product counts as 1 item.
    return get().items.reduce((count, item) => {
      const isLoose = item.product.sell_type === 'loose';
      return count + (isLoose ? 1 : item.quantity);

    }, 0);
  },

  // Helper to get count of only selected items (for labels and checkout button)
  getSelectedCount: () => {
    return get().items.reduce((count, item) => {
      if (!item.isSelected) return count;
      const isLoose = item.product.sell_type === 'loose';
      return count + (isLoose ? 1 : item.quantity);

    }, 0);
  },

  loadCart: async () => {
    try {
      const cartData = await AsyncStorage.getItem(STORAGE_KEYS.CART);
      // Remove redundant country loading here - rely on loadCountry

      if (cartData) {
        const items = JSON.parse(cartData);
        // Ensure legacy items have isSelected true by default if missing
        const migratedItems = items.map((item: CartItem) => ({
          ...item,
          isSelected: item.isSelected ?? true
        }));
        // Deduplicate items on load to prevent duplicate key errors
        // Use productId + country as the unique identifier
        const deduplicatedItems: CartItem[] = [];
        const seenKeys = new Set<string>();

        migratedItems.forEach((item: CartItem) => {
          const key = `${item.product.id}-${item.selectedCountry}`;
          if (!seenKeys.has(key)) {
            deduplicatedItems.push(item);
            seenKeys.add(key);
          }
        });

        set({ items: deduplicatedItems });
      }
    } catch (error) {
      if (__DEV__) console.error('Error loading cart:', error);
    }
  },

  saveCart: async (itemsToSave) => {
    try {
      const { items, selectedCountry } = get();
      // Use itemsToSave if provided, otherwise fallback to state items (careful with race conditions)
      const dataToSave = itemsToSave || items;
      await AsyncStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(dataToSave));
      if (selectedCountry) {
        await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_COUNTRY, selectedCountry);
      }
    } catch (error) {
      if (__DEV__) console.error('Error saving cart:', error);
    }
  },

  setSelectedCountry: async (country) => {
    set({ selectedCountry: country, countrySelected: true });
    await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_COUNTRY, country);
  },

  loadCountry: async () => {
    try {
      const countryData = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_COUNTRY);

      if (countryData) {
        set({
          selectedCountry: (countryData === 'denmark' ? 'denmark' : 'germany') as 'germany' | 'denmark',
          countrySelected: true,
          hasLoadedCountry: true, // Mark as loaded
        });
      } else {
        set({
          countrySelected: false,
          hasLoadedCountry: true, // Mark as loaded even if no country found
        });
      }
    } catch (error) {
      if (__DEV__) console.error('Error loading country:', error);
      set({
        countrySelected: false,
        hasLoadedCountry: true, // Mark as loaded explicitly on error
      });
    }
  },
}));
