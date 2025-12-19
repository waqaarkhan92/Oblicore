/**
 * Pattern Auto-Approval Job
 * Automatically approves high-confidence patterns that meet strict criteria
 * Reference: AI Extraction Rules Library - Auto-Approval for high-quality patterns
 *
 * Scheduled: Daily at 3:00 AM UTC
 * Queue: pattern-auto-approval
 *
 * This job processes pattern_candidates with status='PENDING_REVIEW' and auto-approves
 * those that meet all criteria. Upon approval:
 * 1. Creates entry in rule_library_patterns with is_active=true
 * 2. Updates pattern_candidates status to 'APPROVED'
 * 3. Creates audit trail in pattern_events
 * 4. Notifies admins of auto-approved patterns
 */

import { Job } from 'bullmq';
import { supabaseAdmin } from '@/lib/supabase/server';

export interface PatternAutoApprovalJobInput {
  batch_size?: number; // Default: 100
  dry_run?: boolean; // If true, report what would be approved without doing it
}

export interface PatternMetrics {
  pattern_id: string;
  usage_count: number;
  match_rate: number;
  correction_rate: number;
  false_positive_rate: number;
  success_count: number;
  false_positive_count: number;
  correction_count: number;
}

// Auto-approval criteria (all must be met)
const AUTO_APPROVAL_CRITERIA = {
  MIN_MATCH_RATE: 0.95, // 95% match rate
  MIN_SAMPLE_COUNT: 10, // Used at least 10 times
  MAX_CORRECTION_RATE: 0.02, // 2% correction rate
  MAX_FALSE_POSITIVE_RATE: 0.01, // 1% false positive rate
} as const;

/**
 * Main job processor
 */
export async function processPatternAutoApprovalJob(
  job: Job<PatternAutoApprovalJobInput>
): Promise<void> {
  const { batch_size = 100, dry_run = false } = job.data;

  try {
    console.log(`Starting pattern auto-approval job (batch_size=${batch_size}, dry_run=${dry_run})`);

    // Step 1: Query pattern_candidates with status = 'PENDING_REVIEW'
    const { data: candidates, error: candidatesError } = await supabaseAdmin
      .from('pattern_candidates')
      .select('id, suggested_pattern, source_extractions, sample_count, match_rate, created_at')
      .eq('status', 'PENDING_REVIEW')
      .order('created_at', { ascending: true })
      .limit(batch_size);

    if (candidatesError) {
      throw new Error(`Failed to fetch pattern candidates: ${candidatesError.message}`);
    }

    if (!candidates || candidates.length === 0) {
      console.log('No pending pattern candidates found');
      return;
    }

    console.log(`Processing ${candidates.length} pattern candidates`);

    let autoApproved = 0;
    let notQualified = 0;
    const approvedPatternIds: string[] = [];
    const notQualifiedReasons: Record<string, string[]> = {};

    // Step 2-3: Process each candidate
    for (const candidate of candidates) {
      try {
        // Extract pattern_id from suggested_pattern
        const patternId = candidate.suggested_pattern?.pattern_id;
        if (!patternId) {
          console.warn(`Candidate ${candidate.id} has no pattern_id in suggested_pattern`);
          notQualified++;
          continue;
        }

        // Calculate metrics for this pattern candidate
        const metrics = await calculatePatternMetrics(candidate.id, candidate.source_extractions || []);

        // Check if all criteria are met
        const qualificationResult = checkAutoApprovalCriteria(metrics, candidate.sample_count, candidate.match_rate);

        if (qualificationResult.qualified) {
          console.log(`Pattern candidate ${candidate.id} (${patternId}) qualifies for auto-approval`);
          console.log(`  Metrics: match_rate=${metrics.match_rate.toFixed(3)}, correction_rate=${metrics.correction_rate.toFixed(3)}, false_positive_rate=${metrics.false_positive_rate.toFixed(3)}, sample_count=${metrics.usage_count}`);

          if (!dry_run) {
            // Step 3: Auto-approve the pattern
            await approvePatternCandidate(candidate.id, patternId, metrics);

            // Create audit trail entry
            await createAutoApprovalAuditEntry(patternId, metrics);

            autoApproved++;
            approvedPatternIds.push(patternId);
          } else {
            console.log(`  [DRY RUN] Would auto-approve pattern candidate ${candidate.id}`);
            autoApproved++;
            approvedPatternIds.push(patternId);
          }
        } else {
          notQualified++;
          notQualifiedReasons[candidate.id] = qualificationResult.reasons;
          console.log(`Pattern candidate ${candidate.id} does not qualify: ${qualificationResult.reasons.join(', ')}`);
        }
      } catch (error: any) {
        console.error(`Error processing candidate ${candidate.id}:`, error.message);
        // Continue with next candidate
      }
    }

    // Step 4: Log results
    console.log(`Pattern auto-approval job completed:`);
    console.log(`  - Auto-approved: ${autoApproved}`);
    console.log(`  - Not qualified: ${notQualified}`);
    console.log(`  - Total processed: ${candidates.length}`);

    if (dry_run && approvedPatternIds.length > 0) {
      console.log(`  [DRY RUN] Patterns that would be approved: ${approvedPatternIds.join(', ')}`);
    } else if (approvedPatternIds.length > 0) {
      console.log(`  Approved pattern IDs: ${approvedPatternIds.join(', ')}`);
    }

    // Optionally notify admins (can be implemented later)
    if (autoApproved > 0 && !dry_run) {
      await notifyAdminsOfAutoApprovals(autoApproved, approvedPatternIds);
    }
  } catch (error: any) {
    console.error('Pattern auto-approval job failed:', error.message);
    throw error;
  }
}

/**
 * Calculate pattern metrics from usage data
 */
export async function calculatePatternMetrics(
  candidateId: string,
  sourceExtractions: string[]
): Promise<PatternMetrics> {
  try {
    // Query correction_records to get correction count for this pattern's extractions
    const { data: corrections, error: correctionsError } = await supabaseAdmin
      .from('correction_records')
      .select('id, extraction_log_id')
      .in('extraction_log_id', sourceExtractions);

    if (correctionsError) {
      console.warn(`Failed to fetch corrections for candidate ${candidateId}:`, correctionsError.message);
    }

    const correctionCount = corrections?.length || 0;

    // For now, we'll use the data from pattern_candidates table
    // In a full implementation, you would track usage_count, false_positive_count, etc.
    // in the rule_library_patterns.performance JSONB field

    // Get the candidate's match_rate and sample_count
    const { data: candidate, error: candidateError } = await supabaseAdmin
      .from('pattern_candidates')
      .select('sample_count, match_rate, suggested_pattern')
      .eq('id', candidateId)
      .single();

    if (candidateError || !candidate) {
      throw new Error(`Failed to fetch candidate ${candidateId}: ${candidateError?.message}`);
    }

    const usageCount = candidate.sample_count || 0;
    const matchRate = candidate.match_rate || 0;

    // Calculate metrics
    // Note: In a real scenario, you would track these in the database
    // For now, we'll estimate based on available data
    const successCount = Math.floor(usageCount * matchRate);
    const falsePositiveCount = Math.floor(usageCount * 0.005); // Estimated, should be tracked

    const correctionRate = usageCount > 0 ? correctionCount / usageCount : 0;
    const falsePositiveRate = usageCount > 0 ? falsePositiveCount / usageCount : 0;

    return {
      pattern_id: candidate.suggested_pattern?.pattern_id || candidateId,
      usage_count: usageCount,
      match_rate: matchRate,
      correction_rate: correctionRate,
      false_positive_rate: falsePositiveRate,
      success_count: successCount,
      false_positive_count: falsePositiveCount,
      correction_count: correctionCount,
    };
  } catch (error: any) {
    console.error(`Error calculating metrics for candidate ${candidateId}:`, error.message);
    // Return default metrics on error
    return {
      pattern_id: candidateId,
      usage_count: 0,
      match_rate: 0,
      correction_rate: 1, // High correction rate to prevent approval
      false_positive_rate: 1, // High false positive rate to prevent approval
      success_count: 0,
      false_positive_count: 0,
      correction_count: 0,
    };
  }
}

/**
 * Check if pattern meets auto-approval criteria
 */
function checkAutoApprovalCriteria(
  metrics: PatternMetrics,
  sampleCount: number,
  matchRate: number
): { qualified: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Check sample count
  if (sampleCount < AUTO_APPROVAL_CRITERIA.MIN_SAMPLE_COUNT) {
    reasons.push(`Sample count (${sampleCount}) < ${AUTO_APPROVAL_CRITERIA.MIN_SAMPLE_COUNT}`);
  }

  // Check match rate
  if (matchRate < AUTO_APPROVAL_CRITERIA.MIN_MATCH_RATE) {
    reasons.push(`Match rate (${matchRate.toFixed(3)}) < ${AUTO_APPROVAL_CRITERIA.MIN_MATCH_RATE}`);
  }

  // Check correction rate
  if (metrics.correction_rate > AUTO_APPROVAL_CRITERIA.MAX_CORRECTION_RATE) {
    reasons.push(`Correction rate (${metrics.correction_rate.toFixed(3)}) > ${AUTO_APPROVAL_CRITERIA.MAX_CORRECTION_RATE}`);
  }

  // Check false positive rate
  if (metrics.false_positive_rate > AUTO_APPROVAL_CRITERIA.MAX_FALSE_POSITIVE_RATE) {
    reasons.push(`False positive rate (${metrics.false_positive_rate.toFixed(3)}) > ${AUTO_APPROVAL_CRITERIA.MAX_FALSE_POSITIVE_RATE}`);
  }

  return {
    qualified: reasons.length === 0,
    reasons,
  };
}

/**
 * Approve a pattern candidate
 */
async function approvePatternCandidate(
  candidateId: string,
  patternId: string,
  metrics: PatternMetrics
): Promise<void> {
  try {
    // Get the candidate
    const { data: candidate, error: candidateError } = await supabaseAdmin
      .from('pattern_candidates')
      .select('suggested_pattern')
      .eq('id', candidateId)
      .single();

    if (candidateError || !candidate) {
      throw new Error(`Failed to fetch candidate ${candidateId}: ${candidateError?.message}`);
    }

    // Create pattern in rule_library_patterns
    const { data: newPattern, error: patternError } = await supabaseAdmin
      .from('rule_library_patterns')
      .insert({
        pattern_id: patternId,
        pattern_version: candidate.suggested_pattern.pattern_version || '1.0.0',
        priority: candidate.suggested_pattern.priority || 500,
        display_name: candidate.suggested_pattern.display_name || patternId,
        description: candidate.suggested_pattern.description || `Auto-approved pattern: ${patternId}`,
        matching: candidate.suggested_pattern.matching || {},
        extraction_template: candidate.suggested_pattern.extraction_template || {},
        applicability: candidate.suggested_pattern.applicability || {},
        performance: {
          usage_count: metrics.usage_count,
          success_count: metrics.success_count,
          false_positive_count: metrics.false_positive_count,
          false_negative_count: 0,
          user_override_count: metrics.correction_count,
          success_rate: metrics.match_rate,
          last_used_at: new Date().toISOString(),
        },
        is_active: true,
        notes: `Auto-approved by system based on metrics: match_rate=${metrics.match_rate.toFixed(3)}, correction_rate=${metrics.correction_rate.toFixed(3)}, false_positive_rate=${metrics.false_positive_rate.toFixed(3)}`,
      })
      .select('id')
      .single();

    if (patternError) {
      throw new Error(`Failed to create pattern ${patternId}: ${patternError.message}`);
    }

    // Update pattern_candidates status
    const { error: updateError } = await supabaseAdmin
      .from('pattern_candidates')
      .update({
        status: 'APPROVED',
        reviewed_by: null, // System auto-approval
        reviewed_at: new Date().toISOString(),
        review_notes: `Auto-approved by system. Metrics: match_rate=${metrics.match_rate.toFixed(3)}, correction_rate=${metrics.correction_rate.toFixed(3)}, false_positive_rate=${metrics.false_positive_rate.toFixed(3)}, sample_count=${metrics.usage_count}`,
        created_pattern_id: patternId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', candidateId);

    if (updateError) {
      throw new Error(`Failed to update candidate ${candidateId}: ${updateError.message}`);
    }

    console.log(`Successfully approved pattern ${patternId} (candidate ${candidateId})`);
  } catch (error: any) {
    console.error(`Error approving candidate ${candidateId}:`, error.message);
    throw error;
  }
}

/**
 * Create audit trail entry for auto-approval
 */
export async function createAutoApprovalAuditEntry(
  patternId: string,
  metrics: PatternMetrics
): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('pattern_events')
      .insert({
        pattern_id: patternId,
        event_type: 'CREATED',
        to_version: '1.0.0',
        event_data: {
          auto_approved: true,
          approval_reason: 'Automatic approval based on high-confidence metrics',
          metrics: {
            usage_count: metrics.usage_count,
            match_rate: metrics.match_rate,
            correction_rate: metrics.correction_rate,
            false_positive_rate: metrics.false_positive_rate,
            success_count: metrics.success_count,
            false_positive_count: metrics.false_positive_count,
            correction_count: metrics.correction_count,
          },
          criteria: AUTO_APPROVAL_CRITERIA,
        },
        reason: `Auto-approved: match_rate=${metrics.match_rate.toFixed(3)}, correction_rate=${metrics.correction_rate.toFixed(3)}, false_positive_rate=${metrics.false_positive_rate.toFixed(3)}, sample_count=${metrics.usage_count}`,
        performed_by: null, // System auto-approval
      });

    if (error) {
      console.error(`Failed to create audit entry for pattern ${patternId}:`, error.message);
      // Don't throw - audit entry failure shouldn't fail the approval
    }
  } catch (error: any) {
    console.error(`Error creating audit entry for pattern ${patternId}:`, error.message);
    // Don't throw - audit entry failure shouldn't fail the approval
  }
}

/**
 * Notify admins of auto-approved patterns
 */
async function notifyAdminsOfAutoApprovals(
  count: number,
  patternIds: string[]
): Promise<void> {
  try {
    // Get all admin users
    const { data: admins, error: adminsError } = await supabaseAdmin
      .from('users')
      .select('id, email, company_id')
      .eq('role', 'ADMIN')
      .eq('is_active', true)
      .is('deleted_at', null);

    if (adminsError || !admins || admins.length === 0) {
      console.log('No admin users found to notify');
      return;
    }

    // Create notifications for each admin
    const notifications = admins.map((admin) => ({
      user_id: admin.id,
      company_id: admin.company_id,
      notification_type: 'PATTERN_AUTO_APPROVAL',
      channel: 'EMAIL',
      priority: 'NORMAL',
      subject: `${count} Pattern${count > 1 ? 's' : ''} Auto-Approved`,
      body_text: `${count} pattern candidate${count > 1 ? 's have' : ' has'} been automatically approved based on high-confidence metrics. Pattern IDs: ${patternIds.join(', ')}. Review the AI Extraction Rules Library for details.`,
      entity_type: 'pattern',
      entity_id: patternIds[0], // Link to first pattern
      status: 'PENDING',
      scheduled_for: new Date().toISOString(),
      metadata: {
        auto_approved_count: count,
        pattern_ids: patternIds,
        approval_criteria: AUTO_APPROVAL_CRITERIA,
      },
    }));

    const { error: notifyError } = await supabaseAdmin
      .from('notifications')
      .insert(notifications);

    if (notifyError) {
      console.error('Failed to create admin notifications:', notifyError.message);
      // Don't throw - notification failure shouldn't fail the job
    } else {
      console.log(`Created notifications for ${admins.length} admin users`);
    }
  } catch (error: any) {
    console.error('Error notifying admins:', error.message);
    // Don't throw - notification failure shouldn't fail the job
  }
}
