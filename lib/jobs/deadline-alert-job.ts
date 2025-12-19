/**
 * Deadline Alert Job
 * Sends notifications for upcoming deadlines (7/3/1 day warnings)
 * Reference: docs/specs/41_Backend_Background_Jobs.md Section 2.2
 */

import { Job } from 'bullmq';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getAppUrl } from '@/lib/env';

export interface DeadlineAlertJobData {
  company_id?: string;
  site_id?: string;
}

export async function processDeadlineAlertJob(job: Job<DeadlineAlertJobData>): Promise<void> {
  const { company_id, site_id } = job.data;

  try {
    const now = new Date();
    const alertsCreated = {
      '7_DAYS': 0,
      '3_DAYS': 0,
      '1_DAY': 0,
    };

    // Fetch deadlines due in 7, 3, or 1 days
    // TODO: Replace with deadlineService.getForAlerts([7, 3, 1], { company_id, site_id })
    const deadlines = await fetchDeadlinesForAlerts(company_id, site_id);

    if (!deadlines || deadlines.length === 0) {
      console.log('No deadlines requiring alerts');
      return;
    }

    console.log(`Processing ${deadlines.length} deadlines for alerts`);

    // Process each deadline
    for (const deadline of deadlines) {
      try {
        const obligation = (deadline as any).obligations;
        const site = (obligation as any).sites;

        if (!obligation || !site) {
          console.warn(`Deadline ${deadline.id} missing obligation or site data`);
          continue;
        }

        const daysUntilDue = Math.ceil(
          (new Date(deadline.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Determine alert level and priority
        const { alertLevel, priority } = determineAlertLevel(daysUntilDue);

        if (!alertLevel) {
          console.warn(`Unexpected days until due (${daysUntilDue}) for deadline ${deadline.id}`);
          continue;
        }

        // Check if notification already sent for this deadline and alert level
        const notificationType = `DEADLINE_WARNING_${alertLevel}`;
        const alreadyNotified = await hasNotificationBeenSent('deadline', deadline.id, notificationType);

        if (alreadyNotified) {
          console.log(`Skipping deadline ${deadline.id}: already notified for ${alertLevel}`);
          continue;
        }

        // Get users who should receive this alert
        // TODO: Replace with userService.getNotificationRecipients(site.company_id, site.id)
        const users = await fetchNotificationRecipients(site.company_id, site.id);

        if (!users || users.length === 0) {
          console.warn(`No notification recipients found for company ${site.company_id}, site ${site.id}`);
          continue;
        }

        // Create notifications for each user
        const notifications = users.map((user: any) => ({
          user_id: user.id,
          company_id: site.company_id,
          site_id: site.id,
          recipient_email: user.email,
          notification_type: notificationType,
          channel: 'EMAIL',
          priority,
          subject: generateNotificationSubject(obligation, daysUntilDue),
          body_text: generateNotificationBody(obligation, daysUntilDue, deadline.due_date),
          entity_type: 'deadline',
          entity_id: deadline.id,
          status: 'PENDING',
          scheduled_for: new Date().toISOString(),
          metadata: {
            obligation_title: obligation.obligation_title,
            site_name: site.name,
            deadline_date: deadline.due_date,
            days_remaining: daysUntilDue,
            company_name: site.company_id, // Will be resolved in template
            action_url: `${getAppUrl()}/sites/${site.id}/obligations/${obligation.id}`,
          },
        }));

        // Insert notifications
        // TODO: Replace with notificationService.createBulk(notifications)
        const created = await createBulkNotifications(notifications);

        if (created) {
          alertsCreated[alertLevel]++;
          console.log(`Created ${notifications.length} notifications for deadline ${deadline.id} (${alertLevel})`);
        }

        // Note: Escalation is now handled by the escalation-check job
        // which runs periodically and checks time-based escalation (24h, 48h)
      } catch (error: any) {
        console.error(`Error processing deadline ${deadline.id}:`, error.message);
        // Continue with next deadline
      }
    }

    console.log(
      `Deadline alert job completed: ${alertsCreated['7_DAYS']} (7d), ${alertsCreated['3_DAYS']} (3d), ${alertsCreated['1_DAY']} (1d) alerts created`
    );
  } catch (error: any) {
    console.error('Deadline alert job failed:', error.message);
    throw error;
  }
}

/**
 * Fetch deadlines for alerts (7, 3, 1 days out)
 * TODO: Move to deadline-service.ts as getForAlerts([7, 3, 1], { company_id, site_id })
 */
async function fetchDeadlinesForAlerts(company_id?: string, site_id?: string): Promise<any[]> {
  const now = new Date();

  // Calculate alert dates
  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const sevenDaysDate = sevenDaysFromNow.toISOString().split('T')[0];

  const threeDaysFromNow = new Date(now);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  const threeDaysDate = threeDaysFromNow.toISOString().split('T')[0];

  const oneDayFromNow = new Date(now);
  oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);
  const oneDayDate = oneDayFromNow.toISOString().split('T')[0];

  // Query deadlines due in 7, 3, or 1 days
  let query = supabaseAdmin
    .from('deadlines')
    .select(`
      id,
      obligation_id,
      due_date,
      status,
      obligations!inner(
        id,
        company_id,
        site_id,
        original_text,
        obligation_title,
        obligation_description,
        category,
        sites!inner(id, name, company_id)
      )
    `)
    .eq('status', 'PENDING')
    .in('due_date', [sevenDaysDate, threeDaysDate, oneDayDate]);

  if (company_id) {
    query = query.eq('obligations.company_id', company_id);
  }
  if (site_id) {
    query = query.eq('obligations.site_id', site_id);
  }

  const { data: deadlines, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch deadlines: ${error.message}`);
  }

  return deadlines || [];
}

/**
 * Check if a notification has already been sent for a specific entity and type
 * TODO: Move to notification-service.ts as hasNotificationBeenSent(entityType, entityId, notificationType)
 */
async function hasNotificationBeenSent(
  entityType: string,
  entityId: string,
  notificationType: string
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('notifications')
    .select('id')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('notification_type', notificationType)
    .limit(1)
    .single();

  return !!data;
}

/**
 * Fetch users who should receive notifications for a company/site
 * TODO: Move to user-service.ts as getNotificationRecipients(companyId, siteId)
 */
async function fetchNotificationRecipients(companyId: string, siteId?: string): Promise<any[]> {
  const { data: users, error } = await supabaseAdmin
    .from('users')
    .select(`
      id,
      email,
      full_name,
      company_id,
      user_roles!inner(role)
    `)
    .eq('company_id', companyId)
    .in('user_roles.role', ['OWNER', 'ADMIN', 'STAFF'])
    .eq('is_active', true)
    .is('deleted_at', null);

  if (error) {
    throw new Error(`Failed to fetch notification recipients: ${error.message}`);
  }

  return users || [];
}

/**
 * Create multiple notifications in bulk
 * TODO: Move to notification-service.ts as createBulk(notifications)
 */
async function createBulkNotifications(notifications: any[]): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('notifications')
    .insert(notifications)
    .select('id')
    .limit(1);

  if (error) {
    throw new Error(`Failed to create bulk notifications: ${error.message}`);
  }

  return true;
}

/**
 * Determine alert level and priority based on days until due
 */
function determineAlertLevel(daysUntilDue: number): {
  alertLevel: '7_DAYS' | '3_DAYS' | '1_DAY' | null;
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
} {
  if (daysUntilDue === 7) {
    return { alertLevel: '7_DAYS', priority: 'NORMAL' };
  } else if (daysUntilDue === 3) {
    return { alertLevel: '3_DAYS', priority: 'HIGH' };
  } else if (daysUntilDue === 1) {
    return { alertLevel: '1_DAY', priority: 'URGENT' };
  }
  return { alertLevel: null, priority: 'NORMAL' };
}

/**
 * Generate notification subject line
 */
function generateNotificationSubject(obligation: any, daysUntilDue: number): string {
  const obligationTitle = obligation.obligation_title || 'Obligation';
  const daysText = daysUntilDue !== 1 ? 's' : '';
  return `Deadline Alert: ${obligationTitle} due in ${daysUntilDue} day${daysText}`;
}

/**
 * Generate notification body text
 */
function generateNotificationBody(obligation: any, daysUntilDue: number, dueDate: string): string {
  const obligationText =
    obligation.obligation_title ||
    obligation.obligation_description ||
    obligation.original_text?.substring(0, 100) ||
    'Obligation';
  const daysText = daysUntilDue !== 1 ? 's' : '';
  return `The obligation "${obligationText}" is due in ${daysUntilDue} day${daysText} (${dueDate}).`;
}

