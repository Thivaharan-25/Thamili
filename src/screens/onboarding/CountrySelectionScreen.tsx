/**
 * Country Selection Screen - Second screen of onboarding
 * Allows users to select their country with visual feedback
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { RootStackParamList } from '../../types';
import { colors } from '../../theme';
import { COUNTRIES } from '../../constants';
import type { Country } from '../../constants';
// Import only supported countries

import { EASING, ANIMATION_DURATION } from '../../utils/animations';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import Button from '../../components/Button';
import { mediumHaptic } from '../../utils/hapticFeedback';
import { isSmallDevice, isTablet, getResponsivePadding, getResponsiveFontSize } from '../../utils/responsive';

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
  console.log('⚠️ [CountrySelectionScreen] Reanimated not available, using fallback');
}

// Create safe Animated components
const AnimatedView = Animated && Animated.View
  ? Animated.View
  : Animated && Animated.createAnimatedComponent
    ? Animated.createAnimatedComponent(View)
    : View;

const AnimatedTouchable = Animated && Animated.createAnimatedComponent
  ? Animated.createAnimatedComponent(TouchableOpacity)
  : TouchableOpacity;

const { width } = Dimensions.get('window');

type CountrySelectionScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'CountrySelection'
>;

const CountrySelectionScreen = () => {
  const navigation = useNavigation<CountrySelectionScreenNavigationProp>();
  const { updateCountryPreference, user, isAuthenticated } = useAuthStore();
  const { selectedCountry: cartCountry, setSelectedCountry: setCartCountry } = useCartStore();
  const padding = getResponsivePadding();

  // Use user's country preference if authenticated, otherwise use cart store
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(
    (isAuthenticated && user?.country_preference)
      ? (user.country_preference as Country)
      : (cartCountry as Country) || null
  );

  // Initialize shared values only if reanimated is available
  const containerOpacity = useSharedValue ? useSharedValue(0) : { value: 1 };
  const titleOpacity = useSharedValue ? useSharedValue(0) : { value: 1 };
  const titleTranslateY = useSharedValue ? useSharedValue(30) : { value: 0 };
  const cardsOpacity = useSharedValue ? useSharedValue(0) : { value: 1 };
  const buttonOpacity = useSharedValue ? useSharedValue(0) : { value: 1 };

  useEffect(() => {
    // Only run animations if reanimated is available
    if (!withSpring || !withTiming || !containerOpacity) {
      return;
    }

    containerOpacity.value = withTiming(1, { duration: ANIMATION_DURATION.normal });
    titleOpacity.value = withTiming(1, { duration: ANIMATION_DURATION.normal });
    titleTranslateY.value = withSpring(0, EASING.spring);

    setTimeout(() => {
      cardsOpacity.value = withTiming(1, { duration: ANIMATION_DURATION.slow });
    }, 200);

    setTimeout(() => {
      buttonOpacity.value = withTiming(1, { duration: ANIMATION_DURATION.normal });
    }, 400);
  }, []);

  // Safe animated styles with fallback
  const containerStyle = useAnimatedStyle && containerOpacity
    ? useAnimatedStyle(() => ({
      opacity: containerOpacity.value,
    }))
    : {};

  const titleStyle = useAnimatedStyle && titleOpacity && titleTranslateY
    ? useAnimatedStyle(() => ({
      opacity: titleOpacity.value,
      transform: [{ translateY: titleTranslateY.value }],
    }))
    : {};

  const cardsStyle = useAnimatedStyle && cardsOpacity
    ? useAnimatedStyle(() => ({
      opacity: cardsOpacity.value,
    }))
    : {};

  const buttonStyle = useAnimatedStyle && buttonOpacity
    ? useAnimatedStyle(() => ({
      opacity: buttonOpacity.value,
    }))
    : {};

  const handleCountrySelect = (country: Country) => {
    mediumHaptic();
    setSelectedCountry(country);
  };

  const handleContinue = async () => {
    if (selectedCountry) {
      // Update country in cart store (for guest users)
      const { setSelectedCountry } = useCartStore.getState();
      await setSelectedCountry(selectedCountry);

      // Update country preference in auth store (for authenticated users)
      if (isAuthenticated) {
        await updateCountryPreference(selectedCountry);
      }

      // Complete onboarding if not already completed
      const { hasCompletedOnboarding, completeOnboarding } = useAuthStore.getState();
      if (!hasCompletedOnboarding) {
        await completeOnboarding();
      }

      // Navigate to main app
      navigation.navigate('Main' as never);
    }
  };

  const countries = [
    {
      key: COUNTRIES.GERMANY,
      name: 'Germany',
      flag: '🇩🇪',
      currency: 'EUR',
      description: 'Shop in Euros',
    },
    {
      key: COUNTRIES.DENMARK,
      name: 'Denmark',
      flag: '🇩🇰',
      currency: 'EUR',
      description: 'Shop in Euros',
    },
  ];

  return (
    <AnimatedView style={[styles.container, containerStyle]}>
      <AnimatedView style={[styles.header, titleStyle, { paddingHorizontal: padding.horizontal }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="arrow-left" size={24} color={colors.neutral[700]} />
        </TouchableOpacity>
        <Text style={styles.title}>Select Your Country</Text>
        <Text style={styles.subtitle}>
          Choose your location to see products and prices
        </Text>
      </AnimatedView>

      <AnimatedView style={[styles.cardsContainer, cardsStyle, { paddingHorizontal: padding.horizontal }]}>
        {countries.map((country, index) => {
          const isSelected = selectedCountry === country.key;

          // Simple style without hooks - use conditional styling
          const cardStyle = {
            transform: [{ scale: isSelected ? 1.02 : 1 }],
            borderColor: isSelected ? colors.primary[500] : colors.neutral[200],
            borderWidth: isSelected ? 2 : 2,
          };

          return (
            <AnimatedTouchable
              key={country.key}
              style={[styles.countryCard, cardStyle]}
              onPress={() => handleCountrySelect(country.key)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Select ${country.name}`}
              accessibilityState={{ selected: isSelected }}
            >
              <View style={styles.flagContainer}>
                <Text style={styles.flag}>{country.flag}</Text>
              </View>
              <View style={styles.countryInfo}>
                <Text style={styles.countryName}>{country.name}</Text>
                <Text style={styles.countryDescription}>{country.description}</Text>
              </View>
              {isSelected && (
                <AnimatedView style={styles.checkContainer}>
                  <Icon name="check-circle" size={24} color={colors.primary[500]} />
                </AnimatedView>
              )}
            </AnimatedTouchable>
          );
        })}
      </AnimatedView>

      <AnimatedView style={[styles.buttonContainer, buttonStyle, { paddingHorizontal: padding.horizontal, paddingBottom: padding.vertical * 2, paddingTop: padding.vertical }]}>
        <Button
          title="Continue"
          onPress={handleContinue}
          variant="primary"
          size="lg"
          fullWidth
          disabled={!selectedCountry}
        />
      </AnimatedView>
    </AnimatedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
    paddingTop: 60,
  },
  header: {
    marginBottom: 32,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: getResponsiveFontSize(28),
    fontWeight: 'bold',
    color: colors.neutral[900],
    marginBottom: 8,
  },
  subtitle: {
    fontSize: getResponsiveFontSize(16),
    color: colors.neutral[600],
    lineHeight: 24,
  },
  cardsContainer: {
    flex: 1,
    gap: 16,
  },
  countryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  flagContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  flag: {
    fontSize: 32,
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: 4,
  },
  countryDescription: {
    fontSize: getResponsiveFontSize(14),
    color: colors.neutral[600],
  },
  checkContainer: {
    marginLeft: 12,
  },
  buttonContainer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
});

export default CountrySelectionScreen;

