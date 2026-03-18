/**
 * Modern Input Component with Floating Labels
 * Uses NativeWind for styling and react-native-reanimated for smooth focus animations
 */

import React, { useState } from 'react';
import { TextInput, Text, View, TextInputProps, ViewStyle, TouchableOpacity } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSequence,
  interpolate,
} from 'react-native-reanimated';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../theme';
import { ANIMATION_DURATION, EASING, MICRO_INTERACTIONS } from '../utils/animations';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  innerContainerStyle?: ViewStyle;
  leftIcon?: string | React.ReactNode;
  rightIcon?: string | React.ReactNode;
  floatingLabel?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'none' | 'text' | 'search' | 'none';
  showSuccess?: boolean; // Show success state when valid
  helperText?: string; // Helper text below input
  validateOnChange?: boolean; // Validate as user types
  onValidate?: (value: string) => string | undefined; // Custom validation function
  onRightIconPress?: () => void;
}

const AnimatedText = Animated.createAnimatedComponent(Text);
const AnimatedView = Animated.createAnimatedComponent(View);

const Input = React.forwardRef<TextInput, InputProps>(({
  label,
  error,
  containerStyle,
  innerContainerStyle,
  leftIcon,
  rightIcon,
  floatingLabel = false,
  value,
  onFocus,
  onBlur,
  style,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'text',
  showSuccess = false,
  helperText,
  validateOnChange = false,
  onValidate,
  onChangeText,
  onRightIconPress,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const [touched, setTouched] = useState(false);
  const [validationError, setValidationError] = useState<string | undefined>();
  const hasValue = Boolean(value && value.toString().length > 0);
  const shouldFloat = floatingLabel && (isFocused || hasValue);
  const displayError = error || (touched && validateOnChange ? validationError : undefined);
  const isValid = showSuccess && hasValue && !displayError && touched;

  const labelPosition = useSharedValue(hasValue ? 1 : 0);
  const labelScale = useSharedValue(hasValue ? 0.85 : 1);
  const borderColor = useSharedValue(displayError ? 1 : isValid ? 2 : isFocused ? 0.5 : 0);
  const shakeTranslateX = useSharedValue(0);

  React.useEffect(() => {
    labelPosition.value = withTiming(shouldFloat ? 1 : 0, {
      duration: ANIMATION_DURATION.normal,
      easing: EASING.easeOut,
    });
    labelScale.value = withTiming(shouldFloat ? 0.85 : 1, {
      duration: ANIMATION_DURATION.normal,
      easing: EASING.easeOut,
    });
  }, [shouldFloat]);

  // Handle validation on change
  const handleChangeText = (text: string) => {
    if (validateOnChange && onValidate && touched) {
      const validationResult = onValidate(text);
      setValidationError(validationResult);
    }
    onChangeText?.(text);
  };

  React.useEffect(() => {
    borderColor.value = withTiming(
      displayError ? 1 : isValid ? 2 : isFocused ? 0.5 : 0,
      { duration: ANIMATION_DURATION.fast }
    );

    // Shake animation on error
    if (displayError) {
      shakeTranslateX.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    } else {
      shakeTranslateX.value = 0;
    }
  }, [isFocused, error]);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    setTouched(true);
    if (validateOnChange && onValidate && value) {
      const validationResult = onValidate(value.toString());
      setValidationError(validationResult);
    }
    onBlur?.(e);
  };

  const labelAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(labelPosition.value, [0, 1], [0, -24]);
    const translateX = interpolate(labelPosition.value, [0, 1], [0, leftIcon ? -8 : -4]);

    return {
      transform: [
        { translateY },
        { translateX },
        { scale: labelScale.value },
      ],
      opacity: labelPosition.value === 1 ? 1 : 0.6,
    };
  });

  const borderAnimatedStyle = useAnimatedStyle(() => {
    const color = interpolate(
      borderColor.value,
      [0, 0.5, 1, 2],
      [0, 1, 2, 3] // 0: neutral, 1: primary, 2: error, 3: success
    );

    let borderColorValue: string = colors.neutral[300] as string;
    if (color >= 3) {
      borderColorValue = colors.success[500] as string;
    } else if (color >= 2) {
      borderColorValue = colors.error[500] as string;
    } else if (color >= 1) {
      borderColorValue = colors.primary[500] as string;
    }

    return {
      borderColor: borderColorValue,
      transform: [{ translateX: shakeTranslateX.value }],
    };
  });

  const renderIcon = (icon: string | React.ReactNode) => {
    if (typeof icon === 'string') {
      return (
        <Icon
          name={icon as any}
          size={20}
          color={isFocused ? colors.primary[600] : colors.neutral[900]}
        />
      );
    }
    return icon;
  };

  return (
    <View style={containerStyle} className="mb-4">
      <View className="relative">
        {/* Left Icon moved inside AnimatedView for better alignment */}

        {floatingLabel && label && (
          <AnimatedText
            style={labelAnimatedStyle}
            className={`
              absolute left-4 z-20
              ${shouldFloat ? 'text-primary-500' : 'text-neutral-600'}
              text-sm font-medium
            `}
          >
            {label}
          </AnimatedText>
        )}

        {!floatingLabel && label && (
          <Text className="text-sm font-medium text-neutral-700 mb-2">{label}</Text>
        )}

        <AnimatedView
          className={`
            flex-row items-center
            rounded-xl
          `}
          style={[
            borderAnimatedStyle,
            {
              backgroundColor: 'rgba(255, 255, 255, 0.85)',
              borderWidth: 1.5,
              borderColor: error
                ? colors.error[500]
                : isFocused
                  ? colors.primary[500]
                  : 'rgba(58, 181, 209, 0.2)',
              paddingLeft: 16,
              paddingRight: rightIcon ? 20 : 16,
            },
            innerContainerStyle,
          ]}
        >
          {leftIcon && (
            <View className="mr-3 justify-center">
              {renderIcon(leftIcon)}
            </View>
          )}
          <TextInput
            ref={ref}
            className={`
              flex-1 py-3
              text-base text-neutral-900
              ${floatingLabel && shouldFloat ? 'pt-5' : ''}
            `}
            placeholder={floatingLabel && shouldFloat ? undefined : label || props.placeholder}
            placeholderTextColor={colors.neutral[400]}
            value={value}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChangeText={handleChangeText}
            style={style}
            accessibilityLabel={accessibilityLabel || label}
            accessibilityHint={accessibilityHint || displayError || helperText}
            accessibilityRole={accessibilityRole}
            accessibilityState={{
              disabled: props.editable === false,
            }}
            {...props}
          />

          {isValid && (
            <View className="ml-2">
              <Icon name="check-circle" size={20} color={colors.success[500]} />
            </View>
          )}

          {rightIcon && !isValid && (
            <View className="ml-2">
              {onRightIconPress ? (
                <TouchableOpacity onPress={onRightIconPress}>
                  {renderIcon(rightIcon)}
                </TouchableOpacity>
              ) : (
                renderIcon(rightIcon)
              )}
            </View>
          )}
        </AnimatedView>
      </View>

      {
        (displayError || helperText) && (
          <View className="mt-1">
            {displayError ? (
              <Text className="text-xs text-error-500" accessibilityRole="alert">
                {displayError}
              </Text>
            ) : (
              helperText ? (
                <Text className="text-xs text-neutral-500">{helperText}</Text>
              ) : null
            )}
          </View>
        )
      }
    </View >
  );
});

Input.displayName = 'Input';

export default Input;
