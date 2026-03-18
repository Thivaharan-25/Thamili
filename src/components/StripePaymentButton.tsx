/**
 * Stripe Payment Button Component
 * Uses Stripe Payment Sheet for secure payment processing
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../theme';

// Conditionally import Stripe only on native platforms
let useStripe: any = null;
if (Platform.OS !== 'web') {
  try {
    const stripeModule = require('@stripe/stripe-react-native');
    useStripe = stripeModule.useStripe;
  } catch (e) {
    console.warn('Stripe not available:', e);
  }
}

interface StripePaymentButtonProps {
  clientSecret: string;
  amount: number;
  currency?: string;
  onSuccess: () => void;
  onFailure: (error: string) => void;
  disabled?: boolean;
  style?: any;
}

const StripePaymentButton: React.FC<StripePaymentButtonProps> = ({
  clientSecret,
  amount,
  currency = 'EUR',
  onSuccess,
  onFailure,
  disabled = false,
  style,
}) => {
  // Check if Stripe is available (native platforms only)
  const stripe = useStripe ? useStripe() : null;
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);

  // Show error if Stripe is not available (web platform)
  if (Platform.OS === 'web' || !stripe) {
    return (
      <TouchableOpacity
        style={[styles.button, styles.buttonDisabled, style]}
        disabled={true}
      >
        <View style={styles.buttonContent}>
          <Icon name="alert-circle" size={20} color="#fff" />
          <Text style={styles.buttonText}>
            Payment not available on this platform
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  const { initPaymentSheet, presentPaymentSheet } = stripe;

  useEffect(() => {
    if (stripe && clientSecret) {
      initializePaymentSheet();
    }
  }, [clientSecret, stripe]);

  const initializePaymentSheet = async () => {
    if (!clientSecret) return;

    try {
      setInitializing(true);
      const { error } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'Thamili',
      });

      if (error) {
        console.error('Payment sheet initialization error:', error);
        onFailure(error.message);
      }
    } catch (error: any) {
      console.error('Error initializing payment sheet:', error);
      onFailure(error.message || 'Failed to initialize payment');
    } finally {
      setInitializing(false);
    }
  };

  const handlePayment = async () => {
    if (!clientSecret) {
      onFailure('Payment not initialized');
      return;
    }

    try {
      setLoading(true);
      const { error } = await presentPaymentSheet();

      if (error) {
        if (error.code === 'Canceled') {
          // User canceled - don't show error
          setLoading(false);
          return;
        }
        console.error('Payment error:', error);
        onFailure(error.message || 'Payment failed');
      } else {
        // Payment succeeded
        onSuccess();
      }
    } catch (error: any) {
      console.error('Payment exception:', error);
      onFailure(error.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled, style]}
      onPress={handlePayment}
      disabled={disabled || loading || initializing || !clientSecret}
      activeOpacity={0.8}
    >
      {loading || initializing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#fff" size="small" />
          <Text style={styles.buttonText}>
            {initializing ? 'Initializing...' : 'Processing...'}
          </Text>
        </View>
      ) : (
        <View style={styles.buttonContent}>
          <Icon name="credit-card" size={20} color="#fff" />
          <Text style={styles.buttonText}>
            Pay {formatAmount(amount, currency)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary[500],
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: colors.neutral[300],
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

// Set displayName for better debugging
StripePaymentButton.displayName = 'StripePaymentButton';

export default StripePaymentButton;

