-- ============================================
-- Migration: Add Separate Stock for Germany and Denmark
-- ============================================
-- This migration adds stock_germany and stock_denmark columns
-- and migrates existing stock data
-- ============================================

-- Step 1: Add new columns
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS stock_germany INTEGER NOT NULL DEFAULT 0 CHECK (stock_germany >= 0),
ADD COLUMN IF NOT EXISTS stock_denmark INTEGER NOT NULL DEFAULT 0 CHECK (stock_denmark >= 0);

-- Step 2: Migrate existing stock data
-- Copy existing stock to both countries (you may want to adjust this logic)
UPDATE products 
SET 
  stock_germany = COALESCE(stock, 0),
  stock_denmark = COALESCE(stock, 0)
WHERE stock_germany = 0 AND stock_denmark = 0;

-- Step 3: Drop old stock column (after verifying data migration)
-- Uncomment the line below after verifying the migration worked correctly
-- ALTER TABLE products DROP COLUMN IF EXISTS stock;

-- ============================================
-- Verification
-- ============================================
-- Check the migration:
-- SELECT id, name, stock_germany, stock_denmark FROM products LIMIT 5;

-- ============================================
-- END OF MIGRATION
-- ============================================

