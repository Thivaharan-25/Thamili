// This service uses lazy loading to prevent Expo Go conflicts
// No module-level code execution - everything is lazy-loaded

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabase } from './supabase';

const STORAGE_KEY = 'expo_push_token';

// Module state (initialized to null, no module-level code execution)
let notificationHandlerSet = false;
let NotificationsModule: any = null;
let isInitialized = false;

/**
 * Check if we're running inside Expo Go (not a real dev/production build).
 * Expo SDK 50+ deprecated executionEnvironment — use appOwnership instead.
 *   - appOwnership === 'expo'  → Expo Go
 *   - appOwnership === null    → dev client or production build
 * We keep the legacy executionEnvironment check as a fallback for older SDKs.
 */
const isExpoGo = (): boolean => {
  try {
    const Constants = require('expo-constants');
    return (
      Constants?.appOwnership === 'expo' ||
      Constants?.executionEnvironment === 'storeClient'
    );
  } catch {
    return false;
  }
};

/**
 * @deprecated — kept for backwards compat, now delegates to isExpoGo()
 */
const shouldSkipNotifications = (): boolean => isExpoGo();

/**
 * Safely initialize expo-notifications module.
 * - Expo Go: skip (the real module crashes in Expo Go with "property is not configurable")
 * - Dev client / production: use the real native module
 */
const initNotificationsModule = async (): Promise<boolean> => {
  if (isInitialized) {
    return NotificationsModule !== null;
  }

  isInitialized = true;

  // Skip entirely in Expo Go to avoid "property is not configurable" crash
  if (isExpoGo()) {
    if (__DEV__) {
      console.log('ℹ️  [pushNotificationService] Expo Go detected — push notifications disabled. Use a dev client build for real notifications.');
    }
    NotificationsModule = null;
    return false;
  }

  try {
    const module = await import('expo-notifications');
    const notificationsModule = (module as any).default || module;

    if (notificationsModule && typeof notificationsModule === 'object') {
      NotificationsModule = notificationsModule;
      return true;
    }

    NotificationsModule = null;
    return false;
  } catch (error: any) {
    if (__DEV__) {
      console.warn('⚠️  [pushNotificationService] Failed to load expo-notifications:', error?.message || error);
    }
    NotificationsModule = null;
    return false;
  }
};

/**
 * Initialize notification handler (called automatically when needed)
 * This is safe to call even if expo-notifications is not available
 */
const ensureNotificationHandler = async () => {
  if (notificationHandlerSet) {
    return;
  }

  try {
    const available = await initNotificationsModule();
    if (!available || !NotificationsModule) {
      return; // Silently fail - notifications not available
    }

    NotificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,   // legacy (SDK <52)
        shouldShowBanner: true,  // SDK 52+
        shouldShowList: true,    // SDK 52+
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    notificationHandlerSet = true;
  } catch (error) {
    // Silently fail - notifications are optional
  }
};

/**
 * Public export for manual initialization if needed
 * Note: This will be called automatically when service methods are used
 */
export const initializeNotificationHandler = ensureNotificationHandler;

// Export service object (no code execution here, just object definition)
export const pushNotificationService = {
  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      // Ensure handler is set up first
      await ensureNotificationHandler();

      const available = await initNotificationsModule();
      if (!available || !NotificationsModule) {
        return false;
      }

      const { status: existingStatus } = await NotificationsModule.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await NotificationsModule.requestPermissionsAsync();
        finalStatus = status;
      }

      const hasPermission = finalStatus === 'granted';
      
      if (hasPermission && Platform.OS === 'android') {
        await NotificationsModule.setNotificationChannelAsync('default', {
          name: 'default',
          importance: NotificationsModule.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      console.log('📡 [pushNotificationService] Notification permission status:', finalStatus, hasPermission ? '✅' : '❌');
      return hasPermission;
    } catch (error) {
      console.error('❌ [pushNotificationService] Error requesting notification permissions:', error);
      return false;
    }
  },

  /**
   * Get Expo push token
   */
  async getPushToken(): Promise<string | null> {
    try {
      const available = await initNotificationsModule();
      if (!available || !NotificationsModule) {
        return null;
      }

      // Check if we have a cached token
      const cachedToken = await AsyncStorage.getItem(STORAGE_KEY);
      if (cachedToken) {
        return cachedToken;
      }

      // Request permissions first
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      // Get the push token
      // In standalone builds, projectId is mandatory for Expo Push Tokens
      let projectId: string | undefined;

      try {
        const Constants = require('expo-constants');
        // Try all known paths where expo-constants exposes the projectId
        projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ??
          Constants?.easConfig?.projectId ??
          Constants?.manifest2?.extra?.expoClient?.extra?.eas?.projectId ??
          Constants?.manifest?.extra?.eas?.projectId;

        console.log('📡 [pushNotificationService] Found projectId from Constants:', projectId);
      } catch (err) {
        console.warn('⚠️ [pushNotificationService] Could not load expo-constants for projectId');
      }

      // Fallback to the known projectId from app.json if Constants didn't resolve it.
      // This is safe to hardcode — it is a public project identifier, not a secret.
      if (!projectId) {
        projectId = 'b71e784c-ccd0-4d08-b1d4-ad3b379387d4';
        console.log('📡 [pushNotificationService] Using fallback projectId from app.json:', projectId);
      }

      console.log('📡 [pushNotificationService] Calling getExpoPushTokenAsync with projectId:', projectId);

      const tokenData = await NotificationsModule.getExpoPushTokenAsync({ 
        projectId,
      });
      const token = tokenData.data;

      // Reject mock/invalid tokens — they come from the Expo Go mock and
      // would be stored in the database but never actually deliver notifications.
      if (!token || token.includes('MOCK') || token === 'mock-token-expo-go' || token.includes('NOT_VALID')) {
        console.warn('⚠️ [pushNotificationService] Received a mock/invalid push token — skipping registration. Build with EAS for real push tokens.');
        return null;
      }

      // Validate it looks like a real Expo push token
      if (!token.startsWith('ExponentPushToken[') && !token.startsWith('ExpoPushToken[')) {
        console.warn('⚠️ [pushNotificationService] Token does not look like a valid Expo push token:', token.substring(0, 30));
        return null;
      }

      console.log('✅ [pushNotificationService] Received valid push token:', token.substring(0, 20) + '...');

      // Cache the token
      await AsyncStorage.setItem(STORAGE_KEY, token);

      return token;
    } catch (error: any) {
      console.error('❌ [pushNotificationService] getExpoPushTokenAsync failed:', error?.message || error);
      console.error('❌ [pushNotificationService] Full error details:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack?.split('\n')?.slice(0, 5)?.join('\n'),
      });
      return null;
    }
  },

  /**
   * Register push token with backend
   */
  async registerToken(userId: string): Promise<void> {
    try {
      // Guard: skip if we already registered this session (prevents double calls on login)
      const cachedToken = await AsyncStorage.getItem(STORAGE_KEY);
      if (cachedToken) {
        console.log('ℹ️ [pushNotificationService] Token already cached, skipping re-registration');
        return;
      }
      console.log('🔔 [pushNotificationService] Starting token registration for user:', userId);

      const token = await this.getPushToken();
      if (!token) {
        console.error('❌ [pushNotificationService] Failed to get push token - registration aborted. Possible reasons: Permissions denied, Expo not configured, or running in Emulator without Play Services.');
        return;
      }

      console.log('📤 [pushNotificationService] Saving token to database:', { userId, token: token.substring(0, 10) + '...' });
      const supabase = getSupabase();
      const { error, data } = await supabase
        .from('user_push_tokens')
        .upsert({
          user_id: userId,
          push_token: token,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,push_token'
        });

      if (error) {
        // If table doesn't exist yet, just log and continue
        if (error.code === 'PGRST204' || error.message?.includes('Could not find the table')) {
          console.error('❌ [pushNotificationService] CRITICAL: user_push_tokens table not found in Supabase! System notifications will NOT work.');
          console.info('💡 Action required: Please run database/migration_push_tokens.sql in your Supabase SQL Editor.');
          return;
        }
        console.error('❌ [pushNotificationService] Supabase token registration error:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log('✅ [pushNotificationService] Push token registered successfully in Supabase (upserted)');
    } catch (error: any) {
      console.error('❌ [pushNotificationService] Error registering push token:', {
        message: error?.message,
        code: error?.code,
        details: error?.details
      });
      // Don't throw to avoid blocking app initialization
    }
  },

  /**
   * Get registration status for debugging
   */
  async getRegistrationStatus(): Promise<{
    isInitialized: boolean;
    hasToken: boolean;
    token?: string;
    skipped: boolean;
  }> {
    const skipped = shouldSkipNotifications();
    const token = await AsyncStorage.getItem(STORAGE_KEY);
    
    return {
      isInitialized,
      hasToken: !!token,
      token: token || undefined,
      skipped
    };
  },

  /**
   * Send a local notification (for testing engine health)
   */
  async sendLocalNotification(title: string, body: string, data?: any): Promise<boolean> {
    try {
      const available = await initNotificationsModule();
      if (!available) {
        console.warn('⚠️ [pushNotificationService] Notifications module not available for local test');
        return false;
      }

      console.log('🧪 [pushNotificationService] Sending local test notification...');
      await NotificationsModule.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || { test: true },
          sound: true,
          priority: 'high',
        },
        trigger: null, // Send immediately
      });
      return true;
    } catch (error: any) {
      console.error('❌ [pushNotificationService] Local notification failed:', error?.message);
      return false;
    }
  },

  /**
   * Unregister push token from backend (on logout)
   */
  async unregisterToken(userId: string): Promise<void> {
    try {
      console.log('🔔 [pushNotificationService] Unregistering token for user:', userId);

      // Get the current token
      const token = await AsyncStorage.getItem(STORAGE_KEY);
      if (!token) {
        console.log('ℹ️ [pushNotificationService] No token found in storage to unregister');
        return;
      }

      const supabase = getSupabase();
      const { error } = await supabase
        .from('user_push_tokens')
        .delete()
        .eq('user_id', userId)
        .eq('push_token', token);

      if (error) {
        console.warn('⚠️ [pushNotificationService] Error deleting push token:', error.message);
      } else {
        console.log('✅ [pushNotificationService] Push token unregistered successfully');
      }

      // Also clear from local storage
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error: any) {
      console.error('❌ [pushNotificationService] Error unregistering push token:', error?.message);
    }
  },

  /**
   * Set up notification listeners
   */
  async setupListeners(
    onNotificationReceived: (notification: any) => void,
    onNotificationTapped: (response: any) => void
  ) {
    const available = await initNotificationsModule();
    if (!available || !NotificationsModule) {
      return () => { }; // Return empty cleanup function
    }

    // Listener for notifications received while app is foregrounded
    const receivedListener = (NotificationsModule.addNotificationReceivedListener && 
      typeof NotificationsModule.addNotificationReceivedListener === 'function')
      ? NotificationsModule.addNotificationReceivedListener(onNotificationReceived)
      : null;

    // Listener for when user taps on notification
    const responseListener = (NotificationsModule.addNotificationResponseReceivedListener && 
      typeof NotificationsModule.addNotificationResponseReceivedListener === 'function')
      ? NotificationsModule.addNotificationResponseReceivedListener(onNotificationTapped)
      : null;

    return () => {
      if (receivedListener && NotificationsModule.removeNotificationSubscription) {
        NotificationsModule.removeNotificationSubscription(receivedListener);
      }
      if (responseListener && NotificationsModule.removeNotificationSubscription) {
        NotificationsModule.removeNotificationSubscription(responseListener);
      }
    };
  },

  /**
   * Schedule a local notification (for testing)
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<string> {
    try {
      const available = await initNotificationsModule();
      if (!available || !NotificationsModule) {
        throw new Error('expo-notifications not available');
      }

      const notificationId = await NotificationsModule.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: null, // Show immediately
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  },
};