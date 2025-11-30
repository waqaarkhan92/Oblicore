/**
 * Correction Tracking Service
 * Tracks user corrections to extracted obligations for pattern improvement
 * Reference: docs/specs/80_AI_Extraction_Rules_Library.md Section 5.2
 */

import { supabaseAdmin } from '@/lib/supabase/server';

export interface CorrectionRecord {
  extraction_log_id?: string;
  obligation_id: string;
  pattern_id_used?: string | null;
  original_data: any;
  corrected_data: any;
  correction_type: 'category' | 'frequency' | 'deadline' | 'subjective' | 'text' | 'other';
  corrected_by: string;
}

/**
 * Record a user correction
 */
export async function recordCorrection(correction: CorrectionRecord): Promise<void> {
  try {
    await supabaseAdmin.from('correction_records').insert({
      extraction_log_id: correction.extraction_log_id,
      obligation_id: correction.obligation_id,
      pattern_id_used: correction.pattern_id_used,
      original_data: correction.original_data,
      corrected_data: correction.corrected_data,
      correction_type: correction.correction_type,
      corrected_by: correction.corrected_by,
    });

    // If a pattern was used, update its performance metrics
    if (correction.pattern_id_used) {
      await updatePatternPerformance(correction.pattern_id_used, false);
    }
  } catch (error) {
    console.error('Error recording correction:', error);
    // Don't throw - correction tracking is non-critical
  }
}

/**
 * Analyze corrections for a pattern to determine if it needs refinement
 */
export async function analyzePatternCorrections(
  patternId: string,
  timeWindowDays: number = 30
): Promise<{
  status: 'no_corrections' | 'acceptable' | 'moderate_correction_rate' | 'high_correction_rate';
  correction_rate: number;
  primary_correction_type?: string;
  recommendation: 'none' | 'minor_revision' | 'deprecate_or_major_revision';
}> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeWindowDays);

    // Get corrections for this pattern
    const { data: corrections } = await supabaseAdmin
      .from('correction_records')
      .select('correction_type')
      .eq('pattern_id_used', patternId)
      .gte('corrected_at', cutoffDate.toISOString());

    if (!corrections || corrections.length === 0) {
      return {
        status: 'no_corrections',
        correction_rate: 0,
        recommendation: 'none',
      };
    }

    // Get total usage count for this pattern in the time window
    const { data: pattern } = await supabaseAdmin
      .from('rule_library_patterns')
      .select('performance')
      .eq('pattern_id', patternId)
      .single();

    if (!pattern) {
      return {
        status: 'no_corrections',
        correction_rate: 0,
        recommendation: 'none',
      };
    }

    const usageCount = (pattern.performance?.usage_count || 0);
    const correctionRate = corrections.length / Math.max(usageCount, 1);

    // Group corrections by type
    const correctionsByType: Record<string, number> = {};
    for (const correction of corrections) {
      correctionsByType[correction.correction_type] =
        (correctionsByType[correction.correction_type] || 0) + 1;
    }

    const primaryCorrectionType = Object.entries(correctionsByType).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0];

    // Determine recommendation
    let recommendation: 'none' | 'minor_revision' | 'deprecate_or_major_revision';
    let status: 'acceptable' | 'moderate_correction_rate' | 'high_correction_rate';

    if (correctionRate > 0.15) {
      status = 'high_correction_rate';
      recommendation = 'deprecate_or_major_revision';
    } else if (correctionRate > 0.05) {
      status = 'moderate_correction_rate';
      recommendation = 'minor_revision';
    } else {
      status = 'acceptable';
      recommendation = 'none';
    }

    return {
      status,
      correction_rate: correctionRate,
      primary_correction_type: primaryCorrectionType,
      recommendation,
    };
  } catch (error) {
    console.error('Error analyzing pattern corrections:', error);
    return {
      status: 'no_corrections',
      correction_rate: 0,
      recommendation: 'none',
    };
  }
}

/**
 * Update pattern performance metrics
 */
async function updatePatternPerformance(
  patternId: string,
  success: boolean
): Promise<void> {
  try {
    const { data: pattern } = await supabaseAdmin
      .from('rule_library_patterns')
      .select('performance')
      .eq('pattern_id', patternId)
      .single();

    if (!pattern) return;

    const performance = pattern.performance || {
      usage_count: 0,
      success_count: 0,
      false_positive_count: 0,
      false_negative_count: 0,
      user_override_count: 0,
      success_rate: 1.0,
      last_used_at: null,
    };

    const newUsageCount = (performance.usage_count || 0) + 1;
    const newSuccessCount = success
      ? (performance.success_count || 0) + 1
      : (performance.success_count || 0);
    const newFalsePositiveCount = !success
      ? (performance.false_positive_count || 0) + 1
      : (performance.false_positive_count || 0);
    const newUserOverrideCount = !success
      ? (performance.user_override_count || 0) + 1
      : (performance.user_override_count || 0);
    const newSuccessRate = newSuccessCount / newUsageCount;

    await supabaseAdmin
      .from('rule_library_patterns')
      .update({
        performance: {
          ...performance,
          usage_count: newUsageCount,
          success_count: newSuccessCount,
          false_positive_count: newFalsePositiveCount,
          user_override_count: newUserOverrideCount,
          success_rate: newSuccessRate,
          last_used_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('pattern_id', patternId);
  } catch (error) {
    console.error('Error updating pattern performance:', error);
  }
}

/**
 * Record pattern success (when user confirms extraction without edits)
 */
export async function recordPatternSuccess(patternId: string): Promise<void> {
  await updatePatternPerformance(patternId, true);
}

