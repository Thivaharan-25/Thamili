import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Order } from '../types';

// Lazy import Supabase to avoid initialization during module load
function getSupabase() {
  return require('../services/supabase').supabase;
}

/**
 * Hook to set up real-time order updates
 * Compatible with Supabase v1.x
 */
export const useOrderRealtime = (userId: string) => {
  const queryClient = useQueryClient();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!userId) return;

    let subscription: any = null;

    try {
      const supabase = getSupabase();

      if (supabase && typeof supabase.from === 'function') {
        subscription = supabase
          .from(`orders`)
          .on('*', (payload: any) => {
            if (payload.new && payload.new.user_id && payload.new.user_id !== userId) {
              return;
            }

            // Debounce: batch rapid updates into a single invalidation (300ms window)
            if (debounceTimer.current) {
              clearTimeout(debounceTimer.current);
            }
            debounceTimer.current = setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ['orders', userId] });

              if (payload.new && 'id' in payload.new) {
                queryClient.invalidateQueries({
                  queryKey: ['order', (payload.new as Order).id],
                });
              }
              // Also invalidate allOrders cache for admin dashboard
              queryClient.invalidateQueries({ queryKey: ['allOrders'] });
            }, 300);
          })
          .subscribe();
      }

      return () => {
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
        }
        try {
          if (subscription) {
            const supabase = getSupabase();
            supabase.removeSubscription(subscription);
          }
        } catch (error) {
          console.warn('⚠️ [useOrderRealtime] Error removing subscription:', error);
        }
      };
    } catch (error) {
      console.error('❌ [useOrderRealtime] Error setting up realtime subscription:', error);
    }
  }, [userId, queryClient]);
};
