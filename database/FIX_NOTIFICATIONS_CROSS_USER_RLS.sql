-- ============================================
-- Fix: Cross-User Notification RLS Policies
-- Description: Updates users and notifications policies to allow 
--             client-side notification triggers across roles.
-- ============================================

-- 1. Update Users Table Policies
-- Allow anyone to see the basic profile info (id, name, role) of Admins and Delivery Partners
-- This is necessary for the client-side code to find who to notify.
DROP POLICY IF EXISTS "Authenticated users can view admin and partner profiles" ON public.users;
CREATE POLICY "Authenticated users can view admin and partner profiles"
  ON public.users FOR SELECT
  USING (
    role IN ('admin', 'delivery_partner')
  );

-- 2. Update Notifications Table Policies
-- Allow creation of notifications if:
-- a) You are notifying yourself
-- b) You are notifying an administrator
DROP POLICY IF EXISTS "Users can create notifications for self or admins" ON public.notifications;
CREATE POLICY "Users can create notifications for self or admins"
  ON public.notifications FOR INSERT
  WITH CHECK (
    auth.uid() = user_id -- Self
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = notifications.user_id AND users.role = 'admin'
    ) -- Admin
  );

-- 3. Add policy for Delivery Partners to be notified
-- Allow staff/admins to create notifications for delivery partners
DROP POLICY IF EXISTS "Enable notification creation for delivery partners" ON public.notifications;
CREATE POLICY "Enable notification creation for delivery partners"
  ON public.notifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = notifications.user_id AND users.role = 'delivery_partner'
    )
  );

-- 4. Ensure everyone can update their own notification (mark as read)
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Ensure everyone can view their own notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);
