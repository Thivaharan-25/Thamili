/**
 * AnimatedView - Reusable animation wrapper component
 * Uses only Reanimated (single animation system — no duplicate useState fallback)
 */

import React, { ReactNode } from 'react';
import { View, ViewStyle, TouchableOpacity, StyleProp } from 'react-native';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  createAnimatedComponent
} from '../utils/reanimatedWrapper';

interface AnimatedViewProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  animation?: 'fade' | 'slide' | 'zoom' | 'none';
  delay?: number;
  duration?: number;
  enterFrom?: 'top' | 'bottom' | 'left' | 'right';
  onPress?: () => void;
  className?: string;
}

const AnimatedViewInternal = createAnimatedComponent(View);
const AnimatedTouchableOpacity = createAnimatedComponent(TouchableOpacity);

const AnimatedView: React.FC<AnimatedViewProps> = ({
  children,
  style,
  animation = 'fade',
  delay = 0,
  duration = 250,
  enterFrom = 'bottom',
  onPress,
}) => {
  const opacityShared = useSharedValue(animation === 'fade' || animation === 'slide' ? 0 : 1);
  const translateYShared = useSharedValue(
    animation === 'slide'
      ? (enterFrom === 'bottom' ? 20 : enterFrom === 'top' ? -20 : 0)
      : 0
  );
  const scaleShared = useSharedValue(animation === 'zoom' ? 0.9 : 1);

  // Single animation system — Reanimated only
  React.useEffect(() => {
    if (animation === 'none') return;
    const timer = setTimeout(() => {
      opacityShared.value = withTiming(1, { duration });
      if (animation === 'slide') {
        translateYShared.value = withTiming(0, { duration });
      }
      if (animation === 'zoom') {
        scaleShared.value = withSpring(1, { damping: 15, stiffness: 150 });
      }
    }, delay);
    return () => clearTimeout(timer);
  }, []); // Run once on mount only

  const reanimatedStyle = useAnimatedStyle(() => {
    if (animation === 'none') return {};
    return {
      opacity: opacityShared.value,
      transform: [
        { translateY: translateYShared.value },
        { scale: scaleShared.value },
      ],
    };
  });

  const AnimatedComponent = onPress ? AnimatedTouchableOpacity : AnimatedViewInternal;

  return (
    <AnimatedComponent
      style={[reanimatedStyle, style] as any}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {children}
    </AnimatedComponent>
  );
};

AnimatedView.displayName = 'AnimatedView';

export default AnimatedView;
