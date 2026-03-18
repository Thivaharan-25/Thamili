// App Constants
export const APP_NAME = 'Thamili';

// Countries
export const COUNTRIES = {
  GERMANY: 'germany',
  DENMARK: 'denmark',
} as const;

export type Country = typeof COUNTRIES[keyof typeof COUNTRIES];

// Product Categories
export const PRODUCT_CATEGORIES = {
  FRESH: 'fresh',
  FROZEN: 'frozen',
} as const;

// Order Status
export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  CANCELLED: 'canceled',
} as const;

// Payment Methods
export const PAYMENT_METHODS = {
  ONLINE: 'online',
  COD: 'cod',
} as const;

// User Roles
export const USER_ROLES = {
  CUSTOMER: 'customer',
  ADMIN: 'admin',
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  USER_TOKEN: '@thamili:user_token',
  USER_DATA: '@thamili:user_data',
  SELECTED_COUNTRY: '@thamili:selected_country',
  CART: '@thamili:cart',
  LANGUAGE: '@thamili:language',
  ONBOARDING_COMPLETED: '@thamili:onboarding_completed',
  PRODUCTS: '@thamili:products',
  CATEGORIES: '@thamili:categories',
  PICKUP_POINTS: '@thamili:pickup_points',
} as const;

// Languages
export const LANGUAGES = {
  ENGLISH: 'en',
  TAMIL: 'ta',
} as const;
// External Links
export const PLAY_STORE_LINK = 'https://play.google.com/store/apps/details?id=com.thamili.thamili';
