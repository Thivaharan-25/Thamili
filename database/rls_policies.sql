-- ============================================
-- Thamili Mobile App - Row Level Security (RLS) Policies
-- Supabase PostgreSQL Database
-- ============================================

-- Create a security definer function to check if user is admin
-- This function bypasses RLS to prevent infinite recursion
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Temporarily disable RLS for this query to prevent recursion
  SET LOCAL row_security = off;
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 1. USERS TABLE POLICIES
-- ============================================

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can view all users
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (is_admin());

-- Admins can update all users
CREATE POLICY "Admins can update all users"
  ON users FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- 2. PRODUCTS TABLE POLICIES
-- ============================================

-- Everyone (authenticated and unauthenticated) can view active products
CREATE POLICY "Anyone can view active products"
  ON products FOR SELECT
  USING (active = true);

-- Only admins can insert products
CREATE POLICY "Admins can insert products"
  ON products FOR INSERT
  WITH CHECK (is_admin());

-- Only admins can update products
CREATE POLICY "Admins can update products"
  ON products FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Only admins can delete products
CREATE POLICY "Admins can delete products"
  ON products FOR DELETE
  USING (is_admin());

-- ============================================
-- 3. PICKUP POINTS TABLE POLICIES
-- ============================================

-- Everyone can view active pickup points
CREATE POLICY "Anyone can view active pickup points"
  ON pickup_points FOR SELECT
  USING (active = true);

-- Only admins can insert pickup points
CREATE POLICY "Admins can insert pickup points"
  ON pickup_points FOR INSERT
  WITH CHECK (is_admin());

-- Only admins can update pickup points
CREATE POLICY "Admins can update pickup points"
  ON pickup_points FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Only admins can delete pickup points
CREATE POLICY "Admins can delete pickup points"
  ON pickup_points FOR DELETE
  USING (is_admin());

-- ============================================
-- 4. ORDERS TABLE POLICIES
-- ============================================

-- Users can view their own orders
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (
    auth.uid() = user_id 
    OR is_admin()
    OR EXISTS (
      SELECT 1 FROM delivery_schedule 
      WHERE order_id = orders.id AND delivery_partner_id = auth.uid()
    )
  );

-- Users can create their own orders
CREATE POLICY "Users can create own orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending or confirmed orders (for cancellation)
CREATE POLICY "Users can update/cancel own orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id AND status IN ('pending', 'confirmed')
  )
  WITH CHECK (
    auth.uid() = user_id AND status IN ('pending', 'confirmed', 'canceled', 'cancelled')
  );

-- Admins can view all orders
CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  USING (is_admin());

-- Admins can update all orders (for status changes)
CREATE POLICY "Admins can update all orders"
  ON orders FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================
-- 5. ORDER ITEMS TABLE POLICIES
-- ============================================

-- Users can view order items for their own orders
CREATE POLICY "Users can view own order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Users can create order items for their own orders
CREATE POLICY "Users can create own order items"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Admins can view all order items
CREATE POLICY "Admins can view all order items"
  ON order_items FOR SELECT
  USING (is_admin());

-- Admins can insert order items
CREATE POLICY "Admins can insert order items"
  ON order_items FOR INSERT
  WITH CHECK (is_admin());

-- Admins can update order items
CREATE POLICY "Admins can update order items"
  ON order_items FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admins can delete order items
CREATE POLICY "Admins can delete order items"
  ON order_items FOR DELETE
  USING (is_admin());

-- ============================================
-- END OF RLS POLICIES
-- ============================================

