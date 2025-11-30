/**
 * Escalation Service
 * Handles escalation chain logic for notifications
 * Reference: docs/specs/42_Backend_Notifications.md Section 4
 */

import { supabaseAdmin } from '@/lib/supabase/server';

export interface EscalationRecipient {
  userId: string;
  email: string;
  phone?: string;
  role: string;
  level: number;
}

export interface EscalationCheckResult {
  shouldEscalate: boolean;
  currentLevel: number;
  nextLevel: number | null;
  hoursSinceLastNotification: number;
  hasEvidence: boolean;
}

/**
 * Get escalation recipients for a given level
 */
export async function getEscalationRecipients(
  siteId: string,
  companyId: string,
  level: number
): Promise<EscalationRecipient[]> {
  const roleMap: Record<number, string[]> = {
    1: ['ADMIN', 'OWNER'], // Site Manager (site-level admin/owner)
    2: ['ADMIN', 'OWNER'], // Compliance Manager (company-level admin/owner)
    3: ['OWNER'], // MD (company owner only)
  };

  const roles = roleMap[level] || [];

  if (level === 1) {
    // Level 1: Site Manager (site-level admin/owner)
    const { data: recipients, error } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        email,
        phone,
        user_roles!inner(role)
      `)
      .eq('company_id', companyId)
      .in('user_roles.role', roles)
      .eq('is_active', true)
      .is('deleted_at', null)
      .limit(5);

    if (error) {
      console.error('Error fetching Level 1 recipients:', error);
      return [];
    }

    return (recipients || []).map((r: any) => ({
      userId: r.id,
      email: r.email,
      phone: r.phone,
      role: r.user_roles[0]?.role || 'ADMIN',
      level: 1,
    }));
  } else if (level === 2) {
    // Level 2: Compliance Manager (company-level admin/owner)
    const { data: recipients, error } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        email,
        phone,
        user_roles!inner(role)
      `)
      .eq('company_id', companyId)
      .in('user_roles.role', roles)
      .eq('is_active', true)
      .is('deleted_at', null)
      .limit(5);

    if (error) {
      console.error('Error fetching Level 2 recipients:', error);
      return [];
    }

    return (recipients || []).map((r: any) => ({
      userId: r.id,
      email: r.email,
      phone: r.phone,
      role: r.user_roles[0]?.role || 'ADMIN',
      level: 2,
    }));
  } else {
    // Level 3: MD (company owner only)
    const { data: recipients, error } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        email,
        phone,
        user_roles!inner(role)
      `)
      .eq('company_id', companyId)
      .eq('user_roles.role', 'OWNER')
      .eq('is_active', true)
      .is('deleted_at', null)
      .limit(5);

    if (error) {
      console.error('Error fetching Level 3 recipients:', error);
      return [];
    }

    return (recipients || []).map((r: any) => ({
      userId: r.id,
      email: r.email,
      phone: r.phone,
      role: 'OWNER',
      level: 3,
    }));
  }
}

/**
 * Check if obligation should be escalated
 */
export async function checkEscalation(
  obligationId: string,
  escalationLevel: number
): Promise<EscalationCheckResult> {
  // Get obligation with evidence and notification info
  const { data: obligation, error: obligationError } = await supabaseAdmin
    .from('obligations')
    .select(`
      id,
      status,
      deadline_date
    `)
    .eq('id', obligationId)
    .single();

  if (obligationError || !obligation) {
    return {
      shouldEscalate: false,
      currentLevel: escalationLevel,
      nextLevel: null,
      hoursSinceLastNotification: 0,
      hasEvidence: false,
    };
  }

  // Check if evidence was added
  const { data: evidenceLinks } = await supabaseAdmin
    .from('obligation_evidence_links')
    .select('id, created_at')
    .eq('obligation_id', obligationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1);

  const hasEvidence = (evidenceLinks || []).length > 0;
  const latestEvidenceDate = evidenceLinks?.[0]?.created_at
    ? new Date(evidenceLinks[0].created_at)
    : null;

  // Get latest notification for this escalation level
  const { data: notifications } = await supabaseAdmin
    .from('notifications')
    .select('created_at, escalation_level')
    .eq('entity_type', 'obligation')
    .eq('entity_id', obligationId)
    .eq('escalation_level', escalationLevel)
    .order('created_at', { ascending: false })
    .limit(1);

  const latestNotification = notifications?.[0];
  const latestNotificationDate = latestNotification?.created_at
    ? new Date(latestNotification.created_at)
    : null;

  // Check if evidence was added after last notification
  if (hasEvidence && latestEvidenceDate && latestNotificationDate) {
    if (latestEvidenceDate > latestNotificationDate) {
      // Evidence was added after notification - no escalation needed
      return {
        shouldEscalate: false,
        currentLevel: escalationLevel,
        nextLevel: null,
        hoursSinceLastNotification: 0,
        hasEvidence: true,
      };
    }
  }

  // Check if enough time has passed
  if (!latestNotificationDate) {
    // No notification yet - should create initial notification (Level 1)
    return {
      shouldEscalate: escalationLevel === 0, // Escalate if no level set yet
      currentLevel: escalationLevel || 0,
      nextLevel: escalationLevel === 0 ? 1 : null,
      hoursSinceLastNotification: 0,
      hasEvidence,
    };
  }

  const hoursSinceNotification =
    (Date.now() - latestNotificationDate.getTime()) / (1000 * 60 * 60);

  let shouldEscalate = false;
  let nextLevel: number | null = null;

  if (escalationLevel === 1 && hoursSinceNotification >= 24) {
    // Escalate to Level 2 after 24 hours
    shouldEscalate = true;
    nextLevel = 2;
  } else if (escalationLevel === 2 && hoursSinceNotification >= 48) {
    // Escalate to Level 3 after 48 hours
    shouldEscalate = true;
    nextLevel = 3;
  }

  return {
    shouldEscalate,
    currentLevel: escalationLevel,
    nextLevel,
    hoursSinceLastNotification: hoursSinceNotification,
    hasEvidence,
  };
}

/**
 * Create escalation notification
 */
export async function createEscalationNotification(
  obligationId: string,
  deadlineId: string | null,
  siteId: string,
  companyId: string,
  escalationLevel: number,
  originalNotificationId?: string
): Promise<string | null> {
  // Get escalation recipients
  const recipients = await getEscalationRecipients(siteId, companyId, escalationLevel);

  if (recipients.length === 0) {
    console.warn(`No recipients found for escalation level ${escalationLevel}`);
    return null;
  }

  // Get obligation details
  const { data: obligation } = await supabaseAdmin
    .from('obligations')
    .select('obligation_title, obligation_description, original_text, deadline_date')
    .eq('id', obligationId)
    .single();

  if (!obligation) {
    console.error(`Obligation not found: ${obligationId}`);
    return null;
  }

  // Get site details
  const { data: site } = await supabaseAdmin
    .from('sites')
    .select('name')
    .eq('id', siteId)
    .single();

  const levelLabels: Record<number, string> = {
    1: 'Site Manager',
    2: 'Compliance Manager',
    3: 'Managing Director',
  };

  const levelLabel = levelLabels[escalationLevel] || `Level ${escalationLevel}`;

  // Create notifications for each recipient
  const notifications = recipients.map((recipient) => ({
    user_id: recipient.userId,
    company_id: companyId,
    site_id: siteId,
    recipient_email: recipient.email,
    notification_type: 'ESCALATION',
    channel: 'EMAIL',
    priority: escalationLevel === 3 ? 'CRITICAL' : escalationLevel === 2 ? 'HIGH' : 'NORMAL',
    subject: `Escalated: ${obligation.obligation_title || 'Obligation'} - ${levelLabel}`,
    body_text: `This obligation has been escalated to your attention (${levelLabel}). The obligation "${obligation.obligation_title || obligation.obligation_description || obligation.original_text?.substring(0, 100) || 'Obligation'}" requires immediate attention.`,
    entity_type: 'obligation',
    entity_id: obligationId,
    is_escalation: true,
    escalation_level: escalationLevel,
    escalation_state: `ESCALATED_LEVEL_${escalationLevel}`,
    status: 'PENDING',
    scheduled_for: new Date().toISOString(),
    metadata: {
      original_notification_id: originalNotificationId,
      escalation_reason: `Escalated to ${levelLabel} after no action`,
      escalation_level: escalationLevel,
    },
  }));

  const { data: createdNotifications, error } = await supabaseAdmin
    .from('notifications')
    .insert(notifications)
    .select('id')
    .limit(1);

  if (error || !createdNotifications || createdNotifications.length === 0) {
    console.error('Error creating escalation notifications:', error);
    return null;
  }

  return createdNotifications[0].id;
}

