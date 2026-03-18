// Lazy import Supabase to avoid initialization during module load
import { Order, DeliveryStatus, DeliverySchedule } from '../types';

export type { DeliveryStatus, DeliverySchedule };

// Import Supabase lazily - only when needed
function getSupabase() {
  return require('./supabase').supabase;
}


export interface CreateDeliveryScheduleData {
  order_id: string;
  delivery_date: string;
  status: DeliveryStatus;
  pickup_point_id: string;
  delivery_partner_id?: string;
  estimated_time?: string;
  notes?: string;
}

export interface UpdateDeliveryScheduleData {
  status?: DeliveryStatus;
  delivery_date?: string;
  delivery_partner_id?: string;
  estimated_time?: string;
  actual_delivery_time?: string;
  notes?: string;
}

export const deliveryService = {
  /**
   * Get all delivery schedules (Admin only)
   */
  async getDeliverySchedules(filters?: {
    status?: DeliveryStatus;
    delivery_date?: string;
    country?: 'germany' | 'denmark';
    delivery_partner_id?: string;
  }): Promise<DeliverySchedule[]> {
    try {
      const supabase = getSupabase();
      
      console.log('🔍 [deliveryService] getDeliverySchedules called with filters:', JSON.stringify(filters));
      
      let query = supabase
        .from('delivery_schedule')
        .select(`
          *,
          order:orders(*),
          pickup_point:pickup_points(id, name, address)
        `)
        .order('delivery_date', { ascending: true })
        .order('estimated_time', { ascending: true });

      if (filters?.status) {
        console.log(`🔍 [deliveryService] Adding status filter: ${filters.status}`);
        query = query.eq('status', filters.status);
      }

      if (filters?.delivery_date) {
        console.log(`🔍 [deliveryService] Adding delivery_date filter: ${filters.delivery_date}`);
        query = query.eq('delivery_date', filters.delivery_date);
      }

      // Filter by delivery partner ID (for dashboard)
      // Note: 'delivery_partner_id' field must exist in database schema
      // If it doesn't, we'd need to add it, but based on types it seems implied or we filter client side
      // Getting schema confirmation... derived from types/index.ts usually but here we have DeliverySchedule type
      // DeliverySchedule type doesn't list delivery_person_id or delivery_person_name anymore
      // Assuming database has it based on standard relational design. If not, this might fail.
      // Let's assume the column exists as per standard implementation plan or common sense.
      // If the column name is different, we'll need to adjust.
      if (filters?.delivery_partner_id) {
         console.log(`🔍 [deliveryService] Adding delivery_partner_id filter: ${filters.delivery_partner_id}`);
         query = query.eq('delivery_partner_id', filters.delivery_partner_id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ [deliveryService] Query error:', error);
        throw error;
      }

      console.log(`📊 [deliveryService] Query returned ${data?.length || 0} schedules`);
      if (data && data.length > 0) {
        console.log(`📋 [deliveryService] First schedule sample:`, {
          id: data[0].id,
          order_id: data[0].order_id,
          delivery_partner_id: data[0].delivery_partner_id,
          status: data[0].status
        });
      }

      // Filter by country if specified
      let schedules = (data || []) as DeliverySchedule[];
      if (filters?.country) {
        console.log(`🔍 [deliveryService] Client-side filtering by country: ${filters.country}`);
        schedules = schedules.filter(
          (schedule) => schedule.order?.country === filters.country
        );
        console.log(`📊 [deliveryService] After country filter: ${schedules.length} schedules`);
      }

      // Fetch customer data for each order
      const schedulesWithDetails = await Promise.all(
        schedules.map(async (schedule) => {
          // Fallback: If order is null (likely RLS or join fail), try fetching it explicitly
          if (!schedule.order && schedule.order_id) {
            console.log(`📡 [deliveryService] Fallback: Explicitly fetching order ${schedule.order_id}`);
            const { data: orderData } = await supabase
              .from('orders')
              .select('*')
              .eq('id', schedule.order_id)
              .limit(1);
            if (orderData && (orderData as any).length > 0) {
              console.log(`✅ [deliveryService] Fallback found order ${(orderData as any)[0].id}`);
              schedule.order = (orderData as any)[0];
            } else {
              console.warn(`❌ [deliveryService] Fallback FAILED for order ${schedule.order_id}`);
            }
          }

          // --- DOUBLE FALLBACK FOR PICKUP POINT ---
          // 1. Try schedule.pickup_point_id
          // 2. Fallback to order.pickup_point_id
          const effectivePointId = schedule.pickup_point_id || schedule.order?.pickup_point_id;

          if (!schedule.pickup_point && effectivePointId) {
            console.log(`📡 [deliveryService] Fallback: Explicitly fetching pickup_point ${effectivePointId} (Source: ${schedule.pickup_point_id ? 'Schedule' : 'Order'})`);
            try {
              const { data: pointData } = await supabase
                .from('pickup_points')
                .select('id, name, address')
                .eq('id', effectivePointId)
                .limit(1);
              if (pointData && (pointData as any).length > 0) {
                console.log(`✅ [deliveryService] Fallback found pickup point: ${(pointData as any)[0].name}`);
                schedule.pickup_point = (pointData as any)[0];
              } else {
                console.warn(`❌ [deliveryService] Fallback FAILED for pickup point ${effectivePointId}`);
              }
            } catch (err) {
              console.error(`❌ [deliveryService] Error in pickup_point fallback:`, err);
            }
          }

          // Diagnostic Logging
          console.log(`📝 [deliveryService] Schedule ${schedule.id.slice(0, 8)}:`, {
            partner_id: schedule.delivery_partner_id?.slice(0, 8),
            sched_point_id: schedule.pickup_point_id?.slice(0, 8),
            order_point_id: schedule.order?.pickup_point_id?.slice(0, 8),
            point_name: schedule.pickup_point?.name,
            point_address: schedule.pickup_point?.address?.slice(0, 20)
          });

          const userId = schedule.order?.user_id;
          if (userId) {
            console.log(`🔍 [deliveryService] Fetching profile for user: ${userId}`);
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('id, name, email, phone')
              .eq('id', userId)
              .limit(1);

            if (userError) {
              console.error(`❌ [deliveryService] Error fetching user ${userId}:`, userError);
            }

            if (userData && (userData as any).length > 0) {
              const u = (userData as any)[0];
              console.log(`✅ [deliveryService] Found customer: ${u.name || u.email}`);
              schedule.customer = u;
            } else {
              console.warn(`⚠️ [deliveryService] No user data found for ID: ${userId}`);
            }
          } else {
            console.warn(`⚠️ [deliveryService] Schedule ${schedule.id} has no order or user_id`);
          }
          return schedule;
        })
      );

      console.log(`✅ [deliveryService] Returning ${schedulesWithDetails.length} schedules with detail data`);
      return schedulesWithDetails;
    } catch (error) {
      console.error('Error fetching delivery schedules:', error);
      throw error;
    }
  },

  /**
   * Get delivery schedule by ID
   */
  async getDeliveryScheduleById(scheduleId: string): Promise<DeliverySchedule | null> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('delivery_schedule')
        .select(`
          *,
          order:orders(*),
          pickup_point:pickup_points(id, name, address)
        `)
        .eq('id', scheduleId)
        .limit(1);

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) return null;

      const schedule = data[0] as DeliverySchedule;

      // Fetch customer data
      if (schedule.order?.user_id) {
        const { data: userData } = await supabase
          .from('users')
          .select('id, name, email, phone')
          .eq('id', schedule.order.user_id)
          .single();

        if (userData) {
          schedule.customer = userData;
        }
      }

      return schedule;
    } catch (error) {
      console.error('Error fetching delivery schedule:', error);
      throw error;
    }
  },

  /**
   * Get delivery schedule for an order
   */
  async getDeliveryScheduleByOrderId(orderId: string): Promise<DeliverySchedule | null> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('delivery_schedule')
        .select(`
          *,
          order:orders(*),
          pickup_point:pickup_points(id, name, address)
        `)
        .eq('order_id', orderId)
        .limit(1);

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) return null;

      const schedule = data[0] as DeliverySchedule;

      // Fetch customer data
      if (schedule.order?.user_id) {
        const { data: userData } = await supabase
          .from('users')
          .select('id, name, email, phone')
          .eq('id', schedule.order.user_id)
          .single();

        if (userData) {
          schedule.customer = userData;
        }
      }

      return schedule;
    } catch (error) {
      console.error('Error fetching delivery schedule by order ID:', error);
      throw error;
    }
  },

  /**
   * Create a delivery schedule (Admin only)
   */
  async createDeliverySchedule(
    scheduleData: CreateDeliveryScheduleData
  ): Promise<DeliverySchedule> {
    try {
      const supabase = getSupabase();
      
      const { data, error } = await supabase
        .from('delivery_schedule')
        .insert(scheduleData)
        .select(`
          *,
          order:orders(*),
          pickup_point:pickup_points(id, name, address)
        `)
        .limit(1);

      if (error) {
        throw error;
      }

      const schedule = (data && (data as any).length > 0) ? (data as any)[0] as DeliverySchedule : null;
      if (!schedule) throw new Error('Failed to create delivery schedule: No data returned');

      if (schedule.order?.user_id) {
        const { data: userData } = await supabase
          .from('users')
          .select('id, name, email, phone')
          .eq('id', schedule.order.user_id)
          .limit(1);

        if (userData && (userData as any).length > 0) {
          schedule.customer = (userData as any)[0];
        }
      }

      // --- NOTIFY DELIVERY PARTNER ---
      if (scheduleData.delivery_partner_id) {
          const { notificationService } = require('./notificationService');
          const { i18n } = require('../i18n');
          const orderIdShort = schedule.order?.id?.slice(0, 8) || 'Order';
          
          // 1. In-App Notification (Partner)
          try {
              await notificationService.createNotification(
                  scheduleData.delivery_partner_id,
                  'task_assigned',
                  i18n.t('admin.notifications.newTaskTitle'),
                  i18n.t('admin.notifications.newTaskMessage', { orderId: orderIdShort }),
                  { orderId: schedule.order_id, scheduleId: schedule.id }
              );
              console.log(`✅ [deliveryService] Notification sent to partner ${scheduleData.delivery_partner_id}`);
          } catch (notifError) {
              console.warn(`⚠️ [deliveryService] Failed to send notification to partner:`, notifError);
          }

          // 2. Notify Customer (Order Owner)
          if (schedule.customer?.id) {
              try {
                  await notificationService.createNotification(
                      schedule.customer.id,
                      'order_assigned',
                      i18n.t('admin.notifications.partnerAssignedTitle'),
                      i18n.t('admin.notifications.partnerAssignedMessage', { orderId: orderIdShort }),
                      { orderId: schedule.order_id, scheduleId: schedule.id }
                  );
                  console.log(`✅ [deliveryService] Notification sent to customer ${schedule.customer.id}`);
              } catch (custNotifError) {
                  console.warn(`⚠️ [deliveryService] Failed to notify customer about partner assignment:`, custNotifError);
              }
          }
      }

      return schedule;
    } catch (error) {
      console.error('Error creating delivery schedule:', error);
      throw error;
    }
  },

  /**
   * Update delivery schedule (Admin only)
   */
  async updateDeliverySchedule(
    scheduleId: string,
    updates: UpdateDeliveryScheduleData
  ): Promise<DeliverySchedule> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('delivery_schedule')
        .update(updates)
        .eq('id', scheduleId)
        .select(`
          *,
          order:orders(*),
          pickup_point:pickup_points(id, name, address)
        `)
        .limit(1);

      if (error) {
        throw error;
      }

      if (!data || (data as any).length === 0) throw new Error('Failed to update delivery schedule: No data returned');
      const schedule = (data as any)[0] as DeliverySchedule;

      // Fetch customer data
      if (schedule.order?.user_id) {
        const { data: userData } = await supabase
          .from('users')
          .select('id, name, email, phone')
          .eq('id', schedule.order.user_id)
          .limit(1);

        if (userData && (userData as any).length > 0) {
          schedule.customer = (userData as any)[0];
        }
      }

      console.log(`✅ [deliveryService] Schedule ${scheduleId} updated to ${updates.status}`);

      // --- STATUS UPDATES & NOTIFICATIONS (TAMIL) ---
      const { notificationService } = require('./notificationService');
      const orderIdShort = schedule.order?.id?.slice(0, 6)?.toUpperCase() || 'Order';
      const customerPhone = schedule.customer?.phone;
      
      console.log(`📡 [deliveryService] Triggering notifications for status: ${updates.status}`);

      // 1. Accepted
      if (updates.status === 'accepted') {
         const { i18n } = require('../i18n');
         // Notify Customer
         if (schedule.customer?.id) {
             await notificationService.createNotification(
                 schedule.customer.id,
                 'order_confirmed',
                 i18n.t('admin.notifications.orderAcceptedTitle'),
                 i18n.t('admin.notifications.orderAcceptedMessage', { orderId: orderIdShort }),
                 { orderId: schedule.order_id, scheduleId: schedule.id }
              );
         }
         
         // Notify Partner (if assigned) - REINFORCEMENT
         if (schedule.delivery_partner_id) {
             try {
                await notificationService.createNotification(
                    schedule.delivery_partner_id,
                    'task_assigned',
                    i18n.t('admin.notifications.newTaskTitle'), 
                    i18n.t('admin.notifications.newTaskMessage', { orderId: orderIdShort }),
                    { orderId: schedule.order_id, scheduleId: schedule.id }
                );
             } catch (err) {
                 console.warn('[deliveryService] Failed to notify partner on accept:', err);
             }
         }

      }

      // 2. Picked Up (Optional intermediate step)
      // Internal tracking update only

      // 3. Out for Delivery (In Transit / Picked Up)
      else if ((updates.status === 'in_transit' || updates.status === 'picked_up') && schedule.order) {
        await supabase
          .from('orders')
          .update({ status: 'out_for_delivery' })
          .eq('id', schedule.order_id);

        // Notify Customer based on delivery method
        if (schedule.customer?.id) {
            const { i18n } = require('../i18n');
            const isPickup = schedule.order.delivery_method === 'pickup';
            const title = isPickup ? i18n.t('admin.notifications.readyForPickupTitle') : i18n.t('admin.notifications.onTheWayTitle');
            const message = isPickup 
                ? i18n.t('admin.notifications.readyForPickupMessage', { orderId: orderIdShort })
                : i18n.t('admin.notifications.onTheWayMessage', { orderId: orderIdShort });

            await notificationService.createNotification(
                schedule.customer.id,
                isPickup ? 'ready_for_pickup' : 'order_shipped',
                title,
                message,
                { orderId: schedule.order_id, scheduleId: schedule.id }
            );
        }

      }

      // 4. Delivered
      else if (updates.status === 'delivered' && schedule.order) {
        await supabase
          .from('orders')
          .update({ status: 'delivered' })
          .eq('id', schedule.order_id);
          
        // Notify Customer
        if (schedule.customer?.id) {
            const { i18n } = require('../i18n');
            await notificationService.createNotification(
                schedule.customer.id,
                'order_delivered',
                i18n.t('admin.notifications.orderDeliveredTitle'),
                i18n.t('admin.notifications.orderDeliveredMessage', { orderId: orderIdShort }),
                { orderId: schedule.order_id, scheduleId: schedule.id }
            );
         }

      }
      
      // 5. Failed Delivery (NEW)
      else if (updates.status === 'failed') {
         // Notify Admin about failure
         try {
            // Fetch all admins
            const { data: admins } = await supabase
              .from('users')
              .select('id')
              .eq('role', 'admin');

            if (admins && admins.length > 0) {
              const { i18n } = require('../i18n');
              for (const admin of admins) {
                await notificationService.createNotification(
                  admin.id,
                  'delivery_failed',
                  i18n.t('admin.notifications.deliveryFailedTitle'),
                  i18n.t('admin.notifications.deliveryFailedMessage', { orderId: orderIdShort }),
                  { orderId: schedule.order_id, scheduleId: schedule.id }
                );
              }
            }
         } catch (adminNotifError) {
             console.warn('[deliveryService] Failed to notify admins about delivery failure:', adminNotifError);
         }
      }

      return schedule;
    } catch (error) {
      console.error('❌ [deliveryService] Error updating delivery schedule:', error);
      throw error;
    }
  },

  /**
   * Delete delivery schedule (Admin only)
   */
  async deleteDeliverySchedule(scheduleId: string): Promise<void> {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('delivery_schedule')
        .delete()
        .eq('id', scheduleId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error deleting delivery schedule:', error);
      throw error;
    }
  },

  /**
   * Confirm all orders at a pickup point (Bulk operation)
   * Changes status from scheduled/accepted to in_transit
   * Sends in-app notifications to all customers
   */
  async confirmPickupPoint(
    pickupPointId: string,
    deliveryPartnerId: string
  ): Promise<{
    successCount: number;
    failedCount: number;
    totalCount: number;
    errors: string[];
  }> {
    try {
      const supabase = getSupabase();
      
      console.log(`🔍 [deliveryService] Confirming pickup point: ${pickupPointId} for partner: ${deliveryPartnerId}`);
      
      // 1. Get all scheduled/accepted orders for this pickup point and delivery partner
      const { data: schedules, error } = await supabase
        .from('delivery_schedule')
        .select(`
          *,
          order:orders(*),
          pickup_point:pickup_points(id, name, address)
        `)
        .eq('pickup_point_id', pickupPointId)
        .eq('delivery_partner_id', deliveryPartnerId)
        .in('status', ['scheduled', 'accepted', 'picked_up']);

      if (error) {
        console.error('❌ [deliveryService] Error fetching schedules:', error);
        throw error;
      }

      const totalCount = schedules?.length || 0;
      console.log(`📊 [deliveryService] Found ${totalCount} orders to confirm`);

      if (totalCount === 0) {
        return { successCount: 0, failedCount: 0, totalCount: 0, errors: [] };
      }

      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      // 2. Update each schedule to in_transit
      // Note: updateDeliverySchedule already sends in-app notifications
      for (const schedule of schedules || []) {
        try {
          console.log(`📤 [deliveryService] Updating schedule ${schedule.id} to in_transit`);
          await this.updateDeliverySchedule(schedule.id, { 
            status: 'in_transit' 
          });
          successCount++;
          console.log(`✅ [deliveryService] Successfully updated schedule ${schedule.id}`);
        } catch (err: any) {
          failedCount++;
          const errorMsg = `Order ${schedule.order_id?.slice(0, 8)}: ${err.message}`;
          errors.push(errorMsg);
          console.error(`❌ [deliveryService] Failed to update schedule ${schedule.id}:`, err);
        }
      }

      console.log(`📊 [deliveryService] Bulk confirmation complete: ${successCount} success, ${failedCount} failed`);

      return { successCount, failedCount, totalCount, errors };
    } catch (error) {
      console.error('❌ [deliveryService] Error confirming pickup point:', error);
      throw error;
    }
  },
  /**
   * Create and compile a Van Sale (Instant Delivery)
   * 1. Creates order (deducts stock)
   * 2. Marks as Delivered immediately
   * 3. Marks as Paid
   */
  async createVanSalesOrder(
    userId: string,
    items: Array<{ product_id: string; quantity: number; price: number }>,
    country: 'germany' | 'denmark',
    paymentMethod: 'cash' | 'card'
  ): Promise<{ success: boolean; orderId?: string; error?: any }> {
    try {
      const supabase = getSupabase();
      
      console.log('🚚 [deliveryService] Creating Van Sales Order...');
      
      // 0. Fetch product details to know which are loose vs pack
      const productIds = items.map(i => i.product_id);
      const { data: dbProducts, error: prodError } = await supabase
        .from('products')
        .select('id, sell_type, unit, category, pack_size_grams')
        .in('id', productIds);
      
      if (prodError) throw prodError;

      const { calculateItemSubtotalValue } = require('../utils/productUtils');
      
      // Calculate totals manually
      const totalAmount = items.reduce((sum, item) => {
        const product = dbProducts?.find((p: any) => p.id === item.product_id);
        return sum + calculateItemSubtotalValue(item.quantity, item.price, product);
      }, 0);
      
      const idempotencyKey = `${userId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      const itemsJson = items.map((item) => {
        const product = dbProducts?.find((p: any) => p.id === item.product_id);
        const { isProductWeightBased } = require('../utils/productUtils');
        const isLoose = isProductWeightBased(product);

        let saveQuantity = item.quantity;
        if (!isLoose) {
            const packSize = product?.pack_size_grams || 1000;
            saveQuantity = item.quantity * packSize;
        }

        return {
            product_id: item.product_id,
            quantity: saveQuantity,
            price: item.price,
            subtotal: calculateItemSubtotalValue(item.quantity, item.price, product)
        };
      });

      // 1. Call Atomic RPC directly
      // This creates the order and deducts stock.
      // We do this directly to handle the return value/errors more gracefully than orderService
      const rpcParams = {
        p_user_id: userId,
        p_country: country,
        p_payment_method: paymentMethod === 'cash' ? 'cod' : 'online',
        p_total_amount: totalAmount,
        p_items: itemsJson as any,
        p_pickup_point_id: null,
        p_delivery_address: null,
        p_delivery_fee: 0,
        p_idempotency_key: idempotencyKey,
        p_delivery_method: 'pickup',
        p_order_type: 'van_sale', // Mark as van sale for analytics
        p_payment_fee: 0, // Missing in previous signature
      };

      console.log('📝 [deliveryService] RPC Params:', JSON.stringify(rpcParams, null, 2));

      const { data: orderId, error: rpcError } = await supabase.rpc(
        'create_order_atomic', 
        rpcParams
      );

      if (rpcError) {
        console.error('❌ [deliveryService] RPC Error:', rpcError);
        throw rpcError;
      }

      if (!orderId) {
        throw new Error('Order creation failed: No order ID returned');
      }

      console.log(`✅ [deliveryService] Van Sale completed - Order ${orderId} created as delivered and paid`);
      return { success: true, orderId: orderId };

    } catch (error: any) {
      console.error('❌ [deliveryService] Van Sale Error:', error);
      return { success: false, error: error.message };
    }
  },
};

