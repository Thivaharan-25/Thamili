/**
 * Haptic Feedback Utilities
 * Provides haptic feedback for better UX
 * Safe wrapper for Expo Go and web compatibility
 */

import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// Check if haptics are available (not on web)
const isHapticsAvailable = Platform.OS !== 'web';

/**
 * Light haptic feedback (for subtle interactions)
 */
export const lightHaptic = () => {
  if (!isHapticsAvailable) return;
  // Fire and forget - don't block UI
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
    // Haptics not available, silently fail
  });
};

/**
 * Medium haptic feedback (for standard interactions)
 */
export const mediumHaptic = () => {
  if (!isHapticsAvailable) return;
  // Fire and forget - don't block UI
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {
    // Haptics not available, silently fail
  });
};

/**
 * Heavy haptic feedback (for important interactions)
 */
export const heavyHaptic = () => {
  if (!isHapticsAvailable) return;
  // Fire and forget - don't block UI
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {
    // Haptics not available, silently fail
  });
};

/**
 * Success haptic feedback
 */
export const successHaptic = () => {
  if (!isHapticsAvailable) return;
  // Fire and forget - don't block UI
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {
    // Haptics not available, silently fail
  });
};

/**
 * Warning haptic feedback
 */
export const warningHaptic = () => {
  if (!isHapticsAvailable) return;
  // Fire and forget - don't block UI
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {
    // Haptics not available, silently fail
  });
};

/**
 * Error haptic feedback
 */
export const errorHaptic = () => {
  if (!isHapticsAvailable) return;
  // Fire and forget - don't block UI
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {
    // Haptics not available, silently fail
  });
};

/**
 * Selection haptic feedback (for pickers, switches, etc.)
 */
export const selectionHaptic = () => {
  if (!isHapticsAvailable) return;
  // Fire and forget - don't block UI
  Haptics.selectionAsync().catch(() => {
    // Haptics not available, silently fail
  });
};

