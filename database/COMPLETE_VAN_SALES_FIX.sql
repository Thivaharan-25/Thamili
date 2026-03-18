-- ============================================
-- COMPLETE FIX FOR VAN SALES ORDERS NOT BEING CREATED
-- Run this file in Supabase SQL Editor
-- ============================================

-- STEP 1: Fix country constraint (if database has 'norway' instead of 'denmark')
-- This is the MAIN ISSUE causing orders not to be created
-- ============================================

-- IMPORTANT: Drop constraints FIRST, then update data, then recreate constraints
-- Drop existing constraints dynamically (handles any constraint name)
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Drop orders country constraint
    FOR constraint_name IN 
        SELECT conname FROM pg_constraint 
        WHERE conrelid = 'public.orders'::regclass 
        AND contype = 'c' 
        AND conname LIKE '%country%'
    LOOP
        EXECUTE 'ALTER TABLE public.orders DROP CONSTRAINT ' || quote_ident(constraint_name);
    END LOOP;
    
    -- Drop pickup_points country constraint
    FOR constraint_name IN 
        SELECT conname FROM pg_constraint 
        WHERE conrelid = 'public.pickup_points'::regclass 
        AND contype = 'c' 
        AND conname LIKE '%country%'
    LOOP
        EXECUTE 'ALTER TABLE public.pickup_points DROP CONSTRAINT ' || quote_ident(constraint_name);
    END LOOP;
    
    -- Drop users country_preference constraint
    FOR constraint_name IN 
        SELECT conname FROM pg_constraint 
        WHERE conrelid = 'public.users'::regclass 
        AND contype = 'c' 
        AND (conname LIKE '%country%' OR conname LIKE '%preference%')
    LOOP
        EXECUTE 'ALTER TABLE public.users DROP CONSTRAINT ' || quote_ident(constraint_name);
    END LOOP;
END $$;

-- Now update any existing 'norway' values to 'denmark' (constraints are dropped, so this will work)
UPDATE orders SET country = 'denmark' WHERE country = 'norway';
UPDATE pickup_points SET country = 'denmark' WHERE country = 'norway';
UPDATE users SET country_preference = 'denmark' WHERE country_preference = 'norway';

-- Recreate constraints with 'denmark' (matching code)
ALTER TABLE orders 
  ADD CONSTRAINT orders_country_check 
  CHECK (country IN ('germany', 'denmark'));

ALTER TABLE pickup_points 
  ADD CONSTRAINT pickup_points_country_check 
  CHECK (country IN ('germany', 'denmark'));

ALTER TABLE users 
  ADD CONSTRAINT users_country_preference_check 
  CHECK (country_preference IN ('germany', 'denmark'));

-- ============================================
-- STEP 2: Add order_type column (if not exists)
-- ============================================

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_type TEXT 
  CHECK (order_type IN ('regular', 'van_sale')) 
  DEFAULT 'regular';

CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type);

UPDATE orders 
SET order_type = 'regular' 
WHERE order_type IS NULL;

-- ============================================
-- STEP 3: Update create_order_atomic function
-- ============================================

-- Drop old function versions
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

  -- Validate country (must be 'germany' or 'denmark', not 'norway')
  IF p_country NOT IN ('germany', 'denmark') THEN
    RAISE EXCEPTION 'Invalid country: %. Must be "germany" or "denmark"', p_country;
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
-- STEP 4: Verify the fix
-- ============================================

-- Check country constraints
SELECT 
  tc.table_name,
  cc.constraint_name,
  cc.check_clause
FROM information_schema.check_constraints cc
JOIN information_schema.table_constraints tc 
  ON cc.constraint_name = tc.constraint_name
  AND cc.constraint_schema = tc.constraint_schema
WHERE cc.constraint_name LIKE '%country%'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- Check order_type column exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'orders' 
  AND column_name = 'order_type';

-- Check function signature
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc 
WHERE proname = 'create_order_atomic';

-- ============================================
-- FIX COMPLETE
-- ============================================
-- After running this:
-- 1. Country constraint now allows 'denmark' (not 'norway')
-- 2. order_type column exists
-- 3. Function accepts order_type parameter
-- 4. Van sales should now create orders successfully

