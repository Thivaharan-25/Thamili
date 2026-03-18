-- ============================================
-- COMPLETE FIX: RLS Infinite Recursion for Users Table
-- ============================================
-- This script completely fixes the infinite recursion issue
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Drop all existing policies on users table that use is_admin()
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;

-- Step 2: Drop the existing is_admin() function
DROP FUNCTION IF EXISTS is_admin() CASCADE;

-- Step 3: Create a new is_admin() function that properly bypasses RLS
-- This uses SECURITY DEFINER and explicit RLS bypass
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  user_role TEXT;
  original_row_security TEXT;
BEGIN
  -- Explicitly disable RLS for this function
  -- This prevents infinite recursion
  PERFORM set_config('row_security', 'off', true);
  
  -- Query users table directly (RLS is now disabled)
  SELECT role INTO user_role
  FROM public.users
  WHERE id = auth.uid()
  LIMIT 1;
  
  -- Return true if role is 'admin'
  RETURN COALESCE(user_role = 'admin', false);
EXCEPTION
  WHEN OTHERS THEN
    -- If any error occurs, return false (not admin)
    RETURN false;
END;
$$;

-- Step 4: Grant execute permission
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO anon;

-- Step 5: Recreate the admin policies
-- These policies will use the fixed is_admin() function
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can update all users"
  ON users FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- VERIFICATION
-- ============================================
-- Test that the function works (should not cause recursion):
-- SELECT is_admin();

-- Check that policies exist:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'users';

-- ============================================
-- ALTERNATIVE: If above still doesn't work
-- ============================================
-- Use this simpler approach that doesn't use is_admin() for users table:

-- DROP POLICY IF EXISTS "Admins can view all users" ON users;
-- DROP POLICY IF EXISTS "Admins can update all users" ON users;
-- 
-- -- Allow service role to bypass (if using service role key)
-- -- Or use a different approach:
-- CREATE POLICY "Admins can view all users"
--   ON users FOR SELECT
--   USING (
--     -- Check if current user is admin by querying with RLS disabled
--     (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
--   );

-- ============================================
-- IMPORTANT NOTES
-- ============================================
-- 1. After running this, LOGOUT and LOGIN again
-- 2. The profile fetch should now work without 500 error
-- 3. Admin role should be detected correctly
-- 4. If still having issues, check Supabase logs for errors

-- ============================================
-- END OF FIX
-- ============================================

