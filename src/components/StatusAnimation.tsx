/**
 * Success/Error State Animations
 * Beautiful animated status indicators with icons and messages
 */

import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  interpolate,
} from 'react-native-reanimated';
import { colors } from '../theme';
import { EASING } from '../utils/animations';

const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedIcon = Animated.createAnimatedComponent(Icon);

interface StatusAnimationProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message?: string;
  visible: boolean;
  onComplete?: () => void;
  duration?: number;
}

const StatusAnimation: React.FC<StatusAnimationProps> = ({
  type,
  message,
  visible,
  onComplete,
  duration = 2000,
}) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const iconScale = useSharedValue(0);
  const iconRotation = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Entrance animation
      scale.value = withSpring(1, EASING.spring);
      opacity.value = withTiming(1, { duration: 300 });
      
      // Icon animation
      iconScale.value = withSequence(
        withSpring(1.3, { damping: 8, stiffness: 200 }),
        withSpring(1, EASING.spring)
      );
      iconRotation.value = withSequence(
        withTiming(-10, { duration: 100 }),
        withSpring(0, EASING.spring)
      );

      // Auto-dismiss
      const timer = setTimeout(() => {
        scale.value = withTiming(0, { duration: 200 });
        opacity.value = withTiming(0, { duration: 200 });
        setTimeout(() => {
          onComplete?.();
        }, 200);
      }, duration);

      return () => clearTimeout(timer);
    } else {
      scale.value = withTiming(0, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible, duration]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: iconScale.value },
      { rotate: `${iconRotation.value}deg` },
    ],
  }));

  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: 'check-circle',
          color: colors.success[500],
          bgColor: colors.success[50],
          borderColor: colors.success[200],
        };
      case 'error':
        return {
          icon: 'alert-circle',
          color: colors.error[500],
          bgColor: colors.error[50],
          borderColor: colors.error[200],
        };
      case 'warning':
        return {
          icon: 'alert',
          color: colors.warning[500],
          bgColor: colors.warning[50],
          borderColor: colors.warning[200],
        };
      case 'info':
      default:
        return {
          icon: 'information',
          color: colors.primary[500],
          bgColor: colors.primary[50],
          borderColor: colors.primary[200],
        };
    }
  };

  const config = getTypeConfig();

  if (!visible) {
    return null;
  }

  return (
    <AnimatedView
      style={containerStyle}
      className="absolute top-16 left-4 right-4 z-50"
    >
      <View
        className="flex-row items-center p-4 rounded-xl border-2 shadow-lg"
        style={{
          backgroundColor: config.bgColor,
          borderColor: config.borderColor,
        }}
      >
        <AnimatedIcon
          name={config.icon as any}
          size={24}
          color={config.color}
          style={iconStyle}
        />
        {message && (
          <Text
            className="flex-1 ml-3 text-base font-semibold"
            style={{ color: config.color }}
          >
            {message}
          </Text>
        )}
      </View>
    </AnimatedView>
  );
};

export default StatusAnimation;

