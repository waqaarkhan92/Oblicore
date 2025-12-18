/**
 * Carrier License Expiry Notification Job
 * Monitors contractor licenses for upcoming expiry
 * Sends reminders at 90, 60, 30, 14, and 7 days before expiry
 */

import { Job } from 'bullmq';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getAppUrl } from '@/lib/env';

export interface CarrierLicenceExpiryJobData {
  company_id?: string; // Optional: process specific company only
}

interface LicenceExpiryStatus {
  licence_id: string;
  contractor_name: string;
  licence_number: string;
  licence_type: string;
  expiry_date: string;
  days_until_expiry: number;
  company_id: string;
  site_id?: string;
  status: 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'UPCOMING' | 'OK';
}

// Reminder thresholds in days
const REMINDER_THRESHOLDS = [90, 60, 30, 14, 7, 0];

export async function processCarrierLicenceExpiryJob(job: Job<CarrierLicenceExpiryJobData>): Promise<void> {
  const { company_id } = job.data;

  console.log(`Starting carrier licence expiry job${company_id ? ` for company ${company_id}` : ''}`);

  try {
    // Get all contractor licenses with expiry dates
    let query = supabaseAdmin
      .from('contractor_licences')
      .select(`
        id,
        contractor_name,
        licence_number,
        licence_type,
        expiry_date,
        company_id,
        site_id,
        last_reminder_sent_at,
        last_reminder_days
      `)
      .not('expiry_date', 'is', null)
      .is('deleted_at', null);

    if (company_id) {
      query = query.eq('company_id', company_id);
    }

    const { data: licences, error: licenceError } = await query;

    if (licenceError) {
      throw new Error(`Failed to fetch licences: ${licenceError.message}`);
    }

    if (!licences || licences.length === 0) {
      console.log('No licences to process');
      return;
    }

    const now = new Date();
    const expiredLicences: LicenceExpiryStatus[] = [];
    const criticalLicences: LicenceExpiryStatus[] = [];
    const warningLicences: LicenceExpiryStatus[] = [];
    const upcomingLicences: LicenceExpiryStatus[] = [];

    // Process each licence
    for (const licence of licences) {
      const expiryDate = new Date(licence.expiry_date);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      const status: LicenceExpiryStatus = {
        licence_id: licence.id,
        contractor_name: licence.contractor_name,
        licence_number: licence.licence_number,
        licence_type: licence.licence_type,
        expiry_date: licence.expiry_date,
        days_until_expiry: daysUntilExpiry,
        company_id: licence.company_id,
        site_id: licence.site_id,
        status: daysUntilExpiry < 0 ? 'EXPIRED'
          : daysUntilExpiry <= 7 ? 'CRITICAL'
          : daysUntilExpiry <= 30 ? 'WARNING'
          : daysUntilExpiry <= 90 ? 'UPCOMING'
          : 'OK',
      };

      // Check if we should send a reminder (avoid duplicate reminders)
      const shouldSendReminder = shouldSendReminderForLicence(
        daysUntilExpiry,
        licence.last_reminder_sent_at,
        licence.last_reminder_days
      );

      if (!shouldSendReminder) continue;

      if (daysUntilExpiry < 0) {
        expiredLicences.push(status);
      } else if (daysUntilExpiry <= 7) {
        criticalLicences.push(status);
      } else if (daysUntilExpiry <= 30) {
        warningLicences.push(status);
      } else if (daysUntilExpiry <= 90) {
        upcomingLicences.push(status);
      }
    }

    await job.updateProgress(30);

    // Send notifications for expired licences
    if (expiredLicences.length > 0) {
      await sendLicenceExpiryNotifications(expiredLicences, 'EXPIRED', 'HIGH');
    }

    await job.updateProgress(50);

    // Send notifications for critical licences (7 days or less)
    if (criticalLicences.length > 0) {
      await sendLicenceExpiryNotifications(criticalLicences, 'CRITICAL', 'HIGH');
    }

    await job.updateProgress(70);

    // Send notifications for warning licences (30 days or less)
    if (warningLicences.length > 0) {
      await sendLicenceExpiryNotifications(warningLicences, 'WARNING', 'NORMAL');
    }

    // Send notifications for upcoming licences (90 days or less)
    if (upcomingLicences.length > 0) {
      await sendLicenceExpiryNotifications(upcomingLicences, 'UPCOMING', 'LOW');
    }

    await job.updateProgress(100);

    console.log(`Carrier licence expiry job completed:
      - Expired: ${expiredLicences.length}
      - Critical (≤7 days): ${criticalLicences.length}
      - Warning (≤30 days): ${warningLicences.length}
      - Upcoming (≤90 days): ${upcomingLicences.length}`);

  } catch (error: any) {
    console.error('Carrier licence expiry job failed:', error);
    throw error;
  }
}

/**
 * Determine if we should send a reminder based on thresholds
 */
function shouldSendReminderForLicence(
  daysUntilExpiry: number,
  lastReminderSentAt: string | null,
  lastReminderDays: number | null
): boolean {
  // Find the applicable threshold
  const applicableThreshold = REMINDER_THRESHOLDS.find(t => daysUntilExpiry <= t);

  if (applicableThreshold === undefined && daysUntilExpiry > 90) {
    return false; // No reminder needed
  }

  // If no reminder sent yet, send one
  if (!lastReminderSentAt) {
    return true;
  }

  // Check if we've already sent a reminder for this threshold
  if (lastReminderDays !== null) {
    // Find what threshold the last reminder was for
    const lastThreshold = REMINDER_THRESHOLDS.find(t => lastReminderDays <= t);

    // Only send if we've crossed to a new threshold
    if (applicableThreshold !== undefined && lastThreshold !== applicableThreshold) {
      return true;
    }

    // For expired licences, send weekly reminders
    if (daysUntilExpiry < 0 && lastReminderDays < 0) {
      const lastSent = new Date(lastReminderSentAt);
      const daysSinceLastReminder = Math.floor((Date.now() - lastSent.getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceLastReminder >= 7;
    }
  }

  return false;
}

/**
 * Send expiry notifications and update licence records
 */
async function sendLicenceExpiryNotifications(
  licences: LicenceExpiryStatus[],
  alertType: 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'UPCOMING',
  priority: 'HIGH' | 'NORMAL' | 'LOW'
): Promise<void> {
  const baseUrl = getAppUrl();

  // Group licences by company
  const byCompany = new Map<string, LicenceExpiryStatus[]>();
  for (const licence of licences) {
    const existing = byCompany.get(licence.company_id) || [];
    existing.push(licence);
    byCompany.set(licence.company_id, existing);
  }

  for (const [companyId, companyLicences] of byCompany) {
    // Get admin users for this company
    const { data: adminUserRoles } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('company_id', companyId)
      .in('role', ['OWNER', 'ADMIN']);

    const adminUserIds = adminUserRoles?.map(r => r.user_id) || [];
    if (adminUserIds.length === 0) continue;

    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name')
      .in('id', adminUserIds)
      .eq('is_active', true)
      .is('deleted_at', null);

    if (!users || users.length === 0) continue;

    // Create notifications
    const notifications = [];
    for (const user of users) {
      for (const licence of companyLicences) {
        const subject = alertType === 'EXPIRED'
          ? `EXPIRED: Contractor License - ${licence.contractor_name}`
          : alertType === 'CRITICAL'
          ? `URGENT: License Expiring in ${licence.days_until_expiry} days - ${licence.contractor_name}`
          : alertType === 'WARNING'
          ? `License Expiry Warning: ${licence.contractor_name}`
          : `License Renewal Reminder: ${licence.contractor_name}`;

        const bodyText = alertType === 'EXPIRED'
          ? `The ${licence.licence_type} license for ${licence.contractor_name} (${licence.licence_number}) has EXPIRED on ${new Date(licence.expiry_date).toLocaleDateString('en-GB')}. You cannot use this contractor for waste transfers until the license is renewed.`
          : `The ${licence.licence_type} license for ${licence.contractor_name} (${licence.licence_number}) will expire on ${new Date(licence.expiry_date).toLocaleDateString('en-GB')} (${licence.days_until_expiry} days remaining). Please ensure license renewal is in progress.`;

        notifications.push({
          user_id: user.id,
          company_id: companyId,
          site_id: licence.site_id || null,
          recipient_email: user.email,
          notification_type: 'DEADLINE_REMINDER',
          channel: 'EMAIL',
          priority,
          subject,
          body_text: bodyText,
          action_url: `${baseUrl}/dashboard/module-4/contractor-licences/${licence.licence_id}`,
          entity_type: 'contractor_licence',
          entity_id: licence.licence_id,
          status: 'PENDING',
          scheduled_for: new Date().toISOString(),
          metadata: {
            alert_type: alertType,
            contractor_name: licence.contractor_name,
            licence_number: licence.licence_number,
            days_until_expiry: licence.days_until_expiry,
          },
        });
      }
    }

    // Batch insert notifications
    if (notifications.length > 0) {
      const { error: notifyError } = await supabaseAdmin.from('notifications').insert(notifications);
      if (notifyError) {
        console.error(`Failed to create licence expiry notifications for company ${companyId}:`, notifyError);
      }
    }

    // Update licence records with last reminder info
    for (const licence of companyLicences) {
      const { error: updateError } = await supabaseAdmin
        .from('contractor_licences')
        .update({
          last_reminder_sent_at: new Date().toISOString(),
          last_reminder_days: licence.days_until_expiry,
        })
        .eq('id', licence.licence_id);

      if (updateError) {
        console.error(`Failed to update licence ${licence.licence_id}:`, updateError);
      }
    }
  }
}
