/**
 * Chain Break Detection Job
 * Scans consignment notes and chain of custody records for gaps and breaks
 * Creates alerts for missing evidence, expired licenses, and validation failures
 */

import { Job } from 'bullmq';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getAppUrl } from '@/lib/env';

export interface DetectChainBreaksJobData {
  company_id?: string; // Optional: process specific company only
}

interface ChainBreakAlert {
  consignment_note_id: string;
  company_id: string;
  site_id: string;
  alert_type: 'MISSING_EVIDENCE' | 'CONTRACTOR_NON_COMPLIANT' | 'CHAIN_GAP' | 'VALIDATION_FAILURE' | 'EXPIRED_LICENCE';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  metadata: Record<string, any>;
}

export async function processDetectChainBreaksJob(job: Job<DetectChainBreaksJobData>): Promise<void> {
  const { company_id } = job.data;

  console.log(`Starting chain break detection job${company_id ? ` for company ${company_id}` : ''}`);

  try {
    const alerts: ChainBreakAlert[] = [];

    // 1. Check for consignment notes without complete chain of custody
    const chainGapAlerts = await detectChainGaps(company_id);
    alerts.push(...chainGapAlerts);

    await job.updateProgress(25);

    // 2. Check for expired contractor licenses
    const expiredLicenseAlerts = await detectExpiredLicenses(company_id);
    alerts.push(...expiredLicenseAlerts);

    await job.updateProgress(50);

    // 3. Check for missing end-point proofs
    const missingProofAlerts = await detectMissingEndPointProofs(company_id);
    alerts.push(...missingProofAlerts);

    await job.updateProgress(75);

    // 4. Check for validation failures
    const validationAlerts = await detectValidationFailures(company_id);
    alerts.push(...validationAlerts);

    await job.updateProgress(90);

    // Create chain break alerts in the database
    if (alerts.length > 0) {
      await createChainBreakAlerts(alerts);
    }

    // Create notifications for high-severity alerts
    const highSeverityAlerts = alerts.filter(a => a.severity === 'HIGH');
    if (highSeverityAlerts.length > 0) {
      await createNotifications(highSeverityAlerts);
    }

    await job.updateProgress(100);

    console.log(`Chain break detection completed:
      - Chain gaps: ${chainGapAlerts.length}
      - Expired licenses: ${expiredLicenseAlerts.length}
      - Missing proofs: ${missingProofAlerts.length}
      - Validation failures: ${validationAlerts.length}
      - Total alerts: ${alerts.length}`);

  } catch (error: any) {
    console.error('Chain break detection job failed:', error);
    throw error;
  }
}

/**
 * Detect chain of custody gaps (missing steps in the chain)
 */
async function detectChainGaps(companyId?: string): Promise<ChainBreakAlert[]> {
  const alerts: ChainBreakAlert[] = [];

  // Get consignment notes that should have chain of custody entries
  let query = supabaseAdmin
    .from('consignment_notes')
    .select(`
      id,
      company_id,
      site_id,
      consignment_number,
      waste_stream_id,
      dispatch_date,
      status,
      chain_of_custody(
        id,
        step_type,
        step_date,
        completed
      )
    `)
    .in('status', ['DISPATCHED', 'IN_TRANSIT', 'DELIVERED'])
    .is('deleted_at', null);

  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  const { data: consignments, error } = await query;

  if (error) {
    console.error('Failed to fetch consignment notes:', error);
    return alerts;
  }

  for (const consignment of consignments || []) {
    const chain = consignment.chain_of_custody as any[] || [];
    const expectedSteps = ['GENERATION', 'CARRIER', 'DESTINATION'];

    // Check for missing steps
    const completedSteps = chain.filter(c => c.completed).map(c => c.step_type);
    const missingSteps = expectedSteps.filter(step => !completedSteps.includes(step));

    if (missingSteps.length > 0 && consignment.status !== 'DISPATCHED') {
      // Only alert if the consignment has moved past dispatch
      const daysSinceDispatch = consignment.dispatch_date
        ? Math.floor((Date.now() - new Date(consignment.dispatch_date).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // Alert if >7 days since dispatch and chain incomplete
      if (daysSinceDispatch > 7) {
        alerts.push({
          consignment_note_id: consignment.id,
          company_id: consignment.company_id,
          site_id: consignment.site_id,
          alert_type: 'CHAIN_GAP',
          severity: daysSinceDispatch > 30 ? 'HIGH' : 'MEDIUM',
          description: `Chain of custody incomplete for consignment ${consignment.consignment_number}. Missing steps: ${missingSteps.join(', ')}`,
          metadata: {
            consignment_number: consignment.consignment_number,
            missing_steps: missingSteps,
            days_since_dispatch: daysSinceDispatch,
          },
        });
      }
    }
  }

  return alerts;
}

/**
 * Detect expired contractor licenses
 */
async function detectExpiredLicenses(companyId?: string): Promise<ChainBreakAlert[]> {
  const alerts: ChainBreakAlert[] = [];
  const now = new Date().toISOString();

  // Get expired licenses
  let query = supabaseAdmin
    .from('contractor_licences')
    .select(`
      id,
      company_id,
      contractor_name,
      licence_number,
      licence_type,
      expiry_date,
      site_id
    `)
    .lt('expiry_date', now)
    .is('deleted_at', null);

  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  const { data: expiredLicenses, error } = await query;

  if (error) {
    console.error('Failed to fetch expired licenses:', error);
    return alerts;
  }

  // Get consignment notes that used these expired licenses
  for (const license of expiredLicenses || []) {
    // Check if any recent consignments used this contractor
    const { data: recentConsignments } = await supabaseAdmin
      .from('consignment_notes')
      .select('id, consignment_number, dispatch_date')
      .eq('contractor_id', license.id)
      .gte('dispatch_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()) // Last 90 days
      .limit(1);

    if (recentConsignments && recentConsignments.length > 0) {
      alerts.push({
        consignment_note_id: recentConsignments[0].id,
        company_id: license.company_id,
        site_id: license.site_id || '',
        alert_type: 'EXPIRED_LICENCE',
        severity: 'HIGH',
        description: `Contractor ${license.contractor_name} has an expired ${license.licence_type} license (${license.licence_number}). License expired on ${new Date(license.expiry_date).toLocaleDateString('en-GB')}.`,
        metadata: {
          contractor_name: license.contractor_name,
          licence_number: license.licence_number,
          licence_type: license.licence_type,
          expiry_date: license.expiry_date,
          recent_consignment: recentConsignments[0].consignment_number,
        },
      });
    }
  }

  return alerts;
}

/**
 * Detect missing end-point proofs for completed consignments
 */
async function detectMissingEndPointProofs(companyId?: string): Promise<ChainBreakAlert[]> {
  const alerts: ChainBreakAlert[] = [];

  // Get delivered consignments without end-point proofs
  let query = supabaseAdmin
    .from('consignment_notes')
    .select(`
      id,
      company_id,
      site_id,
      consignment_number,
      dispatch_date,
      delivery_date,
      end_point_proofs(id)
    `)
    .eq('status', 'DELIVERED')
    .is('deleted_at', null);

  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  const { data: consignments, error } = await query;

  if (error) {
    console.error('Failed to fetch delivered consignments:', error);
    return alerts;
  }

  for (const consignment of consignments || []) {
    const proofs = consignment.end_point_proofs as any[] || [];

    if (proofs.length === 0) {
      const daysSinceDelivery = consignment.delivery_date
        ? Math.floor((Date.now() - new Date(consignment.delivery_date).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // Alert if >30 days since delivery and no proof
      if (daysSinceDelivery > 30) {
        alerts.push({
          consignment_note_id: consignment.id,
          company_id: consignment.company_id,
          site_id: consignment.site_id,
          alert_type: 'MISSING_EVIDENCE',
          severity: daysSinceDelivery > 60 ? 'HIGH' : 'MEDIUM',
          description: `End-point proof missing for consignment ${consignment.consignment_number}. Delivered ${daysSinceDelivery} days ago.`,
          metadata: {
            consignment_number: consignment.consignment_number,
            delivery_date: consignment.delivery_date,
            days_since_delivery: daysSinceDelivery,
          },
        });
      }
    }
  }

  return alerts;
}

/**
 * Detect consignments with validation failures
 */
async function detectValidationFailures(companyId?: string): Promise<ChainBreakAlert[]> {
  const alerts: ChainBreakAlert[] = [];

  // Get consignments with failed validation
  let query = supabaseAdmin
    .from('consignment_notes')
    .select(`
      id,
      company_id,
      site_id,
      consignment_number,
      pre_validation_status,
      validation_executions(
        id,
        rule_type,
        result,
        error_message,
        executed_at
      )
    `)
    .eq('pre_validation_status', 'FAILED')
    .is('deleted_at', null);

  if (companyId) {
    query = query.eq('company_id', companyId);
  }

  const { data: consignments, error } = await query;

  if (error) {
    console.error('Failed to fetch failed validations:', error);
    return alerts;
  }

  for (const consignment of consignments || []) {
    const executions = consignment.validation_executions as any[] || [];
    const failedRules = executions.filter(e => e.result === 'FAILED');

    if (failedRules.length > 0) {
      alerts.push({
        consignment_note_id: consignment.id,
        company_id: consignment.company_id,
        site_id: consignment.site_id,
        alert_type: 'VALIDATION_FAILURE',
        severity: 'MEDIUM',
        description: `Consignment ${consignment.consignment_number} failed ${failedRules.length} validation rule(s): ${failedRules.map(r => r.rule_type).join(', ')}`,
        metadata: {
          consignment_number: consignment.consignment_number,
          failed_rules: failedRules.map(r => ({
            rule_type: r.rule_type,
            error_message: r.error_message,
          })),
        },
      });
    }
  }

  return alerts;
}

/**
 * Create chain break alerts in the database
 */
async function createChainBreakAlerts(alerts: ChainBreakAlert[]): Promise<void> {
  const alertRecords = alerts.map(alert => ({
    consignment_note_id: alert.consignment_note_id,
    company_id: alert.company_id,
    site_id: alert.site_id || null,
    alert_type: alert.alert_type,
    severity: alert.severity,
    description: alert.description,
    metadata: alert.metadata,
    status: 'OPEN',
    detected_at: new Date().toISOString(),
  }));

  // Upsert to avoid duplicates
  for (const record of alertRecords) {
    const { error } = await supabaseAdmin
      .from('chain_break_alerts')
      .upsert(record, {
        onConflict: 'consignment_note_id,alert_type',
        ignoreDuplicates: false,
      });

    if (error) {
      console.error('Failed to create chain break alert:', error);
    }
  }
}

/**
 * Create notifications for high-severity alerts
 */
async function createNotifications(alerts: ChainBreakAlert[]): Promise<void> {
  const baseUrl = getAppUrl();

  // Group alerts by company
  const byCompany = new Map<string, ChainBreakAlert[]>();
  for (const alert of alerts) {
    const existing = byCompany.get(alert.company_id) || [];
    existing.push(alert);
    byCompany.set(alert.company_id, existing);
  }

  for (const [companyId, companyAlerts] of byCompany) {
    // Get admin users
    const { data: adminUserRoles } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('company_id', companyId)
      .in('role', ['OWNER', 'ADMIN']);

    const adminUserIds = adminUserRoles?.map(r => r.user_id) || [];
    if (adminUserIds.length === 0) continue;

    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .in('id', adminUserIds)
      .eq('is_active', true);

    if (!users || users.length === 0) continue;

    // Create summary notification
    const notifications = users.map(user => ({
      user_id: user.id,
      company_id: companyId,
      recipient_email: user.email,
      notification_type: 'SYSTEM_ALERT',
      channel: 'EMAIL',
      priority: 'HIGH',
      subject: `Chain of Custody Alert: ${companyAlerts.length} issue(s) detected`,
      body_text: companyAlerts.map(a => `- ${a.description}`).join('\n'),
      action_url: `${baseUrl}/dashboard/module-4/chain-break-alerts`,
      entity_type: 'chain_break_alert',
      status: 'PENDING',
      scheduled_for: new Date().toISOString(),
    }));

    const { error } = await supabaseAdmin.from('notifications').insert(notifications);
    if (error) {
      console.error('Failed to create chain break notifications:', error);
    }
  }
}
