# Fix RLS Infinite Recursion Error

## Problem
When logging in, you see this error:
```
❌ [authStore] Profile fetch error: 
{message: 'infinite recursion detected in policy for relation "users"', code: '42P17'}
```

This causes the profile fetch to fail, so the app falls back to user metadata (which doesn't have the role), defaulting to 'customer' instead of 'admin'.

## Root Cause
The `is_admin()` function queries the `users` table to check if a user is admin. However, the RLS policy "Admins can view all users" also uses `is_admin()`. This creates a circular dependency:
1. User tries to read their profile
2. RLS policy checks `is_admin()`
3. `is_admin()` queries `users` table
4. RLS policy checks `is_admin()` again
5. Infinite loop! 🔄

## Solution

### Quick Fix (Run in Supabase SQL Editor)

1. **Go to Supabase Dashboard** → **SQL Editor**

2. **Run this script**: `database/fix_rls_recursion_complete.sql`

   Or copy-paste this:

```sql
-- Drop problematic policies
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;

-- Drop and recreate is_admin() function
DROP FUNCTION IF EXISTS is_admin() CASCADE;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Explicitly disable RLS for this function
  PERFORM set_config('row_security', 'off', true);
  
  -- Query users table directly (RLS is now disabled)
  SELECT role INTO user_role
  FROM public.users
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN COALESCE(user_role = 'admin', false);
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO anon;

-- Recreate policies
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can update all users"
  ON users FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());
```

3. **Verify it worked**:
   ```sql
   SELECT is_admin(); -- Should return true/false without error
   ```

4. **Logout and Login again** in the app

5. **Check console logs** - you should now see:
   ```
   ✅ [authStore] Profile fetched successfully: { role: 'admin' }
   ✅ [authStore] Setting user data: { role: 'admin', isAdmin: true }
   ```

## What This Fix Does

1. **Drops the problematic policies** that cause recursion
2. **Recreates `is_admin()` function** with explicit RLS bypass using `set_config('row_security', 'off', true)`
3. **Recreates the policies** using the fixed function
4. **Grants proper permissions** so the function can be called

## Alternative: Simpler Approach (If Above Doesn't Work)

If the above still causes issues, use this simpler approach that doesn't use `is_admin()` for the users table:

```sql
-- Drop admin policies on users table
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;

-- Use direct role check (this might still have issues, but worth trying)
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
    )
  );
```

**Note**: This alternative might still cause recursion. The first solution is better.

## Verification Steps

After running the fix:

1. ✅ **No more 500 errors** when fetching profile
2. ✅ **Profile fetch succeeds** with correct role
3. ✅ **Admin role detected** correctly
4. ✅ **Navigation routes to Admin Dashboard**

## Still Having Issues?

If you still see the recursion error:

1. **Check Supabase logs** for more details
2. **Verify RLS is enabled**: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'users';`
3. **Check function exists**: `SELECT proname FROM pg_proc WHERE proname = 'is_admin';`
4. **Try disabling RLS temporarily** to test:
   ```sql
   ALTER TABLE users DISABLE ROW LEVEL SECURITY;
   -- Test login
   -- Then re-enable: ALTER TABLE users ENABLE ROW LEVEL SECURITY;
   ```

## Related Files

- `database/fix_rls_recursion_complete.sql` - Complete fix script
- `database/fix_rls_infinite_recursion.sql` - Alternative fix
- `database/rls_policies.sql` - Original RLS policies

