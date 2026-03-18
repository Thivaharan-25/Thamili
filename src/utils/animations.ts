/**
 * Animation Utilities for Thamili App
 * Reusable animation configurations using react-native-reanimated
 * Safe wrapper for Expo Go compatibility
 */

// Use safe wrapper to prevent NullPointerException in Expo Go
let withTimingFn: any;
let withSpringFn: any;
let withSequenceFn: any;
let EasingObj: any;

try {
  const Reanimated = require('react-native-reanimated');
  withTimingFn = Reanimated.withTiming;
  withSpringFn = Reanimated.withSpring;
  withSequenceFn = Reanimated.withSequence;
  EasingObj = Reanimated.Easing;
} catch (e) {
  // Fallbacks if reanimated not available
  withTimingFn = (value: any) => value;
  withSpringFn = (value: any) => value;
  withSequenceFn = (...args: any[]) => args[args.length - 1];
  EasingObj = {
    linear: (t: number) => t,
    ease: (t: number) => t,
    in: (easing: any) => easing,
    out: (easing: any) => easing,
    inOut: (easing: any) => easing,
  };
}

const withTiming = withTimingFn;
const withSpring = withSpringFn;
const withSequence = withSequenceFn;
const Easing = EasingObj;
type SharedValue = any;

// Animation durations (in milliseconds)
export const ANIMATION_DURATION = {
  fast: 150,
  normal: 250,
  slow: 350,
  slower: 500,
} as const;

// Easing functions
export const EASING = {
  linear: Easing.linear,
  easeIn: Easing.in(Easing.ease),
  easeOut: Easing.out(Easing.ease),
  easeInOut: Easing.inOut(Easing.ease),
  // Smooth, non-bouncy spring
  spring: {
    damping: 25,
    stiffness: 150,
    mass: 1,
  },
} as const;

/**
 * Animation helper functions
 * These return animated values that can be used in useAnimatedStyle
 */

/**
 * Create fade in animated value
 */
export const createFadeIn = (duration: number = ANIMATION_DURATION.normal) => {
  return withTiming(1, {
    duration,
    easing: EASING.easeOut,
  });
};

/**
 * Create fade out animated value
 */
export const createFadeOut = (duration: number = ANIMATION_DURATION.normal) => {
  return withTiming(0, {
    duration,
    easing: EASING.easeIn,
  });
};

/**
 * Create slide up animated value
 */
export const createSlideUp = (
  fromValue: number = 20,
  duration: number = ANIMATION_DURATION.normal
) => {
  return withTiming(0, {
    duration,
    easing: EASING.easeOut,
  });
};

/**
 * Create slide down animated value
 */
export const createSlideDown = (
  toValue: number = 20,
  duration: number = ANIMATION_DURATION.normal
) => {
  return withTiming(toValue, {
    duration,
    easing: EASING.easeIn,
  });
};

/**
 * Create scale animated value
 */
export const createScale = (
  scaleValue: number = 0.95,
  duration: number = ANIMATION_DURATION.fast
) => {
  return withTiming(scaleValue, {
    duration,
    easing: EASING.easeOut,
  });
};

/**
 * Create scale normal animated value
 */
export const createScaleNormal = (duration: number = ANIMATION_DURATION.fast) => {
  return withTiming(1, {
    duration,
    easing: EASING.easeOut,
  });
};

/**
 * Spring animation for smooth interactions
 */
export const spring = (
  toValue: number,
  config: {
    damping?: number;
    stiffness?: number;
    mass?: number;
  } = EASING.spring
) => {
  return withSpring(toValue, config);
};

/**
 * Timing animation with custom easing
 */
export const timing = (
  toValue: number,
  duration: number = ANIMATION_DURATION.normal,
  easing: typeof EASING.easeOut = EASING.easeOut
) => {
  return withTiming(toValue, { duration, easing });
};

/**
 * Button press animation
 */
export const buttonPress = {
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.8,
  },
  default: {
    transform: [{ scale: 1 }],
    opacity: 1,
  },
};

/**
 * Card press animation
 */
export const cardPress = {
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  default: {
    transform: [{ scale: 1 }],
  },
};

/**
 * Shimmer animation for loading states
 */
export const createShimmer = () => {
  return withTiming(0.5, {
    duration: 1000,
    easing: EASING.easeInOut,
  });
};

/**
 * Page transition animations
 */
export const PAGE_TRANSITIONS = {
  // Slide from right (default iOS)
  slideFromRight: {
    cardStyleInterpolator: ({ current, layouts }: any) => {
      return {
        cardStyle: {
          transform: [
            {
              translateX: current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [layouts.screen.width, 0],
              }),
            },
          ],
        },
      };
    },
  },
  // Slide from bottom (modal)
  slideFromBottom: {
    cardStyleInterpolator: ({ current }: any) => {
      return {
        cardStyle: {
          transform: [
            {
              translateY: current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [500, 0],
              }),
            },
          ],
        },
      };
    },
  },
  // Fade transition
  fade: {
    cardStyleInterpolator: ({ current }: any) => {
      return {
        cardStyle: {
          opacity: current.progress,
        },
      };
    },
  },
  // Scale transition
  scale: {
    cardStyleInterpolator: ({ current }: any) => {
      return {
        cardStyle: {
          transform: [
            {
              scale: current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.9, 1],
              }),
            },
          ],
          opacity: current.progress,
        },
      };
    },
  },
};

/**
 * Micro-interaction animations
 */
export const MICRO_INTERACTIONS = {
  // Subtle bounce animation for success
  bounce: (scale: number = 1.05) => {
    return withSpring(scale, {
      damping: 15,
      stiffness: 200,
      mass: 0.8,
    });
  },
  // Pulse animation
  pulse: () => {
    return withTiming(1.05, {
      duration: 200,
      easing: EASING.easeOut,
    });
  },
  // Shake animation for errors
  shake: (translateX: SharedValue) => {
    return withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  },
  // Smooth heartbeat animation
  heartBeat: (scale: SharedValue) => {
    return withSequence(
      withTiming(1.2, { duration: 150, easing: EASING.easeOut }),
      withTiming(1, { duration: 150, easing: EASING.easeIn })
    );
  },
  // Ripple effect
  ripple: (opacity: SharedValue, scale: SharedValue) => {
    return withTiming(0, {
      duration: 400,
      easing: EASING.easeOut,
    });
  },
};

/**
 * Loading animations
 */
export const LOADING_ANIMATIONS = {
  // Spinner rotation
  spinner: (rotation: SharedValue) => {
    return withTiming(360, {
      duration: 1000,
      easing: EASING.linear,
    });
  },
  // Skeleton shimmer
  shimmer: (translateX: SharedValue) => {
    return withTiming(300, {
      duration: 1500,
      easing: EASING.easeInOut,
    });
  },
  // Progress bar
  progress: (progress: SharedValue, toValue: number) => {
    return withTiming(toValue, {
      duration: 500,
      easing: EASING.easeOut,
    });
  },
};

/**
 * Card interaction animations
 */
export const CARD_ANIMATIONS = {
  // Lift on press
  lift: {
    pressed: {
      transform: [{ translateY: -4 }, { scale: 0.98 }],
      shadowOpacity: 0.3,
    },
    default: {
      transform: [{ translateY: 0 }, { scale: 1 }],
      shadowOpacity: 0.1,
    },
  },
  // Tilt on press
  tilt: {
    pressed: {
      transform: [{ rotate: '1deg' }, { scale: 0.98 }],
    },
    default: {
      transform: [{ rotate: '0deg' }, { scale: 1 }],
    },
  },
  // Glow effect
  glow: (opacity: SharedValue) => {
    return withSequence(
      withTiming(0.8, { duration: 300 }),
      withTiming(0.3, { duration: 300 })
    );
  },
};

