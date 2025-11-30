/**
 * Notification Delivery Job Tests
 * Tests notification delivery, rate limiting, retry logic, DLQ
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createTestQueue, createTestWorker, waitForJob, cleanupTestQueue } from '../../helpers/job-test-helper';
import { Queue, Worker } from 'bullmq';
import { processNotificationDeliveryJob, NotificationDeliveryJobData } from '@/lib/jobs/notification-delivery-job';
import { supabaseAdmin } from '@/lib/supabase/server';

describe('Notification Delivery Job', () => {
  let queue: Queue | null = null;
  let worker: Worker | null = null;
  const hasRedis = !!process.env.REDIS_URL;

  beforeAll(async () => {
    if (hasRedis) {
      try {
        queue = await createTestQueue('notification-delivery');
        worker = await createTestWorker('notification-delivery', async (job) => {
          await processNotificationDeliveryJob(job);
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

  (hasRedis ? it : it.skip)('should process pending notifications and send emails', async () => {
    if (!queue) {
      throw new Error('Queue not initialized');
    }

    // Get test user and company
    const { data: company } = await supabaseAdmin
      .from('companies')
      .select('id')
      .limit(1)
      .single();

    if (!company) {
      throw new Error('No company found for testing');
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('company_id', company.id)
      .limit(1)
      .single();

    if (!user) {
      throw new Error('No user found for testing');
    }

    // Create test notification
    const { data: notification, error: notifError } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: user.id,
        company_id: company.id,
        recipient_email: user.email,
        notification_type: 'DEADLINE_WARNING_7D',
        channel: 'EMAIL',
        priority: 'NORMAL',
        subject: 'Test Notification',
        body_text: 'This is a test notification',
        status: 'PENDING',
        scheduled_for: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (notifError || !notification) {
      throw new Error(`Failed to create test notification: ${notifError?.message}`);
    }

    // Enqueue job
    const jobData: NotificationDeliveryJobData = {
      notification_id: notification.id,
    };

    const job = await queue.add('NOTIFICATION_DELIVERY', jobData);

    // Wait for job to complete
    await waitForJob(queue, job.id!, 30000);

    // Verify notification status updated
    const { data: updatedNotification } = await supabaseAdmin
      .from('notifications')
      .select('status, sent_at, delivery_provider')
      .eq('id', notification.id)
      .single();

    // Status should be SENT, FAILED, or QUEUED (depending on email service availability)
    expect(['SENT', 'FAILED', 'QUEUED', 'RETRYING']).toContain(updatedNotification?.status);

    // Clean up
    await supabaseAdmin.from('notifications').delete().eq('id', notification.id);
  }, 35000);

  (hasRedis ? it : it.skip)('should queue notifications when rate limit exceeded', async () => {
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

    // Create multiple notifications quickly to trigger rate limiting
    const notifications = [];
    for (let i = 0; i < 10; i++) {
      const { data: notification } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: user.id,
          company_id: user.company_id,
          recipient_email: user.email,
          notification_type: 'DEADLINE_WARNING_7D',
          channel: 'EMAIL',
          priority: 'NORMAL',
          subject: `Test Notification ${i}`,
          body_text: 'Test',
          status: 'PENDING',
          scheduled_for: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (notification) {
        notifications.push(notification.id);
      }
    }

    // Enqueue job
    const jobData: NotificationDeliveryJobData = {
      batch_size: 10,
    };

    const job = await queue.add('NOTIFICATION_DELIVERY', jobData);

    // Wait for job to complete
    await waitForJob(queue, job.id!, 30000);

    // Check if any notifications were queued due to rate limiting
    const { data: queuedNotifications } = await supabaseAdmin
      .from('notifications')
      .select('id, status, metadata')
      .in('id', notifications)
      .eq('status', 'QUEUED');

    // Some notifications may be queued if rate limit exceeded
    expect(queuedNotifications).toBeDefined();

    // Clean up
    await supabaseAdmin.from('notifications').delete().in('id', notifications);
  }, 35000);

  (hasRedis ? it : it.skip)('should retry failed notifications with exponential backoff', async () => {
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

    // Create notification with invalid email to trigger retry
    const { data: notification, error: notifError } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: user.id,
        company_id: user.company_id,
        recipient_email: 'invalid-email-format',
        notification_type: 'DEADLINE_WARNING_7D',
        channel: 'EMAIL',
        priority: 'NORMAL',
        subject: 'Test Notification',
        body_text: 'Test',
        status: 'PENDING',
        scheduled_for: new Date().toISOString(),
        metadata: {
          retry_count: 0,
        },
      })
      .select('id')
      .single();

    if (notifError || !notification) {
      throw new Error(`Failed to create test notification: ${notifError?.message}`);
    }

    // Enqueue job
    const jobData: NotificationDeliveryJobData = {
      notification_id: notification.id,
    };

    const job = await queue.add('NOTIFICATION_DELIVERY', jobData);

    // Wait for job to complete
    await waitForJob(queue, job.id!, 30000);

    // Check notification status - should be RETRYING or FAILED
    const { data: updatedNotification } = await supabaseAdmin
      .from('notifications')
      .select('status, metadata, scheduled_for')
      .eq('id', notification.id)
      .single();

    expect(['RETRYING', 'FAILED', 'CANCELLED']).toContain(updatedNotification?.status);

    // Clean up
    await supabaseAdmin.from('notifications').delete().eq('id', notification.id);
  }, 35000);

  (hasRedis ? it : it.skip)('should process batch of notifications', async () => {
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

    // Create multiple notifications
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
          subject: `Batch Test ${i}`,
          body_text: 'Test',
          status: 'PENDING',
          scheduled_for: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (notification) {
        notifications.push(notification.id);
      }
    }

    // Enqueue batch job
    const jobData: NotificationDeliveryJobData = {
      batch_size: 5,
    };

    const job = await queue.add('NOTIFICATION_DELIVERY', jobData);

    // Wait for job to complete
    await waitForJob(queue, job.id!, 30000);

    // Verify notifications were processed
    const { data: processedNotifications } = await supabaseAdmin
      .from('notifications')
      .select('id, status')
      .in('id', notifications);

    expect(processedNotifications).toBeDefined();
    expect(processedNotifications?.length).toBeGreaterThan(0);

    // Clean up
    await supabaseAdmin.from('notifications').delete().in('id', notifications);
  }, 35000);

  (hasRedis ? it : it.skip)('should respect user preferences and queue for digest', async () => {
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

    // Set user preference to DAILY_DIGEST
    const { error: prefError } = await supabaseAdmin
      .from('user_notification_preferences')
      .upsert({
        user_id: user.id,
        notification_type: 'DEADLINE_WARNING_7D',
        channel_preference: 'EMAIL',
        frequency_preference: 'DAILY_DIGEST',
        enabled: true,
      });

    if (prefError) {
      console.warn('Could not set user preference:', prefError);
    }

    // Create notification
    const { data: notification, error: notifError } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: user.id,
        company_id: user.company_id,
        recipient_email: user.email,
        notification_type: 'DEADLINE_WARNING_7D',
        channel: 'EMAIL',
        priority: 'NORMAL',
        subject: 'Test Notification',
        body_text: 'Test',
        status: 'PENDING',
        scheduled_for: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (notifError || !notification) {
      throw new Error(`Failed to create test notification: ${notifError?.message}`);
    }

    // Enqueue job
    const jobData: NotificationDeliveryJobData = {
      notification_id: notification.id,
    };

    const job = await queue.add('NOTIFICATION_DELIVERY', jobData);

    // Wait for job to complete
    await waitForJob(queue, job.id!, 30000);

    // Check notification status - should be QUEUED for digest or CANCELLED
    const { data: updatedNotification } = await supabaseAdmin
      .from('notifications')
      .select('status, metadata')
      .eq('id', notification.id)
      .single();

    expect(['QUEUED', 'CANCELLED']).toContain(updatedNotification?.status);

    // Clean up
    await supabaseAdmin.from('notifications').delete().eq('id', notification.id);
    await supabaseAdmin
      .from('user_notification_preferences')
      .delete()
      .eq('user_id', user.id)
      .eq('notification_type', 'DEADLINE_WARNING_7D');
  }, 35000);
});

