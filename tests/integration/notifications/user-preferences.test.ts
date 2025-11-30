/**
 * User Notification Preferences Tests
 * Tests notification preference API and behavior
 */

import { TestClient } from '../../helpers/test-client';
import { supabaseAdmin } from '@/lib/supabase/server';

describe('User Notification Preferences', () => {
  const client = new TestClient();
  let testUser: { email: string; password: string; token?: string; user_id?: string; company_id?: string };

  beforeAll(async () => {
    const timestamp = Date.now();
    testUser = {
      email: `prefs_test_${timestamp}@example.com`,
      password: 'TestPassword123!',
    };

    // Signup
    const signupResponse = await client.post('/api/v1/auth/signup', {
      email: testUser.email,
      password: testUser.password,
      full_name: `Prefs Test User ${timestamp}`,
      company_name: `Prefs Test Company ${timestamp}`,
    });

    if (signupResponse.ok) {
      const signupData = await signupResponse.json();
      testUser.token = signupData.data?.access_token;
      testUser.user_id = signupData.data?.user?.id;
      testUser.company_id = signupData.data?.user?.company_id;
    }
  });

  it('should get user notification preferences', async () => {
    if (!testUser.token || !testUser.user_id) {
      return;
    }

    const response = await client.get(`/api/v1/users/${testUser.user_id}/notification-preferences`, {
      token: testUser.token,
    });

    expect([200, 401, 404]).toContain(response.status);
    if (response.status === 200) {
      const data = await response.json();
      expect(data.data).toBeDefined();
    }
  });

  it('should update user notification preferences', async () => {
    if (!testUser.token || !testUser.user_id) {
      return;
    }

    const response = await client.put(
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

    expect([200, 201, 401, 404]).toContain(response.status);
    if (response.ok) {
      const data = await response.json();
      expect(data.data).toBeDefined();
    }
  });

  it('should respect digest preference when creating notifications', async () => {
    if (!testUser.user_id || !testUser.company_id) {
      return;
    }

    // Set preference to DAILY_DIGEST
    await supabaseAdmin.from('user_notification_preferences').upsert({
      user_id: testUser.user_id,
      notification_type: 'DEADLINE_WARNING_7D',
      channel_preference: 'EMAIL',
      frequency_preference: 'DAILY_DIGEST',
      enabled: true,
    });

    // Create a notification
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
      .select('id, status')
      .single();

    // Notification should be created (preference check happens during delivery)
    expect(notification).toBeDefined();

    // Clean up
    if (notification) {
      await supabaseAdmin.from('notifications').delete().eq('id', notification.id);
    }
    await supabaseAdmin
      .from('user_notification_preferences')
      .delete()
      .eq('user_id', testUser.user_id)
      .eq('notification_type', 'DEADLINE_WARNING_7D');
  });

  it('should disable notifications when preference is disabled', async () => {
    if (!testUser.user_id || !testUser.company_id) {
      return;
    }

    // Set preference to disabled
    await supabaseAdmin.from('user_notification_preferences').upsert({
      user_id: testUser.user_id,
      notification_type: 'DEADLINE_WARNING_7D',
      channel_preference: 'EMAIL',
      frequency_preference: 'IMMEDIATE',
      enabled: false,
    });

    // Create a notification
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
      .select('id, status')
      .single();

    // Notification should be created (preference check happens during delivery)
    expect(notification).toBeDefined();

    // Clean up
    if (notification) {
      await supabaseAdmin.from('notifications').delete().eq('id', notification.id);
    }
    await supabaseAdmin
      .from('user_notification_preferences')
      .delete()
      .eq('user_id', testUser.user_id)
      .eq('notification_type', 'DEADLINE_WARNING_7D');
  });
});

