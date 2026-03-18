-- ============================================
-- Thamili Mobile App - Schema Updates for Grams
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Change stock columns in products table to DECIMAL to support fractions of a KG
ALTER TABLE products 
  ALTER COLUMN stock_germany TYPE DECIMAL(10,3),
  ALTER COLUMN stock_denmark TYPE DECIMAL(10,3);

-- 2. Change quantity column in order_items to DECIMAL to support grams stored as fractions of a KG (or raw grams)
-- Note: If we store grams as integers, we need enough space. 
-- But keeping it as DECIMAL allows flexibility if we ever switch units.
ALTER TABLE order_items 
  ALTER COLUMN quantity TYPE DECIMAL(10,3);
  
-- 3. Update subtotal calculation in order_items to be more precise
ALTER TABLE order_items
  ALTER COLUMN subtotal TYPE DECIMAL(12,2);
