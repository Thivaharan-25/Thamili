/**
 * Content Fade-In Animation Wrapper
 * Smooth fade-in animation for content when it loads
 */

import React, { useEffect, forwardRef } from 'react';
import { View } from 'react-native';
import { cssInterop } from 'react-native-css-interop';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ANIMATION_DURATION, EASING } from '../utils/animations';

const AnimatedView = Animated.createAnimatedComponent(View);

interface ContentFadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  style?: any;
  className?: string; // Managed by cssInterop
}

/**
 * Internal implementation of ContentFadeIn using Reanimated
 */
const ContentFadeInInternal = forwardRef<View, ContentFadeInProps>(({
  children,
  delay = 0,
  duration = ANIMATION_DURATION.normal,
  style,
}, ref) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    const timer = setTimeout(() => {
      opacity.value = withTiming(1, {
        duration,
        easing: EASING.easeOut,
      });
      translateY.value = withTiming(0, {
        duration,
        easing: EASING.easeOut,
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <AnimatedView
      ref={ref}
      style={[animatedStyle, style]}
    >
      {children}
    </AnimatedView>
  );
});

/**
 * Main ContentFadeIn component
 * Uses cssInterop for NativeWind v4 compatibility
 */
const ContentFadeIn = forwardRef<View, ContentFadeInProps>((props, ref) => {
  // Always use Reanimated version for simplicity if Reanimated is available globally
  return <ContentFadeInInternal {...props} ref={ref} />;
});

cssInterop(ContentFadeIn, {});

ContentFadeIn.displayName = 'ContentFadeIn';
ContentFadeInInternal.displayName = 'ContentFadeInInternal';

export default ContentFadeIn;

