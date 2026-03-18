-- ============================================
-- Thamili Mobile App - Seed Data
-- Supabase PostgreSQL Database
-- ============================================
-- NOTE: Run this AFTER creating the schema and RLS policies
-- NOTE: Make sure you have created at least one admin user via Supabase Auth first

-- ============================================
-- 1. PRODUCTS - Fresh Fish
-- ============================================
INSERT INTO products (name, description, category, price_germany, price_denmark, stock_germany, stock_denmark, active) VALUES
('Salmon Fillet', 'Fresh Atlantic salmon fillet, 500g', 'fresh', 12.99, 149.00, 50, 45, true),
('Tuna Steak', 'Premium tuna steak, 400g', 'fresh', 15.99, 179.00, 30, 25, true),
('Cod Fillet', 'Fresh cod fillet, 500g', 'fresh', 9.99, 119.00, 60, 55, true),
('Sea Bass', 'Whole sea bass, 600g', 'fresh', 11.99, 139.00, 40, 35, true),
('Prawns', 'Fresh jumbo prawns, 1kg', 'fresh', 18.99, 219.00, 25, 20, true),
('Mackerel', 'Fresh mackerel, 400g', 'fresh', 7.99, 99.00, 45, 40, true),
('Sardines', 'Fresh sardines, 500g', 'fresh', 6.99, 79.00, 50, 45, true),
('Trout', 'Fresh rainbow trout, 500g', 'fresh', 8.99, 109.00, 35, 30, true);

-- ============================================
-- 2. PRODUCTS - Frozen Fish
-- ============================================
INSERT INTO products (name, description, category, price_germany, price_denmark, stock_germany, stock_denmark, active) VALUES
('Frozen Salmon Portions', 'Frozen salmon portions, 1kg', 'frozen', 10.99, 129.00, 100, 90, true),
('Frozen Cod Fillets', 'Frozen cod fillets, 1kg', 'frozen', 8.99, 109.00, 120, 110, true),
('Frozen Prawns', 'Frozen prawns, 1kg', 'frozen', 15.99, 189.00, 80, 75, true),
('Frozen Fish Fingers', 'Frozen fish fingers, 500g', 'frozen', 4.99, 59.00, 150, 140, true),
('Frozen Tuna Steaks', 'Frozen tuna steaks, 1kg', 'frozen', 13.99, 169.00, 90, 85, true);

-- ============================================
-- 3. PRODUCTS - Fresh Vegetables
-- ============================================
INSERT INTO products (name, description, category, price_germany, price_denmark, stock_germany, stock_denmark, active) VALUES
('Tomatoes', 'Fresh red tomatoes, 1kg', 'fresh', 2.99, 35.00, 200, 180, true),
('Cucumber', 'Fresh cucumber, 1kg', 'fresh', 1.99, 25.00, 180, 160, true),
('Carrots', 'Fresh carrots, 1kg', 'fresh', 1.49, 19.00, 250, 230, true),
('Potatoes', 'Fresh potatoes, 2kg', 'fresh', 2.49, 29.00, 300, 280, true),
('Onions', 'Fresh onions, 1kg', 'fresh', 1.99, 24.00, 220, 200, true),
('Bell Peppers', 'Fresh bell peppers, 1kg', 'fresh', 3.99, 45.00, 150, 135, true),
('Lettuce', 'Fresh lettuce, 1 head', 'fresh', 1.99, 24.00, 100, 90, true),
('Spinach', 'Fresh spinach, 500g', 'fresh', 2.49, 29.00, 120, 110, true),
('Broccoli', 'Fresh broccoli, 1kg', 'fresh', 2.99, 35.00, 140, 130, true),
('Cauliflower', 'Fresh cauliflower, 1kg', 'fresh', 2.49, 29.00, 130, 120, true);

-- ============================================
-- 4. PRODUCTS - Frozen Vegetables
-- ============================================
INSERT INTO products (name, description, category, price_germany, price_denmark, stock_germany, stock_denmark, active) VALUES
('Frozen Peas', 'Frozen peas, 500g', 'frozen', 1.99, 24.00, 200, 190, true),
('Frozen Corn', 'Frozen corn, 500g', 'frozen', 1.99, 24.00, 180, 170, true),
('Frozen Mixed Vegetables', 'Frozen mixed vegetables, 1kg', 'frozen', 2.99, 35.00, 160, 150, true),
('Frozen Green Beans', 'Frozen green beans, 500g', 'frozen', 2.49, 29.00, 170, 160, true),
('Frozen Broccoli', 'Frozen broccoli, 500g', 'frozen', 2.49, 29.00, 150, 140, true);

-- ============================================
-- 5. PICKUP POINTS - Germany
-- ============================================
INSERT INTO pickup_points (name, address, latitude, longitude, country, delivery_fee, active) VALUES
('Berlin Central', 'Alexanderplatz 1, 10178 Berlin, Germany', 52.5200, 13.4050, 'germany', 2.50, true),
('Munich Main Station', 'Bayerstraße 10, 80335 München, Germany', 48.1351, 11.5820, 'germany', 3.00, true),
('Hamburg Harbor', 'Speicherstadt 1, 20457 Hamburg, Germany', 53.5511, 9.9937, 'germany', 2.75, true),
('Frankfurt Airport', 'Frankfurt Airport, 60547 Frankfurt, Germany', 50.0379, 8.5622, 'germany', 4.00, true),
('Cologne Cathedral', 'Domkloster 4, 50667 Köln, Germany', 50.9413, 6.9583, 'germany', 2.50, true);

-- ============================================
-- 6. PICKUP POINTS - Denmark
-- ============================================
INSERT INTO pickup_points (name, address, latitude, longitude, country, delivery_fee, active) VALUES
('Copenhagen Central Station', 'Bernstorffsgade 1, 1570 København, Denmark', 55.6761, 12.5683, 'denmark', 30.00, true),
('Aarhus Harbor', 'Marselis Boulevard 130, 8000 Aarhus, Denmark', 56.1629, 10.2039, 'denmark', 35.00, true),
('Odense City Center', 'Flakhaven 2, 5000 Odense, Denmark', 55.3959, 10.3883, 'denmark', 40.00, true),
('Aalborg Main Square', 'Gammeltorv 1, 9000 Aalborg, Denmark', 57.0488, 9.9217, 'denmark', 35.00, true),
('Esbjerg Fish Market', 'Torvegade 1, 6700 Esbjerg, Denmark', 55.4670, 8.4519, 'denmark', 50.00, true);

-- ============================================
-- NOTES:
-- ============================================
-- 1. Admin & Delivery Partners: See seed_admin_users.sql
--    - Create users in Supabase Auth first
--    - Then run seed_admin_users.sql to assign roles
--    - Default: 1 admin, 2 delivery partners
--
-- 2. Prices: 
--    - Germany prices are in EUR
--    - Denmark prices are in DKK (Danish Krone)
--    - Adjust prices according to your market
--
-- 3. Stock: Separate stock levels for Germany and Denmark
--    - stock_germany: Stock available in Germany
--    - stock_denmark: Stock available in Denmark
--
-- 4. Images: Add image_url values later when you have product images
--
-- ============================================
-- END OF SEED DATA
-- ============================================

