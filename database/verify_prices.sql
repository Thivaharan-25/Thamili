-- ============================================
-- Verify Product Prices
-- Check which products have missing or invalid prices
-- ============================================

-- Check products with missing price_denmark
SELECT 
  id,
  name,
  category,
  price_germany,
  price_denmark,
  stock_germany,
  stock_denmark,
  CASE 
    WHEN price_denmark IS NULL THEN 'MISSING price_denmark'
    WHEN price_denmark = 0 THEN 'ZERO price_denmark'
    WHEN price_germany IS NULL THEN 'MISSING price_germany'
    WHEN price_germany = 0 THEN 'ZERO price_germany'
    ELSE 'OK'
  END as status
FROM products
WHERE price_denmark IS NULL 
   OR price_denmark = 0
   OR price_germany IS NULL
   OR price_germany = 0
ORDER BY status, name;

-- Count products by status
SELECT 
  CASE 
    WHEN price_denmark IS NULL THEN 'MISSING price_denmark'
    WHEN price_denmark = 0 THEN 'ZERO price_denmark'
    WHEN price_germany IS NULL THEN 'MISSING price_germany'
    WHEN price_germany = 0 THEN 'ZERO price_germany'
    ELSE 'OK'
  END as status,
  COUNT(*) as count
FROM products
GROUP BY status
ORDER BY count DESC;

-- ============================================
-- END OF VERIFY SCRIPT
-- ============================================

