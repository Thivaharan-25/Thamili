# NativeWind Setup Complete ✅

## What Was Installed

1. **NativeWind** (v4.2.1) - Tailwind CSS for React Native
2. **Tailwind CSS** (v3.3.2) - CSS framework
3. **react-native-reanimated** (v4.2.0) - Animation library

## Configuration Files Created/Updated

### 1. `babel.config.js`
- Added NativeWind preset
- Added react-native-reanimated plugin (must be last)

### 2. `metro.config.js`
- Added `withNativeWind` wrapper for CSS support
- Configured to use `global.css`

### 3. `tailwind.config.js`
- Custom color palette (primary, secondary, success, error, warning, neutral)
- Typography scale
- Spacing system
- Border radius
- Box shadows

### 4. `global.css`
- Tailwind directives (@tailwind base, components, utilities)

### 5. `nativewind.d.ts`
- TypeScript definitions for NativeWind

### 6. `App.tsx`
- Imported `global.css`

## Design System Files Created

### Theme Files (`src/theme/`)
- `colors.ts` - Color palette with semantic colors
- `typography.ts` - Font sizes, weights, line heights, text styles
- `spacing.ts` - Consistent spacing scale (4px grid)
- `shadows.ts` - Elevation and shadow system
- `index.ts` - Central export

### Animation Utilities (`src/utils/animations.ts`)
- Animation durations and easing functions
- Helper functions for fade, slide, scale animations
- Button and card press animations
- Spring and timing animations

## How to Use NativeWind

### Basic Usage
```tsx
import { View, Text } from 'react-native';

export default function MyComponent() {
  return (
    <View className="flex-1 bg-white p-4">
      <Text className="text-2xl font-bold text-primary-500">
        Hello NativeWind!
      </Text>
    </View>
  );
}
```

### Using Design System
```tsx
import { colors, spacing, typography } from '../theme';

// Use theme values in StyleSheet or combine with NativeWind
<View className="p-4" style={{ backgroundColor: colors.primary[500] }}>
  <Text style={typography.textStyles.h1}>Title</Text>
</View>
```

### Using Animations
```tsx
import { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { createScaleNormal, ANIMATION_DURATION } from '../utils/animations';

const scale = useSharedValue(1);

const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: scale.value }],
}));

// On press
scale.value = createScaleNormal();
```

## Available Tailwind Classes

### Layout
- `flex-1`, `flex-row`, `items-center`, `justify-between`, `justify-center`

### Spacing
- `p-4`, `px-6`, `py-3`, `mb-4`, `mt-2`, `gap-4`

### Colors
- `bg-white`, `bg-primary-500`, `text-gray-900`, `border-gray-200`

### Typography
- `text-2xl`, `font-bold`, `text-sm`, `text-center`

### Effects
- `rounded-lg`, `shadow-sm`, `opacity-50`, `border`

## Next Steps

1. **Restart Expo**: `npm start -- --clear`
2. Start using NativeWind classes in your components
3. Use theme values from `src/theme/` for consistency
4. Apply animations using utilities from `src/utils/animations.ts`

## Example: Converting a Component

**Before (StyleSheet):**
```tsx
<View style={styles.container}>
  <Text style={styles.title}>Hello</Text>
</View>

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold' },
});
```

**After (NativeWind):**
```tsx
<View className="p-4 bg-white">
  <Text className="text-2xl font-bold">Hello</Text>
</View>
```

## Troubleshooting

If styles don't apply:
1. Clear Metro cache: `npm start -- --clear`
2. Restart Expo Go app
3. Check that `global.css` is imported in `App.tsx`
4. Verify `babel.config.js` has NativeWind preset
5. Check `metro.config.js` has `withNativeWind` wrapper

