/**
 * Success Celebration Component
 * Animated celebration for successful actions (order placed, etc.)
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  interpolate,
  SharedValue,
} from 'react-native-reanimated';
import { colors } from '../theme';
import { EASING, ANIMATION_DURATION, MICRO_INTERACTIONS } from '../utils/animations';
import { successHaptic } from '../utils/hapticFeedback';

interface SuccessCelebrationProps {
  visible: boolean;
  message?: string;
  onComplete?: () => void;
  duration?: number;
  skipExitAnimation?: boolean;
}

// Safe creation of animated components
let AnimatedView: any = View;

try {
  if (Animated && Animated.createAnimatedComponent) {
    AnimatedView = Animated.createAnimatedComponent(View);
    if (AnimatedView) AnimatedView.displayName = 'AnimatedView';
  }
} catch (e) {
  console.warn('Failed to create animated components in SuccessCelebration:', e);
}

interface ConfettiParticleProps {
  i: number;
  confettiOpacity: SharedValue<number>;
}

const ConfettiParticle: React.FC<ConfettiParticleProps> = ({ i, confettiOpacity }) => {
  const angle = (i * 30) * (Math.PI / 180);
  const distance = 80;
  const x = Math.cos(angle) * distance;
  const y = Math.sin(angle) * distance;

  const particleStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      confettiOpacity.value,
      [0, 1],
      [0, 1]
    );
    return {
      transform: [
        { translateX: x * progress },
        { translateY: y * progress },
        { scale: 1 - progress },
      ],
      opacity: 1 - progress,
    } as any;
  });

  return (
    <AnimatedView
      key={i}
      style={[
        styles.confetti,
        {
          backgroundColor: [
            colors.primary[500],
            colors.success[500],
            colors.warning[500],
            colors.error[500],
          ][i % 4],
        },
        particleStyle,
      ]}
    />
  );
};

const SuccessCelebration: React.FC<SuccessCelebrationProps> = ({
  visible,
  message,
  onComplete,
  duration = 800,
  skipExitAnimation = false,
}) => {
  const { t } = useTranslation();
  const displayMessage = message || t('common.successMessage');
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const iconScale = useSharedValue(0);
  const iconRotation = useSharedValue(0);
  const confettiOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      successHaptic();

      // Main container animation
      scale.value = withTiming(1, { duration: ANIMATION_DURATION.normal, easing: EASING.easeOut });
      opacity.value = withTiming(1, { duration: ANIMATION_DURATION.normal });

      // Icon smooth animation
      iconScale.value = withSequence(
        withDelay(100, withTiming(1.2, { duration: 200, easing: EASING.easeOut })),
        withTiming(1, { duration: 150, easing: EASING.easeIn })
      );

      iconRotation.value = withSequence(
        withDelay(100, withTiming(-10, { duration: 150 })),
        withTiming(0, { duration: 150 })
      );

      // Confetti effect
      confettiOpacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withDelay(300, withTiming(0, { duration: 500 }))
      );

      // Auto-dismiss
      const timer = setTimeout(() => {
        if (skipExitAnimation) {
          onComplete?.();
        } else {
          scale.value = withTiming(0, { duration: ANIMATION_DURATION.fast });
          opacity.value = withTiming(0, { duration: ANIMATION_DURATION.fast });
          setTimeout(() => {
            onComplete?.();
          }, ANIMATION_DURATION.fast);
        }
      }, duration);

      return () => clearTimeout(timer);
    } else {
      scale.value = withTiming(0, { duration: ANIMATION_DURATION.fast });
      opacity.value = withTiming(0, { duration: ANIMATION_DURATION.fast });
    }
  }, [visible, duration, skipExitAnimation, onComplete, scale, opacity, iconScale, iconRotation, confettiOpacity]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  } as any));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: iconScale.value },
      { rotate: `${iconRotation.value}deg` },
    ],
  } as any));

  const confettiStyle = useAnimatedStyle(() => ({
    opacity: confettiOpacity.value,
  } as any));

  // Hooks must be called before any conditional returns
  if (!visible) {
    return null;
  }

  return (
    <AnimatedView style={[styles.container, containerStyle]}>
      {/* Confetti Effect */}
      <AnimatedView style={[styles.confettiContainer, confettiStyle]}>
        {[...Array(12)].map((_, i) => (
          <ConfettiParticle key={i} i={i} confettiOpacity={confettiOpacity} />
        ))}
      </AnimatedView>

      {/* Success Icon and Message */}
      <View style={styles.content}>
        <AnimatedView style={iconStyle}>
          <Icon
            name="check-circle"
            size={64}
            color={colors.success[500]}
          />
        </AnimatedView>
        <Text style={styles.message}>{displayMessage}</Text>
      </View>
    </AnimatedView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  confettiContainer: {
    position: 'absolute',
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confetti: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  message: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[900],
    textAlign: 'center',
  },
});

export default SuccessCelebration;

