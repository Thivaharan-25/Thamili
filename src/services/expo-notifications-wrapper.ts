/**
 * Wrapper for expo-notifications that uses a mock in development/Expo Go
 * This prevents "property is not configurable" errors
 * 
 * Metro config redirects expo-notifications imports to this file
 * We always export the mock to prevent the error
 */

console.log('🔵 [expo-notifications-wrapper] Loading wrapper...');

// Import the mock (CommonJS module)
console.log('🔵 [expo-notifications-wrapper] Requiring mock module...');
const mockNotifications = require('./mocks/expo-notifications-mock');
console.log('✅ [expo-notifications-wrapper] Mock module loaded:', Object.keys(mockNotifications));

// Simple re-export - NO Object.defineProperty to avoid "not configurable" errors
// Just spread the mock object
const expoNotificationsWrapper = {
  ...mockNotifications,
};

console.log('✅ [expo-notifications-wrapper] Wrapper created');

// Export default
export default expoNotificationsWrapper;

// Named exports - simple destructuring, no defineProperty
export const {
  setNotificationHandler,
  getPermissionsAsync,
  requestPermissionsAsync,
  getExpoPushTokenAsync,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  removeNotificationSubscription,
  scheduleNotificationAsync,
  cancelScheduledNotificationAsync,
  cancelAllScheduledNotificationsAsync,
  getBadgeCountAsync,
  setBadgeCountAsync,
  dismissNotificationAsync,
  dismissAllNotificationsAsync,
  getAllScheduledNotificationsAsync,
  getPresentedNotificationsAsync,
} = expoNotificationsWrapper;

console.log('✅ [expo-notifications-wrapper] Wrapper exported successfully');
