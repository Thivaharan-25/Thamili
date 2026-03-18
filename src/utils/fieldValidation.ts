/**
 * Field-level validation helpers
 * For real-time validation in Input components
 */

import * as yup from 'yup';

// Email validation
export const validateEmail = (value: string): string | undefined => {
  if (!value) return undefined; // Don't validate empty fields until blur
  try {
    yup.string().email('Invalid email address').required().validateSync(value);
    return undefined;
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      return error.message;
    }
    return 'Invalid email address';
  }
};

// Password validation
export const validatePassword = (value: string): string | undefined => {
  if (!value) return undefined;
  if (value.length < 6) {
    return 'Password must be at least 6 characters';
  }
  return undefined;
};

// Name validation
export const validateName = (value: string): string | undefined => {
  if (!value) return undefined;
  if (value.length < 2) {
    return 'Name must be at least 2 characters';
  }
  return undefined;
};

// Phone validation
export const validatePhone = (value: string): string | undefined => {
  if (!value) return undefined; // Phone is optional
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
  if (!phoneRegex.test(value)) {
    return 'Invalid phone number';
  }
  return undefined;
};

// Confirm password validation
export const validateConfirmPassword = (password: string) => (value: string): string | undefined => {
  if (!value) return undefined;
  if (value !== password) {
    return 'Passwords must match';
  }
  return undefined;
};

// Postal code validation
export const validatePostalCode = (country: 'germany' | 'denmark' = 'germany') => (value: string): string | undefined => {
  if (!value) return undefined;
  if (country === 'germany') {
    if (value.length !== 5 || !/^\d+$/.test(value)) {
      return 'German postal code must be 5 digits';
    }
  } else {
    if (value.length !== 4 || !/^\d+$/.test(value)) {
      return 'Danish postal code must be 4 digits';
    }
  }
  return undefined;
};

// Street address validation
export const validateStreet = (value: string): string | undefined => {
  if (!value) return undefined;
  if (value.length < 5) {
    return 'Please enter a valid street address';
  }
  return undefined;
};

// City validation
export const validateCity = (value: string): string | undefined => {
  if (!value) return undefined;
  if (value.length < 2) {
    return 'Please enter a valid city name';
  }
  return undefined;
};

