/**
 * Mock for expo-image-picker in Expo Go
 * Prevents "property is not configurable" errors
 */
console.log('🔵 [expo-image-picker-mock] Creating mock...');
const mockImagePicker = {
  requestMediaLibraryPermissionsAsync: async () => ({
    status: 'granted',
    granted: true,
    canAskAgain: true,
  }),

  getMediaLibraryPermissionsAsync: async () => ({
    status: 'granted',
    granted: true,
    canAskAgain: true,
  }),

  requestCameraPermissionsAsync: async () => ({
    status: 'undetermined',
    granted: false,
    canAskAgain: false,
  }),

  launchImageLibraryAsync: async () => ({
    cancelled: true,
    assets: [],
  }),

  launchCameraAsync: async () => ({
    cancelled: true,
    assets: [],
  }),

  MediaTypeOptions: {
    Images: 'images',
    Videos: 'videos',
    All: 'all',
  },

  ImagePickerOptions: {},
};

// Simple exports - NO Object.defineProperty to avoid "not configurable" errors
// Just use regular object assignment
console.log('✅ [expo-image-picker-mock] Mock created');

module.exports = mockImagePicker;
module.exports.default = mockImagePicker;

console.log('✅ [expo-image-picker-mock] Mock exported');
