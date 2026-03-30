import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import {
  NavigationContainer,
  NavigationContainerRef,
  CommonActions
} from '@react-navigation/native';
import {
  createStackNavigator,
  CardStyleInterpolators,
  TransitionSpecs,
  StackNavigationOptions
} from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

// Store & Types
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { RootStackParamList } from '../types';

// Components
import { LoadingScreen, BrandedSplash, CartBadge, CustomTabBar, AdminDashboardSkeleton } from '../components';
import { colors } from '../theme';
import { pushNotificationService } from '../services/pushNotificationService';
import { useToast } from '../components';

// --- Screens Import ---
// Auth & Onboarding
import { LoginScreen, RegisterScreen, VerifyEmailScreen, ForgotPasswordScreen } from '../screens/auth';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import CountrySelectionScreen from '../screens/onboarding/CountrySelectionScreen';

// Customer Screens
import HomeScreen from '../screens/customer/HomeScreen';
import ProductsScreen from '../screens/customer/ProductsScreen';
import ProductDetailsScreen from '../screens/customer/ProductDetailsScreen';
import CartScreen from '../screens/customer/CartScreen';
import CheckoutScreen from '../screens/customer/CheckoutScreen';
import OrderConfirmationScreen from '../screens/customer/OrderConfirmationScreen';
import OrdersScreen from '../screens/customer/OrdersScreen';
import SharedOrderDetailsScreen from '../screens/shared/SharedOrderDetailsScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';
import EditProfileScreen from '../screens/customer/EditProfileScreen';
import ChangePasswordScreen from '../screens/customer/ChangePasswordScreen';
import SettingsScreen from '../screens/customer/SettingsScreen';

// Admin Screens
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminProductsScreen from '../screens/admin/AdminProductsScreen';
import AdminOrdersScreen from '../screens/admin/AdminOrdersScreen';
import AdminDeliveryScreen from '../screens/admin/AdminDeliveryScreen';
import AdminTopProductsScreen from '../screens/admin/AdminTopProductsScreen';

// ... (existing imports)


import AdminPickupPointsScreen from '../screens/admin/AdminPickupPointsScreen';
import AdminSettingsScreen from '../screens/admin/AdminSettingsScreen';
import NotificationHistoryScreen from '../screens/admin/NotificationHistoryScreen';
import AddProductScreen from '../screens/admin/AddProductScreen';
import EditProductScreen from '../screens/admin/EditProductScreen';
import AddPickupPointScreen from '../screens/admin/AddPickupPointScreen';
import EditPickupPointScreen from '../screens/admin/EditPickupPointScreen';
import AddDeliveryManScreen from '../screens/admin/AddDeliveryManScreen';
import ManageDeliveryManScreen from '../screens/admin/ManageDeliveryManScreen';
import AddressesScreen from '../screens/customer/AddressesScreen';
import PaymentsScreen from '../screens/customer/PaymentsScreen';
import DeliveryDashboardScreen from '../screens/delivery/DeliveryDashboardScreen';
import DeliveryVanSalesScreen from '../screens/delivery/DeliveryVanSalesScreen';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<any>();

// Deep link prefixes — read from env so no URL is hardcoded in source
import { ENV } from '../config/env';
const linking = {
  prefixes: ['thamili://', ENV.API_URL].filter(Boolean),
  config: {
    screens: {
      ProductDetails: 'product/:productId',
    },
  },
};

// --- UX Configurations ---

// 1. Standard Transition (Slide from right)
const standardScreenOptions: StackNavigationOptions = {
  headerShown: false,
  cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
  transitionSpec: {
    open: TransitionSpecs.TransitionIOSSpec,
    close: TransitionSpecs.TransitionIOSSpec,
  },
};

// 2. Modal Transition (Slide from bottom)
const modalScreenOptions: StackNavigationOptions = {
  headerShown: false,
  presentation: 'modal',
  cardStyleInterpolator: CardStyleInterpolators.forModalPresentationIOS,
  gestureEnabled: true,
  gestureDirection: 'vertical',
};

// 3. Detail Transition (Fade)
const detailScreenOptions: StackNavigationOptions = {
  headerShown: false,
  cardStyleInterpolator: CardStyleInterpolators.forFadeFromBottomAndroid,
};

// --- Helper for Tab Icons (Fixes TypeScript Error & Clean Code) ---
const getTabBarIcon = (name: string, focused: boolean, color: string, showBadge: boolean = false) => {
  // Fix: 'package-variant' does not have an '-outline' variant in MaterialCommunityIcons
  // So we use the same icon for both states, or we could map to a different icon
  const iconName = focused
    ? name
    : (name === 'package-variant' ? 'package-variant' : `${name}-outline`);

  return (
    <View style={styles.iconContainer}>
      <Icon
        name={iconName as any}
        size={24}
        color={color}
      />
      {showBadge && <CartBadge />}
    </View>
  );
};

// Helper to create Tab screens and reduce boilerplate
const createTabScreen = (
  name: string,
  component: React.ComponentType<any>,
  title: string,
  icon: string,
  showBadge: boolean = false
) => (
  <Tab.Screen
    name={name}
    component={component}
    options={{
      title,
      tabBarIcon: ({ focused, color }: { focused: boolean; color: string }) => getTabBarIcon(icon, focused, color, showBadge),
    }}
  />
);

// --- Unified MainTabs: picks the right tab navigator based on auth state ---
// Keeping this as a single component means Stack.Screen name="Main" never changes,
// so React Navigation never resets the stack when the user logs in/out.
const MainTabs = () => {
  const { isAuthenticated, user } = useAuthStore();
  const userRole = user?.role ? user.role.toLowerCase().trim() : 'customer';

  const tabNavScreenOptions = {
    headerShown: false,
    // White background prevents the black flash during tab navigator remount
    sceneContainerStyle: { backgroundColor: 'white' },
    // Only mount a tab screen when it is first visited — saves memory + startup time
    lazy: true,
  };

  if (!isAuthenticated) {
    return (
      <Tab.Navigator
        tabBar={(props: any) => <CustomTabBar {...props} />}
        screenOptions={tabNavScreenOptions}
      >
        {createTabScreen('Home', HomeScreen, 'Home', 'home')}
        {createTabScreen('Products', ProductsScreen, 'Products', 'store')}
      </Tab.Navigator>
    );
  }

  if (userRole === 'admin') {
    return (
      <Tab.Navigator
        initialRouteName="Dashboard"
        tabBar={(props: any) => <CustomTabBar {...props} />}
        screenOptions={tabNavScreenOptions}
      >
        {createTabScreen('Dashboard', AdminDashboardScreen, 'Dashboard', 'view-dashboard')}
        {createTabScreen('Products', AdminProductsScreen, 'Products', 'store')}
        {createTabScreen('Orders', AdminOrdersScreen, 'Orders', 'package-variant')}
        {createTabScreen('Delivery', AdminDeliveryScreen, 'Delivery', 'truck-delivery')}
        {createTabScreen('PickupPoints', AdminPickupPointsScreen, 'Pickup Points', 'map-marker')}
        {createTabScreen('Profile', ProfileScreen, 'Profile', 'account')}
      </Tab.Navigator>
    );
  }

  if (userRole === 'delivery_partner') {
    return (
      <Tab.Navigator
        tabBar={(props: any) => <CustomTabBar {...props} />}
        screenOptions={tabNavScreenOptions}
      >
        {createTabScreen('Dashboard', DeliveryDashboardScreen, 'Dashboard', 'truck-delivery')}
        {createTabScreen('VanSales', DeliveryVanSalesScreen, 'Van Sales', 'store')}
        {createTabScreen('Profile', ProfileScreen, 'Profile', 'account')}
      </Tab.Navigator>
    );
  }

  // Default: customer
  return (
    <Tab.Navigator
      initialRouteName="Home"
      tabBar={(props: any) => <CustomTabBar {...props} />}
      screenOptions={tabNavScreenOptions}
    >
      {createTabScreen('Home', HomeScreen, 'Home', 'home')}
      {createTabScreen('Products', ProductsScreen, 'Products', 'store')}
      {createTabScreen('Cart', CartScreen, 'Cart', 'cart', true)}
      {createTabScreen('Orders', OrdersScreen, 'Orders', 'package-variant')}
      {createTabScreen('Profile', ProfileScreen, 'Profile', 'account')}
    </Tab.Navigator>
  );
};

// Keep Stack screen component stable across auth/role transitions.
const SettingsEntryScreen = () => {
  const { user } = useAuthStore();
  const userRole = user?.role ? user.role.toLowerCase().trim() : 'customer';
  return userRole === 'admin' ? <AdminSettingsScreen /> : <SettingsScreen />;
};

// --- Main App Navigator ---

const AppNavigator = () => {
  const { isAuthenticated, user, isLoading, loadSession, setupAuthListener, checkOnboardingStatus, handleAuthCallback } = useAuthStore();
  const { countrySelected, loadCountry, hasLoadedCountry } = useCartStore();

  // Typed Ref
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  // State for initial loading - only show loading screen on initial app load
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // All hooks must be called before any conditional returns
  useEffect(() => {
    loadSession();
    setupAuthListener();
    checkOnboardingStatus();
    loadCountry();

    // Listen for deep links (e.g. auth callbacks)
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (__DEV__) console.log('🔗 [AppNavigator] Deep link received:', url);
      if (url.includes('access_token') || url.includes('refresh_token')) {
        handleAuthCallback(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // 🔔 PUSH NOTIFICATIONS REGISTRATION & LISTENERS
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    const setupNotifications = async () => {
      // Only register if authenticated and user exists
      if (isAuthenticated && user?.id) {
        if (__DEV__) console.log('🔔 [AppNavigator] Setting up notifications for user:', user.id);

        try {
          // 1. Register Token (triggers permission request)
          await pushNotificationService.registerToken(user.id);
          if (cancelled) return;
          if (__DEV__) console.log('✅ [AppNavigator] Notification token registration completed');

          // 2. Setup Listeners
          cleanup = await pushNotificationService.setupListeners(
            (notification) => {
              if (__DEV__) console.log('📬 [AppNavigator] Notification Received:', notification);
            },
            (response) => {
              if (__DEV__) console.log('📑 [AppNavigator] Notification Tapped:', response);
              const data = response.notification.request.content.data;

              // 🔔 MARK AS READ ON TAP
              if (data?.notificationId && user?.id) {
                try {
                  const { notificationService } = require('../services/notificationService');
                  notificationService.markAsRead(user.id, data.notificationId).catch((err: any) => {
                    if (__DEV__) console.warn('[AppNavigator] Failed to mark notification as read on tap:', err);
                  });
                } catch (e) {
                  if (__DEV__) console.warn('[AppNavigator] Could not load notificationService for tap handle');
                }
              }

              if (data?.orderId && navigationRef.current) {
                // @ts-ignore - Dynamic navigation
                navigationRef.current.navigate('OrderDetails', { orderId: data.orderId });
              }
            }
          );
        } catch (error) {
          if (!cancelled && __DEV__) console.error('❌ [AppNavigator] Error setting up notifications:', error);
        }
      }
    };

    setupNotifications();

    return () => {
      cancelled = true;
      if (cleanup) cleanup();
    };
  }, [isAuthenticated, user?.id]);

  // Navigate programmatically when auth state changes.
  // Since the Stack screen list is now fixed (never changes), React Navigation
  // no longer resets automatically on login/logout — we must navigate explicitly.
  // Debounced to prevent rapid auth state changes from causing multiple resets.
  const lastAuthResetRef = useRef<number>(0);
  useEffect(() => {
    if (isInitialLoading) return;

    if (!navigationRef.current) {
      if (__DEV__) console.warn('⚠️ [AppNavigator] Navigation ref not ready during auth change');
      return;
    }

    // Debounce: skip if last reset was <500ms ago
    const now = Date.now();
    if (now - lastAuthResetRef.current < 500) {
      if (__DEV__) console.log('[AppNavigator] Skipping rapid auth reset');
      return;
    }

    if (__DEV__) console.log(`🔄 [AppNavigator] Auth state changed: isAuthenticated=${isAuthenticated}`);

    // Defer reset to next tick to avoid transient descriptor races during auth/logout transitions.
    const timer = setTimeout(() => {
      try {
        const nav = navigationRef.current;
        if (!nav || (typeof (nav as any).isReady === 'function' && !(nav as any).isReady())) {
          if (__DEV__) console.warn('[AppNavigator] Navigation not ready for reset');
          return;
        }

        const { countrySelected } = useCartStore.getState();
        const hasCountrySelected = isAuthenticated && user?.country_preference
          ? true
          : countrySelected;

        lastAuthResetRef.current = Date.now();
        nav.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: hasCountrySelected ? 'Main' : 'CountrySelection' }],
          })
        );
        if (__DEV__) console.log('[AppNavigator] Navigation reset successful');
      } catch (error) {
        if (__DEV__) console.error('[AppNavigator] Failed to reset navigation:', error);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  // Only show loading screen on initial app load, not during auth operations
  // This prevents navigation reset during registration/login flows
  useEffect(() => {
    // Set initial loading to false after first session load completes
    if (!isLoading && isInitialLoading) {
      // Small delay to ensure session is fully loaded
      const timer = setTimeout(() => {
        setIsInitialLoading(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isInitialLoading]);

  // Wait for country loading and initial auth session checking to finish
  if (isInitialLoading || !hasLoadedCountry) {
    // Show role-specific skeleton for Admins if session is already available
    if (isAuthenticated && user?.role?.toLowerCase().trim() === 'admin') {
      return <AdminDashboardSkeleton />;
    }
    return <BrandedSplash />;
  }

  // Check if country is selected (required for all users)
  const hasCountrySelected = isAuthenticated && user?.country_preference
    ? true
    : countrySelected;

  // Determine initial route
  const initialRoute = !hasCountrySelected ? 'CountrySelection' : 'Main';

  return (
    // @ts-ignore - Conflict between React 19 types and React Navigation children
    <NavigationContainer ref={navigationRef} linking={linking}>
      <Stack.Navigator
        screenOptions={standardScreenOptions}
        initialRouteName={initialRoute}
      >
        {/* CountrySelection flow – only shown before a country is picked */}
        <Stack.Screen
          name="CountrySelection"
          component={CountrySelectionScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Welcome" component={WelcomeScreen} />

        {/* Main – always maps to MainTabs which switches internally.
            This is the key fix: the screen list never changes, so React
            Navigation never resets the stack on auth state changes. */}
        <Stack.Screen name="Main" component={MainTabs} />

        {/* Auth screens */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />

        {/* Shared detail screens */}
        <Stack.Screen
          name="ProductDetails"
          component={ProductDetailsScreen}
          options={detailScreenOptions}
        />
        <Stack.Screen
          name="OrderDetails"
          component={SharedOrderDetailsScreen}
        />
        <Stack.Screen
          name="Checkout"
          component={CheckoutScreen}
          options={standardScreenOptions}
        />
        <Stack.Screen
          name="OrderConfirmation"
          component={OrderConfirmationScreen}
          options={detailScreenOptions}
        />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        <Stack.Screen name="Settings" component={SettingsEntryScreen} />
        <Stack.Screen name="Addresses" component={AddressesScreen} />
        <Stack.Screen name="Payments" component={PaymentsScreen} />

        {/* Admin-only screens */}
        <Stack.Screen name="AddProduct" component={AddProductScreen} />
        <Stack.Screen name="EditProduct" component={EditProductScreen} />
        <Stack.Screen name="AddPickupPoint" component={AddPickupPointScreen} />
        <Stack.Screen name="EditPickupPoint" component={EditPickupPointScreen} />
        <Stack.Screen name="NotificationHistory" component={NotificationHistoryScreen} />
        <Stack.Screen name="AdminTopProducts" component={AdminTopProductsScreen} />
        <Stack.Screen name="AddDeliveryMan" component={AddDeliveryManScreen} />
        <Stack.Screen name="ManageDeliveryMan" component={ManageDeliveryManScreen} />

        {/* Delivery-only screens */}
        <Stack.Screen name="DeliveryOrderDetails" component={SharedOrderDetailsScreen} />
        <Stack.Screen name="DeliveryVanSales" component={DeliveryVanSalesScreen} />
      </Stack.Navigator>
    </NavigationContainer >
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AppNavigator;
