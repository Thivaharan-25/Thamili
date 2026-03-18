-- ============================================
-- Migration: Add order_type field to orders table
-- Purpose: Track order type (regular vs van_sale) for analytics
-- ============================================
-- IMPORTANT: Run fix_country_constraint_denmark.sql FIRST if your database
-- has 'norway' instead of 'denmark' in country constraints
-- ============================================

-- Add order_type column to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_type TEXT 
  CHECK (order_type IN ('regular', 'van_sale')) 
  DEFAULT 'regular';

-- Create index for faster queries on order_type
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type);

-- Update existing orders to have 'regular' type (if any exist)
UPDATE orders 
SET order_type = 'regular' 
WHERE order_type IS NULL;

-- ============================================
-- Update create_order_atomic function to accept order_type
-- ============================================

-- Drop existing function to recreate with new parameter
DROP FUNCTION IF EXISTS public.create_order_atomic(uuid, text, text, numeric, jsonb, uuid, text, numeric, text, text);
DROP FUNCTION IF EXISTS public.create_order_atomic(uuid, text, text, numeric, jsonb, uuid, text, numeric, text);

-- Recreate function with order_type parameter
CREATE OR REPLACE FUNCTION public.create_order_atomic(
  p_user_id UUID,
  p_country TEXT,
  p_payment_method TEXT,
  p_total_amount DECIMAL,
  p_items JSONB,
  p_pickup_point_id UUID DEFAULT NULL,
  p_delivery_address TEXT DEFAULT NULL,
  p_delivery_fee DECIMAL DEFAULT 0,
  p_idempotency_key TEXT DEFAULT NULL,
  p_delivery_method TEXT DEFAULT NULL,
  p_order_type TEXT DEFAULT 'regular'
) RETURNS UUID 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_existing_order_id UUID;
  item JSONB;
  v_product_id UUID;
  v_quantity INTEGER;
  v_price DECIMAL;
  v_db_price DECIMAL;
  v_stock_reserved BOOLEAN;
BEGIN
  -- Check for existing order (idempotency)
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_order_id FROM public.orders WHERE idempotency_key = p_idempotency_key LIMIT 1;
    IF v_existing_order_id IS NOT NULL THEN
      RETURN v_existing_order_id;
    END IF;
  END IF;

  -- Validate order_type
  IF p_order_type NOT IN ('regular', 'van_sale') THEN
    RAISE EXCEPTION 'Invalid order_type: %. Must be "regular" or "van_sale"', p_order_type;
  END IF;

  -- Reserve stock and validate prices for all items
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (item->>'product_id')::UUID;
    v_quantity := (item->>'quantity')::INTEGER;
    v_price := (item->>'price')::DECIMAL;
    
    -- Server-side price validation
    SELECT 
      CASE WHEN p_country = 'germany' THEN price_germany ELSE price_denmark END
    INTO v_db_price
    FROM public.products
    WHERE id = v_product_id;
    
    IF v_db_price IS NULL THEN
      RAISE EXCEPTION 'Product % not found', v_product_id;
    END IF;
    
    IF ABS(v_db_price - v_price) > 0.01 THEN
      RAISE EXCEPTION 'Price mismatch for product %. Expected %, got %', v_product_id, v_db_price, v_price;
    END IF;

    -- Reserve stock atomically
    SELECT public.reserve_stock(v_product_id, p_country, v_quantity) INTO v_stock_reserved;
    IF NOT v_stock_reserved THEN
      RAISE EXCEPTION 'Insufficient stock for product %', v_product_id;
    END IF;
  END LOOP;

  -- Create the order record (bypasses RLS due to SECURITY DEFINER)
  INSERT INTO public.orders (
    user_id, country, payment_method, payment_status, total_amount, status, 
    pickup_point_id, delivery_address, idempotency_key, delivery_method, order_type
  )
  VALUES (
    p_user_id, p_country, p_payment_method, 'pending', p_total_amount, 'pending', 
    p_pickup_point_id, p_delivery_address, p_idempotency_key,
    COALESCE(p_delivery_method, CASE WHEN p_delivery_address IS NOT NULL THEN 'home' ELSE 'pickup' END),
    p_order_type
  )
  RETURNING id INTO v_order_id;

  -- Create order items
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.order_items (order_id, product_id, quantity, price, subtotal)
    VALUES (
      v_order_id, (item->>'product_id')::UUID, (item->>'quantity')::INTEGER, 
      (item->>'price')::DECIMAL, (item->>'price')::DECIMAL * (item->>'quantity')::INTEGER
    );
  END LOOP;

  RETURN v_order_id;
END;
$$;

-- Grant execute permissions
REVOKE EXECUTE ON FUNCTION public.create_order_atomic(uuid, text, text, numeric, jsonb, uuid, text, numeric, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_atomic(uuid, text, text, numeric, jsonb, uuid, text, numeric, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_atomic(uuid, text, text, numeric, jsonb, uuid, text, numeric, text, text, text) TO service_role;

-- ============================================
-- Migration Complete
-- ============================================

