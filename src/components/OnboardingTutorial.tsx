/**
 * Interactive Onboarding Tutorial Component
 * Provides step-by-step feature highlights with skip option
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../hooks/useTheme';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  highlight?: 'top' | 'bottom' | 'center';
}

interface OnboardingTutorialProps {
  steps: TutorialStep[];
  onComplete: () => void;
  onSkip: () => void;
  visible: boolean;
}

const AnimatedView = Animated.createAnimatedComponent(View);

const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({
  steps,
  onComplete,
  onSkip,
  visible,
}) => {
  const { colors: themeColors } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const opacity = useSharedValue(visible ? 1 : 0);
  const scale = useSharedValue(visible ? 1 : 0.9);

  React.useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withSpring(1);
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      scale.value = withTiming(0.9);
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!visible || currentStep >= steps.length) {
    return null;
  }

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <AnimatedView style={[styles.overlay, animatedStyle]}>
      <View style={[styles.container, { backgroundColor: themeColors.background.card }]}>
        {/* Progress Bar */}
        <View style={[styles.progressBar, { backgroundColor: themeColors.neutral[200] }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: themeColors.primary[500], width: `${progress}%` },
            ]}
          />
        </View>

        {/* Skip Button */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={onSkip}
          accessibilityLabel="Skip tutorial"
          accessibilityRole="button"
        >
          <Text style={[styles.skipText, { color: themeColors.text.secondary }]}>Skip</Text>
        </TouchableOpacity>

        {/* Content */}
        <View style={styles.content}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${themeColors.primary[500]}20` },
            ]}
          >
            <Icon name={step.icon as any} size={48} color={themeColors.primary[500]} />
          </View>

          <Text style={[styles.title, { color: themeColors.text.primary }]}>{step.title}</Text>
          <Text style={[styles.description, { color: themeColors.text.secondary }]}>
            {step.description}
          </Text>
        </View>

        {/* Navigation */}
        <View style={styles.navigation}>
          {currentStep > 0 && (
            <TouchableOpacity
              style={[styles.navButton, { borderColor: themeColors.border.default }]}
              onPress={handlePrevious}
              accessibilityLabel="Previous step"
              accessibilityRole="button"
            >
              <Icon name="chevron-left" size={24} color={themeColors.primary[500]} />
            </TouchableOpacity>
          )}

          <View style={styles.dots}>
            {steps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      index === currentStep
                        ? themeColors.primary[500]
                        : themeColors.neutral[300],
                    width: index === currentStep ? 24 : 8,
                  },
                ]}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.navButton, styles.nextButton, { backgroundColor: themeColors.primary[500] }]}
            onPress={handleNext}
            accessibilityLabel={currentStep === steps.length - 1 ? 'Complete tutorial' : 'Next step'}
            accessibilityRole="button"
          >
            <Icon
              name={currentStep === steps.length - 1 ? 'check' : 'chevron-right'}
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </View>
    </AnimatedView>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  container: {
    width: width * 0.9,
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  skipButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  nextButton: {
    borderWidth: 0,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});

export default OnboardingTutorial;

