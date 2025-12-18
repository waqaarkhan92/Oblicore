/**
 * Digest Notification Service
 * Handles daily and weekly digest notifications
 * Reference: docs/specs/42_Backend_Notifications.md Section 7.1
 */

import { supabaseAdmin } from '@/lib/supabase/server';
import { getAppUrl } from '@/lib/env';

export interface DigestNotification {
  notification_id: string;
  user_id: string;
  notification_type: string;
  subject: string;
  body_text: string;
  priority: string;
  created_at: string;
}

/**
 * Queue notification for digest
 */
export async function queueForDigest(
  notificationId: string,
  userId: string,
  digestType: 'DAILY' | 'WEEKLY'
): Promise<void> {
  // Get current notification metadata
  const { data: currentNotification } = await supabaseAdmin
    .from('notifications')
    .select('metadata')
    .eq('id', notificationId)
    .single();

  // Update notification metadata to mark it for digest
  await supabaseAdmin
    .from('notifications')
    .update({
      status: 'QUEUED',
      metadata: {
        ...(currentNotification?.metadata || {}),
        digest_type: digestType,
        queued_for_digest: true,
        queued_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', notificationId);
}

/**
 * Get notifications queued for digest
 */
export async function getDigestNotifications(
  userId: string,
  digestType: 'DAILY' | 'WEEKLY',
  startDate: Date,
  endDate: Date
): Promise<DigestNotification[]> {
  const { data: notifications, error } = await supabaseAdmin
    .from('notifications')
    .select('id, user_id, notification_type, subject, body_text, priority, created_at, metadata')
    .eq('user_id', userId)
    .eq('status', 'QUEUED')
    .eq('metadata->>digest_type', digestType)
    .eq('metadata->>queued_for_digest', 'true')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching digest notifications:', error);
    return [];
  }

  return (notifications || []).map((n: any) => ({
    notification_id: n.id,
    user_id: n.user_id,
    notification_type: n.notification_type,
    subject: n.subject,
    body_text: n.body_text,
    priority: n.priority,
    created_at: n.created_at,
  }));
}

/**
 * Generate digest email content
 */
export function generateDigestContent(
  notifications: DigestNotification[],
  digestType: 'DAILY' | 'WEEKLY'
): { subject: string; html: string; text: string } {
  const period = digestType === 'DAILY' ? 'Daily' : 'Weekly';
  const subject = `${period} Notification Digest - ${notifications.length} notification${notifications.length !== 1 ? 's' : ''}`;

  // Group by notification type
  const grouped: Record<string, DigestNotification[]> = {};
  for (const notif of notifications) {
    if (!grouped[notif.notification_type]) {
      grouped[notif.notification_type] = [];
    }
    grouped[notif.notification_type].push(notif);
  }

  let htmlContent = `
    <h2 style="color: #026A67; margin-top: 0;">${period} Notification Digest</h2>
    <p>You have ${notifications.length} notification${notifications.length !== 1 ? 's' : ''} in your ${period.toLowerCase()} digest:</p>
  `;

  for (const [type, typeNotifications] of Object.entries(grouped)) {
    htmlContent += `
      <div style="margin: 20px 0;">
        <h3 style="color: #026A67; font-size: 18px;">${formatNotificationType(type)} (${typeNotifications.length})</h3>
    `;

    for (const notif of typeNotifications) {
      const priorityColor = notif.priority === 'CRITICAL' || notif.priority === 'URGENT' 
        ? '#B13434' 
        : notif.priority === 'HIGH' 
        ? '#CB7C00' 
        : '#026A67';

      htmlContent += `
        <div style="background-color: white; border-left: 4px solid ${priorityColor}; padding: 15px; margin: 10px 0;">
          <strong>${notif.subject}</strong>
          <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">${notif.body_text}</p>
        </div>
      `;
    }

    htmlContent += `</div>`;
  }

  htmlContent += `
    <div style="text-align: center; margin: 30px 0;">
      <a href="${getAppUrl()}/notifications" 
         style="background-color: #026A67; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        View All Notifications
      </a>
    </div>
  `;

  // Plain text version
  let textContent = `${period} Notification Digest\n\n`;
  textContent += `You have ${notifications.length} notification${notifications.length !== 1 ? 's' : ''}:\n\n`;

  for (const [type, typeNotifications] of Object.entries(grouped)) {
    textContent += `${formatNotificationType(type)} (${typeNotifications.length}):\n`;
    for (const notif of typeNotifications) {
      textContent += `- ${notif.subject}\n  ${notif.body_text}\n\n`;
    }
  }

  return { subject, html: htmlContent, text: textContent };
}

/**
 * Format notification type for display
 */
function formatNotificationType(type: string): string {
  const typeMap: Record<string, string> = {
    DEADLINE_WARNING_7D: '7-Day Deadline Warnings',
    DEADLINE_WARNING_3D: '3-Day Deadline Warnings',
    DEADLINE_WARNING_1D: '1-Day Deadline Warnings',
    OVERDUE_OBLIGATION: 'Overdue Obligations',
    EVIDENCE_REMINDER: 'Evidence Reminders',
    PERMIT_RENEWAL_REMINDER: 'Permit Renewal Reminders',
    ESCALATION: 'Escalations',
    AUDIT_PACK_READY: 'Audit Packs',
    REGULATOR_PACK_READY: 'Regulator Packs',
    TENDER_PACK_READY: 'Tender Packs',
    BOARD_PACK_READY: 'Board Packs',
    INSURER_PACK_READY: 'Insurer Packs',
    PACK_DISTRIBUTED: 'Pack Distributions',
  };

  return typeMap[type] || type.replace(/_/g, ' ');
}

/**
 * Mark notifications as sent in digest
 */
export async function markDigestNotificationsAsSent(
  notificationIds: string[]
): Promise<void> {
  // Update each notification individually to preserve metadata
  for (const notificationId of notificationIds) {
    const { data: currentNotification } = await supabaseAdmin
      .from('notifications')
      .select('metadata')
      .eq('id', notificationId)
      .single();

    await supabaseAdmin
      .from('notifications')
      .update({
        status: 'SENT',
        sent_at: new Date().toISOString(),
        metadata: {
          ...(currentNotification?.metadata || {}),
          sent_via_digest: true,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', notificationId);
  }
}

