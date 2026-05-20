type CacheEntry<T> = {
  timestamp: number;
  data: T;
};

/**
 * Get cached data from localStorage.
 * @param key Unique cache key.
 * @param ttlMs Time-to-live in milliseconds. If data is older, it is ignored.
 */
export function getCache<T>(key: string, ttlMs: number = 5 * 60 * 1000): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > ttlMs) {
      // expired
      localStorage.removeItem(key);
      return null;
    }
    return entry.data;
  } catch (e) {
    console.warn('Cache get error', e);
    return null;
  }
}

/**
 * Store data in localStorage with a timestamp.
 */
export function setCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { timestamp: Date.now(), data };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (e) {
    console.warn('Cache set error', e);
  }
}

/**
 * Clear a specific cache entry.
 */
export function clearCache(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn('Cache clear error', e);
  }
}
