// User Types
export type UserRole = 'customer' | 'admin' | 'delivery_partner';

export interface User {
  id: string;
  email?: string;
  phone?: string;
  name?: string;
  username?: string; // Username for login (used with password)
  role: UserRole;
  country_preference?: 'germany' | 'denmark';
  photoURL?: string;
  created_at: string;
}

export interface Address {
  id: string;
  user_id: string;
  type: 'Home' | 'Work' | 'Other';
  name: string;
  street: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
  phone: string;
  instructions?: string;
  is_default: boolean;
  latitude?: number;
  longitude?: number;
  created_at?: string;
}

export interface SavedPaymentMethod {
  id: string;
  user_id: string;
  type: 'card';
  brand: 'visa' | 'mastercard' | 'amex' | 'discover' | 'other';
  last4: string;
  expiry_month: string;
  expiry_year: string;
  cardholder_name: string;
  is_default: boolean;
  stripe_payment_method_id?: string;
  created_at?: string;
}

// Product Types
export type ProductCategory = 'fresh' | 'frozen';

export interface Product {
  id: string;
  name: string;
  description?: string;
  category: ProductCategory;
  price_germany: number;
  price_denmark: number;
  original_price_germany?: number; // Original price before discount
  original_price_denmark?: number; // Original price before discount
  discount_percentage?: number; // Discount percentage (0-100)
  stock_germany: number;
  stock_denmark: number;
  image_url?: string;
  active: boolean;
  active_germany: boolean;
  active_denmark: boolean;

  created_at: string;
  rating?: number; // Average rating (0-5)
  review_count?: number; // Number of reviews
  // New fields for Pack vs Loose logic
  sell_type: 'pack' | 'loose';
  unit: 'packet' | 'gram' | 'kg';
  pack_size_grams?: number; // Only for 'pack' type
  is_deleted?: boolean; // Soft delete flag
}

// Order Types
export type OrderStatus = 'pending' | 'confirmed' | 'out_for_delivery' | 'delivered' | 'canceled';
export type PaymentMethod = 'online' | 'cod';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Order {
  id: string;
  user_id: string;
  order_date: string;
  status: OrderStatus;
  total_amount: number;
  delivery_fee?: number;
  payment_fee?: number;
  country: 'germany' | 'denmark';
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  pickup_point_id?: string;
  delivery_address?: string;
  delivery_method?: 'home' | 'pickup'; // New explicit field
  payment_intent_id?: string; // Stripe Payment Intent ID
  created_at: string;
  // Joined fields
  pickup_point?: { name: string; delivery_fee?: number };
  user?: { phone?: string; name?: string };
  delivery_schedule?: DeliverySchedule[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  subtotal: number;
  created_at: string;
  product?: Product;
}

// Pickup Point Types
export interface PickupPoint {
  id: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  country: 'germany' | 'denmark';
  delivery_fee: number;
  base_delivery_fee?: number; // Base fee for home delivery from this point
  free_delivery_radius?: number; // Distance in KM where delivery is just the base fee
  extra_km_fee?: number; // Fee per KM outside the free radius
  active: boolean;
  created_at: string;
  // New Delivery Module Fields
  working_hours?: string;
  admin_id?: string; // ID of the admin who created/manages this
  contact_number?: string;
}

// Delivery Types
export type DeliveryStatus = 'scheduled' | 'accepted' | 'picked_up' | 'in_transit' | 'delivered' | 'canceled' | 'failed';

export interface DeliverySchedule {
  id: string;
  order_id: string;
  delivery_date: string;
  status: DeliveryStatus;
  pickup_point_id?: string;
  estimated_time?: string;
  actual_delivery_time?: string;
  delivery_partner_id?: string;
  delivery_person_name?: string;
  delivery_person_phone?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  order?: Order;
  pickup_point?: {
    id: string;
    name: string;
    address: string;
  };
  customer?: {
    id: string;
    name?: string;
    email: string;
    phone?: string;
  };
}

// Cart Types
export interface CartItem {
  product: Product;
  quantity: number;
  selectedCountry: 'germany' | 'denmark';
  isSelected?: boolean;
  unit: 'packet' | 'gram' | 'kg'; // Derived from product but stored for clarity
}

// Navigation Types
// Note: Profile, Home, Products, Cart, Orders are Tab screens inside Main (CustomerTabs/AdminTabs)
// They should be accessed via nested navigation: navigate('Main', { screen: 'Profile' })
export type RootStackParamList = {
  Auth: undefined;
  Main: { screen?: 'Home' | 'Products' | 'Cart' | 'Orders' | 'Profile' | 'Dashboard' | 'Delivery' | 'PickupPoints' | 'DeliveryDashboard'; params?: any } | undefined;
  Login: undefined;
  ForgotPassword: undefined;
  Register: undefined;
  VerifyEmail: { email: string };
  // Tab screens (nested in Main) - kept for type compatibility but use nested navigation
  Home: undefined;
  Products: undefined;
  Cart: undefined;
  Orders: undefined;
  Profile: undefined; // Tab screen - use nested navigation: navigate('Main', { screen: 'Profile' })
  ProductDetails: { productId: string };
  Checkout: undefined;
  OrderConfirmation: { orderId: string };
  OrderDetails: { orderId: string };
  EditProfile: undefined;
  ChangePassword: undefined;
  Settings: undefined;
  Addresses: undefined;
  Payments: undefined;
  // Admin screens
  AdminDashboard: undefined;
  AdminProducts: undefined;
  AddProduct: undefined;
  EditProduct: { productId: string };
  AdminOrders: undefined;
  AdminDelivery: undefined;
  ManageDeliveryMan: undefined;
  AddDeliveryMan: { deliveryMan?: User } | undefined;
  AdminPickupPoints: undefined;
  AddPickupPoint: undefined;
  EditPickupPoint: { pickupPointId: string };
  AdminTopProducts: undefined;
  Notifications: undefined;
  NotificationSettings: undefined;
  NotificationHistory: undefined;
  NotificationTemplates: undefined;
  Onboarding: undefined;
  Welcome: undefined;
  CountrySelection: undefined;
  DeliveryDashboard: undefined;
  DeliveryOrderDetails: { scheduleId: string };
  DeliveryVanSales: undefined;
};

// Re-export notification types
export * from './notifications';
