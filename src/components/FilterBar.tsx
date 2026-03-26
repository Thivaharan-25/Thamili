/**
 * Enhanced FilterBar with Icons
 * Modern filter design with visual icons for categories and sort options
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { ProductCategory } from '../types';
import { PRODUCT_CATEGORIES } from '../constants';
import { colors } from '../theme';

interface FilterBarProps {
  selectedCategory: ProductCategory | 'all';
  onCategoryChange: (category: ProductCategory | 'all') => void;
  sortBy: 'name' | 'price_asc' | 'price_desc';
  onSortChange: (sort: 'name' | 'price_asc' | 'price_desc') => void;
  showClearFilters?: boolean; // Show clear filters button
  onClearFilters?: () => void; // Clear all filters callback
  resultCount?: number; // Number of filtered results
}

const FilterBar: React.FC<FilterBarProps> = ({
  selectedCategory,
  onCategoryChange,
  sortBy,
  onSortChange,
  showClearFilters = false,
  onClearFilters,
  resultCount,
}) => {
  const { t } = useTranslation();
  const hasActiveFilters = selectedCategory !== 'all' || sortBy !== 'name';

  return (
    <View style={styles.container}>
      {(showClearFilters || resultCount !== undefined) && (
        <View style={styles.headerRow}>
          {resultCount !== undefined && (
            <Text style={styles.resultCount}>
              {resultCount} {resultCount === 1 ? t('products.productCount') : t('products.productCountPlural', { count: resultCount })}
            </Text>
          )}
          {showClearFilters && hasActiveFilters && onClearFilters && (
            <TouchableOpacity
              onPress={onClearFilters}
              style={styles.clearButton}
              activeOpacity={0.7}
              accessibilityLabel={t('common.clear') || "Clear all filters"}
              accessibilityRole="button"
            >
              <Icon name="close-circle" size={16} color={colors.primary[500]} />
              <Text style={styles.clearButtonText}>{t('common.clear')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      {/* Category Section */}
      <View style={styles.section}>
        <View style={styles.labelContainer}>
          <Icon name="tag" size={16} color={colors.neutral[600]} style={styles.labelIcon} />
          <Text style={styles.label}>{t('products.categoryLabel')}</Text>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedCategory === 'all' && styles.filterButtonActive,
            ]}
            onPress={() => onCategoryChange('all')}
            activeOpacity={0.7}
          >
            <Icon
              name="view-grid"
              size={16}
              color={selectedCategory === 'all' ? '#fff' : colors.neutral[600]}
              style={styles.buttonIcon}
            />
            <Text
              style={[
                styles.filterButtonText,
                selectedCategory === 'all' && styles.filterButtonTextActive,
              ]}
            >
              {t('common.all') || 'All'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedCategory === PRODUCT_CATEGORIES.FRESH &&
              styles.filterButtonActive,
            ]}
            onPress={() => onCategoryChange(PRODUCT_CATEGORIES.FRESH)}
            activeOpacity={0.7}
          >
            <Icon
              name="fish"
              size={16}
              color={
                selectedCategory === PRODUCT_CATEGORIES.FRESH
                  ? '#fff'
                  : colors.success[600]
              }
              style={styles.buttonIcon}
            />
            <Text
              style={[
                styles.filterButtonText,
                selectedCategory === PRODUCT_CATEGORIES.FRESH &&
                styles.filterButtonTextActive,
              ]}
            >
              {t('products.fresh')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedCategory === PRODUCT_CATEGORIES.FROZEN &&
              styles.filterButtonActive,
            ]}
            onPress={() => onCategoryChange(PRODUCT_CATEGORIES.FROZEN)}
            activeOpacity={0.7}
          >
            <Icon
              name="snowflake"
              size={16}
              color={
                selectedCategory === PRODUCT_CATEGORIES.FROZEN
                  ? '#fff'
                  : colors.primary[600]
              }
              style={styles.buttonIcon}
            />
            <Text
              style={[
                styles.filterButtonText,
                selectedCategory === PRODUCT_CATEGORIES.FROZEN &&
                styles.filterButtonTextActive,
              ]}
            >
              {t('products.frozen')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sort Section */}
      <View style={styles.section}>
        <View style={styles.labelContainer}>
          <Icon name="sort" size={16} color={colors.neutral[600]} style={styles.labelIcon} />
          <Text style={styles.label}>{t('products.sortLabel')}</Text>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              sortBy === 'name' && styles.filterButtonActive,
            ]}
            onPress={() => onSortChange('name')}
            activeOpacity={0.7}
          >
            <Icon
              name="alphabetical"
              size={16}
              color={sortBy === 'name' ? '#fff' : colors.neutral[600]}
              style={styles.buttonIcon}
            />
            <Text
              style={[
                styles.filterButtonText,
                sortBy === 'name' && styles.filterButtonTextActive,
              ]}
            >
              {t('products.sortName')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              sortBy === 'price_asc' && styles.filterButtonActive,
            ]}
            onPress={() => onSortChange('price_asc')}
            activeOpacity={0.7}
          >
            <Icon
              name="sort-ascending"
              size={16}
              color={sortBy === 'price_asc' ? '#fff' : colors.neutral[600]}
              style={styles.buttonIcon}
            />
            <Text
              style={[
                styles.filterButtonText,
                sortBy === 'price_asc' && styles.filterButtonTextActive,
              ]}
            >
              {t('products.sortPriceAsc')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              sortBy === 'price_desc' && styles.filterButtonActive,
            ]}
            onPress={() => onSortChange('price_desc')}
            activeOpacity={0.7}
          >
            <Icon
              name="sort-descending"
              size={16}
              color={sortBy === 'price_desc' ? '#fff' : colors.neutral[600]}
              style={styles.buttonIcon}
            />
            <Text
              style={[
                styles.filterButtonText,
                sortBy === 'price_desc' && styles.filterButtonTextActive,
              ]}
            >
              {t('products.sortPriceDesc')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  section: {
    marginBottom: 12,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#F8FAFC',
    marginRight: 8,
    marginBottom: 8,
  },
  labelIcon: {
    marginRight: 6,
  },
  filterButtonActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  filterButtonText: {
    fontSize: 13,
    color: colors.neutral[700],
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  resultCount: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary[500],
    marginLeft: 4,
  },
});

// Set displayName for better debugging
FilterBar.displayName = 'FilterBar';

export default React.memo(FilterBar);
