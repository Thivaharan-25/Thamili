/**
 * Branded Splash Screen — Premium redesign
 *
 * Design: Full dark-navy gradient + ripple rings + spring logo + wave dots
 *
 * Animation sequence:
 *  0ms        Logo springs in from small scale
 *  200ms      Ripple ring 1 starts expanding (loops)
 *  550ms      Ripple ring 2 starts expanding (loops, offset)
 *  900ms      Ripple ring 3 starts expanding (loops, offset)
 *  450ms      "THAMILI" slides up + fades in
 *  750ms      Tagline fades in
 *  800ms      Wave dots start bouncing (staggered 120ms per dot)
 */

import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, StatusBar } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  withSpring,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { ASSETS } from '../constants/assets';
import { colors } from '../theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Ring is sized to wrap around the logo wrapper (110px diameter)
const RING_SIZE = 130;

interface BrandedSplashProps {
  message?: string;
}

const BrandedSplash: React.FC<BrandedSplashProps> = ({ message }) => {
  // --- Logo ---
  const logoScale = useSharedValue(0.25);
  const logoOpacity = useSharedValue(0);

  // --- Ripple rings (one shared value each, 0→1 drives expand+fade) ---
  const ring1 = useSharedValue(0);
  const ring2 = useSharedValue(0);
  const ring3 = useSharedValue(0);

  // --- Text ---
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(28);
  const taglineOpacity = useSharedValue(0);

  // --- Wave dots (5 independent bounces) ---
  const d1 = useSharedValue(0);
  const d2 = useSharedValue(0);
  const d3 = useSharedValue(0);
  const d4 = useSharedValue(0);
  const d5 = useSharedValue(0);

  useEffect(() => {
    // Logo springs in
    logoScale.value = withSpring(1, { damping: 10, stiffness: 100 });
    logoOpacity.value = withTiming(1, { duration: 300 });

    // Ripple rings — staggered, each loops independently
    const rippleTiming = { duration: 1700, easing: Easing.out(Easing.cubic) };
    ring1.value = withDelay(200, withRepeat(withTiming(1, rippleTiming), -1, false));
    ring2.value = withDelay(550, withRepeat(withTiming(1, rippleTiming), -1, false));
    ring3.value = withDelay(900, withRepeat(withTiming(1, rippleTiming), -1, false));

    // Text reveals
    titleOpacity.value = withDelay(450, withTiming(1, { duration: 500 }));
    titleY.value = withDelay(450, withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }));
    taglineOpacity.value = withDelay(780, withTiming(1, { duration: 450 }));

    // Wave dots — each bounces with 120ms stagger
    const bounceDot = (sv: typeof d1, delay: number) => {
      sv.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(-13, { duration: 300, easing: Easing.out(Easing.cubic) }),
            withTiming(0, { duration: 300, easing: Easing.in(Easing.cubic) }),
            withTiming(0, { duration: 220 }) // brief rest before next bounce
          ),
          -1,
          false
        )
      );
    };

    bounceDot(d1, 850);
    bounceDot(d2, 970);
    bounceDot(d3, 1090);
    bounceDot(d4, 1210);
    bounceDot(d5, 1330);
  }, []);

  // Ripple ring animated styles
  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(ring1.value, [0, 1], [0.45, 2.6]) }],
    opacity: interpolate(ring1.value, [0, 0.12, 1], [0.8, 0.5, 0]),
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(ring2.value, [0, 1], [0.45, 2.6]) }],
    opacity: interpolate(ring2.value, [0, 0.12, 1], [0.8, 0.5, 0]),
  }));

  const ring3Style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(ring3.value, [0, 1], [0.45, 2.6]) }],
    opacity: interpolate(ring3.value, [0, 0.12, 1], [0.8, 0.5, 0]),
  }));

  const logoAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const titleAnimStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));

  const taglineAnimStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  const d1Style = useAnimatedStyle(() => ({ transform: [{ translateY: d1.value }] }));
  const d2Style = useAnimatedStyle(() => ({ transform: [{ translateY: d2.value }] }));
  const d3Style = useAnimatedStyle(() => ({ transform: [{ translateY: d3.value }] }));
  const d4Style = useAnimatedStyle(() => ({ transform: [{ translateY: d4.value }] }));
  const d5Style = useAnimatedStyle(() => ({ transform: [{ translateY: d5.value }] }));

  const dotAnimStyles = [d1Style, d2Style, d3Style, d4Style, d5Style];

  // Dots get progressively brighter in the middle
  const dotColors = [
    'rgba(58,181,209,0.45)',
    'rgba(58,181,209,0.7)',
    '#3AB5D1',
    'rgba(58,181,209,0.7)',
    'rgba(58,181,209,0.45)',
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Background gradient ── */}
      <LinearGradient
        colors={['#0D2356', '#0A1D44', '#071435']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Decorative soft glow blobs ── */}
      <View style={[styles.glowBlob, styles.glowTopRight]} />
      <View style={[styles.glowBlob, styles.glowBottomLeft]} />

      {/* ── Center logo + rings ── */}
      <View style={styles.centerArea}>
        {/* Ripple rings (positioned absolutely behind logo) */}
        <Animated.View style={[styles.ring, ring1Style]} />
        <Animated.View style={[styles.ring, ring2Style]} />
        <Animated.View style={[styles.ring, ring3Style]} />

        {/* Logo card */}
        <Animated.View style={[styles.logoWrapper, logoAnimStyle]}>
          <Image source={ASSETS.logo} style={styles.logoImage} resizeMode="contain" />
        </Animated.View>
      </View>

      {/* ── Brand name ── */}
      <Animated.View style={[styles.titleContainer, titleAnimStyle]}>
        <Text style={styles.brandName}>THAMILI</Text>
      </Animated.View>

      {/* ── Tagline ── */}
      <Animated.View style={taglineAnimStyle}>
        <Text style={styles.tagline}>
          {message || 'Fresh from home, delivered with love'}
        </Text>
      </Animated.View>

      {/* ── Wave loading dots ── */}
      <View style={styles.dotsRow}>
        {dotAnimStyles.map((dotStyle, i) => (
          <Animated.View
            key={i}
            style={[styles.dot, { backgroundColor: dotColors[i] }, dotStyle]}
          />
        ))}
      </View>

      {/* ── Bottom brand strip ── */}
      <View style={styles.bottomStrip}>
        <Text style={styles.bottomText}>தமிழி</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A1D44',
  },

  // Decorative background blobs
  glowBlob: {
    position: 'absolute',
    borderRadius: 999,
  },
  glowTopRight: {
    top: SCREEN_HEIGHT * 0.06,
    right: -70,
    width: 240,
    height: 240,
    backgroundColor: 'rgba(58,181,209,0.07)',
  },
  glowBottomLeft: {
    bottom: SCREEN_HEIGHT * 0.12,
    left: -90,
    width: 280,
    height: 280,
    backgroundColor: 'rgba(58,181,209,0.05)',
  },

  // Logo center area
  centerArea: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 36,
  },

  // Ripple ring — same size, scale is driven by animation
  ring: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 1.5,
    borderColor: '#3AB5D1',
  },

  // Logo card
  logoWrapper: {
    width: 110,
    height: 110,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.96)',
    justifyContent: 'center',
    alignItems: 'center',
    // Cyan glow shadow
    shadowColor: '#3AB5D1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 20,
  },
  logoImage: {
    width: 78,
    height: 78,
  },

  // Brand name
  titleContainer: {
    marginBottom: 10,
  },
  brandName: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 10,
  },

  // Tagline
  tagline: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(58,181,209,0.75)',
    letterSpacing: 0.4,
    textAlign: 'center',
    marginBottom: 52,
  },

  // Wave dots
  dotsRow: {
    position: 'absolute',
    bottom: 90,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 7,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Tamil script accent at very bottom
  bottomStrip: {
    position: 'absolute',
    bottom: 38,
    alignItems: 'center',
  },
  bottomText: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.2)',
    fontWeight: '600',
    letterSpacing: 2,
  },
});

BrandedSplash.displayName = 'BrandedSplash';

export default React.memo(BrandedSplash);
