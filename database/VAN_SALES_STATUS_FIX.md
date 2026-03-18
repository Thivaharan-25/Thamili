# Fix: Van Sales Orders Status (delivered/paid)

## Problem
Van sales orders are being created with status='pending' and payment_status='pending', but they should be:
- **status**: 'delivered' (customer receives product immediately)
- **payment_status**: 'paid' (cash payment collected immediately)

The previous code tried to update these after creation, but RLS policies blocked the updates.

## Solution
Update the `create_order_atomic` function to accept `status` and `payment_status` parameters, so van sales can be created with the correct status from the start (bypassing RLS since the function uses SECURITY DEFINER).

## Migration Steps

### Step 1: Run the Database Migration
Execute `database/fix_van_sales_status.sql` in Supabase SQL Editor.

This will:
- Update `create_order_atomic` function to accept `p_status` and `p_payment_status` parameters
- Set defaults to 'pending' for backward compatibility
- Validate the status values

### Step 2: Code Already Updated ✅
The `deliveryService.createVanSalesOrder()` function has been updated to:
- Pass `p_status: 'delivered'` 
- Pass `p_payment_status: 'paid'`
- Remove the failing update code

## Result
After running the migration:
- ✅ Van sales orders are created with status='delivered'
- ✅ Van sales orders are created with payment_status='paid'
- ✅ No RLS issues (function uses SECURITY DEFINER)
- ✅ Backward compatible (regular orders still default to 'pending')

