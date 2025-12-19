import Redis from 'ioredis';

/**
 * Singleton Redis client for caching
 * Gracefully handles when Redis is not configured or unavailable
 */
class RedisClient {
  private static instance: RedisClient;
  private client: Redis | null = null;
  private isConnected: boolean = false;
  private isEnabled: boolean = false;

  private constructor() {
    this.initialize();
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  /**
   * Initialize the Redis connection
   */
  private initialize(): void {
    const redisUrl = process.env.REDIS_URL;

    // Skip initialization if Redis URL is not configured
    if (!redisUrl) {
      console.log('[Redis] REDIS_URL not configured, caching is disabled');
      this.isEnabled = false;
      return;
    }

    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        reconnectOnError(err) {
          const targetError = 'READONLY';
          if (err.message.includes(targetError)) {
            // Only reconnect when the error contains "READONLY"
            return true;
          }
          return false;
        },
        enableReadyCheck: true,
        lazyConnect: true,
      });

      // Handle connection events
      this.client.on('connect', () => {
        console.log('[Redis] Connecting...');
      });

      this.client.on('ready', () => {
        console.log('[Redis] Connected and ready');
        this.isConnected = true;
        this.isEnabled = true;
      });

      this.client.on('error', (error) => {
        console.error('[Redis] Connection error:', error.message);
        this.isConnected = false;
        // Keep isEnabled true to allow retry attempts
      });

      this.client.on('close', () => {
        console.log('[Redis] Connection closed');
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        console.log('[Redis] Reconnecting...');
      });

      this.isEnabled = true;
    } catch (error) {
      console.error('[Redis] Failed to initialize:', error);
      this.isEnabled = false;
      this.client = null;
    }
  }

  /**
   * Connect to Redis
   */
  public async connect(): Promise<void> {
    if (!this.isEnabled || !this.client) {
      return;
    }

    if (this.isConnected) {
      return;
    }

    try {
      await this.client.connect();
    } catch (error) {
      console.error('[Redis] Failed to connect:', error);
      this.isConnected = false;
    }
  }

  /**
   * Disconnect from Redis
   */
  public async disconnect(): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      await this.client.quit();
      this.isConnected = false;
    } catch (error) {
      console.error('[Redis] Failed to disconnect gracefully:', error);
      // Force disconnect
      this.client.disconnect();
    }
  }

  /**
   * Get the Redis client instance
   * Returns null if Redis is not available
   */
  public getClient(): Redis | null {
    if (!this.isEnabled || !this.client) {
      return null;
    }

    // Auto-connect if not connected
    if (!this.isConnected) {
      this.connect().catch((error) => {
        console.error('[Redis] Auto-connect failed:', error);
      });
      // Return null for this call, retry on next call
      return null;
    }

    return this.client;
  }

  /**
   * Check if Redis is available and connected
   */
  public isAvailable(): boolean {
    return this.isEnabled && this.isConnected && this.client !== null;
  }

  /**
   * Ping Redis to check connection
   */
  public async ping(): Promise<boolean> {
    const client = this.getClient();
    if (!client) {
      return false;
    }

    try {
      const result = await client.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('[Redis] Ping failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const redisClient = RedisClient.getInstance();

// Export class for testing
export { RedisClient };
