-- ============================================
-- Update Admin User Role - QUICK FIX
-- ============================================
-- This script updates a user's role to 'admin' in the users table
-- 
-- INSTRUCTIONS:
-- 1. Replace 'your-admin-email@example.com' with your actual admin email
-- 2. Run this script in Supabase SQL Editor (Dashboard → SQL Editor)
-- 3. After running, LOGOUT and LOGIN again in the app
-- ============================================

-- STEP 1: Update admin role by email (REPLACE THE EMAIL BELOW!)
UPDATE users 
SET role = 'admin', updated_at = NOW()
WHERE email = 'your-admin-email@example.com';

-- STEP 2: Verify the update worked
SELECT id, email, name, role, created_at, updated_at
FROM users 
WHERE email = 'your-admin-email@example.com';

-- ============================================
-- ALTERNATIVE METHODS (if email doesn't work)
-- ============================================

-- Method A: Update by user ID (if you know the UUID)
-- First, find your user ID:
-- SELECT id, email, role FROM users WHERE email = 'your-admin-email@example.com';
-- Then update:
-- UPDATE users 
-- SET role = 'admin', updated_at = NOW()
-- WHERE id = 'paste-user-id-here';

-- Method B: List all users to find your admin user
-- SELECT id, email, name, role, created_at 
-- FROM users 
-- ORDER BY created_at DESC;

-- Method C: Check all admin users
-- SELECT id, email, name, role, phone, created_at
-- FROM users 
-- WHERE role = 'admin'
-- ORDER BY created_at DESC;

-- ============================================
-- TROUBLESHOOTING
-- ============================================
-- If the role is still 'customer' after update:
-- 1. Make sure you replaced the email in the UPDATE query
-- 2. Check the SELECT query shows role = 'admin'
-- 3. Logout and login again in the app
-- 4. Clear app cache if needed
-- ============================================

