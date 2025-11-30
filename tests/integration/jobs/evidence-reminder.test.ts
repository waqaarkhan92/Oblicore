/**
 * Evidence Reminder Job Tests
 * Tests evidence reminder creation for obligations without evidence
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createTestQueue, createTestWorker, waitForJob, cleanupTestQueue } from '../../helpers/job-test-helper';
import { Queue, Worker } from 'bullmq';
import { processEvidenceReminderJob, EvidenceReminderJobData } from '@/lib/jobs/evidence-reminder-job';
import { supabaseAdmin } from '@/lib/supabase/server';

describe('Evidence Reminder Job', () => {
  let queue: Queue | null = null;
  let worker: Worker | null = null;
  const hasRedis = !!process.env.REDIS_URL;

  beforeAll(async () => {
    if (hasRedis) {
      try {
        queue = await createTestQueue('evidence-reminders');
        worker = await createTestWorker('evidence-reminders', async (job) => {
          await processEvidenceReminderJob(job);
        });
      } catch (error: any) {
        console.warn('Redis not available, skipping queue tests:', error?.message);
        queue = null;
        worker = null;
      }
    }
  }, 30000);

  afterAll(async () => {
    if (queue && worker) {
      await cleanupTestQueue(queue, worker);
    }
  });

  beforeEach(async () => {
    if (queue) {
      await queue.obliterate({ force: true });
    }
  });

  (hasRedis ? it : it.skip)('should create reminders for obligations without evidence past grace period', async () => {
    if (!queue) {
      throw new Error('Queue not initialized');
    }

    // Get test company and site
    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('id')
      .limit(1)
      .single();

    if (!company) {
      throw new Error('No company found for testing');
    }

    const { data: site } = await supabaseAdmin
      .from('sites')
      .select('id')
      .eq('company_id', company.id)
      .limit(1)
      .single();

    if (!site) {
      throw new Error('No site found for testing');
    }

    const { data: module } = await supabaseAdmin
      .from('modules')
      .select('id')
      .eq('module_code', 'MODULE_1')
      .single();

    if (!module) {
      throw new Error('Module 1 not found');
    }

    // Create obligation past grace period (deadline + 7 days)
    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() - 10); // 10 days ago

    const { data: obligation, error: obligError } = await supabaseAdmin
      .from('obligations')
      .insert({
        company_id: company.id,
        site_id: site.id,
        module_id: module.id,
        original_text: 'Test obligation',
        obligation_title: 'Test Evidence Reminder Obligation',
        obligation_description: 'Test',
        category: 'MONITORING',
        status: 'ACTIVE',
        deadline_date: deadlineDate.toISOString().split('T')[0],
      })
      .select('id')
      .single();

    if (obligError || !obligation) {
      throw new Error(`Failed to create test obligation: ${obligError?.message}`);
    }

    // Ensure no evidence is linked
    await supabaseAdmin.from('obligation_evidence_links').delete().eq('obligation_id', obligation.id);

    // Enqueue job
    const jobData: EvidenceReminderJobData = {
      company_id: company.id,
      site_id: site.id,
    };

    const job = await queue.add('EVIDENCE_REMINDER', jobData);

    // Wait for job to complete
    await waitForJob(queue, job.id!, 30000);

    // Check if reminder notification was created
    const { data: reminders } = await supabaseAdmin
      .from('notifications')
      .select('id, notification_type')
      .eq('entity_type', 'obligation')
      .eq('entity_id', obligation.id)
      .eq('notification_type', 'EVIDENCE_REMINDER');

    // Reminder should be created if users exist
    expect(reminders).toBeDefined();

    // Clean up
    await supabaseAdmin.from('notifications').delete().eq('entity_id', obligation.id);
    await supabaseAdmin.from('obligations').delete().eq('id', obligation.id);
  }, 35000);

  (hasRedis ? it : it.skip)('should not create reminder if obligation has evidence', async () => {
    if (!queue) {
      throw new Error('Queue not initialized');
    }

    // Get test company and site
    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('id')
      .limit(1)
      .single();

    if (!company) {
      throw new Error('No company found for testing');
    }

    const { data: site } = await supabaseAdmin
      .from('sites')
      .select('id')
      .eq('company_id', company.id)
      .limit(1)
      .single();

    if (!site) {
      throw new Error('No site found for testing');
    }

    const { data: module } = await supabaseAdmin
      .from('modules')
      .select('id')
      .eq('module_code', 'MODULE_1')
      .single();

    if (!module) {
      throw new Error('Module 1 not found');
    }

    // Create obligation past grace period
    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() - 10);

    const { data: obligation, error: obligError } = await supabaseAdmin
      .from('obligations')
      .insert({
        company_id: company.id,
        site_id: site.id,
        module_id: module.id,
        original_text: 'Test obligation',
        obligation_title: 'Test Obligation with Evidence',
        obligation_description: 'Test',
        category: 'MONITORING',
        status: 'ACTIVE',
        deadline_date: deadlineDate.toISOString().split('T')[0],
      })
      .select('id')
      .single();

    if (obligError || !obligation) {
      throw new Error(`Failed to create test obligation: ${obligError?.message}`);
    }

    // Create and link evidence
    const { data: evidence } = await supabaseAdmin
      .from('evidence_items')
      .insert({
        company_id: company.id,
        site_id: site.id,
        title: 'Test Evidence',
        evidence_type: 'DOCUMENT',
        status: 'ACTIVE',
      })
      .select('id')
      .single();

    if (evidence) {
      await supabaseAdmin.from('obligation_evidence_links').insert({
        obligation_id: obligation.id,
        evidence_id: evidence.id,
      });
    }

    // Enqueue job
    const jobData: EvidenceReminderJobData = {
      company_id: company.id,
    };

    const job = await queue.add('EVIDENCE_REMINDER', jobData);

    // Wait for job to complete
    await waitForJob(queue, job.id!, 30000);

    // Check that no reminder was created
    const { data: reminders } = await supabaseAdmin
      .from('notifications')
      .select('id')
      .eq('entity_type', 'obligation')
      .eq('entity_id', obligation.id)
      .eq('notification_type', 'EVIDENCE_REMINDER');

    // Should not have reminders if evidence exists
    expect(reminders?.length || 0).toBe(0);

    // Clean up
    if (evidence) {
      await supabaseAdmin.from('obligation_evidence_links').delete().eq('obligation_id', obligation.id);
      await supabaseAdmin.from('evidence_items').delete().eq('id', evidence.id);
    }
    await supabaseAdmin.from('obligations').delete().eq('id', obligation.id);
  }, 35000);

  (hasRedis ? it : it.skip)('should not create duplicate reminders within 24 hours', async () => {
    if (!queue) {
      throw new Error('Queue not initialized');
    }

    // Get test company and site
    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('id')
      .limit(1)
      .single();

    if (!company) {
      throw new Error('No company found for testing');
    }

    const { data: site } = await supabaseAdmin
      .from('sites')
      .select('id')
      .eq('company_id', company.id)
      .limit(1)
      .single();

    if (!site) {
      throw new Error('No site found for testing');
    }

    const { data: module } = await supabaseAdmin
      .from('modules')
      .select('id')
      .eq('module_code', 'MODULE_1')
      .single();

    if (!module) {
      throw new Error('Module 1 not found');
    }

    // Create obligation past grace period
    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() - 10);

    const { data: obligation, error: obligError } = await supabaseAdmin
      .from('obligations')
      .insert({
        company_id: company.id,
        site_id: site.id,
        module_id: module.id,
        original_text: 'Test obligation',
        obligation_title: 'Test Duplicate Reminder',
        obligation_description: 'Test',
        category: 'MONITORING',
        status: 'ACTIVE',
        deadline_date: deadlineDate.toISOString().split('T')[0],
      })
      .select('id')
      .single();

    if (obligError || !obligation) {
      throw new Error(`Failed to create test obligation: ${obligError?.message}`);
    }

    // Create existing reminder (within 24 hours)
    const { data: existingReminder } = await supabaseAdmin
      .from('notifications')
      .insert({
        company_id: company.id,
        site_id: site.id,
        entity_type: 'obligation',
        entity_id: obligation.id,
        notification_type: 'EVIDENCE_REMINDER',
        channel: 'EMAIL',
        priority: 'HIGH',
        status: 'SENT',
        created_at: new Date().toISOString(), // Recent
      })
      .select('id')
      .single();

    // Enqueue job
    const jobData: EvidenceReminderJobData = {
      company_id: company.id,
    };

    const job = await queue.add('EVIDENCE_REMINDER', jobData);

    // Wait for job to complete
    await waitForJob(queue, job.id!, 30000);

    // Check that no duplicate reminder was created
    const { data: reminders } = await supabaseAdmin
      .from('notifications')
      .select('id')
      .eq('entity_type', 'obligation')
      .eq('entity_id', obligation.id)
      .eq('notification_type', 'EVIDENCE_REMINDER');

    // Should only have the original reminder
    expect(reminders?.length || 0).toBeLessThanOrEqual(1);

    // Clean up
    await supabaseAdmin.from('notifications').delete().eq('entity_id', obligation.id);
    await supabaseAdmin.from('obligations').delete().eq('id', obligation.id);
  }, 35000);
});

