-- Migration: Add regional status columns to products table
-- Purpose: Enable independent active/inactive status for Germany and Denmark

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS active_germany BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS active_denmark BOOLEAN DEFAULT true;

-- Optional: Initialize regional status from existing global active status
UPDATE products 
SET 
  active_germany = active,
  active_denmark = active;
