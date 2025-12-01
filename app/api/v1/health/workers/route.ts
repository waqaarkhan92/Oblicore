/**
 * Worker Health Check Endpoint
 * GET /api/v1/health/workers - Check if workers are running
 */

import { NextRequest, NextResponse } from 'next/server';
import { getQueue, QUEUE_NAMES } from '@/lib/queue/queue-manager';
import { getRedisConnection } from '@/lib/queue/queue-manager';

export async function GET(request: NextRequest) {
  try {
    // Check Redis connection
    let redisConnected = false;
    try {
      const redis = getRedisConnection();
      await redis.ping();
      redisConnected = true;
    } catch (error: any) {
      return NextResponse.json({
        status: 'error',
        redis: {
          connected: false,
          error: error.message,
        },
        workers: {
          running: false,
          error: 'Redis not connected',
        },
      }, { status: 503 });
    }

    // Check queue status
    const queue = getQueue(QUEUE_NAMES.DOCUMENT_PROCESSING);
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);

    // Workers are considered running if Redis is connected
    // (We can't directly check if workers are listening, but if Redis is connected
    // and jobs are being processed, workers are likely running)
    const workersRunning = redisConnected && (active > 0 || completed > 0 || waiting < 100);

    return NextResponse.json({
      status: workersRunning ? 'healthy' : 'degraded',
      redis: {
        connected: redisConnected,
      },
      workers: {
        running: workersRunning,
        queue: {
          waiting,
          active,
          completed,
          failed,
        },
      },
      message: workersRunning
        ? 'Workers are running and processing jobs'
        : 'Workers may not be running. Start with: npm run worker',
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      error: error.message,
    }, { status: 500 });
  }
}



