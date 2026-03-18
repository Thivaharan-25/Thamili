/**
 * Recently Viewed Products Utility
 * Manages recently viewed products history
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENTLY_VIEWED_KEY = '@thamili_recently_viewed';
const MAX_RECENT_ITEMS = 20;

export interface RecentlyViewedItem {
  productId: string;
  timestamp: number;
  category?: string;
}

/**
 * Add product to recently viewed
 */
export async function addToRecentlyViewed(productId: string, category?: string): Promise<void> {
  try {
    const history = await getRecentlyViewed();
    
    // Remove duplicate if exists
    const filtered = history.filter(item => item.productId !== productId);
    
    // Add new item
    const newItem: RecentlyViewedItem = {
      productId,
      timestamp: Date.now(),
      category,
    };
    
    // Keep only MAX_RECENT_ITEMS
    const updated = [newItem, ...filtered].slice(0, MAX_RECENT_ITEMS);
    
    await AsyncStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error adding to recently viewed:', error);
  }
}

/**
 * Get recently viewed products
 */
export async function getRecentlyViewed(): Promise<RecentlyViewedItem[]> {
  try {
    const data = await AsyncStorage.getItem(RECENTLY_VIEWED_KEY);
    if (data) {
      const history = JSON.parse(data) as RecentlyViewedItem[];
      // Sort by timestamp (most recent first)
      return history.sort((a, b) => b.timestamp - a.timestamp);
    }
    return [];
  } catch (error) {
    console.error('Error getting recently viewed:', error);
    return [];
  }
}

/**
 * Clear recently viewed history
 */
export async function clearRecentlyViewed(): Promise<void> {
  try {
    await AsyncStorage.removeItem(RECENTLY_VIEWED_KEY);
  } catch (error) {
    console.error('Error clearing recently viewed:', error);
  }
}

/**
 * Remove specific product from recently viewed
 */
export async function removeFromRecentlyViewed(productId: string): Promise<void> {
  try {
    const history = await getRecentlyViewed();
    const filtered = history.filter(item => item.productId !== productId);
    await AsyncStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error removing from recently viewed:', error);
  }
}

