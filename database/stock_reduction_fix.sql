-- ============================================
-- MASTER STOCK REDUCTION FIX
-- Handles: Packets (direct quantity) and Loose (grams to KG conversion)
-- ============================================

-- 1. Redefine reserve_stock to use sell_type
CREATE OR REPLACE FUNCTION public.reserve_stock(
  p_product_id UUID,
  p_country TEXT,
  p_quantity DECIMAL
) RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sell_type TEXT;
  v_unit TEXT;
  v_category TEXT;
  v_subtract_amount DECIMAL;
  v_current_stock DECIMAL;
  updated_rows INTEGER;
BEGIN
  -- Get product metadata
  SELECT sell_type, LOWER(unit), LOWER(category) INTO v_sell_type, v_unit, v_category 
  FROM public.products WHERE id = p_product_id;
  
  -- Determine subtraction amount
  IF v_sell_type = 'loose' OR v_unit = 'gram' OR (v_sell_type IS NULL AND v_category IN ('fresh', 'frozen')) THEN
    -- It's weight based, input is in grams, DB is in KG
    v_subtract_amount := p_quantity / 1000.0;
  ELSE
    -- It's packet based, direct subtraction
    -- Legacy fix: if quantity < 1 (e.g. 0.001), treat as whole units (e.g. 1)
    IF p_quantity < 1 AND p_quantity > 0 THEN
      v_subtract_amount := ROUND(p_quantity * 1000);
    ELSE
      v_subtract_amount := p_quantity;
    END IF;
  END IF;

  -- Lock and Update based on country
  IF p_country = 'germany' THEN
    SELECT stock_germany INTO v_current_stock FROM public.products WHERE id = p_product_id FOR UPDATE;
    IF v_current_stock < v_subtract_amount THEN
        RAISE EXCEPTION 'INSUFFICIENT_STOCK: %', p_product_id;
    END IF;
    UPDATE public.products SET stock_germany = stock_germany - v_subtract_amount WHERE id = p_product_id;
  ELSIF p_country = 'denmark' THEN
    SELECT stock_denmark INTO v_current_stock FROM public.products WHERE id = p_product_id FOR UPDATE;
    IF v_current_stock < v_subtract_amount THEN
        RAISE EXCEPTION 'INSUFFICIENT_STOCK: %', p_product_id;
    END IF;
    UPDATE public.products SET stock_denmark = stock_denmark - v_subtract_amount WHERE id = p_product_id;
  ELSE
    RAISE EXCEPTION 'Invalid country: %', p_country;
  END IF;

  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  RETURN updated_rows > 0;
END;
$$;

-- 2. Redefine create_order_atomic to be robust
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
  p_order_type TEXT DEFAULT 'regular',
  p_payment_fee DECIMAL DEFAULT 0
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
  v_item_sell_type TEXT;
  v_item_category TEXT;
  v_item_unit TEXT;
  v_save_quantity DECIMAL;
  v_save_subtotal DECIMAL;
  v_calculated_total DECIMAL := 0;
BEGIN
  -- Idempotency check
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_order_id FROM public.orders WHERE idempotency_key = p_idempotency_key LIMIT 1;
    IF v_existing_order_id IS NOT NULL THEN RETURN v_existing_order_id; END IF;
  END IF;

  -- 1. Process items and reserve stock
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (item->>'product_id')::UUID;
    v_quantity := (item->>'quantity')::DECIMAL;
    v_price := (item->>'price')::DECIMAL;
    v_item_sell_type := item->>'sell_type'; -- Passed from frontend
    
    -- Lookup from DB if sell_type not passed
    IF v_item_sell_type IS NULL THEN
        SELECT sell_type, LOWER(category), LOWER(unit) INTO v_item_sell_type, v_item_category, v_item_unit FROM public.products WHERE id = v_product_id;
    ELSE
        SELECT LOWER(category), LOWER(unit) INTO v_item_category, v_item_unit FROM public.products WHERE id = v_product_id;
    END IF;

    -- Calculate subtotal and quantity to save (Order record uses KG for loose items)
    IF v_item_sell_type = 'loose' OR v_item_unit = 'gram' OR (v_item_sell_type IS NULL AND v_item_category IN ('fresh', 'frozen')) THEN
      v_save_quantity := v_quantity / 1000.0;
      v_save_subtotal := (v_price * v_quantity) / 1000.0;
    ELSE
      -- Legacy fix for packets: if quantity < 1 (e.g. 0.001), treat as whole unit (e.g. 1)
      IF v_quantity < 1 AND v_quantity > 0 THEN
        v_save_quantity := ROUND(v_quantity * 1000);
      ELSE
        v_save_quantity := v_quantity;
      END IF;
      v_save_subtotal := v_price * v_save_quantity;
    END IF;
    
    v_calculated_total := v_calculated_total + v_save_subtotal;

    -- Deduct stock
    PERFORM public.reserve_stock(v_product_id, p_country, v_quantity);
  END LOOP;

  v_calculated_total := v_calculated_total + COALESCE(p_delivery_fee, 0) + COALESCE(p_payment_fee, 0);

  -- 2. Create Order
  INSERT INTO public.orders (
    user_id, country, payment_method, payment_status, total_amount, 
    status, pickup_point_id, delivery_address, idempotency_key, 
    delivery_method, order_type
  )
  VALUES (
    p_user_id, p_country, p_payment_method, 'pending', v_calculated_total, 
    'pending', p_pickup_point_id, p_delivery_address, p_idempotency_key,
    COALESCE(p_delivery_method, CASE WHEN p_delivery_address IS NOT NULL THEN 'home' ELSE 'pickup' END), 
    p_order_type
  )
  RETURNING id INTO v_order_id;

  -- 3. Create Order Items
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (item->>'product_id')::UUID;
    v_quantity := (item->>'quantity')::DECIMAL;
    v_price := (item->>'price')::DECIMAL;
    v_item_sell_type := item->>'sell_type';
    
    IF v_item_sell_type IS NULL THEN
        SELECT sell_type, LOWER(category), LOWER(unit) INTO v_item_sell_type, v_item_category, v_item_unit FROM public.products WHERE id = v_product_id;
    ELSE
        SELECT LOWER(category), LOWER(unit) INTO v_item_category, v_item_unit FROM public.products WHERE id = v_product_id;
    END IF;

    IF v_item_sell_type = 'loose' OR v_item_unit = 'gram' OR (v_item_sell_type IS NULL AND v_item_category IN ('fresh', 'frozen')) THEN
      v_save_quantity := v_quantity / 1000.0;
      v_save_subtotal := (v_price * v_quantity) / 1000.0;
    ELSE
      -- Legacy fix for packets: if quantity < 1 (e.g. 0.001), treat as whole unit (e.g. 1)
      IF v_quantity < 1 AND v_quantity > 0 THEN
        v_save_quantity := ROUND(v_quantity * 1000);
      ELSE
        v_save_quantity := v_quantity;
      END IF;
      v_save_subtotal := v_price * v_save_quantity;
    END IF;

    INSERT INTO public.order_items (order_id, product_id, quantity, price, subtotal)
    VALUES (v_order_id, v_product_id, v_save_quantity, v_price, v_save_subtotal);
  END LOOP;
  
  RETURN v_order_id;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.create_order_atomic(uuid, text, text, numeric, jsonb, uuid, text, numeric, text, text, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_stock(uuid, text, decimal) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_atomic(uuid, text, text, numeric, jsonb, uuid, text, numeric, text, text, text, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_stock(uuid, text, decimal) TO service_role;
