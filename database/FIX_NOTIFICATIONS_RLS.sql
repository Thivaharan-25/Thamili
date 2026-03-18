-- =====================================================
-- FIX NOTIFICATIONS RLS POLICIES
-- =====================================================
-- Run this in your Supabase SQL Editor

-- 1. Ensure helper function exists
CREATE OR REPLACE FUNCTION public.is_user_role(p_user_id uuid, p_role text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = p_user_id AND role = p_role
  );
END;
$$;

-- 2. Drop existing policies to avoid "already exists" errors
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Service can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Allowed users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

-- 3. Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies

-- Policy 1: Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- Policy 2: Allow service role to insert (unrestricted)
CREATE POLICY "Service can insert notifications"
  ON notifications FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy 3: Allow partners, admins, and self to insert
-- This allows partners to create notifications for customers
CREATE POLICY "Allowed users can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() 
    OR is_user_role(auth.uid(), 'admin')
    OR is_user_role(auth.uid(), 'delivery_partner')
  );

-- Policy 4: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
