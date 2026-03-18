-- ============================================
-- Migration: Fix is_admin() function to properly bypass RLS (Version 2)
-- ============================================
-- This uses a different approach that works better with Supabase/PostgREST
-- ============================================

-- Drop the existing function
DROP FUNCTION IF EXISTS is_admin();

-- Create a new function that uses a different approach
-- This function will be called with SECURITY DEFINER and will bypass RLS
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Use a direct query with explicit RLS bypass
  -- SECURITY DEFINER functions run with the privileges of the function owner
  -- which should bypass RLS, but we'll be explicit
  SELECT role INTO user_role
  FROM users
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN COALESCE(user_role = 'admin', false);
EXCEPTION
  WHEN OTHERS THEN
    -- If there's any error, return false
    RETURN false;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO anon;

-- ============================================
-- Alternative approach: Create a simpler function that doesn't query users table
-- ============================================
-- If the above still doesn't work, we can use this approach instead:
-- Store admin status in a separate table or use JWT claims
-- But for now, let's try the improved function above

-- ============================================
-- Verification:
-- ============================================
-- Test the function (replace with your actual user ID):
-- SELECT is_admin();
-- 
-- Check function definition:
-- SELECT pg_get_functiondef('is_admin()'::regproc);
--
-- Check if function exists and has correct permissions:
-- SELECT proname, prosecdef, proconfig 
-- FROM pg_proc 
-- WHERE proname = 'is_admin';

-- ============================================
-- END OF MIGRATION
-- ============================================

