/**
 * Health Check Endpoint
 * Provides system health status including database connectivity
 * GET /api/health - Public health check
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: {
      status: 'up' | 'down';
      latency_ms: number;
      error?: string;
    };
    redis?: {
      status: 'up' | 'down';
      latency_ms: number;
      error?: string;
    };
  };
}

const startTime = Date.now();

export async function GET(request: NextRequest) {
  const checks: HealthStatus['checks'] = {
    database: { status: 'down', latency_ms: 0 },
  };

  // Check database connectivity
  const dbStart = Date.now();
  try {
    const { data, error } = await supabaseAdmin
      .from('companies')
      .select('id')
      .limit(1);

    checks.database.latency_ms = Date.now() - dbStart;

    if (error) {
      checks.database.status = 'down';
      checks.database.error = error.message;
    } else {
      checks.database.status = 'up';
    }
  } catch (error: any) {
    checks.database.latency_ms = Date.now() - dbStart;
    checks.database.status = 'down';
    checks.database.error = error.message;
  }

  // Check Redis connectivity (if configured)
  if (process.env.UPSTASH_REDIS_REST_URL) {
    const redisStart = Date.now();
    try {
      const response = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/ping`, {
        headers: {
          Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
        },
      });

      checks.redis = {
        status: response.ok ? 'up' : 'down',
        latency_ms: Date.now() - redisStart,
      };

      if (!response.ok) {
        checks.redis.error = `HTTP ${response.status}`;
      }
    } catch (error: any) {
      checks.redis = {
        status: 'down',
        latency_ms: Date.now() - redisStart,
        error: error.message,
      };
    }
  }

  // Determine overall status
  const allUp = Object.values(checks).every(c => c.status === 'up');
  const allDown = Object.values(checks).every(c => c.status === 'down');

  const health: HealthStatus = {
    status: allUp ? 'healthy' : allDown ? 'unhealthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks,
  };

  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

  return NextResponse.json(health, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Health-Status': health.status,
    },
  });
}
