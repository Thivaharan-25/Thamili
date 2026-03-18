// IMPORTANT: react-native-url-polyfill must be loaded before this file
// It is imported in App.tsx before any Supabase imports
// Supabase v1.x is compatible with Expo Go when using URL polyfill

console.log('🔵 [supabase.ts] Module loaded (lazy initialization)');

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV } from '../config/env';

// Check if Supabase credentials are configured
const hasValidCredentials = 
  ENV.SUPABASE_URL && 
  ENV.SUPABASE_ANON_KEY && 
  ENV.SUPABASE_URL.trim() !== '' && 
  ENV.SUPABASE_ANON_KEY.trim() !== '';

if (!hasValidCredentials) {
  console.warn(
    '⚠️ Supabase credentials not configured!\n' +
    'Please create a .env file in the ThamiliApp directory with:\n' +
    'SUPABASE_URL=your_supabase_url\n' +
    'SUPABASE_ANON_KEY=your_anon_key\n\n' +
    'Get your credentials from: https://app.supabase.com/project/_/settings/api\n\n' +
    'The app will continue to load, but Supabase features will not work.'
  );
}

// LAZY INITIALIZATION - Only create client when first accessed
// Delay initialization as much as possible to avoid "property is not configurable" errors
let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    console.log('🔵 [supabase.ts] Creating Supabase client (first access)...');
    try {
      if (!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON_KEY) {
        throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env file');
      }
      supabaseInstance = createClient(
        ENV.SUPABASE_URL,
        ENV.SUPABASE_ANON_KEY,
        {
          // @ts-ignore - v1.x uses different type definitions
          auth: {
            storage: AsyncStorage,
            autoRefreshToken: hasValidCredentials ? true : false,
            persistSession: hasValidCredentials ? true : false,
            detectSessionInUrl: false, // Not needed in React Native
          },
        }
      );
      console.log('✅ [supabase.ts] Supabase client created successfully!');
      
      // Debug: Verify auth methods are available
      if (__DEV__ && supabaseInstance.auth) {
        const auth = supabaseInstance.auth as any;
        console.log('🔍 [supabase.ts] Auth methods available:', {
          hasSignInWithPassword: typeof auth.signInWithPassword === 'function',
          hasSignIn: typeof auth.signIn === 'function',
          hasSignUp: typeof auth.signUp === 'function',
          hasGetSession: typeof auth.getSession === 'function',
          hasSession: typeof auth.session === 'function',
          authKeys: Object.keys(auth),
        });
      }
    } catch (error) {
      console.error('❌ [supabase.ts] ERROR creating Supabase client:', error);
      throw error;
    }
  }
  return supabaseInstance;
}

// Export getter function - this ensures Supabase is only initialized when actually used
// NOT on module load, which prevents "property is not configurable" errors
export function getSupabase(): SupabaseClient {
  return getSupabaseClient();
}

// Helper function to create a Proxy for nested objects
// This ensures all methods (including getSession) are properly bound
function createNestedProxy(obj: any, parentObj: any = null): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // If it's a function, bind it to its parent object (or itself if no parent)
  if (typeof obj === 'function') {
    return obj.bind(parentObj || obj);
  }
  
  // If it's an object, wrap it in a Proxy to handle nested property access
  if (typeof obj === 'object') {
    return new Proxy(obj, {
      get(target, prop) {
        // Try to get the value from the target
        let value;
        try {
          // Use Reflect.get to properly handle getters
          value = Reflect.get(target, prop, target);
        } catch {
          // Fallback to direct property access
          value = (target as any)[prop];
        }
        
        // If value is a function, bind it to the target (parent object)
        if (typeof value === 'function') {
          return value.bind(target);
        }
        
        // Recursively wrap nested objects, passing the current target as parent
        return createNestedProxy(value, target);
      },
      set(target, prop, value) {
        (target as any)[prop] = value;
        return true;
      },
    });
  }
  
  // For primitives, return as-is
  return obj;
}

// For backward compatibility, create a Proxy that properly forwards all property access
// This ensures lazy initialization while maintaining full Supabase API compatibility
const lazySupabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = (client as any)[prop];
    // Use nested proxy to handle auth.signInWithPassword, etc.
    // Pass client as parent so top-level methods are bound correctly
    return createNestedProxy(value, client);
  },
  set(_target, prop, value) {
    const client = getSupabaseClient();
    (client as any)[prop] = value;
    return true;
  },
});

// Export the lazy Proxy - this won't initialize Supabase until first use
// The Proxy ensures all property access (including nested like auth.getSession) works correctly
export const supabase = lazySupabase;

console.log('✅ [supabase.ts] Module exported (lazy - no initialization yet)');
