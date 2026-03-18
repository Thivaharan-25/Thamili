/// <reference types="nativewind/types" />
import React, { useState } from 'react';
import { Text, ActivityIndicator, ViewStyle, TextStyle, Pressable, View, StyleProp } from 'react-native';
import { remapProps } from 'react-native-css-interop';

import { colors } from '../theme';
import { mediumHaptic } from '../utils/hapticFeedback';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: TextStyle;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  icon?: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'button' | 'link' | 'none';
  className?: string; // Managed by remapProps
}

/**
 * Simplified Button Component for Troubleshooting
 * Uses remapProps to safely handle NativeWind styles and avoids Reanimated hooks to isolate crashes.
 */
const Button = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = false,
  size = 'md',
  icon,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
}: ButtonProps) => {
  const [pressed, setPressed] = useState(false);

  const handlePressIn = () => {
    setPressed(true);
  };

  const handlePressOut = () => {
    setPressed(false);
  };

  const handlePress = (e?: any) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    if (e && typeof e.preventDefault === 'function') e.preventDefault();

    if (!disabled && !loading) {
      mediumHaptic();
      onPress();
    }
  };

  const baseStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    overflow: 'hidden',
    opacity: disabled || loading ? 0.5 : 1,
    transform: [{ scale: pressed ? 0.97 : 1 }],
    width: fullWidth ? '100%' : undefined,
    flexShrink: 1,
  };

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'primary': return { backgroundColor: colors.primary[500], borderWidth: 0 };
      case 'secondary':
      case 'outline': return { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.primary[500] };
      case 'danger': return { backgroundColor: colors.error[500], borderWidth: 0 };
      case 'ghost': return { backgroundColor: 'transparent', borderWidth: 0 };
      default: return { backgroundColor: colors.primary[500], borderWidth: 0 };
    }
  };

  const getTextColorStyle = (): TextStyle => {
    switch (variant) {
      case 'outline':
      case 'secondary':
      case 'ghost': return { color: colors.primary[500] };
      default: return { color: '#fff' };
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'px-4 py-2 min-h-[44px]';
      case 'md': return 'px-6 py-3 min-h-[48px]';
      case 'lg': return 'px-8 py-4 min-h-[56px]';
      case 'xl': return 'px-10 py-5 min-h-[64px]';
      default: return 'px-6 py-3 min-h-[48px]';
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'sm': return 'text-sm';
      case 'md': return 'text-base';
      case 'lg': return 'text-lg';
      case 'xl': return 'text-xl';
      default: return 'text-base';
    }
  };

  // Merge mapping style from remapProps (style prop) with base component styles
  const containerStyle = [
    baseStyle,
    getVariantStyle(),
    style,
  ].filter(Boolean);

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={containerStyle}
      className={getSizeClasses()}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {pressed && (
        <View
          style={{
            position: 'absolute',
            width: '200%',
            height: '200%',
            borderRadius: 999,
            backgroundColor: variant === 'outline' || variant === 'ghost' || variant === 'secondary'
              ? colors.primary[200]
              : 'rgba(255, 255, 255, 0.3)',
            top: '50%',
            left: '50%',
            marginTop: '-100%',
            marginLeft: '-100%',
            opacity: 0.3,
          }}
        />
      )}

      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? colors.primary[500] : '#fff'}
          size="small"
        />
      ) : (
        <>
          {icon && <Text className="mr-2">{icon}</Text>}
          <Text
            className={`${getTextSize()} font-semibold`}
            style={[getTextColorStyle(), textStyle, { flexShrink: 1 }]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
};

// Use remapProps to safely map className to style prop for this custom component
remapProps(Button, {
  className: "style",
});

Button.displayName = 'Button';

export default Button;
