-- ============================================
-- Complete Fix for Admin User Role
-- ============================================
-- This script:
-- 1. Updates the admin user's role in the database
-- 2. Verifies the update
-- 3. Provides troubleshooting steps
-- ============================================

-- Step 1: Update admin user role by ID (most reliable)
UPDATE users 
SET role = 'admin', 
    name = COALESCE(NULLIF(name, ''), 'Admin User'),
    phone = COALESCE(NULLIF(phone, ''), '+491234567890'),
    updated_at = NOW()
WHERE id = 'db24b963-4536-480f-aa5d-c5f5d10bc88c';

-- Step 2: Verify the update
SELECT 
  id, 
  email, 
  name, 
  role, 
  phone,
  created_at,
  updated_at
FROM users 
WHERE id = 'db24b963-4536-480f-aa5d-c5f5d10bc88c';

-- ============================================
-- Alternative: Update by email (if ID doesn't work)
-- ============================================
-- UPDATE users 
-- SET role = 'admin', 
--     name = COALESCE(NULLIF(name, ''), 'Admin User'),
--     phone = COALESCE(NULLIF(phone, ''), '+491234567890'),
--     updated_at = NOW()
-- WHERE email = 'admin@thamili.com';
--
-- SELECT id, email, name, role, phone 
-- FROM users 
-- WHERE email = 'admin@thamili.com';

-- ============================================
-- Check all users with admin or delivery_partner role
-- ============================================
SELECT id, email, name, role, phone, created_at, updated_at
FROM users 
WHERE role IN ('admin', 'delivery_partner')
ORDER BY role, email;

-- ============================================
-- Troubleshooting: If role is still showing as 'customer'
-- ============================================
-- 1. Make sure you ran the migration: migration_fix_is_admin_function_v2.sql
-- 2. Clear the app cache and restart
-- 3. Log out and log back in
-- 4. Check if the database update actually worked (run the SELECT query above)
-- 5. If the role in DB is correct but app shows wrong, it's a caching issue

-- ============================================
-- Force refresh: Delete and recreate user record (LAST RESORT)
-- ============================================
-- WARNING: Only use this if nothing else works!
-- This will delete the user record and recreate it with admin role
-- 
-- DELETE FROM users WHERE id = 'db24b963-4536-480f-aa5d-c5f5d10bc88c';
-- 
-- Then the trigger should recreate it, but you'll need to manually set role:
-- UPDATE users SET role = 'admin' WHERE id = 'db24b963-4536-480f-aa5d-c5f5d10bc88c';

-- ============================================
-- END OF FIX
-- ============================================

