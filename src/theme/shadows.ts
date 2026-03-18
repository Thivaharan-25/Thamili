/**
 * Shadow/Elevation System for Thamili App
 * Subtle shadows for depth and hierarchy
 */

import { Platform } from 'react-native';

export const shadows = {
  // iOS shadows
  ios: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
    },
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
    },
  },

  // Web shadows (using boxShadow)
  web: {
    none: { boxShadow: 'none' },
    sm: { boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)' },
    md: { boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)' },
    lg: { boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)' },
    xl: { boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.12)' },
  },

  // Android elevation
  android: {
    none: { elevation: 0 },
    sm: { elevation: 2 },
    md: { elevation: 4 },
    lg: { elevation: 8 },
    xl: { elevation: 12 },
  },
} as const;

// Platform-aware shadow helper
export const getShadow = (level: 'none' | 'sm' | 'md' | 'lg' | 'xl') => {
  if (Platform.OS === 'ios') {
    return shadows.ios[level];
  }
  if (Platform.OS === 'web') {
    return shadows.web[level];
  }
  return shadows.android[level];
};

// Elevation levels for semantic use
export const elevation = {
  flat: getShadow('none'),
  card: getShadow('sm'),
  raised: getShadow('md'),
  floating: getShadow('lg'),
  modal: getShadow('xl'),
} as const;

