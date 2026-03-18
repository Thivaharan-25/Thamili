/**
 * Search History Utility
 * Manages recent searches and suggestions
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const SEARCH_HISTORY_KEY = '@thamili_search_history';
const MAX_HISTORY_ITEMS = 10;

export interface SearchHistoryItem {
  query: string;
  timestamp: number;
  category?: string;
}

/**
 * Get search history
 */
export async function getSearchHistory(): Promise<SearchHistoryItem[]> {
  try {
    const data = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
    if (data) {
      const history = JSON.parse(data) as SearchHistoryItem[];
      // Sort by timestamp (most recent first)
      return history.sort((a, b) => b.timestamp - a.timestamp);
    }
    return [];
  } catch (error) {
    console.error('Error getting search history:', error);
    return [];
  }
}

/**
 * Add search to history
 */
export async function addToSearchHistory(query: string, category?: string): Promise<void> {
  try {
    const history = await getSearchHistory();
    
    // Remove duplicate if exists
    const filtered = history.filter(item => item.query.toLowerCase() !== query.toLowerCase());
    
    // Add new item
    const newItem: SearchHistoryItem = {
      query: query.trim(),
      timestamp: Date.now(),
      category,
    };
    
    // Keep only MAX_HISTORY_ITEMS
    const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    
    await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error adding to search history:', error);
  }
}

/**
 * Clear search history
 */
export async function clearSearchHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
  } catch (error) {
    console.error('Error clearing search history:', error);
  }
}

/**
 * Remove specific item from history
 */
export async function removeFromSearchHistory(query: string): Promise<void> {
  try {
    const history = await getSearchHistory();
    const filtered = history.filter(item => item.query.toLowerCase() !== query.toLowerCase());
    await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error removing from search history:', error);
  }
}

/**
 * Get search suggestions based on query
 */
export async function getSearchSuggestions(query: string, limit: number = 5): Promise<string[]> {
  try {
    const history = await getSearchHistory();
    const lowerQuery = query.toLowerCase();
    
    // Filter history items that match the query
    const matches = history
      .filter(item => item.query.toLowerCase().includes(lowerQuery))
      .slice(0, limit)
      .map(item => item.query);
    
    return matches;
  } catch (error) {
    console.error('Error getting search suggestions:', error);
    return [];
  }
}

