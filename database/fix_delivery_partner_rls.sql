-- =====================================================
-- STEP 1: EMERGENCY RESET (Run this first to restore login)
-- =====================================================
-- This clears the "Infinite Recursion" policies immediately.
-- =====================================================

DROP POLICY IF EXISTS "Partners can view customer profiles" ON public.users;
DROP POLICY IF EXISTS "Partners can view assigned orders" ON public.orders;

-- Verify they are gone (the list below should NOT contain the ones above)
SELECT policyname, tablename FROM pg_policies WHERE tablename IN ('users', 'orders');

-- =====================================================
-- STEP 2: THE ROBUST FIX (Run this after Step 1)
-- =====================================================
-- This uses PL/pgSQL to bypass the recursion loop forever.
-- =====================================================

-- 2a. Create the safe "Internal Access" functions
CREATE OR REPLACE FUNCTION public.is_user_role(p_user_id uuid, p_role text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role text;
BEGIN
  SELECT role INTO v_role FROM public.users WHERE id = p_user_id;
  RETURN v_role = p_role;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_view_order_assignment(p_order_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.delivery_schedule 
    WHERE order_id = p_order_id AND delivery_partner_id = p_user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.can_view_customer_of_partner(p_target_user_id uuid, p_auth_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.delivery_schedule ds ON ds.order_id = o.id
    WHERE o.user_id = p_target_user_id AND ds.delivery_partner_id = p_auth_user_id
  );
END;
$$;

-- 2b. Apply the clean, safe policies
DROP POLICY IF EXISTS "final_partner_user_policy" ON public.users;
CREATE POLICY "final_partner_user_policy" ON public.users FOR SELECT
USING (
  id = auth.uid() 
  OR is_user_role(auth.uid(), 'admin')
  OR can_view_customer_of_partner(id, auth.uid())
);

DROP POLICY IF EXISTS "final_partner_order_policy" ON public.orders;
CREATE POLICY "final_partner_order_policy" ON public.orders FOR SELECT
USING (
  user_id = auth.uid()
  OR is_user_role(auth.uid(), 'admin')
  OR can_view_order_assignment(id, auth.uid())
);

-- =====================================================
-- VERIFICATION
-- =====================================================
SELECT policyname, tablename, cmd 
FROM pg_policies 
WHERE tablename IN ('users', 'orders', 'delivery_schedule', 'pickup_points')
ORDER BY tablename;
