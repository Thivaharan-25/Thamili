import React, { useEffect, useRef, forwardRef } from 'react';
import { View, StyleSheet, ViewStyle, Animated } from 'react-native';
import { cssInterop } from 'react-native-css-interop';

// Safe import of reanimated components
let Reanimated: any;
try {
  Reanimated = require('react-native-reanimated');
} catch (e) {
  // Reanimated not available
}

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle | ViewStyle[];
  className?: string; // Kept for type safety though cssInterop handles it
}

/**
 * Reanimated implementation of SkeletonLoader
 * Called only when Reanimated is available
 */
const SkeletonLoaderReanimated = forwardRef<View, SkeletonLoaderProps>(({
  width,
  height,
  borderRadius,
  style,
}, ref) => {
  const shimmer = Reanimated.useSharedValue(0);

  useEffect(() => {
    shimmer.value = Reanimated.withRepeat(
      Reanimated.withTiming(1, {
        duration: 1500,
        easing: Reanimated.Easing.linear,
      }),
      -1,
      false
    );
  }, []);

  const animatedStyle = Reanimated.useAnimatedStyle(() => {
    const opacityValue = Reanimated.interpolate
      ? Reanimated.interpolate(shimmer.value, [0, 0.5, 1], [0.3, 0.7, 0.3])
      : 0.5;
    return { opacity: opacityValue };
  });

  const AnimatedView = Reanimated.default?.View || Reanimated.Animated?.View || View;

  return (
    <AnimatedView
      ref={ref}
      style={[
        styles.skeleton,
        {
          width: width as any,
          height: height as any,
          borderRadius: borderRadius as any
        },
        animatedStyle,
        style,
      ]}
    />
  );
});

/**
 * Fallback implementation of SkeletonLoader using React state
 * Called when Reanimated is NOT available
 */
const SkeletonLoaderFallback = forwardRef<View, SkeletonLoaderProps>(({
  width,
  height,
  borderRadius,
  style,
}, ref) => {
  const animatedOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedOpacity, {
          toValue: 0.7,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(animatedOpacity, {
          toValue: 0.3,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      ref={ref}
      style={[
        styles.skeleton,
        {
          width: width as any,
          height: height as any,
          borderRadius: borderRadius as any,
          opacity: animatedOpacity,
        },
        style,
      ]}
    />
  );
});

/**
 * Main SkeletonLoader component
 * Conditionally renders implementation based on availability
 * Uses cssInterop to bridge NativeWind className to style prop correctly
 */
const SkeletonLoader = forwardRef<View, SkeletonLoaderProps>((props, ref) => {
  const hasReanimated = Boolean(
    Reanimated &&
    Reanimated.useSharedValue &&
    Reanimated.useAnimatedStyle &&
    Reanimated.withRepeat
  );

  if (hasReanimated) {
    return <SkeletonLoaderReanimated {...props} ref={ref} />;
  }

  return <SkeletonLoaderFallback {...props} ref={ref} />;
});

// Register with cssInterop to ensure className works correctly with NativeWind v4
cssInterop(SkeletonLoader, {
  className: {
    target: false,
    nativeStyleToProp: {
      width: true,
      height: true,
      borderRadius: true,
    },
  },
});

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E0E0E0',
  },
});

SkeletonLoader.displayName = 'SkeletonLoader';
SkeletonLoaderReanimated.displayName = 'SkeletonLoaderReanimated';
SkeletonLoaderFallback.displayName = 'SkeletonLoaderFallback';

export default SkeletonLoader;
