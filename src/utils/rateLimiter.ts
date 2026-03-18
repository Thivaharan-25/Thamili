/**
 * Client-side sliding window rate limiter.
 * Tracks request timestamps in memory and throws RateLimitError when exceeded.
 */

export const RATE_LIMITS = {
  auth:          { maxRequests: 5,  windowMs: 15 * 60 * 1000 }, // 5 per 15 min (login, register)
  order_write:   { maxRequests: 3,  windowMs: 60 * 1000 },      // 3 per min (create, cancel)
  order_read:    { maxRequests: 20, windowMs: 60 * 1000 },      // 20 per min
  payment:       { maxRequests: 3,  windowMs: 60 * 1000 },      // 3 per min (Stripe)
  product_write: { maxRequests: 10, windowMs: 60 * 1000 },      // 10 per min (admin)
  product_read:  { maxRequests: 30, windowMs: 60 * 1000 },      // 30 per min
  address:       { maxRequests: 15, windowMs: 60 * 1000 },      // 15 per min
  user_write:    { maxRequests: 10, windowMs: 60 * 1000 },      // 10 per min
  mapbox:        { maxRequests: 30, windowMs: 60 * 1000 },      // 30 per min (paid API, debounced)
  notification:  { maxRequests: 20, windowMs: 60 * 1000 },      // 20 per min
  default:       { maxRequests: 30, windowMs: 60 * 1000 },      // 30 per min
} as const;

export type RateLimitCategory = keyof typeof RATE_LIMITS;

export class RateLimitError extends Error {
  readonly retryAfterMs: number;

  constructor(category: RateLimitCategory, retryAfterMs: number) {
    const seconds = Math.ceil(retryAfterMs / 1000);
    super(`Too many requests. Please wait ${seconds}s before trying again.`);
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

// In-memory sliding window: Map<category, sorted timestamp[]>
const requestLog = new Map<RateLimitCategory, number[]>();

export function checkRateLimit(category: RateLimitCategory = 'default'): void {
  const limit = RATE_LIMITS[category];
  const now = Date.now();
  const windowStart = now - limit.windowMs;

  const timestamps = requestLog.get(category) ?? [];

  // Evict timestamps outside the current window
  const recent = timestamps.filter((t) => t > windowStart);

  if (recent.length >= limit.maxRequests) {
    // Retry after the oldest request in the window expires
    const retryAfterMs = recent[0] + limit.windowMs - now;
    throw new RateLimitError(category, Math.max(retryAfterMs, 0));
  }

  recent.push(now);
  requestLog.set(category, recent);
}

/** Reset limits for a category (useful in tests or after logout) */
export function resetRateLimit(category?: RateLimitCategory): void {
  if (category) {
    requestLog.delete(category);
  } else {
    requestLog.clear();
  }
}

export const rateLimiter = {
  check: checkRateLimit,
  reset: resetRateLimit,
};
