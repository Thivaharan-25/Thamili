/**
 * Onboarding Storage Utility
 * Manages onboarding tutorial completion status
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_COMPLETED_KEY = '@thamili_onboarding_completed';
const ONBOARDING_TUTORIAL_COMPLETED_KEY = '@thamili_onboarding_tutorial_completed';

/**
 * Check if onboarding has been completed
 */
export async function isOnboardingCompleted(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return false;
  }
}

/**
 * Mark onboarding as completed
 */
export async function setOnboardingCompleted(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
  } catch (error) {
    console.error('Error setting onboarding status:', error);
  }
}

/**
 * Check if tutorial has been completed
 */
export async function isTutorialCompleted(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_TUTORIAL_COMPLETED_KEY);
    return value === 'true';
  } catch (error) {
    console.error('Error checking tutorial status:', error);
    return false;
  }
}

/**
 * Mark tutorial as completed
 */
export async function setTutorialCompleted(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_TUTORIAL_COMPLETED_KEY, 'true');
  } catch (error) {
    console.error('Error setting tutorial status:', error);
  }
}

/**
 * Reset onboarding (for testing or re-onboarding)
 */
export async function resetOnboarding(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY);
    await AsyncStorage.removeItem(ONBOARDING_TUTORIAL_COMPLETED_KEY);
  } catch (error) {
    console.error('Error resetting onboarding:', error);
  }
}

