/**
 * Theme Toggle Component
 * Allows users to switch between light, dark, and system theme
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useThemeStore } from '../store/themeStore';
import { useTheme } from '../hooks/useTheme';
import { colors, darkColors } from '../theme';

const ThemeToggle: React.FC = () => {
  const { themeMode, setThemeMode } = useThemeStore();
  const { isDark, colors: themeColors } = useTheme();

  const modes: Array<{ mode: 'light' | 'dark' | 'system'; label: string; icon: string }> = [
    { mode: 'light', label: 'Light', icon: 'weather-sunny' },
    { mode: 'dark', label: 'Dark', icon: 'weather-night' },
    { mode: 'system', label: 'System', icon: 'theme-light-dark' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background.card }]}>
      <View style={styles.header}>
        <Icon 
          name="theme-light-dark" 
          size={20} 
          color={themeColors.primary[500]} 
          style={styles.headerIcon}
        />
        <Text style={[styles.title, { color: themeColors.text.primary }]}>
          Theme
        </Text>
      </View>
      
      <View style={styles.options}>
        {modes.map(({ mode, label, icon }) => {
          const isSelected = themeMode === mode;
          return (
            <TouchableOpacity
              key={mode}
              style={[
                styles.option,
                isSelected && { backgroundColor: themeColors.primary[50] },
                { borderColor: isSelected ? themeColors.primary[500] : themeColors.border.light },
              ]}
              onPress={() => setThemeMode(mode)}
              accessibilityLabel={`${label} theme${isSelected ? ' (selected)' : ''}`}
              accessibilityRole="button"
            >
              <Icon
                name={icon as any}
                size={24}
                color={isSelected ? themeColors.primary[500] : themeColors.text.secondary}
              />
              <Text
                style={[
                  styles.optionLabel,
                  { color: isSelected ? themeColors.primary[500] : themeColors.text.secondary },
                ]}
              >
                {label}
              </Text>
              {isSelected && (
                <Icon
                  name="check-circle"
                  size={20}
                  color={themeColors.primary[500]}
                  style={styles.checkIcon}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(58, 181, 209, 0.15)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerIcon: {
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  options: {
    gap: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  optionLabel: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '500',
  },
  checkIcon: {
    marginLeft: 8,
  },
});

export default ThemeToggle;

