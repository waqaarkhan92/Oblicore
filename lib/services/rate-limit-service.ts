/**
 * Rate Limiting Service
 * Implements rate limiting for notifications using Redis
 * Reference: docs/specs/42_Backend_Notifications.md Section 6
 */

import { getRedisConnection } from '../queue/queue-manager';

export interface RateLimitKey {
  scope: 'user' | 'company' | 'global';
  id: string;
  channel: 'EMAIL' | 'SMS';
}

export interface RateLimitCheck {
  allowed: boolean;
  remaining: number;
  limit: number;
  retryAfter?: Date;
}

/**
 * Get rate limit for a given key
 */
function getRateLimit(key: RateLimitKey): number {
  if (key.channel === 'EMAIL') {
    if (key.scope === 'user') return 100; // 100 emails/hour per user
    if (key.scope === 'company') return 500; // 500 emails/hour per company
    return 10000; // 10,000 emails/hour globally
  } else {
    // SMS limits
    if (key.scope === 'user') return 10; // 10 SMS/hour per user
    if (key.scope === 'company') return 50; // 50 SMS/hour per company
    return 1000; // 1,000 SMS/hour globally
  }
}

/**
 * Check if rate limit allows the request
 */
export async function checkRateLimit(key: RateLimitKey): Promise<RateLimitCheck> {
  const redis = getRedisConnection();
  const redisKey = `rate_limit:${key.scope}:${key.id}:${key.channel}`;
  const limit = getRateLimit(key);

  try {
    // Get current count
    const current = await redis.get(redisKey);
    const currentCount = current ? parseInt(current, 10) : 0;

    if (currentCount >= limit) {
      // Rate limit exceeded - calculate retry time
      const ttl = await redis.ttl(redisKey);
      const retryAfter = ttl > 0 ? new Date(Date.now() + ttl * 1000) : undefined;

      return {
        allowed: false,
        remaining: 0,
        limit,
        retryAfter,
      };
    }

    return {
      allowed: true,
      remaining: limit - currentCount - 1, // -1 because we're about to increment
      limit,
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    // On error, allow the request (fail open)
    return {
      allowed: true,
      remaining: limit,
      limit,
    };
  }
}

/**
 * Record rate limit usage (increment counter)
 */
export async function recordRateLimitUsage(key: RateLimitKey): Promise<void> {
  const redis = getRedisConnection();
  const redisKey = `rate_limit:${key.scope}:${key.id}:${key.channel}`;

  try {
    // Increment counter and set TTL to 1 hour (3600 seconds)
    await redis.incr(redisKey);
    await redis.expire(redisKey, 3600);
  } catch (error) {
    console.error('Rate limit recording error:', error);
    // Fail silently - don't block notification delivery
  }
}

/**
 * Get current rate limit status
 */
export async function getRateLimitStatus(key: RateLimitKey): Promise<{
  current: number;
  limit: number;
  remaining: number;
  resetAt: Date;
}> {
  const redis = getRedisConnection();
  const redisKey = `rate_limit:${key.scope}:${key.id}:${key.channel}`;
  const limit = getRateLimit(key);

  try {
    const current = await redis.get(redisKey);
    const currentCount = current ? parseInt(current, 10) : 0;
    const ttl = await redis.ttl(redisKey);
    const resetAt = ttl > 0 ? new Date(Date.now() + ttl * 1000) : new Date(Date.now() + 3600000);

    return {
      current: currentCount,
      limit,
      remaining: Math.max(0, limit - currentCount),
      resetAt,
    };
  } catch (error) {
    console.error('Rate limit status error:', error);
    return {
      current: 0,
      limit,
      remaining: limit,
      resetAt: new Date(Date.now() + 3600000),
    };
  }
}

