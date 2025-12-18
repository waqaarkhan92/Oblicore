/**
 * Database Health & Monitoring Endpoint
 * Provides detailed database connectivity and performance metrics
 * GET /api/health/db - Requires admin authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireRole } from '@/lib/api/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';

interface DatabaseMetrics {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  connection: {
    status: 'connected' | 'disconnected';
    latency_ms: number;
    pooler: string;
  };
  performance: {
    query_time_ms: number;
    table_count: number;
  };
  tables: {
    name: string;
    row_count: number;
    size_estimate: string;
  }[];
  recentActivity: {
    type: string;
    count: number;
  }[];
}

export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    const authResult = await requireRole(request, ['OWNER', 'ADMIN']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const metrics: DatabaseMetrics = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      connection: {
        status: 'disconnected',
        latency_ms: 0,
        pooler: 'Supabase PgBouncer',
      },
      performance: {
        query_time_ms: 0,
        table_count: 0,
      },
      tables: [],
      recentActivity: [],
    };

    // Test connection with timing
    const connStart = Date.now();
    const { data: testData, error: testError } = await supabaseAdmin
      .from('companies')
      .select('id')
      .limit(1);

    metrics.connection.latency_ms = Date.now() - connStart;
    metrics.connection.status = testError ? 'disconnected' : 'connected';

    if (testError) {
      metrics.status = 'unhealthy';
      return successResponse(metrics, 200);
    }

    // Get table counts for key tables
    const queryStart = Date.now();
    const tablesToCheck = [
      'companies',
      'sites',
      'users',
      'documents',
      'obligations',
      'evidence',
      'notifications',
      'audit_packs',
    ];

    for (const tableName of tablesToCheck) {
      try {
        const { count, error } = await supabaseAdmin
          .from(tableName)
          .select('id', { count: 'exact', head: true });

        if (!error) {
          metrics.tables.push({
            name: tableName,
            row_count: count || 0,
            size_estimate: estimateSize(count || 0),
          });
        }
      } catch {
        // Table might not exist, skip
      }
    }

    metrics.performance.query_time_ms = Date.now() - queryStart;
    metrics.performance.table_count = metrics.tables.length;

    // Get recent activity counts (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const activityQueries = [
      { type: 'new_documents', table: 'documents', dateField: 'created_at' },
      { type: 'new_evidence', table: 'evidence', dateField: 'created_at' },
      { type: 'notifications_sent', table: 'notifications', dateField: 'created_at' },
      { type: 'packs_generated', table: 'audit_packs', dateField: 'created_at' },
    ];

    for (const query of activityQueries) {
      try {
        const { count, error } = await supabaseAdmin
          .from(query.table)
          .select('id', { count: 'exact', head: true })
          .gte(query.dateField, yesterday);

        if (!error) {
          metrics.recentActivity.push({
            type: query.type,
            count: count || 0,
          });
        }
      } catch {
        // Skip if table doesn't exist
      }
    }

    // Determine overall status
    if (metrics.connection.latency_ms > 5000) {
      metrics.status = 'degraded';
    } else if (metrics.connection.latency_ms > 10000) {
      metrics.status = 'unhealthy';
    }

    return successResponse(metrics, 200);
  } catch (error: any) {
    console.error('Database health check failed:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Health check failed',
      500,
      { error: error.message }
    );
  }
}

function estimateSize(rowCount: number): string {
  // Rough estimate: ~1KB per row average
  const bytes = rowCount * 1024;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
