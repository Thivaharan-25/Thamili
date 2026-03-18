# Clear Metro Cache - Fix Module Resolution

## Issue
Metro bundler cannot resolve `react-native-reanimated` even though it's installed.

## Solution

### Step 1: Stop Metro Bundler
Press `Ctrl+C` in the terminal where Metro is running.

### Step 2: Clear All Caches
Run these commands in order:

```bash
# Clear Metro cache
npm start -- --clear

# OR if that doesn't work, try:
npx expo start --clear

# OR manually clear:
rm -rf node_modules/.cache
rm -rf .expo
npm start -- --reset-cache
```

### Step 3: Reinstall if Needed
If clearing cache doesn't work:

```bash
# Remove node_modules and reinstall
rm -rf node_modules
npm install

# Then start with clear cache
npm start -- --clear
```

### Step 4: Restart Expo Go
- Close Expo Go app completely
- Reopen it
- Scan the QR code again

## Why This Happens
Metro bundler caches module resolutions. When packages are updated or reinstalled, the cache can become stale and prevent proper module resolution.

## Verification
After clearing cache, you should see:
- ✅ No "Unable to resolve" errors
- ✅ App loads successfully
- ✅ All components work

