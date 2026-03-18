import { QueryClient, QueryCache } from '@tanstack/react-query';

// Prevents simultaneous PGRST303 errors from triggering multiple refresh attempts
let isRefreshing = false;

const queryCache = new QueryCache({
  onError: async (error: any) => {
    const isJwtExpired =
      error?.code === 'PGRST303' ||
      error?.message === 'JWT expired' ||
      (error?.status === 401 && error?.message?.includes('JWT'));

    if (!isJwtExpired || isRefreshing) return;

    isRefreshing = true;
    console.log('🔄 [queryClient] JWT expired — refreshing session...');

    try {
      const { supabase } = require('../services/supabase');
      const auth = supabase.auth as any;

      let refreshed = false;

      if (typeof auth.refreshSession === 'function') {
        const { data, error: refreshError } = await auth.refreshSession();
        if (!refreshError && data?.session?.access_token) {
          const { AsyncStorage } = require('@react-native-async-storage/async-storage');
          const { STORAGE_KEYS } = require('../constants');
          await AsyncStorage.setItem(STORAGE_KEYS.USER_TOKEN, data.session.access_token);
          console.log('✅ [queryClient] Session refreshed — retrying queries');
          refreshed = true;
        }
      }

      if (refreshed) {
        // Small delay so the new token is fully set before queries re-run
        setTimeout(() => {
          queryClient.invalidateQueries();
        }, 100);
      } else {
        console.warn('⚠️ [queryClient] Session refresh failed — user may need to log in again');
      }
    } catch (e) {
      console.error('❌ [queryClient] Session refresh error:', e);
    } finally {
      isRefreshing = false;
    }
  },
});

export const queryClient = new QueryClient({
  queryCache,
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: (failureCount, error: any) => {
        // Allow one retry for JWT expired — the QueryCache onError above will refresh first
        if (error?.code === 'PGRST303' || error?.message === 'JWT expired') {
          return failureCount < 1;
        }
        // Don't retry other 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        if (error?.name === 'TimeoutError') return false;
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      structuralSharing: true,
      refetchOnMount: 'stale',
    },
    mutations: {
      retry: (failureCount, error: any) => {
        if (error?.status >= 400 && error?.status < 500) return false;
        if (error?.name === 'TimeoutError') return false;
        return failureCount < 1;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
      onError: (error) => {
        console.error('Mutation error:', error);
      },
    },
  },
});
