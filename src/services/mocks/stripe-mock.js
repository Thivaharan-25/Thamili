/**
 * Stripe Mock for Web Platform
 * Stripe React Native doesn't work on web, so we provide a mock
 */

module.exports = {
  StripeProvider: ({ children, publishableKey }) => {
    // On web, just return children without StripeProvider
    return children;
  },
  useStripe: () => {
    return {
      retrievePaymentIntent: async () => ({ paymentIntent: null, error: null }),
      initPaymentSheet: async () => ({ error: null }),
      presentPaymentSheet: async () => ({ error: null }),
      confirmPayment: async () => ({ paymentIntent: null, error: null }),
    };
  },
  usePaymentSheet: () => {
    return {
      initPaymentSheet: async () => ({ error: null }),
      presentPaymentSheet: async () => ({ error: { code: 'NotSupported', message: 'Stripe not available on web' } }),
    };
  },
};

