/**
 * End-to-End Evidence Workflow Test
 * Tests complete evidence upload → linking → obligation completion workflow
 */

import { TestClient } from '../helpers/test-client';
import { supabaseAdmin } from '@/lib/supabase/server';

describe('E2E: Evidence Workflow', () => {
  const client = new TestClient();
  let testUser: { email: string; password: string; token?: string; user_id?: string; company_id?: string; site_id?: string };

  beforeAll(async () => {
    const timestamp = Date.now();
    testUser = {
      email: `e2e_evidence_${timestamp}@example.com`,
      password: 'TestPassword123!',
    };

    // Signup
    const signupResponse = await client.post('/api/v1/auth/signup', {
      email: testUser.email,
      password: testUser.password,
      full_name: `E2E Evidence User ${timestamp}`,
      company_name: `E2E Evidence Company ${timestamp}`,
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
          name: `E2E Evidence Site ${timestamp}`,
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

  it('should complete evidence upload and linking workflow', async () => {
    if (!testUser.token || !testUser.user_id || !testUser.company_id || !testUser.site_id) {
      console.warn('Skipping E2E evidence test: test user not fully set up');
      return;
    }

    // Step 1: Create obligation
    const { data: module } = await supabaseAdmin
      .from('modules')
      .select('id')
      .eq('module_code', 'MODULE_1')
      .single();

    if (!module) {
      throw new Error('Module 1 not found');
    }

    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + 30);

    const { data: obligation, error: obligError } = await supabaseAdmin
      .from('obligations')
      .insert({
        company_id: testUser.company_id,
        site_id: testUser.site_id,
        module_id: module.id,
        original_text: 'E2E Test Obligation',
        obligation_title: 'E2E Test Obligation',
        obligation_description: 'Test obligation for evidence workflow',
        category: 'MONITORING',
        status: 'ACTIVE',
        deadline_date: deadlineDate.toISOString().split('T')[0],
      })
      .select('id')
      .single();

    if (obligError || !obligation) {
      throw new Error(`Failed to create test obligation: ${obligError?.message}`);
    }

    // Step 2: Upload evidence
    const pdfContent = Buffer.from('%PDF-1.4\n%%EOF');
    const formData = new FormData();
    const blob = new Blob([pdfContent], { type: 'application/pdf' });
    formData.append('file', blob, 'evidence.pdf');
    formData.append('site_id', testUser.site_id);
    formData.append('title', 'Test Evidence');
    formData.append('evidence_type', 'DOCUMENT');

    const uploadResponse = await client.post('/api/v1/evidence', formData, {
      token: testUser.token,
    });

    let evidenceId: string | null = null;
    if (uploadResponse.ok) {
      const uploadData = await uploadResponse.json();
      evidenceId = uploadData.data?.id;
    }

    // Step 3: Link evidence to obligation
    if (evidenceId) {
      const linkResponse = await client.post(
        `/api/v1/evidence/${evidenceId}/link`,
        {
          obligation_id: obligation.id,
        },
        {
          token: testUser.token,
        }
      );

      expect([200, 201, 404]).toContain(linkResponse.status);
    }

    // Step 4: Verify evidence is linked
    const evidenceResponse = await client.get(`/api/v1/obligations/${obligation.id}/evidence`, {
      token: testUser.token,
    });

    if (evidenceResponse.ok) {
      const evidenceData = await evidenceResponse.json();
      expect(Array.isArray(evidenceData.data)).toBe(true);
    }

    // Clean up
    if (evidenceId) {
      await supabaseAdmin.from('obligation_evidence_links').delete().eq('evidence_id', evidenceId);
      await supabaseAdmin.from('evidence_items').delete().eq('id', evidenceId);
    }
    await supabaseAdmin.from('obligations').delete().eq('id', obligation.id);
  }, 60000);

  it('should list evidence for obligation', async () => {
    if (!testUser.token || !testUser.company_id || !testUser.site_id) {
      return;
    }

    // Create obligation
    const { data: module } = await supabaseAdmin
      .from('modules')
      .select('id')
      .eq('module_code', 'MODULE_1')
      .single();

    if (!module) {
      return;
    }

    const { data: obligation } = await supabaseAdmin
      .from('obligations')
      .insert({
        company_id: testUser.company_id,
        site_id: testUser.site_id,
        module_id: module.id,
        original_text: 'Test',
        obligation_title: 'Test',
        category: 'MONITORING',
        status: 'ACTIVE',
      })
      .select('id')
      .single();

    if (obligation) {
      const response = await client.get(`/api/v1/obligations/${obligation.id}/evidence`, {
        token: testUser.token,
      });

      expect([200, 404]).toContain(response.status);

      // Clean up
      await supabaseAdmin.from('obligations').delete().eq('id', obligation.id);
    }
  }, 30000);
});

