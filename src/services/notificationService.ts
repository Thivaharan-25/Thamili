import {
  Notification,
  NotificationTemplate,
  NotificationPreferences,
} from '../types/notifications';
import { ENV } from '../config/env';
import { checkRateLimit } from '../utils/rateLimiter';

// Import Supabase lazily - only when needed
function getSupabase() {
  return require('./supabase').supabase;
}

export const notificationService = {
  /**
   * Get all notifications for a user
   */
  async getNotifications(userId: string): Promise<Notification[]> {
    checkRateLimit('notification');
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error: any) {
      // Handle "table not found" error
      if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        console.warn('⚠️ [notificationService] The "notifications" table does not exist in Supabase. Returning empty array.');
        console.info('💡 Please run the migration database/migration_notifications_v1.sql in your Supabase SQL Editor.');
        return [];
      }
      console.error('❌ [notificationService] Error fetching notifications:', error);
      return []; // Return empty array on error instead of throwing to prevent component crashes
    }
  },

  /**
   * Get count of unread notifications for a user
   * Used for the login digest push
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const supabase = getSupabase();
      const { count, error } = await (supabase
        .from('notifications') as any)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        // Silently handle missing table
        if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
          return 0;
        }
        console.warn('⚠️ [notificationService] Error getting unread count:', error.message);
        return 0;
      }

      return count || 0;
    } catch (error: any) {
      console.warn('⚠️ [notificationService] getUnreadCount failed:', error?.message);
      return 0;
    }
  },

  /**
   * Send a digest push notification for unread notifications on login.
   * Rules:
   *  - Only fires if unread count is between 1 and 50 (avoids spam for neglected accounts).
   *  - Throttled to once per hour per user via AsyncStorage timestamp.
   */
  async sendLoginDigestPush(userId: string): Promise<void> {
    try {
      // --- Throttle: max once per hour per user ---
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const throttleKey = `digest_push_last_sent_${userId}`;
      const lastSentRaw = await AsyncStorage.getItem(throttleKey);
      if (lastSentRaw) {
        const lastSent = parseInt(lastSentRaw, 10);
        const oneHourMs = 60 * 60 * 1000;
        if (Date.now() - lastSent < oneHourMs) {
          console.log('⏳ [notificationService] Digest push throttled — sent within the last hour');
          return;
        }
      }

      const unreadCount = await this.getUnreadCount(userId);

      // Only send if there are between 1–50 unread (skip if zero or overwhelming)
      if (unreadCount <= 0) {
        console.log('✅ [notificationService] No unread notifications for digest push');
        return;
      }
      if (unreadCount > 50) {
        console.log(`⚠️ [notificationService] Skipping digest push — too many unread (${unreadCount}). User should open app.`);
        return;
      }

      const title = `📬 You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`;
      const message = `Tap to view your recent updates from Thamili.`;

      console.log(`🔔 [notificationService] Sending login digest push: ${unreadCount} unread`);
      await this.triggerPushNotification(userId, title, message, { type: 'digest', unreadCount });

      // Record timestamp so we don't spam on next login
      await AsyncStorage.setItem(throttleKey, Date.now().toString());
    } catch (error: any) {
      // Non-critical: digest push failure should never block login
      console.warn('⚠️ [notificationService] Login digest push failed (non-critical):', error?.message);
    }
  },

  /**
   * Trigger a push notification via Vercel Function
   */
  async triggerPushNotification(
    userId: string,
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<void> {
    const url = `${ENV.API_URL}/api/send-push`;
    try {
      // Check if project is in local/dev mode without Vercel configured
      if (!ENV.API_URL || ENV.API_URL.includes('localhost')) {
        console.log('ℹ️ [notificationService] Skipping push in local dev (no Vercel API configured)');
        return;
      }

      console.log(`🚀 [notificationService] Triggering system push for ${userId} at ${url}`);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Authenticate with the Vercel function so only this app can trigger pushes
          ...(ENV.INTERNAL_API_SECRET ? { 'x-internal-secret': ENV.INTERNAL_API_SECRET } : {}),
        },
        body: JSON.stringify({ userId, title, body: message, data }),
      });

      const contentType = response.headers.get("content-type");
      const isJson = contentType && contentType.includes("application/json");

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          if (isJson) {
            const err = await response.json();
            errorMessage = err.error || errorMessage;
          } else {
            const text = await response.text();
            errorMessage = `Server Error (${response.status}) at ${url}: ${text.substring(0, 200)}...`;
          }
        } catch (e) {
          // Fallback if parsing fails
        }
        
        console.warn('⚠️ [notificationService] Push failed:', errorMessage);
        throw new Error(errorMessage);
      } else {
        console.log('✅ [notificationService] Push triggered successfully for', userId);
      }
    } catch (error: any) {
      console.error(`❌ [notificationService] Error calling push API at ${url}:`, error);
      throw error;
    }
  },

  /**
   * Send a test push notification (for admins/testing)
   * This sends a real push notification via the backend API
   * Does NOT save to notifications table (test only)
   * 
   * @throws Error with user-friendly message if prerequisites aren't met
   */
  async sendTestPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<{ success: true; message: string }> {
    try {
      // Validate API URL is configured
      if (!ENV.API_URL || ENV.API_URL.includes('localhost')) {
        throw new Error(
          'Backend API not configured. Please set API_URL in your .env file to your deployed Vercel URL.'
        );
      }

      console.log('🧪 [notificationService] Sending test push notification...');
      console.log(`   User ID: ${userId}`);
      console.log(`   API URL: ${ENV.API_URL}/api/send-push`);

      // Call backend API
      const response = await fetch(`${ENV.API_URL}/api/send-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(ENV.INTERNAL_API_SECRET ? { 'x-internal-secret': ENV.INTERNAL_API_SECRET } : {}),
        },
        body: JSON.stringify({ userId, title, body, data }),
      });

      const contentType = response.headers.get("content-type");
      const isJson = contentType && contentType.includes("application/json");

      if (!response.ok) {
        // Log raw response for debugging if not JSON
        if (!isJson) {
          const text = await response.text();
          console.error('❌ [notificationService] Non-JSON error response from server:', text.substring(0, 500));
          throw new Error(
            `Server returned non-JSON response (${response.status}). This usually means the API route /api/send-push is missing or the server crashed.`
          );
        }

        const result = await response.json();

        // Handle specific error cases with user-friendly messages
        if (response.status === 404) {
          throw new Error(
            'No push token found for this user. Please:\n1. Restart the app to register your device\n2. Ensure you have granted notification permissions'
          );
        } else if (response.status === 500) {
          const errorMsg = result.error || 'Server error';
          if (errorMsg.includes('user_push_tokens')) {
            throw new Error(
              'Database table "user_push_tokens" not found. Please run the migration:\ndatabase/migration_notifications_v1.sql'
            );
          }
          throw new Error(`Server error: ${errorMsg}`);
        } else {
          throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
        }
      }

      // Safe parse for success response too
      if (!isJson) {
        throw new Error("Server returned success but response was not JSON");
      }
      const result = await response.json();

      console.log('✅ [notificationService] Test push sent successfully:', result);

      return {
        success: true,
        message: 'Push notification sent! Check your device (works even when app is closed).',
      };
    } catch (error: any) {
      console.error('❌ [notificationService] Test push failed:', error);

      // Network errors
      if (error.message?.includes('fetch')) {
        throw new Error(
          'Network error. Please check:\n1. Your internet connection\n2. Backend API is deployed and accessible'
        );
      }

      // Re-throw with original message if already user-friendly
      throw error;
    }
  },

  /**
   * Create a notification (Internal use)
   * Uses a SECURITY DEFINER RPC to bypass RLS — this is the correct
   * pattern for cross-user notifications (e.g. customer → admin alerts).
   */
  async createNotification(
    userId: string,
    type: Notification['type'],
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<void> {
    checkRateLimit('notification');
    try {
      const supabase = getSupabase();

      // Use RPC (SECURITY DEFINER) instead of direct INSERT to avoid RLS 42501 errors
      const { data: notificationId, error } = await supabase.rpc('create_notification', {
        p_user_id: userId,
        p_type: type,
        p_title: title,
        p_message: message,
        p_data: data || {},
      });

      if (error) {
        throw error;
      }

      // 🔔 ALSO TRIGGER PUSH NOTIFICATION
      // Check preferences first
      const prefs = await this.getPreferences(userId);
      if (!prefs || prefs.push_enabled) {
        // Map type to preference
        let enabled = true;
        
        const orderTypes: Notification['type'][] = ['order', 'order_confirmed', 'order_shipped', 'order_delivered', 'order_canceled'];
        const deliveryTypes: Notification['type'][] = ['delivery', 'task_assigned', 'ready_for_pickup', 'delivery_failed', 'task_cancelled'];
        const paymentTypes: Notification['type'][] = ['payment_received'];
        const generalTypes: Notification['type'][] = ['general', 'stock_alert'];

        if (orderTypes.includes(type)) enabled = prefs?.order_notifications ?? true;
        else if (deliveryTypes.includes(type)) enabled = prefs?.delivery_notifications ?? true;
        else if (paymentTypes.includes(type)) enabled = prefs?.payment_notifications ?? true;
        else if (generalTypes.includes(type)) enabled = prefs?.general_notifications ?? true;

        if (enabled) {
          // Include notification ID in push payload for tap-to-read functionality
          const pushData = {
            ...data,
            notificationId
          };
          await this.triggerPushNotification(userId, title, message, pushData);
        }
      }
    } catch (error: any) {
      // Handle "table not found" error
      if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        console.warn('⚠️ [notificationService] The "notifications" table does not exist in Supabase. Notification was not saved.');
        return;
      }
      console.error('❌ [notificationService] Error creating notification:', error);
    }
  },

  /**
   * Mark notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('notifications')
        .update({
          read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }
    } catch (error: any) {
      if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        console.warn('⚠️ [notificationService] The "notifications" table does not exist. Cannot mark as read.');
        return;
      }
      console.error('❌ [notificationService] Error marking notification as read:', error);
    }
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('notifications')
        .update({
          read: true,
          read_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        throw error;
      }
    } catch (error: any) {
      if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        console.warn('⚠️ [notificationService] The "notifications" table does not exist. Cannot mark all as read.');
        return;
      }
      console.error('❌ [notificationService] Error marking all notifications as read:', error);
    }
  },

  /**
   * Get notification preferences
   */
  async getPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .limit(1);

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        // No preferences found, return null (caller will handle)
        return null;
      }

      return data[0];
    } catch (error: any) {
      // Handle "table not found" error
      if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        console.warn('⚠️ [notificationService] The "notification_preferences" table does not exist. Returning default preferences.');
        return null; // Caller will handle null as default
      }
      console.error('❌ [notificationService] Error fetching notification preferences:', error);
      return null;
    }
  },

  /**
   * Update notification preferences
   */
  async updatePreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error: any) {
      if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        console.warn('⚠️ [notificationService] The "notification_preferences" table does not exist. Cannot update.');
        return preferences as NotificationPreferences;
      }
      console.error('❌ [notificationService] Error updating notification preferences:', error);
      throw error;
    }
  },

  /**
   * Get all notification templates
   */
  async getTemplates(): Promise<NotificationTemplate[]> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error: any) {
      if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        console.warn('⚠️ [notificationService] The "notification_templates" table does not exist. Returning empty array.');
        return [];
      }
      console.error('❌ [notificationService] Error fetching notification templates:', error);
      return [];
    }
  },

  /**
   * Update notification template
   */
  async updateTemplate(templateId: string, updates: Partial<NotificationTemplate>): Promise<NotificationTemplate> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('notification_templates')
        .update(updates)
        .eq('id', templateId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error: any) {
      if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        console.warn('⚠️ [notificationService] The "notification_templates" table does not exist. Cannot update.');
        return updates as NotificationTemplate;
      }
      console.error('❌ [notificationService] Error updating notification template:', error);
      throw error;
    }
  },

  /**
   * Send bulk in-app notifications to all customers at a pickup point
   */
  async sendBulkNotification(
    pickupPointId: string,
    title: string,
    message: string,
    senderId: string // delivery person ID for logging
  ): Promise<{ successCount: number; recipientCount: number }> {
    checkRateLimit('notification');
    try {
      const supabase = getSupabase();

      // Fetch Active Orders for Pickup Point
      const { data: schedules, error } = await supabase
        .from('delivery_schedule')
        .select(`
          order_id,
          pickup_point_id,
          status,
          order:orders(user_id)
        `)
        .eq('pickup_point_id', pickupPointId)
        .in('status', ['scheduled', 'accepted', 'picked_up', 'in_transit']);

      if (error) throw error;

      if (!schedules || schedules.length === 0) {
        return { successCount: 0, recipientCount: 0 };
      }

      // Extract Unique User IDs
      const userIds = [...new Set(schedules.map((s: any) => s.order?.user_id).filter(Boolean))];

      if (userIds.length === 0) return { successCount: 0, recipientCount: 0 };

      let successCount = 0;

      for (const userId of userIds) {
        const userSchedule = schedules.find((s: any) => s.order?.user_id === userId);
        if (userSchedule) {
          try {
            await this.createNotification(
              userId as string,
              'general',
              title,
              message,
              { orderId: userSchedule.order_id, pickupPointId }
            );
            successCount++;
          } catch (err) {
            console.error(`Failed to send notification to ${userId}:`, err);
          }
        }
      }

      return { successCount, recipientCount: userIds.length };

    } catch (error: any) {
      if (error.code === 'PGRST204' || error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        console.warn('⚠️ [notificationService] Database tables for bulk notifications are missing. Skipping.');
        throw new Error('Database schema for notifications is not setup. Please contact Admin.');
      }
      console.error('❌ [notificationService] Error sending bulk notifications:', error);
      throw error;
    }
  },
};
