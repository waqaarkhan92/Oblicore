/**
 * AI Analytics Service
 * Provides metrics for the AI Learning Dashboard (owner-only)
 * Tracks pattern hit rates, cost metrics, pattern library health, and extraction statistics
 * Reference: docs/specs/80_AI_Extraction_Rules_Library.md
 */

import { supabaseAdmin } from '@/lib/supabase/server';

export interface DateRangeOptions {
  startDate?: string;
  endDate?: string;
}

export interface AnalyticsOptions {
  companyId?: string;
  dateRange?: DateRangeOptions;
}

export interface PatternHitRate {
  hitRate: number;
  totalExtractions: number;
  ruleLibraryHits: number;
  llmExtractions: number;
}

export interface CostTrend {
  date: string;
  cost: number;
}

export interface CostMetrics {
  totalCost: number;
  avgPerDoc: number;
  byRegulator: Record<string, number>;
  trend: CostTrend[];
}

export interface PatternSummary {
  patternId: string;
  displayName: string;
  usageCount: number;
  successRate: number;
  category?: string;
  lastUsedAt?: string;
}

export interface PatternLibraryHealth {
  activePatterns: number;
  pendingPatterns: number;
  decliningPatterns: number;
  topPatterns: PatternSummary[];
}

export interface ExtractionStats {
  total: number;
  byDocType: Record<string, number>;
  successRate: number;
  avgConfidence: number;
}

/**
 * AI Analytics Service Class
 */
export class AIAnalyticsService {
  /**
   * Get pattern hit rate - percentage of extractions using rule library vs LLM
   */
  async getPatternHitRate(options?: AnalyticsOptions): Promise<PatternHitRate> {
    const { companyId, dateRange } = options || {};

    // Build base query for extraction_logs
    let query = supabaseAdmin
      .from('extraction_logs')
      .select('id, rule_library_hits, api_calls_made, document_id');

    // Apply date range filter if provided
    if (dateRange?.startDate) {
      query = query.gte('created_at', dateRange.startDate);
    }
    if (dateRange?.endDate) {
      query = query.lte('created_at', dateRange.endDate);
    }

    const { data: extractionLogs, error } = await query;

    if (error) {
      console.error('Error fetching extraction logs:', error);
      throw new Error(`Failed to fetch extraction logs: ${error.message}`);
    }

    // Filter by company if needed
    let logs = extractionLogs || [];
    if (companyId) {
      // Get document IDs for this company
      const { data: documents } = await supabaseAdmin
        .from('documents')
        .select('id')
        .eq('company_id', companyId);

      const companyDocIds = new Set((documents || []).map(d => d.id));
      logs = logs.filter(log => companyDocIds.has(log.document_id));
    }

    const totalExtractions = logs.length;

    // Count extractions that used rule library (rule_library_hits > 0)
    const ruleLibraryHits = logs.filter(log => log.rule_library_hits > 0).length;

    // Count extractions that used LLM (api_calls_made > 0)
    const llmExtractions = logs.filter(log => log.api_calls_made > 0).length;

    const hitRate = totalExtractions > 0 ? (ruleLibraryHits / totalExtractions) * 100 : 0;

    return {
      hitRate: Math.round(hitRate * 100) / 100, // Round to 2 decimal places
      totalExtractions,
      ruleLibraryHits,
      llmExtractions,
    };
  }

  /**
   * Get cost metrics - total cost, average per document, breakdown by regulator
   */
  async getCostMetrics(options?: AnalyticsOptions): Promise<CostMetrics> {
    const { companyId, dateRange } = options || {};

    // Build base query for extraction_logs with document info
    let query = supabaseAdmin
      .from('extraction_logs')
      .select(`
        id,
        estimated_cost,
        document_id,
        created_at,
        documents!inner (
          id,
          company_id,
          regulator
        )
      `);

    // Apply date range filter if provided
    if (dateRange?.startDate) {
      query = query.gte('created_at', dateRange.startDate);
    }
    if (dateRange?.endDate) {
      query = query.lte('created_at', dateRange.endDate);
    }

    // Apply company filter if provided
    if (companyId) {
      query = query.eq('documents.company_id', companyId);
    }

    const { data: extractionLogs, error } = await query;

    if (error) {
      console.error('Error fetching extraction logs for cost metrics:', error);
      throw new Error(`Failed to fetch cost metrics: ${error.message}`);
    }

    const logs = extractionLogs || [];

    // Calculate total cost
    const totalCost = logs.reduce((sum, log) => {
      const cost = parseFloat(String(log.estimated_cost || 0));
      return sum + cost;
    }, 0);

    // Get unique documents count
    const uniqueDocuments = new Set(logs.map(log => log.document_id));
    const avgPerDoc = uniqueDocuments.size > 0 ? totalCost / uniqueDocuments.size : 0;

    // Breakdown by regulator
    const byRegulator: Record<string, number> = {};
    for (const log of logs) {
      const regulator = (log.documents as any)?.regulator || 'UNKNOWN';
      const cost = parseFloat(String(log.estimated_cost || 0));
      byRegulator[regulator] = (byRegulator[regulator] || 0) + cost;
    }

    // Calculate cost trend (daily aggregation)
    const dailyCosts = new Map<string, number>();
    for (const log of logs) {
      const date = new Date(log.created_at).toISOString().split('T')[0];
      const cost = parseFloat(String(log.estimated_cost || 0));
      dailyCosts.set(date, (dailyCosts.get(date) || 0) + cost);
    }

    const trend: CostTrend[] = Array.from(dailyCosts.entries())
      .map(([date, cost]) => ({ date, cost }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalCost: Math.round(totalCost * 10000) / 10000,
      avgPerDoc: Math.round(avgPerDoc * 10000) / 10000,
      byRegulator,
      trend,
    };
  }

  /**
   * Get pattern library health - active patterns, pending patterns, declining patterns
   */
  async getPatternLibraryHealth(): Promise<PatternLibraryHealth> {
    // Get active patterns
    const { data: activePatterns, error: activeError } = await supabaseAdmin
      .from('rule_library_patterns')
      .select('id, pattern_id, display_name, performance, extraction_template')
      .eq('is_active', true)
      .is('deprecated_at', null);

    if (activeError) {
      console.error('Error fetching active patterns:', activeError);
      throw new Error(`Failed to fetch active patterns: ${activeError.message}`);
    }

    // Get pending pattern candidates
    const { data: pendingCandidates, error: pendingError } = await supabaseAdmin
      .from('pattern_candidates')
      .select('id')
      .eq('status', 'PENDING_REVIEW');

    if (pendingError) {
      console.error('Error fetching pending candidates:', pendingError);
      throw new Error(`Failed to fetch pending candidates: ${pendingError.message}`);
    }

    // Identify declining patterns (success_rate < 0.5 and usage_count > 10)
    const decliningPatterns = (activePatterns || []).filter(pattern => {
      const performance = pattern.performance as any;
      const successRate = parseFloat(String(performance?.success_rate || 1));
      const usageCount = parseInt(String(performance?.usage_count || 0));
      return successRate < 0.5 && usageCount > 10;
    });

    // Get top patterns by usage and success rate
    const topPatterns: PatternSummary[] = (activePatterns || [])
      .map(pattern => {
        const performance = pattern.performance as any;
        const extractionTemplate = pattern.extraction_template as any;
        return {
          patternId: pattern.pattern_id,
          displayName: pattern.display_name,
          usageCount: parseInt(String(performance?.usage_count || 0)),
          successRate: parseFloat(String(performance?.success_rate || 1)),
          category: extractionTemplate?.category,
          lastUsedAt: performance?.last_used_at || undefined,
        };
      })
      .sort((a, b) => {
        // Sort by usage count first, then success rate
        if (b.usageCount !== a.usageCount) {
          return b.usageCount - a.usageCount;
        }
        return b.successRate - a.successRate;
      })
      .slice(0, 10); // Top 10 patterns

    return {
      activePatterns: (activePatterns || []).length,
      pendingPatterns: (pendingCandidates || []).length,
      decliningPatterns: decliningPatterns.length,
      topPatterns,
    };
  }

  /**
   * Get extraction statistics - total extractions, by document type, success rates
   */
  async getExtractionStats(options?: { dateRange?: DateRangeOptions }): Promise<ExtractionStats> {
    const { dateRange } = options || {};

    // Build query for extraction_logs with document info
    let query = supabaseAdmin
      .from('extraction_logs')
      .select(`
        id,
        obligations_extracted,
        flagged_for_review,
        document_id,
        documents!inner (
          id,
          document_type
        )
      `);

    // Apply date range filter if provided
    if (dateRange?.startDate) {
      query = query.gte('created_at', dateRange.startDate);
    }
    if (dateRange?.endDate) {
      query = query.lte('created_at', dateRange.endDate);
    }

    const { data: extractionLogs, error: logsError } = await query;

    if (logsError) {
      console.error('Error fetching extraction logs:', logsError);
      throw new Error(`Failed to fetch extraction stats: ${logsError.message}`);
    }

    const logs = extractionLogs || [];
    const total = logs.length;

    // Count by document type
    const byDocType: Record<string, number> = {};
    for (const log of logs) {
      const docType = (log.documents as any)?.document_type || 'UNKNOWN';
      byDocType[docType] = (byDocType[docType] || 0) + 1;
    }

    // Calculate success rate based on review queue items
    let successQuery = supabaseAdmin
      .from('review_queue_items')
      .select('id, review_status, document_id, created_at');

    // Apply date range to review queue items
    if (dateRange?.startDate) {
      successQuery = successQuery.gte('created_at', dateRange.startDate);
    }
    if (dateRange?.endDate) {
      successQuery = successQuery.lte('created_at', dateRange.endDate);
    }

    const { data: reviewItems, error: reviewError } = await successQuery;

    if (reviewError) {
      console.error('Error fetching review queue items:', reviewError);
      // Continue without success rate calculation
    }

    // Calculate success rate: extractions that were confirmed or not flagged for review
    const totalReviewItems = reviewItems?.length || 0;
    const confirmedItems = reviewItems?.filter(
      item => item.review_status === 'CONFIRMED' || item.review_status === 'EDITED'
    ).length || 0;

    // Success rate calculation:
    // If we have review items, use confirmed ratio
    // Otherwise, use (total extractions - flagged) / total
    let successRate = 0;
    if (totalReviewItems > 0) {
      successRate = (confirmedItems / totalReviewItems) * 100;
    } else if (total > 0) {
      const flaggedCount = logs.reduce((sum, log) => sum + (log.flagged_for_review || 0), 0);
      const successfulCount = total - flaggedCount;
      successRate = (successfulCount / total) * 100;
    }

    // Calculate average confidence from obligations
    let avgConfidence = 0;
    const documentIds = logs.map(log => log.document_id);

    if (documentIds.length > 0) {
      const { data: obligations } = await supabaseAdmin
        .from('obligations')
        .select('confidence_score')
        .in('document_id', documentIds)
        .not('confidence_score', 'is', null);

      if (obligations && obligations.length > 0) {
        const totalConfidence = obligations.reduce(
          (sum, ob) => sum + (parseFloat(String(ob.confidence_score)) || 0),
          0
        );
        avgConfidence = (totalConfidence / obligations.length) * 100;
      }
    }

    return {
      total,
      byDocType,
      successRate: Math.round(successRate * 100) / 100,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
    };
  }

  /**
   * Get comprehensive analytics dashboard data
   * Convenience method to fetch all analytics at once
   */
  async getDashboardData(options?: AnalyticsOptions): Promise<{
    patternHitRate: PatternHitRate;
    costMetrics: CostMetrics;
    patternLibraryHealth: PatternLibraryHealth;
    extractionStats: ExtractionStats;
  }> {
    const [patternHitRate, costMetrics, patternLibraryHealth, extractionStats] = await Promise.all([
      this.getPatternHitRate(options),
      this.getCostMetrics(options),
      this.getPatternLibraryHealth(),
      this.getExtractionStats({ dateRange: options?.dateRange }),
    ]);

    return {
      patternHitRate,
      costMetrics,
      patternLibraryHealth,
      extractionStats,
    };
  }
}

// Singleton instance
export const aiAnalyticsService = new AIAnalyticsService();
