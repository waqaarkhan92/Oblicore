/**
 * Reviewer Analytics Service
 * Tracks reviewer performance metrics for the admin dashboard
 */

import { supabaseAdmin } from '@/lib/supabase/server';

// Types
export interface ReviewerStats {
  userId: string;
  userName: string;
  email: string;
  itemsReviewed: number;
  avgTimeMinutes: number;
  confirmRate: number;
  editRate: number;
  rejectRate: number;
  aiAgreementRate: number;
}

export interface AggregateReviewStats {
  totalReviewed: number;
  avgTimeMinutes: number;
  totalReviewers: number;
  itemsPerReviewer: number;
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  rank: number;
  itemsReviewed: number;
  avgTimeMinutes: number;
  score: number;
}

export interface TrendDataPoint {
  date: string;
  itemsReviewed: number;
  avgTimeMinutes: number;
  confirmCount: number;
  editCount: number;
  rejectCount: number;
}

export interface DateRangeOptions {
  dateRange?: {
    start: string;
    end: string;
  };
  companyId?: string;
}

export interface TrendOptions extends DateRangeOptions {
  groupBy: 'day' | 'week';
}

/**
 * Reviewer Analytics Service
 * Provides comprehensive analytics for reviewer performance tracking
 */
export class ReviewerAnalyticsService {
  /**
   * Get per-reviewer statistics
   */
  async getReviewerStats(options: DateRangeOptions = {}): Promise<ReviewerStats[]> {
    const { dateRange, companyId } = options;

    try {
      // Build query for review queue items
      let query = supabaseAdmin
        .from('review_queue_items')
        .select(
          `
          id,
          reviewed_by,
          reviewed_at,
          review_action,
          created_at,
          company_id,
          users:reviewed_by (
            id,
            full_name,
            email
          )
        `
        )
        .not('reviewed_by', 'is', null)
        .not('reviewed_at', 'is', null)
        .in('review_status', ['CONFIRMED', 'EDITED', 'REJECTED']);

      // Apply date range filter
      if (dateRange) {
        query = query.gte('reviewed_at', dateRange.start).lte('reviewed_at', dateRange.end);
      }

      // Apply company filter
      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data: items, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch review items: ${error.message}`);
      }

      if (!items || items.length === 0) {
        return [];
      }

      // Group items by reviewer
      const reviewerMap = new Map<string, any[]>();
      items.forEach((item: any) => {
        if (item.reviewed_by) {
          if (!reviewerMap.has(item.reviewed_by)) {
            reviewerMap.set(item.reviewed_by, []);
          }
          reviewerMap.get(item.reviewed_by)!.push(item);
        }
      });

      // Calculate stats for each reviewer
      const stats: ReviewerStats[] = [];

      for (const [userId, reviewerItems] of reviewerMap.entries()) {
        const firstItem = reviewerItems[0];
        const user = firstItem.users;

        if (!user) continue;

        // Calculate review times
        const reviewTimes: number[] = [];
        reviewerItems.forEach((item: any) => {
          if (item.created_at && item.reviewed_at) {
            const createdAt = new Date(item.created_at).getTime();
            const reviewedAt = new Date(item.reviewed_at).getTime();
            const timeMinutes = (reviewedAt - createdAt) / (1000 * 60);
            if (timeMinutes > 0) {
              reviewTimes.push(timeMinutes);
            }
          }
        });

        const avgTimeMinutes =
          reviewTimes.length > 0
            ? reviewTimes.reduce((sum, time) => sum + time, 0) / reviewTimes.length
            : 0;

        // Calculate action rates
        const totalItems = reviewerItems.length;
        const confirmCount = reviewerItems.filter(
          (item: any) => item.review_action === 'CONFIRMED'
        ).length;
        const editCount = reviewerItems.filter(
          (item: any) => item.review_action === 'EDITED'
        ).length;
        const rejectCount = reviewerItems.filter(
          (item: any) => item.review_action === 'REJECTED'
        ).length;

        const confirmRate = totalItems > 0 ? (confirmCount / totalItems) * 100 : 0;
        const editRate = totalItems > 0 ? (editCount / totalItems) * 100 : 0;
        const rejectRate = totalItems > 0 ? (rejectCount / totalItems) * 100 : 0;

        // AI Agreement Rate = Confirm Rate (how often they agree with AI)
        const aiAgreementRate = confirmRate;

        stats.push({
          userId,
          userName: user.full_name || 'Unknown',
          email: user.email || '',
          itemsReviewed: totalItems,
          avgTimeMinutes: Math.round(avgTimeMinutes * 10) / 10,
          confirmRate: Math.round(confirmRate * 10) / 10,
          editRate: Math.round(editRate * 10) / 10,
          rejectRate: Math.round(rejectRate * 10) / 10,
          aiAgreementRate: Math.round(aiAgreementRate * 10) / 10,
        });
      }

      // Sort by items reviewed (descending)
      stats.sort((a, b) => b.itemsReviewed - a.itemsReviewed);

      return stats;
    } catch (error: any) {
      console.error('Error fetching reviewer stats:', error);
      throw error;
    }
  }

  /**
   * Get aggregate review statistics
   */
  async getAggregateStats(options: DateRangeOptions = {}): Promise<AggregateReviewStats> {
    const { dateRange } = options;

    try {
      // Build query for review queue items
      let query = supabaseAdmin
        .from('review_queue_items')
        .select(
          `
          id,
          reviewed_by,
          reviewed_at,
          created_at
        `
        )
        .not('reviewed_by', 'is', null)
        .not('reviewed_at', 'is', null)
        .in('review_status', ['CONFIRMED', 'EDITED', 'REJECTED']);

      // Apply date range filter
      if (dateRange) {
        query = query.gte('reviewed_at', dateRange.start).lte('reviewed_at', dateRange.end);
      }

      const { data: items, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch review items: ${error.message}`);
      }

      if (!items || items.length === 0) {
        return {
          totalReviewed: 0,
          avgTimeMinutes: 0,
          totalReviewers: 0,
          itemsPerReviewer: 0,
        };
      }

      // Calculate aggregate stats
      const totalReviewed = items.length;

      // Calculate average review time
      const reviewTimes: number[] = [];
      items.forEach((item: any) => {
        if (item.created_at && item.reviewed_at) {
          const createdAt = new Date(item.created_at).getTime();
          const reviewedAt = new Date(item.reviewed_at).getTime();
          const timeMinutes = (reviewedAt - createdAt) / (1000 * 60);
          if (timeMinutes > 0) {
            reviewTimes.push(timeMinutes);
          }
        }
      });

      const avgTimeMinutes =
        reviewTimes.length > 0
          ? reviewTimes.reduce((sum, time) => sum + time, 0) / reviewTimes.length
          : 0;

      // Count unique reviewers
      const uniqueReviewers = new Set(items.map((item: any) => item.reviewed_by));
      const totalReviewers = uniqueReviewers.size;

      const itemsPerReviewer = totalReviewers > 0 ? totalReviewed / totalReviewers : 0;

      return {
        totalReviewed,
        avgTimeMinutes: Math.round(avgTimeMinutes * 10) / 10,
        totalReviewers,
        itemsPerReviewer: Math.round(itemsPerReviewer * 10) / 10,
      };
    } catch (error: any) {
      console.error('Error fetching aggregate stats:', error);
      throw error;
    }
  }

  /**
   * Get reviewer leaderboard
   */
  async getReviewerLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
    try {
      // Get reviewer stats for the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const stats = await this.getReviewerStats({
        dateRange: {
          start: thirtyDaysAgo.toISOString(),
          end: new Date().toISOString(),
        },
      });

      // Calculate score for each reviewer
      // Score = (itemsReviewed * 10) + (aiAgreementRate * 0.5) - (avgTimeMinutes * 0.1)
      // Higher items reviewed, higher agreement rate, and lower time = higher score
      const leaderboard: LeaderboardEntry[] = stats.map((stat) => {
        const score =
          stat.itemsReviewed * 10 +
          stat.aiAgreementRate * 0.5 -
          stat.avgTimeMinutes * 0.1;

        return {
          userId: stat.userId,
          userName: stat.userName,
          rank: 0, // Will be set after sorting
          itemsReviewed: stat.itemsReviewed,
          avgTimeMinutes: stat.avgTimeMinutes,
          score: Math.round(score * 10) / 10,
        };
      });

      // Sort by score (descending)
      leaderboard.sort((a, b) => b.score - a.score);

      // Assign ranks and limit results
      const limitedLeaderboard = leaderboard.slice(0, limit);
      limitedLeaderboard.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      return limitedLeaderboard;
    } catch (error: any) {
      console.error('Error fetching reviewer leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get review trends over time
   */
  async getReviewTrends(options: TrendOptions): Promise<TrendDataPoint[]> {
    const { dateRange, groupBy } = options;

    try {
      // Build query for review queue items
      let query = supabaseAdmin
        .from('review_queue_items')
        .select(
          `
          id,
          reviewed_at,
          review_action,
          created_at
        `
        )
        .not('reviewed_by', 'is', null)
        .not('reviewed_at', 'is', null)
        .in('review_status', ['CONFIRMED', 'EDITED', 'REJECTED'])
        .order('reviewed_at', { ascending: true });

      // Apply date range filter
      if (dateRange) {
        query = query.gte('reviewed_at', dateRange.start).lte('reviewed_at', dateRange.end);
      }

      const { data: items, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch review items: ${error.message}`);
      }

      if (!items || items.length === 0) {
        return [];
      }

      // Group items by date/week
      const trendMap = new Map<string, any[]>();

      items.forEach((item: any) => {
        if (!item.reviewed_at) return;

        const reviewedDate = new Date(item.reviewed_at);
        let key: string;

        if (groupBy === 'day') {
          // Group by day (YYYY-MM-DD)
          key = reviewedDate.toISOString().split('T')[0];
        } else {
          // Group by week (ISO week number)
          const weekStart = new Date(reviewedDate);
          const day = weekStart.getDay();
          const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
          weekStart.setDate(diff);
          key = weekStart.toISOString().split('T')[0];
        }

        if (!trendMap.has(key)) {
          trendMap.set(key, []);
        }
        trendMap.get(key)!.push(item);
      });

      // Calculate stats for each time period
      const trends: TrendDataPoint[] = [];

      for (const [date, periodItems] of trendMap.entries()) {
        // Calculate review times
        const reviewTimes: number[] = [];
        periodItems.forEach((item: any) => {
          if (item.created_at && item.reviewed_at) {
            const createdAt = new Date(item.created_at).getTime();
            const reviewedAt = new Date(item.reviewed_at).getTime();
            const timeMinutes = (reviewedAt - createdAt) / (1000 * 60);
            if (timeMinutes > 0) {
              reviewTimes.push(timeMinutes);
            }
          }
        });

        const avgTimeMinutes =
          reviewTimes.length > 0
            ? reviewTimes.reduce((sum, time) => sum + time, 0) / reviewTimes.length
            : 0;

        // Count action types
        const confirmCount = periodItems.filter(
          (item: any) => item.review_action === 'CONFIRMED'
        ).length;
        const editCount = periodItems.filter(
          (item: any) => item.review_action === 'EDITED'
        ).length;
        const rejectCount = periodItems.filter(
          (item: any) => item.review_action === 'REJECTED'
        ).length;

        trends.push({
          date,
          itemsReviewed: periodItems.length,
          avgTimeMinutes: Math.round(avgTimeMinutes * 10) / 10,
          confirmCount,
          editCount,
          rejectCount,
        });
      }

      // Sort by date
      trends.sort((a, b) => a.date.localeCompare(b.date));

      return trends;
    } catch (error: any) {
      console.error('Error fetching review trends:', error);
      throw error;
    }
  }

  /**
   * Get bottleneck identification - reviewers with backlogs
   */
  async getReviewerBottlenecks(companyId?: string): Promise<
    Array<{
      userId: string;
      userName: string;
      email: string;
      pendingItems: number;
      avgReviewTimeMinutes: number;
      estimatedBacklogHours: number;
    }>
  > {
    try {
      // Get all pending items
      let pendingQuery = supabaseAdmin
        .from('review_queue_items')
        .select(
          `
          id,
          company_id,
          created_at
        `
        )
        .eq('review_status', 'PENDING');

      if (companyId) {
        pendingQuery = pendingQuery.eq('company_id', companyId);
      }

      const { data: pendingItems, error: pendingError } = await pendingQuery;

      if (pendingError) {
        throw new Error(`Failed to fetch pending items: ${pendingError.message}`);
      }

      if (!pendingItems || pendingItems.length === 0) {
        return [];
      }

      // Get reviewer stats to calculate average review times
      const reviewerStats = await this.getReviewerStats({ companyId });

      // Get active reviewers from the company
      let usersQuery = supabaseAdmin
        .from('users')
        .select(
          `
          id,
          full_name,
          email,
          company_id,
          user_roles!inner(role)
        `
        )
        .eq('is_active', true)
        .is('deleted_at', null)
        .in('user_roles.role', ['ADMIN', 'STAFF', 'OWNER']);

      if (companyId) {
        usersQuery = usersQuery.eq('company_id', companyId);
      }

      const { data: users, error: usersError } = await usersQuery;

      if (usersError) {
        throw new Error(`Failed to fetch users: ${usersError.message}`);
      }

      if (!users || users.length === 0) {
        return [];
      }

      // Calculate bottlenecks
      const bottlenecks = users.map((user: any) => {
        const userStats = reviewerStats.find((s) => s.userId === user.id);
        const avgReviewTimeMinutes = userStats?.avgTimeMinutes || 15; // Default 15 min if no history

        // Distribute pending items equally among reviewers
        const pendingItemsPerReviewer = Math.ceil(pendingItems.length / users.length);
        const estimatedBacklogHours = (pendingItemsPerReviewer * avgReviewTimeMinutes) / 60;

        return {
          userId: user.id,
          userName: user.full_name || 'Unknown',
          email: user.email || '',
          pendingItems: pendingItemsPerReviewer,
          avgReviewTimeMinutes: Math.round(avgReviewTimeMinutes * 10) / 10,
          estimatedBacklogHours: Math.round(estimatedBacklogHours * 10) / 10,
        };
      });

      // Sort by estimated backlog hours (descending)
      bottlenecks.sort((a, b) => b.estimatedBacklogHours - a.estimatedBacklogHours);

      return bottlenecks;
    } catch (error: any) {
      console.error('Error identifying reviewer bottlenecks:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const reviewerAnalyticsService = new ReviewerAnalyticsService();
