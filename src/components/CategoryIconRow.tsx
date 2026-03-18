/**
 * Category Icon Row Component
 * Horizontal scrollable row of category icons
 */

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme';
import { ProductCategory } from '../types';

interface CategoryItem {
  id: string;
  name: string;
  icon: string;
  category?: ProductCategory | 'all';
  badge?: string; // e.g., "20% OFF", "FREE"
}

interface CategoryIconRowProps {
  categories: CategoryItem[];
  onCategoryPress?: (category: CategoryItem) => void;
  selectedCategory?: ProductCategory | 'all';
}

const CategoryIconRow: React.FC<CategoryIconRowProps> = ({
  categories,
  onCategoryPress,
  selectedCategory,
}) => {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {categories.map((category) => {
          const isSelected = selectedCategory === category.category;

          return (
            <TouchableOpacity
              key={category.id}
              onPress={() => onCategoryPress?.(category)}
              style={[
                styles.categoryItem,
                isSelected && styles.categoryItemSelected,
              ]}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.iconContainer,
                  isSelected && styles.iconContainerSelected,
                ]}
              >
                <Icon
                  name={category.icon as any}
                  size={22}
                  color={isSelected ? 'white' : '#3AB5D1'}
                />
              </View>
              <Text
                style={[
                  styles.categoryName,
                  isSelected && styles.categoryNameSelected,
                ]}
                numberOfLines={1}
              >
                {t(`products.${category.name.toLowerCase()}`, { defaultValue: category.name })}
              </Text>
              {category.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{t(category.badge.toLowerCase()) || category.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    paddingTop: 12,
    backgroundColor: 'white',
    overflow: 'visible',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    overflow: 'visible',
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 16,
    minWidth: 68,
    position: 'relative',
    overflow: 'visible',
  },
  categoryItemSelected: {
    opacity: 1,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#E6F7FC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconContainerSelected: {
    backgroundColor: '#3AB5D1',
    borderWidth: 0,
  },
  categoryName: {
    fontSize: 11,
    color: colors.neutral[600],
    textAlign: 'center',
    fontWeight: '500',
  },
  categoryNameSelected: {
    color: '#3AB5D1',
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#F5A623',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
    minWidth: 48,
    alignItems: 'center',
    zIndex: 10,
    elevation: 5,
    shadowColor: '#F5A623',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
});

// Set displayName for better debugging
CategoryIconRow.displayName = 'CategoryIconRow';

export default CategoryIconRow;

