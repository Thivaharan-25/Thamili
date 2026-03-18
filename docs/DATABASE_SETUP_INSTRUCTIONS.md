# Database Setup Instructions for Supabase

## 🎯 Quick Setup Guide

Your Supabase project is ready: `https://zvefusfwaepnivzdidll.supabase.co`

## Step 1: Create .env File

Create a file named `.env` in the `ThamiliApp` directory with:

```env
SUPABASE_URL=https://zvefusfwaepnivzdidll.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2ZWZ1c2Z3YWVwbml2emRpZGxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMjA0MzksImV4cCI6MjA4MDY5NjQzOX0.asJow7Oe94fUKs3b3yfTv5PkumGL8ayBVLNUrZReScU
```

## Step 2: Set Up Database Schema

1. **Go to Supabase Dashboard**: https://app.supabase.com
2. **Select your project**: `zvefusfwaepnivzdidll`
3. **Open SQL Editor** (left sidebar)
4. **Run these scripts in order**:

### Script 1: Schema (Creates Tables)
- Open `database/schema.sql`
- Copy all content
- Paste in SQL Editor
- Click **Run** (or press Ctrl+Enter)

### Script 2: RLS Policies (Security)
- Open `database/rls_policies.sql`
- Copy all content
- Paste in SQL Editor
- Click **Run**

### Script 3: Seed Data (Sample Products)
- Open `database/seed_data.sql`
- Copy all content
- Paste in SQL Editor
- Click **Run**

### Script 4: Delivery Schedule Table
- Open `database/delivery_schedule.sql`
- Copy all content
- Paste in SQL Editor
- Click **Run**

### Script 5: Functions & Triggers (Business Logic)
- Open `database/functions_and_triggers.sql`
- Copy all content
- Paste in SQL Editor
- Click **Run**

## Step 3: Create Storage Bucket

1. Go to **Storage** in Supabase Dashboard
2. Click **New bucket**
3. Name: `product-images`
4. **Public bucket**: ✅ (checked)
5. Click **Create bucket**

## Step 4: Verify Setup

### Check Tables
Go to **Table Editor** and verify these tables exist:
- ✅ `users`
- ✅ `products`
- ✅ `orders`
- ✅ `order_items`
- ✅ `pickup_points`
- ✅ `delivery_schedule`

### Check Data
- Go to `products` table - should have sample fish and vegetables
- Go to `pickup_points` table - should have Germany and Norway locations

### Check Storage
- Go to **Storage** → `product-images` bucket should exist

## Step 5: Test Connection

1. **Restart Expo**:
   ```bash
   npm start -- --clear
   ```

2. **Open app in Expo Go**

3. **Try to register** a new user account

4. **Check console** - should see:
   - ✅ Supabase client created successfully
   - ✅ No credential warnings

5. **View products** - should load from Supabase

## 🐛 Troubleshooting

### Error: "relation does not exist"
- Make sure you ran `schema.sql` first
- Check that all tables were created

### Error: "permission denied"
- Make sure you ran `rls_policies.sql`
- Check RLS is enabled on tables

### Error: "bucket does not exist"
- Create the `product-images` bucket in Storage
- Make sure it's set to Public

### Products not showing
- Check `seed_data.sql` was run
- Verify products table has data
- Check products have `active = true`

### Can't register/login
- Check RLS policies on `users` table
- Verify `create_user_profile()` function exists (from `schema.sql`)

## 📋 Database Scripts Checklist

- [ ] `schema.sql` - Creates all tables
- [ ] `rls_policies.sql` - Security policies
- [ ] `seed_data.sql` - Sample data
- [ ] `delivery_schedule.sql` - Delivery table
- [ ] `functions_and_triggers.sql` - Business logic
- [ ] Storage bucket `product-images` created

## ✅ After Setup

Once all scripts are run:
1. App will connect to real Supabase database
2. Users can register and login
3. Products will load from database
4. Orders will be saved to database
5. Admin can manage products/orders

## 🔐 Security Notes

- ✅ Using **anon key** in app (correct for client-side)
- ✅ RLS policies protect data
- ✅ Service role key only for backend (Vercel functions)
- ✅ `.env` file is in `.gitignore` (won't be committed)

