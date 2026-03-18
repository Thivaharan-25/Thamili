/**
 * Safe Reanimated Import for Expo Go
 * Prevents NullPointerException by checking if native module is available
 */

// Check if we're in Expo Go
const isExpoGo = typeof (global as any).__DEV__ !== 'undefined' && 
  !!(global as any).__DEV__ && 
  typeof (global as any).expo !== 'undefined';

let Reanimated: any = null;
let isAvailable = false;

if (!isExpoGo) {
  // In development builds, reanimated should work
  try {
    Reanimated = require('react-native-reanimated');
    isAvailable = true;
  } catch (e) {
    console.warn('⚠️ react-native-reanimated not available');
  }
} else {
  // In Expo Go, try to load but handle errors gracefully
  try {
    Reanimated = require('react-native-reanimated');
    // Test if native module is actually available
    if (Reanimated && typeof Reanimated.useSharedValue === 'function') {
      isAvailable = true;
    }
  } catch (e: any) {
    console.warn('⚠️ react-native-reanimated not available in Expo Go, using fallbacks');
    isAvailable = false;
  }
}

// Export safe reanimated module
export default Reanimated;
export { isAvailable as isReanimatedAvailable };

