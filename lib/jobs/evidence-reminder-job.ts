/**
 * Evidence Reminder Job
 * Sends notifications for obligations requiring evidence
 * Reference: docs/specs/41_Backend_Background_Jobs.md Section 2.3
 */

import { Job } from 'bullmq';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getAppUrl } from '@/lib/env';
import { obligationService } from '@/lib/services/obligation-service';
import { evidenceService } from '@/lib/services/evidence-service';
import { userService } from '@/lib/services/user-service';

export interface EvidenceReminderJobData {
  company_id?: string;
  site_id?: string;
}

export async function processEvidenceReminderJob(job: Job<EvidenceReminderJobData>): Promise<void> {
  const { company_id, site_id } = job.data;

  try {
    const now = new Date();
    const gracePeriodDays = 7; // 7 days grace period after deadline

    // Get overdue obligations using service layer
    const overdueObligations = await obligationService.getOverdue({
      companyId: company_id,
      siteId: site_id,
    });

    if (!overdueObligations || overdueObligations.length === 0) {
      console.log('No obligations requiring evidence reminders');
      return;
    }

    // Check which obligations have no linked evidence and are past grace period
    const obligationsNeedingEvidence: any[] = [];

    for (const obligation of overdueObligations) {
      try {
        // Check if obligation has approved evidence using service layer
        const hasEvidence = await evidenceService.hasApprovedEvidence(obligation.id);

        if (!hasEvidence && obligation.deadline_date) {
          // Check if past grace period
          const deadlineDate = new Date(obligation.deadline_date);
          const gracePeriodEnd = new Date(deadlineDate);
          gracePeriodEnd.setDate(gracePeriodEnd.getDate() + gracePeriodDays);

          if (now >= gracePeriodEnd) {
            obligationsNeedingEvidence.push(obligation);
          }
        }
      } catch (error: any) {
        console.error(`Error checking evidence for obligation ${obligation.id}:`, error);
        // Continue with next obligation
      }
    }

    if (obligationsNeedingEvidence.length === 0) {
      console.log('No obligations past grace period requiring evidence');
      return;
    }

    // Create notifications for each obligation
    let remindersCreated = 0;

    for (const obligation of obligationsNeedingEvidence) {
      try {
        const site = (obligation as any).sites;
        const companyId = site?.company_id || obligation.company_id;
        const siteId = site?.id || obligation.site_id;

        // Check if reminder already sent in last 24 hours
        const { data: existingNotification } = await supabaseAdmin
          .from('notifications')
          .select('id')
          .eq('entity_type', 'obligation')
          .eq('entity_id', obligation.id)
          .eq('notification_type', 'EVIDENCE_REMINDER')
          .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
          .single();

        if (existingNotification) {
          console.log(`Skipping obligation ${obligation.id}: reminder already sent in last 24 hours`);
          continue; // Already reminded in last 24 hours
        }

        // Get users who should receive this reminder using service layer
        const users = await userService.getNotificationRecipients({ companyId, siteId });

        if (users && users.length > 0 && obligation.deadline_date) {
          const daysSinceDeadline = Math.ceil(
            (now.getTime() - new Date(obligation.deadline_date).getTime()) / (1000 * 60 * 60 * 24)
          );

          const notifications = users.map((user: any) => ({
            user_id: user.id,
            company_id: companyId,
            site_id: siteId,
            recipient_email: user.email,
            notification_type: 'EVIDENCE_REMINDER',
            channel: 'EMAIL',
            priority: 'HIGH',
            subject: `Evidence Required: ${obligation.obligation_title || 'Obligation'}`,
            body_text: `The obligation "${obligation.obligation_title || obligation.obligation_description || obligation.original_text?.substring(0, 100) || 'Obligation'}" requires evidence. The deadline has passed and no evidence has been linked.`,
            entity_type: 'obligation',
            entity_id: obligation.id,
            status: 'PENDING',
            scheduled_for: new Date().toISOString(),
            metadata: {
              obligation_title: obligation.obligation_title,
              site_name: site?.name,
              deadline_date: obligation.deadline_date,
              days_since_deadline: daysSinceDeadline,
              company_name: companyId, // Will be resolved in template
              action_url: `${getAppUrl()}/sites/${siteId}/obligations/${obligation.id}`,
              evidence_upload_url: `${getAppUrl()}/sites/${siteId}/obligations/${obligation.id}/evidence/upload`,
            },
          }));

          const { error: notifyError } = await supabaseAdmin
            .from('notifications')
            .insert(notifications)
            .select('id')
            .limit(1);

          if (notifyError) {
            console.error(`Failed to create evidence reminder for obligation ${obligation.id}:`, notifyError);
            continue;
          }

          remindersCreated++;
          console.log(`Created evidence reminder for obligation ${obligation.id} (${users.length} recipients)`);

          // Note: Escalation is now handled by the escalation-check job
          // which runs periodically and checks time-based escalation (24h, 48h)
        } else {
          console.log(`No notification recipients found for obligation ${obligation.id}`);
        }
      } catch (error: any) {
        console.error(`Error processing obligation ${obligation.id}:`, error);
        // Continue with next obligation
      }
    }

    console.log(`Evidence reminder job completed: ${remindersCreated} reminders created for ${obligationsNeedingEvidence.length} obligations`);
  } catch (error: any) {
    console.error('Evidence reminder job failed:', error);
    throw error;
  }
}

