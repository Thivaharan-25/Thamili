# Quick Error Check Steps

## Step 1: Check Expo Go App (30 seconds) ⭐

1. Open **Expo Go** on your phone
2. Look at the screen - is it:
   - ✅ **White/blank** = App crashed silently
   - ❌ **Red error screen** = ERROR FOUND! (scroll to see full message)
   - 🔄 **Loading forever** = App stuck

3. If you see a **red error screen**:
   - Scroll down to see full error
   - Look for: "TypeError: property is not configurable"
   - Copy the **exact error text**
   - Take a screenshot

## Step 2: Test Minimal App (2 minutes)

To see if React Native itself works:

1. **Backup your App.tsx**:
   ```bash
   cd ThamiliApp
   cp App.tsx App.tsx.backup
   ```

2. **Use minimal app**:
   ```bash
   cp App.minimal.tsx App.tsx
   ```

3. **Restart**:
   ```bash
   npm run start:clear
   ```

4. **Check**:
   - If minimal app works → Issue is in your imports
   - If minimal app fails → Issue is in React Native setup

5. **Restore**:
   ```bash
   mv App.tsx.backup App.tsx
   ```

## Step 3: Enable Verbose Logging (1 minute)

```bash
# Stop server (Ctrl+C)
EXPO_DEBUG=true npm run start:clear
```

This shows more detailed logs.

## Step 4: Check Android Logcat (If Android)

```bash
# Connect phone via USB
adb logcat | grep -E "ERROR|Exception|property|not configurable"
```

## What to Share

Once you find the error, share:
1. ✅ **Exact error message** (copy-paste)
2. ✅ **Stack trace** (if available)
3. ✅ **Module name** mentioned in error
4. ✅ **Screenshot** (if possible)

## Most Common Errors

1. **"property is not configurable"** in:
   - `@supabase/supabase-js` → Need v1.x + polyfill
   - `expo-notifications` → Need mock
   - `expo-image` → Need mock

2. **"Cannot read property"** → Module not loaded

3. **"Module not found"** → Import path wrong

## Priority Order

1. **Check Expo Go app** (fastest, most likely to show error)
2. **Test minimal app** (isolates the issue)
3. **Enable debug logging** (more details)
4. **Check logcat** (low-level errors)

Start with Step 1 - it's the fastest way to find the error!

