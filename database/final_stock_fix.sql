-- ============================================
-- FINAL MASTER STOCK & PRICE FIX (UNIFIED)
-- Handles: Grams to KG, Packets/Pieces to units
-- Unified scaling: All inputs are in milli-units (grams)
-- ============================================

-- 1. Redefine reserve_stock with unified scaling
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
  v_subtract_amount DECIMAL;
  v_current_stock DECIMAL;
  updated_rows INTEGER;
BEGIN
  -- ALL inputs from the new frontend (orderService.ts) are scaled by 1000
  -- (e.g. 200g = 200, 1 packet = 1000, 1 piece = 1000)
  -- The stock in the DB is always in base units (KG or piece count)
  v_subtract_amount := p_quantity / 1000.0;

  -- Lock and Update based on country
  IF p_country = 'germany' THEN
    SELECT stock_germany INTO v_current_stock FROM public.products WHERE id = p_product_id FOR UPDATE;
    IF v_current_stock < v_subtract_amount THEN
        RAISE EXCEPTION 'INSUFFICIENT_STOCK: Product % needs % (scaled), but only % is available in germany', p_product_id, v_subtract_amount, v_current_stock;
    END IF;
    UPDATE public.products SET stock_germany = stock_germany - v_subtract_amount WHERE id = p_product_id;
  ELSIF p_country = 'denmark' THEN
    SELECT stock_denmark INTO v_current_stock FROM public.products WHERE id = p_product_id FOR UPDATE;
    IF v_current_stock < v_subtract_amount THEN
        RAISE EXCEPTION 'INSUFFICIENT_STOCK: Product % needs % (scaled), but only % is available in denmark', p_product_id, v_subtract_amount, v_current_stock;
    END IF;
    UPDATE public.products SET stock_denmark = stock_denmark - v_subtract_amount WHERE id = p_product_id;
  ELSE
    RAISE EXCEPTION 'Invalid country: %', p_country;
  END IF;

  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  RETURN updated_rows > 0;
END;
$$;

-- 2. Redefine create_order_atomic with unified scaling
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
    
    -- Unified scaling logic: v_quantity is always in milli-units (scaled by 1000)
    v_save_quantity := v_quantity / 1000.0;
    v_save_subtotal := v_price * v_save_quantity;
    
    v_calculated_total := v_calculated_total + v_save_subtotal;

    -- Deduct stock (reserve_stock also handles the 1000.0 division)
    PERFORM public.reserve_stock(v_product_id, p_country, v_quantity);
  END LOOP;

  v_calculated_total := v_calculated_total + COALESCE(p_delivery_fee, 0) + COALESCE(p_payment_fee, 0);

  -- 2. Create Order
  INSERT INTO public.orders (
    user_id, country, payment_method, payment_status, total_amount, 
    status, pickup_point_id, delivery_address, idempotency_key, 
    delivery_method, order_type, payment_fee, delivery_fee
  )
  VALUES (
    p_user_id, p_country, p_payment_method, 'pending', v_calculated_total, 
    'pending', p_pickup_point_id, p_delivery_address, p_idempotency_key,
    COALESCE(p_delivery_method, CASE WHEN p_delivery_address IS NOT NULL THEN 'home' ELSE 'pickup' END), 
    p_order_type, p_payment_fee, p_delivery_fee
  )
  RETURNING id INTO v_order_id;

  -- 3. Create Order Items
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (item->>'product_id')::UUID;
    v_quantity := (item->>'quantity')::DECIMAL;
    v_price := (item->>'price')::DECIMAL;
    
    v_save_quantity := v_quantity / 1000.0;
    v_save_subtotal := v_price * v_save_quantity;

    INSERT INTO public.order_items (order_id, product_id, quantity, price, subtotal)
    VALUES (v_order_id, v_product_id, v_save_quantity, v_price, v_save_subtotal);
  END LOOP;
  
  RETURN v_order_id;
END;
$$;
