/**
 * Modern Badge Component with Animations
 * Compatible with react-native-reanimated 3.x for Expo Go
 */

import React, { useEffect } from 'react';
import { Text, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme';
import { EASING, ANIMATION_DURATION } from '../utils/animations';

const AnimatedView = Animated.createAnimatedComponent(View);

interface BadgeProps {
  children?: React.ReactNode;
  text?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'neutral';
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  show?: boolean;
  animated?: boolean;
  className?: string;
  style?: ViewStyle;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  text,
  variant = 'primary',
  color,
  size = 'md',
  show = true,
  animated = true,
  className = '',
  style,
}) => {
  const scale = useSharedValue(animated ? 0 : 1);
  const opacity = useSharedValue(animated ? 0 : 1);

  useEffect(() => {
    if (show && animated) {
      scale.value = withSpring(1, EASING.spring);
      opacity.value = withTiming(1, { duration: ANIMATION_DURATION.fast });
    } else if (!show && animated) {
      scale.value = withSpring(0, EASING.spring);
      opacity.value = withTiming(0, { duration: ANIMATION_DURATION.fast });
    }
  }, [show, animated]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-primary-500';
      case 'secondary':
        return 'bg-secondary-500';
      case 'success':
        return 'bg-success-500';
      case 'error':
        return 'bg-error-500';
      case 'warning':
        return 'bg-warning-500';
      case 'neutral':
        return 'bg-neutral-500';
      default:
        return 'bg-primary-500';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-0.5';
      case 'md':
        return 'px-2.5 py-1';
      case 'lg':
        return 'px-3 py-1.5';
      default:
        return 'px-2.5 py-1';
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'sm':
        return 'text-xs';
      case 'md':
        return 'text-sm';
      case 'lg':
        return 'text-base';
      default:
        return 'text-sm';
    }
  };

  if (!show && !animated) {
    return null;
  }

  return (
    <AnimatedView
      style={[
        animated ? animatedStyle : undefined,
        color ? { backgroundColor: color } : undefined,
        style
      ]}
      className={`
        ${!color ? getVariantClasses() : ''}
        ${getSizeClasses()}
        rounded-full
        items-center
        justify-center
        ${className}
      `}
    >
      <Text className={`${getTextSize()} font-semibold text-white`}>
        {text || children}
      </Text>
    </AnimatedView>
  );
};

export default Badge;
