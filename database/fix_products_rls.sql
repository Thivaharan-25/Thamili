-- =====================================================
-- FINAL FIX: RLS VIEW PERMISSIONS & RPC BYPASS
-- =====================================================
-- IMPORTANT: Run this in Supabase SQL Editor.
-- This fix allows Admins to SEE inactive products. 
-- Previously, only active products were viewable.
-- =====================================================

-- 1. Ensure is_admin() is robust and bypasses RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 2. Update PRODUCTS table Policies
-- Drop the old policies first
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
DROP POLICY IF EXISTS "Admins can view all products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;

-- Everyone can still see active products
CREATE POLICY "Anyone can view active products"
ON public.products FOR SELECT
USING (active = true);

-- Admins can see EVERYTHING (even inactive products)
CREATE POLICY "Admins can view all products"
ON public.products FOR SELECT
TO authenticated
USING (public.is_admin());

-- Admins can update EVERYTHING (bypass policy violation)
CREATE POLICY "Admins can update products"
ON public.products FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 3. Create/Update the Admin Bypass RPC
CREATE OR REPLACE FUNCTION public.admin_toggle_product_status(p_id UUID, p_active BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  IF public.is_admin() THEN
    UPDATE public.products 
    SET active = p_active, updated_at = NOW()
    WHERE id = p_id;
  ELSE
    RAISE EXCEPTION 'Unauthorized';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_toggle_product_status(UUID, BOOLEAN) TO authenticated;

-- 4. ENSURE YOUR ROLE IS ADMIN
-- Change this to your actual email (check your Profile page)
UPDATE public.users SET role = 'admin' WHERE email = 'admin@thamili.app';

-- 5. DIAGNOSTIC Check
-- SELECT id, email, role, public.is_admin() FROM public.users WHERE id = auth.uid();
