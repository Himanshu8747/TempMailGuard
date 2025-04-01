/**
 * Simple in-memory cache implementation with TTL support
 */
export class Cache<T> {
  private cache: Map<string, { value: T; expiry: number }>;
  private defaultTtl: number;
  
  /**
   * Initialize a new cache
   * @param defaultTtl Default time-to-live in milliseconds
   */
  constructor(defaultTtl: number = 5 * 60 * 1000) { // Default 5 minute TTL
    this.cache = new Map();
    this.defaultTtl = defaultTtl;
    
    // Set up periodic cleanup of expired items
    setInterval(() => this.cleanup(), 60 * 1000); // Run cleanup every minute
  }
  
  /**
   * Set a cache item
   * @param key Cache key
   * @param value Value to store
   * @param ttl Custom TTL in milliseconds (optional)
   */
  set(key: string, value: T, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.defaultTtl);
    this.cache.set(key, { value, expiry });
  }
  
  /**
   * Get a cache item
   * @param key Cache key
   * @returns The cached value or undefined if not found or expired
   */
  get(key: string): T | undefined {
    const item = this.cache.get(key);
    
    if (!item) {
      return undefined;
    }
    
    // Check if item has expired
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return undefined;
    }
    
    return item.value;
  }
  
  /**
   * Delete a cache item
   * @param key Cache key
   */
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Get the number of items in the cache
   */
  size(): number {
    return this.cache.size;
  }
  
  /**
   * Remove all expired items from the cache
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

// Create domain cache with 1 hour TTL
export const domainCache = new Cache<boolean>(60 * 60 * 1000);

// Create email verification cache with 15 minute TTL
export const emailCache = new Cache<any>(15 * 60 * 1000);