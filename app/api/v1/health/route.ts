/**
 * Health Check Endpoint
 * GET /api/v1/health
 *
 * Purpose: Health check endpoint for monitoring and load balancers
 * Authentication: Not required
 */

import { NextRequest } from 'next/server';
import { successResponse } from '@/lib/api/response';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Show partial env vars for debugging (safe - only shows first chars)
  const envDiagnostics = {
    SUPABASE_URL: process.env.SUPABASE_URL
      ? `${process.env.SUPABASE_URL.substring(0, 40)}...`
      : 'NOT SET',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET',
  };

  try {
    // Check database connection with timeout
    let dbError: any = null;
    let dbDuration = 0;

    try {
      const dbStart = Date.now();
      const dbPromise = supabaseAdmin
        .from('system_settings')
        .select('id')
        .limit(1);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database timeout (5s)')), 5000)
      );

      const result = await Promise.race([dbPromise, timeoutPromise]) as any;
      dbError = result.error;
      dbDuration = Date.now() - dbStart;
    } catch (e: any) {
      dbError = e;
      dbDuration = Date.now() - startTime;
    }

    const databaseStatus = dbError ? 'unhealthy' : 'healthy';

    // Check Redis connection
    let redisStatus: 'healthy' | 'unhealthy' = 'unhealthy';
    try {
      const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL;
      const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN;
      
      if (redisUrl && redisToken) {
        // Try Upstash Redis first
        const { Redis } = await import('@upstash/redis');
        const redis = new Redis({ url: redisUrl, token: redisToken });
        await redis.ping();
        redisStatus = 'healthy';
      } else if (redisUrl && redisUrl.startsWith('redis://')) {
        // Try ioredis for standard Redis
        const Redis = (await import('ioredis')).default;
        const redis = new Redis(redisUrl, { 
          maxRetriesPerRequest: 1,
          connectTimeout: 5000,
          lazyConnect: true 
        });
        await redis.connect();
        await redis.ping();
        await redis.quit();
        redisStatus = 'healthy';
      }
    } catch (error) {
      console.error('Redis health check error:', error);
      redisStatus = 'unhealthy';
    }

    // Check Supabase Storage connection
    let storageStatus: 'healthy' | 'unhealthy' = 'unhealthy';
    try {
      // Test storage by listing buckets (non-destructive check)
      const { data: buckets, error: storageError } = await supabaseAdmin.storage.listBuckets();
      storageStatus = storageError ? 'unhealthy' : 'healthy';
    } catch (error) {
      console.error('Storage health check error:', error);
      storageStatus = 'unhealthy';
    }

    // Check OpenAI API health
    let openaiStatus: 'healthy' | 'unhealthy' = 'unhealthy';
    try {
      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (openaiApiKey) {
        // Quick models list check (lightweight API call)
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
          },
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });
        openaiStatus = response.ok ? 'healthy' : 'unhealthy';
      }
    } catch (error) {
      console.error('OpenAI health check error:', error);
      openaiStatus = 'unhealthy';
    }

    const overallStatus =
      databaseStatus === 'healthy' &&
      storageStatus === 'healthy' &&
      redisStatus === 'healthy' &&
      openaiStatus === 'healthy'
        ? 'healthy'
        : 'degraded';

    return successResponse(
      {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        total_duration_ms: Date.now() - startTime,
        env_diagnostics: envDiagnostics,
        services: {
          database: { status: databaseStatus, duration_ms: dbDuration, error: dbError?.message || null },
          redis: redisStatus,
          storage: storageStatus,
          openai: openaiStatus,
        },
      },
      200,
      { request_id: request.headers.get('x-request-id') || undefined }
    );
  } catch (error: any) {
    return successResponse(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        total_duration_ms: Date.now() - startTime,
        env_diagnostics: envDiagnostics,
        error: error?.message || 'Unknown error',
        services: {
          database: 'unhealthy',
          redis: 'unhealthy',
          storage: 'unhealthy',
          openai: 'unhealthy',
        },
      },
      503
    );
  }
}

