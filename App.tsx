/**
 * Thamili Mobile App
 * React Native Application for Fish & Vegetables Store
 */

import 'react-native-url-polyfill/auto';
import './global.css';

import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider, MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { QueryClientProvider } from '@tanstack/react-query';

import { ErrorBoundary } from './src/components';
import { validateEnv } from './src/config/env';
import { queryClient } from './src/config/queryClient';
import './src/i18n';

import StripeProviderWrapper from './src/components/StripeProviderWrapper';
import AppNavigator from './src/navigation/AppNavigator';
import { useCartStore } from './src/store/cartStore';
import { useAuthStore } from './src/store/authStore';
import { useThemeStore } from './src/store/themeStore';
import { useProductStore } from './src/store/productStore';
import { initializeOfflineQueue } from './src/utils/offlineQueue';
import { OfflineStatusIndicator } from './src/components';
import { pushNotificationService } from './src/services/pushNotificationService';

// 🔑 LOADING SYSTEM IMPORTS
import { LoadingProvider } from './src/contexts/LoadingContext';
import { GlobalLoadingOverlay } from './src/components/GlobalLoadingOverlay';
import { ToastProvider } from './src/components/Toast';

import { colors } from './src/theme/colors';
import { darkColors } from './src/theme/darkColors';

const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary[500],
    secondary: colors.secondary[500],
    error: colors.error[500],
    background: colors.background.default,
    surface: colors.background.secondary,
    text: colors.text.primary,
  },
};

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: darkColors.primary[500],
    secondary: darkColors.neutral[500],
    error: darkColors.error[500],
    background: darkColors.background.primary,
    surface: darkColors.background.secondary,
    text: darkColors.text.primary,
  },
};

// 💡 INTERNAL COMPONENT TO ACCESS THE APP LOGIC
function AppContent() {
  const loadCart = useCartStore((state) => state.loadCart);
  const loadCountry = useCartStore((state) => state.loadCountry);
  const { isDark, loadThemePreference } = useThemeStore();
  const loadProductCache = useProductStore((state) => state.loadFromCache);

  useEffect(() => {
    // Validate and Initialize App Data
    validateEnv();
    loadThemePreference();
    loadCart();
    loadCountry();
    loadProductCache();
    initializeOfflineQueue().catch((error) => {
      console.error('Error initializing offline queue:', error);
    });

    // 🔔 Request notification permissions on first app launch.
    // This must run in a real EAS build — in Expo Go the module is mocked
    // and will return false, but won't crash. The permission dialog appears
    // once and is remembered by the OS on subsequent launches.
    pushNotificationService.requestPermissions().then((granted) => {
      if (granted) {
        console.log('✅ [App] Notification permissions granted');
      } else {
        console.log('ℹ️ [App] Notification permissions not granted (Expo Go mock or user denied)');
      }
    }).catch((err) => {
      // Non-critical: never block app startup because of notification setup
      console.warn('⚠️ [App] Notification permission request failed:', err?.message);
    });
  }, [loadCart, loadCountry, loadThemePreference]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={isDark ? darkTheme : lightTheme}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent
        />

        {/* Main App Navigation */}
        <AppNavigator />

        {/* Offline Status UI */}
        <OfflineStatusIndicator />

        {/* 🎨 GLOBAL LOADING OVERLAY (Glassmorphism Effect) */}
        <GlobalLoadingOverlay />
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

// 🏗️ ROOT COMPONENT
function App(): React.JSX.Element {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const authUserId = useAuthStore((state) => state.user?.id || 'guest');

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ErrorBoundary resetKeys={[isAuthenticated ? 'auth' : 'guest', authUserId]}>
        <LoadingProvider>
          <ToastProvider>
            <StripeProviderWrapper>
              <QueryClientProvider client={queryClient}>
                <AppContent />
              </QueryClientProvider>
            </StripeProviderWrapper>
          </ToastProvider>
        </LoadingProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

export default App;
