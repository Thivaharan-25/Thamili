/**
 * Trust Badge Component
 * Displays security and trust indicators
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../theme';
import { EASING } from '../utils/animations';

// Safe import of reanimated with fallback
let Animated: any;
let useAnimatedStyle: any;
let useSharedValue: any;
let withSpring: any;

try {
  const Reanimated = require('react-native-reanimated');
  Animated = Reanimated.default || Reanimated;
  useAnimatedStyle = Reanimated.useAnimatedStyle;
  useSharedValue = Reanimated.useSharedValue;
  withSpring = Reanimated.withSpring;
} catch (e) {
  console.log('⚠️ [TrustBadge] Reanimated not available, using fallback');
}

// Create safe Animated.View component
const AnimatedView = Animated && Animated.View 
  ? Animated.View 
  : Animated && Animated.createAnimatedComponent 
    ? Animated.createAnimatedComponent(View)
    : View;

interface TrustBadgeProps {
  type: 'ssl' | 'secure-payment' | 'money-back' | 'verified' | 'guarantee';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  onPress?: () => void;
  style?: any;
}

const TrustBadge: React.FC<TrustBadgeProps> = ({
  type,
  size = 'md',
  showLabel = true,
  onPress,
  style,
}) => {
  // Initialize shared value only if reanimated is available
  const scale = useSharedValue ? useSharedValue(1) : { value: 1 };

  const handlePressIn = () => {
    if (withSpring && scale) {
      scale.value = withSpring(0.95, EASING.spring);
    }
  };

  const handlePressOut = () => {
    if (withSpring && scale) {
      scale.value = withSpring(1, EASING.spring);
    }
  };

  // Safe animated style with fallback
  const animatedStyle = useAnimatedStyle && scale
    ? useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
      }))
    : {};

  const getConfig = () => {
    switch (type) {
      case 'ssl':
        return {
          icon: 'lock',
          label: 'SSL Secured',
          color: colors.success[500],
          bgColor: colors.success[50],
        };
      case 'secure-payment':
        return {
          icon: 'shield-check',
          label: 'Secure Payment',
          color: colors.primary[500],
          bgColor: colors.primary[50],
        };
      case 'money-back':
        return {
          icon: 'cash-refund',
          label: 'Money Back',
          color: colors.success[500],
          bgColor: colors.success[50],
        };
      case 'verified':
        return {
          icon: 'check-circle',
          label: 'Verified',
          color: colors.primary[500],
          bgColor: colors.primary[50],
        };
      case 'guarantee':
        return {
          icon: 'certificate',
          label: 'Guaranteed',
          color: colors.warning[500],
          bgColor: colors.warning[50],
        };
      default:
        return {
          icon: 'shield',
          label: 'Secure',
          color: colors.primary[500],
          bgColor: colors.primary[50],
        };
    }
  };

  const getSizeConfig = () => {
    switch (size) {
      case 'sm':
        return { iconSize: 16, fontSize: 12, padding: 6 };
      case 'lg':
        return { iconSize: 24, fontSize: 14, padding: 12 };
      default:
        return { iconSize: 20, fontSize: 13, padding: 8 };
    }
  };

  const config = getConfig();
  const sizeConfig = getSizeConfig();

  const content = (
    <AnimatedView
      style={[
        styles.container,
        {
          backgroundColor: config.bgColor,
          padding: sizeConfig.padding,
        },
        animatedStyle,
        style,
      ]}
    >
      <Icon
        name={config.icon as any}
        size={sizeConfig.iconSize}
        color={config.color}
      />
      {showLabel && (
        <Text
          style={[
            styles.label,
            {
              color: config.color,
              fontSize: sizeConfig.fontSize,
              marginLeft: 6,
            },
          ]}
        >
          {config.label}
        </Text>
      )}
    </AnimatedView>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityLabel={config.label}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  label: {
    fontWeight: '600',
  },
});

export default TrustBadge;

