-- ============================================
-- Thamili Mobile App - Advanced Database Functions & Triggers
-- Supabase PostgreSQL Database
-- Task L2.2: Set Up Database Functions & Triggers (Advanced)
-- ============================================

-- ============================================
-- 1. FUNCTION: Calculate Order Total
-- ============================================
-- Automatically calculates total amount for an order based on order items
CREATE OR REPLACE FUNCTION calculate_order_total(order_uuid UUID)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
  total DECIMAL(10, 2);
BEGIN
  SELECT COALESCE(SUM(subtotal), 0)
  INTO total
  FROM order_items
  WHERE order_id = order_uuid;
  
  RETURN total;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. FUNCTION: Update Order Total on Order Item Changes
-- ============================================
-- Trigger function to automatically update order total when order items change
CREATE OR REPLACE FUNCTION update_order_total()
RETURNS TRIGGER AS $$
DECLARE
  new_total DECIMAL(10, 2);
BEGIN
  -- Calculate new total
  SELECT COALESCE(SUM(subtotal), 0)
  INTO new_total
  FROM order_items
  WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
  
  -- Update order total
  UPDATE orders
  SET total_amount = new_total,
      updated_at = NOW()
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update order total when order items are inserted
CREATE TRIGGER trigger_update_order_total_on_insert
  AFTER INSERT ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_order_total();

-- Trigger: Update order total when order items are updated
CREATE TRIGGER trigger_update_order_total_on_update
  AFTER UPDATE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_order_total();

-- Trigger: Update order total when order items are deleted
CREATE TRIGGER trigger_update_order_total_on_delete
  AFTER DELETE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_order_total();

-- ============================================
-- 3. FUNCTION: Calculate Order Item Subtotal
-- ============================================
-- Automatically calculates subtotal when quantity or price changes
CREATE OR REPLACE FUNCTION calculate_order_item_subtotal()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate subtotal = quantity * price
  NEW.subtotal = NEW.quantity * NEW.price;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Calculate subtotal before insert or update
CREATE TRIGGER trigger_calculate_subtotal
  BEFORE INSERT OR UPDATE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_order_item_subtotal();

-- ============================================
-- 4. FUNCTION: Inventory Management - Decrease Stock
-- ============================================
-- Decreases product stock when order is confirmed
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

-- Trigger: Decrease stock when order is confirmed
CREATE TRIGGER trigger_decrease_stock_on_confirm
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed'))
  EXECUTE FUNCTION decrease_product_stock();

-- ============================================
-- 5. FUNCTION: Inventory Management - Restore Stock
-- ============================================
-- Restores product stock when order is canceled
CREATE OR REPLACE FUNCTION restore_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Only restore stock when order status changes to 'canceled'
  IF NEW.status = 'canceled' AND (OLD.status IS NULL OR OLD.status != 'canceled') THEN
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

-- Trigger: Restore stock when order is canceled
CREATE TRIGGER trigger_restore_stock_on_cancel
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'canceled' AND (OLD.status IS NULL OR OLD.status != 'canceled'))
  EXECUTE FUNCTION restore_product_stock();

-- ============================================
-- 6. FUNCTION: Auto-create Delivery Schedule
-- ============================================
-- Automatically creates delivery schedule when order is confirmed
CREATE OR REPLACE FUNCTION create_delivery_schedule()
RETURNS TRIGGER AS $$
DECLARE
  delivery_date DATE;
  pickup_point_uuid UUID;
BEGIN
  -- Only create schedule when order status changes to 'confirmed'
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    -- Set delivery date to next week (7 days from order date)
    delivery_date := NEW.order_date + INTERVAL '7 days';
    
    -- Get pickup point from order
    pickup_point_uuid := NEW.pickup_point_id;
    
    -- Create delivery schedule
    INSERT INTO delivery_schedule (
      order_id,
      delivery_date,
      status,
      pickup_point_id,
      estimated_time
    ) VALUES (
      NEW.id,
      delivery_date,
      'scheduled',
      pickup_point_uuid,
      '10:00:00'::TIME -- Default estimated time
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Create delivery schedule when order is confirmed
CREATE TRIGGER trigger_create_delivery_schedule
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed'))
  EXECUTE FUNCTION create_delivery_schedule();

-- ============================================
-- 7. FUNCTION: Update Delivery Schedule Status
-- ============================================
-- Updates delivery schedule status when order status changes
CREATE OR REPLACE FUNCTION update_delivery_schedule_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update delivery schedule based on order status
  IF NEW.status = 'out_for_delivery' THEN
    UPDATE delivery_schedule
    SET status = 'in_transit',
        updated_at = NOW()
    WHERE order_id = NEW.id;
  ELSIF NEW.status = 'delivered' THEN
    UPDATE delivery_schedule
    SET status = 'delivered',
        actual_delivery_time = NOW(),
        updated_at = NOW()
    WHERE order_id = NEW.id;
  ELSIF NEW.status = 'canceled' THEN
    UPDATE delivery_schedule
    SET status = 'canceled',
        updated_at = NOW()
    WHERE order_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update delivery schedule status
CREATE TRIGGER trigger_update_delivery_schedule_status
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (NEW.status != OLD.status)
  EXECUTE FUNCTION update_delivery_schedule_status();

-- ============================================
-- END OF FUNCTIONS & TRIGGERS
-- ============================================

