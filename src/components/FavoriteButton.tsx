/**
 * Favorite Button Component
 * With HeartBeat animation on press
 */

import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { colors } from '../theme';
import { EASING } from '../utils/animations';
import { mediumHaptic } from '../utils/hapticFeedback';

interface FavoriteButtonProps {
  isFavorite: boolean;
  onToggle: () => void;
  size?: number;
  style?: any;
}

const AnimatedIcon = Animated.createAnimatedComponent(Icon);
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  isFavorite,
  onToggle,
  size = 24,
  style,
}) => {
  const scale = useSharedValue(1);

  const handlePress = () => {
    mediumHaptic();
    // HeartBeat animation
    scale.value = withSequence(
      withSpring(1.3, { damping: 5, stiffness: 400 }),
      withSpring(1, EASING.spring)
    );
    onToggle();
  };

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedTouchable
      onPress={handlePress}
      style={[styles.container, style]}
      accessibilityRole="button"
      accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      accessibilityState={{ selected: isFavorite }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <AnimatedIcon
        name={isFavorite ? 'heart' : 'heart-outline'}
        size={size}
        color={isFavorite ? colors.error[500] : colors.neutral[500]}
        style={iconStyle}
      />
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FavoriteButton;

