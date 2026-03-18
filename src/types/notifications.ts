export type NotificationType = 'order' | 'delivery' | 'order_confirmed' | 'order_shipped' | 'order_delivered' | 'payment_received' | 'general' | 'stock_alert' | 'task_assigned' | 'ready_for_pickup' | 'delivery_failed' | 'order_canceled' | 'task_cancelled';

export type NotificationStatus = 'sent' | 'delivered' | 'failed' | 'pending';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  created_at: string;
  read_at?: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  title_template: string;
  message_template: string;
  variables: string[];
  active: boolean;
  created_at: string;
}

export interface NotificationPreferences {
  user_id: string;
  push_enabled: boolean;
  order_notifications: boolean;
  delivery_notifications: boolean;
  payment_notifications: boolean;
  general_notifications: boolean;
  updated_at: string;
}

