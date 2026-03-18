# Expo Go Runtime Error Fix

## Error: "property is not configurable"

This error occurs when native modules try to configure properties that are already set or read-only in Expo Go.

## Fixes Applied

### 1. expo-notifications (Phase 9)
- **Problem**: Module-level initialization conflicts with Expo Go
- **Fix**: Made import lazy using dynamic `import()`
- **Files**: 
  - `src/services/pushNotificationService.ts` - Lazy loading
  - `App.tsx` - Removed auto-initialization
  - `src/services/index.ts` - Removed from main exports

### 2. expo-image-picker (Phase 8)
- **Problem**: Module-level import causes initialization issues
- **Fix**: Made import lazy using dynamic `import()`
- **Files**:
  - `src/screens/admin/AddProductScreen.tsx` - Lazy loading
  - `src/screens/admin/EditProductScreen.tsx` - Lazy loading

### 3. app.json Configuration
- **Problem**: `newArchEnabled: true` can cause issues in Expo Go
- **Fix**: Removed `newArchEnabled` setting
- **File**: `app.json`

## How It Works Now

### expo-notifications
- Only loads when `pushNotificationService` functions are called
- No module-level initialization
- Gracefully handles when module is unavailable

### expo-image-picker
- Only loads when user actually picks an image
- No module-level initialization
- Error handling for unavailable module

## Testing

1. Clear Metro cache:
```bash
npm start -- --clear
```

2. Restart Expo Go app completely

3. Test notifications (should work when explicitly used):
   - Navigate to Admin → Test Notification screen
   - Try sending a test notification

4. Test image picker (should work when explicitly used):
   - Navigate to Admin → Products → Add Product
   - Try picking an image

## If Error Persists

1. **Clear all caches:**
```bash
npm start -- --clear
# Or
rm -rf node_modules/.cache
npm start
```

2. **Restart Expo Go completely:**
   - Close Expo Go app
   - Restart it
   - Scan QR code again

3. **Check for other native modules:**
   - Any other `expo-*` modules imported at module level?
   - Any other native modules that might conflict?

4. **Temporary workaround:**
   - Comment out notification/image picker features temporarily
   - Test if app loads without them
   - Re-enable one by one to identify the culprit

## Notes

- These fixes make the modules "optional" - app will work even if they fail to load
- All native module imports are now lazy-loaded
- No module-level code execution for native modules
- App should start successfully in Expo Go

