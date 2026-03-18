/**
 * Mock module for expo-notifications in Expo Go / development
 *
 * Metro config redirects `expo-notifications` to this file when NOT running
 * an EAS build. This prevents the "property is not configurable" runtime
 * crash that the real native module causes inside Expo Go.
 *
 * ⚠️  All methods here are no-ops that return safe defaults.
 *     Real push notifications ONLY work in an EAS build (eas build --profile ...).
 *     Run `expo start` / Expo Go only for UI development.
 */

console.log('🔵 [expo-notifications-mock] Development mock loaded — push notifications disabled in Expo Go.');

const mockNotifications = {
  setNotificationHandler: (_handler) => {
    // no-op in Expo Go
  },

  getPermissionsAsync: async () => {
    console.log('ℹ️  [expo-notifications-mock] getPermissionsAsync() — returning mock "undetermined" (EAS build required for real permissions)');
    return { status: 'undetermined', granted: false, canAskAgain: true };
  },

  requestPermissionsAsync: async () => {
    console.log('ℹ️  [expo-notifications-mock] requestPermissionsAsync() — skipped in Expo Go (EAS build required)');
    // Return 'undetermined' so callers know this is a mock, not a real denial
    return { status: 'undetermined', granted: false, canAskAgain: true };
  },

  getExpoPushTokenAsync: async (_options) => {
    console.warn('⚠️  [expo-notifications-mock] getExpoPushTokenAsync() called in Expo Go — returning mock token. This will NOT deliver real push notifications.');
    // Return a clearly-invalid token so callers (and DB records) can identify mocks
    return { data: 'MOCK_TOKEN_NOT_VALID_IN_EXPO_GO' };
  },

  addNotificationReceivedListener: (_listener) => {
    return { remove: () => {} };
  },

  addNotificationResponseReceivedListener: (_listener) => {
    return { remove: () => {} };
  },

  removeNotificationSubscription: (_subscription) => {},

  scheduleNotificationAsync: async (_request) => {
    console.log('ℹ️  [expo-notifications-mock] scheduleNotificationAsync() — no-op in Expo Go');
    return 'mock-notification-id';
  },

  cancelScheduledNotificationAsync: async (_id) => {},
  cancelAllScheduledNotificationsAsync: async () => {},
  getBadgeCountAsync: async () => 0,
  setBadgeCountAsync: async (_count) => {},
  dismissNotificationAsync: async (_id) => {},
  dismissAllNotificationsAsync: async () => {},
  getAllScheduledNotificationsAsync: async () => [],
  getPresentedNotificationsAsync: async () => [],

  // Android importance constants (safe stubs)
  AndroidImportance: {
    MAX: 5,
    HIGH: 4,
    DEFAULT: 3,
    LOW: 2,
    MIN: 1,
    NONE: 0,
  },

  setNotificationChannelAsync: async (_channelId, _channel) => {
    // no-op
    return null;
  },
};

module.exports = mockNotifications;
module.exports.default = mockNotifications;
