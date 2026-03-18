module.exports = function (api) {
  api.cache(true);

  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      [
        'module:react-native-dotenv',
        {
          moduleName: '@env',
          path: '.env',
          safe: false,
          allowUndefined: true,
        },
      ],
      // Temporarily disabled reanimated plugin to prevent NullPointerException in Expo Go
      // Re-enable when using development build or if native module is available
      'react-native-reanimated/plugin', // Must be last
    ],
  };
};
