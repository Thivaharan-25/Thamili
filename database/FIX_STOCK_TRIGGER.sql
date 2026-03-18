-- =====================================================
-- FIX: Update Database Triggers to Use Country-Specific Stock
-- Run this in your Supabase SQL Editor
-- =====================================================

-- ============================================
-- 1. DROP AND RECREATE: decrease_product_stock
-- ============================================
DROP FUNCTION IF EXISTS decrease_product_stock() CASCADE;

CREATE OR REPLACE FUNCTION decrease_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Only decrease stock when order status changes to 'confirmed'
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    -- Decrease stock for all items in the order based on country
    IF NEW.country = 'germany' THEN
      UPDATE products
      SET stock_germany = stock_germany - oi.quantity,
          updated_at = NOW()
      FROM order_items oi
      WHERE products.id = oi.product_id
        AND oi.order_id = NEW.id
        AND products.stock_germany >= oi.quantity;
    ELSIF NEW.country = 'denmark' THEN
      UPDATE products
      SET stock_denmark = stock_denmark - oi.quantity,
          updated_at = NOW()
      FROM order_items oi
      WHERE products.id = oi.product_id
        AND oi.order_id = NEW.id
        AND products.stock_denmark >= oi.quantity;
    END IF;
    
    -- Check if any product has insufficient stock
    IF EXISTS (
      SELECT 1
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = NEW.id
        AND (
          (NEW.country = 'germany' AND p.stock_germany < oi.quantity) OR
          (NEW.country = 'denmark' AND p.stock_denmark < oi.quantity)
        )
    ) THEN
      RAISE EXCEPTION 'Insufficient stock for one or more products';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER trigger_decrease_stock_on_confirm
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed'))
  EXECUTE FUNCTION decrease_product_stock();

-- ============================================
-- 2. DROP AND RECREATE: restore_product_stock
-- ============================================
DROP FUNCTION IF EXISTS restore_product_stock() CASCADE;

CREATE OR REPLACE FUNCTION restore_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Only restore stock when order status changes to 'cancelled'
  IF NEW.status = 'cancelled' AND (OLD.status IS NULL OR OLD.status != 'cancelled') THEN
    -- Restore stock for all items in the order based on country
    IF NEW.country = 'germany' THEN
      UPDATE products
      SET stock_germany = stock_germany + oi.quantity,
          updated_at = NOW()
      FROM order_items oi
      WHERE products.id = oi.product_id
        AND oi.order_id = NEW.id;
    ELSIF NEW.country = 'denmark' THEN
      UPDATE products
      SET stock_denmark = stock_denmark + oi.quantity,
          updated_at = NOW()
      FROM order_items oi
      WHERE products.id = oi.product_id
        AND oi.order_id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER trigger_restore_stock_on_cancel
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'cancelled' AND (OLD.status IS NULL OR OLD.status != 'cancelled'))
  EXECUTE FUNCTION restore_product_stock();

-- ============================================
-- VERIFICATION
-- ============================================
-- Check that triggers are recreated
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name IN ('trigger_decrease_stock_on_confirm', 'trigger_restore_stock_on_cancel')
ORDER BY trigger_name;

-- ============================================
-- END OF FIX
-- ============================================
