/**
 * Mock for react-native-reanimated in Expo Go
 * Prevents NullPointerException and _toString errors when native module isn't available
 */

const ReactNative = require('react-native');
const React = require('react');

// Simple mocks that return values without using native modules
class MockSharedValue {
  constructor(value) {
    this._value = value;
  }
  get value() {
    return this._value;
  }
  set value(newValue) {
    this._value = newValue;
  }
  toString() {
    return String(this._value);
  }
  // Add _toString to prevent errors
  _toString() {
    return String(this._value);
  }
}

// Mock Animated component
const MockAnimated = {
  View: ReactNative.View,
  Text: ReactNative.Text,
  Image: ReactNative.Image,
  ScrollView: ReactNative.ScrollView,
  createAnimatedComponent: (Component) => {
    // Create a wrapper component that preserves all properties
    if (!Component) {
      const Fallback = ReactNative.View;
      Fallback.displayName = 'AnimatedView';
      return Fallback;
    }
    
    // If Component is already a function/component, wrap it
    const WrappedComponent = React.forwardRef((props, ref) => {
      return React.createElement(Component, { ...props, ref });
    });
    
    // ALWAYS set displayName - this is critical for NativeWind CSS interop
    const componentName = Component.displayName || Component.name || 'Component';
    WrappedComponent.displayName = `Animated${componentName}`;
    
    // Ensure displayName is not undefined (safety check)
    if (!WrappedComponent.displayName) {
      WrappedComponent.displayName = 'AnimatedComponent';
    }
    
    // Copy over any other properties from the original component
    if (Component.propTypes) {
      WrappedComponent.propTypes = Component.propTypes;
    }
    if (Component.defaultProps) {
      WrappedComponent.defaultProps = Component.defaultProps;
    }
    
    return WrappedComponent;
  },
};

const mockReanimated = {
  default: MockAnimated,
  useSharedValue: (value) => new MockSharedValue(value),
  useAnimatedStyle: () => ({}),
  withTiming: (value, config) => value,
  withSpring: (value, config) => value,
  withRepeat: (value, iterations, reverse) => value,
  withSequence: (...values) => values[values.length - 1],
  withDelay: (delay, value) => value,
  interpolate: (value, inputRange, outputRange) => outputRange[0],
  Extrapolate: {
    EXTEND: 'extend',
    CLAMP: 'clamp',
    IDENTITY: 'identity',
  },
  createAnimatedComponent: (Component) => Component,
  Easing: {
    linear: (t) => t,
    ease: (t) => t,
    quad: (t) => t * t,
    cubic: (t) => t * t * t,
    poly: (n) => (t) => Math.pow(t, n),
    sin: (t) => 1 - Math.cos(t * Math.PI / 2),
    circle: (t) => 1 - Math.sqrt(1 - t * t),
    exp: (t) => Math.pow(2, 10 * (t - 1)),
    elastic: (bounciness = 1) => (t) => t,
    back: (s = 1.70158) => (t) => t,
    bounce: (t) => t,
    bezier: (x1, y1, x2, y2) => (t) => t,
    in: (easing) => easing,
    out: (easing) => easing,
    inOut: (easing) => easing,
  },
  runOnJS: (fn) => fn,
  runOnUI: (fn) => fn,
  cancelAnimation: () => {},
  makeMutable: (value) => new MockSharedValue(value),
  makeRemote: (value) => new MockSharedValue(value),
  // Add _toString method to prevent errors
  _toString: () => '[ReanimatedMock]',
};

// Ensure default export
module.exports = mockReanimated;
module.exports.default = mockReanimated;

// Export named exports
module.exports.useSharedValue = mockReanimated.useSharedValue;
module.exports.useAnimatedStyle = mockReanimated.useAnimatedStyle;
module.exports.withTiming = mockReanimated.withTiming;
module.exports.withSpring = mockReanimated.withSpring;
module.exports.withRepeat = mockReanimated.withRepeat;
module.exports.withSequence = mockReanimated.withSequence;
module.exports.withDelay = mockReanimated.withDelay;
module.exports.interpolate = mockReanimated.interpolate;
module.exports.Extrapolate = mockReanimated.Extrapolate;
module.exports.createAnimatedComponent = mockReanimated.createAnimatedComponent;
module.exports.Easing = mockReanimated.Easing;
module.exports.runOnJS = mockReanimated.runOnJS;
module.exports.runOnUI = mockReanimated.runOnUI;
module.exports.cancelAnimation = mockReanimated.cancelAnimation;
module.exports.makeMutable = mockReanimated.makeMutable;
module.exports.makeRemote = mockReanimated.makeRemote;

