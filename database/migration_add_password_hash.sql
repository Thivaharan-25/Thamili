-- ============================================
-- Migration: Add password_hash column to users table
-- ============================================
-- This migration adds a password_hash column to support username/password login
-- without requiring Supabase Auth email validation
-- ============================================

-- Add password_hash column (nullable - only for users with username/password)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Add comment for documentation
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hash of user password. Used for username/password authentication. Only set for users who registered with username/password.';

-- ============================================
-- Security Note:
-- ============================================
-- Password hashes should be generated using bcrypt with appropriate salt rounds (10-12)
-- Never store plain text passwords!
-- ============================================

