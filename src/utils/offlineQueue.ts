/**
 * Offline Queue for Mutations
 * Stores failed mutations when offline and retries when online
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { isOnline } from './networkUtils';

export interface QueuedMutation {
  id: string;
  type: 'order' | 'product' | 'profile' | 'other';
  operation: string; // e.g., 'createOrder', 'updateProduct'
  data: any;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

const STORAGE_KEY = '@thamili:offline_queue';
const MAX_QUEUE_SIZE = 100;
const MAX_RETRIES = 3;

class OfflineQueue {
  private queue: QueuedMutation[] = [];
  private processing = false;
  private listeners: Set<(queue: QueuedMutation[]) => void> = new Set();

  /**
   * Initialize queue from storage
   */
  async initialize(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        // Process queue if online
        if (await isOnline()) {
          this.processQueue();
        }
      }
    } catch (error) {
      console.error('Error initializing offline queue:', error);
    }
  }

  /**
   * Add a mutation to the queue
   */
  async enqueue(mutation: Omit<QueuedMutation, 'id' | 'timestamp' | 'retries'>): Promise<string> {
    const id = `mutation-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const queuedMutation: QueuedMutation = {
      ...mutation,
      id,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: mutation.maxRetries ?? MAX_RETRIES,
    };

    // Check queue size
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      // Remove oldest low-priority items
      const lowPriority = this.queue.filter((m) => m.type === 'other');
      if (lowPriority.length > 0) {
        const oldest = lowPriority.sort((a, b) => a.timestamp - b.timestamp)[0];
        this.queue = this.queue.filter((m) => m.id !== oldest.id);
      } else {
        throw new Error('Offline queue is full. Please try again later.');
      }
    }

    this.queue.push(queuedMutation);
    await this.saveQueue();
    this.notifyListeners();

    // Try to process if online
    if (await isOnline()) {
      this.processQueue();
    }

    return id;
  }

  /**
   * Process the queue
   */
  async processQueue(executor?: (mutation: QueuedMutation) => Promise<any>): Promise<void> {
    if (this.processing) return;
    if (this.queue.length === 0) return;
    if (!(await isOnline())) return;

    this.processing = true;

    // Process mutations in order (oldest first)
    const sortedQueue = [...this.queue].sort((a, b) => a.timestamp - b.timestamp);

    for (const mutation of sortedQueue) {
      try {
        if (executor) {
          await executor(mutation);
        }
        // Remove successful mutation
        this.queue = this.queue.filter((m) => m.id !== mutation.id);
        await this.saveQueue();
        this.notifyListeners();
      } catch (error) {
        // Increment retries
        mutation.retries++;
        
        if (mutation.retries >= mutation.maxRetries) {
          // Remove failed mutation after max retries
          console.error(`Mutation ${mutation.id} failed after ${mutation.maxRetries} retries:`, error);
          this.queue = this.queue.filter((m) => m.id !== mutation.id);
          await this.saveQueue();
          this.notifyListeners();
        } else {
          // Update mutation in queue
          const index = this.queue.findIndex((m) => m.id === mutation.id);
          if (index !== -1) {
            this.queue[index] = mutation;
            await this.saveQueue();
          }
        }
      }
    }

    this.processing = false;
  }

  /**
   * Remove a mutation from the queue
   */
  async remove(id: string): Promise<boolean> {
    const index = this.queue.findIndex((m) => m.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      await this.saveQueue();
      this.notifyListeners();
      return true;
    }
    return false;
  }

  /**
   * Clear the queue
   */
  async clear(): Promise<void> {
    this.queue = [];
    await AsyncStorage.removeItem(STORAGE_KEY);
    this.notifyListeners();
  }

  /**
   * Get queue status
   */
  getQueue(): QueuedMutation[] {
    return [...this.queue];
  }

  /**
   * Get queue length
   */
  getLength(): number {
    return this.queue.length;
  }

  /**
   * Subscribe to queue changes
   */
  subscribe(listener: (queue: QueuedMutation[]) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Save queue to storage
   */
  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Error saving offline queue:', error);
    }
  }

  /**
   * Notify listeners of queue changes
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.queue));
  }
}

// Singleton instance
export const offlineQueue = new OfflineQueue();

/**
 * Initialize offline queue on app start
 */
export async function initializeOfflineQueue(): Promise<void> {
  await offlineQueue.initialize();
}

