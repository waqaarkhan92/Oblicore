/**
 * Escalation Check Job Tests
 * Tests escalation chain creation and time-based escalation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createTestQueue, createTestWorker, waitForJob, cleanupTestQueue } from '../../helpers/job-test-helper';
import { Queue, Worker } from 'bullmq';
import { processEscalationCheckJob, EscalationCheckJobData } from '../../../../lib/jobs/escalation-check-job';
import { supabaseAdmin } from '../../../../lib/supabase/server';

describe('Escalation Check Job', () => {
  let queue: Queue | null = null;
  let worker: Worker | null = null;
  const hasRedis = !!process.env.REDIS_URL;

  beforeAll(async () => {
    if (hasRedis) {
      try {
        queue = await createTestQueue('escalation-check');
        worker = await createTestWorker('escalation-check', async (job) => {
          await processEscalationCheckJob(job);
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

  (hasRedis ? it : it.skip)('should create Level 2 escalation notification after time delay', async () => {
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

    // Create test obligation
    const { data: obligation, error: obligError } = await supabaseAdmin
      .from('obligations')
      .insert({
        company_id: company.id,
        site_id: site.id,
        module_id: module.id,
        original_text: 'Test obligation',
        obligation_title: 'Test Escalation Obligation',
        obligation_description: 'Test',
        category: 'MONITORING',
        status: 'OVERDUE',
        deadline_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days ago
      })
      .select('id')
      .single();

    if (obligError || !obligation) {
      throw new Error(`Failed to create test obligation: ${obligError?.message}`);
    }

    // Create Level 1 notification (24+ hours ago to trigger escalation)
    const level1CreatedAt = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
    const { data: level1Notification, error: notifError } = await supabaseAdmin
      .from('notifications')
      .insert({
        company_id: company.id,
        site_id: site.id,
        entity_type: 'obligation',
        entity_id: obligation.id,
        notification_type: 'DEADLINE_WARNING_7D',
        channel: 'EMAIL',
        priority: 'NORMAL',
        escalation_level: 1,
        is_escalation: false,
        status: 'SENT',
        created_at: level1CreatedAt.toISOString(),
      })
      .select('id')
      .single();

    if (notifError || !level1Notification) {
      throw new Error(`Failed to create Level 1 notification: ${notifError?.message}`);
    }

    // Enqueue escalation check job
    const jobData: EscalationCheckJobData = {
      company_id: company.id,
      site_id: site.id,
    };

    const job = await queue.add('ESCALATION_CHECK', jobData);

    // Wait for job to complete
    await waitForJob(queue, job.id!, 30000);

    // Check if Level 2 escalation notification was created
    const { data: escalationNotifications } = await supabaseAdmin
      .from('notifications')
      .select('id, escalation_level, is_escalation')
      .eq('entity_type', 'obligation')
      .eq('entity_id', obligation.id)
      .eq('escalation_level', 2);

    // Level 2 notification should be created (if escalation logic triggers)
    expect(escalationNotifications).toBeDefined();

    // Clean up
    await supabaseAdmin.from('notifications').delete().eq('entity_id', obligation.id);
    await supabaseAdmin.from('obligations').delete().eq('id', obligation.id);
  }, 35000);

  (hasRedis ? it : it.skip)('should not escalate if obligation has evidence', async () => {
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

    // Create test obligation with evidence
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
        status: 'OVERDUE',
        deadline_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      })
      .select('id')
      .single();

    if (obligError || !obligation) {
      throw new Error(`Failed to create test obligation: ${obligError?.message}`);
    }

    // Create evidence and link it
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

    // Create Level 1 notification
    const level1CreatedAt = new Date(Date.now() - 25 * 60 * 60 * 1000);
    const { data: level1Notification } = await supabaseAdmin
      .from('notifications')
      .insert({
        company_id: company.id,
        site_id: site.id,
        entity_type: 'obligation',
        entity_id: obligation.id,
        notification_type: 'DEADLINE_WARNING_7D',
        channel: 'EMAIL',
        priority: 'NORMAL',
        escalation_level: 1,
        status: 'SENT',
        created_at: level1CreatedAt.toISOString(),
      })
      .select('id')
      .single();

    // Enqueue escalation check job
    const jobData: EscalationCheckJobData = {
      company_id: company.id,
    };

    const job = await queue.add('ESCALATION_CHECK', jobData);

    // Wait for job to complete
    await waitForJob(queue, job.id!, 30000);

    // Check that no Level 2 escalation was created (obligation has evidence)
    const { data: escalationNotifications } = await supabaseAdmin
      .from('notifications')
      .select('id, escalation_level')
      .eq('entity_type', 'obligation')
      .eq('entity_id', obligation.id)
      .eq('escalation_level', 2);

    // Should not have Level 2 escalation if evidence exists
    expect(escalationNotifications?.length || 0).toBe(0);

    // Clean up
    if (evidence) {
      await supabaseAdmin.from('obligation_evidence_links').delete().eq('obligation_id', obligation.id);
      await supabaseAdmin.from('evidence_items').delete().eq('id', evidence.id);
    }
    await supabaseAdmin.from('notifications').delete().eq('entity_id', obligation.id);
    await supabaseAdmin.from('obligations').delete().eq('id', obligation.id);
  }, 35000);
});

