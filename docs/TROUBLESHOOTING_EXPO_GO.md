# Troubleshooting Expo Go Bundling Issues

## Common Issues and Solutions

### 1. **Network Connectivity**
**Problem:** Phone and computer are not on the same Wi-Fi network.

**Solution:**
- Ensure both your computer and phone are connected to the same Wi-Fi network
- Disable mobile data on your phone while testing
- Check your router's AP isolation settings (should be disabled)

### 2. **Firewall Blocking Connection**
**Problem:** Windows Firewall or antivirus is blocking Metro bundler.

**Solution:**
```powershell
# Allow Node.js through Windows Firewall
# Run PowerShell as Administrator
New-NetFirewallRule -DisplayName "Expo Metro Bundler" -Direction Inbound -LocalPort 8081 -Protocol TCP -Action Allow
```

Or manually:
1. Open Windows Defender Firewall
2. Click "Allow an app or feature through Windows Firewall"
3. Find Node.js and check both Private and Public networks

### 3. **Metro Bundler Not Running**
**Problem:** Expo dev server is not running or crashed.

**Solution:**
```bash
cd ThamiliApp
# Stop any running processes
# Then restart with clear cache
npx expo start --clear
```

### 4. **Port Already in Use**
**Problem:** Port 8081 is already being used by another process.

**Solution:**
```bash
# Find what's using port 8081
netstat -ano | findstr :8081

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or use a different port
npx expo start --port 8082
```

### 5. **Cache Issues**
**Problem:** Stale cache causing bundling errors.

**Solution:**
```bash
cd ThamiliApp
# Clear all caches
npx expo start --clear
# Or manually
rm -rf node_modules/.cache
rm -rf .expo
npx expo start --clear
```

### 6. **Expo Go App Version Mismatch**
**Problem:** Expo Go app on phone is outdated.

**Solution:**
- Update Expo Go app from App Store (iOS) or Play Store (Android)
- Ensure Expo Go version matches your Expo SDK version (54.0.27)

### 7. **Tunnel Mode (If LAN doesn't work)**
**Problem:** LAN connection not working.

**Solution:**
```bash
# Use tunnel mode (slower but works across networks)
npx expo start --tunnel
```

### 8. **Check Metro Bundler Status**
**Problem:** Need to verify Metro is running correctly.

**Solution:**
1. When you run `npx expo start`, you should see:
   - QR code in terminal
   - "Metro waiting on..." message
   - Network URL (e.g., `exp://192.168.1.100:8081`)

2. Check if you can access the bundler URL in browser:
   - Open `http://localhost:8081` in browser
   - Should see Metro bundler status

### 9. **Check Network Interface**
**Problem:** Expo is using wrong network interface.

**Solution:**
```bash
# Start Expo and manually select network
npx expo start
# Press 's' to switch to tunnel mode if needed
# Or press 'i' to open iOS simulator
# Or press 'a' to open Android emulator
```

### 10. **Verify Expo Configuration**
**Problem:** app.json configuration issues.

**Solution:**
- Ensure `app.json` has correct `slug` and `name`
- Check that `main` entry point in `package.json` is correct (`index.ts`)

## Quick Diagnostic Steps

1. **Check if Metro is running:**
   ```bash
   # In ThamiliApp directory
   npx expo start --clear
   ```

2. **Check network connection:**
   - On your computer: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
   - Note your IP address (e.g., 192.168.1.100)
   - On phone: Ensure connected to same Wi-Fi

3. **Test connection:**
   - Open browser on phone
   - Go to `http://YOUR_COMPUTER_IP:8081`
   - Should see Metro bundler status

4. **Check Expo Go app:**
   - Update to latest version
   - Try scanning QR code again
   - Check for error messages in Expo Go

5. **Try tunnel mode:**
   ```bash
   npx expo start --tunnel
   ```
   This uses Expo's servers to tunnel the connection (works even if not on same network)

## Most Common Fix

**90% of the time, this fixes it:**
```bash
cd ThamiliApp
# Clear everything and restart
npx expo start --clear --tunnel
```

Then scan the QR code again in Expo Go.

