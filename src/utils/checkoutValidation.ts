import { PaymentMethod } from '../types';
import { PickupPoint } from '../types';
import { validatePostalCode } from './regionalFormatting';
import { COUNTRIES } from '../constants';
import type { Country } from '../constants';

export interface CheckoutFormData {
  isHomeDelivery: boolean;
  pickupPointId: string | null;
  deliveryAddress: {
    street: string;
    city: string;
    postalCode: string;
    instructions?: string;
  };
  paymentMethod: PaymentMethod | null;
  paymentDetails: {
    cardNumber: string;
    expiryDate: string;
    cvv: string;
    cardholderName: string;
  };
  phone?: string;
}

/**
 * Validate checkout form
 */
export const validateCheckout = (
  formData: CheckoutFormData,
  country: Country = COUNTRIES.GERMANY
): {
  isValid: boolean;
  errors: Record<string, string>;
} => {
  const errors: Record<string, string> = {};

  // Validate delivery method
  if (!formData.isHomeDelivery && !formData.pickupPointId) {
    errors.deliveryMethod = 'Please select a delivery method';
  }

  // Validate phone number
  if (!formData.phone || !formData.phone.trim()) {
    errors.phone = 'Phone number is required';
  } else {
    // Basic format validation can be added here if needed, 
    // but strict validation is handled by validatePhone util in UI
    if (formData.phone.replace(/\D/g, '').length < 8) {
       errors.phone = 'Please enter a valid phone number';
    }
  }

  // Validate delivery address if home delivery

  // Validate delivery address if home delivery
  if (formData.isHomeDelivery) {
    if (!formData.deliveryAddress.street.trim()) {
      errors.street = 'Street address is required';
    }
    if (!formData.deliveryAddress.city.trim()) {
      errors.city = 'City is required';
    }
    if (!formData.deliveryAddress.postalCode.trim()) {
      errors.postalCode = 'Postal code is required';
    } else {
      // Use regional postal code validation
      const postalValidation = validatePostalCode(formData.deliveryAddress.postalCode, country);
      if (!postalValidation.isValid) {
        errors.postalCode = postalValidation.error || 'Invalid postal code format';
      }
    }
  }

  // Validate payment method
  if (!formData.paymentMethod) {
    errors.paymentMethod = 'Please select a payment method';
  }

  // Note: Payment details validation is not required for online payments
  // because Stripe handles payment collection through their payment button.
  // The payment details are collected securely by Stripe's payment sheet.

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate pickup point selection
 */
export const validatePickupPoint = (
  pickupPointId: string | null,
  isHomeDelivery: boolean
): {
  isValid: boolean;
  error?: string;
} => {
  if (isHomeDelivery) {
    return { isValid: true };
  }

  if (!pickupPointId) {
    return {
      isValid: false,
      error: 'Please select a pickup point',
    };
  }

  return { isValid: true };
};

/**
 * Validate delivery address
 */
export const validateDeliveryAddress = (
  address: CheckoutFormData['deliveryAddress'],
  country: Country = COUNTRIES.GERMANY
): {
  isValid: boolean;
  errors: Record<string, string>;
} => {
  const errors: Record<string, string> = {};

  if (!address.street.trim()) {
    errors.street = 'Street address is required';
  }

  if (!address.city.trim()) {
    errors.city = 'City is required';
  }

  if (!address.postalCode.trim()) {
    errors.postalCode = 'Postal code is required';
  } else {
    // Use regional postal code validation
    const postalValidation = validatePostalCode(address.postalCode, country);
    if (!postalValidation.isValid) {
      errors.postalCode = postalValidation.error || 'Invalid postal code format';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate payment method selection
 */
export const validatePaymentMethod = (
  paymentMethod: PaymentMethod | null
): {
  isValid: boolean;
  error?: string;
} => {
  if (!paymentMethod) {
    return {
      isValid: false,
      error: 'Please select a payment method',
    };
  }

  return { isValid: true };
};

