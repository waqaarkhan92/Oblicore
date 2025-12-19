/**
 * Compliance Scorecard Service
 * Provides enhanced scorecard functionality for pack generation and compliance dashboards
 * Extends compliance-score-service.ts with RAG status, trends, and actionable insights
 *
 * @example
 * // Get complete scorecard data for pack generation
 * import { getScorecardData } from '@/lib/services/compliance-scorecard-service';
 *
 * const scorecard = await getScorecardData(siteId);
 * console.log({
 *   score: scorecard.score,              // 78
 *   status: scorecard.ragStatus,         // 'AMBER'
 *   trend: scorecard.trend,              // 'IMPROVING'
 *   topActions: scorecard.topActions,    // Top 3 priority actions
 *   metrics: {
 *     total: scorecard.totalObligations,     // 45
 *     completed: scorecard.completedCount,   // 35
 *     overdue: scorecard.overdueCount,       // 3
 *     evidenceCoverage: scorecard.evidenceCoverage // 82%
 *   }
 * });
 *
 * @example
 * // Use individual methods for specific needs
 * import {
 *   calculateComplianceScore,
 *   getRAGStatus,
 *   getTopActions
 * } from '@/lib/services/compliance-scorecard-service';
 *
 * const score = await calculateComplianceScore(siteId);
 * const status = getRAGStatus(score);  // No async needed
 * const actions = await getTopActions(siteId, 5);  // Get top 5 actions
 */

import { supabaseAdmin } from '@/lib/supabase/server';
import { calculateSiteComplianceScore } from './compliance-score-service';

export type RAGStatus = 'RED' | 'AMBER' | 'GREEN';
export type TrendIndicator = 'IMPROVING' | 'STABLE' | 'DECLINING';
export type UrgencyLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM';

export interface TopAction {
  title: string;
  deadline: string | null;
  status: string;
  urgency: UrgencyLevel;
  conditionRef: string | null;
}

export interface ScorecardData {
  score: number;
  ragStatus: RAGStatus;
  topActions: TopAction[];
  trend: TrendIndicator;
  totalObligations: number;
  completedCount: number;
  overdueCount: number;
  evidenceCoverage: number;
}

/**
 * Calculate compliance score for a site (0-100)
 * Leverages existing calculateSiteComplianceScore from compliance-score-service
 */
export async function calculateComplianceScore(siteId: string): Promise<number> {
  try {
    const result = await calculateSiteComplianceScore(siteId);
    return result.score;
  } catch (error) {
    console.error('Error calculating compliance score:', error);
    throw error;
  }
}

/**
 * Get RAG (Red-Amber-Green) status based on compliance score
 * GREEN: score >= 85
 * AMBER: score >= 60
 * RED: score < 60
 */
export function getRAGStatus(score: number): RAGStatus {
  if (score >= 85) return 'GREEN';
  if (score >= 60) return 'AMBER';
  return 'RED';
}

/**
 * Get top prioritized actionable items for a site
 * Returns obligations that are:
 * - Overdue or due within 14 days
 * - Missing evidence
 * Sorted by: overdue first, then by deadline ascending
 */
export async function getTopActions(
  siteId: string,
  limit: number = 3
): Promise<TopAction[]> {
  const currentDate = new Date().toISOString().split('T')[0];
  const fourteenDaysFromNow = new Date();
  fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14);
  const futureDate = fourteenDaysFromNow.toISOString().split('T')[0];

  try {
    // Query obligations that are overdue or due within 14 days
    const { data: obligations, error } = await supabaseAdmin
      .from('obligations')
      .select(`
        id,
        obligation_title,
        deadline_date,
        status,
        condition_reference,
        obligation_evidence_links(
          id,
          unlinked_at
        )
      `)
      .eq('site_id', siteId)
      .is('deleted_at', null)
      .not('status', 'in', '(NOT_APPLICABLE,CANCELLED,COMPLETE)')
      .or(`deadline_date.lt.${currentDate},deadline_date.lte.${futureDate}`)
      .order('deadline_date', { ascending: true });

    if (error) {
      console.error('Error fetching top actions:', error);
      throw error;
    }

    if (!obligations || obligations.length === 0) {
      return [];
    }

    // Process obligations to determine urgency and filter by evidence
    const actions: TopAction[] = obligations
      .map((obligation) => {
        const hasEvidence = obligation.obligation_evidence_links?.some(
          (link: any) => link.unlinked_at === null
        );

        // Determine urgency
        let urgency: UrgencyLevel;
        const isOverdue = obligation.deadline_date && obligation.deadline_date < currentDate;
        const noEvidence = !hasEvidence;

        if (isOverdue && noEvidence) {
          urgency = 'CRITICAL';
        } else if (isOverdue || noEvidence) {
          urgency = 'HIGH';
        } else {
          urgency = 'MEDIUM';
        }

        return {
          title: obligation.obligation_title,
          deadline: obligation.deadline_date,
          status: obligation.status,
          urgency,
          conditionRef: obligation.condition_reference,
          // Used for sorting
          _isOverdue: isOverdue,
          _deadlineDate: obligation.deadline_date || '9999-12-31',
        };
      })
      // Sort by: overdue first, then by deadline ascending, then by urgency
      .sort((a, b) => {
        // First sort by overdue status
        if (a._isOverdue && !b._isOverdue) return -1;
        if (!a._isOverdue && b._isOverdue) return 1;

        // Then by deadline date
        if (a._deadlineDate < b._deadlineDate) return -1;
        if (a._deadlineDate > b._deadlineDate) return 1;

        // Then by urgency (CRITICAL > HIGH > MEDIUM)
        const urgencyOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      })
      // Remove sorting fields
      .map(({ _isOverdue, _deadlineDate, ...action }) => action);

    // Return top N actions
    return actions.slice(0, limit);
  } catch (error) {
    console.error('Error in getTopActions:', error);
    throw error;
  }
}

/**
 * Get trend indicator for a site's compliance score
 * Compares current score with score from 30 days ago
 * IMPROVING: current > previous + 5
 * DECLINING: current < previous - 5
 * STABLE: otherwise
 */
export async function getTrendIndicator(siteId: string): Promise<TrendIndicator> {
  try {
    // Get current score
    const currentScore = await calculateComplianceScore(siteId);

    // Get score from 30 days ago from compliance_score_updated_at
    // If no historical data exists, assume STABLE
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: site, error } = await supabaseAdmin
      .from('sites')
      .select('compliance_score, compliance_score_updated_at')
      .eq('id', siteId)
      .single();

    if (error) {
      console.error('Error fetching site for trend:', error);
      // Default to STABLE if we can't get historical data
      return 'STABLE';
    }

    // If score was updated within the last 30 days, we don't have enough history
    // In a production system, you'd want a dedicated compliance_score_history table
    const scoreUpdatedAt = site?.compliance_score_updated_at
      ? new Date(site.compliance_score_updated_at)
      : null;

    if (!scoreUpdatedAt || scoreUpdatedAt > thirtyDaysAgo) {
      // Not enough historical data, assume STABLE
      return 'STABLE';
    }

    const previousScore = site?.compliance_score || currentScore;

    // Calculate trend
    const scoreDifference = currentScore - previousScore;

    if (scoreDifference > 5) return 'IMPROVING';
    if (scoreDifference < -5) return 'DECLINING';
    return 'STABLE';
  } catch (error) {
    console.error('Error in getTrendIndicator:', error);
    // Default to STABLE on error
    return 'STABLE';
  }
}

/**
 * Get complete scorecard data for a site in a single call
 * Returns score, RAG status, top actions, trend, and key metrics
 */
export async function getScorecardData(siteId: string): Promise<ScorecardData> {
  try {
    const currentDate = new Date().toISOString().split('T')[0];

    // Calculate current compliance score
    const score = await calculateComplianceScore(siteId);
    const ragStatus = getRAGStatus(score);

    // Get top actions in parallel with other queries
    const [topActions, trend, obligationStats] = await Promise.all([
      getTopActions(siteId, 3),
      getTrendIndicator(siteId),
      getObligationStatistics(siteId, currentDate),
    ]);

    return {
      score,
      ragStatus,
      topActions,
      trend,
      totalObligations: obligationStats.totalObligations,
      completedCount: obligationStats.completedCount,
      overdueCount: obligationStats.overdueCount,
      evidenceCoverage: obligationStats.evidenceCoverage,
    };
  } catch (error) {
    console.error('Error in getScorecardData:', error);
    throw error;
  }
}

/**
 * Helper function to get obligation statistics for a site
 * Used internally by getScorecardData
 */
async function getObligationStatistics(
  siteId: string,
  currentDate: string
): Promise<{
  totalObligations: number;
  completedCount: number;
  overdueCount: number;
  evidenceCoverage: number;
}> {
  try {
    // Get all active obligations for the site
    const { data: obligations, error } = await supabaseAdmin
      .from('obligations')
      .select(`
        id,
        status,
        deadline_date,
        obligation_evidence_links(
          id,
          unlinked_at
        )
      `)
      .eq('site_id', siteId)
      .is('deleted_at', null)
      .not('status', 'in', '(NOT_APPLICABLE,CANCELLED)');

    if (error) {
      console.error('Error fetching obligation statistics:', error);
      throw error;
    }

    const totalObligations = obligations?.length || 0;

    // Count completed obligations
    const completedCount =
      obligations?.filter((o) => o.status === 'COMPLETE').length || 0;

    // Count overdue obligations
    const overdueCount =
      obligations?.filter(
        (o) =>
          o.deadline_date &&
          o.deadline_date < currentDate &&
          o.status !== 'COMPLETE'
      ).length || 0;

    // Calculate evidence coverage (% of obligations with evidence)
    const obligationsWithEvidence =
      obligations?.filter((o) =>
        o.obligation_evidence_links?.some((link: any) => link.unlinked_at === null)
      ).length || 0;

    const evidenceCoverage =
      totalObligations > 0
        ? Math.round((obligationsWithEvidence / totalObligations) * 100)
        : 100;

    return {
      totalObligations,
      completedCount,
      overdueCount,
      evidenceCoverage,
    };
  } catch (error) {
    console.error('Error in getObligationStatistics:', error);
    throw error;
  }
}
