-- =====================================================
-- Seed Notification Templates
-- =====================================================
-- This script populates the notification_templates table
-- with common templates for order notifications
-- =====================================================

-- Clear existing templates (optional - remove if you want to keep existing ones)
-- DELETE FROM notification_templates;

-- Order Confirmation Template
INSERT INTO notification_templates (name, type, title_template, message_template, variables, active)
VALUES (
  'order_confirmation',
  'order',
  'Order Confirmed - {{orderNumber}}',
  'Hi {{customerName}}! Your order {{orderNumber}} has been confirmed. Total: {{total}}. Estimated delivery: {{deliveryDate}}.',
  ARRAY['orderNumber', 'customerName', 'total', 'deliveryDate'],
  true
)
ON CONFLICT (name) DO UPDATE SET
  title_template = EXCLUDED.title_template,
  message_template = EXCLUDED.message_template,
  variables = EXCLUDED.variables,
  active = EXCLUDED.active;

-- Order Out for Delivery Template
INSERT INTO notification_templates (name, type, title_template, message_template, variables, active)
VALUES (
  'order_out_for_delivery',
  'order',
  'Order {{orderNumber}} is Out for Delivery',
  'VanaAkam! Order {{orderNumber}} is out for delivery and will arrive soon. Track your order in the app.',
  ARRAY['orderNumber'],
  true
)
ON CONFLICT (name) DO UPDATE SET
  title_template = EXCLUDED.title_template,
  message_template = EXCLUDED.message_template,
  variables = EXCLUDED.variables,
  active = EXCLUDED.active;

-- Order Delivered Template
INSERT INTO notification_templates (name, type, title_template, message_template, variables, active)
VALUES (
  'order_delivered',
  'order',
  'Order {{orderNumber}} Delivered',
  'Your order {{orderNumber}} has been delivered successfully! Thank you for choosing Thamili. Enjoy your fresh products!',
  ARRAY['orderNumber'],
  true
)
ON CONFLICT (name) DO UPDATE SET
  title_template = EXCLUDED.title_template,
  message_template = EXCLUDED.message_template,
  variables = EXCLUDED.variables,
  active = EXCLUDED.active;

-- Order Cancelled Template
INSERT INTO notification_templates (name, type, title_template, message_template, variables, active)
VALUES (
  'order_cancelled',
  'order',
  'Order {{orderNumber}} Cancelled',
  'Your order {{orderNumber}} has been cancelled. If you have any questions, please contact our support team.',
  ARRAY['orderNumber'],
  true
)
ON CONFLICT (name) DO UPDATE SET
  title_template = EXCLUDED.title_template,
  message_template = EXCLUDED.message_template,
  variables = EXCLUDED.variables,
  active = EXCLUDED.active;

-- Payment Confirmation Template
INSERT INTO notification_templates (name, type, title_template, message_template, variables, active)
VALUES (
  'payment_confirmed',
  'payment',
  'Payment Received - {{orderNumber}}',
  'Payment of {{amount}} for order {{orderNumber}} has been received successfully. Thank you!',
  ARRAY['orderNumber', 'amount'],
  true
)
ON CONFLICT (name) DO UPDATE SET
  title_template = EXCLUDED.title_template,
  message_template = EXCLUDED.message_template,
  variables = EXCLUDED.variables,
  active = EXCLUDED.active;

-- Delivery Assignment Template (for delivery partners)
INSERT INTO notification_templates (name, type, title_template, message_template, variables, active)
VALUES (
  'delivery_assigned',
  'delivery',
  'New Delivery Assignment',
  'You have been assigned to deliver order {{orderNumber}}. Pickup from {{pickupPoint}} by {{pickupTime}}.',
  ARRAY['orderNumber', 'pickupPoint', 'pickupTime'],
  true
)
ON CONFLICT (name) DO UPDATE SET
  title_template = EXCLUDED.title_template,
  message_template = EXCLUDED.message_template,
  variables = EXCLUDED.variables,
  active = EXCLUDED.active;

-- Generic Order Status Update Template
INSERT INTO notification_templates (name, type, title_template, message_template, variables, active)
VALUES (
  'order_status_update',
  'order',
  'Order {{orderNumber}} Status Update',
  'Your order {{orderNumber}} status has been updated to: {{status}}',
  ARRAY['orderNumber', 'status'],
  true
)
ON CONFLICT (name) DO UPDATE SET
  title_template = EXCLUDED.title_template,
  message_template = EXCLUDED.message_template,
  variables = EXCLUDED.variables,
  active = EXCLUDED.active;
