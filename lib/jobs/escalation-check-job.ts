/**
 * Escalation Check Job
 * Periodically checks for obligations that need escalation
 * Reference: docs/specs/42_Backend_Notifications.md Section 4
 */

import { Job } from 'bullmq';
import { supabaseAdmin } from '@/lib/supabase/server';
import { checkEscalation, createEscalationNotification } from '@/lib/services/escalation-service';

export interface EscalationCheckJobData {
  company_id?: string;
  site_id?: string;
}

export async function processEscalationCheckJob(
  job: Job<EscalationCheckJobData>
): Promise<void> {
  const { company_id, site_id } = job.data;

  try {
    // Query obligations with pending escalations
    // These are obligations that have Level 1 notifications but may need escalation
    let query = supabaseAdmin
      .from('obligations')
      .select(`
        id,
        company_id,
        site_id,
        obligation_title,
        deadline_date,
        status,
        sites!inner(id, name, company_id)
      `)
      .in('status', ['PENDING', 'DUE_SOON', 'OVERDUE', 'IN_PROGRESS'])
      .is('deleted_at', null);

    if (company_id) {
      query = query.eq('company_id', company_id);
    }
    if (site_id) {
      query = query.eq('site_id', site_id);
    }

    const { data: obligations, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch obligations: ${error.message}`);
    }

    if (!obligations || obligations.length === 0) {
      console.log('No obligations to check for escalation');
      return;
    }

    let escalated = 0;
    let checked = 0;

    for (const obligation of obligations) {
      try {
        const site = (obligation as any).sites;

        // Get latest notification for this obligation to determine current escalation level
        const { data: notifications } = await supabaseAdmin
          .from('notifications')
          .select('escalation_level, created_at')
          .eq('entity_type', 'obligation')
          .eq('entity_id', obligation.id)
          .not('escalation_level', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1);

        const currentLevel = notifications?.[0]?.escalation_level || 0;

        // Only check escalation if we have a Level 1 or Level 2 notification
        if (currentLevel === 0) {
          continue; // No escalation started yet
        }

        if (currentLevel >= 3) {
          continue; // Already at max level
        }

        checked++;

        // Check if escalation is needed
        const escalationCheck = await checkEscalation(obligation.id, currentLevel);

        if (escalationCheck.shouldEscalate && escalationCheck.nextLevel) {
          // Create escalation notification
          await createEscalationNotification(
            obligation.id,
            null,
            site.id,
            site.company_id,
            escalationCheck.nextLevel
          );

          escalated++;
        }
      } catch (error: any) {
        console.error(`Error checking escalation for obligation ${obligation.id}:`, error);
        // Continue with next obligation
      }
    }

    console.log(
      `Escalation check job completed: ${checked} checked, ${escalated} escalated`
    );
  } catch (error: any) {
    console.error('Escalation check job failed:', error);
    throw error;
  }
}

