-- ============================================
-- Thamili Mobile App - Seed Admin & Delivery Partners
-- Supabase PostgreSQL Database
-- ============================================
-- This script creates default admin and delivery partner users
-- IMPORTANT: You must run the migration first, then create users in Supabase Auth
-- ============================================

-- ============================================
-- PREREQUISITE: Run Migration First!
-- ============================================
-- BEFORE running this script, you MUST run:
-- database/migration_add_delivery_partner_role.sql
-- This adds 'delivery_partner' as a valid role in the users table
-- ============================================

-- ============================================
-- INSTRUCTIONS:
-- ============================================
-- 1. FIRST: Run migration_add_delivery_partner_role.sql to update the schema
-- 2. Go to Supabase Dashboard → Authentication → Users
-- 3. Create these users manually:
--    - admin@thamili.com (password: Admin@123)
--    - delivery1@thamili.com (password: Delivery@123)
--    - delivery2@thamili.com (password: Delivery@123)
-- 4. After creating them, wait a few seconds for the trigger to create user records
-- 5. Run this script to assign roles
-- ============================================

-- ============================================
-- OPTION 1: If you know the user IDs from auth.users
-- ============================================
-- Replace these UUIDs with actual user IDs from auth.users table
-- You can find them by running: SELECT id, email FROM auth.users;

-- Admin User
-- UPDATE users 
-- SET role = 'admin', name = 'Admin User', phone = '+491234567890'
-- WHERE id = 'YOUR_ADMIN_USER_ID_HERE';

-- Delivery Partner 1
-- UPDATE users 
-- SET role = 'delivery_partner', name = 'Delivery Partner 1', phone = '+491234567891'
-- WHERE id = 'YOUR_DELIVERY1_USER_ID_HERE';

-- Delivery Partner 2
-- UPDATE users 
-- SET role = 'delivery_partner', name = 'Delivery Partner 2', phone = '+491234567892'
-- WHERE id = 'YOUR_DELIVERY2_USER_ID_HERE';

-- ============================================
-- OPTION 2: Using email (if users already exist in users table)
-- ============================================
-- This works if the users table was auto-populated from auth.users

-- Admin User
UPDATE users 
SET role = 'admin', name = 'Admin User', phone = '+491234567890'
WHERE email = 'admin@thamili.com';

-- Delivery Partner 1
UPDATE users 
SET role = 'delivery_partner', name = 'Delivery Partner 1', phone = '+491234567891'
WHERE email = 'delivery1@thamili.com';

-- Delivery Partner 2
UPDATE users 
SET role = 'delivery_partner', name = 'Delivery Partner 2', phone = '+491234567892'
WHERE email = 'delivery2@thamili.com';

-- ============================================
-- VERIFICATION:
-- ============================================
-- Run this to verify the users were created correctly:
-- SELECT id, email, name, role, phone FROM users WHERE role IN ('admin', 'delivery_partner');

-- ============================================
-- END OF SEED ADMIN USERS
-- ============================================

