-- =====================================================
-- Diagnostic Queries for Delivery Partner Issue
-- =====================================================
-- Run these queries in Supabase SQL Editor to diagnose the issue
-- =====================================================

-- 1. Check if delivery_schedule table has data
SELECT COUNT(*) as total_schedules FROM delivery_schedule;

-- 2. Check if any schedules have delivery_partner_id set
SELECT 
  COUNT(*) as schedules_with_partner,
  COUNT(DISTINCT delivery_partner_id) as unique_partners
FROM delivery_schedule 
WHERE delivery_partner_id IS NOT NULL;

-- 3. View sample delivery schedules with partner info
SELECT 
  ds.id,
  ds.order_id,
  ds.delivery_partner_id,
  ds.status,
  ds.delivery_date,
  u.email as partner_email,
  u.role as partner_role
FROM delivery_schedule ds
LEFT JOIN users u ON ds.delivery_partner_id = u.id
LIMIT 10;

-- 4. Check current user's role and ID (run this when logged in as delivery partner)
SELECT 
  auth.uid() as current_user_id,
  u.email,
  u.role,
  u.name
FROM users u
WHERE u.id = auth.uid();

-- 5. Check how many schedules the current user should see (run as delivery partner)
SELECT COUNT(*) as my_schedules
FROM delivery_schedule
WHERE delivery_partner_id = auth.uid();

-- 6. View current RLS policies on delivery_schedule
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
WHERE tablename = 'delivery_schedule'
ORDER BY policyname;

-- 7. Test if RLS is blocking (run as delivery partner)
-- This should return rows if RLS is working correctly
SELECT 
  id,
  order_id,
  delivery_partner_id,
  status,
  delivery_date
FROM delivery_schedule
WHERE delivery_partner_id = auth.uid();

-- 8. Check if there are ANY delivery partners in users table
SELECT 
  id,
  email,
  name,
  role
FROM users
WHERE role = 'delivery';

-- =====================================================
-- MANUAL FIX: Assign a test order to delivery partner
-- =====================================================
-- If no orders are assigned, run this to create a test assignment:

-- First, get a delivery partner ID:
-- SELECT id, email FROM users WHERE role = 'delivery' LIMIT 1;

-- Then, get an order ID:
-- SELECT id FROM orders LIMIT 1;

-- Create a delivery schedule (replace IDs with actual values):
/*
INSERT INTO delivery_schedule (
  order_id,
  delivery_date,
  status,
  pickup_point_id,
  delivery_partner_id
)
VALUES (
  'YOUR_ORDER_ID_HERE',
  CURRENT_DATE + INTERVAL '1 day',
  'scheduled',
  (SELECT id FROM pickup_points LIMIT 1),
  'YOUR_DELIVERY_PARTNER_ID_HERE'
);
*/
