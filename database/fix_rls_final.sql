-- =====================================================
-- FINAL CONSOLIDATED RLS FIX (Recursion-Proof)
-- =====================================================
-- This script fixes the "Infinite Recursion" error (42P17)
-- and ensures Delivery Partners can see:
-- 1. Their assigned Orders
-- 2. The Items in those orders
-- 3. The Customer profiles for those orders
-- =====================================================

-- 0. EMERGENCY CLEANUP: Drop problematic existing policies
DROP POLICY IF EXISTS "final_partner_user_policy" ON users;
DROP POLICY IF EXISTS "final_partner_order_policy" ON orders;
DROP POLICY IF EXISTS "Delivery partners can view assigned order items" ON order_items;
DROP POLICY IF EXISTS "Delivery partners can view assigned orders" ON orders;
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can view own order items" ON order_items;
DROP POLICY IF EXISTS "Delivery partners can view their schedules" ON delivery_schedule;
DROP POLICY IF EXISTS "Delivery partners can update their schedules" ON delivery_schedule;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;

-- 1. RE-CREATE SECURITY DEFINER HELPERS (Bypasses RLS recursion)
CREATE OR REPLACE FUNCTION public.check_user_role(p_uid uuid, p_role text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.users WHERE id = p_uid AND role = p_role);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_assigned_partner(p_order_id uuid, p_uid uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.delivery_schedule 
    WHERE order_id = p_order_id AND delivery_partner_id = p_uid
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_customer_of_partner(p_customer_id uuid, p_partner_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.delivery_schedule ds ON ds.order_id = o.id
    WHERE o.user_id = p_customer_id AND ds.delivery_partner_id = p_partner_id
  );
END;
$$;

-- 2. APPLY CLEAN & SAFE POLICIES

-- --- USERS TABLE ---
CREATE POLICY "users_base_policy" ON users FOR SELECT
USING (
  id = auth.uid() 
  OR check_user_role(auth.uid(), 'admin')
  OR is_customer_of_partner(id, auth.uid())
);

-- --- ORDERS TABLE ---
-- Note: 'delivery_partner' is the correct role name in index.ts
CREATE POLICY "orders_base_policy" ON orders FOR SELECT
USING (
  user_id = auth.uid()
  OR check_user_role(auth.uid(), 'admin')
  OR is_assigned_partner(id, auth.uid())
);

-- --- ORDER_ITEMS TABLE ---
CREATE POLICY "order_items_base_policy" ON order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND (
      orders.user_id = auth.uid() 
      OR check_user_role(auth.uid(), 'admin')
      OR is_assigned_partner(orders.id, auth.uid())
    )
  )
);

-- --- DELIVERY_SCHEDULE TABLE ---
CREATE POLICY "delivery_schedule_base_policy" ON delivery_schedule FOR SELECT
USING (
  delivery_partner_id = auth.uid()
  OR check_user_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.orders WHERE orders.id = delivery_schedule.order_id AND orders.user_id = auth.uid())
);

-- 3. VERIFY
SELECT policyname, tablename, cmd 
FROM pg_policies 
WHERE tablename IN ('users', 'orders', 'order_items', 'delivery_schedule')
ORDER BY tablename;
