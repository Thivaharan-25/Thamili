-- =====================================================
-- FIX FOR ORDER CANCELLATION BY CUSTOMERS
-- =====================================================
-- This script allows customers to update their own orders 
-- specifically for status changes (cancellation) and 
-- payment status updates (refunds).
-- =====================================================

-- 1. DROP old restrictive policies
DROP POLICY IF EXISTS "Users can update own pending orders" ON "orders";
DROP POLICY IF EXISTS "Users can cancel own orders" ON "orders";

-- 2. CREATE improved update policy for users
-- This allows updates if:
--   a) The user owns the order
--   b) The order status is currently 'pending' or 'confirmed'
--   c) The NEW status is 'pending', 'confirmed', or 'canceled'
--   d) The user_id remains the same (safety check)

CREATE POLICY "Users can update/cancel own orders" ON "orders" FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() 
  AND status IN ('pending', 'confirmed')
)
WITH CHECK (
  user_id = auth.uid() 
  AND status IN ('pending', 'confirmed', 'canceled')
  AND (
    payment_status IN ('pending', 'paid', 'refunded', 'failed')
  )
);

-- 3. VERIFY policies on orders table
SELECT policyname, tablename, cmd 
FROM pg_policies 
WHERE tablename = 'orders'
ORDER BY policyname;
