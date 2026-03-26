/**
 * Branded Splash Screen
 * Animated transition from app logo to Home screen skeleton.
 * Shown during initial session/country loading instead of generic LoadingScreen.
 *
 * Flow:
 *  1. Logo fades in + scales up (0-600ms)
 *  2. Tagline fades in below logo (400-800ms)
 *  3. Logo group slides up + fades out while skeleton fades in (1200-1800ms)
 */

import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { ASSETS } from '../constants/assets';
import { colors } from '../theme';
import SkeletonLoader from './SkeletonLoader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface BrandedSplashProps {
  /** Optional message shown below the tagline while loading */
  message?: string;
}

const BrandedSplash: React.FC<BrandedSplashProps> = ({ message }) => {
  // 0 → 1 drives the full timeline
  const progress = useSharedValue(0);

  useEffect(() => {
    // Phase 1: logo entrance (0 → 0.5 over 800ms)
    progress.value = withTiming(0.5, { duration: 800, easing: Easing.out(Easing.cubic) }, () => {
      // Phase 2: morph to skeleton (0.5 → 1 over 600ms, after 400ms hold)
      progress.value = withDelay(
        400,
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.cubic) })
      );
    });
  }, []);

  // --- Logo group (center of screen → slides up + fades out) ---
  const logoStyle = useAnimatedStyle(() => {
    const scale = interpolate(progress.value, [0, 0.3, 0.5, 1], [0.6, 1.05, 1, 0.9]);
    const opacity = interpolate(progress.value, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);
    const translateY = interpolate(progress.value, [0.5, 1], [0, -80]);
    return {
      transform: [{ scale }, { translateY }],
      opacity,
    };
  });

  // --- Tagline ---
  const taglineStyle = useAnimatedStyle(() => {
    const opacity = interpolate(progress.value, [0.25, 0.5, 0.7, 1], [0, 1, 1, 0]);
    const translateY = interpolate(progress.value, [0.25, 0.5, 1], [12, 0, -60]);
    return { opacity, transform: [{ translateY }] };
  });

  // --- Skeleton content (fades in during phase 2) ---
  const skeletonStyle = useAnimatedStyle(() => {
    const opacity = interpolate(progress.value, [0.7, 1], [0, 1]);
    const translateY = interpolate(progress.value, [0.7, 1], [30, 0]);
    return { opacity, transform: [{ translateY }] };
  });

  // --- Loading dots ---
  const dotsStyle = useAnimatedStyle(() => {
    const opacity = interpolate(progress.value, [0.3, 0.5, 0.85, 1], [0, 0.7, 0.7, 0]);
    return { opacity };
  });

  return (
    <View style={styles.container}>
      {/* Background gradient feel via layered colors */}
      <View style={styles.bgTop} />

      {/* Logo group — centered */}
      <Animated.View style={[styles.logoGroup, logoStyle]}>
        <Image source={ASSETS.logo} style={styles.logo} resizeMode="contain" />
      </Animated.View>

      {/* Tagline */}
      <Animated.View style={[styles.taglineContainer, taglineStyle]}>
        <Text style={styles.tagline}>Fresh from home, delivered with love</Text>
      </Animated.View>

      {/* Loading indicator */}
      <Animated.View style={[styles.dotsContainer, dotsStyle]}>
        <View style={styles.dotsRow}>
          <View style={[styles.dot, { backgroundColor: colors.primary[400] }]} />
          <View style={[styles.dot, { backgroundColor: colors.primary[500] }]} />
          <View style={[styles.dot, { backgroundColor: colors.primary[400] }]} />
        </View>
        {message ? <Text style={styles.loadingMessage}>{message}</Text> : null}
      </Animated.View>

      {/* Skeleton content — mimics Home screen layout */}
      <Animated.View style={[styles.skeletonContainer, skeletonStyle]}>
        {/* Fake header */}
        <View style={styles.skeletonHeader}>
          <View>
            <SkeletonLoader width={100} height={14} borderRadius={7} />
            <View style={{ height: 8 }} />
            <SkeletonLoader width={180} height={22} borderRadius={8} />
          </View>
          <SkeletonLoader width={40} height={40} borderRadius={20} />
        </View>

        {/* Fake search bar */}
        <View style={styles.skeletonSearch}>
          <SkeletonLoader width="100%" height={48} borderRadius={12} />
        </View>

        {/* Fake category row */}
        <View style={styles.skeletonCategories}>
          {[60, 55, 70, 50, 65].map((w, i) => (
            <View key={i} style={{ alignItems: 'center', marginRight: 16 }}>
              <SkeletonLoader width={44} height={44} borderRadius={22} />
              <View style={{ height: 6 }} />
              <SkeletonLoader width={w} height={10} borderRadius={5} />
            </View>
          ))}
        </View>

        {/* Fake product cards row */}
        <View style={styles.skeletonProducts}>
          {[1, 2].map((i) => (
            <View key={i} style={styles.skeletonCard}>
              <SkeletonLoader width="100%" height={100} borderRadius={10} />
              <View style={{ height: 10 }} />
              <SkeletonLoader width="75%" height={12} borderRadius={6} />
              <View style={{ height: 6 }} />
              <SkeletonLoader width="50%" height={14} borderRadius={6} />
              <View style={{ height: 8 }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <SkeletonLoader width={60} height={24} borderRadius={12} />
                <SkeletonLoader width={32} height={32} borderRadius={16} />
              </View>
            </View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bgTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '35%',
    backgroundColor: colors.navy[500],
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },

  // Logo
  logoGroup: {
    position: 'absolute',
    top: '28%',
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 28,
  },

  // Tagline
  taglineContainer: {
    position: 'absolute',
    top: '47%',
    alignItems: 'center',
  },
  tagline: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.navy[300],
    letterSpacing: 0.3,
  },

  // Loading dots
  dotsContainer: {
    position: 'absolute',
    top: '54%',
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  loadingMessage: {
    fontSize: 12,
    color: colors.navy[300],
    marginTop: 10,
  },

  // Skeleton
  skeletonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F8FAFC',
    paddingTop: 56,
  },
  skeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: colors.navy[500],
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  skeletonSearch: {
    paddingHorizontal: 20,
    marginTop: -24,
    zIndex: 10,
  },
  skeletonCategories: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  skeletonProducts: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 12,
  },
  skeletonCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
});

BrandedSplash.displayName = 'BrandedSplash';

export default React.memo(BrandedSplash);
