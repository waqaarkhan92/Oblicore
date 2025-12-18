/**
 * Calendar API Integration Tests
 * Tests for calendar token management, iCal feed generation, and calendar integrations
 *
 * Run with: RUN_INTEGRATION_TESTS=true npm test -- tests/integration/api/calendar.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization to ensure env vars are loaded
let supabaseAdmin: SupabaseClient;

function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase URL and Service Key must be set for integration tests');
    }

    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabaseAdmin;
}

// Skip by default - run with RUN_INTEGRATION_TESTS=true
const describeIntegration = process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

describeIntegration('Calendar API Integration Tests', () => {
  let testUser: any;
  let testCompany: any;
  let testSite: any;
  let authToken: string;
  let testTokenIds: string[] = [];
  let testObligationId: string;
  let testDeadlineId: string;

  beforeAll(async () => {
    const supabase = getSupabaseAdmin();

    // Clean up any leftover test data from previous runs
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingTestUser = existingUsers?.users?.find(u => u.email === 'calendar-test@example.com');
    if (existingTestUser) {
      await supabase.from('calendar_tokens').delete().eq('user_id', existingTestUser.id);
      await supabase.from('user_roles').delete().eq('user_id', existingTestUser.id);
      await supabase.from('users').delete().eq('id', existingTestUser.id);
      await supabase.auth.admin.deleteUser(existingTestUser.id);
    }
    await supabase.from('companies').delete().eq('name', 'Test Calendar Company');

    // Create test company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: 'Test Calendar Company',
        billing_email: 'billing-calendar-test@example.com',
      })
      .select()
      .single();

    if (companyError) throw companyError;
    testCompany = company;

    // Create test user in auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'calendar-test@example.com',
      password: 'TestPassword123!',
      email_confirm: true,
    });

    if (authError) throw authError;

    // Create user in users table
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: 'calendar-test@example.com',
        full_name: 'Test Calendar User',
        company_id: testCompany.id,
      })
      .select()
      .single();

    if (userError) throw userError;
    testUser = user;

    // Create user role
    await supabase.from('user_roles').insert({
      user_id: authData.user.id,
      role: 'ADMIN',
    });

    // Create test site
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .insert({
        company_id: testCompany.id,
        name: 'Test Calendar Site',
        address_line1: '123 Test Street',
        city: 'Test City',
        state: 'Test State',
        postcode: '12345',
        country: 'US',
      })
      .select()
      .single();

    if (siteError) throw siteError;
    testSite = site;

    // Create test obligation and deadline
    const { data: obligation, error: obligationError } = await supabase
      .from('obligations')
      .insert({
        company_id: testCompany.id,
        site_id: testSite.id,
        obligation_title: 'Test Compliance Obligation',
        obligation_description: 'This is a test obligation for calendar integration',
        category: 'MONITORING',
        status: 'PENDING',
      })
      .select()
      .single();

    if (obligationError) throw obligationError;
    testObligationId = obligation.id;

    // Create future deadline
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14); // 14 days from now
    const { data: deadline, error: deadlineError } = await supabase
      .from('deadlines')
      .insert({
        obligation_id: testObligationId,
        due_date: futureDate.toISOString().split('T')[0],
        status: 'PENDING',
      })
      .select()
      .single();

    if (deadlineError) throw deadlineError;
    testDeadlineId = deadline.id;

    // Sign in to get auth token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const client = createClient(supabaseUrl, supabaseAnonKey);
    const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
      email: 'calendar-test@example.com',
      password: 'TestPassword123!',
    });

    if (signInError) throw signInError;
    authToken = signInData.session?.access_token || '';
  });

  afterAll(async () => {
    const supabase = getSupabaseAdmin();

    // Clean up calendar tokens
    if (testTokenIds.length > 0) {
      await supabase.from('calendar_tokens').delete().in('id', testTokenIds);
    }

    // Clean up deadline and obligation
    if (testDeadlineId) {
      await supabase.from('deadlines').delete().eq('id', testDeadlineId);
    }
    if (testObligationId) {
      await supabase.from('obligations').delete().eq('id', testObligationId);
    }

    // Clean up site
    if (testSite) {
      await supabase.from('sites').delete().eq('id', testSite.id);
    }

    // Clean up user
    if (testUser) {
      await supabase.from('user_roles').delete().eq('user_id', testUser.id);
      await supabase.from('users').delete().eq('id', testUser.id);
      await supabase.auth.admin.deleteUser(testUser.id);
    }

    // Clean up company
    if (testCompany) {
      await supabase.from('companies').delete().eq('id', testCompany.id);
    }
  });

  beforeEach(() => {
    testTokenIds = [];
  });

  describe('POST /api/v1/calendar/tokens - Create Calendar Token', () => {
    it('should create a USER calendar token', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/calendar/tokens`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            token_type: 'USER',
            name: 'My Personal Calendar',
          }),
        }
      );

      const data = await response.json();
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.token).toBeDefined();
      expect(data.data.feed_url).toContain('/api/v1/calendar/ical/');
      expect(data.data.token_type).toBe('USER');
      expect(data.data.name).toBe('My Personal Calendar');

      testTokenIds.push(data.data.id);
    });

    it('should create a SITE calendar token', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/calendar/tokens`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            token_type: 'SITE',
            site_id: testSite.id,
            name: 'Site Compliance Calendar',
          }),
        }
      );

      const data = await response.json();
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.token).toBeDefined();
      expect(data.data.site_id).toBe(testSite.id);
      expect(data.data.name).toBe('Site Compliance Calendar');

      testTokenIds.push(data.data.id);
    });

    it('should reject invalid token_type', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/calendar/tokens`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            token_type: 'INVALID',
          }),
        }
      );

      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('token_type must be USER or SITE');
    });

    it('should require site_id for SITE tokens', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/calendar/tokens`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            token_type: 'SITE',
          }),
        }
      );

      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('site_id is required');
    });

    it('should reject non-existent site', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/calendar/tokens`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            token_type: 'SITE',
            site_id: '00000000-0000-0000-0000-000000000000',
          }),
        }
      );

      const data = await response.json();
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Site not found');
    });

    it('should require authentication', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/calendar/tokens`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token_type: 'USER',
          }),
        }
      );

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/calendar/tokens - List Calendar Tokens', () => {
    beforeEach(async () => {
      // Create a few test tokens
      const response1 = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/calendar/tokens`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            token_type: 'USER',
            name: 'Token 1',
          }),
        }
      );
      const data1 = await response1.json();
      testTokenIds.push(data1.data.id);

      const response2 = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/calendar/tokens`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            token_type: 'SITE',
            site_id: testSite.id,
            name: 'Token 2',
          }),
        }
      );
      const data2 = await response2.json();
      testTokenIds.push(data2.data.id);
    });

    it('should list all calendar tokens for user', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/calendar/tokens`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        }
      );

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThanOrEqual(2);

      // Check token structure
      const userToken = data.data.find((t: any) => t.token_type === 'USER');
      expect(userToken).toBeDefined();
      expect(userToken.feed_url).toBeDefined();
      expect(userToken.name).toBeDefined();

      const siteToken = data.data.find((t: any) => t.token_type === 'SITE');
      expect(siteToken).toBeDefined();
      expect(siteToken.site_id).toBe(testSite.id);
      expect(siteToken.site_name).toBe(testSite.name);
    });

    it('should require authentication', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/calendar/tokens`
      );

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/v1/calendar/tokens/[tokenId] - Revoke Calendar Token', () => {
    let tokenToDelete: string;

    beforeEach(async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/calendar/tokens`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            token_type: 'USER',
            name: 'Token to Delete',
          }),
        }
      );
      const data = await response.json();
      tokenToDelete = data.data.id;
      testTokenIds.push(tokenToDelete);
    });

    it('should revoke a calendar token', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/calendar/tokens/${tokenToDelete}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        }
      );

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('revoked');

      // Remove from cleanup list since it's deleted
      testTokenIds = testTokenIds.filter(id => id !== tokenToDelete);
    });

    it('should return 404 for non-existent token', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/calendar/tokens/00000000-0000-0000-0000-000000000000`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        }
      );

      const data = await response.json();
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/calendar/tokens/${tokenToDelete}`,
        {
          method: 'DELETE',
        }
      );

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/calendar/ical/[token] - iCal Feed', () => {
    let userToken: string;
    let siteToken: string;

    beforeEach(async () => {
      // Create USER token
      const userResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/calendar/tokens`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            token_type: 'USER',
          }),
        }
      );
      const userData = await userResponse.json();
      userToken = userData.data.token;
      testTokenIds.push(userData.data.id);

      // Create SITE token
      const siteResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/calendar/tokens`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            token_type: 'SITE',
            site_id: testSite.id,
          }),
        }
      );
      const siteData = await siteResponse.json();
      siteToken = siteData.data.token;
      testTokenIds.push(siteData.data.id);
    });

    it('should return iCal feed for valid USER token', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/calendar/ical/${userToken}`
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/calendar');

      const icalContent = await response.text();
      expect(icalContent).toContain('BEGIN:VCALENDAR');
      expect(icalContent).toContain('END:VCALENDAR');
      expect(icalContent).toContain('VERSION:2.0');
      expect(icalContent).toContain('PRODID:-//EcoComply//Compliance Calendar//EN');
      expect(icalContent).toContain('X-WR-CALNAME:EcoComply - My Deadlines');
    });

    it('should return iCal feed for valid SITE token', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/calendar/ical/${siteToken}`
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/calendar');

      const icalContent = await response.text();
      expect(icalContent).toContain('BEGIN:VCALENDAR');
      expect(icalContent).toContain('END:VCALENDAR');
      expect(icalContent).toContain(`X-WR-CALNAME:EcoComply - ${testSite.name}`);
    });

    it('should include deadline events in iCal feed', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/calendar/ical/${userToken}`
      );

      const icalContent = await response.text();
      expect(icalContent).toContain('BEGIN:VEVENT');
      expect(icalContent).toContain('END:VEVENT');
      expect(icalContent).toContain('SUMMARY:');
      expect(icalContent).toContain('DTSTART');
      expect(icalContent).toContain('DTEND');
      expect(icalContent).toContain('Test Compliance Obligation');
    });

    it('should include alarm/reminder in events', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/calendar/ical/${userToken}`
      );

      const icalContent = await response.text();
      expect(icalContent).toContain('BEGIN:VALARM');
      expect(icalContent).toContain('TRIGGER:-P1D');
      expect(icalContent).toContain('ACTION:DISPLAY');
      expect(icalContent).toContain('END:VALARM');
    });

    it('should set correct Content-Disposition header', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/calendar/ical/${userToken}`
      );

      expect(response.headers.get('content-disposition')).toContain('attachment');
      expect(response.headers.get('content-disposition')).toContain('.ics');
    });

    it('should set no-cache headers', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/calendar/ical/${userToken}`
      );

      const cacheControl = response.headers.get('cache-control');
      expect(cacheControl).toContain('no-cache');
      expect(cacheControl).toContain('no-store');
    });

    it('should reject invalid token', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/calendar/ical/invalid-token-12345`
      );

      expect(response.status).toBe(401);
      const content = await response.text();
      expect(content).toContain('Invalid or expired calendar token');
    });

    it('should NOT require authentication (public feed with token)', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/calendar/ical/${userToken}`
      );

      expect(response.status).toBe(200);
    });

    it('should format dates correctly as all-day events', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/calendar/ical/${userToken}`
      );

      const icalContent = await response.text();
      // All-day events should use DTSTART;VALUE=DATE format
      expect(icalContent).toMatch(/DTSTART;VALUE=DATE:\d{8}/);
      expect(icalContent).toMatch(/DTEND;VALUE=DATE:\d{8}/);
    });

    it('should include site name in event location', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/calendar/ical/${userToken}`
      );

      const icalContent = await response.text();
      expect(icalContent).toContain(`LOCATION:${testSite.name}`);
    });

    it('should include categories in events', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/calendar/ical/${userToken}`
      );

      const icalContent = await response.text();
      expect(icalContent).toContain('CATEGORIES:');
      expect(icalContent).toContain('MONITORING');
    });

    it('should include URL to obligation in events', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/calendar/ical/${userToken}`
      );

      const icalContent = await response.text();
      expect(icalContent).toContain('URL:');
      expect(icalContent).toContain('/dashboard/obligations/');
    });

    it('should only include PENDING deadlines', async () => {
      const supabase = getSupabaseAdmin();

      // Create a completed deadline
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);
      const { data: completedDeadline } = await supabase
        .from('deadlines')
        .insert({
          obligation_id: testObligationId,
          due_date: pastDate.toISOString().split('T')[0],
          status: 'COMPLETED',
        })
        .select()
        .single();

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/calendar/ical/${userToken}`
      );

      const icalContent = await response.text();

      // Count VEVENT entries (should only have pending deadline)
      const eventMatches = icalContent.match(/BEGIN:VEVENT/g);
      expect(eventMatches?.length).toBe(1); // Only the pending deadline

      // Cleanup
      if (completedDeadline) {
        await supabase.from('deadlines').delete().eq('id', completedDeadline.id);
      }
    });

    it('should only include future deadlines within date range', async () => {
      const supabase = getSupabaseAdmin();

      // Create a past deadline
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      const { data: pastDeadline } = await supabase
        .from('deadlines')
        .insert({
          obligation_id: testObligationId,
          due_date: pastDate.toISOString().split('T')[0],
          status: 'PENDING',
        })
        .select()
        .single();

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/calendar/ical/${userToken}`
      );

      const icalContent = await response.text();

      // Should only include future deadlines
      const eventMatches = icalContent.match(/BEGIN:VEVENT/g);
      expect(eventMatches?.length).toBe(1); // Only the future deadline (not past)

      // Cleanup
      if (pastDeadline) {
        await supabase.from('deadlines').delete().eq('id', pastDeadline.id);
      }
    });
  });

  describe('Calendar Integration - Status and Settings', () => {
    it('should get calendar integration status', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/integrations/calendar/status`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        }
      );

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.integrations).toBeDefined();
      expect(Array.isArray(data.integrations)).toBe(true);
    });

    it('should require authentication for status endpoint', async () => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/integrations/calendar/status`
      );

      expect(response.status).toBe(401);
    });
  });
});
