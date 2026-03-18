/**
 * Mock for react-native-reanimated CSS features
 * This prevents conflicts with NativeWind CSS processing
 * 
 * Reanimated v4 has CSS support that conflicts with NativeWind.
 * This mock provides empty implementations for CSS-related exports.
 */

// Export empty implementations for all CSS-related exports
module.exports = {
  // Proxy-related exports
  createProxy: () => ({}),
  proxy: {},
  
  // CSS-related exports
  css: {},
  style: {},
  stylesheet: {},
  
  // Default export
  default: {},
};

