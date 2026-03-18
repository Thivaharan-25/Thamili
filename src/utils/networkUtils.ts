/**
 * Network Utilities
 * Handles network state detection and error classification
 */

// NetInfo import - package is now installed
import NetInfo from '@react-native-community/netinfo';

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
}

/**
 * Check if device is online
 */
export const isOnline = async (): Promise<boolean> => {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  } catch (error) {
    console.warn('Network check failed:', error);
    return false;
  }
};

/**
 * Get current network state
 */
export const getNetworkState = async (): Promise<NetworkState> => {
  try {
    const state = await NetInfo.fetch();
    return {
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable ?? null,
      type: state.type ?? null,
    };
  } catch (error) {
    console.warn('Network state fetch failed:', error);
    return {
      isConnected: false,
      isInternetReachable: false,
      type: null,
    };
  }
};

/**
 * Classify error type based on error message/code
 */
export const classifyError = (error: any): {
  type: 'network' | 'server' | 'client' | 'unknown';
  isRetryable: boolean;
  userMessage: string;
} => {
  const errorMessage = error?.message || String(error || '');
  const errorCode = error?.code || error?.status || '';

  // Network errors
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('Network') ||
    errorMessage.includes('fetch failed') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('ECONNREFUSED') ||
    errorMessage.includes('ENOTFOUND') ||
    errorCode === 'NETWORK_ERROR' ||
    errorCode === 'TIMEOUT'
  ) {
    return {
      type: 'network',
      isRetryable: true,
      userMessage: 'Unable to connect to the server. Please check your internet connection and try again.',
    };
  }

  // Server errors (5xx)
  if (
    errorCode >= 500 ||
    errorMessage.includes('Internal Server Error') ||
    errorMessage.includes('Service Unavailable') ||
    errorMessage.includes('Bad Gateway')
  ) {
    return {
      type: 'server',
      isRetryable: true,
      userMessage: 'The server is temporarily unavailable. Please try again in a moment.',
    };
  }

  // Client errors (4xx) - usually not retryable
  if (errorCode >= 400 && errorCode < 500) {
    if (errorCode === 401 || errorCode === 403) {
      return {
        type: 'client',
        isRetryable: false,
        userMessage: 'You don\'t have permission to perform this action. Please log in again.',
      };
    }
    if (errorCode === 404) {
      return {
        type: 'client',
        isRetryable: false,
        userMessage: 'The requested item could not be found.',
      };
    }
    return {
      type: 'client',
      isRetryable: false,
      userMessage: 'There was an error with your request. Please check your input and try again.',
    };
  }

  // Unknown errors
  return {
    type: 'unknown',
    isRetryable: true,
    userMessage: 'Something went wrong. Please try again.',
  };
};

/**
 * Retry function with exponential backoff
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

