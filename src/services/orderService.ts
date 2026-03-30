// Lazy import Supabase to avoid initialization during module load
import { Order, OrderItem, OrderStatus, PaymentMethod, PaymentStatus } from '../types';
import { withTimeout, DEFAULT_TIMEOUTS } from '../utils/requestTimeout';
import { checkRateLimit } from '../utils/rateLimiter';
import { offlineQueue } from '../utils/offlineQueue';
import { isOnline } from '../utils/networkUtils';
import { queueRequest } from '../utils/requestQueue';

// Import Supabase lazily - only when needed
function getSupabase() {
  return require('./supabase').supabase;
}

export interface CreateOrderData {
  user_id: string;
  country: 'germany' | 'denmark';
  payment_method: PaymentMethod;
  pickup_point_id?: string;
  delivery_address?: string;
  delivery_method?: 'home' | 'pickup';
  delivery_fee?: number;
  payment_fee?: number;
  latitude?: number;
  longitude?: number;
  phone?: string;
  items: Array<{
    product_id: string;
    quantity: number;
    price: number;
    product_category?: string; // Optional but helpful for pricing logic
    sell_type?: 'pack' | 'loose'; // Required for correct subtotal calculation
    pack_size_grams?: number;
    unit?: string;
  }>;
  idempotency_key?: string; // Optional idempotency key to prevent duplicate orders
}

export const orderService = {
  /**
   * Get all orders for a user
   */
  async getOrders(userId: string): Promise<Order[]> {
    checkRateLimit('order_read');
    return withTimeout(
      (async () => {
        try {
          const supabase = getSupabase();
          const { data, error } = await supabase
            .from('orders')
            .select(`
              *,
              pickup_point:pickup_points(name, delivery_fee),
              order_items(
                quantity,
                price,
                product:products(sell_type, unit, category, pack_size_grams)
              )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (error) {
            throw error;
          }

          if (!data) return [];

          const { calculateItemSubtotalValue } = require('../utils/productUtils');
          
          return data.map((order: any) => {
            const items = order.order_items || [];
            const subtotal = items.reduce((sum: number, item: any) => {
              const { isProductWeightBased } = require('../utils/productUtils');
              const isWeightBased = isProductWeightBased(item.product);
              const packSize = item.product?.pack_size_grams || 1000;
              
              if (isWeightBased) {
                item.quantity = item.quantity * 1000; // KG -> Grams
              } else {
                let dbQty = item.quantity; if (dbQty > 0 && dbQty < 0.1) dbQty = dbQty * 1000; const factor = packSize / 1000; item.quantity = factor > 0 ? Math.round(dbQty / factor) : dbQty;
              }

              return sum + calculateItemSubtotalValue(item.quantity, item.price, item.product);
            }, 0);
            
            const paymentFee = typeof order.payment_fee === 'number' ? order.payment_fee : 0;
            const deliveryFee = typeof order.delivery_fee === 'number' ? order.delivery_fee : 0;
            
            // Recalculate total for display consistency
            const recalculatedTotal = subtotal + deliveryFee + paymentFee;

            return {
              ...order,
              total_amount: recalculatedTotal
            };
          });
        } catch (error) {
          console.error('Error fetching orders:', error);
          throw error;
        }
      })(),
      {
        timeout: DEFAULT_TIMEOUTS.MEDIUM,
        errorMessage: 'Failed to fetch orders: request timed out',
      }
    );
  },

  /**
   * Get all orders (Admin only)
   */
  async getAllOrders(filters?: { status?: OrderStatus }): Promise<Order[]> {
    checkRateLimit('order_read');
    return withTimeout(
      (async () => {
        try {
          const supabase = getSupabase();
          let query = supabase
            .from('orders')
            .select(`
              *,
              pickup_point:pickup_points(name, delivery_fee),
              user:users(phone, name),
              delivery_schedule(id, delivery_partner_id, status),
              order_items(
                quantity,
                price,
                product:products(sell_type, unit, category, pack_size_grams)
              )
            `)
            .order('created_at', { ascending: false });

          if (filters?.status) {
            query = query.eq('status', filters.status);
          }

          const { data, error } = await query;

          if (error) {
            throw error;
          }

          if (!data) return [];

          const { calculateItemSubtotalValue } = require('../utils/productUtils');
          
          return data.map((order: any) => {
            const items = order.order_items || [];
            const subtotal = items.reduce((sum: number, item: any) => {
              const { isProductWeightBased } = require('../utils/productUtils');
              const isWeightBased = isProductWeightBased(item.product);
              const packSize = item.product?.pack_size_grams || 1000;
              
              if (isWeightBased) {
                item.quantity = item.quantity * 1000; // KG -> Grams
              } else {
                let dbQty = item.quantity; if (dbQty > 0 && dbQty < 0.1) dbQty = dbQty * 1000; const factor = packSize / 1000; item.quantity = factor > 0 ? Math.round(dbQty / factor) : dbQty;
              }

              return sum + calculateItemSubtotalValue(item.quantity, item.price, item.product);
            }, 0);
            
            const paymentFee = typeof order.payment_fee === 'number' ? order.payment_fee : 0;
            const deliveryFee = typeof order.delivery_fee === 'number' ? order.delivery_fee : 0;
            
            // Recalculate total for display consistency
            const recalculatedTotal = subtotal + deliveryFee + paymentFee;

            return {
              ...order,
              total_amount: recalculatedTotal
            };
          });
        } catch (error) {
          console.error('Error fetching all orders:', error);
          throw error;
        }
      })(),
      {
        timeout: DEFAULT_TIMEOUTS.MEDIUM,
        errorMessage: 'Failed to fetch orders: request timed out',
      }
    );
  },

  /**
   * Get a single order by ID
   */
  async getOrderById(orderId: string): Promise<Order | null> {
    checkRateLimit('order_read');
    return withTimeout(
      (async () => {
        try {
          const supabase = getSupabase();
          const { data, error } = await supabase
            .from('orders')
            .select(`
              *,
              user:users(name, phone),
              delivery_schedule(*),
              order_items(
                quantity,
                price,
                product:products(name, image_url, sell_type, unit, category, pack_size_grams)
              )
            `)
            .eq('id', orderId)
            .single();

          if (error) {
            throw error;
          }

          if (!data) return null;

          const { calculateItemSubtotalValue } = require('../utils/productUtils');
          
          const items = data.order_items || [];
          const subtotal = items.reduce((sum: number, item: any) => {
            const { isProductWeightBased } = require('../utils/productUtils');
            const isWeightBased = isProductWeightBased(item.product);
            const packSize = item.product?.pack_size_grams || 1000;

            if (isWeightBased) {
              item.quantity = item.quantity * 1000;
            } else {
              const factor = packSize / 1000;
              let dbQty = item.quantity; if (dbQty > 0 && dbQty < 0.1) dbQty = dbQty * 1000; item.quantity = factor > 0 ? Math.round(dbQty / factor) : dbQty;
            }

            return sum + calculateItemSubtotalValue(item.quantity, item.price, item.product);
          }, 0);
          
          const paymentFee = typeof data.payment_fee === 'number' ? data.payment_fee : 0;
          const deliveryFee = typeof data.delivery_fee === 'number' ? data.delivery_fee : 0;
          
          // Recalculate total for display consistency
          const recalculatedTotal = subtotal + deliveryFee + paymentFee;

          return {
            ...data,
            total_amount: recalculatedTotal
          };
        } catch (error) {
          console.error('Error fetching order:', error);
          throw error;
        }
      })(),
      {
        timeout: DEFAULT_TIMEOUTS.MEDIUM,
        errorMessage: 'Failed to fetch order: request timed out',
      }
    );
  },

  /**
   * Get order items for an order
   */
  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    checkRateLimit('order_read');
    return withTimeout(
      (async () => {
        try {
          const supabase = getSupabase();
          const { data, error } = await supabase
            .from('order_items')
            .select('*, product:products(name, image_url, sell_type, unit, category, pack_size_grams)')
            .eq('order_id', orderId);

          if (error) {
            console.error(`❌ [orderService] Error fetching items for ${orderId}:`, error);
            throw error;
          }

          console.log(`📊 [orderService] getOrderItems for ${orderId}: Found ${data?.length || 0} raw items`);

          if (!data || data.length === 0) {
            console.warn(`⚠️ [orderService] No items returned for order ${orderId} in DB`);
            return [];
          }

          const { calculateItemSubtotalValue, isProductWeightBased } = require('../utils/productUtils');
          
          const mappedData = data.map((item: any) => {
            const { isProductWeightBased } = require('../utils/productUtils');
            const isWeightBased = isProductWeightBased(item.product);
            const packSize = item.product?.pack_size_grams || 1000;
            
            if (isWeightBased) {
              item.quantity = item.quantity * 1000;
            } else {
              const factor = packSize / 1000;
              let dbQty = item.quantity; if (dbQty > 0 && dbQty < 0.1) dbQty = dbQty * 1000; item.quantity = factor > 0 ? Math.round(dbQty / factor) : dbQty;
            }
            return item;
          });

          console.log(`✅ [orderService] getOrderItems for ${orderId}: Returning ${mappedData.length} mapped items`);
          return mappedData;
        } catch (error) {
          console.error('Error fetching order items:', error);
          throw error;
        }
      })(),
      {
        timeout: DEFAULT_TIMEOUTS.MEDIUM,
        errorMessage: 'Failed to fetch order items: request timed out',
      }
    );
  },

  /**
   * Create a new order atomically with stock reservation
   * Uses database function to ensure atomicity and prevent duplicate orders
   * Supports offline queueing if network is unavailable
   * Uses request queue for critical operation management
   */
  async createOrder(orderData: CreateOrderData): Promise<Order> {
    checkRateLimit('order_write');
    // Queue this critical operation with high priority
    return queueRequest(
      async () => {
        return this.createOrderInternal(orderData);
      },
      'high'
    );
  },

  /**
   * Internal order creation logic (not queued, called by createOrder)
   * @private
   */
  async createOrderInternal(orderData: CreateOrderData): Promise<Order> {
      // 1. Calculate correct subtotal (handling grams for fresh/frozen)
      const subtotal = orderData.items.reduce(
        (sum, item) => {
          // Use harmonized logic from productUtils
          const { calculateItemSubtotalValue } = require('../utils/productUtils');
          
          // Reconstruct a partial product object for calculation
          const productStub = {
             sell_type: item.sell_type,
             category: item.product_category
          };

          const itemSubtotal = calculateItemSubtotalValue(item.quantity, item.price, productStub);
          return sum + itemSubtotal;
        },
        0
      );
      
      // 2. Add delivery fee and payment fee to total
      const totalAmount = subtotal + (orderData.delivery_fee || 0) + (orderData.payment_fee || 0);

      // Generate idempotency key if not provided
      const idempotencyKey = orderData.idempotency_key || 
        `${orderData.user_id}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      // Prepare items (Grams format preserved as requested)
      const itemsJson = orderData.items.map((item) => {
        const { isProductWeightBased } = require('../utils/productUtils');
        
        let saveQuantity = item.quantity;
        
        // Use isProductWeightBased to determine if we should convert to grams
        const productStub = {
          sell_type: item.sell_type,
          category: item.product_category,
          unit: item.unit
        };
        const isLoose = isProductWeightBased(productStub);
        
        // If it's a pack item, convert count to grams for storage
        // The backend RPC create_order_atomic will divide by 1000 to get KG
        if (!isLoose) {
          const packSize = item.pack_size_grams || 1000;
          saveQuantity = item.quantity * packSize;
        }

        return {
          product_id: item.product_id,
          quantity: saveQuantity,
          price: item.price,
          sell_type: item.sell_type,
        };
      });

      const supabase = getSupabase();
      
      // CRITICAL FIX: Ensure user exists in public.users table before creating order
      // This prevents the "violates foreign key constraint 'orders_user_id_fkey'" error
      try {
        const { data: profileCheck } = await supabase
          .from('users')
          .select('id')
          .eq('id', orderData.user_id)
          .single();

        if (!profileCheck) {
          console.log(`👤 [orderService] Profile missing for ${orderData.user_id}, syncing from auth...`);
          // Try to get user from auth to populate profile
          const authUser = supabase.auth.user();
          
          if (authUser && authUser.id === orderData.user_id) {
            await supabase.from('users').upsert({
              id: authUser.id,
              email: authUser.email,
              name: authUser.user_metadata?.name || (authUser.email ? authUser.email.split('@')[0] : 'User'),
              role: authUser.user_metadata?.role || 'customer'
            }, { onConflict: 'id' });
            console.log('✅ [orderService] Profile synced successfully');
          } else {
            // Fallback: minimal profile creation if auth user not reachable/different
            const userIdStr = String(orderData.user_id);
            await supabase.from('users').upsert({
              id: orderData.user_id,
              email: `${userIdStr.slice(0, 8)}@placeholder.com`, // Placeholder email
              role: 'customer'
            }, { onConflict: 'id' });
            console.log('⚠️ [orderService] Created minimal profile (Auth user mismatch or unavailable)');
          }
        }
      } catch (syncError) {
        console.warn('⚠️ [orderService] User sync check failed, attempting order anyway:', syncError);
      }
      
      // Use atomic database function to create order with timeout
      const { data: orderId, error: functionError } = (await withTimeout(
        supabase.rpc(
          'create_order_atomic',
          {
            p_user_id: orderData.user_id,
            p_country: orderData.country,
            p_payment_method: orderData.payment_method,
            p_total_amount: totalAmount,
            p_items: itemsJson as any,
            p_pickup_point_id: orderData.pickup_point_id || null,
            p_delivery_address: orderData.delivery_address || null,
            p_delivery_fee: orderData.delivery_fee || 0,
            p_idempotency_key: idempotencyKey,
            p_delivery_method: orderData.delivery_method || (orderData.delivery_address ? 'home' : 'pickup'),
            p_payment_fee: orderData.payment_fee || 0,
          }
        ),
        {
          timeout: DEFAULT_TIMEOUTS.LONG,
          errorMessage: 'Order creation timed out',
        }
      )) as any;

      if (functionError) {
        // If it's a duplicate order (idempotency key conflict), fetch the existing order
        if (functionError.message?.includes('duplicate') || functionError.code === '23505') {
          const { data: existingOrder } = await supabase
            .from('orders')
            .select('*')
            .eq('idempotency_key', idempotencyKey)
            .single();
          
          if (existingOrder) {
            return existingOrder;
          }
        }
        throw functionError;
      }

      if (!orderId) {
        throw new Error('Order creation failed: No order ID returned');
      }

      // Fetch the created order with all details
      // Fetch the created order with all details
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (fetchError || !order) {
        throw fetchError || new Error('Failed to fetch created order');
      }

      // 4. Save/Update delivery address if it's a home delivery
      if (orderData.delivery_address && orderData.user_id) {
          try {
              const { addressService } = require('./addressService');
              const parts = orderData.delivery_address.split(',');
              const street = parts[0]?.trim() || '';
              
              // Get existing addresses to see if we should updated
              const existingAddresses = await addressService.getUserAddresses(orderData.user_id);
              const homeAddress = existingAddresses.find((a: any) => a.type === 'Home');
              
              const addressData = {
                  user_id: orderData.user_id,
                  type: 'Home' as const,
                  name: 'Checkout Address',
                  street: street,
                  city: parts[1]?.trim() || '',
                  postal_code: parts[2]?.trim().split(' ')[0] || '',
                  country: orderData.country,
                  phone: orderData.phone || '', 
                  is_default: true, // Make it default if it's from checkout
                  latitude: orderData.latitude,
                  longitude: orderData.longitude,
              };

              if (homeAddress) {
                  // Update existing
                  await addressService.updateAddress(homeAddress.id, addressData);
              } else {
                  // Add new
                  await addressService.addAddress(addressData);
              }
          } catch (addrError) {
              console.warn('Failed to save/update address:', addrError);
          }
      }

      // 5. Notify Customer about Order Confirmation
      try {
        const { notificationService } = require('./notificationService');
        const { i18n } = require('../i18n');
        const orderIdShort = orderId.slice(0, 8);
        await notificationService.createNotification(
          order.user_id,
          'order',
          i18n.t('admin.notifications.orderConfirmedTitle'),
          i18n.t('admin.notifications.orderConfirmedMessage', { orderId: orderIdShort }),
          { orderId }
        );
      } catch (custNotifError) {
        console.warn('[orderService] Failed to notify customer:', custNotifError);
      }

      // 5. Notify Admins about New Order
      try {
        const { notificationService } = require('./notificationService');
        const { i18n } = require('../i18n');
        const orderIdShort = orderId.slice(0, 8);
        
        // Fetch all admins
        const { data: admins } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'admin');

        // Fetch user profile for customer name
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', order.user_id)
          .single();

        if (admins && admins.length > 0) {
          for (const admin of admins) {
            await notificationService.createNotification(
              admin.id,
              'general',
              i18n.t('admin.notifications.newOrderTitle'),
              i18n.t('admin.notifications.newOrderMessage', {
                customer: userProfile?.name || 'Customer',
                orderId: orderIdShort
              }),
              { orderId }
            ).catch((err: any) => console.error(`Failed to notify admin ${admin.id}:`, err));
          }
        }
      } catch (adminNotifError) {
        console.warn('[orderService] Failed to notify admins:', adminNotifError);
      }

      // 6. Check for Low Stock Alerts
      try {
        const { productService } = require('./productService');
        for (const item of orderData.items) {
          productService.checkStockAlerts(item.product_id);
        }
      } catch (stockError) {
        console.warn('[orderService] Failed to trigger stock alerts:', stockError);
      }
      // 5. Update user profile phone number if provided
      if (orderData.phone && orderData.user_id) {
          try {
              const { userService } = require('./userService');
              // Fire and forget or await? Awaiting is safer to ensure it's saved.
              await userService.updateUserProfile(orderData.user_id, { phone: orderData.phone });
          } catch (userError) {
              console.warn('Failed to update user profile phone:', userError);
          }
      }

      return order;
  },

  /**
   * Update order status
   * If status is 'canceled', it triggers the full cancelOrder flow
   */
  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
    checkRateLimit('order_write');
    if (status === 'canceled') {
      return this.cancelOrder(orderId);
    }
    return this.updateOrderStatusInternal(orderId, status);
  },

  /**
   * Internal status update logic (bypasses cancelOrder check)
   * @private
   */
  async updateOrderStatusInternal(orderId: string, status: OrderStatus): Promise<Order> {
    return withTimeout(
      (async () => {
        try {
          const supabase = getSupabase();
          const { data, error } = await supabase
            .from('orders')
            .update({ status })
            .eq('id', orderId)
            .select()
            .single();

          if (error) {
            throw error;
          }

          // --- NOTIFICATION LOGIC ---
          try {
            // Fetch full order details to check delivery method and get related data
            // We use the internal helper or just fetch what we need to verify method
            if (data && status === 'out_for_delivery') {
               const { notificationService } = require('./notificationService');
               const order = data as Order;
               
               // SCENARIO: Ready for Pickup
               // We use 'out_for_delivery' status to mean "Ready" for pickup orders
               if (order.delivery_method === 'pickup') {
                  // Fetch pickup point name if possible
                  let pickupPointName = 'the store';
                  if (order.pickup_point_id) {
                     const { data: pp } = await supabase
                       .from('pickup_points')
                       .select('name')
                       .eq('id', order.pickup_point_id)
                       .single();
                     if (pp) pickupPointName = pp.name;
                  }

                  const orderIdShort = orderId.slice(0, 6).toUpperCase();
                  await notificationService.createNotification(
                    order.user_id,
                    'ready_for_pickup', // New type
                    'Ready for Pickup! 🛍️',
                    `Your Order #${orderIdShort} is ready for pickup at ${pickupPointName}.`,
                    { orderId }
                  );
               }
            }
          } catch (notifError) {
            console.warn('[orderService] Failed to send status update notification:', notifError);
          }

          return data;
        } catch (error) {
          console.error('Error updating order status:', error);
          throw error;
        }
      })(),
      {
        timeout: DEFAULT_TIMEOUTS.MEDIUM,
        errorMessage: 'Failed to update order status: request timed out',
      }
    );
  },

  /**
   * Cancel an order with refund logic and in-app notification
   */
  async cancelOrder(orderId: string, reason?: string): Promise<Order> {
    return withTimeout(
      (async () => {
        try {
          const supabase = getSupabase();
          
          // 1. Fetch order details (order_items are joined inside getOrderById)
          const order = await this.getOrderById(orderId);
          if (!order) {
            throw new Error('Order not found');
          }
          const deliveryFee = typeof order.delivery_fee === 'number' ? order.delivery_fee : 0;

          // 2. Initial validation - can only cancel pending or confirmed orders
          const cancellableStatuses: OrderStatus[] = ['pending', 'confirmed'];
          if (!cancellableStatuses.includes(order.status)) {
            throw new Error(`Order in status ${order.status} cannot be canceled`);
          }

          // 3. Handle refund if paid online
          if (order.payment_method === 'online' && order.payment_status === 'paid') {
            const { useAuthStore } = require('../store/authStore');
            const authUserId = useAuthStore.getState().user?.id;
            
            if (!authUserId) {
              throw new Error('Authentication required to process refund');
            }

            // SECURITY: Verify the user owns the order we are refunding
            if (order.user_id !== authUserId) {
              const { data: adminUser } = await supabase
                .from('users')
                .select('role')
                .eq('id', authUserId)
                .single();
              
              if (adminUser?.role !== 'admin') {
                console.error(`[orderService] Security Violation: User ${authUserId} tried to cancel order ${orderId} owned by ${order.user_id}`);
                throw new Error('Unauthorized: You can only refund your own orders');
              }
              console.log(`[orderService] Admin ${authUserId} is refunding order ${orderId} for user ${order.user_id}`);
            }

            console.log(`[orderService] Triggering refund for order ${orderId}...`);
            const { stripeService } = require('./stripeService');
            
            // Refund the full stored total (already includes delivery + payment fees)
            const refundAmount = order.total_amount;
            const refundResult = await stripeService.refundPayment(orderId, refundAmount);
            
            if (!refundResult.success) {
              console.error('❌ [orderService] Stripe Refund Failed:', JSON.stringify(refundResult));
              const errorMessage = refundResult.message || refundResult.error || 'Stripe refund failed';
              const rawResult = JSON.stringify(refundResult);
              throw new Error(`${errorMessage}. (Raw: ${rawResult})`);
            }
            
            console.log('✅ [orderService] Stripe Refund Successful:', refundResult);
            
            // Update payment status to refunded
            await this.updatePaymentStatus(orderId, 'refunded');
          }

          // 4. Update order status to canceled using internal method to avoid recursion
          const updatedOrder = await this.updateOrderStatusInternal(orderId, 'canceled');

          // 5. Send in-app notification to customer
          try {
            const { notificationService } = require('./notificationService');
            const { i18n } = require('../i18n');
            const orderIdShort = orderId.slice(0, 8);
            
            await notificationService.createNotification(
              order.user_id,
              'general',
              i18n.t('admin.notifications.orderCanceledTitle'),
              i18n.t('admin.notifications.orderCanceledMessage', { customer: 'You', orderId: orderIdShort }),
              { orderId }
            );
          } catch (notifError) {
            console.warn('[orderService] Failed to send cancellation notification:', notifError);
            // Don't fail the whole cancellation if notification fails
          }

          // 6. Notify Admins about Cancellation
          try {
            const { notificationService } = require('./notificationService');
            const { i18n } = require('../i18n'); // Import i18n
            const orderIdShort = orderId.slice(0, 6).toUpperCase();
            
            // Fetch all admins
            const { data: admins } = await supabase
              .from('users')
              .select('id')
              .eq('role', 'admin');

            if (admins && admins.length > 0) {
              // Get user profile for notification
              const { data: userProfile } = await supabase
                .from('profiles')
                .select('name')
                .eq('id', order.user_id)
                .single();

              for (const admin of admins) {
                await notificationService.createNotification(
                  admin.id,
                  'order_canceled',
                  i18n.t('admin.notifications.orderCanceledTitle'),
                  i18n.t('admin.notifications.orderCanceledMessage', {
                    customer: userProfile?.name || 'Customer',
                    orderId: orderId.slice(0, 8)
                  }),
                  { orderId }
                ).catch((err: any) => console.error(`Failed to notify admin ${admin.id}:`, err));
              }
            }
          } catch (adminNotifError) {
             console.warn('[orderService] Failed to notify admins about cancellation:', adminNotifError);
          }

          // 7. Notify Delivery Partner if assigned (NEW)
          try {
            // Check if there is an active delivery schedule
            const { deliveryService } = require('./deliveryService');
            const schedule = await deliveryService.getDeliveryScheduleByOrderId(orderId);
            
            if (schedule && schedule.delivery_partner_id && schedule.status !== 'delivered' && schedule.status !== 'canceled') {
               const { notificationService } = require('./notificationService');
               const { i18n } = require('../i18n');
               const orderIdShort = orderId.slice(0, 8);
               
               console.log(`[orderService] Notifying delivery partner ${schedule.delivery_partner_id} about cancellation`);
               
               await notificationService.createNotification(
                  schedule.delivery_partner_id,
                  'task_cancelled',
                  i18n.t('admin.notifications.stopDeliveryTitle'),
                  i18n.t('admin.notifications.stopDeliveryMessage', { orderId: orderIdShort }),
                  { orderId, scheduleId: schedule.id }
               );

               // Also update schedule status to canceled
               await deliveryService.updateDeliverySchedule(schedule.id, { status: 'canceled' });
            }
          } catch (driverNotifError) {
            console.warn('[orderService] Failed to notify driver about cancellation:', driverNotifError);
          }

          return updatedOrder;
        } catch (error: any) {
          console.error('Error canceling order:', error);
          throw error;
        }
      })(),
      {
        timeout: DEFAULT_TIMEOUTS.LONG,
        errorMessage: 'Cancel order operation timed out',
      }
    );
  },

  /**
   * Update payment status
   */
  async updatePaymentStatus(
    orderId: string,
    paymentStatus: PaymentStatus
  ): Promise<Order> {
    return withTimeout(
      (async () => {
        try {
          const supabase = getSupabase();
          const { data, error } = await supabase
            .from('orders')
            .update({ payment_status: paymentStatus })
            .eq('id', orderId)
            .select()
            .single();

          if (error) {
            throw error;
          }

          return data;
        } catch (error) {
          console.error('Error updating payment status:', error);
          throw error;
        }
      })(),
      {
        timeout: DEFAULT_TIMEOUTS.MEDIUM,
        errorMessage: 'Failed to update payment status: request timed out',
      }
    );
  },

  /**
   * Get top products for admin dashboard stats
   */
  async getTopProducts(period: 'today' | 'week' | 'month'): Promise<any[]> {
    checkRateLimit('order_read');
    return withTimeout(
      (async () => {
        try {
          const supabase = getSupabase();
          
          let startDate = new Date();
          if (period === 'today') {
            startDate.setHours(0, 0, 0, 0);
          } else if (period === 'week') {
            startDate.setDate(startDate.getDate() - 7);
          } else if (period === 'month') {
            startDate.setMonth(startDate.getMonth() - 1);
          }

          // Fetch order items joined with orders to filter by date and country
          // We fetch product details as well
          const { data, error } = await supabase
            .from('order_items')
            .select(`
              product_id,
              quantity,
              orders!inner (
                country,
                created_at
              ),
              product:products (
                name,
                image_url
              )
            `)
            .gte('orders.created_at', startDate.toISOString());

          if (error) {
            throw error;
          }

          if (!data) return [];

          // Aggregate by country and product
          const aggregated: Record<string, Record<string, { product_id: string, name: string, image_url: string, count: number }>> = {
            germany: {},
            denmark: {}
          };

          data.forEach((item: any) => {
            const country = item.orders.country;
            const productId = item.product_id;
            const productName = item.product?.name || 'Unknown Product';
            const imageUrl = item.product?.image_url || '';

            if (aggregated[country]) {
              if (!aggregated[country][productId]) {
                aggregated[country][productId] = {
                  product_id: productId,
                  name: productName,
                  image_url: imageUrl,
                  count: 0
                };
              }
              aggregated[country][productId].count += item.quantity;
            }
          });

          // Convert to sorted arrays and take top 5
          const result = {
            germany: Object.values(aggregated.germany)
              .sort((a, b) => b.count - a.count)
              .slice(0, 5),
            denmark: Object.values(aggregated.denmark)
              .sort((a, b) => b.count - a.count)
              .slice(0, 5)
          };

          return [result]; // Returning as array to be consistent with other service methods if needed
        } catch (error) {
          console.error('Error getting top products:', error);
          throw error;
        }
      })(),
      {
        timeout: DEFAULT_TIMEOUTS.MEDIUM,
        errorMessage: 'Failed to fetch top products: request timed out',
      }
    );
  },
};
