/**
 * Welcome Screen - First screen of onboarding
 * Introduces the app with smooth animations
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Image, ScrollView, Platform, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RootStackParamList } from '../../types';
import { colors } from '../../theme';
import { ASSETS } from '../../constants/assets';
import { EASING, ANIMATION_DURATION } from '../../utils/animations';
import Button from '../../components/Button';
import OnboardingTutorial from '../../components/OnboardingTutorial';
import { isTablet, getResponsivePadding, getResponsiveFontSize } from '../../utils/responsive';
import { isTutorialCompleted, setTutorialCompleted } from '../../utils/onboardingStorage';

// Safe import of reanimated with fallback
let Animated: any;
let useAnimatedStyle: any;
let useSharedValue: any;
let withSpring: any;
let withTiming: any;

try {
  const Reanimated = require('react-native-reanimated');
  Animated = Reanimated.default || Reanimated;
  useAnimatedStyle = Reanimated.useAnimatedStyle;
  useSharedValue = Reanimated.useSharedValue;
  withSpring = Reanimated.withSpring;
  withTiming = Reanimated.withTiming;
} catch (e) {
  console.log('⚠️ [WelcomeScreen] Reanimated not available, using fallback');
}

// Create safe Animated.View component
const AnimatedView = Animated && Animated.View
  ? Animated.View
  : Animated && Animated.createAnimatedComponent
    ? Animated.createAnimatedComponent(View)
    : View;

const { width, height } = Dimensions.get('window');

type WelcomeScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Welcome'
>;

const WelcomeScreen = () => {
  const navigation = useNavigation<WelcomeScreenNavigationProp>();
  const padding = getResponsivePadding();
  const [showTutorial, setShowTutorial] = useState(false);

  // Check if tutorial should be shown
  useEffect(() => {
    const checkTutorialStatus = async () => {
      const completed = await isTutorialCompleted();
      if (!completed) {
        // Show tutorial after a short delay
        setTimeout(() => {
          setShowTutorial(true);
        }, 1000);
      }
    };
    checkTutorialStatus();
  }, []);

  // Initialize shared values only if reanimated is available
  const logoScale = useSharedValue ? useSharedValue(0) : { value: 1 };
  const logoOpacity = useSharedValue ? useSharedValue(0) : { value: 1 };
  const titleOpacity = useSharedValue ? useSharedValue(0) : { value: 1 };
  const titleTranslateY = useSharedValue ? useSharedValue(30) : { value: 0 };
  const featuresOpacity = useSharedValue ? useSharedValue(0) : { value: 1 };
  const buttonOpacity = useSharedValue ? useSharedValue(0) : { value: 1 };
  const buttonScale = useSharedValue ? useSharedValue(0.8) : { value: 1 };

  useEffect(() => {
    // Only run animations if reanimated is available
    if (!withSpring || !withTiming || !logoScale || !logoOpacity) {
      return;
    }

    // Logo animation
    logoScale.value = withSpring(1, EASING.spring);
    logoOpacity.value = withTiming(1, { duration: ANIMATION_DURATION.normal });

    // Title animation
    setTimeout(() => {
      titleOpacity.value = withTiming(1, { duration: ANIMATION_DURATION.normal });
      titleTranslateY.value = withSpring(0, EASING.spring);
    }, 200);

    // Features animation
    setTimeout(() => {
      featuresOpacity.value = withTiming(1, { duration: ANIMATION_DURATION.slow });
    }, 400);

    // Button animation
    setTimeout(() => {
      buttonOpacity.value = withTiming(1, { duration: ANIMATION_DURATION.normal });
      buttonScale.value = withSpring(1, EASING.spring);
    }, 600);
  }, []);

  // Safe animated styles with fallback
  const logoStyle = useAnimatedStyle && logoScale && logoOpacity
    ? useAnimatedStyle(() => ({
      transform: [{ scale: logoScale.value }],
      opacity: logoOpacity.value,
    }))
    : {};

  const titleStyle = useAnimatedStyle && titleOpacity && titleTranslateY
    ? useAnimatedStyle(() => ({
      opacity: titleOpacity.value,
      transform: [{ translateY: titleTranslateY.value }],
    }))
    : {};

  const featuresStyle = useAnimatedStyle && featuresOpacity
    ? useAnimatedStyle(() => ({
      opacity: featuresOpacity.value,
    }))
    : {};

  const buttonStyle = useAnimatedStyle && buttonOpacity && buttonScale
    ? useAnimatedStyle(() => ({
      opacity: buttonOpacity.value,
      transform: [{ scale: buttonScale.value }],
    }))
    : {};

  const features = [
    { icon: 'shopping', text: 'Shop Quality Products' },
    { icon: 'truck-fast', text: 'Fast Delivery' },
    { icon: 'shield-check', text: 'Secure Payments' },
  ];

  const tutorialSteps = [
    {
      id: '1',
      title: 'Welcome to Thamili!',
      description: 'Your one-stop shop for fresh and quality products, delivered right to your door.',
      icon: 'hand-wave',
    },
    {
      id: '2',
      title: 'Explore Products',
      description: 'Browse a wide selection of fresh fish, vegetables, and more. Find exactly what you need with smart search and filters.',
      icon: 'shopping',
    },
    {
      id: '3',
      title: 'Easy Checkout',
      description: 'Add items to your cart, choose home delivery or pickup, and pay securely with multiple options.',
      icon: 'credit-card',
    },
    {
      id: '4',
      title: 'Track Your Order',
      description: 'Stay updated with real-time order tracking and estimated delivery times.',
      icon: 'truck-fast',
    },
  ];

  const handleTutorialComplete = async () => {
    await setTutorialCompleted();
    setShowTutorial(false);
  };

  const handleTutorialSkip = async () => {
    await setTutorialCompleted();
    setShowTutorial(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={[colors.navy[500], colors.primary[500]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <AnimatedView style={{ flex: 1, opacity: logoOpacity }}>
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: padding.horizontal * 1.5,
              paddingTop: padding.vertical * 4,
              paddingBottom: padding.vertical * 4,
            }}
            showsVerticalScrollIndicator={false}
          >
            <AnimatedView style={[styles.logoContainer, logoStyle]}>
              <View style={styles.logoCircle}>
                <Image
                  source={ASSETS.logo}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
            </AnimatedView>

            <AnimatedView style={[styles.titleContainer, titleStyle]}>
              <Text style={styles.title}>Welcome to Tamili</Text>
              <Text style={styles.subtitle}>
                Your trusted marketplace for quality products
              </Text>
            </AnimatedView>

            <AnimatedView style={[styles.featuresContainer, featuresStyle]}>
              {features.map((feature, index) => (
                <View key={index} style={styles.feature}>
                  <View style={styles.featureIconContainer}>
                    <Icon
                      name={feature.icon as any}
                      size={28}
                      color={colors.primary[100]}
                    />
                  </View>
                  <Text style={styles.featureText}>{feature.text}</Text>
                </View>
              ))}
            </AnimatedView>

            <AnimatedView style={[styles.buttonContainer, buttonStyle]}>
              <Button
                title="Get Started"
                onPress={() => navigation.navigate('CountrySelection' as never)}
                variant="primary"
                size="lg"
                fullWidth
                style={styles.button}
                textStyle={styles.buttonText}
              />
            </AnimatedView>
          </ScrollView>
        </AnimatedView>
      </LinearGradient>

      {/* Onboarding Tutorial */}
      {showTutorial && (
        <OnboardingTutorial
          steps={tutorialSteps}
          onComplete={handleTutorialComplete}
          onSkip={handleTutorialSkip}
          visible={showTutorial}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  logoContainer: {
    marginBottom: 48,
    alignItems: 'center',
  },
  logoCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowRadius: 16,
    ...Platform.select({
      web: {
        boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.2)',
      },
      default: {
        elevation: 8,
      },
    }),
  },
  logoImage: {
    width: 150,
    height: 150,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 56,
  },
  title: {
    fontSize: getResponsiveFontSize(36),
    fontWeight: '800',
    color: 'white',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: -0.5,
    ...Platform.select({
      web: {
        textShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      },
      default: {
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
      },
    }),
  },
  subtitle: {
    fontSize: getResponsiveFontSize(18),
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '500',
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 56,
    paddingHorizontal: 12,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  featureText: {
    fontSize: getResponsiveFontSize(18),
    color: 'white',
    fontWeight: '600',
    flex: 1,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    backgroundColor: 'white',
    height: 56,
    borderRadius: 16,
    shadowRadius: 8,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
      },
      default: {
        elevation: 4,
      },
    }),
  },
  buttonText: {
    color: colors.primary[600],
    fontWeight: '700',
    fontSize: 18,
  },
  skipButton: {
    backgroundColor: 'transparent',
    height: 48,
  },
  skipButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default WelcomeScreen;

