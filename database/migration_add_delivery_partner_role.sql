-- ============================================
-- Migration: Add 'delivery_partner' role to users table
-- ============================================
-- This script updates the CHECK constraint on the users.role column
-- to include 'delivery_partner' as a valid role option
-- ============================================

-- Drop the existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add the new constraint with delivery_partner included
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('customer', 'admin', 'delivery_partner'));

-- ============================================
-- Verification:
-- ============================================
-- Run this to verify the constraint was updated:
-- SELECT conname, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'users'::regclass AND conname = 'users_role_check';

-- ============================================
-- END OF MIGRATION
-- ============================================

