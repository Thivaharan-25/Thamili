-- FINAL COMPREHENSIVE FIX: STOCK DEDUCTION & VAN SALES STATUS (v11)
-- Run this in your Supabase SQL Editor

-- 1. Ensure required columns exist
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_fee DECIMAL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'regular';

-- 2. Improved reserve_stock (Handles Grams Input vs Mixed DB Units)
CREATE OR REPLACE FUNCTION public.reserve_stock(
  p_product_id UUID, p_country TEXT, p_quantity DECIMAL
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sell_type TEXT;
  v_unit TEXT;
  v_category TEXT;
  v_current_stock DECIMAL;
  v_subtract_amount DECIMAL;
  updated_rows INTEGER;
  v_is_loose BOOLEAN;
BEGIN
  -- Get all markers
  SELECT LOWER(COALESCE(sell_type, '')), LOWER(COALESCE(unit, '')), LOWER(COALESCE(category, '')) 
  INTO v_sell_type, v_unit, v_category 
  FROM public.products WHERE id = p_product_id;
  
  -- Match detection logic
  IF v_sell_type = 'loose' 
     OR v_unit IN ('kg', 'gram', 'g', 'kilogram') 
     OR (v_category IN ('fresh', 'frozen') AND v_unit NOT IN ('packet', 'pkt', 'piece', 'pc', 'box', 'bottle'))
  THEN
    v_is_loose := TRUE;
  ELSE
    v_is_loose := FALSE;
  END IF;

  -- CALCULATE SUBTRACTION AMOUNT
  -- p_quantity is ALWAYS in Grams (from orderService or deliveryService)
  IF v_is_loose THEN
    -- Loose Stock is stored in Grams (e.g. 5000 for 5Kg)
    -- So we subtract raw Grams
    v_subtract_amount := p_quantity;
  ELSE
    -- Pack Stock is stored in Units (e.g. 50 for 50 packets)
    -- Input is 1000 for 1 packet, so we divide by 1000 to get 1 Unit.
    v_subtract_amount := p_quantity / 1000.0;
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
    RAISE EXCEPTION 'INSUFFICIENT_STOCK: Product % needs % units/grams, but only % is available in %', 
      p_product_id, v_subtract_amount, v_current_stock, p_country;
  END IF;

  RETURN TRUE;
END; $$;

-- 3. Updated create_order_atomic (Standard Units for order_items)
CREATE OR REPLACE FUNCTION public.create_order_atomic(
  p_user_id UUID, p_country TEXT, p_payment_method TEXT, p_total_amount DECIMAL,
  p_items JSONB, p_pickup_point_id UUID DEFAULT NULL, p_delivery_address TEXT DEFAULT NULL,
  p_delivery_fee DECIMAL DEFAULT 0, p_idempotency_key TEXT DEFAULT NULL,
  p_delivery_method TEXT DEFAULT NULL, p_order_type TEXT DEFAULT 'regular', p_payment_fee DECIMAL DEFAULT 0
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_order_id UUID; v_existing_order_id UUID; item JSONB;
  v_product_id UUID; v_quantity DECIMAL; v_price DECIMAL;
  v_sell_type TEXT; v_unit TEXT; v_category TEXT;
  v_save_quantity DECIMAL; v_save_subtotal DECIMAL;
  v_calculated_total DECIMAL := 0;
  v_status TEXT; v_payment_status TEXT;
  v_is_loose BOOLEAN;
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_order_id FROM public.orders WHERE idempotency_key = p_idempotency_key LIMIT 1;
    IF v_existing_order_id IS NOT NULL THEN RETURN v_existing_order_id; END IF;
  END IF;

  -- 1. Validate Stock and Calculate Total
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (item->>'product_id')::UUID;
    v_quantity := (item->>'quantity')::DECIMAL;
    v_price := (item->>'price')::DECIMAL;
    
    SELECT LOWER(COALESCE(sell_type, '')), LOWER(COALESCE(unit, '')), LOWER(COALESCE(category, '')) 
    INTO v_sell_type, v_unit, v_category 
    FROM public.products WHERE id = v_product_id;
    
    -- Detection logic
    IF v_sell_type = 'loose' 
       OR v_unit IN ('kg', 'gram', 'g', 'kilogram') 
       OR (v_category IN ('fresh', 'frozen') AND v_unit NOT IN ('packet', 'pkt', 'piece', 'pc', 'box', 'bottle'))
    THEN
      v_is_loose := TRUE;
    ELSE
      v_is_loose := FALSE;
    END IF;

    -- Subtotal math (p_quantity is Grams, v_price is per KG/Unit)
    -- 100g at 15/kg = (15 * 100) / 1000 = 1.5. CORRECT.
    -- 1000g (1pkt) at 15/pkt = (15 * 1000) / 1000 = 15. CORRECT.
    v_save_subtotal := (v_price * v_quantity) / 1000.0;
    
    v_calculated_total := v_calculated_total + v_save_subtotal;

    -- Deduct stock
    PERFORM public.reserve_stock(v_product_id, p_country, v_quantity);
  END LOOP;

  v_calculated_total := v_calculated_total + COALESCE(p_delivery_fee, 0) + COALESCE(p_payment_fee, 0);

  -- Determine initial status (Van Sales are immediate)
  IF p_order_type = 'van_sale' THEN
    v_status := 'delivered';
    v_payment_status := 'paid';
  ELSE
    v_status := 'pending';
    v_payment_status := 'pending';
  END IF;

  -- 2. Create Order
  INSERT INTO public.orders (
    user_id, country, payment_method, payment_status, total_amount, status, 
    pickup_point_id, delivery_address, idempotency_key, delivery_method, order_type,
    payment_fee, delivery_fee
  )
  VALUES (
    p_user_id, p_country, p_payment_method, v_payment_status, v_calculated_total, v_status, 
    p_pickup_point_id, p_delivery_address, p_idempotency_key,
    COALESCE(p_delivery_method, CASE WHEN p_delivery_address IS NOT NULL THEN 'home' ELSE 'pickup' END), 
    p_order_type,
    COALESCE(p_payment_fee, 0),
    COALESCE(p_delivery_fee, 0)
  )
  RETURNING id INTO v_order_id;

  -- 3. Create Order Items (Saving in Standard Units: Kg or Units)
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (item->>'product_id')::UUID;
    v_quantity := (item->>'quantity')::DECIMAL;
    v_price := (item->>'price')::DECIMAL;
    
    v_save_quantity := v_quantity / 1000.0;
    v_save_subtotal := (v_price * v_quantity) / 1000.0;

    INSERT INTO public.order_items (order_id, product_id, quantity, price, subtotal)
    VALUES (v_order_id, v_product_id, v_save_quantity, v_price, v_save_subtotal);
  END LOOP;
  
  RETURN v_order_id;
END; $$;
