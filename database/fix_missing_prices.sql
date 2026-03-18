-- ============================================
-- Fix Missing Price_Denmark Values
-- This script updates products that have missing price_denmark values
-- ============================================

-- Step 1: Check current state
-- Uncomment to see products with missing prices
-- SELECT id, name, price_germany, price_denmark 
-- FROM products 
-- WHERE price_denmark IS NULL OR price_denmark = 0;

-- Step 2: Update products with missing price_denmark
-- Option A: Set price_denmark based on price_germany with conversion (EUR to DKK)
-- Using approximate conversion rate: 1 EUR ≈ 7.5 DKK (adjust as needed)
UPDATE products
SET price_denmark = ROUND(price_germany * 7.5, 2)
WHERE (price_denmark IS NULL OR price_denmark = 0) 
  AND price_germany IS NOT NULL 
  AND price_germany > 0;

-- Step 3: For products that still have missing prices, set a default
-- This handles edge cases where price_germany is also missing
UPDATE products
SET price_denmark = 0.00
WHERE price_denmark IS NULL;

-- Step 4: Verify the update
-- Uncomment to verify all products now have prices
-- SELECT id, name, price_germany, price_denmark, 
--        CASE 
--          WHEN price_denmark IS NULL OR price_denmark = 0 THEN 'MISSING'
--          ELSE 'OK'
--        END as status
-- FROM products
-- ORDER BY status DESC, name;

-- ============================================
-- END OF FIX SCRIPT
-- ============================================

