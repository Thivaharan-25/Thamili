/**
 * Glassmorphism Theme Utilities
 * Provides reusable glassmorphism styles
 */

import { StyleSheet, Platform } from 'react-native';
import { colors } from './colors';

export const glassmorphism = {
  // Light glassmorphism (for light backgrounds)
  light: StyleSheet.create({
    container: {
      backgroundColor: colors.glass.background,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.glass.border,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
        },
        android: {
          elevation: 4,
        },
      }),
    },
  }),

  // Dark glassmorphism (for dark backgrounds)
  dark: StyleSheet.create({
    container: {
      backgroundColor: colors.glass.backgroundDark,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.glass.borderDark,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 12,
        },
        android: {
          elevation: 4,
        },
      }),
    },
  }),

  // Active icon gradient colors
  activeIconGradient: {
    colors: [colors.navy[500], colors.primary[500]], // #0A1D44 to #3AB5D1
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },

  // Screen background with glassmorphism
  screenBackground: {
    backgroundColor: 'rgba(245, 245, 250, 0.95)',
  },

  // Glassmorphism header/bar
  header: StyleSheet.create({
    container: {
      backgroundColor: 'rgba(255, 255, 255, 0.85)',
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(58, 181, 209, 0.1)',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
        },
        android: {
          elevation: 2,
        },
        web: {
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
        },
      }),
    },
  }),

  // Glassmorphism section/panel
  panel: StyleSheet.create({
    container: {
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(58, 181, 209, 0.15)',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        },
        android: {
          elevation: 3,
        },
        web: {
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.08)',
        },
      }),
    },
  }),
};

export default glassmorphism;

