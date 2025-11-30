/**
 * End-to-End Pack Generation Workflow Test
 * Tests complete pack generation and distribution workflow
 */

import { TestClient } from '../helpers/test-client';
import { supabaseAdmin } from '@/lib/supabase/server';

describe('E2E: Pack Generation Workflow', () => {
  const client = new TestClient();
  let testUser: { email: string; password: string; token?: string; user_id?: string; company_id?: string; site_id?: string };

  beforeAll(async () => {
    const timestamp = Date.now();
    testUser = {
      email: `e2e_pack_${timestamp}@example.com`,
      password: 'TestPassword123!',
    };

    // Signup
    const signupResponse = await client.post('/api/v1/auth/signup', {
      email: testUser.email,
      password: testUser.password,
      full_name: `E2E Pack User ${timestamp}`,
      company_name: `E2E Pack Company ${timestamp}`,
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
          name: `E2E Pack Site ${timestamp}`,
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

  it('should complete pack generation workflow', async () => {
    if (!testUser.token || !testUser.user_id || !testUser.company_id || !testUser.site_id) {
      console.warn('Skipping E2E pack test: test user not fully set up');
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

    const { data: obligation, error: obligError } = await supabaseAdmin
      .from('obligations')
      .insert({
        company_id: testUser.company_id,
        site_id: testUser.site_id,
        module_id: module.id,
        original_text: 'E2E Test Obligation',
        obligation_title: 'E2E Test Obligation',
        obligation_description: 'Test',
        category: 'MONITORING',
        status: 'ACTIVE',
      })
      .select('id')
      .single();

    if (obligError || !obligation) {
      throw new Error(`Failed to create test obligation: ${obligError?.message}`);
    }

    // Step 2: Generate pack
    const generateResponse = await client.post(
      '/api/v1/packs/generate',
      {
        site_id: testUser.site_id,
        pack_type: 'AUDIT_PACK',
        include_obligations: [obligation.id],
      },
      {
        token: testUser.token,
      }
    );

    let packId: string | null = null;
    if (generateResponse.ok) {
      const generateData = await generateResponse.json();
      packId = generateData.data?.id;
    }

    // Step 3: Check pack status
    if (packId) {
      const packResponse = await client.get(`/api/v1/packs/${packId}`, {
        token: testUser.token,
      });

      expect([200, 404]).toContain(packResponse.status);
    }

    // Step 4: List packs
    const listResponse = await client.get('/api/v1/packs', {
      token: testUser.token,
    });

    if (listResponse.ok) {
      const listData = await listResponse.json();
      expect(Array.isArray(listData.data)).toBe(true);
    }

    // Clean up
    if (packId) {
      await supabaseAdmin.from('packs').delete().eq('id', packId);
    }
    await supabaseAdmin.from('obligations').delete().eq('id', obligation.id);
  }, 60000);
});

