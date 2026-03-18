# Stock Separation for Germany and Denmark

## Overview
Products now have separate stock quantities for Germany and Denmark, allowing independent inventory management for each country.

## Database Changes

### Migration Required
Run the migration script in Supabase SQL Editor:
```sql
-- File: database/migration_add_country_stock.sql
```

This will:
1. Add `stock_germany` and `stock_denmark` columns
2. Migrate existing `stock` data to both columns
3. You can drop the old `stock` column after verifying the migration

### Schema Update
- **Old**: `stock INTEGER`
- **New**: `stock_germany INTEGER`, `stock_denmark INTEGER`

## Code Changes

### ✅ Updated Files

1. **Types** (`src/types/index.ts`)
   - `Product` interface now has `stock_germany` and `stock_denmark`

2. **Add Product Screen** (`src/screens/admin/AddProductScreen.tsx`)
   - Multi-step form with separate stock fields for each country
   - Step 3: Stock & Review shows both stock quantities

3. **Edit Product Screen** (`src/screens/admin/EditProductScreen.tsx`)
   - Separate stock inputs for Germany and Denmark

4. **Product Utilities** (`src/utils/productUtils.ts`)
   - Added `getProductStock(product, country)` function
   - Updated `isInStock()` to use country-specific stock

5. **Product Card** (`src/components/ProductCard.tsx`)
   - Shows country-specific stock

6. **Cart Item** (`src/components/CartItem.tsx`)
   - Uses country-specific stock for validation

7. **Cart Store** (`src/store/cartStore.ts`)
   - Validates against country-specific stock

8. **Cart Validation** (`src/utils/cartValidation.ts`)
   - All stock checks use country-specific stock

9. **Product Details Screen** (`src/screens/customer/ProductDetailsScreen.tsx`)
   - Shows and validates country-specific stock

10. **Cart Screen** (`src/screens/customer/CartScreen.tsx`)
    - Uses country-specific stock for quantity limits

11. **Database Files**
    - `schema.sql` - Updated to include both stock columns
    - `seed_data.sql` - Updated with separate stock values
    - `migration_add_country_stock.sql` - Migration script

## How It Works

### For Customers
- Stock displayed is based on their selected country
- Germany users see `stock_germany`
- Denmark users see `stock_denmark`
- Cart validation uses country-specific stock

### For Admins
- When adding/editing products, set stock for each country separately
- Review screen shows both stock quantities
- Each country's inventory is managed independently

## Migration Steps

1. **Backup your database** (important!)

2. **Run the migration script**:
   ```sql
   -- Copy and run: database/migration_add_country_stock.sql
   ```

3. **Verify the migration**:
   ```sql
   SELECT id, name, stock_germany, stock_denmark FROM products LIMIT 5;
   ```

4. **Update existing products** (if needed):
   ```sql
   -- If you want to set different stock values, update manually:
   UPDATE products SET stock_germany = 50, stock_denmark = 40 WHERE id = '...';
   ```

5. **Drop old column** (after verification):
   ```sql
   ALTER TABLE products DROP COLUMN IF EXISTS stock;
   ```

## Testing Checklist

- [ ] Add new product with different stock for Germany and Denmark
- [ ] Edit existing product and update stock for both countries
- [ ] View product as Germany user - see Germany stock
- [ ] View product as Denmark user - see Denmark stock
- [ ] Add to cart - validate against correct country stock
- [ ] Update cart quantity - respect country-specific stock limit
- [ ] Checkout - verify stock validation works

## Notes

- The migration script copies existing `stock` to both `stock_germany` and `stock_denmark`
- You may want to adjust stock values after migration based on actual inventory
- All existing functionality continues to work, just with country-specific stock

