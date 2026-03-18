/**
 * Request Queue System
 * Manages queuing of critical operations to prevent overload and ensure order
 */

export interface QueuedRequest<T = any> {
  id: string;
  priority: 'high' | 'medium' | 'low';
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

export interface QueueConfig {
  maxConcurrent: number;
  maxQueueSize: number;
  retryDelay: number;
  priorityOrder: boolean;
}

class RequestQueue {
  private queue: QueuedRequest[] = [];
  private running: Set<string> = new Set();
  private config: QueueConfig;
  private processing = false;

  constructor(config: Partial<QueueConfig> = {}) {
    this.config = {
      maxConcurrent: config.maxConcurrent ?? 3,
      maxQueueSize: config.maxQueueSize ?? 50,
      retryDelay: config.retryDelay ?? 1000,
      priorityOrder: config.priorityOrder ?? true,
    };
  }

  /**
   * Add a request to the queue
   */
  async enqueue<T>(
    execute: () => Promise<T>,
    options: {
      priority?: 'high' | 'medium' | 'low';
      maxRetries?: number;
      id?: string;
    } = {}
  ): Promise<T> {
    const {
      priority = 'medium',
      maxRetries = 3,
      id = `req-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    } = options;

    // Check queue size limit
    if (this.queue.length >= this.config.maxQueueSize) {
      throw new Error('Request queue is full. Please try again later.');
    }

    return new Promise<T>((resolve, reject) => {
      const request: QueuedRequest<T> = {
        id,
        priority,
        execute,
        resolve,
        reject,
        timestamp: Date.now(),
        retries: 0,
        maxRetries,
      };

      this.queue.push(request);
      this.processQueue();
    });
  }

  /**
   * Process the queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0 && this.running.size < this.config.maxConcurrent) {
      // Sort by priority if enabled
      if (this.config.priorityOrder) {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        this.queue.sort(
          (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
        );
      }

      const request = this.queue.shift();
      if (!request) break;

      this.running.add(request.id);
      this.executeRequest(request).finally(() => {
        this.running.delete(request.id);
      });
    }

    this.processing = false;

    // Continue processing if there are more items
    if (this.queue.length > 0) {
      setTimeout(() => this.processQueue(), 100);
    }
  }

  /**
   * Execute a single request
   */
  private async executeRequest<T>(request: QueuedRequest<T>): Promise<void> {
    try {
      const result = await request.execute();
      request.resolve(result);
    } catch (error) {
      // Retry logic
      if (request.retries < request.maxRetries) {
        request.retries++;
        const delay = this.config.retryDelay * Math.pow(2, request.retries - 1);
        
        setTimeout(() => {
          this.queue.push(request);
          this.processQueue();
        }, delay);
      } else {
        request.reject(error);
      }
    }
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      running: this.running.size,
      maxConcurrent: this.config.maxConcurrent,
      maxQueueSize: this.config.maxQueueSize,
    };
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.queue.forEach((req) => {
      req.reject(new Error('Queue cleared'));
    });
    this.queue = [];
  }

  /**
   * Remove a specific request from queue
   */
  remove(id: string): boolean {
    const index = this.queue.findIndex((req) => req.id === id);
    if (index !== -1) {
      const request = this.queue[index];
      request.reject(new Error('Request cancelled'));
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }
}

// Singleton instance for app-wide use
export const requestQueue = new RequestQueue({
  maxConcurrent: 3,
  maxQueueSize: 50,
  retryDelay: 1000,
  priorityOrder: true,
});

/**
 * Helper function to queue a request
 */
export async function queueRequest<T>(
  execute: () => Promise<T>,
  priority: 'high' | 'medium' | 'low' = 'medium'
): Promise<T> {
  return requestQueue.enqueue(execute, { priority });
}

