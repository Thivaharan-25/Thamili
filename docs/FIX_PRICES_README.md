# Fix Missing Product Prices

## Problem
Some products in the database have `price_denmark` as `undefined` or `null`, causing prices to display as "0,00 kr." or "NaN kr."

## Solution

### Step 1: Verify the Issue
Run the verification script to see which products have missing prices:

```sql
-- Run this in your Supabase SQL Editor
-- File: database/verify_prices.sql
```

### Step 2: Fix Missing Prices
Run the fix script to update all products with missing `price_denmark` values:

```sql
-- Run this in your Supabase SQL Editor
-- File: database/fix_missing_prices.sql
```

This script will:
- Update products with missing `price_denmark` by converting `price_germany` to DKK (using 1 EUR ≈ 7.5 DKK)
- Set default value of 0.00 for any remaining edge cases

### Step 3: Verify the Fix
Run the verification script again to confirm all products now have valid prices.

## Alternative: Manual Update
If you want to set specific prices for Denmark, you can update products individually:

```sql
UPDATE products
SET price_denmark = 35.00  -- Set your desired price in DKK
WHERE id = 'your-product-id';
```

## Note
The conversion rate (7.5) is approximate. Adjust it in the fix script based on current EUR to DKK exchange rate if needed.

