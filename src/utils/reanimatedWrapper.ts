import React from 'react';

/**
 * Safe Reanimated Wrapper for Expo Go
 * Handles cases where reanimated native module might not be available
 * This prevents NullPointerException errors in Expo Go
 */

let reanimatedAvailable = false;
let Reanimated: any = null;

// Try to load reanimated, but don't crash if it fails
try {
  Reanimated = require('react-native-reanimated');
  // Check if the module is actually available (not just the JS side)
  if (Reanimated && typeof Reanimated.useSharedValue === 'function') {
    // Try to create a test shared value to verify native module works
    try {
      // Create a dummy value to test
      const test = Reanimated.makeMutable ? Reanimated.makeMutable(0) : { value: 0 };
      if (test && typeof test.value !== 'undefined') {
        reanimatedAvailable = true;
        console.log('✅ react-native-reanimated is available');
      }
    } catch (e) {
      console.warn('⚠️ react-native-reanimated native module not available, using fallbacks');
      reanimatedAvailable = false;
    }
  }
} catch (error: any) {
  console.warn('⚠️ react-native-reanimated not available, using fallbacks:', error?.message);
  reanimatedAvailable = false;
}

// Create a simple mock for shared values
class MockSharedValue {
  _value: any;
  constructor(value: any) {
    this._value = value;
  }
  get value() {
    return this._value;
  }
  set value(newValue: any) {
    this._value = newValue;
  }
}

// Stable hook fallbacks
const useMockSharedValue = (value: any) => {
  const ref = React.useRef(new MockSharedValue(value));
  return ref.current;
};

const useMockAnimatedStyle = () => ({});

// Export safe wrappers as stable references
export const useSharedValue =
  reanimatedAvailable && Reanimated?.useSharedValue
    ? Reanimated.useSharedValue
    : useMockSharedValue;

export const useAnimatedStyle =
  reanimatedAvailable && Reanimated?.useAnimatedStyle
    ? Reanimated.useAnimatedStyle
    : useMockAnimatedStyle;

export const withTiming = (toValue: any, config?: any, callback?: (finished: boolean) => void) => {
  if (!reanimatedAvailable || !Reanimated?.withTiming) {
    if (callback) callback(true);
    return toValue;
  }
  return Reanimated.withTiming(toValue, config, callback);
};

export const withSpring = (toValue: any, config?: any, callback?: (finished: boolean) => void) => {
  if (!reanimatedAvailable || !Reanimated?.withSpring) {
    if (callback) callback(true);
    return toValue;
  }
  return Reanimated.withSpring(toValue, config, callback);
};

export const createAnimatedComponent = (Component: any) => {
  if (!reanimatedAvailable || !Reanimated) {
    return Component;
  }
  try {
    return Reanimated.default?.createAnimatedComponent?.(Component) || Reanimated.createAnimatedComponent?.(Component) || Component;
  } catch (error) {
    console.warn('⚠️ createAnimatedComponent failed, using fallback');
    return Component;
  }
};

// Export Easing and interpolate if available
export const Easing = reanimatedAvailable && Reanimated?.Easing
  ? Reanimated.Easing
  : {
    linear: (t: number) => t,
    ease: (t: number) => t,
    in: (easing: any) => easing,
    out: (easing: any) => easing,
    inOut: (easing: any) => easing,
  };

export const interpolate = reanimatedAvailable && Reanimated?.interpolate
  ? Reanimated.interpolate
  : (value: number, input: number[], output: number[]) => {
    // Very simple linear interpolation fallback if needed
    if (value <= input[0]) return output[0];
    if (value >= input[input.length - 1]) return output[output.length - 1];
    return output[0]; // Simplified
  };

// Export the module itself if available
export default Reanimated;
