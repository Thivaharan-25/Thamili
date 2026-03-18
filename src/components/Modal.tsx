/**
 * Smooth Modal Component with Backdrop
 * Compatible with react-native-reanimated 3.x for Expo Go
 */

import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal as RNModal, Pressable } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { colors } from '../theme';
import { ANIMATION_DURATION, EASING } from '../utils/animations';

const AnimatedView = Animated.createAnimatedComponent(View);

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
}

const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  children,
  showCloseButton = true,
  closeOnBackdrop = true,
  size = 'md',
  className = '',
}) => {
  const backdropOpacity = useSharedValue(0);
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(1, {
        duration: ANIMATION_DURATION.normal,
        easing: EASING.easeOut,
      });
      scale.value = withSpring(1, EASING.spring);
      opacity.value = withTiming(1, {
        duration: ANIMATION_DURATION.normal,
      });
    } else {
      backdropOpacity.value = withTiming(0, {
        duration: ANIMATION_DURATION.fast,
      });
      scale.value = withTiming(0.9, {
        duration: ANIMATION_DURATION.fast,
      });
      opacity.value = withTiming(0, {
        duration: ANIMATION_DURATION.fast,
      });
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-11/12 max-w-sm';
      case 'md':
        return 'w-11/12 max-w-md';
      case 'lg':
        return 'w-11/12 max-w-lg';
      case 'full':
        return 'w-full h-full';
      default:
        return 'w-11/12 max-w-md';
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <AnimatedView
        style={backdropStyle}
        className="flex-1 justify-center items-center bg-black/50"
      >
        <Pressable
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          onPress={closeOnBackdrop ? onClose : undefined}
        />

        <AnimatedView
          style={[
            modalStyle,
            {
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: 20,
              borderWidth: 1,
              borderColor: 'rgba(58, 181, 209, 0.2)',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.15,
              shadowRadius: 20,
              elevation: 8,
              padding: size === 'full' ? 0 : 24,
            },
          ]}
          className={`
            ${getSizeClasses()}
            ${className}
          `}
        >
          {(title || showCloseButton) && (
            <View className="flex-row justify-between items-center mb-4">
              {title && (
                <Text className="text-xl font-bold text-neutral-900 flex-1">
                  {title}
                </Text>
              )}
              {showCloseButton && (
                <TouchableOpacity
                  onPress={onClose}
                  className="ml-4 p-2 -mr-2 -mt-2"
                >
                  <Icon name="close" size={24} color={colors.neutral[600]} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {children}
        </AnimatedView>
      </AnimatedView>
    </RNModal>
  );
};

export default Modal;
