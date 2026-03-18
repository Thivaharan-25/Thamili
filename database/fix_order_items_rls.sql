-- =====================================================
-- FIX: Order Items Visibility for Delivery Partners
-- =====================================================
-- The previous policy only allowed the customer (user_id) to see items.
-- This adds permission for the assigned delivery partner.
-- =====================================================

-- 1. Create a policy for delivery partners to view order items
-- Note: SELECT policies are additive (OR-ed together) in Supabase
DROP POLICY IF EXISTS "Delivery partners can view assigned order items" ON order_items;

CREATE POLICY "Delivery partners can view assigned order items"
ON order_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM delivery_schedule
    WHERE delivery_schedule.order_id = order_items.order_id
    AND delivery_schedule.delivery_partner_id = auth.uid()
  )
);

-- 2. Ensure orders table itself is correctly accessible (Safety Check)
-- The 'delivery_partner' role often gets confused with 'delivery' in some scripts.
-- This ensures the orders table check is role-agnostic and based only on assignment.
DROP POLICY IF EXISTS "Delivery partners can view assigned orders" ON orders;
CREATE POLICY "Delivery partners can view assigned orders"
ON orders FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM delivery_schedule
    WHERE delivery_schedule.order_id = orders.id
    AND delivery_schedule.delivery_partner_id = auth.uid()
  )
);

-- 3. Verify the changes
SELECT policyname, tablename, cmd 
FROM pg_policies 
WHERE tablename IN ('orders', 'order_items')
ORDER BY tablename;
