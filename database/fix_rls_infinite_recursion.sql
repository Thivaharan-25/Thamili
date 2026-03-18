-- ============================================
-- Fix RLS Infinite Recursion for Users Table
-- ============================================
-- Problem: is_admin() function queries users table, which triggers RLS,
-- which calls is_admin() again, causing infinite recursion.
-- 
-- Solution: Fix is_admin() to properly bypass RLS
-- ============================================

-- Drop existing policies that use is_admin() for users table
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;

-- Drop and recreate is_admin() function with proper RLS bypass
DROP FUNCTION IF EXISTS is_admin();

-- Create improved is_admin() function that properly bypasses RLS
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Use SECURITY DEFINER to bypass RLS
  -- Query users table directly without RLS checks
  SELECT role INTO user_role
  FROM users
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

-- Alternative: Use auth.jwt() to get role from JWT token (if available)
-- This avoids querying the users table entirely
CREATE OR REPLACE FUNCTION is_admin_from_jwt()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- Try to get role from JWT claims first (if set)
  -- This is faster and doesn't query the database
  RETURN COALESCE(
    (auth.jwt() ->> 'user_role')::text = 'admin',
    false
  );
END;
$$;

-- Recreate policies for users table
-- Note: We'll use a simpler approach that doesn't cause recursion

-- Users can read their own profile (this should work fine)
-- (Already exists, but keeping for reference)
-- CREATE POLICY "Users can view own profile"
--   ON users FOR SELECT
--   USING (auth.uid() = id);

-- Admins can view all users (using improved function)
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (is_admin());

-- Admins can update all users
CREATE POLICY "Admins can update all users"
  ON users FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- ALTERNATIVE FIX: Simpler approach
-- ============================================
-- If the above still causes issues, use this simpler approach:
-- Allow users to read their own profile, and admins can read all
-- by checking the role directly in the policy

-- Option 1: Drop is_admin() policies and use direct role check
-- (This requires the user to already have their profile loaded)
-- DROP POLICY IF EXISTS "Admins can view all users" ON users;
-- CREATE POLICY "Admins can view all users"
--   ON users FOR SELECT
--   USING (
--     EXISTS (
--       SELECT 1 FROM users u
--       WHERE u.id = auth.uid() AND u.role = 'admin'
--     )
--   );

-- ============================================
-- RECOMMENDED FIX: Use a materialized approach
-- ============================================
-- The best solution is to ensure is_admin() doesn't trigger RLS
-- by using SECURITY DEFINER properly

-- Verify the fix worked
-- SELECT is_admin(); -- Should return true/false without recursion error

-- ============================================
-- TESTING
-- ============================================
-- After running this script:
-- 1. Try to login as admin
-- 2. Check if profile fetch works (no 500 error)
-- 3. Verify role is detected correctly

-- ============================================
-- END OF FIX
-- ============================================

