/**
 * Form Error Summary Component
 * Displays a summary of all form validation errors with links to fields
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme';
import { EASING } from '../utils/animations';

const AnimatedView = Animated.createAnimatedComponent(View);

interface FormErrorSummaryProps {
  errors: Record<string, string>;
  onErrorPress?: (fieldName: string) => void;
  style?: any;
  title?: string;
}

const FormErrorSummary: React.FC<FormErrorSummaryProps> = ({
  errors,
  onErrorPress,
  style,
  title = 'Please fix the following errors:',
}) => {
  const errorEntries = Object.entries(errors).filter(([_, message]) => message);
  
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    if (errorEntries.length > 0) {
      scale.value = withSpring(1, EASING.spring);
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [errorEntries.length]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (errorEntries.length === 0) {
    return null;
  }

  const getFieldLabel = (fieldName: string): string => {
    const labels: Record<string, string> = {
      street: 'Street Address',
      city: 'City',
      postalCode: 'Postal Code',
      phone: 'Phone Number',
      instructions: 'Delivery Instructions',
      pickupPoint: 'Pickup Point',
      paymentMethod: 'Payment Method',
      deliveryAddress: 'Delivery Address',
    };
    return labels[fieldName] || fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
  };

  return (
    <AnimatedView
      style={[styles.container, animatedStyle, style]}
      accessibilityRole="alert"
      accessibilityLabel={`Form has ${errorEntries.length} error${errorEntries.length > 1 ? 's' : ''}`}
    >
      <View style={styles.header}>
        <Icon name="alert-circle" size={20} color={colors.error[500]} />
        <Text style={styles.title}>{title}</Text>
      </View>
      <ScrollView style={styles.errorsList} showsVerticalScrollIndicator={false}>
        {errorEntries.map(([fieldName, message], index) => (
          <TouchableOpacity
            key={fieldName}
            style={styles.errorItem}
            onPress={() => onErrorPress?.(fieldName)}
            disabled={!onErrorPress}
            accessibilityLabel={`${getFieldLabel(fieldName)}: ${message}`}
            accessibilityHint={onErrorPress ? 'Double tap to go to this field' : undefined}
            accessibilityRole="button"
          >
            <View style={styles.errorContent}>
              <Icon name="circle-small" size={16} color={colors.error[500]} />
              <View style={styles.errorTextContainer}>
                <Text style={styles.errorField}>{getFieldLabel(fieldName)}:</Text>
                <Text style={styles.errorMessage}>{message}</Text>
              </View>
            </View>
            {onErrorPress && (
              <Icon name="chevron-right" size={20} color={colors.neutral[400]} />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </AnimatedView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.error[50],
    borderWidth: 1,
    borderColor: colors.error[200],
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error[700],
    marginLeft: 8,
  },
  errorsList: {
    maxHeight: 200,
  },
  errorItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  errorTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  errorField: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error[700],
    marginBottom: 2,
  },
  errorMessage: {
    fontSize: 13,
    color: colors.error[600],
    lineHeight: 18,
  },
});

export default FormErrorSummary;

