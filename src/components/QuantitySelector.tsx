import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../theme';

interface QuantitySelectorProps {
  value: number;
  onChange: (quantity: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  style?: any;
  isWeightBased?: boolean;
  step?: number;
}

const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  value,
  onChange,
  min = 1,
  max,
  disabled = false,
  style,
  isWeightBased = false,
  step = 1,
}) => {
  const [isFocused, setIsFocused] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(value.toString());

  // Update local input value when prop value changes (if not focused)
  React.useEffect(() => {
    if (!isFocused) {
      setInputValue(value.toString());
    }
  }, [value, isFocused]);

  const actualStep = isWeightBased ? 100 : step;
  const actualMin = isWeightBased ? Math.max(min, 100) : min;

  const handleDecrement = () => {
    if (!disabled) {
      if (isWeightBased) {
        // Round down to previous multiple of Step
        const remainder = value % actualStep;
        const targetValue = remainder === 0 ? value - actualStep : value - remainder;
        const newValue = Math.max(targetValue, actualMin);
        onChange(newValue);
      } else if (value > actualMin) {
        onChange(value - actualStep);
      }
    }
  };

  const handleIncrement = () => {
    if (!disabled) {
      if (isWeightBased) {
        // Round up to next multiple of Step
        const remainder = value % actualStep;
        const targetValue = value + (actualStep - remainder);
        const newValue = max ? Math.min(targetValue, max) : targetValue;
        onChange(newValue);
      } else if (!max || value < max) {
        onChange(value + actualStep);
      }
    }
  };

  const handleTextChange = (text: string) => {
    const cleanText = text.replace(/[^0-9]/g, '');
    setInputValue(cleanText);

    const numValue = parseInt(cleanText, 10);
    if (!isNaN(numValue)) {
      let newValue = numValue;
      // Don't clamp min during typing, only max
      if (max && newValue > max) newValue = max;
      onChange(newValue);
    } else if (cleanText === '') {
      // Don't call onChange for empty string to allow clearing, 
      // but min will be enforced on blur or by the store if it handles 0
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Enforce min on blur
    if (value < actualMin) {
      onChange(actualMin);
    }
  };

  const formatDisplayValue = () => {
    if (isFocused) return inputValue;

    if (isWeightBased) {
      if (value < 1000) return `${value}g`;
      return `${(value / 1000).toFixed(1)}kg`;
    }
    return value.toString();
  };

  const canDecrement = !disabled && value > actualMin;
  const canIncrement = !disabled && (!max || value < max);

  return (
    <View
      style={[styles.container, style]}
      accessibilityRole="adjustable"
      accessibilityLabel={`Quantity selector, current value: ${formatDisplayValue()}`}
      accessibilityValue={{ text: formatDisplayValue() }}
    >
      <TouchableOpacity
        style={[styles.button, !canDecrement && styles.buttonDisabled]}
        onPress={handleDecrement}
        disabled={!canDecrement}
        accessibilityRole="button"
        accessibilityLabel="Decrease quantity"
        accessibilityHint={`Double tap to decrease quantity by ${actualStep}`}
        accessibilityState={{ disabled: !canDecrement }}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Icon
          name="minus"
          size={24}
          color={canDecrement ? colors.primary[500] : colors.neutral[300]}
          accessibilityElementsHidden
        />
      </TouchableOpacity>

      <TextInput
        style={[styles.input, disabled && styles.inputDisabled]}
        value={formatDisplayValue()}
        onChangeText={handleTextChange}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        keyboardType="number-pad"
        editable={!disabled}
        selectTextOnFocus
        placeholderTextColor={colors.neutral[400]}
        underlineColorAndroid="transparent"
        accessibilityRole="adjustable"
        accessibilityLabel="Quantity input"
        accessibilityHint="Enter quantity or use buttons to adjust"
        accessibilityValue={{ text: formatDisplayValue() }}
      />

      <TouchableOpacity
        style={[styles.button, !canIncrement && styles.buttonDisabled]}
        onPress={handleIncrement}
        disabled={!canIncrement}
        accessibilityRole="button"
        accessibilityLabel="Increase quantity"
        accessibilityHint={`Double tap to increase quantity by ${actualStep}`}
        accessibilityState={{ disabled: !canIncrement }}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Icon
          name="plus"
          size={24}
          color={canIncrement ? colors.primary[500] : colors.neutral[300]}
          accessibilityElementsHidden
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    height: 40,
    borderWidth: 1,
    borderColor: '#E2E8F0', // slate-200
    overflow: 'hidden',
  },
  button: {
    width: 40,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC', // slate-50
  },
  buttonDisabled: {
    backgroundColor: '#fff',
    opacity: 0.3,
  },
  input: {
    flex: 1,
    height: '100%',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B', // slate-800
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E2E8F0', // slate-200
    paddingVertical: 0,
    paddingHorizontal: 8,
    minWidth: 40,
  },
  inputDisabled: {
    backgroundColor: '#F8FAFC',
    color: '#94A3B8', // slate-400
  },
});

// Set displayName for better debugging and NativeWind compatibility
QuantitySelector.displayName = 'QuantitySelector';

export default QuantitySelector;

