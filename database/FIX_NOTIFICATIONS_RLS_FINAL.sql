-- ============================================================
-- FIX: Notifications & Push Tokens RLS Policies (FINAL)
-- Run this in: Supabase Dashboard → SQL Editor → Run
-- 
-- Problem: INSERT on notifications table was blocked (error 42501)
-- because migration_notifications_v1.sql only added SELECT/UPDATE
-- policies but no INSERT policy for authenticated users.
-- ============================================================

-- ─── HELPER FUNCTION ────────────────────────────────────────
-- SECURITY DEFINER so it bypasses RLS when checking roles,
-- preventing infinite recursion on the users table.
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM public.users WHERE id = p_user_id;
  RETURN v_role;
END;
$$;

-- ─── NOTIFICATIONS TABLE ────────────────────────────────────

-- Drop ALL existing notification policies to start clean
DROP POLICY IF EXISTS "Users can view their own notifications"            ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications"                  ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications"          ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications"                ON public.notifications;
DROP POLICY IF EXISTS "Service can insert notifications"                  ON public.notifications;
DROP POLICY IF EXISTS "Allowed users can insert notifications"            ON public.notifications;
DROP POLICY IF EXISTS "Authenticated can insert notifications"            ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications"                   ON public.notifications;
DROP POLICY IF EXISTS "Users can create notifications for self or admins" ON public.notifications;
DROP POLICY IF EXISTS "Enable notification creation for delivery partners" ON public.notifications;

-- Ensure RLS is enabled
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ── Policy 1: SELECT — users read only their own notifications
CREATE POLICY "notifications_select_own"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- ── Policy 2: INSERT — authenticated users can create notifications when:
--   a) notifying themselves (order confirmation for the customer)
--   b) notifying an admin (customer → admin new-order alert)
--   c) notifying a delivery partner (admin/system → partner task)
--   d) they are an admin (admin can notify anyone)
--   e) they are a delivery partner (partner can notify customers)
CREATE POLICY "notifications_insert_authenticated"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Always allow notifying yourself
    auth.uid() = user_id
    -- Allow notifying admins (customer placing order notifies admins)
    OR get_user_role(user_id) = 'admin'
    -- Allow notifying delivery partners
    OR get_user_role(user_id) = 'delivery_partner'
    -- Admins can notify anyone
    OR get_user_role(auth.uid()) = 'admin'
    -- Delivery partners can notify customers (e.g. bulk pickup point alerts)
    OR get_user_role(auth.uid()) = 'delivery_partner'
  );

-- ── Policy 3: Service role can insert without restriction (Vercel API)
CREATE POLICY "notifications_insert_service_role"
  ON public.notifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ── Policy 4: UPDATE — users can only mark their own notifications as read
CREATE POLICY "notifications_update_own"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Policy 5: DELETE — users can delete their own notifications (optional cleanup)
CREATE POLICY "notifications_delete_own"
  ON public.notifications
  FOR DELETE
  USING (auth.uid() = user_id);


-- ─── USER_PUSH_TOKENS TABLE ─────────────────────────────────

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage own push tokens"      ON public.user_push_tokens;
DROP POLICY IF EXISTS "Users can insert own push tokens"      ON public.user_push_tokens;
DROP POLICY IF EXISTS "Users can view own push tokens"        ON public.user_push_tokens;
DROP POLICY IF EXISTS "Users can delete own push tokens"      ON public.user_push_tokens;
DROP POLICY IF EXISTS "Service role can read all push tokens" ON public.user_push_tokens;

-- Ensure RLS is enabled
ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Users manage their own tokens
CREATE POLICY "push_tokens_select_own"
  ON public.user_push_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "push_tokens_insert_own"
  ON public.user_push_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_tokens_update_own"
  ON public.user_push_tokens
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "push_tokens_delete_own"
  ON public.user_push_tokens
  FOR DELETE
  USING (auth.uid() = user_id);

-- Service role (Vercel send-push API) can read all tokens to send notifications
CREATE POLICY "push_tokens_service_role_select"
  ON public.user_push_tokens
  FOR SELECT
  TO service_role
  USING (true);


-- ─── NOTIFICATION PREFERENCES TABLE ─────────────────────────

DROP POLICY IF EXISTS "Users can manage their own preferences" ON public.notification_preferences;

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_prefs_all_own"
  ON public.notification_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ─── VERIFY ─────────────────────────────────────────────────
-- Run this query after applying to confirm policies are in place:
-- SELECT schemaname, tablename, policyname, cmd
-- FROM pg_policies
-- WHERE tablename IN ('notifications', 'user_push_tokens', 'notification_preferences')
-- ORDER BY tablename, cmd;
