/**
 * Theme Store
 * Manages dark mode and theme preferences
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, ColorSchemeName } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  loadThemePreference: () => Promise<void>;
}

const THEME_STORAGE_KEY = '@thamili_theme_mode';

export const useThemeStore = create<ThemeState>((set, get) => {
  // Initialize with system preference
  const systemColorScheme = Appearance.getColorScheme();
  const initialIsDark = systemColorScheme === 'dark';

  return {
    themeMode: 'system',
    isDark: initialIsDark,
    
    setThemeMode: async (mode: ThemeMode) => {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      
      let isDark = false;
      if (mode === 'dark') {
        isDark = true;
      } else if (mode === 'light') {
        isDark = false;
      } else {
        // system mode
        const systemScheme = Appearance.getColorScheme();
        isDark = systemScheme === 'dark';
      }
      
      set({ themeMode: mode, isDark });
    },
    
    loadThemePreference: async () => {
      try {
        const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedMode && (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system')) {
          const mode = savedMode as ThemeMode;
          let isDark = false;
          
          if (mode === 'dark') {
            isDark = true;
          } else if (mode === 'light') {
            isDark = false;
          } else {
            const systemScheme = Appearance.getColorScheme();
            isDark = systemScheme === 'dark';
          }
          
          set({ themeMode: mode, isDark });
        } else {
          // Default to system
          const systemScheme = Appearance.getColorScheme();
          set({ themeMode: 'system', isDark: systemScheme === 'dark' });
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
        const systemScheme = Appearance.getColorScheme();
        set({ themeMode: 'system', isDark: systemScheme === 'dark' });
      }
    },
  };
});

// Listen to system theme changes
Appearance.addChangeListener(({ colorScheme }) => {
  const { themeMode } = useThemeStore.getState();
  if (themeMode === 'system') {
    useThemeStore.setState({ isDark: colorScheme === 'dark' });
  }
});

