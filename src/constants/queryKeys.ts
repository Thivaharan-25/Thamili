/**
 * Centralized React Query key factory.
 *
 * Rules:
 *  - Always use these constants — never inline string arrays.
 *  - Broader invalidation: pass just the first segment, e.g. QUERY_KEYS.orders()
 *  - Narrow invalidation: pass the full key, e.g. QUERY_KEYS.order(id)
 */

export const QUERY_KEYS = {
  // ── Products ──────────────────────────────────────────────
  /** All product queries (broad invalidation) */
  productsAll: () => ['products'] as const,
  /** Filtered list */
  products: (active?: boolean, search?: string, category?: string) =>
    ['products', active, search, category] as const,
  /** Single product */
  product: (id: string) => ['product', id] as const,

  // ── Orders ────────────────────────────────────────────────
  /** All user-order queries (broad invalidation) */
  ordersAll: () => ['orders'] as const,
  /** User order list */
  orders: (userId: string, status?: string) => ['orders', userId, status] as const,
  /** Single order */
  order: (id: string) => ['order', id] as const,
  /** Order items */
  orderItems: (orderId: string) => ['orderItems', orderId] as const,
  /** Admin — all orders */
  allOrders: () => ['allOrders'] as const,

  // ── Delivery ──────────────────────────────────────────────
  deliverySchedules: () => ['deliverySchedules'] as const,
  deliverySchedule: (id: string) => ['deliverySchedule', id] as const,
  deliveryScheduleByOrder: (orderId: string) => ['deliveryScheduleByOrder', orderId] as const,

  // ── Pickup Points ─────────────────────────────────────────
  pickupPoints: (country?: string) => ['pickupPoints', country] as const,

  // ── User / Profile ────────────────────────────────────────
  userProfile: (userId: string) => ['userProfile', userId] as const,
  savedAddresses: (userId: string) => ['savedAddresses', userId] as const,
};
