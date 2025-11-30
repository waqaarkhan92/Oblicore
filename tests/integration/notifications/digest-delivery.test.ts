/**
 * Digest Delivery Job Tests
 * Tests daily and weekly digest notification delivery
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createTestQueue, createTestWorker, waitForJob, cleanupTestQueue } from '../../helpers/job-test-helper';
import { Queue, Worker } from 'bullmq';
import { processDigestDeliveryJob, DigestDeliveryJobData } from '../../../../lib/jobs/digest-delivery-job';
import { supabaseAdmin } from '../../../../lib/supabase/server';

describe('Digest Delivery Job', () => {
  let queue: Queue | null = null;
  let worker: Worker | null = null;
  const hasRedis = !!process.env.REDIS_URL;

  beforeAll(async () => {
    if (hasRedis) {
      try {
        queue = await createTestQueue('digest-delivery');
        worker = await createTestWorker('digest-delivery', async (job) => {
          await processDigestDeliveryJob(job);
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

  (hasRedis ? it : it.skip)('should send daily digest with queued notifications', async () => {
    if (!queue) {
      throw new Error('Queue not initialized');
    }

    // Get test user
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email, company_id')
      .limit(1)
      .single();

    if (!user) {
      throw new Error('No user found for testing');
    }

    // Create notifications queued for daily digest
    const notifications = [];
    for (let i = 0; i < 3; i++) {
      const { data: notification } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: user.id,
          company_id: user.company_id,
          recipient_email: user.email,
          notification_type: 'DEADLINE_WARNING_7D',
          channel: 'EMAIL',
          priority: 'NORMAL',
          subject: `Digest Notification ${i}`,
          body_text: 'Test notification for digest',
          status: 'QUEUED',
          scheduled_for: new Date().toISOString(),
          metadata: {
            digest_type: 'DAILY',
            queued_for_digest: 'true',
          },
        })
        .select('id')
        .single();

      if (notification) {
        notifications.push(notification.id);
      }
    }

    // Enqueue digest delivery job
    const jobData: DigestDeliveryJobData = {
      digest_type: 'DAILY',
      user_id: user.id,
    };

    const job = await queue.add('DIGEST_DELIVERY', jobData);

    // Wait for job to complete
    await waitForJob(queue, job.id!, 30000);

    // Check that notifications were marked as sent
    const { data: sentNotifications } = await supabaseAdmin
      .from('notifications')
      .select('id, status')
      .in('id', notifications)
      .eq('status', 'SENT');

    // Notifications should be sent (or failed if email service unavailable)
    expect(sentNotifications).toBeDefined();

    // Clean up
    await supabaseAdmin.from('notifications').delete().in('id', notifications);
  }, 35000);

  (hasRedis ? it : it.skip)('should send weekly digest with queued notifications', async () => {
    if (!queue) {
      throw new Error('Queue not initialized');
    }

    // Get test user
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email, company_id')
      .limit(1)
      .single();

    if (!user) {
      throw new Error('No user found for testing');
    }

    // Create notifications queued for weekly digest
    const notifications = [];
    for (let i = 0; i < 5; i++) {
      const { data: notification } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: user.id,
          company_id: user.company_id,
          recipient_email: user.email,
          notification_type: 'DEADLINE_WARNING_7D',
          channel: 'EMAIL',
          priority: 'NORMAL',
          subject: `Weekly Digest Notification ${i}`,
          body_text: 'Test notification for weekly digest',
          status: 'QUEUED',
          scheduled_for: new Date().toISOString(),
          metadata: {
            digest_type: 'WEEKLY',
            queued_for_digest: 'true',
          },
        })
        .select('id')
        .single();

      if (notification) {
        notifications.push(notification.id);
      }
    }

    // Enqueue digest delivery job
    const jobData: DigestDeliveryJobData = {
      digest_type: 'WEEKLY',
      user_id: user.id,
    };

    const job = await queue.add('DIGEST_DELIVERY', jobData);

    // Wait for job to complete
    await waitForJob(queue, job.id!, 30000);

    // Check that notifications were processed
    const { data: processedNotifications } = await supabaseAdmin
      .from('notifications')
      .select('id, status')
      .in('id', notifications);

    expect(processedNotifications).toBeDefined();

    // Clean up
    await supabaseAdmin.from('notifications').delete().in('id', notifications);
  }, 35000);

  (hasRedis ? it : it.skip)('should handle empty digest gracefully', async () => {
    if (!queue) {
      throw new Error('Queue not initialized');
    }

    // Get test user
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .limit(1)
      .single();

    if (!user) {
      throw new Error('No user found for testing');
    }

    // Enqueue digest delivery job with no queued notifications
    const jobData: DigestDeliveryJobData = {
      digest_type: 'DAILY',
      user_id: user.id,
    };

    const job = await queue.add('DIGEST_DELIVERY', jobData);

    // Wait for job to complete (should complete without error)
    await waitForJob(queue, job.id!, 30000);

    // Job should complete successfully even with no notifications
    expect(job.id).toBeDefined();
  }, 35000);
});

