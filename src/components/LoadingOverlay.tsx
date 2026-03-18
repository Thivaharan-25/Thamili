/**
 * Modern Loading Overlay with Skeleton Animation
 * Replaces ActivityIndicator with beautiful skeleton loader
 */

import React, { useEffect } from 'react';
import { View, Text, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import SkeletonLoader from './SkeletonLoader';
import { colors } from '../theme';
import { EASING, ANIMATION_DURATION } from '../utils/animations';

const AnimatedView = Animated.createAnimatedComponent(View);

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message,
}) => {
  const { t } = useTranslation();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withSpring(1, EASING.spring);
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      scale.value = withTiming(0.9, { duration: 200 });
    }
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!visible) {
    return null;
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
    >
      <AnimatedView
        style={overlayStyle}
        className="flex-1 bg-black/50 justify-center items-center"
      >
        <AnimatedView
          style={containerStyle}
          className="bg-white rounded-2xl p-6 items-center min-w-[140px] shadow-2xl"
        >
          <SkeletonLoader width={60} height={60} borderRadius={30} className="mb-4" />
          {message && (
            <Text className="text-sm text-neutral-600 text-center mt-2">
              {message}
            </Text>
          )}
        </AnimatedView>
      </AnimatedView>
    </Modal>
  );
};

export default LoadingOverlay;
