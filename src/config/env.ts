// Environment configuration
// These values should be set in .env file or through environment variables
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_KEY,
  STRIPE_PUBLISHABLE_KEY,
  STRIPE_SECRET_KEY,
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_WHATSAPP_NUMBER,
  MAPBOX_PUBLIC_KEY,
  API_URL,
  EXPO_PUBLIC_VERCEL_API_URL,
  INTERNAL_API_SECRET,
} from '@env';

export const ENV = {
  SUPABASE_URL: SUPABASE_URL || '',
  SUPABASE_ANON_KEY: SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_KEY: SUPABASE_SERVICE_KEY || '',
  STRIPE_PUBLISHABLE_KEY: STRIPE_PUBLISHABLE_KEY || '',
  STRIPE_SECRET_KEY: '',
  TWILIO_ACCOUNT_SID: TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: TWILIO_AUTH_TOKEN || '',
  TWILIO_WHATSAPP_NUMBER: TWILIO_WHATSAPP_NUMBER || '',
  MAPBOX_PUBLIC_KEY: MAPBOX_PUBLIC_KEY || '',
  API_URL: API_URL || EXPO_PUBLIC_VERCEL_API_URL || '',
  // Internal secret shared with the Vercel send-push API to prevent unauthorized calls
  INTERNAL_API_SECRET: INTERNAL_API_SECRET || '',
};

// Validate required environment variables
export const validateEnv = () => {
  // Check if values are actually set (not empty strings)
  const hasUrl = ENV.SUPABASE_URL && ENV.SUPABASE_URL.trim() !== '';
  const hasKey = ENV.SUPABASE_ANON_KEY && ENV.SUPABASE_ANON_KEY.trim() !== '';

  // Note: We have fallback values in supabase.ts, so missing .env is not critical
  // Only log info, don't show warnings that might confuse users
  if (hasUrl && hasKey) {
    console.log('✅ Environment variables loaded from .env file');
  } else {
    // Silent fallback - supabase.ts will use hardcoded values
    // Only log in development for debugging
    if (__DEV__) {
      console.log('ℹ️ Using fallback Supabase credentials (configure .env for production)');
    }
  }
};
