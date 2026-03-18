-- =====================================================
-- DEFINITIVE FIX FOR ORDER STATUS CONSTRAINTS AND RLS
-- =====================================================
-- This script fixes the 23514 (Check Constraint) error 
-- and ensures customers can cancel their own orders.
-- =====================================================

-- 1. FIX ORDERS STATUS CHECK CONSTRAINT
-- We drop and recreate it to include both 'canceled' and 'cancelled'
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders 
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending', 'confirmed', 'out_for_delivery', 'delivered', 'canceled', 'cancelled'));

-- 2. FIX ORDERS PAYMENT STATUS CHECK CONSTRAINT
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_payment_status_check;

ALTER TABLE public.orders 
ADD CONSTRAINT orders_payment_status_check 
CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));

-- 3. DROP old restrictive policies
DROP POLICY IF EXISTS "Users can update own pending orders" ON "orders";
DROP POLICY IF EXISTS "Users can update/cancel own orders" ON "orders";

-- 4. CREATE definitive update policy for users
-- This allows updates if:
--   a) The user owns the order
--   b) The order status is currently 'pending' or 'confirmed'
--   c) The NEW status is 'pending', 'confirmed', 'canceled', or 'cancelled'
--   d) The user_id remains the same (safety check)

CREATE POLICY "Users can update/cancel own orders" ON "orders" FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() 
  AND status IN ('pending', 'confirmed')
)
WITH CHECK (
  user_id = auth.uid() 
  AND status IN ('pending', 'confirmed', 'canceled', 'cancelled')
);

-- 5. VERIFY constraints and policies
SELECT 
    conname as constraint_name, 
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname IN ('orders_status_check', 'orders_payment_status_check');

SELECT policyname, tablename, cmd 
FROM pg_policies 
WHERE tablename = 'orders'
ORDER BY policyname;
