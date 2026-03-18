-- ============================================
-- Fix Admin User Role
-- ============================================
-- This script updates a specific user's role to admin
-- Replace the email with your admin user's email
-- ============================================

-- Update admin user role
UPDATE users 
SET role = 'admin', 
    name = COALESCE(name, 'Admin User'),
    phone = COALESCE(phone, '+491234567890')
WHERE email = 'admin@thamili.com';

-- Verify the update
SELECT id, email, name, role, phone 
FROM users 
WHERE email = 'admin@thamili.com';

-- ============================================
-- If you need to update by user ID instead:
-- ============================================
-- UPDATE users 
-- SET role = 'admin', 
--     name = COALESCE(name, 'Admin User'),
--     phone = COALESCE(phone, '+491234567890')
-- WHERE id = 'db24b963-4536-480f-aa5d-c5f5d10bc88c';
--
-- Verify:
-- SELECT id, email, name, role, phone 
-- FROM users 
-- WHERE id = 'db24b963-4536-480f-aa5d-c5f5d10bc88c';

-- ============================================
-- END OF FIX
-- ============================================

