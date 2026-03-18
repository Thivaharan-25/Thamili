/**
 * Enhanced SearchBar with Industry Best Practices
 * - Optimized keyboard management
 * - Better performance with memoization
 * - Improved UX with proper focus handling
 * - Analytics-ready structure
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  TextInput,
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Modal,
  Platform,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../theme';
import {
  getSearchHistory,
  getSearchSuggestions,
  addToSearchHistory,
  removeFromSearchHistory,
  clearSearchHistory,
} from '../utils/searchHistory';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  style?: any;
  onFocus?: () => void;
  onBlur?: () => void;
  onCameraPress?: () => void;
  onSearchPress?: () => void;
  showSuggestions?: boolean;
  onSuggestionPress?: (query: string) => void;
  category?: string;
  isLoading?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search products...',
  onClear,
  style,
  onFocus,
  onBlur,
  onCameraPress,
  onSearchPress,
  showSuggestions = true,
  onSuggestionPress,
  category,
  isLoading = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const textInputRef = useRef<TextInput>(null);
  const suggestionsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoized handlers
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    onFocus?.();
  }, [onFocus]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    onBlur?.();
  }, [onBlur]);

  const loadRecentSearches = useCallback(async () => {
    try {
      const history = await getSearchHistory();
      setRecentSearches(history.slice(0, 5).map((item) => item.query));
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  }, []);

  const loadSuggestions = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const suggs = await getSearchSuggestions(query, 5);
      setSuggestions(suggs);
    } catch (error) {
      console.error('Error loading suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  // Load suggestions with debounce
  useEffect(() => {
    if (!showSuggestions || !isFocused) {
      setSuggestions([]);
      return;
    }

    // Clear previous timeout
    if (suggestionsTimeoutRef.current) {
      clearTimeout(suggestionsTimeoutRef.current);
    }

    if (value.length > 0) {
      // Debounce suggestions loading (300ms)
      suggestionsTimeoutRef.current = setTimeout(() => {
        loadSuggestions(value);
        setShowSuggestionsModal(true);
      }, 300);
    } else {
      // Show recent searches immediately
      loadRecentSearches();
      setShowSuggestionsModal(true);
    }

    return () => {
      if (suggestionsTimeoutRef.current) {
        clearTimeout(suggestionsTimeoutRef.current);
      }
    };
  }, [value, isFocused, showSuggestions, loadSuggestions, loadRecentSearches]);

  const handleClear = useCallback(() => {
    onChangeText('');
    setSuggestions([]);
    onClear?.();
  }, [onChangeText, onClear]);

  const handleSuggestionSelect = useCallback(
    async (query: string) => {
      onChangeText(query);
      setShowSuggestionsModal(false);
      setIsFocused(false);
      textInputRef.current?.blur();
      Keyboard.dismiss();

      try {
        await addToSearchHistory(query, category);
      } catch (error) {
        console.error('Error adding to search history:', error);
      }

      onSuggestionPress?.(query);
    },
    [onChangeText, category, onSuggestionPress]
  );

  const handleSearch = useCallback(async () => {
    if (!value.trim()) return;

    setShowSuggestionsModal(false);
    setIsFocused(false);
    textInputRef.current?.blur();
    Keyboard.dismiss();

    try {
      await addToSearchHistory(value.trim(), category);
    } catch (error) {
      console.error('Error adding to search history:', error);
    }

    onSearchPress?.();
  }, [value, category, onSearchPress]);

  const handleRemoveSuggestion = useCallback(
    async (query: string) => {
      try {
        await removeFromSearchHistory(query);
        await loadRecentSearches();
      } catch (error) {
        console.error('Error removing from search history:', error);
      }
    },
    [loadRecentSearches]
  );

  const displaySuggestions = useMemo(
    () => isFocused && (suggestions.length > 0 || recentSearches.length > 0),
    [isFocused, suggestions.length, recentSearches.length]
  );

  const hasValue = value.length > 0;

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[
          styles.searchContainer,
          isFocused && styles.searchContainerFocused,
        ]}
        activeOpacity={0.7}
        onPress={() => {
          textInputRef.current?.focus();
        }}
      >
        <Icon
          name="magnify"
          size={20}
          color={isFocused ? colors.primary[500] : colors.neutral[500]}
          style={styles.searchIcon}
        />

        <TextInput
          ref={textInputRef}
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.neutral[400]}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          blurOnSubmit={false}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
          accessibilityLabel="Search input"
          accessibilityHint="Enter search query"
          accessibilityRole={Platform.OS === 'ios' ? 'search' : 'text'}
        />

        {isLoading && (
          <ActivityIndicator
            size="small"
            color={colors.primary[500]}
            style={styles.loadingIndicator}
          />
        )}

        {hasValue && !isLoading && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Icon
              name="close-circle"
              size={20}
              color={colors.neutral[500]}
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {onCameraPress && (
        <TouchableOpacity
          onPress={onCameraPress}
          style={[styles.cameraButton, styles.buttonSpacing]}
          activeOpacity={0.7}
          disabled={isLoading}
        >
          <Icon
            name="camera"
            size={22}
            color={isLoading ? colors.neutral[300] : colors.primary[500]}
          />
        </TouchableOpacity>
      )}

      {onSearchPress && (
        <TouchableOpacity
          onPress={handleSearch}
          style={[
            styles.searchButton,
            styles.buttonSpacing,
            isFocused && styles.searchButtonFocused,
            isLoading && styles.searchButtonDisabled,
          ]}
          activeOpacity={0.8}
          disabled={isLoading || !hasValue}
          accessibilityLabel="Search button"
          accessibilityRole="button"
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.searchButtonText} allowFontScaling={false}>
              Search
            </Text>
          )}
        </TouchableOpacity>
      )}

      {showSuggestions && displaySuggestions && (
        <View style={styles.suggestionsContainer}>
          {isLoadingSuggestions && value.length > 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary[500]} />
              <Text style={styles.loadingText}>Finding suggestions...</Text>
            </View>
          ) : (
            <>
              {suggestions.length > 0 && (
                <View>
                  <Text style={styles.suggestionsTitle}>Suggestions</Text>
                  {suggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={`suggestion-${index}`}
                      style={styles.suggestionItem}
                      onPress={() => handleSuggestionSelect(suggestion)}
                      accessibilityLabel={`Search suggestion: ${suggestion}`}
                      accessibilityRole="button"
                    >
                      <Icon
                        name="magnify"
                        size={16}
                        color={colors.neutral[500]}
                      />
                      <Text style={styles.suggestionText}>{suggestion}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {recentSearches.length > 0 && value.length === 0 && (
                <View style={styles.recentSearches}>
                  <View style={styles.recentSearchesHeader}>
                    <Text style={styles.suggestionsTitle}>Recent Searches</Text>

                    <TouchableOpacity
                      onPress={async () => {
                        try {
                          await clearSearchHistory();
                          setRecentSearches([]);
                        } catch (error) {
                          console.error('Error clearing history:', error);
                        }
                      }}
                      accessibilityLabel="Clear search history"
                      accessibilityRole="button"
                    >
                      <Text style={styles.clearHistoryText}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                  {recentSearches.map((search, index) => (

                    <TouchableOpacity
                      key={`recent-${index}`}
                      style={styles.suggestionItem}
                      onPress={() => handleSuggestionSelect(search)}
                      accessibilityLabel={`Recent search: ${search}`}
                      accessibilityRole="button"
                    >
                      <Icon
                        name="clock-outline"
                        size={16}
                        color={colors.neutral[500]}
                      />
                      <Text style={styles.suggestionText}>{search}</Text>
                      <TouchableOpacity
                        onPress={() => handleRemoveSuggestion(search)}
                        style={styles.removeButton}
                        accessibilityLabel={`Remove ${search} from history`}
                        accessibilityRole="button"
                      >
                        <Icon
                          name="close"
                          size={14}
                          color={colors.neutral[400]}
                        />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 100, // Ensure suggestions appear above other content
    position: 'relative',
  },

  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  searchContainerFocused: {
    borderColor: colors.primary[500],
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.neutral[900],
    padding: 0,
    margin: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 4,
  },
  loadingIndicator: {
    marginRight: 8,
  },
  cameraButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.neutral[50],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  searchButton: {
    paddingHorizontal: 24,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  searchButtonFocused: {
    backgroundColor: colors.primary[500],
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonSpacing: {
    marginLeft: 8,
  },

  suggestionsContainer: {
    position: 'absolute',
    top: 52, // Below the search bar
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 8,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 1000,
  },

  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.neutral[600],
    fontWeight: '500',
  },
  suggestionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral[600],
    paddingHorizontal: 16,
    paddingVertical: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  suggestionText: {
    flex: 1,
    fontSize: 15,
    color: colors.neutral[900],
    marginLeft: 12,
  },
  recentSearches: {
    marginTop: 8,
  },
  recentSearchesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  clearHistoryText: {
    fontSize: 12,
    color: colors.primary[500],
    fontWeight: '600',
  },
  removeButton: {
    padding: 4,
    marginLeft: 8,
  },
});

SearchBar.displayName = 'SearchBar';

export default React.memo(SearchBar);
