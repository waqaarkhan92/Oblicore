/**
 * Digest Delivery Job
 * Sends daily and weekly digest notifications
 * Reference: docs/specs/42_Backend_Notifications.md Section 7.1
 */

import { Job } from 'bullmq';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/services/email-service';
import {
  getDigestNotifications,
  generateDigestContent,
  markDigestNotificationsAsSent,
} from '@/lib/services/digest-service';
import { baseEmailTemplate } from '@/lib/templates/notification-templates';

export interface DigestDeliveryJobData {
  digest_type: 'DAILY' | 'WEEKLY';
  user_id?: string; // Optional: Process specific user
}

export async function processDigestDeliveryJob(
  job: Job<DigestDeliveryJobData>
): Promise<void> {
  const { digest_type, user_id } = job.data;

  try {
    const now = new Date();
    const endDate = new Date(now);
    const startDate = new Date(now);

    if (digest_type === 'DAILY') {
      // Daily digest: last 24 hours
      startDate.setHours(startDate.getHours() - 24);
    } else {
      // Weekly digest: last 7 days
      startDate.setDate(startDate.getDate() - 7);
    }

    // Get all users who have digest notifications, or specific user
    let usersQuery = supabaseAdmin
      .from('notifications')
      .select('user_id')
      .eq('status', 'QUEUED')
      .eq('metadata->>digest_type', digest_type)
      .eq('metadata->>queued_for_digest', 'true')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (user_id) {
      usersQuery = usersQuery.eq('user_id', user_id);
    }

    const { data: userNotifications } = await usersQuery;

    if (!userNotifications || userNotifications.length === 0) {
      console.log(`No ${digest_type.toLowerCase()} digest notifications to send`);
      return;
    }

    // Get unique user IDs
    const userIds = [...new Set(userNotifications.map((n: any) => n.user_id))];

    let sent = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        // Get user details
        const { data: user } = await supabaseAdmin
          .from('users')
          .select('id, email, full_name, company_id')
          .eq('id', userId)
          .single();

        if (!user) {
          continue;
        }

        // Get digest notifications for this user
        const digestNotifications = await getDigestNotifications(
          userId,
          digest_type,
          startDate,
          endDate
        );

        if (digestNotifications.length === 0) {
          continue;
        }

        // Generate digest content
        const digestContent = generateDigestContent(digestNotifications, digest_type);

        // Get company name
        let companyName = 'EcoComply';
        if (user.company_id) {
          const { data: company } = await supabaseAdmin
            .from('companies')
            .select('name')
            .eq('id', user.company_id)
            .single();
          companyName = company?.name || 'EcoComply';
        }

        // Wrap in email template
        const html = baseEmailTemplate(digestContent.html, companyName);

        // Send digest email
        const emailResult = await sendEmail({
          to: user.email,
          subject: digestContent.subject,
          html,
          text: digestContent.text,
        });

        if (emailResult.success) {
          // Mark all notifications as sent
          const notificationIds = digestNotifications.map((n) => n.notification_id);
          await markDigestNotificationsAsSent(notificationIds);

          sent++;
        } else {
          console.error(`Failed to send ${digest_type.toLowerCase()} digest to user ${userId}:`, emailResult.error);
          failed++;
        }
      } catch (error: any) {
        console.error(`Error processing ${digest_type.toLowerCase()} digest for user ${userId}:`, error);
        failed++;
      }
    }

    console.log(
      `${digest_type} digest delivery job completed: ${sent} sent, ${failed} failed`
    );
  } catch (error: any) {
    console.error(`${digest_type} digest delivery job failed:`, error);
    throw error;
  }
}

