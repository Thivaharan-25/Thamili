/**
 * Hook for managing offline queue
 */

import { useEffect, useState } from 'react';
import { offlineQueue, QueuedMutation } from '../utils/offlineQueue';
import { isOnline } from '../utils/networkUtils';
import NetInfo from '@react-native-community/netinfo';
import { orderService } from '../services/orderService';

export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedMutation[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Subscribe to queue changes
    const unsubscribe = offlineQueue.subscribe((updatedQueue) => {
      setQueue(updatedQueue);
    });

    // Initial load
    setQueue(offlineQueue.getQueue());

    // Process queue when coming online
    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      if (state.isConnected && queue.length > 0) {
        processQueue();
      }
    });

    return () => {
      unsubscribe();
      unsubscribeNetInfo();
    };
  }, []);

  const processQueue = async () => {
    if (isProcessing) return;
    
    const online = await isOnline();
    if (!online) return;

    setIsProcessing(true);

    try {
      await offlineQueue.processQueue(async (mutation) => {
        // Execute the mutation based on type
        switch (mutation.type) {
          case 'order':
            if (mutation.operation === 'createOrder') {
              await orderService.createOrder(mutation.data);
            }
            break;
          // Add more mutation types as needed
          default:
            console.warn(`Unknown mutation type: ${mutation.type}`);
        }
      });
    } catch (error) {
      console.error('Error processing offline queue:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const removeFromQueue = async (id: string) => {
    await offlineQueue.remove(id);
  };

  const clearQueue = async () => {
    await offlineQueue.clear();
  };

  return {
    queue,
    queueLength: queue.length,
    isProcessing,
    processQueue,
    removeFromQueue,
    clearQueue,
  };
}

