# Fix: Van Sales Orders Not Being Created

## Problem
- ✅ Stock is decreasing in products table (working)
- ❌ Orders are NOT being created in orders table
- ❌ Order items are NOT being created in order_items table

## Root Cause
The migration `migration_add_order_type.sql` hasn't been run yet. The code is trying to INSERT orders with the `order_type` column, but the column doesn't exist in the database yet, causing the INSERT to fail silently.

## Solution

### Step 1: Run the Migration
Execute this file in your Supabase SQL Editor:

```
database/migration_add_order_type.sql
```

This will:
- Add `order_type` column to `orders` table
- Update `create_order_atomic` function to accept `p_order_type` parameter
- Fix the function signature mismatch

### Step 2: Verify the Fix

Run these queries to verify:

```sql
-- Check if order_type column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'order_type';

-- Check function signature (should show 11 parameters)
SELECT proname, pg_get_function_arguments(oid) 
FROM pg_proc 
WHERE proname = 'create_order_atomic';

-- Test: Create a test van sale order
-- (This will show if the function works)
```

### Step 3: Test Van Sales Again
After running the migration, test creating a van sale from the delivery partner app. You should now see:
- ✅ Stock decreases
- ✅ Order created in orders table with `order_type = 'van_sale'`
- ✅ Order items created in order_items table

## Why This Happened

The code was updated to pass `p_order_type: 'van_sale'` parameter, but:
1. The database function didn't have this parameter yet (migration not run)
2. The `orders` table didn't have `order_type` column yet
3. When the function tried to INSERT with `order_type` column, it failed
4. Stock was already decreased (happens before INSERT in the function)
5. The INSERT failed, but the error wasn't visible to the user

## Important Notes

- **Run the migration FIRST** before testing van sales
- The function uses `SECURITY DEFINER` so it should bypass RLS
- After migration, van sales will work correctly
- All existing orders will be marked as `order_type = 'regular'` (default)

