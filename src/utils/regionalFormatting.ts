/**
 * Regional Formatting Utilities
 * Handles currency, date, number, phone, and postal code formatting
 * for Germany and Denmark markets
 */

import { COUNTRIES } from '../constants';
import type { Country } from '../constants';

/**
 * Format currency based on country
 * Germany: EUR (€)
 * Denmark: DKK (kr)
 */
export const formatCurrency = (
  amount: number | null | undefined,
  country: Country
): string => {
  try {
    // Validate amount - if invalid, return placeholder
    if (amount === null || amount === undefined || isNaN(amount) || amount < 0) {
      return '€ 0.00';
    }

    // Use en-US for dot decimal separator standard
    const formattedAmount = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

    return `€ ${formattedAmount}`;
  } catch (error) {
    console.warn('❌ [regionalFormatting] Error in formatCurrency:', error);
    // Safe fallback
    return '€ 0.00';
  }
};

/**
 * Format date based on country
 * Germany: DD.MM.YYYY
 * Denmark: DD/MM/YYYY
 */
export const formatDate = (
  date: Date | string,
  country: Country
): string => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Validate date
    if (!dateObj || isNaN(dateObj.getTime())) {
      console.warn('❌ [regionalFormatting] Invalid date passed to formatDate:', date);
      return 'N/A';
    }

    if (country === COUNTRIES.DENMARK) {
      // Danish format: DD/MM/YYYY
      return new Intl.DateTimeFormat('da-DK', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(dateObj);
    } else {
      // German format: DD.MM.YYYY
      return new Intl.DateTimeFormat('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(dateObj);
    }
  } catch (error) {
    console.warn('❌ [regionalFormatting] Error in formatDate:', error);
    return 'N/A';
  }
};

/**
 * Format date with time
 */
export const formatDateTime = (
  date: Date | string,
  country: Country
): string => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Validate date
    if (!dateObj || isNaN(dateObj.getTime())) {
      console.warn('❌ [regionalFormatting] Invalid date passed to formatDateTime:', date);
      return 'N/A';
    }

    if (country === COUNTRIES.DENMARK) {
      return new Intl.DateTimeFormat('da-DK', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(dateObj);
    } else {
      // Germany
      return new Intl.DateTimeFormat('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(dateObj);
    }
  } catch (error) {
    console.warn('❌ [regionalFormatting] Error in formatDateTime:', error);
    return 'N/A';
  }
};

/**
 * Format number with proper separators
 * Germany/Denmark: 1.234,56
 */
export const formatNumber = (
  number: number,
  country: Country,
  decimals: number = 2
): string => {
  try {
    // Always use en-US for dot decimal separator as requested
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(number);
  } catch (error) {
    console.warn('❌ [regionalFormatting] Error in formatNumber:', error);
    return number?.toString() || '0';
  }
};

/**
 * Format phone number
 * Germany: +49 123 4567890
 * Denmark: +45 12 34 56 78
 */
export const formatPhoneNumber = (
  phone: string,
  country: Country
): string => {
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');
  
  // If the user pasted a number with 00 prefix, treat it as +
  if (phone.trim().startsWith('00')) {
     digits = phone.trim().substring(2).replace(/\D/g, '');
  }

  if (country === COUNTRIES.DENMARK) {
    // Danish format: +45 12 34 56 78
    // If it doesn't start with 45, assume local
    if (!digits.startsWith('45')) {
       if (digits.startsWith('0')) digits = digits.substring(1); // Danish numbers usually don't have leading 0 but good safety
       if (digits.length > 0) digits = '45' + digits;
    }

    if (digits.startsWith('45')) {
      const withoutCountry = digits.substring(2);
      if (withoutCountry.length === 0) return '+45';
      return `+45 ${withoutCountry.match(/.{1,2}/g)?.join(' ') || withoutCountry}`;
    }
    return phone;

  } else {
    // German format: +49 123 4567890
    // If it doesn't start with 49, assume it's a local number and prepend it
    // But be careful if they typed '017...' (remove leading zero)
    if (!digits.startsWith('49')) {
       if (digits.startsWith('0')) digits = digits.substring(1);
       if (digits.length > 0) digits = '49' + digits;
    }
    
    if (digits.startsWith('49')) {
      const withoutCountry = digits.substring(2);
      if (withoutCountry.length === 0) return '+49';
      return `+49 ${withoutCountry.substring(0, 3)} ${withoutCountry.substring(3)}`;
    }
    return phone;
  }
};

/**
 * Validate phone number based on country
 */
export const validatePhoneNumberForCountry = (
  phone: string,
  country: Country
): { isValid: boolean; error?: string } => {
  if (!phone) return { isValid: true }; // Allow empty (required check is done elsewhere)

  const digits = phone.replace(/\D/g, '');

  if (country === COUNTRIES.DENMARK) {
    // Must start with 45
    if (!digits.startsWith('45')) {
       return { isValid: false, error: 'Must start with +45' };
    }
    // Danish numbers are exactly 8 digits + 45 = 10 digits.
    if (digits.length > 10) {
      return { isValid: false, error: 'Maximum 8 digits allowed' };
    }
    if (digits.length < 10) {
      return { isValid: false, error: 'Too short (8 digits required)' };
    }

  } else { // Germany
    // Must start with 49
    if (!digits.startsWith('49')) {
       return { isValid: false, error: 'Must start with +49' };
    }
    // Max 11 digits mobile + 49 = 13 digits.
    if (digits.length > 13) {
      return { isValid: false, error: 'Maximum 11 digits allowed' };
    }
    // Min length check
    if (digits.length < 11) {
       return { isValid: false, error: 'Too short' };
    }
  }

  return { isValid: true };
};

/**
 * Validate postal code
 * Germany: 5 digits (e.g., 10115)
 * Denmark: 4 digits (e.g., 2100)
 */
export const validatePostalCode = (
  postalCode: string,
  country: Country
): { isValid: boolean; error?: string } => {
  const digits = postalCode.replace(/\D/g, '');
  
  if (country === COUNTRIES.DENMARK) {
    if (digits.length === 4) {
      return { isValid: true };
    }
    return {
      isValid: false,
      error: 'Danish postal codes must be 4 digits',
    };
  } else { // Germany
    if (digits.length === 5) {
      return { isValid: true };
    }
    return {
      isValid: false,
      error: 'German postal codes must be 5 digits',
    };
  }
};

/**
 * Get currency symbol
 */
export const getCurrencySymbol = (country: Country): string => {
  return '€';
};

/**
 * Get currency code
 */
export const getCurrencyCode = (country: Country): string => {
  return 'EUR';
};


