-- ============================================
-- Migration: Add username column to users table
-- ============================================
-- This migration adds a username column to support username-based login
-- while maintaining phone-based OTP authentication
-- ============================================

-- Add username column (nullable for existing users)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS username TEXT;

-- Create unique index on username (allows NULL values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username) 
WHERE username IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.username IS 'Unique username for login. Used with password authentication. Generated email format: username@thamili.local';

-- ============================================
-- Optional: Update existing phone-based users
-- ============================================
-- If you have existing users registered with phone/OTP, you can optionally
-- generate usernames for them. Uncomment and modify as needed:
--
-- UPDATE users 
-- SET username = 'user_' || SUBSTRING(id::TEXT, 1, 8)
-- WHERE username IS NULL AND phone IS NOT NULL;

