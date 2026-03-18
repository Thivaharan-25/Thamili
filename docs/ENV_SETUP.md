# Environment Variables Setup

## ⚠️ Important: Supabase Configuration Required

The app requires Supabase credentials to function properly. Without them, you'll see a runtime error.

## Quick Setup

1. **Create a `.env` file** in the `ThamiliApp` directory (same level as `package.json`)

2. **Add your Supabase credentials:**

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

3. **Get your Supabase credentials:**
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Select your project (or create a new one)
   - Go to **Settings** → **API**
   - Copy the **Project URL** → This is your `SUPABASE_URL`
   - Copy the **anon/public key** → This is your `SUPABASE_ANON_KEY`

## Complete .env File Template

Create a file named `.env` in `ThamiliApp/` with the following content:

```env
# Supabase Configuration (REQUIRED)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# Optional - Add later when needed
SUPABASE_SERVICE_KEY=your-service-key-here

# Stripe Configuration (Required for online payments)
STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_key_here  # Only used in Vercel functions

# Vercel API URL (Required for Stripe and WhatsApp)
EXPO_PUBLIC_VERCEL_API_URL=https://your-vercel-app.vercel.app
# For local development: EXPO_PUBLIC_VERCEL_API_URL=http://localhost:3000

# Twilio Configuration (Required for WhatsApp notifications)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890
```

## After Creating .env File

1. **Restart Expo:**
   - Stop the current Expo server (Ctrl+C)
   - Clear cache: `npm start -- --clear`
   - Or restart: `npm start`

2. **Verify it's working:**
   - The app should load without the "supabaseUrl is required" error
   - Check the console - you should NOT see the warning about missing credentials

## Troubleshooting

### Error: "supabaseUrl is required"
- Make sure `.env` file exists in `ThamiliApp/` directory
- Check that `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set
- Restart Expo after creating/updating `.env`
- Make sure there are no spaces around the `=` sign

### Environment variables not loading
- Make sure `.env` file is in the correct location (`ThamiliApp/.env`)
- Restart Expo with cache clear: `npm start -- --clear`
- Check that `babel.config.js` has the `react-native-dotenv` plugin configured

### Still having issues?
- Check the console for the exact error message
- Verify your Supabase credentials are correct
- Make sure you're using the **anon/public** key, not the service role key

## Security Note

⚠️ **Never commit your `.env` file to git!** It's already in `.gitignore`, but double-check before pushing to a repository.

