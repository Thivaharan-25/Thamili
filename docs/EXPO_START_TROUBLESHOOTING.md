# Expo Start Troubleshooting

## Network Error: "TypeError: fetch failed"

If you encounter a network error when starting Expo, it's usually because Expo CLI is trying to fetch native module versions from the Expo API and the request is failing.

### Quick Fixes:

#### Option 1: Use Offline Mode (Recommended)
```bash
npm run start:offline-clear
```
This will skip the network check and use cached versions.

#### Option 2: Skip Version Validation
```bash
npm run start:skip-validation
```
This will skip the native module version validation.

#### Option 3: Try Again
Sometimes it's a temporary network issue. Just try:
```bash
npm start -- --clear
```

#### Option 4: Check Your Internet Connection
- Make sure you have an active internet connection
- Check if you can access https://expo.dev
- Try disabling VPN if you're using one
- Check firewall settings

#### Option 5: Use Tunnel Mode
If you're behind a corporate firewall:
```bash
expo start --tunnel
```

### Why This Happens:

Expo CLI tries to:
1. Fetch the latest native module versions from Expo's API
2. Validate that your dependencies match the recommended versions
3. Check for compatibility issues

If the network request fails, Expo can't complete this check.

### Permanent Solution:

If this happens frequently, you can:
1. Use offline mode by default: `npm run start:offline`
2. Set environment variable: `EXPO_SKIP_NATIVE_VERSION_CHECK=1`
3. Use a VPN or check your network settings

### Note:

The app will still work fine even if version validation fails - it's just a warning/check, not a blocker for development.

