# Fix: "Failed to download remote update" Error in Expo Go

## Problem
When scanning the QR code in Expo Go, you may see:
```
Uncaught Error: java.io.IOException: Failed to download remote update
```

This happens when Expo Go tries to check for OTA (Over-The-Air) updates even though updates are disabled.

## Solution Applied ✅

### 1. Updated `app.json`
- ✅ Set `updates.enabled: false`
- ✅ Set `updates.checkAutomatically: "NEVER"`
- ✅ Set `updates.fallbackToCacheTimeout: 0`

## Steps to Fix

### Step 1: Clear Expo Go App Cache (CRITICAL)
1. **Close Expo Go completely** (swipe it away from recent apps)
2. **Clear Expo Go app cache:**
   - **Android**: Settings → Apps → Expo Go → Storage → Clear Cache
   - **iOS**: Delete and reinstall Expo Go (if needed)
3. **Reopen Expo Go**

### Step 2: Clear Metro Bundler Cache
```bash
# Stop the current server (Ctrl+C if running)

# Clear cache and restart
npm run start:clear

# Or manually:
npx expo start --clear
```

### Step 3: Restart Expo Go
1. **Close Expo Go completely**
2. **Reopen Expo Go**
3. **Scan the QR code again**

### Step 4: Use LAN/Tunnel Mode (If still having issues)
If you're still getting the error, try using LAN or Tunnel mode:

```bash
# LAN mode (if phone and computer are on same network)
npx expo start --lan

# Tunnel mode (works from anywhere)
npx expo start --tunnel
```

## Why This Happens

Expo Go caches the update configuration. Even though we've disabled updates in `app.json`, Expo Go might still try to check for updates if:
1. The cache wasn't cleared
2. The app.json changes weren't picked up
3. There's a network connectivity issue

## Verification

After applying these fixes:
- ✅ App should load without the update error
- ✅ No more "Failed to download remote update" messages
- ✅ App runs from local Metro bundler only

## Additional Notes

- The app is configured to **never** check for updates automatically
- All updates must come from the local Metro bundler
- This is the correct configuration for development
- In production builds, you can enable updates if needed

