import { create } from 'zustand';
import { Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserRole } from '../types';
import { STORAGE_KEYS } from '../constants';
// Lazy import Supabase to avoid initialization during module load
import { queryClient } from '../config/queryClient';
import { userService } from '../services';
import { checkRateLimit } from '../utils/rateLimiter';


// Import Supabase lazily - only when needed
function getSupabase() {
  return require('../services/supabase').supabase;
}
import type { Country } from '../constants';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithUsername: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name?: string, phone?: string, role?: UserRole) => Promise<{ success: boolean; error?: string }>;
  registerWithUsername: (username: string, password: string, name: string, email?: string | null, country?: Country) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string; url?: string }>;

  createDeliveryPartner: (username: string, password: string, phone: string, country: Country) => Promise<{ success: boolean; error?: string }>;
  updateDeliveryPartner: (userId: string, updates: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  deleteDeliveryPartner: (userId: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  loadSession: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  updateCountryPreference: (country: Country) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  completeOnboarding: () => Promise<void>;
  checkOnboardingStatus: () => Promise<void>;
  handleAuthCallback: (url: string) => Promise<void>;
  checkVerificationStatus: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  resetPasswordForEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  checkUsername: (username: string) => Promise<{ exists: boolean; email?: string; isDummy?: boolean; error?: string }>;
  recoverAccount: (username: string, newEmail: string) => Promise<{ success: boolean; error?: string }>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
  setupAuthListener: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,
  hasCompletedOnboarding: false,

  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
    if (user) {
      console.log('💾 [authStore] Caching user data globally:', user.id);
      AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
    } else {
      AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
    }
  },

  setToken: (token) => {
    set({ token });
    if (token) {
      AsyncStorage.setItem(STORAGE_KEYS.USER_TOKEN, token);
    } else {
      AsyncStorage.removeItem(STORAGE_KEYS.USER_TOKEN);
    }
  },

  /**
   * Login with username and password
   * Uses username@thamili.app email format for Supabase Auth
   */
  loginWithUsername: async (username: string, password: string) => {
    checkRateLimit('auth');
    try {
      set({ isLoading: true });
      const supabase = getSupabase();

      console.log('🔵 [authStore] Looking up email for username:', username);

      // 1. Look up the email associated with this username from the database
      const { data: foundEmail, error: rpcError } = await supabase.rpc('get_email_by_username', {
        p_username: username
      });

      if (rpcError) {
        console.warn('⚠️ [authStore] Username lookup error (RPC):', rpcError.message);
      }

      // 2. Determine which email to use for login
      // If found in public.users, use that. Otherwise, try the dummy format.
      const loginEmail = foundEmail || `${username}@thamili.app`;

      if (foundEmail) {
        console.log('✅ [authStore] Found registered email:', foundEmail);
      } else {
        console.log('ℹ️ [authStore] No email found via RPC, trying dummy format:', loginEmail);
      }

      // 3. Login with determined email + password
      const result = await get().login(loginEmail, password);

      set({ isLoading: false });
      return result;
    } catch (error: any) {
      console.error('❌ [authStore] Username login exception:', error);
      set({ isLoading: false, isAuthenticated: false });
      return { success: false, error: error.message || 'Login failed' };
    }
  },

  login: async (email, password) => {
    checkRateLimit('auth');
    try {
      set({ isLoading: true });
      const supabase = getSupabase();

      // Verify auth object exists
      if (!supabase.auth) {
        console.error('❌ [authStore] Auth object not available');
        return { success: false, error: 'Authentication service not available' };
      }

      // Supabase v1.x uses signIn, not signInWithPassword
      const auth = supabase.auth as any;

      console.log('🔵 [authStore] Attempting login for:', email);
      console.log('🔵 [authStore] Available auth methods:', {
        hasSignIn: typeof auth.signIn === 'function',
        hasSignInWithPassword: typeof auth.signInWithPassword === 'function',
        hasSignInWithEmail: typeof auth.signInWithEmail === 'function',
        authMethods: Object.keys(auth).filter(key => typeof auth[key] === 'function'),
      });

      // Try signInWithPassword first (some v1.x versions support it)
      // Then fallback to signIn
      let response;
      if (typeof auth.signInWithPassword === 'function') {
        console.log('🔵 [authStore] Using signInWithPassword...');
        response = await auth.signInWithPassword({
          email,
          password,
        });
      } else if (typeof auth.signIn === 'function') {
        console.log('🔵 [authStore] Using signIn...');
        // Try different formats for v1.x
        try {
          response = await auth.signIn({
            email,
            password,
          });
        } catch (signInError: any) {
          // Try alternative format
          console.log('🔵 [authStore] Trying alternative signIn format...');
          response = await auth.signIn(email, password);
        }
      } else {
        return { success: false, error: 'Authentication method not available' };
      }

      console.log('🔵 [authStore] SignIn response:', {
        hasData: !!response.data,
        hasError: !!response.error,
        dataKeys: response.data ? Object.keys(response.data) : [],
        errorMessage: response.error?.message,
        errorStatus: response.error?.status,
        errorCode: response.error?.code,
      });

      if (response.error) {
        console.error('❌ [authStore] Login error:', {
          message: response.error.message,
          status: response.error.status,
          code: response.error.code,
        });

        // Provide concise, user-friendly error messages (TAMIL Requested: Short messages)
        let errorMessage = 'Invalid username or password';

        // Handle different error types
        if (response.error.status === 400) {
          const errorMsg = response.error.message?.toLowerCase() || '';
          if (errorMsg.includes('invalid login credentials') ||
            errorMsg.includes('invalid password') ||
            errorMsg.includes('wrong password') ||
            errorMsg.includes('incorrect password')) {
            errorMessage = 'Invalid username or password';
          } else if (errorMsg.includes('email not confirmed') ||
            errorMsg.includes('email confirmation')) {
            errorMessage = 'Email not confirmed';
          } else if (errorMsg.includes('user not found') ||
            errorMsg.includes('no user found')) {
            errorMessage = 'Account not found';
          } else if (errorMsg.includes('too many requests') ||
            errorMsg.includes('rate limit')) {
            errorMessage = 'Too many attempts';
          } else {
            // Use the original message if it's short enough
            errorMessage = response.error.message || errorMessage;
          }
        } else if (response.error.status === 401) {
          errorMessage = 'Invalid username or password';
        } else if (response.error.status === 429) {
          errorMessage = 'Too many attempts';
        } else if (response.error.status >= 500) {
          errorMessage = 'Server error';
        } else {
          // For other errors, try to use the message if it's clear
          const errorMsg = response.error.message?.toLowerCase() || '';
          if (errorMsg.includes('network') || errorMsg.includes('connection')) {
            errorMessage = 'Network error';
          } else {
            errorMessage = response.error.message || 'Login failed';
          }
        }
        // CRITICAL: Ensure isAuthenticated stays false on error
        // Make sure to set loading to false and explicitly keep isAuthenticated false
        set({
          isLoading: false,
          isAuthenticated: false, // Explicitly ensure false on error
        });
        return { success: false, error: errorMessage };
      }

      // Handle different response structures for Supabase v1.x
      // Response might be: { data: { user, session } } or { user, session } or just the data
      let user = null;
      let session = null;

      // Try different response structures
      if (response.data) {
        user = response.data.user || response.data;
        session = response.data.session;
      } else if (response.user) {
        user = response.user;
        session = response.session;
      } else {
        // Response might be the data directly
        user = response.user || response;
        session = response.session;
      }

      console.log('🔵 [authStore] Extracted user and session:', {
        hasUser: !!user,
        hasSession: !!session,
        userId: user?.id,
        userEmail: user?.email,
      });

      if (!user || !user.id) {
        console.error('❌ [authStore] No user in response:', {
          responseKeys: Object.keys(response),
          responseDataKeys: response.data ? Object.keys(response.data) : [],
        });
        set({ isLoading: false });
        return { success: false, error: 'Login failed: No user data received. Please try again.' };
      }

      // If no session in response, try to get it from auth (Supabase persists it)
      let finalSession = session;
      if (!finalSession || !finalSession.access_token) {
        console.log('🔵 [authStore] No session in response, trying to get from auth storage...');
        try {
          // Wait a bit for Supabase to persist the session
          await new Promise(resolve => setTimeout(resolve, 100));

          if (typeof auth.getSession === 'function') {
            const sessionResponse = await auth.getSession();
            console.log('🔵 [authStore] getSession response:', {
              hasData: !!sessionResponse?.data,
              hasSession: !!sessionResponse?.session,
              keys: sessionResponse ? Object.keys(sessionResponse) : [],
            });
            finalSession = sessionResponse?.data?.session || sessionResponse?.session || sessionResponse?.data || sessionResponse;
          } else if (typeof auth.session === 'function') {
            finalSession = await auth.session();
          } else if (auth.session) {
            finalSession = auth.session;
          }

          // Also try to get from AsyncStorage directly
          if (!finalSession || !finalSession.access_token) {
            const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.USER_TOKEN);
            if (storedToken) {
              console.log('🔵 [authStore] Found token in storage, creating session object');
              finalSession = { access_token: storedToken };
            }
          }
        } catch (sessionError) {
          console.warn('⚠️ [authStore] Could not get session:', sessionError);
        }
      }

      if (!finalSession || !finalSession.access_token) {
        console.error('❌ [authStore] No session or access token:', {
          hasSession: !!finalSession,
          sessionKeys: finalSession ? Object.keys(finalSession) : [],
          responseStructure: JSON.stringify(response).substring(0, 200),
        });
        set({ isLoading: false });
        return { success: false, error: 'Login failed: Unable to create session. Please try again.' };
      }

      console.log('✅ [authStore] User and session received, fetching profile...');

      // Fetch user profile from database
      // Use RPC call as fallback if direct query fails due to RLS issues
      let profile: any = null;
      let profileError: any = null;

      try {
        console.log('🔍 [authStore] Fetching profile from database for user:', user.id);
        const { data: profileList, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .limit(1);

        if (error) {
          // Log error but don't throw - use fallback
          console.error('❌ [authStore] Profile fetch error:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          });
          profileError = error;
        } else if (profileList && profileList.length > 0) {
          profile = profileList[0];
          console.log('✅ [authStore] Profile fetched successfully:', {
            email: profile.email,
            role: profile.role,
            name: profile.name,
          });
        } else {
          console.warn('⚠️ [authStore] Profile fetch returned no data');
        }
      } catch (err: any) {
        profileError = err;
        console.error('❌ [authStore] Profile fetch exception:', err.message, err);
      }

      // If profile fetch failed, try to fetch again with retry
      if (!profile && profileError) {
        console.log('🔄 [authStore] Retrying profile fetch...');
        try {
          const { data: retryData, error: retryError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .limit(1);

          if (!retryError && retryData && retryData.length > 0) {
            profile = retryData[0];
            console.log('✅ [authStore] Profile fetched on retry:', {
              email: profile.email,
              role: profile.role,
            });
          } else {
            console.error('❌ [authStore] Retry also failed:', retryError?.message);
          }
        } catch (retryErr) {
          console.error('❌ [authStore] Retry exception:', retryErr);
        }
      }

      // Fallback: use user metadata if profile fetch failed (but warn about it)
      if (!profile && user.user_metadata) {
        try {
          // Validate country_preference - only allow 'germany' or 'denmark'
          const countryPref = user.user_metadata.country_preference;
          const validCountry = (countryPref === 'germany' || countryPref === 'denmark')
            ? countryPref
            : undefined; // Don't set invalid values, let it be NULL

          profile = {
            id: user.id,
            email: user.email,
            role: user.user_metadata.role || 'customer',
            country_preference: validCountry, // NULL if invalid, which is allowed by constraint
            phone: user.user_metadata.phone || undefined,
            created_at: user.created_at,
            updated_at: user.updated_at,
          };
          console.warn('⚠️ [authStore] Using user metadata as profile fallback - ROLE MAY BE INCORRECT!');
          console.warn('⚠️ [authStore] Database profile fetch failed, using metadata role:', profile.role);
        } catch (metaErr) {
          console.warn('⚠️ [authStore] Could not create profile from metadata');
        }
      }

      if (profileError && !profile) {
        console.error('❌ [authStore] Profile fetch error (continuing anyway):', profileError?.message || 'Unknown error');
        console.error('❌ [authStore] This may cause incorrect role assignment. Check database connection and RLS policies.');
      }

      // Normalize role to lowercase for consistent comparison
      const rawRole = profile?.role || user.user_metadata?.role || 'customer';
      const roleStr = typeof rawRole === 'string' ? rawRole.toLowerCase().trim() : 'customer';
      const normalizedRole: UserRole = (roleStr === 'admin' || roleStr === 'customer' || roleStr === 'delivery_partner') ? roleStr : 'customer';

      // Validate country_preference - only allow 'germany' or 'denmark'
      const getValidCountryPreference = (): 'germany' | 'denmark' | undefined => {
        const country = profile?.country_preference || user.user_metadata?.country_preference;
        if (country === 'germany' || country === 'denmark') {
          return country;
        }
        return undefined; // Return undefined (NULL in DB) if invalid
      };

      const userData: User = {
        id: user.id,
        email: user.email || email,
        phone: user.phone || profile?.phone || undefined,
        name: profile?.name || user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0],
        role: normalizedRole,
        country_preference: getValidCountryPreference(),
        photoURL: profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || undefined,
        created_at: user.created_at,
      };

      console.log('✅ [authStore] Setting user data:', {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        rawRole: rawRole,
        profileRole: profile?.role,
        metadataRole: user.user_metadata?.role,
        isAdmin: userData.role === 'admin',
      });

      // IMPORTANT: If user should be admin but role is 'customer', log warning
      if (userData.email && (userData.email.includes('admin') || userData.email.includes('@admin'))) {
        console.warn('⚠️ [authStore] Admin email detected but role is:', userData.role);
        console.warn('⚠️ [authStore] Please update role in database using:');
        console.warn(`⚠️ UPDATE users SET role = 'admin' WHERE email = '${userData.email}';`);
      }

      // IMPORTANT: Clear old cached data first to prevent stale role
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);

      // Set user and token in storage with fresh data
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
      await AsyncStorage.setItem(STORAGE_KEYS.USER_TOKEN, finalSession.access_token);

      console.log('💾 [authStore] User data saved to storage with role:', userData.role);

      // Set user and token in state
      get().setUser(userData);
      get().setToken(finalSession.access_token);

      // Force state update to trigger navigation
      set({
        isAuthenticated: true,
        user: userData,
        token: finalSession.access_token,
        isLoading: false,
      });

      // Verify state was updated
      const currentState = get();
      console.log('✅ [authStore] Login successful, state updated:', {
        isAuthenticated: currentState.isAuthenticated,
        hasUser: !!currentState.user,
        hasToken: !!currentState.token,
        userId: currentState.user?.id,
        userEmail: currentState.user?.email,
        userRole: currentState.user?.role,
        isAdmin: currentState.user?.role === 'admin',
      });

      // Final check: Warn if role doesn't match expected
      if (currentState.user && currentState.user.role !== 'admin' && profile && profile.role === 'admin') {
        console.error('❌ [authStore] CRITICAL: Database has admin role but app state shows:', currentState.user.role);
        console.error('❌ [authStore] This is a state sync issue. Try logging out and back in.');
      }

      // 🔔 NOTIFY USER OF SUCCESSFUL LOGIN (in-app record)
      try {
        const { notificationService } = require('../services/notificationService');
        await notificationService.createNotification(
          userData.id,
          'general',
          'Vanakam! Welcome back to Thamili ✅',
          'You have successfully logged in to your account.'
        );
      } catch (notifError) {
        console.warn('[authStore] Failed to send login notification:', notifError);
      }

      // 🔔 REGISTER PUSH TOKEN + SEND UNREAD DIGEST PUSH (non-blocking, runs in background)
      setTimeout(async () => {
        try {
          // 1. Register device push token for this user
          const { pushNotificationService } = require('../services/pushNotificationService');
          await pushNotificationService.registerToken(userData.id);
          console.log('✅ [authStore] Push token registered on login');

          // 2. Fire a digest push for any unread notifications
          const { notificationService } = require('../services/notificationService');
          await notificationService.sendLoginDigestPush(userData.id);
        } catch (digestError) {
          console.warn('[authStore] Background digest/token registration failed (non-critical):', digestError);
        }
      }, 3000); // 3 second delay to allow app to fully initialise

      return { success: true };
    } catch (error: any) {
      console.error('❌ [authStore] Login exception:', error);

      // Provide concise, user-friendly error messages
      let errorMessage = 'An unexpected error occurred';

      if (error.message) {
        const errorMsg = error.message.toLowerCase();
        if (errorMsg.includes('network') || errorMsg.includes('connection') || errorMsg.includes('fetch')) {
          errorMessage = 'Network error';
        } else if (errorMsg.includes('timeout')) {
          errorMessage = 'Request timed out';
        } else if (errorMsg.includes('invalid') || errorMsg.includes('credentials')) {
          errorMessage = 'Invalid username or password';
        } else {
          errorMessage = error.message;
        }
      }

      set({ isLoading: false });
      return { success: false, error: errorMessage };
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email, password, name, phone, role = 'customer') => {
    checkRateLimit('auth');
    try {
      set({ isLoading: true });
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, phone },
          // Disable email confirmation redirect for mobile app
          // Users will be auto-logged in if email confirmation is disabled in Supabase
          emailRedirectTo: undefined, // Don't set redirect URL for mobile
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Update user profile (trigger handle_new_user already created the user)
        // Use upsert to handle case where user already exists from trigger
        // Only update fields that are provided, don't set country_preference (let user select it)
        const updateData: any = {
          id: data.user.id,
          email: email,
        };

        // Only include fields if they have values
        if (name) updateData.name = name;
        if (phone) updateData.phone = phone;
        if (role) updateData.role = role;
        // Explicitly don't set country_preference - let it be NULL until user selects

        const { error: upsertError } = await supabase
          .from('users')
          .upsert(updateData, {
            onConflict: 'id',
          });

        if (upsertError) {
          console.error('Error upserting user profile:', upsertError);
          // Don't fail registration if profile update fails - user is still created by trigger
        }

        // If session exists, use it (email confirmation disabled)
        // Otherwise, sign in automatically to get a session
        let session = data.session;
        if (!session) {
          // Auto-login after registration
          // Supabase v1.x uses signIn, not signInWithPassword
          const auth = supabase.auth as any;
          if (auth && typeof auth.signIn === 'function') {
            const { data: signInData, error: signInError } = await auth.signIn({
              email,
              password,
            });

            if (signInError) {
              console.warn('Auto-login after registration failed:', signInError.message);
              // Still return success - user is registered, they can login manually
              return { success: true };
            }

            session = signInData?.session || null;
          } else {
            console.warn('Auto-login skipped: signIn method not available');
            // User is registered, they can login manually
            return { success: true };
          }
        }

        if (session) {
          // Fetch user profile from database
          const { data: profiles } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .limit(1);

          const profile = profiles?.[0];

          const user: User = {
            id: data.user.id,
            email: email,
            phone: phone || profile?.phone || undefined,
            name: name || profile?.name,
            role: profile?.role || role,
            country_preference: profile?.country_preference || undefined,
            photoURL: profile?.avatar_url || undefined,
            created_at: data.user.created_at,
          };

          get().setUser(user);
          get().setToken(session.access_token);

          // Force state update to trigger navigation
          set({ isAuthenticated: true, user, token: session.access_token });

          // 🔔 REGISTER PUSH TOKEN
          setTimeout(async () => {
            try {
              const { pushNotificationService } = require('../services/pushNotificationService');
              await pushNotificationService.registerToken(user.id);
            } catch (err) {
              console.warn('[authStore] Background token registration failed:', err);
            }
          }, 2000);
        }

        return { success: true };
      }

      return { success: false, error: 'Registration failed' };
    } catch (error: any) {
      return { success: false, error: error.message || 'An error occurred' };
    } finally {
      set({ isLoading: false });
    }
  },

  createDeliveryPartner: async (username: string, password: string, phone: string, country: Country) => {
    try {
      set({ isLoading: true });

      // Generate email from username
      const authEmail = `${username}@thamili.app`;

      console.log('🔵 [authStore] Creating delivery partner:', { username, country });

      // Create a temporary un-persisted supabase client to sign up the new user
      // without affecting the admin's currently logged-in session.
      const { createClient } = require('@supabase/supabase-js');
      const { ENV } = require('../config/env');

      const tempSupabase = createClient(
        ENV.SUPABASE_URL,
        ENV.SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        }
      );

      // Register with generated email using Supabase API
      // IMPORTANT: We use a temp client to avoid auto-login overwriting the admin session
      const { user: authUser, error } = await tempSupabase.auth.signUp({
        email: authEmail,
        password,
      }, {
        data: {
          name: username, // Use username as name
          username,
          phone,
          role: 'delivery_partner',
          country_preference: country
        }
      });

      if (error) {
        console.error('❌ Creation error:', error.message);
        if (error.message.includes('already registered')) {
          return { success: false, error: 'This username is already taken.' };
        }
        return { success: false, error: error.message };
      }

      if (authUser) {
        // The user creation trigger in Supabase (handle_new_user) handles the profile creation
        // using the metadata passing in signUp.
        // We do NOT manual upsert here to avoid RLS issues (since signUp might switch session or RLS might block)
        return { success: true };
      }

      return { success: false, error: 'Creation failed' };
    } catch (error: any) {
      console.error('❌ [authStore] Creation exception:', error);
      return { success: false, error: error.message || 'An unexpected error occurred' };
    } finally {
      set({ isLoading: false });
    }
  },

  updateDeliveryPartner: async (userId: string, updates: Partial<User>) => {
    try {
      set({ isLoading: true });
      const supabase = getSupabase();

      // Update user in database
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('❌ [authStore] Update exception:', error);
      return { success: false, error: error.message || 'Update failed' };
    } finally {
      set({ isLoading: false });
    }
  },

  deleteDeliveryPartner: async (userId: string) => {
    try {
      set({ isLoading: true });
      // Use the service we just updated
      await userService.deleteDeliveryPartner(userId);
      return { success: true };
    } catch (error: any) {
      console.error('❌ [authStore] Delete exception:', error);
      return { success: false, error: error.message || 'Delete failed' };
    } finally {
      set({ isLoading: false });
    }
  },

  registerWithUsername: async (username: string, password: string, name: string, email?: string | null, country?: Country) => {
    checkRateLimit('auth');
    try {
      set({ isLoading: true });
      const supabase = getSupabase();

      // Determine the auth email to use: 
      // 1. If real email provided, use it (triggers verification if "Confirm email" is ON)
      // 2. If no email, use dummy (auto-confirmed by DB trigger we just added)
      const authEmail = email && email.trim() !== '' ? email.trim() : `${username}@thamili.app`;
      const isDummyEmail = authEmail.endsWith('@thamili.app');

      console.log('🔵 [authStore] Registering with:', {
        username,
        authEmail,
        isDummyEmail,
        usingGmail: !isDummyEmail,
        country
      });

      // Register in Supabase Auth
      const { user: authUser, session: authSession, error } = await supabase.auth.signUp({
        email: authEmail,
        password,
      }, {
        data: {
          name,
          username,
          contact_email: email || null,
          role: 'customer',
          country_preference: country
        }
      });

      if (error) {
        console.error('❌ Registration error:', error.message);
        // Handle common errors
        if (error.message.includes('already registered')) {
          const field = isDummyEmail ? 'username' : 'email or username';
          return { success: false, error: `This ${field} is already taken.` };
        }
        return { success: false, error: error.message };
      }

      if (authUser) {
        // Upsert user profile into PUBLIC users table
        const updateData: any = {
          id: authUser.id,
          // SUCCESS: Use the REAL email (or null) for the public record
          // We don't want the @thamili.app sitting in the public email column if it's just a dummy
          email: isDummyEmail ? null : authEmail,
          name: name,
          username: username,
          role: 'customer',
          country_preference: country
        };

        console.log('🔵 [authStore] Upserting public profile:', updateData);

        const { error: upsertError } = await supabase
          .from('users')
          .upsert(updateData, { onConflict: 'id' });

        if (upsertError) {
          console.error('⚠️ [authStore] Profile upsert error:', upsertError);
          // Only show error if it's a constraint violation
          if (upsertError.message?.includes('users_email_key')) {
            return { success: false, error: 'This email is already linked to another account.' };
          }
        }

        // Auto-login logic
        let session = authSession;
        if (!session) {
          console.log('🔵 [authStore] No session after signUp, attempting auto-login...');
          const auth = supabase.auth as any;
          if (auth && typeof auth.signIn === 'function') {
            const { user: signInUser, session: signInSession, error: signInError } = await auth.signIn({
              email: authEmail,
              password,
            });

            if (!signInError) {
              session = signInSession || null;
            } else {
              console.log('⚠️ [authStore] Auto-login skipped (likely waiting for email verification):', signInError.message);
            }
          }
        }

        if (session) {
          const user: User = {
            id: authUser.id,
            email: authEmail,
            name: name,
            username: username,
            role: 'customer',
            country_preference: country,
            created_at: authUser.created_at,
          };

          get().setUser(user);
          get().setToken(session.access_token);
          set({ isAuthenticated: true, user, token: session.access_token });
          console.log('✅ [authStore] Registration successful and logged in');

          // 🔔 REGISTER PUSH TOKEN
          setTimeout(async () => {
            try {
              const { pushNotificationService } = require('../services/pushNotificationService');
              await pushNotificationService.registerToken(user.id);
            } catch (err) {
              console.warn('[authStore] Background token registration failed:', err);
            }
          }, 2000);
        } else {
          // If no session even after auto-login attempt, it means email verification is required
          console.log('✅ [authStore] Registration successful, verification email sent to:', authEmail);
        }

        return { success: true };
      }

      return { success: false, error: 'Registration failed' };
    } catch (error: any) {
      console.error('❌ [authStore] Registration exception:', error);
      return { success: false, error: error.message || 'An unexpected error occurred' };
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Logout user and clear all local data
   * Robust implementation to prevent production crashes
   */
  logout: async () => {
    console.log("🔄 [authStore] Starting logout process...");
    const currentState = get();
    const userId = currentState.user?.id;
    // Clear rate limit counters so the next user session starts fresh
    const { resetRateLimit } = require('../utils/rateLimiter');
    resetRateLimit();

    try {
      // 1. Unregister push token before signing out (requires valid session)
      if (userId) {
        console.log('🔔 [authStore] Unregistering push token for user:', userId);
        try {
          const { pushNotificationService } = require('../services/pushNotificationService');
          await pushNotificationService.unregisterToken(userId);
        } catch (pushError) {
          console.warn('⚠️ [authStore] pushNotificationService.unregisterToken failed:', pushError);
        }
      }

      // 2. Clear React Query cache immediately
      // This prevents components from attempting to use stale data during the transition
      try {
        queryClient.clear();
        console.log('🧹 [authStore] Query cache cleared');
      } catch (cacheError) {
        console.warn('⚠️ [authStore] queryClient.clear failed:', cacheError);
      }

      // 3. Attempt Supabase signOut
      const supabase = getSupabase();
      const auth = supabase.auth as any;
      try {
        await auth.signOut();
      } catch (signOutError) {
        console.warn('⚠️ [authStore] Supabase signOut warning:', signOutError);
      }

      // 4. ATOMIC state clear - One single update to trigger UI transition
      // We clear EVERYTHING including cart and country context
      // to ensure a clean slate for the next session
      set({
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false
      });

      // 5. Clear related stores (Zustand)
      try {
        const { useCartStore } = require('./cartStore');
        const { useSavedForLaterStore } = require('./savedForLaterStore');
        
        // Execute clears
        await useCartStore.getState().clearCart();
        await useSavedForLaterStore.getState().clearAll();
        console.log('🧹 [authStore] Related stores cleared');
      } catch (storeError) {
        console.warn('⚠️ [authStore] Error clearing related stores:', storeError);
      }

      // 6. Clear storage
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.USER_TOKEN,
        STORAGE_KEYS.USER_DATA,
        STORAGE_KEYS.CART,
        STORAGE_KEYS.SELECTED_COUNTRY,
        '@thamili_saved_for_later', // Direct key for savedForLaterStore
      ]);

      console.log('✅ [authStore] Logout successful - UI state and storage cleared');
    } catch (error) {
      console.error('❌ [authStore] Error during logout:', error);
      
      // Critical: Still clear local state even if everything else fails
      set({
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false
      });

      // Fallback: Try clearing storage again
      try {
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.USER_TOKEN, 
          STORAGE_KEYS.USER_DATA,
          STORAGE_KEYS.CART,
        ]);
        queryClient.clear();
      } catch (e) {}
    }
  },

  /**
   * Delete user account permanently
   * Calls backend RPC and then clears local state
   */
  deleteAccount: async () => {
    try {
      console.log('🚮 [authStore] deleteAccount() called');
      set({ isLoading: true });
      const { user } = get();
      
      if (!user) {
        console.warn('⚠️ [authStore] deleteAccount() called but no user found');
        return { success: false, error: 'User not authenticated' };
      }

      console.log('🚮 [authStore] Starting account deletion for user:', user.id);

      // 1. Call backend to delete account
      try {
        await userService.deleteCurrentUserAccount();
        console.log('✅ [authStore] Backend account deletion successful');
      } catch (backendError: any) {
        console.error('❌ [authStore] Backend account deletion failed:', backendError);
        throw backendError;
      }

      // 2. Perform same cleanup as logout
      console.log('🧹 [authStore] Performing cleanup (logout style)...');
      await get().logout();

      console.log('✅ [authStore] Account deleted and session cleared');
      return { success: true };
    } catch (error: any) {
      console.error('❌ [authStore] Account deletion error:', error);
      return { success: false, error: error.message || 'Failed to delete account' };
    } finally {
      console.log('🚮 [authStore] deleteAccount() flow finished');
      set({ isLoading: false });
    }
  },

  loadSession: async () => {
    try {
      set({ isLoading: true });
      console.log('🔄 [authStore] Loading session...');

      // 0. RACE CONDITION PROTECTION
      // Allow AsyncStorage and Supabase's internal hydration to settle
      await new Promise(resolve => setTimeout(resolve, 500));

      // 1. Check for deep link first
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl && (initialUrl.includes('access_token') || initialUrl.includes('refresh_token'))) {
        console.log('🔗 [authStore] Initial deep link:', initialUrl);
        await get().handleAuthCallback(initialUrl);
        return;
      }

      // 2. Load from storage for IMMEDIATE UI feedback
      const [token, userData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.USER_TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.USER_DATA)
      ]);

      if (token && userData) {
        try {
          const user = JSON.parse(userData);
          // Normalize role
          if (user.role) {
            user.role = user.role.toLowerCase().trim();
          }

          // Manually sync Supabase client for immediate RLS fulfillment
          // ONLY set the token if it is not yet expired — calling setAuth with an
          // expired token strips the refresh_token from Supabase's internal session,
          // which prevents auto-refresh and causes PGRST303 on every request.
          const supabase = getSupabase();
          const isExpired = (() => {
            try {
              const exp = JSON.parse(atob(token.split('.')[1])).exp as number;
              return exp * 1000 < Date.now();
            } catch { return true; }
          })();
          if (!isExpired && supabase.auth && (supabase.auth as any).setAuth) {
            (supabase.auth as any).setAuth(token);
            console.log('🔑 [authStore] Supabase client synced manually with cached token');
          } else if (isExpired) {
            console.log('⚠️ [authStore] Cached token is expired — skipping setAuth, letting Supabase refresh');
          }
          
          // SET LOCAL STATE IMMEDIATELY for snappy UI - This solves the "App fully closed" issue
          set({ user, token, isAuthenticated: true, isLoading: false });
          console.log('✅ [authStore] Cached session data restored for:', user.email);
          
          // If we have cached data, we can finish initial loading early
          // The rest of the function will run in background to sync with server
        } catch (e) {
          console.error('❌ [authStore] Failed to parse cached user data');
        }
      }

      // 3. Verify/Sync with Supabase
      const supabase = getSupabase();
      const auth = supabase.auth as any;
      let session: any = null;

      try {
        if (auth && typeof auth.getSession === 'function') {
          // Supabase v2 style
          const sessionResponse = await auth.getSession();
          session = sessionResponse?.data?.session || sessionResponse?.session || null;
        } else if (auth && typeof auth.session === 'function') {
          // Supabase v1 style
          session = await auth.session();
        } else if (auth && auth.session) {
          // Some v1 variants expose session as a property
          session = auth.session;
        }
      } catch (sessionError) {
        console.warn('⚠️ [authStore] Error getting Supabase session:', sessionError);
      }

      // 4. MANUAL TOKEN VERIFICATION (Safety for APK builds)
      // If Supabase session is null but we had a token, try to manually fetch user to VERIFY
      let isDefinitiveAuthFailure = false;
      if (!session && token) {
        console.log('🔍 [authStore] Supabase session null but token found, verifying manually...');
        try {
          // Try to get user with the stored token
          // In Supabase v1, getUser is on supabase.auth or supabase.auth.api
          const authObj = supabase.auth as any;
          let verifyResponse;
          
          if (authObj?.api?.getUser) {
            verifyResponse = await authObj.api.getUser(token);
          } else if (authObj?.getUser) {
            verifyResponse = await authObj.getUser(token);
          }
          
          if (verifyResponse) {
            const { user: verifiedUser, error: verifyError } = verifyResponse;
            if (!verifyError && verifiedUser) {
              console.log('✅ [authStore] Manual verification successful for user:', verifiedUser.email);
              session = { user: verifiedUser, access_token: token };
              if (authObj.setAuth) authObj.setAuth(token);
            } else if (verifyError) {
              console.error('❌ [authStore] Manual verification error:', verifyError.message, 'Status:', verifyError.status);
              // Only treat 401 (Unauthorized) or 403 (Forbidden) as definitive failures
              if (verifyError.status === 401 || verifyError.status === 403) {
                isDefinitiveAuthFailure = true;
              }
            }
          }
        } catch (verifyEx: any) {
          console.error('❌ [authStore] Manual verification exception:', verifyEx.message);
          // Exceptions (like network timeout) are NOT definitive auth failures
        }
      }

      if (session?.user) {
        console.log('🔄 [authStore] Syncing profile with database...');
        try {
          // Use 'maybeSingle' to avoid 406 error - it returns null if not found
          const { data: profile, error: profileError } = await (supabase
            .from('users') as any)
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profileError) {
            console.warn('⚠️ [authStore] Database profile fetch failed (continuing with cached data):', profileError.message);
          }

          // Use DB profile if available, otherwise fallback to cached userData
          // This prevents logging users out if they are offline or DB has a temporary hiccup
          const finalProfile = profile || (userData ? JSON.parse(userData) : null);

          if (finalProfile) {
            const updatedUser: User = {
              id: finalProfile.id,
              email: finalProfile.email || session.user.email || '',
              name: finalProfile.name,
              username: finalProfile.username,
              role: (finalProfile.role?.toLowerCase().trim() || 'customer') as UserRole,
              country_preference: finalProfile.country_preference,
              phone: finalProfile.phone,
              photoURL: finalProfile.avatar_url || finalProfile.photoURL,
              created_at: finalProfile.created_at || session.user.created_at,
            };

            // Atomic state update - This confirms the user is authenticated
            set({ 
              user: updatedUser, 
              token: session.access_token, 
              isAuthenticated: true 
            });

            // Persist back to storage to keep it fresh
            await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser));
            await AsyncStorage.setItem(STORAGE_KEYS.USER_TOKEN, session.access_token);
            console.log('✅ [authStore] Session restoration completed successfully');

            // 🔔 REGISTER PUSH TOKEN (Refresh registration on every app start)
            setTimeout(async () => {
              try {
                const { pushNotificationService } = require('../services/pushNotificationService');
                await pushNotificationService.registerToken(updatedUser.id);
              } catch (err) {
                console.warn('[authStore] Background token registration failed:', err);
              }
            }, 5000);
          } else {
            console.warn('⚠️ [authStore] No profile found even in cache');
            set({ isAuthenticated: true, token: session.access_token });
          }
        } catch (innerError) {
          console.error('❌ [authStore] Profile restoration error:', innerError);
          // Don't log out here if we have cached data, just let the app proceed
          if (get().user && get().token) {
            set({ isAuthenticated: true });
          }
        }
      } else {
        // No session found AND manual verification didn't provide a user
        console.log('ℹ️ [authStore] No active Supabase session found');
        
        if (isDefinitiveAuthFailure) {
          console.log('🚮 [authStore] Definitive auth failure (401/403), clearing session');
          set({ isAuthenticated: false, user: null, token: null });
          await AsyncStorage.multiRemove([STORAGE_KEYS.USER_TOKEN, STORAGE_KEYS.USER_DATA]);
        } else if (token && userData) {
          // RESILIENCE: We have cached data and NO definitive failure (could be offline)
          // Keep the user logged in with the data we already restored at the start of this function
          console.log('🛡️ [authStore] Retaining cached session due to verification uncertainty (offline mode)');
          set({ isAuthenticated: true });
        } else {
          // Truly no session and no cached data
          set({ isAuthenticated: false, user: null, token: null });
        }
      }

      const onboarding = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
      set({ hasCompletedOnboarding: onboarding === 'true' });
      
    } catch (error: any) {
      console.error('❌ [authStore] loadSession crash recovery:', error);
      // Resilience: If loadSession crashes, don't leave loading state forever
      set({ isLoading: false });
    } finally {
      set({ isLoading: false });
    }
  },

  setupAuthListener: () => {
    const supabase = getSupabase();
    if (!supabase?.auth?.onAuthStateChange) return;

    console.log('🛡️ [authStore] Setting up global auth listener...');
    
    // Supabase v1.x and v2.x have slightly different onAuthStateChange signatures
    supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      console.log(`🔔 [authStore] Auth event: ${event}`);
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          const token = session.access_token;
          set({ token });
          await AsyncStorage.setItem(STORAGE_KEYS.USER_TOKEN, token);
          
          // Optionally refresh user data if it's missing
          if (!get().user) {
            get().loadSession();
          }
        }
      } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        // Handle external sign outs (e.g. from Dashboard or token revocation)
        if (get().isAuthenticated) {
          console.log('🚮 [authStore] External sign-out detected, clearing local state');
          get().logout();
        }
      }
    });
  },

  updateProfile: async (updates) => {
    try {
      const { user } = get();
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      set({ isLoading: true });
      const updatedUser = await userService.updateUserProfile(user.id, updates);
      get().setUser(updatedUser);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to update profile' };
    } finally {
      set({ isLoading: false });
    }
  },

  updateCountryPreference: async (country) => {
    try {
      const { user } = get();
      if (!user) {
        throw new Error('User not found');
      }

      set({ isLoading: true });
      const updatedUser = await userService.updateCountryPreference(user.id, country);
      // Update user state - this will trigger re-renders in components using useAuthStore
      set({ user: updatedUser });
      // Also save to AsyncStorage
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser));
    } catch (error) {
      console.error('Error updating country preference:', error);
      throw error; // Re-throw so caller can handle it
    } finally {
      set({ isLoading: false });
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    try {
      const { user } = get();
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      set({ isLoading: true });

      // Verify current password
      const supabase = getSupabase();
      const auth = supabase.auth as any;
      const { error: verifyError } = await auth.signIn({
        email: user.email,
        password: currentPassword,
      });

      if (verifyError) {
        return { success: false, error: 'Current password is incorrect' };
      }

      // Update password - try updateUser first, fallback to update
      let updateError = null;
      if (typeof auth.updateUser === 'function') {
        const result = await auth.updateUser({ password: newPassword });
        updateError = result.error;
      } else if (typeof auth.update === 'function') {
        const result = await auth.update({ password: newPassword });
        updateError = result.error;
      } else {
        return { success: false, error: 'Password update method not available' };
      }

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to change password' };
    } finally {
      set({ isLoading: false });
    }
  },

  completeOnboarding: async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
      set({ hasCompletedOnboarding: true });
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  },

  checkOnboardingStatus: async () => {
    try {
      const completed = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
      set({ hasCompletedOnboarding: completed === 'true' });
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      set({ hasCompletedOnboarding: false });
    }
  },

  loginWithGoogle: async () => {
    checkRateLimit('auth');
    try {
      set({ isLoading: true });
      const supabase = getSupabase();

      console.log('🔵 [authStore] Initiating Google Login...');

      // Get the redirect URL
      // Use the scheme defined in app.json and add path
      // e.g. thamili://auth-callback
      const redirectUrl = 'thamili://auth-callback';
      console.log('🔗 [authStore] Redirect URL:', redirectUrl);

      const { user, session, error, url } = await supabase.auth.signIn({
        provider: 'google',
      }, {
        redirectTo: redirectUrl
      });

      if (error) {
        console.error('❌ [authStore] Google login error:', error.message);
        set({ isLoading: false });
        if (error.message.includes('No URL scheme registered')) {
          return { success: false, error: 'Configuration error: URL scheme not found.' };
        }
        return { success: false, error: error.message };
      }

      console.log('✅ [authStore] Google login initiated. Response URL:', url);

      // If Supabase returns a URL (common in v1 RN), open it manually
      if (url) {
        console.log('🔗 [authStore] Opening OAuth URL manually:', url);
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          console.error('❌ [authStore] Cannot open OAuth URL:', url);
          return { success: false, error: 'Cannot open browser for login' };
        }
      }

      return { success: true };
    } catch (error: any) {
      console.error('❌ [authStore] Google login exception:', error);
      set({ isLoading: false });
      return { success: false, error: error.message || 'Google login failed' };
    } finally {
      // Keep loading true for a bit or until app backgrounded?
      // actually better to set false so UI isn't stuck if they cancel
      set({ isLoading: false });
    }
  },

  handleAuthCallback: async (url: string) => {
    try {
      console.log('🔗 [authStore] Handling auth callback:', url);
      set({ isLoading: true });

      const supabase = getSupabase();

      // Parse tokens from URL
      let paramsStr = '';
      if (url.includes('#')) {
        paramsStr = url.split('#')[1];
      } else if (url.includes('?')) {
        paramsStr = url.split('?')[1];
      }

      if (!paramsStr) {
        set({ isLoading: false });
        // No params means we can't do anything
        return;
      }

      // Basic manual parsing to verify presence before potentially complex logic
      // In RN, URLSearchParams should be available via polyfill
      const params = new URLSearchParams(paramsStr);

      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const error = params.get('error_description') || params.get('error');

      if (error) {
        console.error('❌ [authStore] Auth callback error:', error);
        set({ isLoading: false });
        return;
      }

      if (accessToken) {
        console.log('✅ [authStore] Extracted access token from URL');

        // IMPORTANT: Set the session in Supabase so subsequent queries are authenticated
        if (refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
        } else {
          // If no refresh token, at least set the access token
          await (supabase.auth as any).setAuth(accessToken);
        }

        // Fetch user details from Supabase using the token
        const { user: authUser, error: userError } = await supabase.auth.api.getUser(accessToken);

        if (userError || !authUser) {
          console.error('❌ [authStore] Failed to get user details:', userError);
          set({ isLoading: false });
          return;
        }

        // Fetch our DB profile (Now authenticated, so RLS should allow this)
        const { data: profileList } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .limit(1);

        const profileData = (profileList && profileList.length > 0) ? profileList[0] : null;

        // Sync local country preference if DB profile is missing it
        let countryPreference = profileData?.country_preference;
        if (!countryPreference) {
          try {
            // Lazy import to find the current guest preference
            const { useCartStore } = require('./cartStore');
            const localCountry = useCartStore.getState().selectedCountry;
            
            if (localCountry) {
              console.log('🌍 [authStore] Syncing local country preference for Google user:', localCountry);
              await userService.updateCountryPreference(authUser.id, localCountry);
              countryPreference = localCountry;
            }
          } catch (syncError) {
            console.warn('⚠️ [authStore] Failed to sync guest country preference:', syncError);
          }
        }

        // Construct user object
        const userData: User = {
          id: authUser.id,
          email: authUser.email || '',
          phone: authUser.phone || undefined,
          // Fallback sequence: DB username -> Metadata username -> Email -> 'User'
          username: profileData?.username || authUser.user_metadata?.username || authUser.email || 'User',
          // Fallback sequence: DB name -> Metadata name -> Metadata full_name -> Email handle -> 'User'
          name: profileData?.name || authUser.user_metadata?.name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
          role: profileData?.role || 'customer',
          country_preference: countryPreference || undefined,
          photoURL: authUser.user_metadata?.avatar_url || undefined,
          created_at: authUser.created_at || new Date().toISOString(),
        };

        get().setUser(userData);
        // Supabase v1: prefer access_token
        get().setToken(accessToken);

        set({ isAuthenticated: true, user: userData, token: accessToken });
        console.log('✅ [authStore] Google login successful!');
      }

      set({ isLoading: false });
    } catch (error) {
      console.error('❌ [authStore] Error handling auth callback:', error);
      set({ isLoading: false });
    }
  },

  checkVerificationStatus: async (email: string, password: string) => {
    try {
      set({ isLoading: true });
      const supabase = getSupabase();

      // Try to sign in. If it works, the user is verified.
      const auth = supabase.auth as any;
      const { data, user, session, error } = await auth.signIn({
        email,
        password,
      });

      if (error) {
        set({ isLoading: false });
        // Common error when not verified: "Email not confirmed"
        if (error.message.toLowerCase().includes('not confirmed') || error.message.toLowerCase().includes('confirmed')) {
          return { success: false, error: 'Email not confirmed yet. Please check your inbox.' };
        }
        return { success: false, error: error.message };
      }

      const finalUser = user || data?.user;
      const finalSession = session || data?.session;

      if (finalUser && finalSession) {
        // If login succeeds, it means they are verified!
        const { data: profiles } = await supabase
          .from('users')
          .select('*')
          .eq('id', finalUser.id)
          .limit(1);

        const profile = (profiles && profiles.length > 0) ? profiles[0] : null;

        const userData: User = {
          id: finalUser.id,
          email: finalUser.email || '',
          phone: finalUser.phone || undefined,
          username: profile?.username || finalUser.user_metadata?.username,
          name: profile?.name || finalUser.user_metadata?.name,
          role: profile?.role || 'customer',
          country_preference: profile?.country_preference || undefined,
          photoURL: profile?.avatar_url || undefined,
          created_at: finalUser.created_at,
        };

        get().setUser(userData);
        get().setToken(finalSession.access_token);
        set({ isAuthenticated: true, user: userData, token: finalSession.access_token, isLoading: false });

        return { success: true };
      }

      set({ isLoading: false });
      return { success: false, error: 'Could not verify status. Please try logging in manually.' };
    } catch (error: any) {
      set({ isLoading: false });
      return { success: false, error: error.message || 'Verification check failed' };
    }
  },
  resetPasswordForEmail: async (email: string) => {
    checkRateLimit('auth');
    try {
      set({ isLoading: true });
      const supabase = getSupabase();

      console.log('🔵 [authStore] Requesting password reset for:', email);

      // Standard Supabase password reset
      const auth = supabase.auth as any;
      let error = null;

      if (typeof auth.resetPasswordForEmail === 'function') {
        const result = await auth.resetPasswordForEmail(email, {
          redirectTo: 'thamili://reset-password', // Deep link to app
        });
        error = result.error;
      } else if (auth.api && typeof auth.api.resetPasswordForEmail === 'function') {
        const result = await auth.api.resetPasswordForEmail(email, {
          redirectTo: 'thamili://reset-password',
        });
        error = result.error;
      } else {
        return { success: false, error: 'Password reset method not available' };
      }

      if (error) {
        console.error('❌ [authStore] Reset password error:', error.message);
        return { success: false, error: error.message };
      }

      console.log('✅ [authStore] Password reset email sent');
      return { success: true };
    } catch (error: any) {
      console.error('❌ [authStore] Reset password exception:', error);
      return { success: false, error: error.message || 'Failed to send reset email' };
    } finally {
      set({ isLoading: false });
    }
  },

  checkUsername: async (username: string) => {
    checkRateLimit('auth');
    try {
      set({ isLoading: true });
      const supabase = getSupabase();

      console.log('🔵 [authStore] Checking username:', username);

      let foundEmail: string | null = null;
      let userFound = false;

      // 1. Try RPC first (best for security/encapsulation)
      // Use new RPC that returns { exists: boolean, email: string | null }
      const { data: rpcData, error: rpcError } = await supabase.rpc('lookup_user_by_username', { p_username: username });

      if (!rpcError && rpcData && rpcData.exists) {
        foundEmail = rpcData.email;
        userFound = true;
        console.log('✅ [authStore] Found user via RPC:', { email: foundEmail, exists: true });
      } else {
        if (rpcError) console.warn('⚠️ [authStore] RPC error:', rpcError.message);

        // 2. Fallback to table select (if public rls allows)
        // Check BOTH username and name columns
        const { data, error } = await supabase
          .from('users')
          .select('email, id, username, name')
          .or(`username.eq.${username},name.eq.${username}`)
          .limit(1);

        if (data && data.length > 0) {
          foundEmail = data[0].email;
          userFound = true;
          console.log('✅ [authStore] Found user via table select:', {
            hasEmail: !!foundEmail,
            matchedUsername: data[0].username === username,
            matchedName: data[0].name === username
          });
        } else if (error) {
          console.warn('⚠️ [authStore] Table select error:', error.message);
        }
      }

      set({ isLoading: false });

      if (!userFound) {
        return { exists: false, error: 'Username not found' };
      }

      // 3. Check if email is dummy or null
      // Dummy emails end with @thamili.app or @thamili.phone
      // ALSO: If foundEmail is null, treat as dummy (needs new email)
      const isDummy = !foundEmail ||
        foundEmail.endsWith('@thamili.app') ||
        foundEmail.endsWith('@thamili.phone');

      console.log('🔵 [authStore] Username check result:', {
        exists: true,
        emailPrefix: foundEmail ? foundEmail.substring(0, 3) + '...' : 'null',
        isDummy
      });

      return {
        exists: true,
        email: foundEmail || undefined,
        isDummy
      };

    } catch (error: any) {
      console.error('❌ [authStore] Check username exception:', error);
      set({ isLoading: false });
      return { exists: false, error: error.message || 'Failed to check username' };
    }
  },

  recoverAccount: async (username: string, newEmail: string) => {
    try {
      set({ isLoading: true });
      const supabase = getSupabase();

      console.log('🔵 [authStore] Recovering account - updating email for:', { username, newEmail });

      // 1. Call Secure RPC to update email
      // We cannot update auth.users or public.users (due to RLS) directly from client without session
      const { data: rpcData, error: rpcError } = await supabase.rpc('claim_account_email', {
        p_username: username,
        p_new_email: newEmail
      });

      if (rpcError) {
        console.error('❌ [authStore] RPC error:', rpcError.message);
        throw new Error(rpcError.message);
      }

      // Check RPC custom success/error response
      if (rpcData && !rpcData.success) {
        console.error('❌ [authStore] Claim failed:', rpcData.error);
        throw new Error(rpcData.error || 'Failed to update email');
      }

      console.log('✅ [authStore] Email updated successfully via RPC');

      // 2. Trigger Password Reset for the NEW email
      // Now that the email is in auth.users, this will work!
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(newEmail, {
        redirectTo: 'thamili://reset-password',
      });

      if (resetError) {
        console.error('❌ [authStore] Failed to send reset email:', resetError.message);
        throw resetError;
      }

      console.log('✅ [authStore] Recovery/Verification email sent to:', newEmail);

      set({ isLoading: false });
      return { success: true };

    } catch (error: any) {
      console.error('❌ [authStore] Recovery exception:', error);
      set({ isLoading: false });
      return { success: false, error: error.message || 'Recovery failed' };
    }
  }
}));
