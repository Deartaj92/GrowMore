/**
 * Request Queue Utility
 * Limits concurrent requests to prevent ERR_INSUFFICIENT_RESOURCES
 * WiFi routers and browsers have connection limits (typically 50-100)
 */

interface QueuedRequest<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
}

class RequestQueue {
  private queue: QueuedRequest<any>[] = [];
  private running = 0;
  private maxConcurrent: number;

  constructor(maxConcurrent: number = 10) {
    this.maxConcurrent = maxConcurrent;
  }

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }

  private async process() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.running++;
    const { fn, resolve, reject } = this.queue.shift()!;

    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.running--;
      this.process(); // Process next item in queue
    }
  }

  /**
   * Process multiple requests in batches
   */
  async batch<T>(requests: (() => Promise<T>)[], batchSize: number = 5): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(req => this.add(req)));
      results.push(...batchResults);
    }
    
    return results;
  }
}

// Global request queue instance
export const requestQueue = new RequestQueue(10);

/**
 * Helper to batch process an array with async operations
 */
export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = 5
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(item => processor(item)));
    results.push(...batchResults);
  }
  
  return results;
}

