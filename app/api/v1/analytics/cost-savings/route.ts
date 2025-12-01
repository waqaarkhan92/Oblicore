/**
 * Cost Savings Analytics API
 * Returns metrics on rule library usage and cost savings
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // 1. Get total obligations extracted in period
    const { data: totalObligations, error: totalError } = await supabaseAdmin
      .from('obligations')
      .select('id, source_pattern_id, created_at', { count: 'exact' })
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (totalError) {
      throw totalError;
    }

    const totalCount = totalObligations?.length || 0;

    // 2. Count obligations extracted via rule library (have source_pattern_id)
    const ruleLibraryCount = totalObligations?.filter(o => o.source_pattern_id)?.length || 0;

    // 3. Count obligations extracted via LLM (no source_pattern_id)
    const llmCount = totalCount - ruleLibraryCount;

    // 4. Calculate cost savings
    const LLM_COST_PER_OBLIGATION = 0.002; // ~$0.002 per obligation with GPT-4o-mini
    const costIfAllLLM = totalCount * LLM_COST_PER_OBLIGATION;
    const actualLLMCost = llmCount * LLM_COST_PER_OBLIGATION;
    const costSaved = costIfAllLLM - actualLLMCost;
    const savingsPercentage = totalCount > 0 ? (ruleLibraryCount / totalCount) * 100 : 0;

    // 5. Get pattern usage statistics
    const { data: patterns, error: patternsError } = await supabaseAdmin
      .from('rule_library_patterns')
      .select('pattern_id, display_name, performance, is_active')
      .eq('is_active', true)
      .order('performance->usage_count', { ascending: false })
      .limit(10);

    if (patternsError) {
      throw patternsError;
    }

    // 6. Get documents processed in period
    const { data: documents, error: docsError } = await supabaseAdmin
      .from('documents')
      .select('id, extraction_status, created_at', { count: 'exact' })
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .eq('extraction_status', 'COMPLETED');

    if (docsError) {
      throw docsError;
    }

    const documentsProcessed = documents?.length || 0;
    const avgObligationsPerDoc = documentsProcessed > 0 ? totalCount / documentsProcessed : 0;
    const avgSavingsPerDoc = documentsProcessed > 0 ? costSaved / documentsProcessed : 0;

    // 7. Calculate trending metrics (compare to previous period)
    const prevPeriodStart = new Date(startDate);
    prevPeriodStart.setDate(prevPeriodStart.getDate() - parseInt(period));

    const { data: prevObligations } = await supabaseAdmin
      .from('obligations')
      .select('id, source_pattern_id', { count: 'exact' })
      .gte('created_at', prevPeriodStart.toISOString())
      .lt('created_at', startDate.toISOString());

    const prevTotalCount = prevObligations?.length || 0;
    const prevRuleLibraryCount = prevObligations?.filter(o => o.source_pattern_id)?.length || 0;
    const prevSavingsPercentage = prevTotalCount > 0 ? (prevRuleLibraryCount / prevTotalCount) * 100 : 0;
    const savingsTrend = savingsPercentage - prevSavingsPercentage;

    // 8. Build response
    const response = {
      period: {
        days: parseInt(period),
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      overview: {
        total_obligations: totalCount,
        rule_library_matched: ruleLibraryCount,
        llm_extracted: llmCount,
        documents_processed: documentsProcessed,
        avg_obligations_per_doc: Math.round(avgObligationsPerDoc * 10) / 10
      },
      cost_savings: {
        amount_saved: `$${costSaved.toFixed(2)}`,
        amount_saved_cents: Math.round(costSaved * 100),
        actual_cost: `$${actualLLMCost.toFixed(2)}`,
        cost_if_all_llm: `$${costIfAllLLM.toFixed(2)}`,
        savings_percentage: Math.round(savingsPercentage * 10) / 10,
        avg_savings_per_doc: `$${avgSavingsPerDoc.toFixed(2)}`,
        trend: {
          direction: savingsTrend > 0 ? 'up' : savingsTrend < 0 ? 'down' : 'stable',
          change_percentage: Math.round(Math.abs(savingsTrend) * 10) / 10
        }
      },
      top_patterns: patterns?.map(p => ({
        pattern_id: p.pattern_id,
        display_name: p.display_name,
        usage_count: p.performance?.usage_count || 0,
        success_rate: `${((p.performance?.success_rate || 0) * 100).toFixed(1)}%`,
        cost_saved: `$${((p.performance?.usage_count || 0) * LLM_COST_PER_OBLIGATION).toFixed(2)}`
      })) || [],
      recommendations: generateRecommendations(
        totalCount,
        ruleLibraryCount,
        patterns?.length || 0,
        savingsPercentage
      )
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error fetching cost savings analytics:', error);
    return NextResponse.json(
      { error: { message: 'Failed to fetch cost savings analytics', details: error.message } },
      { status: 500 }
    );
  }
}

function generateRecommendations(
  totalObligations: number,
  ruleLibraryMatched: number,
  patternCount: number,
  savingsPercentage: number
): string[] {
  const recommendations: string[] = [];

  if (savingsPercentage < 30) {
    recommendations.push('💡 Run auto-learn script to discover new patterns from existing obligations');
    recommendations.push('💡 Seed common patterns to improve match rate');
  }

  if (patternCount < 10) {
    recommendations.push('💡 Add more rule patterns to increase cost savings');
    recommendations.push('💡 Consider creating patterns for your most common obligation types');
  }

  if (totalObligations > 100 && ruleLibraryMatched < 50) {
    recommendations.push('💡 Review frequently occurring obligations to identify pattern candidates');
  }

  if (savingsPercentage > 50) {
    recommendations.push('✅ Great job! Your rule library is saving significant costs');
    recommendations.push('💡 Consider sharing successful patterns with your team');
  }

  if (recommendations.length === 0) {
    recommendations.push('📊 Monitor your savings regularly to identify optimization opportunities');
  }

  return recommendations;
}
