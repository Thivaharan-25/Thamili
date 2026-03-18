/**
 * Checkout Auto-Save Utility
 * Automatically saves checkout form data to AsyncStorage
 */

import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CHECKOUT_DATA_KEY = '@thamili_checkout_data';
const AUTO_SAVE_DELAY = 1000; // Save after 1 second of inactivity

export interface CheckoutFormData {
  isHomeDelivery?: boolean;
  selectedPickupPointId?: string | null;
  deliveryAddress?: {
    street: string;
    city: string;
    postalCode: string;
    instructions: string;
  };
  paymentMethod?: string | null;
  paymentDetails?: {
    cardNumber: string;
    expiryDate: string;
    cvv: string;
    cardholderName: string;
  };
}

let saveTimeout: NodeJS.Timeout | null = null;

/**
 * Auto-save checkout form data
 */
export async function autoSaveCheckoutData(data: Partial<CheckoutFormData>): Promise<void> {
  // Clear existing timeout
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  // Set new timeout
  saveTimeout = setTimeout(async () => {
    try {
      const existingData = await getCheckoutData();
      const mergedData = { ...existingData, ...data };
      await AsyncStorage.setItem(CHECKOUT_DATA_KEY, JSON.stringify(mergedData));
    } catch (error) {
      console.error('Error auto-saving checkout data:', error);
    }
  }, AUTO_SAVE_DELAY);
}

/**
 * Get saved checkout form data
 */
export async function getCheckoutData(): Promise<CheckoutFormData> {
  try {
    const data = await AsyncStorage.getItem(CHECKOUT_DATA_KEY);
    if (data) {
      return JSON.parse(data) as CheckoutFormData;
    }
    return {};
  } catch (error) {
    console.error('Error getting checkout data:', error);
    return {};
  }
}

/**
 * Clear saved checkout form data
 */
export async function clearCheckoutData(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CHECKOUT_DATA_KEY);
  } catch (error) {
    console.error('Error clearing checkout data:', error);
  }
}

/**
 * React hook to automatically save checkout form data
 */
export function useCheckoutAutoSave(data: Partial<CheckoutFormData>) {
  React.useEffect(() => {
    autoSaveCheckoutData(data);
  }, [
    data.isHomeDelivery,
    data.selectedPickupPointId,
    JSON.stringify(data.deliveryAddress),
    data.paymentMethod,
    JSON.stringify(data.paymentDetails),
  ]);
}

