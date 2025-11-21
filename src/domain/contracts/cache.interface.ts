/**
 * Cache interface
 * Abstraction for caching operations with TTL support
 */
export interface ICache {
  /**
   * Get value from cache
   * @param key - Cache key
   * @returns Value or null if not found or expired
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set value in cache with optional TTL
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttlMs - Time to live in milliseconds (optional)
   */
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;

  /**
   * Delete value from cache
   * @param key - Cache key
   */
  delete(key: string): Promise<void>;

  /**
   * Clear all cache entries
   */
  clear(): Promise<void>;

  /**
   * Check if key exists in cache
   * @param key - Cache key
   */
  has(key: string): Promise<boolean>;
}
