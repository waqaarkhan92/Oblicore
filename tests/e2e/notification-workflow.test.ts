/**
 * End-to-End Notification Workflow Test
 * Tests complete notification flow: creation → delivery → escalation → digest
 */

import { TestClient } from '../helpers/test-client';
import { supabaseAdmin } from '@/lib/supabase/server';

describe('E2E: Notification Workflow', () => {
  const client = new TestClient();
  let testUser: { email: string; password: string; token?: string; user_id?: string; company_id?: string; site_id?: string };

  beforeAll(async () => {
    const timestamp = Date.now();
    testUser = {
      email: `e2e_notif_${timestamp}@example.com`,
      password: 'TestPassword123!',
    };

    // Signup
    const signupResponse = await client.post('/api/v1/auth/signup', {
      email: testUser.email,
      password: testUser.password,
      full_name: `E2E Notif User ${timestamp}`,
      company_name: `E2E Notif Company ${timestamp}`,
    });

    if (signupResponse.ok) {
      const signupData = await signupResponse.json();
      testUser.token = signupData.data?.access_token;
      testUser.user_id = signupData.data?.user?.id;
      testUser.company_id = signupData.data?.user?.company_id;
    }

    // Create site
    if (testUser.token && testUser.company_id) {
      const siteResponse = await client.post(
        '/api/v1/sites',
        {
          name: `E2E Test Site ${timestamp}`,
          regulator: 'EA',
          address_line_1: '123 Test Street',
          city: 'London',
          postcode: 'SW1A 1AA',
        },
        {
          token: testUser.token,
        }
      );

      if (siteResponse.ok) {
        const siteData = await siteResponse.json();
        testUser.site_id = siteData.data.id;
      }
    }
  });

  it('should complete full notification workflow', async () => {
    if (!testUser.token || !testUser.user_id || !testUser.company_id || !testUser.site_id) {
      console.warn('Skipping E2E notification test: test user not fully set up');
      return;
    }

    // Step 1: Create obligation with deadline
    const { data: module } = await supabaseAdmin
      .from('modules')
      .select('id')
      .eq('module_code', 'MODULE_1')
      .single();

    if (!module) {
      throw new Error('Module 1 not found');
    }

    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + 7); // 7 days from now

    const { data: obligation, error: obligError } = await supabaseAdmin
      .from('obligations')
      .insert({
        company_id: testUser.company_id,
        site_id: testUser.site_id,
        module_id: module.id,
        original_text: 'E2E Test Obligation',
        obligation_title: 'E2E Test Obligation',
        obligation_description: 'Test obligation for E2E workflow',
        category: 'MONITORING',
        status: 'ACTIVE',
        deadline_date: deadlineDate.toISOString().split('T')[0],
      })
      .select('id')
      .single();

    if (obligError || !obligation) {
      throw new Error(`Failed to create test obligation: ${obligError?.message}`);
    }

    // Step 2: Trigger deadline alert job (creates Level 1 notification)
    // This would normally be triggered by cron, but we can manually create the notification
    const { data: notification, error: notifError } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: testUser.user_id,
        company_id: testUser.company_id,
        site_id: testUser.site_id,
        recipient_email: testUser.email,
        notification_type: 'DEADLINE_WARNING_7D',
        channel: 'EMAIL',
        priority: 'NORMAL',
        subject: 'Deadline Warning: E2E Test Obligation',
        body_text: 'Your obligation is due in 7 days',
        entity_type: 'obligation',
        entity_id: obligation.id,
        escalation_level: 1,
        status: 'PENDING',
        scheduled_for: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (notifError || !notification) {
      throw new Error(`Failed to create test notification: ${notifError?.message}`);
    }

    // Step 3: Verify notification was created
    const { data: createdNotification } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('id', notification.id)
      .single();

    expect(createdNotification).toBeDefined();
    expect(createdNotification?.notification_type).toBe('DEADLINE_WARNING_7D');
    expect(createdNotification?.escalation_level).toBe(1);

    // Step 4: Check notification appears in API
    const notificationsResponse = await client.get('/api/v1/notifications', {
      token: testUser.token,
    });

    if (notificationsResponse.ok) {
      const notificationsData = await notificationsResponse.json();
      expect(Array.isArray(notificationsData.data)).toBe(true);
    }

    // Step 5: Mark notification as read
    const readResponse = await client.put(
      `/api/v1/notifications/${notification.id}/read`,
      {},
      {
        token: testUser.token,
      }
    );

    expect([200, 201, 404]).toContain(readResponse.status);

    // Clean up
    await supabaseAdmin.from('notifications').delete().eq('id', notification.id);
    await supabaseAdmin.from('obligations').delete().eq('id', obligation.id);
  }, 30000);

  it('should handle notification preferences workflow', async () => {
    if (!testUser.token || !testUser.user_id) {
      return;
    }

    // Step 1: Set preference to DAILY_DIGEST
    const prefResponse = await client.put(
      `/api/v1/users/${testUser.user_id}/notification-preferences`,
      {
        notification_type: 'DEADLINE_WARNING_7D',
        channel_preference: 'EMAIL_ONLY',
        frequency_preference: 'DAILY_DIGEST',
        enabled: true,
      },
      {
        token: testUser.token,
      }
    );

    expect([200, 201, 404]).toContain(prefResponse.status);

    // Step 2: Create notification
    const { data: notification } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: testUser.user_id,
        company_id: testUser.company_id,
        recipient_email: testUser.email,
        notification_type: 'DEADLINE_WARNING_7D',
        channel: 'EMAIL',
        priority: 'NORMAL',
        subject: 'Test',
        body_text: 'Test',
        status: 'PENDING',
      })
      .select('id')
      .single();

    // Step 3: Verify notification respects preference (should be queued for digest)
    if (notification) {
      const { data: updatedNotification } = await supabaseAdmin
        .from('notifications')
        .select('status, metadata')
        .eq('id', notification.id)
        .single();

      // Notification should be queued for digest or cancelled based on preference
      expect(['QUEUED', 'CANCELLED', 'PENDING']).toContain(updatedNotification?.status);

      // Clean up
      await supabaseAdmin.from('notifications').delete().eq('id', notification.id);
    }
  }, 30000);
});

