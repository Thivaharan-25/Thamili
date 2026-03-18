/**
 * Mock for expo-image in Expo Go
 * Prevents "property is not configurable" errors
 * Uses React Native Image as a safe replacement
 * 
 * ULTRA SIMPLE VERSION - No require(), just direct import
 */

console.log('🔵 [expo-image-mock] Module loading started');

// Direct imports - no require() to avoid any issues
import React from 'react';
console.log('✅ [expo-image-mock] React imported');
import { Image as RNImage } from 'react-native';
console.log('✅ [expo-image-mock] RN Image imported');

// Simple wrapper component
const Image = (props: any) => {
  const { contentFit, transition, ...restProps } = props || {};
  const resizeMode = contentFit === 'contain' ? 'contain' : 
                     contentFit === 'cover' ? 'cover' : 
                     contentFit === 'fill' ? 'stretch' : 
                     contentFit === 'scaleDown' ? 'contain' : 
                     'cover';
  return React.createElement(RNImage, { ...restProps, resizeMode });
};

console.log('✅ [expo-image-mock] Image component created');

// Simple exports - just export directly, no Object.defineProperty
export { Image };
export default Image;

console.log('✅ [expo-image-mock] Module fully loaded');
