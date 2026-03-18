-- ============================================
-- Diagnostic Queries for Van Sales Issue
-- Run these to diagnose why orders aren't being created
-- ============================================

-- 1. Check if order_type column exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'order_type';

-- 2. Check create_order_atomic function signature
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_result(oid) as return_type
FROM pg_proc 
WHERE proname = 'create_order_atomic';

-- 3. Check recent orders (should see orders if function is working)
SELECT 
  id,
  user_id,
  order_type,
  status,
  payment_status,
  total_amount,
  created_at
FROM orders
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check recent order_items
SELECT 
  oi.id,
  oi.order_id,
  oi.product_id,
  oi.quantity,
  oi.price,
  o.order_type,
  o.created_at
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
ORDER BY o.created_at DESC
LIMIT 10;

-- 5. Check if function has SECURITY DEFINER
SELECT 
  proname,
  prosecdef as is_security_definer,
  proconfig
FROM pg_proc 
WHERE proname = 'create_order_atomic';

-- 6. Check RLS policies on orders table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'orders';

-- 7. Test if function can be called (replace with actual values)
-- This will show if function signature matches
/*
SELECT create_order_atomic(
  '00000000-0000-0000-0000-000000000000'::uuid, -- user_id
  'germany', -- country
  'cod', -- payment_method
  100.00, -- total_amount
  '[]'::jsonb, -- items (empty for test)
  NULL, -- pickup_point_id
  NULL, -- delivery_address
  0, -- delivery_fee
  'test-key-' || now()::text, -- idempotency_key
  'pickup', -- delivery_method
  'van_sale' -- order_type
);
*/

