# Fix Admin Role Cache Issue

## Problem
The database shows `role = 'admin'` in the users table, but when logging in, the app still shows the user as a customer.

## Root Causes
1. **Cached user data** in AsyncStorage with old 'customer' role
2. **Profile fetch failing** (500 error) and falling back to metadata
3. **State not refreshing** after database update

## Solutions

### Solution 1: Clear App Cache (Quick Fix)

**Option A: Clear AsyncStorage**
1. Close the app completely
2. Clear app data:
   - **Android**: Settings → Apps → Thamili → Storage → Clear Data
   - **iOS**: Delete and reinstall the app
3. Login again

**Option B: Use Developer Menu**
1. Shake device or press `Cmd+D` (iOS) / `Cmd+M` (Android)
2. Select "Clear AsyncStorage" or "Reset App"
3. Login again

### Solution 2: Force Profile Refresh

The app now automatically:
- Clears old cached data before saving new login
- Retries profile fetch if first attempt fails
- Logs detailed information about role detection

**Check Console Logs:**
When logging in, look for these logs:
```
🔍 [authStore] Fetching profile from database for user: <user-id>
✅ [authStore] Profile fetched successfully: { role: 'admin' }
✅ [authStore] Setting user data: { role: 'admin', isAdmin: true }
💾 [authStore] User data saved to storage with role: admin
✅ [authStore] Login successful, state updated: { userRole: 'admin', isAdmin: true }
```

**If you see errors:**
```
❌ [authStore] Profile fetch error: ...
⚠️ [authStore] Using user metadata as profile fallback
```
This means the database query is failing. Check:
- Supabase connection
- RLS (Row Level Security) policies
- Network connectivity

### Solution 3: Verify Database Role

Run this SQL in Supabase to verify:
```sql
SELECT id, email, role, updated_at 
FROM users 
WHERE email = 'your-admin-email@example.com';
```

Should show: `role = 'admin'`

If it shows `'customer'`, update it:
```sql
UPDATE users 
SET role = 'admin', updated_at = NOW()
WHERE email = 'your-admin-email@example.com';
```

### Solution 4: Manual Cache Clear (Code)

If you have access to the code, you can add this temporary function:

```typescript
// In authStore.ts, add this function temporarily
clearUserCache: async () => {
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.USER_TOKEN,
    STORAGE_KEYS.USER_DATA,
  ]);
  set({ user: null, token: null, isAuthenticated: false });
  console.log('✅ Cache cleared');
},
```

Then call it before logging in again.

## Debugging Steps

1. **Check Console Logs** during login:
   - Look for `[authStore]` logs
   - Check if profile is fetched successfully
   - Verify role value at each step

2. **Verify Database**:
   ```sql
   SELECT * FROM users WHERE email = 'your-email@example.com';
   ```

3. **Check AsyncStorage** (if possible):
   - The app stores user data in AsyncStorage
   - Old cached data might have wrong role

4. **Test Flow**:
   - Logout completely
   - Clear app cache
   - Login again
   - Check console logs
   - Verify navigation goes to Admin Dashboard

## Expected Behavior After Fix

When logging in as admin:
1. ✅ Profile fetched from database shows `role: 'admin'`
2. ✅ User data saved with `role: 'admin'`
3. ✅ Navigation routes to Admin Dashboard
4. ✅ Tab bar shows admin tabs (Dashboard, Products, Orders, etc.)

## Still Not Working?

If the role is correct in database but app still shows customer:

1. **Check RLS Policies**: The user might not have permission to read their own profile
2. **Check Network**: Profile fetch might be timing out
3. **Check Supabase Status**: Service might be down
4. **Check User ID**: Make sure the user ID matches between auth.users and users table

Run this to check:
```sql
-- Check if user exists in both tables
SELECT 
  au.id as auth_id,
  au.email as auth_email,
  u.id as user_id,
  u.email as user_email,
  u.role
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE au.email = 'your-admin-email@example.com';
```

Both IDs should match, and role should be 'admin'.

