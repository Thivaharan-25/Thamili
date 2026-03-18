-- ============================================
-- Thamili Mobile App - Test Database Queries
-- Supabase PostgreSQL Database
-- Task 5.4: Test Database Queries
-- ============================================
-- This file contains test queries for verifying database setup
-- Run these queries in Supabase SQL Editor to test CRUD operations

-- ============================================
-- 1. VERIFICATION QUERIES
-- ============================================

-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check RLS is enabled on all tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check indexes exist
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ============================================
-- 2. USERS TABLE QUERIES
-- ============================================

-- View all users (admin only)
SELECT id, email, name, role, country_preference, created_at
FROM users
ORDER BY created_at DESC;

-- Count users by role
SELECT role, COUNT(*) as count
FROM users
GROUP BY role;

-- Find admin users
SELECT id, email, name
FROM users
WHERE role = 'admin';

-- ============================================
-- 3. PRODUCTS TABLE QUERIES
-- ============================================

-- View all active products
SELECT id, name, category, price_germany, price_denmark, stock_germany, stock_denmark, active
FROM products
WHERE active = true
ORDER BY category, name;

-- Count products by category
SELECT category, COUNT(*) as count
FROM products
GROUP BY category;

-- Find products with low stock (less than 20) in Germany
SELECT id, name, stock_germany as stock
FROM products
WHERE stock_germany < 20 AND active = true
ORDER BY stock ASC;

-- Get products for Germany
SELECT id, name, price_germany as price, stock_germany as stock
FROM products
WHERE active = true
ORDER BY name;

-- Get products for Denmark
SELECT id, name, price_denmark as price, stock_denmark as stock
FROM products
WHERE active = true
ORDER BY name;

-- ============================================
-- 4. PICKUP POINTS TABLE QUERIES
-- ============================================

-- View all active pickup points
SELECT id, name, address, country, delivery_fee, active
FROM pickup_points
WHERE active = true
ORDER BY country, name;

-- Get pickup points for Germany
SELECT id, name, address, delivery_fee
FROM pickup_points
WHERE country = 'germany' AND active = true
ORDER BY name;

-- Get pickup points for Norway
SELECT id, name, address, delivery_fee
FROM pickup_points
WHERE country = 'norway' AND active = true
ORDER BY name;

-- Count pickup points by country
SELECT country, COUNT(*) as count
FROM pickup_points
WHERE active = true
GROUP BY country;

-- ============================================
-- 5. ORDERS TABLE QUERIES
-- ============================================

-- View all orders (admin only)
SELECT 
  o.id,
  o.order_date,
  o.status,
  o.total_amount,
  o.country,
  o.payment_method,
  o.payment_status,
  u.email as user_email
FROM orders o
JOIN users u ON u.id = o.user_id
ORDER BY o.created_at DESC
LIMIT 10;

-- Count orders by status
SELECT status, COUNT(*) as count
FROM orders
GROUP BY status;

-- Count orders by payment status
SELECT payment_status, COUNT(*) as count
FROM orders
GROUP BY payment_status;

-- Get total revenue (paid orders)
SELECT 
  SUM(total_amount) as total_revenue,
  COUNT(*) as order_count
FROM orders
WHERE payment_status = 'paid';

-- Get orders by country
SELECT country, COUNT(*) as count, SUM(total_amount) as total
FROM orders
GROUP BY country;

-- ============================================
-- 6. ORDER ITEMS TABLE QUERIES
-- ============================================

-- View order items for a specific order
SELECT 
  oi.id,
  oi.quantity,
  oi.price,
  oi.subtotal,
  p.name as product_name
FROM order_items oi
JOIN products p ON p.id = oi.product_id
WHERE oi.order_id = 'ORDER_ID_HERE' -- Replace with actual order ID
ORDER BY p.name;

-- Get top selling products
SELECT 
  p.name,
  SUM(oi.quantity) as total_quantity_sold,
  SUM(oi.subtotal) as total_revenue
FROM order_items oi
JOIN products p ON p.id = oi.product_id
JOIN orders o ON o.id = oi.order_id
WHERE o.status != 'canceled'
GROUP BY p.id, p.name
ORDER BY total_quantity_sold DESC
LIMIT 10;

-- ============================================
-- 7. DELIVERY SCHEDULE TABLE QUERIES
-- ============================================

-- View all delivery schedules (admin only)
SELECT 
  ds.id,
  ds.delivery_date,
  ds.status,
  ds.estimated_time,
  o.id as order_id,
  o.total_amount,
  pp.name as pickup_point
FROM delivery_schedule ds
JOIN orders o ON o.id = ds.order_id
LEFT JOIN pickup_points pp ON pp.id = ds.pickup_point_id
ORDER BY ds.delivery_date DESC;

-- Get scheduled deliveries for a specific date
SELECT 
  ds.id,
  ds.delivery_date,
  ds.estimated_time,
  o.id as order_id,
  u.email as customer_email,
  pp.name as pickup_point
FROM delivery_schedule ds
JOIN orders o ON o.id = ds.order_id
JOIN users u ON u.id = o.user_id
LEFT JOIN pickup_points pp ON pp.id = ds.pickup_point_id
WHERE ds.delivery_date = CURRENT_DATE
  AND ds.status = 'scheduled'
ORDER BY ds.estimated_time;

-- ============================================
-- 8. CRUD OPERATION TESTS
-- ============================================

-- TEST CREATE: Insert a new product (admin only)
-- Uncomment to test:
/*
INSERT INTO products (name, description, category, price_germany, price_denmark, stock, active)
VALUES ('Test Product', 'Test description', 'fresh', 10.99, 129.00, 50, true)
RETURNING id, name;
*/

-- TEST READ: Get product by ID
-- Replace PRODUCT_ID_HERE with actual product ID:
/*
SELECT * FROM products WHERE id = 'PRODUCT_ID_HERE';
*/

-- TEST UPDATE: Update product stock (admin only)
-- Uncomment to test:
/*
UPDATE products
SET stock_germany = 100, updated_at = NOW()
WHERE id = 'PRODUCT_ID_HERE'
RETURNING id, name, stock_germany;
*/

-- TEST DELETE: Delete a product (admin only - not recommended, use active = false instead)
-- Uncomment to test (use with caution):
/*
UPDATE products
SET active = false
WHERE id = 'PRODUCT_ID_HERE'
RETURNING id, name, active;
*/

-- ============================================
-- 9. FOREIGN KEY RELATIONSHIP TESTS
-- ============================================

-- Test: Get order with user and items
SELECT 
  o.id as order_id,
  o.order_date,
  o.status,
  o.total_amount,
  u.email as customer_email,
  COUNT(oi.id) as item_count
FROM orders o
JOIN users u ON u.id = o.user_id
LEFT JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.id, o.order_date, o.status, o.total_amount, u.email
ORDER BY o.created_at DESC
LIMIT 5;

-- Test: Get order items with product details
SELECT 
  oi.id,
  oi.quantity,
  oi.price,
  oi.subtotal,
  p.name as product_name,
  p.category
FROM order_items oi
JOIN products p ON p.id = oi.product_id
LIMIT 10;

-- Test: Get delivery schedule with order and pickup point
SELECT 
  ds.id,
  ds.delivery_date,
  ds.status,
  o.id as order_id,
  o.total_amount,
  pp.name as pickup_point_name,
  pp.address
FROM delivery_schedule ds
JOIN orders o ON o.id = ds.order_id
LEFT JOIN pickup_points pp ON pp.id = ds.pickup_point_id
ORDER BY ds.delivery_date DESC
LIMIT 10;

-- ============================================
-- 10. FUNCTION TESTS
-- ============================================

-- Test: Calculate order total function
-- Replace ORDER_ID_HERE with actual order ID:
/*
SELECT calculate_order_total('ORDER_ID_HERE'::UUID) as calculated_total;
*/

-- Test: Verify order total matches sum of order items
SELECT 
  o.id as order_id,
  o.total_amount as order_total,
  COALESCE(SUM(oi.subtotal), 0) as calculated_total,
  CASE 
    WHEN o.total_amount = COALESCE(SUM(oi.subtotal), 0) THEN 'Match'
    ELSE 'Mismatch'
  END as status
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.id, o.total_amount
ORDER BY o.created_at DESC
LIMIT 10;

-- ============================================
-- 11. TRIGGER TESTS
-- ============================================

-- Test: Verify updated_at trigger works
-- Update a product and check updated_at changes:
/*
UPDATE products
SET stock_germany = stock_germany + 1
WHERE id = 'PRODUCT_ID_HERE'
RETURNING id, name, stock_germany, updated_at;
*/

-- Test: Verify order total trigger works
-- Insert an order item and check order total updates:
/*
-- First, create a test order (replace USER_ID_HERE)
INSERT INTO orders (user_id, country, payment_method)
VALUES ('USER_ID_HERE', 'germany', 'cod')
RETURNING id;

-- Then insert order items (replace ORDER_ID_HERE and PRODUCT_ID_HERE)
INSERT INTO order_items (order_id, product_id, quantity, price)
VALUES 
  ('ORDER_ID_HERE', 'PRODUCT_ID_HERE', 2, 10.99)
RETURNING id, subtotal;

-- Check if order total was updated
SELECT id, total_amount FROM orders WHERE id = 'ORDER_ID_HERE';
*/

-- ============================================
-- END OF TEST QUERIES
-- ============================================

