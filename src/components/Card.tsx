/**
 * Modern Card Component with Elevated Shadows
 * Uses NativeWind for styling and design system shadows
 */

import React from 'react';
import { ViewStyle, TouchableOpacity } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { getShadow } from '../theme/shadows';
import { EASING } from '../utils/animations';
import { glassmorphism } from '../theme/glassmorphism';

import { View } from 'react-native';

// Safe animated component creation with displayName
let AnimatedTouchable: any;
let AnimatedView: any;

try {
  AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
  AnimatedView = Animated.createAnimatedComponent(View);
  
  // Ensure displayName exists
  if (AnimatedTouchable && !AnimatedTouchable.displayName) {
    AnimatedTouchable.displayName = 'AnimatedTouchableOpacity';
  }
  if (AnimatedView && !AnimatedView.displayName) {
    AnimatedView.displayName = 'AnimatedView';
  }
} catch (e) {
  // Fallback to regular components
  AnimatedTouchable = TouchableOpacity;
  AnimatedView = View;
}

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  elevation?: 'flat' | 'card' | 'raised' | 'floating' | 'modal';
  padding?: number;
  className?: string; // Deprecated - use style prop instead
  glassmorphism?: boolean; // Enable glassmorphism effect (default: true)
}

const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  elevation = 'card',
  padding = 16,
  className = '',
  glassmorphism: useGlassmorphism = true, // Default to glassmorphism
}) => {
  const scale = useSharedValue(1);
  const shadowOpacity = useSharedValue(0.1);
  const shadowRadius = useSharedValue(4);

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withSpring(0.98, EASING.spring);
      shadowOpacity.value = withTiming(0.2, { duration: 150 });
      shadowRadius.value = withTiming(8, { duration: 150 });
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      scale.value = withSpring(1, EASING.spring);
      shadowOpacity.value = withTiming(0.1, { duration: 150 });
      shadowRadius.value = withTiming(4, { duration: 150 });
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: shadowOpacity.value,
    shadowRadius: shadowRadius.value,
  }));

  const baseShadowStyle = getShadow(elevation === 'flat' ? 'none' : elevation === 'card' ? 'sm' : elevation === 'raised' ? 'md' : elevation === 'floating' ? 'lg' : 'xl');
  const glassStyle = useGlassmorphism ? glassmorphism.light.container : {};

  const cardContent = (
    <AnimatedView
      style={[
        {
          padding,
          backgroundColor: useGlassmorphism ? 'rgba(255, 255, 255, 0.85)' : '#fff',
          borderRadius: 16,
          overflow: 'hidden',
          ...baseShadowStyle,
          ...glassStyle,
        },
        onPress ? animatedStyle : {},
        style,
      ]}
    >
      {children}
    </AnimatedView>
  );

  if (onPress) {
    return (
      <AnimatedTouchable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {cardContent}
      </AnimatedTouchable>
    );
  }

  return cardContent;
};

// Set displayName for better debugging and NativeWind compatibility
Card.displayName = 'Card';

export default Card;
