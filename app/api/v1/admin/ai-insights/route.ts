/**
 * AI Insights API Route
 * Returns AI analytics data for the admin dashboard
 * Owner-only access
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { aiAnalyticsService } from '@/lib/services/ai-analytics-service';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Check user role - require OWNER
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        company_id,
        user_roles(role)
      `)
      .eq('id', user.id)
      .single();

    const userRoles = (userData?.user_roles as any[])?.map((r: any) => r.role) || [];

    if (!userRoles.includes('OWNER')) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Owner access required',
        403,
        null,
        { request_id: requestId }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30', 10);
    const companyId = searchParams.get('companyId') || undefined;

    // Calculate date range
    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const dateRange = { startDate, endDate };

    // Fetch all metrics in parallel
    const [patternHitRate, costMetrics, patternHealth, extractionStats] = await Promise.all([
      aiAnalyticsService.getPatternHitRate({ companyId, dateRange }),
      aiAnalyticsService.getCostMetrics({ companyId, dateRange }),
      aiAnalyticsService.getPatternLibraryHealth(),
      aiAnalyticsService.getExtractionStats({ dateRange }),
    ]);

    // Calculate previous period for comparison
    const prevEndDate = startDate;
    const prevStartDate = new Date(new Date(startDate).getTime() - days * 24 * 60 * 60 * 1000).toISOString();
    const prevDateRange = { startDate: prevStartDate, endDate: prevEndDate };

    const [prevCostMetrics] = await Promise.all([
      aiAnalyticsService.getCostMetrics({ companyId, dateRange: prevDateRange }),
    ]);

    // Calculate cost change percentage
    const costChange = prevCostMetrics.totalCost > 0
      ? ((costMetrics.totalCost - prevCostMetrics.totalCost) / prevCostMetrics.totalCost) * 100
      : 0;

    return successResponse({
      summary: {
        patternHitRate: patternHitRate.hitRate,
        totalCost: costMetrics.totalCost,
        costChange: Math.round(costChange * 10) / 10,
        activePatterns: patternHealth.activePatterns,
        avgConfidence: extractionStats.avgConfidence,
        totalExtractions: extractionStats.total,
      },
      patternHitRate,
      costMetrics,
      patternHealth,
      extractionStats,
      period: {
        days,
        startDate,
        endDate,
      },
    }, 200, { request_id: requestId });
  } catch (error: any) {
    console.error('AI Insights API error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      error.message || 'Failed to fetch AI insights',
      500,
      null,
      { request_id: requestId }
    );
  }
}
