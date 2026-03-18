# Fixing Expo Network Error

## Problem
When starting Expo, you may see:
```
TypeError: fetch failed
```

This happens when Expo CLI tries to check for native module versions online but can't connect to Expo's servers.

## Solutions

### Solution 1: Use Offline Mode (Recommended)
Start Expo in offline mode to skip the network check:

**Windows PowerShell:**
```powershell
$env:EXPO_OFFLINE="1"; npx expo start --clear
```

**Windows CMD:**
```cmd
set EXPO_OFFLINE=1 && npx expo start --clear
```

**Or use the npm script:**
```bash
npm run start:offline-clear
```

### Solution 2: Use --offline Flag
```bash
npx expo start --offline --clear
```

### Solution 3: Check Network/Firewall
If you need online features:
1. Check your internet connection
2. Check if firewall/proxy is blocking Expo API
3. Try disabling VPN if active
4. Whitelist `expo.dev` and `expo.io` domains

### Solution 4: Skip Dependency Validation
You can also try:
```bash
npx expo start --no-dev --minify
```

## Quick Fix Scripts

I've added these scripts to `package.json`:

- `npm run start:offline` - Start in offline mode
- `npm run start:offline-clear` - Start offline with cleared cache

## Why This Happens

Expo CLI tries to:
- Check for compatible native module versions
- Validate dependencies against Expo SDK
- Fetch latest compatibility information

If your network blocks this or you're offline, use offline mode. The app will still work fine - you just won't get automatic dependency validation warnings.

## Note

Offline mode is safe to use. Your app will work normally, you just won't get:
- Automatic dependency version checks
- Compatibility warnings
- Latest SDK information

All your code and dependencies will work exactly the same!

