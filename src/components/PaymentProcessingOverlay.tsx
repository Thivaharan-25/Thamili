/**
 * Payment Processing Overlay Component
 * Shows a modal overlay during payment processing to prevent navigation
 */

import React from 'react';
import { View, Text, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { colors } from '../theme';
import { useTheme } from '../hooks/useTheme';

const AnimatedView = Animated.createAnimatedComponent(View);

interface PaymentProcessingOverlayProps {
  visible: boolean;
  message?: string;
  onCancel?: () => void;
  showCancel?: boolean;
}

const PaymentProcessingOverlay: React.FC<PaymentProcessingOverlayProps> = ({
  visible,
  message = 'Processing your payment...',
  onCancel,
  showCancel = false,
}) => {
  const { colors: themeColors } = useTheme();
  const pulseScale = useSharedValue(1);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 300 });
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        false
      );
    } else {
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={showCancel ? onCancel : undefined}
    >
      <AnimatedView style={[styles.overlay, overlayStyle]}>
        <View style={[styles.container, { backgroundColor: themeColors.background.card }]}>
          <AnimatedView style={iconStyle}>
            <View style={[styles.iconContainer, { backgroundColor: themeColors.primary[50] }]}>
              <Icon name="credit-card-outline" size={48} color={themeColors.primary[500]} />
            </View>
          </AnimatedView>
          <ActivityIndicator
            size="large"
            color={themeColors.primary[500]}
            style={styles.spinner}
          />
          <Text style={[styles.message, { color: themeColors.text.primary }]}>
            {message}
          </Text>
          <Text style={[styles.subMessage, { color: themeColors.text.secondary }]}>
            Please do not close this screen
          </Text>
          {showCancel && onCancel && (
            <View style={styles.cancelButtonContainer}>
              <Text
                style={[styles.cancelButton, { color: themeColors.error[500] }]}
                onPress={onCancel}
                accessibilityRole="button"
                accessibilityLabel="Cancel payment"
              >
                Cancel
              </Text>
            </View>
          )}
        </View>
      </AnimatedView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    minWidth: 280,
    maxWidth: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  spinner: {
    marginVertical: 16,
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  subMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  cancelButtonContainer: {
    marginTop: 24,
  },
  cancelButton: {
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default PaymentProcessingOverlay;

