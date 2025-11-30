/**
 * Pattern Refinement Service
 * Handles pattern updates, versioning, and performance analysis
 * Reference: docs/specs/80_AI_Extraction_Rules_Library.md Section 5.3
 */

import { supabaseAdmin } from '@/lib/supabase/server';

export interface PatternRefinement {
  pattern_id: string;
  current_version: string;
  proposed_version: string;
  changes: {
    regex_changes?: string[];
    template_changes?: string[];
    priority_changes?: number;
  };
  backtest_results?: {
    improvement_rate: number;
    accuracy_change: number;
  };
}

export interface CorrectionAnalysis {
  pattern_id: string;
  correction_rate: number;
  primary_correction_type: string;
  recommendation: 'deprecate_or_major_revision' | 'minor_revision' | 'none';
  status: 'high_correction_rate' | 'moderate_correction_rate' | 'acceptable' | 'no_corrections';
}

/**
 * Analyze corrections for a pattern to determine if refinement needed
 */
export async function analyzeCorrections(
  patternId: string,
  timeWindowDays: number = 30
): Promise<CorrectionAnalysis> {
  try {
    // Get pattern usage count
    const { data: pattern } = await supabaseAdmin
      .from('rule_library_patterns')
      .select('performance, pattern_id')
      .eq('pattern_id', patternId)
      .single();

    if (!pattern) {
      return {
        pattern_id: patternId,
        correction_rate: 0,
        primary_correction_type: 'unknown',
        recommendation: 'none',
        status: 'no_corrections',
      };
    }

    const usageCount = (pattern.performance as any)?.usage_count || 0;
    if (usageCount === 0) {
      return {
        pattern_id: patternId,
        correction_rate: 0,
        primary_correction_type: 'unknown',
        recommendation: 'none',
        status: 'no_corrections',
      };
    }

    // Get corrections from review queue (where pattern was used and user edited)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeWindowDays);

    const { data: corrections } = await supabaseAdmin
      .from('review_queue_items')
      .select('review_action, original_data, edited_data, reviewed_at')
      .eq('original_data->>pattern_id_used', patternId)
      .eq('review_status', 'COMPLETED')
      .in('review_action', ['edited', 'rejected'])
      .gte('reviewed_at', cutoffDate.toISOString());

    if (!corrections || corrections.length === 0) {
      return {
        pattern_id: patternId,
        correction_rate: 0,
        primary_correction_type: 'unknown',
        recommendation: 'none',
        status: 'no_corrections',
      };
    }

    const correctionRate = corrections.length / usageCount;

    // Determine primary correction type
    const correctionTypes: Record<string, number> = {};
    for (const correction of corrections) {
      const original = correction.original_data as any;
      const edited = correction.edited_data as any;

      if (original?.category !== edited?.category) {
        correctionTypes['category'] = (correctionTypes['category'] || 0) + 1;
      }
      if (original?.frequency !== edited?.frequency) {
        correctionTypes['frequency'] = (correctionTypes['frequency'] || 0) + 1;
      }
      if (original?.is_subjective !== edited?.is_subjective) {
        correctionTypes['is_subjective'] = (correctionTypes['is_subjective'] || 0) + 1;
      }
    }

    const primaryCorrectionType = Object.entries(correctionTypes)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'other';

    let recommendation: 'deprecate_or_major_revision' | 'minor_revision' | 'none';
    let status: 'high_correction_rate' | 'moderate_correction_rate' | 'acceptable';

    if (correctionRate > 0.15) {
      recommendation = 'deprecate_or_major_revision';
      status = 'high_correction_rate';
    } else if (correctionRate > 0.05) {
      recommendation = 'minor_revision';
      status = 'moderate_correction_rate';
    } else {
      recommendation = 'none';
      status = 'acceptable';
    }

    return {
      pattern_id: patternId,
      correction_rate: correctionRate,
      primary_correction_type: primaryCorrectionType,
      recommendation,
      status,
    };
  } catch (error) {
    console.error('Error analyzing corrections:', error);
    return {
      pattern_id: patternId,
      correction_rate: 0,
      primary_correction_type: 'error',
      recommendation: 'none',
      status: 'no_corrections',
    };
  }
}

/**
 * Create draft version of pattern for refinement
 */
export async function createDraftPattern(
  patternId: string,
  proposedChanges: {
    matching?: any;
    extraction_template?: any;
    priority?: number;
  }
): Promise<string | null> {
  try {
    // Get current pattern
    const { data: currentPattern } = await supabaseAdmin
      .from('rule_library_patterns')
      .select('*')
      .eq('pattern_id', patternId)
      .eq('is_active', true)
      .single();

    if (!currentPattern) {
      throw new Error(`Pattern not found: ${patternId}`);
    }

    // Increment version (minor version for non-breaking changes)
    const currentVersion = currentPattern.pattern_version.split('.');
    const newVersion = `${currentVersion[0]}.${parseInt(currentVersion[1]) + 1}.0`;

    // Create draft pattern
    const draftPattern = {
      ...currentPattern,
      pattern_version: newVersion,
      matching: proposedChanges.matching || currentPattern.matching,
      extraction_template: proposedChanges.extraction_template || currentPattern.extraction_template,
      priority: proposedChanges.priority ?? currentPattern.priority,
      is_active: false, // Draft is inactive
      notes: `Draft version for refinement. Original: ${currentPattern.pattern_version}`,
    };

    const { data: inserted, error } = await supabaseAdmin
      .from('rule_library_patterns')
      .insert(draftPattern)
      .select('id')
      .single();

    if (error || !inserted) {
      throw error || new Error('Failed to create draft pattern');
    }

    // Log pattern event
    await supabaseAdmin.from('pattern_events').insert({
      pattern_id: patternId,
      event_type: 'UPDATED',
      from_version: currentPattern.pattern_version,
      to_version: newVersion,
      event_data: { draft_id: inserted.id, changes: proposedChanges },
      reason: 'Pattern refinement draft created',
    });

    return inserted.id;
  } catch (error) {
    console.error('Error creating draft pattern:', error);
    return null;
  }
}

/**
 * Activate draft pattern after back-testing
 */
export async function activateDraftPattern(
  draftPatternId: string,
  backtestResults: {
    improvement_rate: number;
    accuracy_change: number;
  }
): Promise<boolean> {
  try {
    // Get draft pattern
    const { data: draftPattern } = await supabaseAdmin
      .from('rule_library_patterns')
      .select('*')
      .eq('id', draftPatternId)
      .single();

    if (!draftPattern) {
      throw new Error('Draft pattern not found');
    }

    // Only activate if improvement >= 5%
    if (backtestResults.improvement_rate < 0.05) {
      // Delete draft if not improving
      await supabaseAdmin
        .from('rule_library_patterns')
        .delete()
        .eq('id', draftPatternId);
      return false;
    }

    // Find and deactivate old version
    const { data: oldPatterns } = await supabaseAdmin
      .from('rule_library_patterns')
      .select('*')
      .eq('pattern_id', draftPattern.pattern_id)
      .eq('is_active', true);

    for (const oldPattern of oldPatterns || []) {
      await supabaseAdmin
        .from('rule_library_patterns')
        .update({
          is_active: false,
          deprecated_at: new Date().toISOString(),
          deprecated_reason: `Replaced by version ${draftPattern.pattern_version}`,
          replaced_by_pattern_id: draftPattern.pattern_id,
        })
        .eq('id', oldPattern.id);
    }

    // Activate draft
    await supabaseAdmin
      .from('rule_library_patterns')
      .update({
        is_active: true,
        notes: `Activated after back-testing. Improvement: ${(backtestResults.improvement_rate * 100).toFixed(1)}%`,
      })
      .eq('id', draftPatternId);

    // Log pattern event
    await supabaseAdmin.from('pattern_events').insert({
      pattern_id: draftPattern.pattern_id,
      event_type: 'ACTIVATED',
      from_version: oldPatterns?.[0]?.pattern_version || 'unknown',
      to_version: draftPattern.pattern_version,
      event_data: backtestResults,
      reason: 'Back-testing passed, pattern activated',
    });

    return true;
  } catch (error) {
    console.error('Error activating draft pattern:', error);
    return false;
  }
}

/**
 * Find patterns with declining performance
 * Reference: docs/specs/80_AI_Extraction_Rules_Library.md Section 5.2.3
 */
export interface PatternHealthStatus {
  pattern_id: string;
  pattern_version: string;
  usage_count: number;
  success_rate: number;
  false_positive_count: number;
  user_override_count: number;
  override_rate: number;
  health_status: 'CRITICAL' | 'WARNING' | 'HEALTHY';
}

export async function findDecliningPatterns(
  minUsageCount: number = 10
): Promise<PatternHealthStatus[]> {
  try {
    const { data: patterns, error } = await supabaseAdmin
      .from('rule_library_patterns')
      .select('pattern_id, pattern_version, performance, is_active')
      .eq('is_active', true);

    if (error || !patterns) {
      console.error('Error fetching patterns:', error);
      return [];
    }

    const decliningPatterns: PatternHealthStatus[] = [];

    for (const pattern of patterns) {
      const perf = pattern.performance as any;
      const usageCount = perf?.usage_count || 0;
      const successRate = perf?.success_rate || 0;
      const falsePositiveCount = perf?.false_positive_count || 0;
      const userOverrideCount = perf?.user_override_count || 0;

      // Skip if below minimum usage for statistical significance
      if (usageCount < minUsageCount) {
        continue;
      }

      const overrideRate = usageCount > 0 ? (userOverrideCount / usageCount) * 100 : 0;

      // Check if pattern is declining
      if (successRate < 0.90 || overrideRate > 10) {
        let healthStatus: 'CRITICAL' | 'WARNING' | 'HEALTHY';
        if (successRate < 0.85) {
          healthStatus = 'CRITICAL';
        } else if (successRate < 0.90) {
          healthStatus = 'WARNING';
        } else {
          healthStatus = 'HEALTHY';
        }

        decliningPatterns.push({
          pattern_id: pattern.pattern_id,
          pattern_version: pattern.pattern_version,
          usage_count: usageCount,
          success_rate: successRate,
          false_positive_count: falsePositiveCount,
          user_override_count: userOverrideCount,
          override_rate: overrideRate,
          health_status: healthStatus,
        });
      }
    }

    // Sort by success rate ascending, then by user override count descending
    decliningPatterns.sort((a, b) => {
      if (a.success_rate !== b.success_rate) {
        return a.success_rate - b.success_rate;
      }
      return b.user_override_count - a.user_override_count;
    });

    return decliningPatterns;
  } catch (error) {
    console.error('Error finding declining patterns:', error);
    return [];
  }
}

/**
 * Rollback pattern to previous version
 */
export async function rollbackPatternVersion(
  patternId: string,
  targetVersion: string,
  reason: string
): Promise<boolean> {
  try {
    // Get current active version
    const { data: currentPattern } = await supabaseAdmin
      .from('rule_library_patterns')
      .select('*')
      .eq('pattern_id', patternId)
      .eq('is_active', true)
      .single();

    if (!currentPattern) {
      throw new Error('Active pattern not found');
    }

    // Get target version
    const { data: targetPattern } = await supabaseAdmin
      .from('rule_library_patterns')
      .select('*')
      .eq('pattern_id', patternId)
      .eq('pattern_version', targetVersion)
      .single();

    if (!targetPattern) {
      throw new Error(`Target version ${targetVersion} not found`);
    }

    // Deactivate current version
    await supabaseAdmin
      .from('rule_library_patterns')
      .update({
        is_active: false,
        deprecated_at: new Date().toISOString(),
        deprecated_reason: `Rolled back to ${targetVersion}: ${reason}`,
        replaced_by_pattern_id: targetPattern.id,
      })
      .eq('id', currentPattern.id);

    // Reactivate target version
    await supabaseAdmin
      .from('rule_library_patterns')
      .update({
        is_active: true,
        deprecated_at: null,
        deprecated_reason: null,
        replaced_by_pattern_id: null,
      })
      .eq('id', targetPattern.id);

    // Log rollback
    await supabaseAdmin.from('pattern_events').insert({
      pattern_id: patternId,
      event_type: 'ROLLBACK',
      from_version: currentPattern.pattern_version,
      to_version: targetVersion,
      reason,
      performed_by: null, // System rollback
    });

    return true;
  } catch (error) {
    console.error('Error rolling back pattern:', error);
    return false;
  }
}

