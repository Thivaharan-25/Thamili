-- ============================================
-- Thamili Mobile App - Concurrency Functions (MASTER FIX)
-- Atomic operations for stock management and order creation
-- This version merges:
-- 1. Gram-based quantity support (fractional stock)
-- 2. Van Sales fix (order_type, status, payment_status)
-- ============================================

-- ============================================
-- PRE-CLEANUP: Drop old functions to prevent conflicts
-- ============================================
-- Drop create_order_atomic with different signatures
DROP FUNCTION IF EXISTS public.create_order_atomic(uuid, text, text, numeric, jsonb, uuid, text, numeric, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.create_order_atomic(uuid, text, text, numeric, jsonb, uuid, text, numeric, text, text, text);
DROP FUNCTION IF EXISTS public.create_order_atomic(uuid, text, text, numeric, jsonb, uuid, text, numeric, text, text);
DROP FUNCTION IF EXISTS public.create_order_atomic(uuid, text, text, numeric, jsonb, uuid, text, numeric, text);

-- Drop reserve_stock with different signatures
DROP FUNCTION IF EXISTS public.reserve_stock(uuid, text, integer);
DROP FUNCTION IF EXISTS public.reserve_stock(uuid, text, numeric);
DROP FUNCTION IF EXISTS public.reserve_stock(uuid, text, decimal);

-- Drop restore_stock
DROP FUNCTION IF EXISTS public.restore_stock(uuid);

-- ============================================
-- 1. ATOMIC STOCK RESERVATION FUNCTION
-- ============================================
-- Reserves stock atomically to prevent overselling
-- Supports gram-to-kg conversion for fresh/frozen categories
CREATE OR REPLACE FUNCTION reserve_stock(
  p_product_id UUID,
  p_country TEXT,
  p_quantity DECIMAL
) RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_stock DECIMAL;
  v_category TEXT;
  v_actual_quantity DECIMAL;
  updated_rows INTEGER;
BEGIN
  -- Validate country
  IF p_country NOT IN ('germany', 'denmark') THEN
    RAISE EXCEPTION 'Invalid country: %', p_country;
  END IF;

  -- Get product category to decide if we need conversion
  SELECT category INTO v_category FROM products WHERE id = p_product_id;
  
  -- If category is fresh or frozen, input is in grams, stock is in KG
  IF v_category IN ('fresh', 'frozen') THEN
    v_actual_quantity := p_quantity / 1000.0;
  ELSE
    v_actual_quantity := p_quantity;
  END IF;

  -- Lock the product row for update to prevent concurrent modifications
  IF p_country = 'germany' THEN
    SELECT stock_germany INTO current_stock 
    FROM products 
    WHERE id = p_product_id 
    FOR UPDATE;
    
    IF current_stock IS NULL THEN
      RETURN FALSE;
    END IF;
    
    IF current_stock >= v_actual_quantity THEN
      UPDATE products 
      SET stock_germany = stock_germany - v_actual_quantity 
      WHERE id = p_product_id;
      GET DIAGNOSTICS updated_rows = ROW_COUNT;
      RETURN updated_rows > 0;
    ELSE
      RETURN FALSE;
    END IF;
  ELSE -- denmark
    SELECT stock_denmark INTO current_stock 
    FROM products 
    WHERE id = p_product_id 
    FOR UPDATE;
    
    IF current_stock IS NULL THEN
      RETURN FALSE;
    END IF;
    
    IF current_stock >= v_actual_quantity THEN
      UPDATE products 
      SET stock_denmark = stock_denmark - v_actual_quantity 
      WHERE id = p_product_id;
      GET DIAGNOSTICS updated_rows = ROW_COUNT;
      RETURN updated_rows > 0;
    ELSE
      RETURN FALSE;
    END IF;
  END IF;
END;
$$;

-- ============================================
-- 2. ATOMIC ORDER CREATION FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION create_order_atomic(
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
  p_order_type TEXT DEFAULT 'regular',
  p_status TEXT DEFAULT 'pending',
  p_payment_status TEXT DEFAULT 'pending'
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
  v_quantity DECIMAL;
  v_price DECIMAL;
  v_stock_reserved BOOLEAN;
  v_item_category TEXT;
  v_item_subtotal DECIMAL;
BEGIN
  -- Check for duplicate order using idempotency key
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_order_id
    FROM orders
    WHERE idempotency_key = p_idempotency_key
    LIMIT 1;
    
    IF v_existing_order_id IS NOT NULL THEN
      RETURN v_existing_order_id;
    END IF;
  END IF;

  -- Validate country
  IF p_country NOT IN ('germany', 'denmark') THEN
    RAISE EXCEPTION 'Invalid country: %', p_country;
  END IF;

  -- Validate payment method
  IF p_payment_method NOT IN ('online', 'cod') THEN
    RAISE EXCEPTION 'Invalid payment method: %', p_payment_method;
  END IF;

  -- Validate order_type
  IF p_order_type NOT IN ('regular', 'van_sale') THEN
    RAISE EXCEPTION 'Invalid order_type: %. Must be "regular" or "van_sale"', p_order_type;
  END IF;

  -- Reserve stock for all items first
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (item->>'product_id')::UUID;
    v_quantity := (item->>'quantity')::DECIMAL;
    
    SELECT reserve_stock(v_product_id, p_country, v_quantity) INTO v_stock_reserved;
    
    IF NOT v_stock_reserved THEN
      RAISE EXCEPTION 'Insufficient stock for product %', v_product_id;
    END IF;
  END LOOP;

  -- Create order
  INSERT INTO orders (
    user_id,
    country,
    payment_method,
    payment_status,
    total_amount,
    status,
    pickup_point_id,
    delivery_address,
    idempotency_key,
    delivery_method,
    order_type
  )
  VALUES (
    p_user_id,
    p_country,
    p_payment_method,
    p_payment_status,
    p_total_amount,
    p_status,
    p_pickup_point_id,
    p_delivery_address,
    p_idempotency_key,
    COALESCE(p_delivery_method, CASE WHEN p_delivery_address IS NOT NULL THEN 'home' ELSE 'pickup' END),
    p_order_type
  )
  RETURNING id INTO v_order_id;

  -- Create order items
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (item->>'product_id')::UUID;
    v_quantity := (item->>'quantity')::DECIMAL;
    v_price := (item->>'price')::DECIMAL;
    
    SELECT category INTO v_item_category FROM products WHERE id = v_product_id;
    
    IF v_item_category IN ('fresh', 'frozen') THEN
      v_item_subtotal := (v_price * v_quantity) / 1000.0;
    ELSE
      v_item_subtotal := v_price * v_quantity;
    END IF;

    INSERT INTO order_items (
      order_id,
      product_id,
      quantity,
      price,
      subtotal
    )
    VALUES (
      v_order_id,
      v_product_id,
      v_quantity,
      v_price,
      v_item_subtotal
    );
  END LOOP;

  RETURN v_order_id;
END;
$$;

-- ============================================
-- 3. STOCK RESTORATION FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION restore_stock(
  p_order_id UUID
) RETURNS BOOLEAN 
LANGUAGE plpgsql
AS $$
DECLARE
  v_country TEXT;
  item_record RECORD;
  v_category TEXT;
  v_actual_quantity DECIMAL;
BEGIN
  SELECT country INTO v_country FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN RETURN FALSE; END IF;

  FOR item_record IN 
    SELECT product_id, quantity FROM order_items WHERE order_id = p_order_id
  LOOP
    SELECT category INTO v_category FROM products WHERE id = item_record.product_id;
    
    IF v_category IN ('fresh', 'frozen') THEN
      v_actual_quantity := item_record.quantity / 1000.0;
    ELSE
      v_actual_quantity := item_record.quantity;
    END IF;

    IF v_country = 'germany' THEN
      UPDATE products SET stock_germany = stock_germany + v_actual_quantity WHERE id = item_record.product_id;
    ELSE
      UPDATE products SET stock_denmark = stock_denmark + v_actual_quantity WHERE id = item_record.product_id;
    END IF;
  END LOOP;

  RETURN TRUE;
END;
$$;

-- ============================================
-- 4. PERMISSIONS
-- ============================================
GRANT EXECUTE ON FUNCTION public.create_order_atomic(uuid, text, text, numeric, jsonb, uuid, text, numeric, text, text, text, text, text) TO authenticated;
