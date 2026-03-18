/**
 * Order Polling Hook
 * Polls order status for real-time updates
 */

import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { orderService } from '../services/orderService';

interface UseOrderPollingOptions {
  orderId: string;
  enabled?: boolean;
  pollInterval?: number; // in milliseconds
  onStatusChange?: (newStatus: string) => void;
}

export function useOrderPolling({
  orderId,
  enabled = true,
  pollInterval = 10000, // Default 10 seconds
  onStatusChange,
}: UseOrderPollingOptions) {
  const queryClient = useQueryClient();
  const previousStatusRef = useRef<string | null>(null);

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderService.getOrderById(orderId),
    enabled: enabled && !!orderId,
    refetchInterval: enabled ? pollInterval : false,
    refetchIntervalInBackground: true,
    staleTime: 0, // Always consider data stale to ensure polling
  });

  // Detect status changes
  useEffect(() => {
    if (order && order.status !== previousStatusRef.current) {
      const previousStatus = previousStatusRef.current;
      previousStatusRef.current = order.status;
      
      if (previousStatus !== null && onStatusChange) {
        onStatusChange(order.status);
      }
    }
  }, [order?.status, onStatusChange]);

  // Invalidate related queries when order status changes
  useEffect(() => {
    if (order) {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    }
  }, [order?.status, orderId, queryClient]);

  return {
    order,
    isLoading,
    error,
    isPolling: enabled && !!orderId,
  };
}

