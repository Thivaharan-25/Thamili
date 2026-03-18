/**
 * Theme Hook
 * Provides theme colors and dark mode state
 */

import { useThemeStore } from '../store/themeStore';
import { colors } from '../theme/colors';
import { darkColors } from '../theme/darkColors';

export const useTheme = () => {
  const { isDark } = useThemeStore();
  
  return {
    isDark,
    colors: isDark ? darkColors : colors,
    // Helper to get color based on theme
    getColor: (lightColor: string, darkColor: string) => {
      return isDark ? darkColor : lightColor;
    },
  };
};

