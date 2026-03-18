# Database Setup Guide

This directory contains SQL scripts to set up the Thamili mobile app database in Supabase.

## 📋 Prerequisites

1. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
2. **Supabase Project**: Create a new project
3. **Database Access**: You need access to the SQL Editor in your Supabase dashboard

## 🚀 Setup Steps

### Step 1: Create Database Schema

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `schema.sql`
5. Click **Run** (or press `Ctrl+Enter`)

This will create:
- All tables (users, products, orders, order_items, pickup_points)
- Indexes for performance
- Triggers for auto-updating timestamps
- Function to auto-create user profiles on signup

### Step 2: Create Delivery Schedule Table

1. In the SQL Editor, create a **New Query**
2. Copy and paste the contents of `delivery_schedule.sql`
3. Click **Run**

This will create:
- Delivery schedule table for tracking deliveries
- RLS policies for delivery schedule
- Indexes for performance

### Step 3: Set Up Row Level Security (RLS)

1. In the SQL Editor, create a **New Query**
2. Copy and paste the contents of `rls_policies.sql`
3. Click **Run**

This will:
- Enable RLS on all tables
- Create policies for:
  - Users: Can view/update own profile, admins can view all
  - Products: Everyone can view active products, only admins can modify
  - Pickup Points: Everyone can view active points, only admins can modify
  - Orders: Users can view/create own orders, admins can view all
  - Order Items: Users can view items for own orders, admins can view all

### Step 4: Set Up Advanced Functions & Triggers

1. In the SQL Editor, create a **New Query**
2. Copy and paste the contents of `functions_and_triggers.sql`
3. Click **Run**

This will create:
- Order total calculation functions
- Automatic order total updates
- Inventory management (stock decrease/increase)
- Delivery schedule auto-creation
- Order item subtotal calculation

### Step 5: Insert Seed Data

1. In the SQL Editor, create a **New Query**
2. Copy and paste the contents of `seed_data.sql`
3. Click **Run**

This will insert:
- Sample products (fresh fish, frozen fish, fresh vegetables, frozen vegetables)
- Sample pickup points for Germany and Norway
- Initial stock levels

### Step 4: Create Admin User

1. **Option A: Via Supabase Dashboard**
   - Go to **Authentication** → **Users**
   - Click **Add User**
   - Create a user with email and password
   - Note the user's email

2. **Option B: Via App**
   - Register a new account through the app
   - Note the email you used

3. **Make User Admin**
   - Go to **SQL Editor**
   - Run this query (replace with your email):
   ```sql
   UPDATE users 
   SET role = 'admin' 
   WHERE email = 'your-email@example.com';
   ```

## 📊 Database Structure

### Tables

1. **users** - User profiles (linked to Supabase Auth)
   - id (UUID, linked to auth.users)
   - email, name, phone
   - role (customer/admin)
   - country_preference

2. **products** - Product catalog
   - id, name, description
   - category (fresh/frozen)
   - price_germany, price_norway
   - stock, image_url
   - active (boolean)

3. **pickup_points** - Delivery/pickup locations
   - id, name, address
   - latitude, longitude
   - country (germany/norway)
   - delivery_fee
   - active (boolean)

4. **orders** - Customer orders
   - id, user_id
   - order_date, status
   - total_amount
   - country, payment_method, payment_status
   - pickup_point_id, delivery_address

5. **order_items** - Items in each order
   - id, order_id, product_id
   - quantity, price, subtotal

6. **delivery_schedule** - Delivery tracking
   - id, order_id
   - delivery_date, status
   - pickup_point_id, estimated_time
   - actual_delivery_time
   - delivery_person_name, delivery_person_phone

## 🔒 Security Features

- **Row Level Security (RLS)**: Enabled on all tables
- **Policies**: Users can only access their own data
- **Admin Access**: Admins can view/modify all data
- **Public Access**: Products and pickup points are viewable by everyone (when active)

## 🔄 Auto-Features

- **Auto User Creation**: When a user signs up via Supabase Auth, a profile is automatically created in the `users` table
- **Auto Timestamps**: `updated_at` fields are automatically updated on record changes

## 📝 Notes

- **Currency**: 
  - Germany prices are in EUR (€)
  - Norway prices are in NOK (kr)
- **Stock Management**: Update stock levels as products are sold
- **Images**: Add `image_url` values when you have product images uploaded to Supabase Storage

## 🐛 Troubleshooting

### Error: "relation does not exist"
- Make sure you ran `schema.sql` first

### Error: "permission denied"
- Check that RLS policies are set up correctly
- Verify your user role in the `users` table

### Error: "duplicate key value"
- Seed data already exists, skip this step or delete existing data first

### Admin user not working
- Verify the user exists in `auth.users`
- Check that `role = 'admin'` in the `users` table
- Make sure RLS policies allow admin access

## 🔍 Verification Queries

Run these in SQL Editor to verify setup:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check products count
SELECT COUNT(*) FROM products;

-- Check pickup points count
SELECT COUNT(*) FROM pickup_points;

-- Check your user role
SELECT email, role FROM users WHERE email = 'your-email@example.com';
```

**For comprehensive test queries**, see `test_queries.sql` which includes:
- CRUD operation tests
- Foreign key relationship tests
- Function tests
- Trigger tests
- Business logic verification queries

## 📚 Next Steps

After database setup:
1. ✅ Phase 1: Project setup (Complete)
2. ✅ Phase 2: Database setup (Complete)
3. ⏭️ Phase 3: Authentication implementation
4. ⏭️ Phase 4: Product catalog
5. ⏭️ Phase 5: Shopping cart
6. ⏭️ Phase 6: Checkout & payment

---

**Need Help?** Check the Supabase documentation: https://supabase.com/docs

