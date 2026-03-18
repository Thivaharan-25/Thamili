-- ============================================
-- Migration: Fix is_admin() function to properly bypass RLS
-- ============================================
-- This script updates the is_admin() function to disable RLS
-- during its execution to prevent infinite recursion
-- ============================================

-- Drop and recreate the function with RLS bypass
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Temporarily disable RLS for this query to prevent recursion
  SET LOCAL row_security = off;
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- ============================================
-- Verification:
-- ============================================
-- Test the function (replace with your actual user ID):
-- SELECT is_admin();
-- 
-- Check function definition:
-- SELECT pg_get_functiondef('is_admin()'::regproc);

-- ============================================
-- END OF MIGRATION
-- ============================================

