/**
 * Analytics Service
 * Provides cost and performance analytics queries
 * Reference: docs/specs/81_AI_Cost_Optimization.md Section 6.3
 */

import { supabaseAdmin } from '@/lib/supabase/server';

export interface CostAnalytics {
  totalCost: number;
  avgCostPerExtraction: number;
  totalExtractions: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  ruleLibraryHitRate: number;
  avgProcessingTime: number;
}

export interface ModuleCostBreakdown {
  module_name: string;
  extraction_count: number;
  total_cost: number;
  avg_cost: number;
  rule_library_hit_rate: number;
}

/**
 * Get cost analytics for a time period
 */
export async function getCostAnalytics(
  startDate: Date,
  endDate: Date
): Promise<CostAnalytics> {
  const { data, error } = await supabaseAdmin.rpc('get_cost_analytics', {
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
  });

  if (error || !data) {
    // Fallback to direct query if RPC doesn't exist
    const { data: logs } = await supabaseAdmin
      .from('extraction_logs')
      .select('estimated_cost, input_tokens, output_tokens, rule_library_hits, segments_processed, processing_time_ms')
      .gte('extraction_timestamp', startDate.toISOString())
      .lte('extraction_timestamp', endDate.toISOString());

    if (!logs || logs.length === 0) {
      return {
        totalCost: 0,
        avgCostPerExtraction: 0,
        totalExtractions: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        ruleLibraryHitRate: 0,
        avgProcessingTime: 0,
      };
    }

    const totalCost = logs.reduce((sum, log) => sum + (log.estimated_cost || 0), 0);
    const totalInputTokens = logs.reduce((sum, log) => sum + (log.input_tokens || 0), 0);
    const totalOutputTokens = logs.reduce((sum, log) => sum + (log.output_tokens || 0), 0);
    const totalSegments = logs.reduce((sum, log) => sum + (log.segments_processed || 0), 0);
    const totalLibraryHits = logs.reduce((sum, log) => sum + (log.rule_library_hits || 0), 0);
    const totalProcessingTime = logs.reduce((sum, log) => sum + (log.processing_time_ms || 0), 0);

    return {
      totalCost,
      avgCostPerExtraction: totalCost / logs.length,
      totalExtractions: logs.length,
      totalInputTokens,
      totalOutputTokens,
      ruleLibraryHitRate: totalSegments > 0 ? totalLibraryHits / totalSegments : 0,
      avgProcessingTime: totalProcessingTime / logs.length,
    };
  }

  return data as CostAnalytics;
}

/**
 * Get cost breakdown by document type
 */
export async function getCostByDocumentType(
  startDate: Date,
  endDate: Date
): Promise<Array<{ document_type: string; extraction_count: number; total_cost: number; avg_cost: number }>> {
  const { data, error } = await supabaseAdmin
    .from('extraction_logs')
    .select(`
      estimated_cost,
      documents!inner(document_type)
    `)
    .gte('extraction_timestamp', startDate.toISOString())
    .lte('extraction_timestamp', endDate.toISOString());

  if (error || !data) {
    return [];
  }

  const grouped = data.reduce((acc, log) => {
    const docType = (log.documents as any)?.document_type || 'UNKNOWN';
    if (!acc[docType]) {
      acc[docType] = { document_type: docType, extraction_count: 0, total_cost: 0 };
    }
    acc[docType].extraction_count++;
    acc[docType].total_cost += log.estimated_cost || 0;
    return acc;
  }, {} as Record<string, any>);

  return Object.values(grouped).map((item: any) => ({
    ...item,
    avg_cost: item.total_cost / item.extraction_count,
  }));
}

/**
 * Get cost breakdown by module
 */
export async function getCostByModule(
  startDate: Date,
  endDate: Date
): Promise<ModuleCostBreakdown[]> {
  const { data, error } = await supabaseAdmin
    .from('extraction_logs')
    .select(`
      estimated_cost,
      rule_library_hits,
      segments_processed,
      documents!inner(module_id),
      modules!documents_module_id_fkey(module_name)
    `)
    .gte('extraction_timestamp', startDate.toISOString())
    .lte('extraction_timestamp', endDate.toISOString());

  if (error || !data) {
    return [];
  }

  const grouped = data.reduce((acc, log) => {
    const moduleName = (log.modules as any)?.module_name || 'UNKNOWN';
    if (!acc[moduleName]) {
      acc[moduleName] = {
        module_name: moduleName,
        extraction_count: 0,
        total_cost: 0,
        total_segments: 0,
        total_library_hits: 0,
      };
    }
    acc[moduleName].extraction_count++;
    acc[moduleName].total_cost += log.estimated_cost || 0;
    acc[moduleName].total_segments += log.segments_processed || 0;
    acc[moduleName].total_library_hits += log.rule_library_hits || 0;
    return acc;
  }, {} as Record<string, any>);

  return Object.values(grouped).map((item: any) => ({
    module_name: item.module_name,
    extraction_count: item.extraction_count,
    total_cost: item.total_cost,
    avg_cost: item.total_cost / item.extraction_count,
    rule_library_hit_rate: item.total_segments > 0 ? item.total_library_hits / item.total_segments : 0,
  }));
}

/**
 * Get rule library effectiveness metrics
 */
export async function getRuleLibraryEffectiveness(
  days: number = 30
): Promise<{
  total_extractions: number;
  library_matches: number;
  api_calls: number;
  hit_rate_percent: number;
  total_cost: number;
  estimated_savings: number;
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabaseAdmin
    .from('extraction_logs')
    .select('rule_library_hits, segments_processed, estimated_cost, api_calls_made')
    .gte('extraction_timestamp', startDate.toISOString());

  if (error || !data || data.length === 0) {
    return {
      total_extractions: 0,
      library_matches: 0,
      api_calls: 0,
      hit_rate_percent: 0,
      total_cost: 0,
      estimated_savings: 0,
    };
  }

  const totalExtractions = data.length;
  const libraryMatches = data.reduce((sum, log) => sum + (log.rule_library_hits || 0), 0);
  const totalSegments = data.reduce((sum, log) => sum + (log.segments_processed || 0), 0);
  const apiCalls = data.reduce((sum, log) => sum + (log.api_calls_made || 0), 0);
  const totalCost = data.reduce((sum, log) => sum + (log.estimated_cost || 0), 0);

  // Estimate savings: average cost per API call * library hits
  const avgCostPerCall = apiCalls > 0 ? totalCost / apiCalls : 0.14; // Default $0.14
  const estimatedSavings = libraryMatches * avgCostPerCall;

  return {
    total_extractions: totalExtractions,
    library_matches: libraryMatches,
    api_calls: apiCalls,
    hit_rate_percent: totalSegments > 0 ? (libraryMatches / totalSegments) * 100 : 0,
    total_cost: totalCost,
    estimated_savings: estimatedSavings,
  };
}

/**
 * Get monthly cost trend
 */
export async function getMonthlyCostTrend(
  months: number = 12
): Promise<Array<{
  month: string;
  extraction_count: number;
  total_cost: number;
  avg_cost: number;
  library_hit_rate: number;
}>> {
  const { data, error } = await supabaseAdmin
    .from('extraction_logs')
    .select('extraction_timestamp, estimated_cost, rule_library_hits, segments_processed')
    .gte('extraction_timestamp', new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000).toISOString());

  if (error || !data || data.length === 0) {
    return [];
  }

  // Group by month
  const monthly = data.reduce((acc, log) => {
    const date = new Date(log.extraction_timestamp);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!acc[monthKey]) {
      acc[monthKey] = {
        month: monthKey,
        extraction_count: 0,
        total_cost: 0,
        total_segments: 0,
        total_library_hits: 0,
      };
    }
    
    acc[monthKey].extraction_count++;
    acc[monthKey].total_cost += log.estimated_cost || 0;
    acc[monthKey].total_segments += log.segments_processed || 0;
    acc[monthKey].total_library_hits += log.rule_library_hits || 0;
    
    return acc;
  }, {} as Record<string, any>);

  return Object.values(monthly).map((item: any) => ({
    month: item.month,
    extraction_count: item.extraction_count,
    total_cost: item.total_cost,
    avg_cost: item.total_cost / item.extraction_count,
    library_hit_rate: item.total_segments > 0 ? item.total_library_hits / item.total_segments : 0,
  })).sort((a, b) => a.month.localeCompare(b.month));
}

