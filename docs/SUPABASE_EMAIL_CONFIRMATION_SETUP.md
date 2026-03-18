# Supabase Email Confirmation Setup

## Issue

When users register, Supabase sends email confirmation links with `localhost:3000` as the redirect URL. This happens because Supabase needs to know where to redirect users after email confirmation.

## Solutions

### Option 1: Disable Email Confirmation (Recommended for Development)

Since the app auto-logs users in after registration, you can disable email confirmation:

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Go to **Authentication** → **Providers** → **Email**
4. Under **Email Auth**, toggle **"Enable email confirmations"** to **OFF**
5. Save changes

**Pros:**
- Users can register and use the app immediately
- No email confirmation needed
- Works well for development and testing

**Cons:**
- Less secure (anyone can register with any email)
- Not recommended for production without additional verification

### Option 2: Configure Redirect URL in Supabase

If you want to keep email confirmation enabled:

1. Go to Supabase Dashboard → **Authentication** → **URL Configuration**
2. Under **Redirect URLs**, add your app's deep link URL:
   - For Expo: `exp://localhost:8081` (development)
   - For production: `your-app-scheme://` (e.g., `thamili://`)
3. Update the `emailRedirectTo` in the signUp call to use this URL

**Example:**
```typescript
emailRedirectTo: 'thamili://auth/callback'
```

### Option 3: Use Custom Deep Link (Production)

For production apps, set up deep linking:

1. **Configure app.json** with URL scheme:
```json
{
  "expo": {
    "scheme": "thamili"
  }
}
```

2. **Update signUp call:**
```typescript
emailRedirectTo: 'thamili://auth/confirm'
```

3. **Handle deep link in App.tsx:**
```typescript
import * as Linking from 'expo-linking';

useEffect(() => {
  const handleDeepLink = (event: { url: string }) => {
    if (event.url.includes('/auth/confirm')) {
      // Handle email confirmation
    }
  };
  
  Linking.addEventListener('url', handleDeepLink);
  return () => Linking.removeEventListener('url', handleDeepLink);
}, []);
```

## Current Implementation

The app is currently configured to:
- Auto-login users after registration (if email confirmation is disabled)
- Not set a redirect URL (emailRedirectTo: undefined)

## Recommendation

For development: **Disable email confirmation** in Supabase Dashboard
For production: **Enable email confirmation** and set up proper deep linking

## How to Check Current Settings

1. Go to Supabase Dashboard
2. **Authentication** → **URL Configuration**
3. Check **"Site URL"** - this is what Supabase uses as default redirect
4. Check **"Redirect URLs"** - add your app's deep link here

## Fixing the localhost:3000 Issue

The `localhost:3000` appears because:
- Supabase uses the "Site URL" as default redirect
- If not configured, it may default to localhost
- For mobile apps, this doesn't work

**Quick Fix:**
1. Go to Supabase Dashboard → **Authentication** → **URL Configuration**
2. Set **"Site URL"** to your production domain or a placeholder
3. Add your app's deep link to **"Redirect URLs"**
4. Or disable email confirmation entirely

