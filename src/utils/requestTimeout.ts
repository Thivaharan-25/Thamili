/**
 * Request Timeout Utilities
 * Adds timeout handling to async operations
 */

export interface TimeoutOptions {
  timeout: number; // Timeout in milliseconds
  errorMessage?: string;
  onTimeout?: () => void;
}

/**
 * Wraps a promise with a timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  options: TimeoutOptions
): Promise<T> {
  const { timeout, errorMessage = 'Request timeout', onTimeout } = options;

  let timer: NodeJS.Timeout | null = null;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => {
      if (onTimeout) {
        onTimeout();
      }
      reject(new TimeoutError(errorMessage, timeout));
    }, timeout);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    // Clear timeout if promise resolves before timeout
    if (timer) {
      clearTimeout(timer);
    }
    return result;
  } catch (error) {
    // Clear timeout if promise rejects before timeout
    if (timer) {
      clearTimeout(timer);
    }
    throw error;
  }
}

/**
 * Custom timeout error class
 */
export class TimeoutError extends Error {
  constructor(
    message: string,
    public readonly timeout: number
  ) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Creates a timeout promise
 */
export function createTimeout(timeout: number, message?: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new TimeoutError(message || `Operation timed out after ${timeout}ms`, timeout));
    }, timeout);
  });
}

/**
 * Default timeout values
 */
export const DEFAULT_TIMEOUTS = {
  SHORT: 5000, // 5 seconds
  MEDIUM: 15000, // 15 seconds
  LONG: 30000, // 30 seconds
  VERY_LONG: 60000, // 60 seconds
} as const;

