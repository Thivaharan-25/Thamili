# Admin Role Setup Guide

## Problem
When logging in with admin credentials, the user is being routed to the customer view instead of the admin dashboard.

## Root Cause
The user's role in the database is set to `'customer'` instead of `'admin'`. When a user registers, they automatically get the default role of `'customer'`.

## Solution: Update Admin Role in Database

### Method 1: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Run this SQL query (replace with your admin email):

```sql
-- Update admin role by email
UPDATE users 
SET role = 'admin', updated_at = NOW()
WHERE email = 'your-admin-email@example.com';

-- Verify the update
SELECT id, email, role, created_at 
FROM users 
WHERE email = 'your-admin-email@example.com';
```

### Method 2: Using Supabase Dashboard

1. Go to **Table Editor** → **users** table
2. Find your admin user by email
3. Click on the row to edit
4. Change `role` from `'customer'` to `'admin'`
5. Save the changes

### Method 3: Using SQL File

Run the SQL file: `database/update_admin_role.sql`

1. Open the file
2. Replace `'your-admin-email@example.com'` with your actual admin email
3. Copy and paste into Supabase SQL Editor
4. Execute

## After Updating Role

1. **Logout** from the app
2. **Login again** with admin credentials
3. You should now be routed to the **Admin Dashboard**

## Verify Role is Set Correctly

Check the console logs when logging in. You should see:
```
✅ [authStore] Setting user data: {
  role: 'admin',
  isAdmin: true
}
```

## Troubleshooting

### Still seeing customer view after update?

1. **Clear app storage/cache**:
   - Uninstall and reinstall the app, OR
   - Clear AsyncStorage data

2. **Check database**:
   ```sql
   SELECT id, email, role FROM users WHERE email = 'your-admin-email@example.com';
   ```
   Should show `role = 'admin'`

3. **Check console logs**:
   - Look for `[authStore] Setting user data` log
   - Verify `role: 'admin'` is shown

4. **Force refresh**:
   - Close the app completely
   - Reopen and login again

## Creating New Admin Users

When creating a new admin user:

1. **Register** the user normally through the app
2. **Update role** in database using Method 1 or 2 above
3. **Login** with the admin credentials

## Security Note

⚠️ **Important**: Only trusted users should have admin role. Admin users have full access to:
- Product management
- Order management
- Pickup point management
- All customer data

