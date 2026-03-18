# Supabase Setup - Real Credentials

## ✅ Your Supabase Credentials

Your Supabase project has been configured with the following credentials:

- **Project URL**: `https://zvefusfwaepnivzdidll.supabase.co`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2ZWZ1c2Z3YWVwbml2emRpZGxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMjA0MzksImV4cCI6MjA4MDY5NjQzOX0.asJow7Oe94fUKs3b3yfTv5PkumGL8ayBVLNUrZReScU`

## 📝 Create .env File

**IMPORTANT**: Create a `.env` file in the `ThamiliApp` directory with the following content:

```env
SUPABASE_URL=https://zvefusfwaepnivzdidll.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2ZWZ1c2Z3YWVwbml2emRpZGxsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMjA0MzksImV4cCI6MjA4MDY5NjQzOX0.asJow7Oe94fUKs3b3yfTv5PkumGL8ayBVLNUrZReScU
```

## 🗄️ Database Setup Required

Before the app can work, you need to set up the database schema in your Supabase project:

### Step 1: Run Database Scripts

Go to your Supabase Dashboard → SQL Editor and run these scripts in order:

1. **Schema** (`database/schema.sql`) - Creates all tables
2. **RLS Policies** (`database/rls_policies.sql`) - Sets up security
3. **Seed Data** (`database/seed_data.sql`) - Adds sample products and pickup points
4. **Functions & Triggers** (`database/functions_and_triggers.sql`) - Adds business logic
5. **Delivery Schedule** (`database/delivery_schedule.sql`) - Creates delivery schedule table

### Step 2: Create Storage Bucket

1. Go to **Storage** in Supabase Dashboard
2. Create a new bucket named `product-images`
3. Set it to **Public** (or configure RLS policies for public read access)

### Step 3: Verify Setup

After running the scripts, verify:
- ✅ Tables created: `users`, `products`, `orders`, `order_items`, `pickup_points`, `delivery_schedule`
- ✅ RLS policies enabled on all tables
- ✅ Storage bucket `product-images` exists
- ✅ Sample data inserted (products and pickup points)

## 🚀 Next Steps

1. **Create the `.env` file** (see above)
2. **Run database scripts** in Supabase SQL Editor
3. **Create storage bucket** for product images
4. **Restart Expo** with cleared cache:
   ```bash
   npm start -- --clear
   ```
5. **Test the connection**:
   - Try logging in/registering
   - View products
   - Create an order

## 🔍 Testing Connection

After setup, you can test the connection by:
1. Opening the app
2. Trying to register a new user
3. Checking the console for Supabase connection logs
4. Viewing products (should load from Supabase)

## 📊 Database Tables Overview

- **users** - User accounts (linked to Supabase Auth)
- **products** - Product catalog (fresh/frozen fish & vegetables)
- **orders** - Customer orders
- **order_items** - Items in each order
- **pickup_points** - Delivery/pickup locations
- **delivery_schedule** - Delivery scheduling
- **notifications** - Push notifications (optional)
- **notification_preferences** - User notification settings (optional)
- **whatsapp_notifications** - WhatsApp message history (optional)
- **notification_templates** - Notification templates (optional)

## ⚠️ Important Notes

- The `.env` file is in `.gitignore` (correct - don't commit it!)
- Use the **anon key** (not service role key) in the app
- Service role key should only be used in backend/serverless functions
- All database scripts are in the `database/` folder

