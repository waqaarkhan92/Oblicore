/**
 * Admin Reviewer Metrics Endpoint
 * GET /api/v1/admin/reviewer-metrics - Get reviewer performance metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireRole, getRequestId } from '@/lib/api/middleware';
import { reviewerAnalyticsService } from '@/lib/services/reviewer-analytics-service';

interface ReviewerMetricsResponse {
  summary: {
    totalItemsReviewed: number;
    avgReviewTimeMinutes: number;
    activeReviewers: number;
    aiAgreementRate: number;
  };
  leaderboard: Array<{
    rank: number;
    reviewerName: string;
    itemsReviewed: number;
    avgTimeMinutes: number;
    confirmRate: number;
    editRate: number;
    aiAgreementRate: number;
    score: number;
  }>;
  trends: Array<{
    period: string;
    itemsReviewed: number;
    avgTimeMinutes: number;
    confirmPercent: number;
    editPercent: number;
    rejectPercent: number;
  }>;
  bottlenecks: Array<{
    userId: string;
    reviewerName: string;
    email: string;
    pendingItems: number;
    avgReviewTimeMinutes: number;
    estimatedBacklogHours: number;
  }>;
}

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require Owner role
    const authResult = await requireRole(request, ['OWNER']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Get date range from query params (default: last 30 days)
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days') || '30';
    const days = parseInt(daysParam, 10);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const dateRange = {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    };

    // Fetch all required data
    const [aggregateStats, reviewerStats, leaderboard, trends, bottlenecks] = await Promise.all([
      reviewerAnalyticsService.getAggregateStats({
        dateRange,
        companyId: user.company_id,
      }),
      reviewerAnalyticsService.getReviewerStats({
        dateRange,
        companyId: user.company_id,
      }),
      reviewerAnalyticsService.getReviewerLeaderboard(10),
      reviewerAnalyticsService.getReviewTrends({
        dateRange,
        groupBy: days > 30 ? 'week' : 'day',
        companyId: user.company_id,
      }),
      reviewerAnalyticsService.getReviewerBottlenecks(user.company_id),
    ]);

    // Calculate overall AI agreement rate from reviewer stats
    const totalItems = reviewerStats.reduce((sum, stat) => sum + stat.itemsReviewed, 0);
    const weightedAgreement = reviewerStats.reduce(
      (sum, stat) => sum + stat.aiAgreementRate * stat.itemsReviewed,
      0
    );
    const overallAiAgreementRate = totalItems > 0 ? weightedAgreement / totalItems : 0;

    // Build summary metrics
    const summary = {
      totalItemsReviewed: aggregateStats.totalReviewed,
      avgReviewTimeMinutes: aggregateStats.avgTimeMinutes,
      activeReviewers: aggregateStats.totalReviewers,
      aiAgreementRate: Math.round(overallAiAgreementRate * 10) / 10,
    };

    // Transform leaderboard data - enrich with stats
    const leaderboardData = leaderboard.map((entry) => {
      const stat = reviewerStats.find((s) => s.userId === entry.userId);
      return {
        rank: entry.rank,
        reviewerName: entry.userName,
        itemsReviewed: entry.itemsReviewed,
        avgTimeMinutes: entry.avgTimeMinutes,
        confirmRate: stat?.confirmRate || 0,
        editRate: stat?.editRate || 0,
        aiAgreementRate: stat?.aiAgreementRate || 0,
        score: entry.score,
      };
    });

    // Transform trends data
    const trendsData = trends.map((trend) => {
      const total = trend.confirmCount + trend.editCount + trend.rejectCount;
      return {
        period: trend.date,
        itemsReviewed: trend.itemsReviewed,
        avgTimeMinutes: trend.avgTimeMinutes,
        confirmPercent: total > 0 ? Math.round((trend.confirmCount / total) * 1000) / 10 : 0,
        editPercent: total > 0 ? Math.round((trend.editCount / total) * 1000) / 10 : 0,
        rejectPercent: total > 0 ? Math.round((trend.rejectCount / total) * 1000) / 10 : 0,
      };
    });

    // Transform bottlenecks data
    const bottlenecksData = bottlenecks.map((bottleneck) => ({
      userId: bottleneck.userId,
      reviewerName: bottleneck.userName,
      email: bottleneck.email,
      pendingItems: bottleneck.pendingItems,
      avgReviewTimeMinutes: bottleneck.avgReviewTimeMinutes,
      estimatedBacklogHours: bottleneck.estimatedBacklogHours,
    }));

    const response: ReviewerMetricsResponse = {
      summary,
      leaderboard: leaderboardData,
      trends: trendsData,
      bottlenecks: bottlenecksData,
    };

    return successResponse(response, 200, { request_id: requestId });
  } catch (error: any) {
    console.error('Get reviewer metrics error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}
