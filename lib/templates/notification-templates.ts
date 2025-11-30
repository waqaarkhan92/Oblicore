/**
 * Notification Email Templates
 * Comprehensive email templates for all notification types
 * Reference: docs/specs/42_Backend_Notifications.md Section 2
 */

import { renderTemplate, TemplateVariables } from './email-templates';

export interface NotificationTemplateData {
  notification_type: string;
  subject?: string;
  body_text?: string;
  metadata?: Record<string, any>;
  [key: string]: any;
}

/**
 * Base email template with EcoComply branding
 * Exported for use in digest service
 */
export function baseEmailTemplate(
  content: string,
  companyName?: string,
  unsubscribeUrl?: string
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #E2E6E7;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background-color: #026A67; color: white; padding: 20px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px;">EcoComply</h1>
    </div>
    
    <!-- Body -->
    <div style="background-color: #f9fafb; padding: 30px;">
      ${content}
    </div>
    
    <!-- Footer -->
    <div style="background-color: #E2E6E7; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
      <p style="margin: 0;">${companyName || 'EcoComply'} | Compliance Management</p>
      ${unsubscribeUrl ? `<p style="margin: 5px 0;"><a href="${unsubscribeUrl}" style="color: #026A67; text-decoration: none;">Unsubscribe</a></p>` : ''}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Strip HTML to create plain text version
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Get email template for a notification type
 * Supports template versioning if notification_templates table exists
 */
export async function getEmailTemplate(
  notificationType: string,
  notification: NotificationTemplateData
): Promise<{ subject: string; html: string; text: string }> {
  // Try to get versioned template first
  try {
    const { getActiveTemplate } = await import('@/lib/services/template-versioning-service');
    const versionedTemplate = await getActiveTemplate(notificationType);
    
    if (versionedTemplate) {
      // Use versioned template
      const variables: TemplateVariables = {
        ...notification.metadata,
        subject: notification.subject,
        body_text: notification.body_text,
      };
      
      const subject = renderTemplate(versionedTemplate.subject_template, variables);
      const html = renderTemplate(versionedTemplate.html_template, variables);
      const text = renderTemplate(versionedTemplate.text_template, variables);
      
      // Store template version ID (if notification has ID)
      if (notification.id) {
        const { storeTemplateVersion } = await import('@/lib/services/template-versioning-service');
        await storeTemplateVersion(notification.id, versionedTemplate.id);
      }
      
      return { subject, html, text };
    }
  } catch (error) {
    // Template versioning not available or error - fall back to default templates
    // This is expected if notification_templates table doesn't exist yet
  }

  // Fall back to default templates
  const variables: TemplateVariables = {
    ...notification.metadata,
    subject: notification.subject,
    body_text: notification.body_text,
  };

  switch (notificationType) {
    case 'DEADLINE_WARNING_7D':
      return deadlineWarning7DTemplate(variables);
    case 'DEADLINE_WARNING_3D':
      return deadlineWarning3DTemplate(variables);
    case 'DEADLINE_WARNING_1D':
      return deadlineWarning1DTemplate(variables);
    case 'OVERDUE_OBLIGATION':
      return overdueObligationTemplate(variables);
    case 'EVIDENCE_REMINDER':
      return evidenceReminderTemplate(variables);
    case 'PERMIT_RENEWAL_REMINDER':
      return permitRenewalReminderTemplate(variables);
    case 'ESCALATION':
      return escalationTemplate(variables);
    case 'AUDIT_PACK_READY':
    case 'REGULATOR_PACK_READY':
    case 'TENDER_PACK_READY':
    case 'BOARD_PACK_READY':
    case 'INSURER_PACK_READY':
      return packReadyTemplate(notificationType, variables);
    case 'PACK_DISTRIBUTED':
      return packDistributedTemplate(variables);
    default:
      // Default template for unknown types
      return defaultTemplate(notification.subject || 'Notification', notification.body_text || '');
  }
}

/**
 * 7-Day Deadline Warning Template
 */
function deadlineWarning7DTemplate(variables: TemplateVariables): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = renderTemplate('{{obligation_title}} - {{days_remaining}} days remaining', variables);
  
  const content = `
    <h2 style="color: #1E7A50; margin-top: 0;">Upcoming Deadline Reminder</h2>
    <p>Hello,</p>
    <p>This is a reminder that you have an upcoming compliance obligation:</p>
    <div style="background-color: white; border-left: 4px solid #1E7A50; padding: 15px; margin: 20px 0;">
      <strong>${variables.obligation_title || 'Obligation'}</strong><br>
      <span style="color: #6b7280;">Site: ${variables.site_name || 'N/A'}</span><br>
      <span style="color: #6b7280;">Due Date: ${variables.deadline_date || 'N/A'}</span><br>
      <span style="color: #6b7280;">Days Remaining: ${variables.days_remaining || 7}</span>
    </div>
    <p>Please ensure all required evidence is uploaded and linked to this obligation before the deadline.</p>
    ${variables.action_url ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${variables.action_url}" style="background-color: #1E7A50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Obligation</a>
      </div>
    ` : ''}
  `;

  const html = baseEmailTemplate(content, variables.company_name as string, variables.unsubscribe_url as string);
  const text = stripHtml(html);

  return { subject, html, text };
}

/**
 * 3-Day Deadline Warning Template
 */
function deadlineWarning3DTemplate(variables: TemplateVariables): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = renderTemplate('⚠️ {{obligation_title}} - {{days_remaining}} days remaining (Urgent)', variables);
  
  const content = `
    <h2 style="color: #CB7C00; margin-top: 0;">⚠️ Upcoming Deadline Reminder (Urgent)</h2>
    <p>Hello,</p>
    <p><strong>Action required soon:</strong> You have an upcoming compliance obligation:</p>
    <div style="background-color: white; border-left: 4px solid #CB7C00; padding: 15px; margin: 20px 0;">
      <strong>${variables.obligation_title || 'Obligation'}</strong><br>
      <span style="color: #6b7280;">Site: ${variables.site_name || 'N/A'}</span><br>
      <span style="color: #6b7280;">Due Date: ${variables.deadline_date || 'N/A'}</span><br>
      <span style="color: #CB7C00;"><strong>Days Remaining: ${variables.days_remaining || 3}</strong></span>
    </div>
    <p>Please ensure all required evidence is uploaded and linked to this obligation before the deadline.</p>
    ${variables.action_url ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${variables.action_url}" style="background-color: #CB7C00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Obligation</a>
      </div>
    ` : ''}
  `;

  const html = baseEmailTemplate(content, variables.company_name as string, variables.unsubscribe_url as string);
  const text = stripHtml(html);

  return { subject, html, text };
}

/**
 * 1-Day Deadline Warning Template
 */
function deadlineWarning1DTemplate(variables: TemplateVariables): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = renderTemplate('🚨 CRITICAL: {{obligation_title}} - Due Tomorrow', variables);
  
  const content = `
    <h2 style="color: #B13434; margin-top: 0;">🚨 CRITICAL: Deadline Due Tomorrow</h2>
    <p>Hello,</p>
    <p><strong>Immediate action required:</strong> This obligation is due tomorrow:</p>
    <div style="background-color: white; border-left: 4px solid #B13434; padding: 15px; margin: 20px 0;">
      <strong>${variables.obligation_title || 'Obligation'}</strong><br>
      <span style="color: #6b7280;">Site: ${variables.site_name || 'N/A'}</span><br>
      <span style="color: #B13434;"><strong>Due Date: ${variables.deadline_date || 'Tomorrow'}</strong></span><br>
      <span style="color: #B13434;"><strong>Days Remaining: ${variables.days_remaining || 1}</strong></span>
    </div>
    <p><strong>Please upload the required evidence immediately to avoid compliance issues.</strong></p>
    ${variables.action_url ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${variables.action_url}" style="background-color: #B13434; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Obligation</a>
      </div>
    ` : ''}
  `;

  const html = baseEmailTemplate(content, variables.company_name as string, variables.unsubscribe_url as string);
  const text = stripHtml(html);

  return { subject, html, text };
}

/**
 * Overdue Obligation Template
 */
function overdueObligationTemplate(variables: TemplateVariables): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = renderTemplate('🚨 OVERDUE: {{obligation_title}} - {{overdue_days}} days overdue', variables);
  
  const content = `
    <h2 style="color: #B13434; margin-top: 0;">⚠️ Overdue Obligation</h2>
    <p>Hello,</p>
    <p><strong>This obligation is now overdue and requires immediate attention:</strong></p>
    <div style="background-color: white; border-left: 4px solid #B13434; padding: 15px; margin: 20px 0;">
      <strong>${variables.obligation_title || 'Obligation'}</strong><br>
      <span style="color: #6b7280;">Site: ${variables.site_name || 'N/A'}</span><br>
      <span style="color: #B13434;"><strong>Due Date: ${variables.deadline_date || 'N/A'}</strong></span><br>
      <span style="color: #B13434;"><strong>Days Overdue: ${variables.overdue_days || 0}</strong></span>
      ${variables.escalation_indicator ? `
        <br><span style="color: #B13434;"><strong>⚠️ This has been escalated to ${variables.escalation_level || 'management'}</strong></span>
      ` : ''}
    </div>
    <p>Please upload the required evidence immediately to avoid compliance issues.</p>
    ${variables.action_url ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${variables.action_url}" style="background-color: #B13434; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">View Obligation</a>
        ${variables.evidence_upload_url ? `
          <a href="${variables.evidence_upload_url}" style="background-color: #1E7A50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Upload Evidence</a>
        ` : ''}
      </div>
    ` : ''}
  `;

  const html = baseEmailTemplate(content, variables.company_name as string, variables.unsubscribe_url as string);
  const text = stripHtml(html);

  return { subject, html, text };
}

/**
 * Evidence Reminder Template
 */
function evidenceReminderTemplate(variables: TemplateVariables): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = renderTemplate('📎 Evidence Required: {{obligation_title}}', variables);
  
  const content = `
    <h2 style="color: #026A67; margin-top: 0;">📎 Evidence Required</h2>
    <p>Hello,</p>
    <p>This obligation requires evidence submission:</p>
    <div style="background-color: white; border-left: 4px solid #026A67; padding: 15px; margin: 20px 0;">
      <strong>${variables.obligation_title || 'Obligation'}</strong><br>
      <span style="color: #6b7280;">Site: ${variables.site_name || 'N/A'}</span><br>
      ${variables.days_since_deadline ? `
        <span style="color: #6b7280;">Days Since Deadline: ${variables.days_since_deadline}</span><br>
      ` : ''}
      ${variables.grace_period_indicator ? `
        <span style="color: #CB7C00;">⚠️ Grace Period: ${variables.grace_period_days_remaining || 0} days remaining</span>
      ` : ''}
    </div>
    <p>Please upload and link the required evidence to this obligation.</p>
    ${variables.action_url ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${variables.action_url}" style="background-color: #026A67; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">View Obligation</a>
        ${variables.evidence_upload_url ? `
          <a href="${variables.evidence_upload_url}" style="background-color: #1E7A50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Upload Evidence</a>
        ` : ''}
      </div>
    ` : ''}
  `;

  const html = baseEmailTemplate(content, variables.company_name as string, variables.unsubscribe_url as string);
  const text = stripHtml(html);

  return { subject, html, text };
}

/**
 * Permit Renewal Reminder Template
 */
function permitRenewalReminderTemplate(variables: TemplateVariables): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = renderTemplate('🔄 Permit Renewal Due: {{permit_reference}} expires in {{days_until_expiry}} days', variables);
  
  const content = `
    <h2 style="color: #026A67; margin-top: 0;">🔄 Permit Renewal Due</h2>
    <p>Hello,</p>
    <p>A permit is approaching its expiry date and requires renewal:</p>
    <div style="background-color: white; border-left: 4px solid #026A67; padding: 15px; margin: 20px 0;">
      <strong>Permit Reference: ${variables.permit_reference || 'N/A'}</strong><br>
      <span style="color: #6b7280;">Site: ${variables.site_name || 'N/A'}</span><br>
      <span style="color: #6b7280;">Expiry Date: ${variables.expiry_date || 'N/A'}</span><br>
      <span style="color: #CB7C00;"><strong>Days Until Expiry: ${variables.days_until_expiry || 0}</strong></span>
    </div>
    <p>Please initiate the renewal process to avoid compliance issues.</p>
    ${variables.action_url ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${variables.action_url}" style="background-color: #026A67; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Permit</a>
      </div>
    ` : ''}
  `;

  const html = baseEmailTemplate(content, variables.company_name as string, variables.unsubscribe_url as string);
  const text = stripHtml(html);

  return { subject, html, text };
}

/**
 * Escalation Template
 */
function escalationTemplate(variables: TemplateVariables): {
  subject: string;
  html: string;
  text: string;
} {
  const levelLabel = variables.escalation_level === 3 
    ? 'Managing Director' 
    : variables.escalation_level === 2 
    ? 'Compliance Manager' 
    : 'Site Manager';
  
  const subject = renderTemplate('Escalated: {{obligation_title}} - {{escalation_level}}', {
    ...variables,
    escalation_level: levelLabel,
  });
  
  const content = `
    <h2 style="color: #B13434; margin-top: 0;">⚠️ Escalated Obligation</h2>
    <p>Hello,</p>
    <p><strong>This obligation has been escalated to your attention (${levelLabel}):</strong></p>
    <div style="background-color: white; border-left: 4px solid #B13434; padding: 15px; margin: 20px 0;">
      <strong>${variables.obligation_title || 'Obligation'}</strong><br>
      <span style="color: #6b7280;">Site: ${variables.site_name || 'N/A'}</span><br>
      <span style="color: #B13434;"><strong>Escalation Level: ${levelLabel}</strong></span><br>
      ${variables.escalation_reason ? `
        <span style="color: #6b7280;">Reason: ${variables.escalation_reason}</span>
      ` : ''}
    </div>
    <p>This obligation requires immediate attention. Please review and take appropriate action.</p>
    ${variables.action_url ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${variables.action_url}" style="background-color: #B13434; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Obligation</a>
      </div>
    ` : ''}
  `;

  const html = baseEmailTemplate(content, variables.company_name as string);
  const text = stripHtml(html);

  return { subject, html, text };
}

/**
 * Pack Ready Template
 */
function packReadyTemplate(
  packType: string,
  variables: TemplateVariables
): { subject: string; html: string; text: string } {
  const packLabels: Record<string, string> = {
    AUDIT_PACK_READY: 'Audit Pack',
    REGULATOR_PACK_READY: 'Regulator Pack',
    TENDER_PACK_READY: 'Tender Pack',
    BOARD_PACK_READY: 'Board Pack',
    INSURER_PACK_READY: 'Insurer Pack',
  };

  const packLabel = packLabels[packType] || 'Pack';
  const subject = renderTemplate(`✅ ${packLabel} Ready: {{pack_name}}`, variables);
  
  const content = `
    <h2 style="color: #1E7A50; margin-top: 0;">✅ ${packLabel} Ready</h2>
    <p>Hello,</p>
    <p>Your ${packLabel.toLowerCase()} has been generated and is ready for download:</p>
    <div style="background-color: white; border-left: 4px solid #1E7A50; padding: 15px; margin: 20px 0;">
      <strong>${variables.pack_name || 'Pack'}</strong><br>
      ${variables.site_name ? `<span style="color: #6b7280;">Site: ${variables.site_name}</span><br>` : ''}
      ${variables.generation_date ? `<span style="color: #6b7280;">Generated: ${variables.generation_date}</span>` : ''}
    </div>
    ${variables.download_url ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${variables.download_url}" style="background-color: #1E7A50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Download Pack</a>
      </div>
    ` : ''}
  `;

  const html = baseEmailTemplate(content, variables.company_name as string);
  const text = stripHtml(html);

  return { subject, html, text };
}

/**
 * Pack Distributed Template
 */
function packDistributedTemplate(variables: TemplateVariables): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = renderTemplate('📤 Pack Distributed: {{pack_name}}', variables);
  
  const content = `
    <h2 style="color: #026A67; margin-top: 0;">📤 Pack Distributed</h2>
    <p>Hello,</p>
    <p>You have been sent a compliance pack:</p>
    <div style="background-color: white; border-left: 4px solid #026A67; padding: 15px; margin: 20px 0;">
      <strong>${variables.pack_name || 'Pack'}</strong><br>
      ${variables.distribution_method ? `<span style="color: #6b7280;">Distribution Method: ${variables.distribution_method}</span>` : ''}
    </div>
    ${variables.download_url ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${variables.download_url}" style="background-color: #026A67; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Download Pack</a>
      </div>
    ` : ''}
  `;

  const html = baseEmailTemplate(content, variables.company_name as string);
  const text = stripHtml(html);

  return { subject, html, text };
}

/**
 * Default Template
 */
function defaultTemplate(subject: string, bodyText: string): {
  subject: string;
  html: string;
  text: string;
} {
  const content = `
    <h2 style="color: #026A67; margin-top: 0;">${subject}</h2>
    <p>${bodyText}</p>
  `;

  const html = baseEmailTemplate(content);
  const text = stripHtml(html);

  return { subject, html, text };
}

