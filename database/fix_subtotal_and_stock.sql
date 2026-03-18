-- FINAL CONSOLIDATED FIX: GRAMS FORMAT HANDLING (v8)
-- Run this in your Supabase SQL Editor

-- 1. AGGRESSIVE CLEANUP: Remove ALL previous versions
DO $$ 
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT oid::regprocedure as sig FROM pg_proc WHERE proname = 'create_order_atomic') 
    LOOP EXECUTE 'DROP FUNCTION ' || r.sig; END LOOP;
    
    FOR r IN (SELECT oid::regprocedure as sig FROM pg_proc WHERE proname = 'reserve_stock') 
    LOOP EXECUTE 'DROP FUNCTION ' || r.sig; END LOOP;
END $$;

-- 2. Updated reserve_stock (Handles "Grams Format" input)
CREATE OR REPLACE FUNCTION public.reserve_stock(
  p_product_id UUID, p_country TEXT, p_quantity DECIMAL
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_category TEXT;
  v_current_stock DECIMAL;
  v_subtract_amount DECIMAL;
  updated_rows INTEGER;
BEGIN
  -- Get category to determine if we need to convert grams format to kg
  SELECT LOWER(category) INTO v_category FROM public.products WHERE id = p_product_id;
  
  -- Logic: If fresh/frozen, the input is in "Grams Format" (e.g. 100) 
  -- but DB is in "KG Units" (e.g. 11.8). So we divide by 1000.
  IF v_category IN ('fresh', 'frozen') THEN
    v_subtract_amount := p_quantity / 1000.0;
  ELSE
    v_subtract_amount := p_quantity;
  END IF;

  IF p_country = 'germany' THEN
    SELECT stock_germany INTO v_current_stock FROM public.products WHERE id = p_product_id;
    UPDATE public.products SET stock_germany = stock_germany - v_subtract_amount 
    WHERE id = p_product_id AND stock_germany >= v_subtract_amount;
  ELSE
    SELECT stock_denmark INTO v_current_stock FROM public.products WHERE id = p_product_id;
    UPDATE public.products SET stock_denmark = stock_denmark - v_subtract_amount 
    WHERE id = p_product_id AND stock_denmark >= v_subtract_amount;
  END IF;

  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  
  IF updated_rows = 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK: Product % needs % kg (% raw), but only % kg is available in %', 
      p_product_id, v_subtract_amount, p_quantity, v_current_stock, p_country;
  END IF;

  RETURN TRUE;
END; $$;

-- 3. Updated create_order_atomic (Handles Grams Format -> KG Storage)
CREATE OR REPLACE FUNCTION public.create_order_atomic(
  p_user_id UUID, p_country TEXT, p_payment_method TEXT, p_total_amount DECIMAL,
  p_items JSONB, p_pickup_point_id UUID DEFAULT NULL, p_delivery_address TEXT DEFAULT NULL,
  p_delivery_fee DECIMAL DEFAULT 0, p_idempotency_key TEXT DEFAULT NULL,
  p_delivery_method TEXT DEFAULT NULL, p_order_type TEXT DEFAULT 'regular', p_payment_fee DECIMAL DEFAULT 0
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order_id UUID; v_existing_order_id UUID; item JSONB;
  v_product_id UUID; v_quantity DECIMAL; v_price DECIMAL;
  v_category TEXT; v_save_quantity DECIMAL; v_save_subtotal DECIMAL;
  v_calculated_total DECIMAL := 0;
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_order_id FROM public.orders WHERE idempotency_key = p_idempotency_key LIMIT 1;
    IF v_existing_order_id IS NOT NULL THEN RETURN v_existing_order_id; END IF;
  END IF;

  -- 1. Validate Stock (using the converter function)
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (item->>'product_id')::UUID;
    v_quantity := (item->>'quantity')::DECIMAL;
    v_price := (item->>'price')::DECIMAL;
    
    SELECT LOWER(category) INTO v_category FROM public.products WHERE id = v_product_id;
    
    -- Subtotal math for the order record
    IF v_category IN ('fresh', 'frozen') THEN
      v_save_subtotal := (v_price * v_quantity) / 1000.0;
    ELSE
      v_save_subtotal := v_price * v_quantity;
    END IF;
    
    v_calculated_total := v_calculated_total + v_save_subtotal;

    -- Deduct stock (Function handles grams->kg conversion internally)
    PERFORM public.reserve_stock(v_product_id, p_country, v_quantity);
  END LOOP;

  v_calculated_total := v_calculated_total + COALESCE(p_delivery_fee, 0) + COALESCE(p_payment_fee, 0);

  -- 2. Create Order
  INSERT INTO public.orders (user_id, country, payment_method, payment_status, total_amount, status, pickup_point_id, delivery_address, idempotency_key, delivery_method, order_type)
  VALUES (p_user_id, p_country, p_payment_method, 'pending', v_calculated_total, 'pending', p_pickup_point_id, p_delivery_address, p_idempotency_key,
    COALESCE(p_delivery_method, CASE WHEN p_delivery_address IS NOT NULL THEN 'home' ELSE 'pickup' END), p_order_type)
  RETURNING id INTO v_order_id;

  -- 3. Create Order Items (Converting Format -> KG for storage)
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (item->>'product_id')::UUID;
    v_quantity := (item->>'quantity')::DECIMAL;
    v_price := (item->>'price')::DECIMAL;
    SELECT LOWER(category) INTO v_category FROM public.products WHERE id = v_product_id;

    IF v_category IN ('fresh', 'frozen') THEN
      v_save_quantity := v_quantity / 1000.0;
      v_save_subtotal := (v_price * v_quantity) / 1000.0;
    ELSE
      v_save_quantity := v_quantity;
      v_save_subtotal := v_price * v_quantity;
    END IF;

    INSERT INTO public.order_items (order_id, product_id, quantity, price, subtotal)
    VALUES (v_order_id, v_product_id, v_save_quantity, v_price, v_save_subtotal);
  END LOOP;
  
  RETURN v_order_id;
END; $$;

-- 4. Re-grant permissions
GRANT EXECUTE ON FUNCTION public.create_order_atomic(uuid, text, text, numeric, jsonb, uuid, text, numeric, text, text, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_stock(uuid, text, decimal) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_atomic(uuid, text, text, numeric, jsonb, uuid, text, numeric, text, text, text, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_stock(uuid, text, decimal) TO service_role;

-- 5. Data Migration (Fix existing data)
UPDATE public.order_items oi 
SET quantity = oi.quantity / 1000.0,
    subtotal = (oi.price * (oi.quantity / 1000.0))
FROM public.products p 
WHERE oi.product_id = p.id 
  AND LOWER(p.category) IN ('fresh', 'frozen') 
  AND oi.quantity >= 100.0;

UPDATE public.orders o 
SET total_amount = (SELECT SUM(subtotal) FROM public.order_items WHERE order_id = o.id) + 
    COALESCE((CASE WHEN delivery_method = 'home' THEN 5.0 ELSE 0 END), 0)
WHERE id IN (SELECT DISTINCT order_id FROM public.order_items oi JOIN public.products p ON oi.product_id = p.id WHERE LOWER(p.category) IN ('fresh', 'frozen'));
