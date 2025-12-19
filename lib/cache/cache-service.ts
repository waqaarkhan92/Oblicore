import { redisClient } from './redis-client';

/**
 * Cache key patterns and TTL configuration
 */
export const CacheKeys = {
  // User-related cache keys
  userPermissions: (userId: string) => `user:${userId}:permissions`,
  userPattern: (userId: string) => `user:${userId}:*`,

  // Site-related cache keys
  siteData: (siteId: string) => `site:${siteId}:data`,
  sitePattern: (siteId: string) => `site:${siteId}:*`,

  // Company-related cache keys
  companySettings: (companyId: string) => `company:${companyId}:settings`,
  companyPattern: (companyId: string) => `company:${companyId}:*`,

  // Risk-related cache keys
  riskScores: (siteId: string) => `risk:${siteId}:scores`,
  riskPattern: (siteId: string) => `risk:${siteId}:*`,
} as const;

/**
 * Default TTL values in seconds
 */
export const CacheTTL = {
  userPermissions: 300, // 5 minutes
  siteData: 600, // 10 minutes
  companySettings: 1800, // 30 minutes
  riskScores: 3600, // 1 hour
  default: 300, // 5 minutes
} as const;

/**
 * Cache service for managing application cache
 * Gracefully falls back to direct data access when Redis is unavailable
 */
class CacheService {
  private static instance: CacheService;

  private constructor() {}

  /**
   * Get the singleton instance
   */
  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Get a cached value
   * @param key Cache key
   * @returns The cached value or null if not found
   */
  public async get<T>(key: string): Promise<T | null> {
    const client = redisClient.getClient();
    if (!client) {
      // Redis not available, return null to trigger data fetch
      return null;
    }

    try {
      const value = await client.get(key);
      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`[Cache] Failed to get key "${key}":`, error);
      return null;
    }
  }

  /**
   * Set a value in cache with optional TTL
   * @param key Cache key
   * @param value Value to cache
   * @param ttlSeconds Time to live in seconds (optional)
   */
  public async set<T>(
    key: string,
    value: T,
    ttlSeconds: number = CacheTTL.default
  ): Promise<void> {
    const client = redisClient.getClient();
    if (!client) {
      // Redis not available, silently skip caching
      return;
    }

    try {
      const serialized = JSON.stringify(value);

      if (ttlSeconds > 0) {
        await client.setex(key, ttlSeconds, serialized);
      } else {
        await client.set(key, serialized);
      }
    } catch (error) {
      console.error(`[Cache] Failed to set key "${key}":`, error);
      // Don't throw - caching should not break the application
    }
  }

  /**
   * Delete a single cache key
   * @param key Cache key to delete
   */
  public async delete(key: string): Promise<void> {
    const client = redisClient.getClient();
    if (!client) {
      return;
    }

    try {
      await client.del(key);
    } catch (error) {
      console.error(`[Cache] Failed to delete key "${key}":`, error);
    }
  }

  /**
   * Delete all keys matching a pattern
   * @param pattern Pattern to match (e.g., "user:123:*")
   */
  public async deletePattern(pattern: string): Promise<void> {
    const client = redisClient.getClient();
    if (!client) {
      return;
    }

    try {
      // Use SCAN to safely iterate through keys
      const stream = client.scanStream({
        match: pattern,
        count: 100,
      });

      const keys: string[] = [];

      stream.on('data', (resultKeys: string[]) => {
        keys.push(...resultKeys);
      });

      await new Promise<void>((resolve, reject) => {
        stream.on('end', () => resolve());
        stream.on('error', (error) => reject(error));
      });

      // Delete keys in batches
      if (keys.length > 0) {
        const pipeline = client.pipeline();
        keys.forEach((key) => pipeline.del(key));
        await pipeline.exec();
        console.log(`[Cache] Deleted ${keys.length} keys matching pattern "${pattern}"`);
      }
    } catch (error) {
      console.error(`[Cache] Failed to delete pattern "${pattern}":`, error);
    }
  }

  /**
   * Invalidate all user-related cache
   * @param userId User ID
   */
  public async invalidateUser(userId: string): Promise<void> {
    const pattern = CacheKeys.userPattern(userId);
    await this.deletePattern(pattern);
  }

  /**
   * Invalidate all site-related cache
   * @param siteId Site ID
   */
  public async invalidateSite(siteId: string): Promise<void> {
    const pattern = CacheKeys.sitePattern(siteId);
    await this.deletePattern(pattern);

    // Also invalidate risk scores for this site
    const riskPattern = CacheKeys.riskPattern(siteId);
    await this.deletePattern(riskPattern);
  }

  /**
   * Invalidate all company-related cache
   * @param companyId Company ID
   */
  public async invalidateCompany(companyId: string): Promise<void> {
    const pattern = CacheKeys.companyPattern(companyId);
    await this.deletePattern(pattern);
  }

  /**
   * Get cached value with fallback to data fetcher
   * This is the primary method for cache-aside pattern
   *
   * @param key Cache key
   * @param getter Function to fetch data if not cached
   * @param ttlSeconds Time to live in seconds (optional)
   * @returns The cached or freshly fetched value
   */
  public async getCached<T>(
    key: string,
    getter: () => Promise<T>,
    ttlSeconds: number = CacheTTL.default
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss or Redis unavailable - fetch fresh data
    const data = await getter();

    // Cache the result (fire and forget)
    this.set(key, data, ttlSeconds).catch((error) => {
      console.error(`[Cache] Failed to cache key "${key}":`, error);
    });

    return data;
  }

  /**
   * Check if cache is available
   */
  public isAvailable(): boolean {
    return redisClient.isAvailable();
  }

  /**
   * Get cache health status
   */
  public async getHealth(): Promise<{
    available: boolean;
    connected: boolean;
    ping: boolean;
  }> {
    const available = redisClient.isAvailable();
    const ping = await redisClient.ping();

    return {
      available,
      connected: available,
      ping,
    };
  }

  /**
   * Clear all cache (use with caution)
   */
  public async clearAll(): Promise<void> {
    const client = redisClient.getClient();
    if (!client) {
      return;
    }

    try {
      await client.flushdb();
      console.log('[Cache] Cleared all cache');
    } catch (error) {
      console.error('[Cache] Failed to clear all cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  public async getStats(): Promise<{
    dbSize: number;
    memoryUsed: string;
    hitRate?: number;
  } | null> {
    const client = redisClient.getClient();
    if (!client) {
      return null;
    }

    try {
      const dbSize = await client.dbsize();
      const info = await client.info('memory');

      // Parse memory usage from info string
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memoryUsed = memoryMatch ? memoryMatch[1] : 'unknown';

      return {
        dbSize,
        memoryUsed,
      };
    } catch (error) {
      console.error('[Cache] Failed to get stats:', error);
      return null;
    }
  }
}

// Export singleton instance
export const cacheService = CacheService.getInstance();

// Export class for testing
export { CacheService };
