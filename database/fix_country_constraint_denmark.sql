-- ============================================
-- Fix: Change country constraint from 'norway' to 'denmark'
-- Problem: Database allows 'norway' but code uses 'denmark'
-- This causes INSERT failures when creating orders
-- ============================================

-- Step 1: Update any existing 'norway' values to 'denmark' (if any exist)
UPDATE orders SET country = 'denmark' WHERE country = 'norway';
UPDATE pickup_points SET country = 'denmark' WHERE country = 'norway';
UPDATE users SET country_preference = 'denmark' WHERE country_preference = 'norway';

-- Step 2: Drop existing constraints
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_country_check;
ALTER TABLE pickup_points DROP CONSTRAINT IF EXISTS pickup_points_country_check;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_country_preference_check;

-- Step 3: Recreate constraints with 'denmark' instead of 'norway'
ALTER TABLE orders 
  ADD CONSTRAINT orders_country_check 
  CHECK (country IN ('germany', 'denmark'));

ALTER TABLE pickup_points 
  ADD CONSTRAINT pickup_points_country_check 
  CHECK (country IN ('germany', 'denmark'));

ALTER TABLE users 
  ADD CONSTRAINT users_country_preference_check 
  CHECK (country_preference IN ('germany', 'denmark'));

-- Step 4: Verify the fix
SELECT 
  table_name,
  constraint_name,
  check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%country%'
ORDER BY table_name;

-- ============================================
-- Migration Complete
-- ============================================
-- After running this, van sales should work correctly
-- The constraint now matches what the code expects ('denmark' not 'norway')

