-- =====================================================
-- RLS Policies Fix for Notifications and Delivery Schedule
-- =====================================================
-- This migration adds the necessary RLS policies to allow:
-- 1. System to create notifications for users
-- 2. Users to view and update their own notifications
-- 3. Delivery partners and admins to access delivery schedules
-- =====================================================

-- =====================================================
-- NOTIFICATIONS TABLE RLS POLICIES
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can manage all notifications" ON notifications;

-- Allow authenticated users to create notifications (for system operations)
CREATE POLICY "System can create notifications"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to view their own notifications
CREATE POLICY "Users can view their notifications"
ON notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Allow users to update their own notifications (e.g., mark as read)
CREATE POLICY "Users can update their notifications"
ON notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Allow admins to manage all notifications
CREATE POLICY "Admins can manage all notifications"
ON notifications FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- =====================================================
-- DELIVERY_SCHEDULE TABLE RLS POLICIES
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Delivery partners can view their schedules" ON delivery_schedule;
DROP POLICY IF EXISTS "Delivery partners can update their schedules" ON delivery_schedule;
DROP POLICY IF EXISTS "Admins can manage all schedules" ON delivery_schedule;
DROP POLICY IF EXISTS "System can create schedules" ON delivery_schedule;

-- Allow delivery partners to view their assigned schedules
CREATE POLICY "Delivery partners can view their schedules"
ON delivery_schedule FOR SELECT
TO authenticated
USING (
  delivery_partner_id IN (
    SELECT id FROM users WHERE id = auth.uid() AND role = 'delivery'
  )
  OR
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Allow delivery partners to update their own schedules
CREATE POLICY "Delivery partners can update their schedules"
ON delivery_schedule FOR UPDATE
TO authenticated
USING (
  delivery_partner_id IN (
    SELECT id FROM users WHERE id = auth.uid() AND role = 'delivery'
  )
  OR
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Allow admins to manage all schedules
CREATE POLICY "Admins can manage all schedules"
ON delivery_schedule FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Allow system to create delivery schedules
CREATE POLICY "System can create schedules"
ON delivery_schedule FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role IN ('admin', 'delivery')
  )
);

-- =====================================================
-- WHATSAPP_NOTIFICATIONS TABLE RLS POLICIES
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "System can create whatsapp notifications" ON whatsapp_notifications;
DROP POLICY IF EXISTS "Admins can view all whatsapp notifications" ON whatsapp_notifications;

-- Allow system to create WhatsApp notifications
CREATE POLICY "System can create whatsapp notifications"
ON whatsapp_notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow admins to view all WhatsApp notifications
CREATE POLICY "Admins can view all whatsapp notifications"
ON whatsapp_notifications FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- =====================================================
-- NOTIFICATION_TEMPLATES TABLE RLS POLICIES
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Everyone can view notification templates" ON notification_templates;
DROP POLICY IF EXISTS "Admins can manage notification templates" ON notification_templates;

-- Allow all authenticated users to view notification templates
CREATE POLICY "Everyone can view notification templates"
ON notification_templates FOR SELECT
TO authenticated
USING (active = true);

-- Allow admins to manage notification templates
CREATE POLICY "Admins can manage notification templates"
ON notification_templates FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  )
);
