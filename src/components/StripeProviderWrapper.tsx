/**
 * Stripe Provider Wrapper
 * Conditionally wraps children with StripeProvider only on native platforms
 * Web platform doesn't support Stripe React Native
 */

import React from 'react';
import { Platform } from 'react-native';
import { ENV } from '../config/env';

interface StripeProviderWrapperProps {
  children: React.ReactNode;
}

const StripeProviderWrapper: React.FC<StripeProviderWrapperProps> = ({ children }) => {
  // Only use StripeProvider on native platforms (iOS/Android)
  if (Platform.OS === 'web') {
    // Web platform - return children without StripeProvider
    return <>{children}</>;
  }

  // Native platforms - use StripeProvider
  try {
    // Dynamic require to avoid web bundling issues
    const { StripeProvider } = require('@stripe/stripe-react-native');
    
    return (
      <StripeProvider publishableKey={ENV.STRIPE_PUBLISHABLE_KEY || ''}>
        {children}
      </StripeProvider>
    );
  } catch (error) {
    console.warn('StripeProvider not available, continuing without it:', error);
    // Fallback if Stripe is not available
    return <>{children}</>;
  }
};

export default StripeProviderWrapper;

