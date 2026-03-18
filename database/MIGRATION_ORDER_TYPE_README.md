# Migration: Add Order Type Tracking

## Purpose
This migration adds `order_type` field to the `orders` table to distinguish between:
- **Regular orders**: Customer orders placed through the app/website
- **Van sales**: Manual sales made by delivery partners from their van/mobile shop

## Benefits
- **Analytics**: Admin can now separate regular orders from van sales for reporting
- **Tracking**: Know which delivery partner made each van sale
- **Reporting**: Generate separate revenue reports for different sales channels

## Migration Steps

### 1. Run the Migration
Execute the migration file in your Supabase SQL Editor:

```sql
-- Run this file:
database/migration_add_order_type.sql
```

This will:
- Add `order_type` column to `orders` table
- Create index for faster queries
- Update `create_order_atomic` function to accept `order_type` parameter
- Set all existing orders to `'regular'` type

### 2. Verify Migration
After running, verify the changes:

```sql
-- Check if column exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'order_type';

-- Check existing orders (should all be 'regular')
SELECT order_type, COUNT(*) 
FROM orders 
GROUP BY order_type;

-- Check function signature
SELECT proname, pg_get_function_arguments(oid) 
FROM pg_proc 
WHERE proname = 'create_order_atomic';
```

## Usage

### For Van Sales (Delivery Partners)
Van sales are automatically marked as `order_type = 'van_sale'` when created via:
- `deliveryService.createVanSalesOrder()`

### For Regular Orders (Customers)
Regular orders are automatically marked as `order_type = 'regular'` when created via:
- `orderService.createOrder()`
- Customer checkout flow

## Analytics Queries

### Get Van Sales Revenue
```sql
SELECT 
  SUM(total_amount) as van_sales_revenue,
  COUNT(*) as van_sales_count
FROM orders
WHERE order_type = 'van_sale'
  AND payment_status = 'paid';
```

### Get Regular Orders Revenue
```sql
SELECT 
  SUM(total_amount) as regular_revenue,
  COUNT(*) as regular_count
FROM orders
WHERE order_type = 'regular'
  AND payment_status = 'paid';
```

### Compare Sales Channels
```sql
SELECT 
  order_type,
  COUNT(*) as order_count,
  SUM(total_amount) as total_revenue,
  AVG(total_amount) as avg_order_value
FROM orders
WHERE payment_status = 'paid'
GROUP BY order_type;
```

### Van Sales by Delivery Partner
```sql
SELECT 
  u.name as delivery_partner,
  COUNT(*) as sales_count,
  SUM(o.total_amount) as total_revenue
FROM orders o
JOIN users u ON u.id = o.user_id
WHERE o.order_type = 'van_sale'
  AND u.role = 'delivery_partner'
GROUP BY u.id, u.name
ORDER BY total_revenue DESC;
```

## Files Modified

1. **database/migration_add_order_type.sql** - Main migration file
2. **database/schema.sql** - Updated schema definition
3. **database/concurrency_functions.sql** - Updated function signature
4. **database/apply_fix.sql** - Updated function signature and permissions
5. **src/services/deliveryService.ts** - Updated to pass `order_type = 'van_sale'`

## Notes

- Existing orders will be set to `'regular'` type automatically
- All new van sales will be marked as `'van_sale'`
- All new regular orders will be marked as `'regular'` (default)
- The field has a CHECK constraint to only allow 'regular' or 'van_sale'

## Rollback (if needed)

If you need to rollback this migration:

```sql
-- Remove the column
ALTER TABLE orders DROP COLUMN IF EXISTS order_type;

-- Recreate function without order_type parameter
-- (Use previous version from git history)
```

