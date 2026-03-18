-- =====================================================
-- MIGRATION: SOFT DELETE FOR PRODUCTS
-- =====================================================

-- 1. Add is_deleted column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- 2. Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_products_is_deleted ON public.products(is_deleted);

-- 3. Update existing RLS policies to exclude soft-deleted products for customers
-- (Admins can still see them if needed, but usually even admins want them hidden from main lists)

-- Update for customers to only see active AND not deleted products
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
CREATE POLICY "Anyone can view active products" ON public.products
FOR SELECT USING (active = true AND is_deleted = false);

-- Ensure admins can see soft-deleted products ONLY if they specifically want to, 
-- but for the main AdminProductsScreen, we'll filter them in the service layer.
-- The existing admin policy should allow all access.
-- We might need a separate RPC if we want to "really" delete or restore later.

-- Optional: Ensure trigger still works (it should as it's standard)
COMMENT ON COLUMN public.products.is_deleted IS 'Soft delete flag to preserve order history';
