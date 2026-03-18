-- ============================================================
-- DEFINITIVE FIX: Create Notifications via Security Definer RPC
-- 
-- WHY: RLS INSERT policies keep failing because auth.uid() context
-- is unreliable when called through the client-side Supabase proxy.
-- A SECURITY DEFINER function runs as the DB owner, bypassing RLS
-- entirely — this is the correct pattern for cross-user notifications.
--
-- Run this in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ─── 1. CREATE NOTIFICATION RPC (SECURITY DEFINER) ──────────
-- This function bypasses RLS and can insert notifications for any user.
-- It validates the caller is authenticated before proceeding.
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id    uuid,
  p_type       text,
  p_title      text,
  p_message    text,
  p_data       jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id uuid;
  v_caller_role     text;
BEGIN
  -- Ensure the caller is authenticated (not anon)
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Optional: verify caller is allowed to notify this user
  -- Allow if: notifying self, notifying admin, or caller is admin/delivery_partner
  SELECT role INTO v_caller_role FROM public.users WHERE id = auth.uid();

  IF auth.uid() != p_user_id THEN
    -- Only admins and delivery_partners can notify other users
    IF v_caller_role NOT IN ('admin', 'delivery_partner') THEN
      -- Also allow customers to notify admins
      DECLARE
        v_target_role text;
      BEGIN
        SELECT role INTO v_target_role FROM public.users WHERE id = p_user_id;
        IF v_target_role NOT IN ('admin', 'delivery_partner') THEN
          RAISE EXCEPTION 'Not authorized to create notification for this user';
        END IF;
      END;
    END IF;
  END IF;

  -- Insert the notification
  INSERT INTO public.notifications (user_id, type, title, message, data, read, created_at)
  VALUES (p_user_id, p_type, p_title, p_message, p_data, false, now())
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, jsonb) TO authenticated;

-- ─── 2. CLEAN UP OLD CONFLICTING INSERT POLICIES ────────────
-- Keep only the clean ones from our last migration + add a simple fallback
DROP POLICY IF EXISTS "System can create notifications"                   ON public.notifications;
DROP POLICY IF EXISTS "Users can insert notifications"                    ON public.notifications;
DROP POLICY IF EXISTS "Users can create notifications for self or admins" ON public.notifications;
DROP POLICY IF EXISTS "Enable notification creation for delivery partners" ON public.notifications;
DROP POLICY IF EXISTS "Admins can manage all notifications"               ON public.notifications;
DROP POLICY IF EXISTS "Allowed users can insert notifications"            ON public.notifications;
DROP POLICY IF EXISTS "Authenticated can insert notifications"            ON public.notifications;
DROP POLICY IF EXISTS "Service can insert notifications"                  ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_authenticated"                ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_service_role"                 ON public.notifications;

-- ─── 3. ADD SIMPLE CLEAN INSERT POLICIES ────────────────────
-- Policy A: Users can always insert for themselves
CREATE POLICY "notifications_insert_self"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy B: Service role (Vercel API) can insert for anyone
CREATE POLICY "notifications_insert_service_role"
  ON public.notifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ─── 4. VERIFY ──────────────────────────────────────────────
-- Run this after to confirm:
-- SELECT proname, prosecdef FROM pg_proc WHERE proname = 'create_notification';
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'notifications' ORDER BY cmd;
