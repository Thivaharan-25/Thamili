/**
 * Checkout Progress Indicator
 * Shows current step in checkout process
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { useTheme } from '../hooks/useTheme';

type CheckoutStep = 'summary' | 'delivery' | 'payment' | 'review';

interface CheckoutProgressIndicatorProps {
  currentStep: CheckoutStep;
  steps: Array<{ key: CheckoutStep; label: string; icon: string }>;
  onStepPress?: (step: CheckoutStep) => void;
  style?: any;
}

const AnimatedView = Animated.createAnimatedComponent(View);

const CheckoutProgressIndicator: React.FC<CheckoutProgressIndicatorProps> = ({
  currentStep,
  steps,
  onStepPress,
  style,
}) => {
  const { colors: themeColors } = useTheme();
  const currentIndex = steps.findIndex((s) => s.key === currentStep);
  const progress = useSharedValue((currentIndex + 1) / steps.length);

  React.useEffect(() => {
    progress.value = withTiming((currentIndex + 1) / steps.length, { duration: 300 });
  }, [currentIndex]);

  const progressStyle = useAnimatedStyle(() => {
    const width = interpolate(progress.value, [0, 1], [0, 100]);
    return {
      width: `${width}%`,
    };
  });

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background.card }, style]}>
      {/* Progress Bar */}
      <View style={[styles.progressBarContainer, { backgroundColor: themeColors.neutral[200] }]}>
        <AnimatedView
          style={[
            styles.progressBar,
            { backgroundColor: themeColors.primary[500] },
            progressStyle,
          ]}
        />
      </View>

      {/* Steps */}
      <View style={styles.stepsContainer}>
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isAccessible = index <= currentIndex || onStepPress;

          return (
            <TouchableOpacity
              key={step.key}
              style={styles.step}
              onPress={() => isAccessible && onStepPress?.(step.key)}
              disabled={!isAccessible}
              accessibilityLabel={`${step.label} step${isCurrent ? ' (current)' : isCompleted ? ' (completed)' : ''}`}
              accessibilityRole="button"
            >
              <View
                style={[
                  styles.stepIconContainer,
                  {
                    backgroundColor: isCurrent
                      ? themeColors.primary[500]
                      : isCompleted
                      ? themeColors.success[500]
                      : themeColors.neutral[300],
                  },
                ]}
              >
                <Icon
                  name={isCompleted ? 'check' : (step.icon as any)}
                  size={16}
                  color="#FFFFFF"
                />
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  {
                    color: isCurrent
                      ? themeColors.primary[500]
                      : isCompleted
                      ? themeColors.text.primary
                      : themeColors.text.secondary,
                    fontWeight: isCurrent ? '600' : '400',
                  },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {step.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressBarContainer: {
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  step: {
    flex: 1,
    alignItems: 'center',
  },
  stepIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepLabel: {
    fontSize: 12,
    textAlign: 'center',
    flexShrink: 1,
    minWidth: 0,
  },
});

export default CheckoutProgressIndicator;

