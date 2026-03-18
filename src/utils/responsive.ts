/**
 * Responsive Design Utilities
 * Provides helpers for creating responsive layouts across different screen sizes
 */

import { Dimensions, Platform, ScaledSize } from 'react-native';

// Get current window dimensions
const getWindowDimensions = (): ScaledSize => {
  return Dimensions.get('window');
};

// Initialize with current dimensions
let { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = getWindowDimensions();

// Update dimensions (call this on orientation change)
export const updateDimensions = () => {
  const { width, height } = getWindowDimensions();
  SCREEN_WIDTH = width;
  SCREEN_HEIGHT = height;
};

// Listen for dimension changes
Dimensions.addEventListener('change', ({ window }) => {
  SCREEN_WIDTH = window.width;
  SCREEN_HEIGHT = window.height;
});

// Device size categories
export const isSmallDevice = (): boolean => SCREEN_WIDTH < 375; // iPhone SE, small Android
export const isMediumDevice = (): boolean => SCREEN_WIDTH >= 375 && SCREEN_WIDTH < 414; // Standard iPhones
export const isLargeDevice = (): boolean => SCREEN_WIDTH >= 414 && SCREEN_WIDTH < 768; // iPhone Plus, large Android
export const isTablet = (): boolean => SCREEN_WIDTH >= 768; // iPad, Android tablets
export const isLargeTablet = (): boolean => SCREEN_WIDTH >= 1024; // iPad Pro

// Orientation helpers
export const isLandscape = (): boolean => SCREEN_WIDTH > SCREEN_HEIGHT;
export const isPortrait = (): boolean => SCREEN_HEIGHT > SCREEN_WIDTH;

// Responsive width/height helpers
export const responsiveWidth = (percentage: number): number => {
  return (SCREEN_WIDTH * percentage) / 100;
};

export const responsiveHeight = (percentage: number): number => {
  return (SCREEN_HEIGHT * percentage) / 100;
};

// Responsive font size (scales with screen width, capped)
export const getResponsiveFontSize = (size: number, minSize?: number, maxSize?: number): number => {
  const baseWidth = 375; // iPhone X base width
  const scale = SCREEN_WIDTH / baseWidth;
  const scaledSize = size * Math.min(scale, 1.3); // Cap scaling at 1.3x
  
  if (minSize && scaledSize < minSize) return minSize;
  if (maxSize && scaledSize > maxSize) return maxSize;
  return Math.round(scaledSize);
};

// Responsive spacing (scales with screen width)
export const getResponsiveSpacing = (baseSpacing: number): number => {
  const scale = SCREEN_WIDTH / 375;
  return Math.round(baseSpacing * Math.min(scale, 1.2));
};

// Get current dimensions
export const getScreenWidth = (): number => SCREEN_WIDTH;
export const getScreenHeight = (): number => SCREEN_HEIGHT;

// Breakpoints
export const BREAKPOINTS = {
  small: 375,
  medium: 414,
  tablet: 768,
  largeTablet: 1024,
} as const;

// Responsive value helper (returns different values based on screen size)
export const responsiveValue = <T>(values: {
  small?: T;
  medium?: T;
  large?: T;
  tablet?: T;
  default: T;
}): T => {
  if (isTablet() && values.tablet !== undefined) return values.tablet;
  if (isSmallDevice() && values.small !== undefined) return values.small;
  if (isLargeDevice() && values.large !== undefined) return values.large;
  if (isMediumDevice() && values.medium !== undefined) return values.medium;
  return values.default;
};

// Number of columns based on screen size
export const getColumnCount = (): number => {
  if (isTablet()) return 3;
  if (isLargeDevice()) return 2;
  return 2;
};

// Touch target size (accessibility - minimum 44x44)
export const MIN_TOUCH_TARGET = 44;

// Check if touch target is large enough
export const isTouchTargetValid = (size: number): boolean => {
  return size >= MIN_TOUCH_TARGET;
};

// Platform-specific helpers
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';

// Responsive padding
export const getResponsivePadding = (): {
  horizontal: number;
  vertical: number;
} => {
  if (isTablet()) {
    return { horizontal: 24, vertical: 16 };
  }
  if (isSmallDevice()) {
    return { horizontal: 12, vertical: 12 };
  }
  return { horizontal: 16, vertical: 12 };
};

// Responsive margin
export const getResponsiveMargin = (): {
  horizontal: number;
  vertical: number;
} => {
  if (isTablet()) {
    return { horizontal: 24, vertical: 16 };
  }
  if (isSmallDevice()) {
    return { horizontal: 12, vertical: 8 };
  }
  return { horizontal: 16, vertical: 12 };
};

