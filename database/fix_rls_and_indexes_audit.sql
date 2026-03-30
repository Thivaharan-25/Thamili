-- ============================================================
-- RLS & Index Audit Fixes
-- Covers 6 issues found in live schema audit
-- Run this in Supabase SQL Editor
-- ============================================================


-- ============================================================
-- ISSUE 1: user_delete_audit has RLS completely OFF
-- Risk: any authenticated user can read/write audit records
-- Fix: enable RLS + add admin-only + service_role policies
-- ============================================================

ALTER TABLE user_delete_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view who was deleted and by whom
CREATE POLICY "Admins can view delete audit"
  ON user_delete_audit FOR SELECT
  TO authenticated
  USING (check_user_role(auth.uid(), 'admin'));

-- Admins can insert audit records manually if needed
CREATE POLICY "Admins can insert delete audit"
  ON user_delete_audit FOR INSERT
  TO authenticated
  WITH CHECK (check_user_role(auth.uid(), 'admin'));

-- Service role can insert (used by server-side delete functions)
CREATE POLICY "Service role can insert delete audit"
  ON user_delete_audit FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Audit records must never be modified or deleted
-- (no UPDATE or DELETE policies intentionally)


-- ============================================================
-- ISSUE 2: Missing composite index on orders(user_id, created_at)
-- The "get my recent orders" query uses both columns.
-- Separate indexes on each column force two index scans.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_orders_user_id_created_at
  ON orders(user_id, created_at DESC);


-- ============================================================
-- ISSUE 3: "Admins can manage users" policy uses JWT claim
-- auth.jwt() ->> 'user_role' only works if the custom claim
-- is set at token generation time — it silently fails otherwise.
-- All other admin checks use check_user_role() — align this one.
-- ============================================================

DROP POLICY IF EXISTS "Admins can manage users" ON users;

CREATE POLICY "Admins can manage users"
  ON users FOR ALL
  TO authenticated
  USING (check_user_role(auth.uid(), 'admin'))
  WITH CHECK (check_user_role(auth.uid(), 'admin'));


-- ============================================================
-- ISSUE 4a: Duplicate SELECT + UPDATE policies on notifications
-- PostgreSQL evaluates all matching policies with OR logic —
-- duplicates don't break anything but make audits confusing.
-- Keep: notifications_select_own, notifications_update_own
--       (these have proper with_check clauses)
-- Drop: older duplicates that lack with_check
-- ============================================================

DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON notifications;


-- ============================================================
-- ISSUE 4b: delivery_schedule has 3 redundant SELECT policies
-- delivery_schedule_base_policy already covers:
--   - delivery partners (delivery_partner_id = auth.uid())
--   - admins (check_user_role)
--   - customers (via orders join)
-- The three policies below are fully redundant.
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all delivery schedules" ON delivery_schedule;
DROP POLICY IF EXISTS "Users can view own delivery schedule" ON delivery_schedule;
DROP POLICY IF EXISTS "delivery_partner_select" ON delivery_schedule;


-- ============================================================
-- ISSUE 4c: products has an ALL policy + 3 redundant policies
-- "Admins can update products" is set to ALL (not just UPDATE),
-- so it already covers SELECT, INSERT, UPDATE, DELETE for admins.
-- The three separate policies below are fully redundant.
-- ============================================================

DROP POLICY IF EXISTS "Admins can delete products" ON products;
DROP POLICY IF EXISTS "Admins can insert products" ON products;
DROP POLICY IF EXISTS "Admins can view all products" ON products;


-- ============================================================
-- ISSUE 4d: orders + order_items have redundant admin SELECT
-- orders_base_policy and order_items_base_policy already include
-- check_user_role(auth.uid(), 'admin') in their quals.
-- The separate admin SELECT policies are fully redundant.
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
DROP POLICY IF EXISTS "Admins can view all order items" ON order_items;


-- ============================================================
-- ISSUE 5: pickup_points SELECT is {authenticated} not {public}
-- Policy is named "anyone_view_pickup_points" but only works
-- for logged-in users. This is CORRECT behaviour for this app
-- (users must be logged in to reach checkout/pickup selection).
-- No SQL change needed — renamed comment only for clarity.
-- ============================================================

-- No change. Behaviour is intentional.
-- If guest browsing is ever added, change {authenticated} → {public}.


-- ============================================================
-- ISSUE 6: Missing partial index for unread notification queries
-- The badge count query filters WHERE user_id = ? AND read = false.
-- Without this index it scans all notifications for the user.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, read)
  WHERE read = false;


-- ============================================================
-- VERIFICATION QUERIES
-- Run these after applying the migration to confirm all changes.
-- ============================================================

-- 1. Confirm RLS is now ON for user_delete_audit
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public' AND tablename = 'user_delete_audit';
-- Expected: rowsecurity = true

-- 2. Confirm new indexes exist
-- SELECT indexname FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND indexname IN (
--     'idx_orders_user_id_created_at',
--     'idx_notifications_user_unread'
--   );

-- 3. Confirm JWT policy is gone and new one exists on users table
-- SELECT policyname, cmd, qual FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'users'
-- ORDER BY policyname;

-- 4. Confirm dropped duplicate policies are gone
-- SELECT tablename, policyname FROM pg_policies
-- WHERE schemaname = 'public'
--   AND policyname IN (
--     'Users can view their notifications',
--     'Users can update their notifications',
--     'Admins can view all delivery schedules',
--     'Users can view own delivery schedule',
--     'delivery_partner_select',
--     'Admins can delete products',
--     'Admins can insert products',
--     'Admins can view all products',
--     'Admins can view all orders',
--     'Admins can view all order items'
--   );
-- Expected: 0 rows
