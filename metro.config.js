// Learn more https://docs.expo.dev/guides/customizing-metro
if (!Array.prototype.toReversed) {
  Array.prototype.toReversed = function() {
    return [...this].reverse();
  };
}
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Custom resolver to replace ALL problematic expo modules with mocks
// This prevents "property is not configurable" errors in Expo Go
const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // ---------------------------------------------------------------------------
  // CRITICAL FIX FOR EAS BUILDS
  // ---------------------------------------------------------------------------
  // If we are running in EAS Build (EAS_BUILD=true), we MUST bypass all the 
  // custom mocking logic below. The mocks are ONLY for Expo Go/Development.
  // EAS builds have the real native modules linked, so we want standard behavior.
  if (process.env.EAS_BUILD) {
    console.log(`📡 [metro.config] EAS BUILD detected - bypassing all mocks for ${moduleName}`);
    // Fallback to default resolution logic immediately
    return context.resolveRequest(context, moduleName, platform);
  }
  // ---------------------------------------------------------------------------

  // Mock Stripe on web platform (Stripe React Native doesn't work on web)
  // This must be checked first to prevent web bundling errors
  if (platform === 'web' && moduleName === '@stripe/stripe-react-native') {
    const stripeMock = path.resolve(__dirname, 'src/services/mocks/stripe-mock.js');
    console.log(`🔄 [metro.config] Redirecting @stripe/stripe-react-native to mock (web platform)`);
    return {
      filePath: stripeMock,
      type: 'sourceFile',
    };
  }

  // Mock Mapbox on web platform (it often causes bundling errors if not installed)
  if (platform === 'web' && (moduleName === 'mapbox-gl' || moduleName.startsWith('mapbox-gl/'))) {
    const emptyMock = path.resolve(__dirname, 'src/services/mocks/empty-mock.js');
    console.log(`🔄 [metro.config] Redirecting ${moduleName} to empty mock (web platform)`);
    return {
      filePath: emptyMock,
      type: 'sourceFile',
    };
  }

  // Map of problematic expo modules to their mock replacements
  const problematicModules = {
    // Only use mocks in development/Expo Go, not in EAS builds
    // expo-notifications is handled separately above
  };

  // Handle expo-image conditionally - only mock in development
  if (moduleName === 'expo-image' || moduleName.startsWith('expo-image/')) {
    if (!process.env.EAS_BUILD && !process.env.APP_VARIANT_STANDALONE) {
      const expoImageMock = path.resolve(__dirname, 'src/services/mocks/expo-image-mock.tsx');
      console.log(`🔄 [metro.config] Redirecting expo-image to mock (EXPO GO / DEV CLIENT ONLY)`);
      return {
        filePath: expoImageMock,
        type: 'sourceFile',
      };
    } else {
      console.log(`📡 [metro.config] Allowing real expo-image for STANDALONE BUILD`);
      // Let default resolver handle it
    }
  }

  // expo-notifications: NEVER redirect to mock here.
  // The pushNotificationService handles Expo Go detection at RUNTIME using
  // Constants.executionEnvironment === 'storeClient'. This allows the dev
  // client (which has the real native module compiled in) to use real
  // push notifications while gracefully degrading in Expo Go.
  // (Old redirect caused dev-client builds to use the mock too, breaking notifications.)


  // Use default resolver for all other modules
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }

  // Fallback to default resolution
  return context.resolveRequest(context, moduleName, platform);
};

// Ensure buffer is available for Supabase crypto polyfills
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  buffer: require.resolve('buffer'),
};

module.exports = withNativeWind(config, { input: './global.css' });

