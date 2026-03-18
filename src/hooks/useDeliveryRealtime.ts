import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';

export const useDeliveryRealtime = (deliveryPartnerId: string, onUpdate?: () => void) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!deliveryPartnerId) return;

    console.log('🔌 Subscribing to delivery schedule updates for:', deliveryPartnerId);

    const subscription = supabase
      .from(`delivery_schedule:delivery_partner_id=eq.${deliveryPartnerId}`)
      .on('*', (payload: any) => {
        console.log('⚡ Delivery schedule update received:', payload);
        // Invalidate queries to trigger refetch
        queryClient.invalidateQueries({ queryKey: ['deliverySchedules'] });
        if (onUpdate) onUpdate();
      })
      .subscribe((status: string) => {
        console.log('🔌 Subscription status:', status);
      });

    return () => {
      console.log('🔌 Unsubscribing from delivery schedule updates');
      subscription.unsubscribe();
    };
  }, [deliveryPartnerId, queryClient, onUpdate]);
};
