/**
 * Obligations API Integration Tests
 * Tests for /api/v1/obligations endpoints
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

describeIntegration('Obligations API Integration Tests', () => {
  let testUser: any;
  let testCompany: any;
  let testSite: any;
  let testModule: any;
  let testDocument: any;
  let authToken: string;
  let testObligations: string[] = [];

  beforeAll(async () => {
    const supabase = getSupabaseAdmin();

    // Clean up any leftover test data from previous runs
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingTestUser = existingUsers?.users?.find(u => u.email === 'obligations-test@example.com');
    if (existingTestUser) {
      await supabase.from('user_roles').delete().eq('user_id', existingTestUser.id);
      await supabase.from('obligations').delete().eq('company_id', existingTestUser.user_metadata?.company_id);
      await supabase.from('users').delete().eq('id', existingTestUser.id);
      await supabase.auth.admin.deleteUser(existingTestUser.id);
    }
    await supabase.from('documents').delete().eq('document_name', 'Test Obligations Document');
    await supabase.from('sites').delete().eq('site_name', 'Test Obligations Site');
    await supabase.from('companies').delete().eq('name', 'Test Obligations Company');

    // Create test company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: 'Test Obligations Company',
        billing_email: 'billing-obligations-test@example.com',
      })
      .select()
      .single();

    if (companyError) throw companyError;
    testCompany = company;

    // Create test site
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .insert({
        company_id: testCompany.id,
        site_name: 'Test Obligations Site',
        site_address: '123 Test St',
        site_state: 'CA',
      })
      .select()
      .single();

    if (siteError) throw siteError;
    testSite = site;

    // Get or create a module
    const { data: existingModule } = await supabase
      .from('modules')
      .select('id')
      .limit(1)
      .single();

    if (existingModule) {
      testModule = existingModule;
    } else {
      const { data: newModule, error: moduleError } = await supabase
        .from('modules')
        .insert({
          module_name: 'Test Module',
          description: 'Test module for obligations tests',
        })
        .select()
        .single();

      if (moduleError) throw moduleError;
      testModule = newModule;
    }

    // Create test document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        company_id: testCompany.id,
        site_id: testSite.id,
        document_name: 'Test Obligations Document',
        document_type: 'PERMIT',
        file_path: '/test/path.pdf',
        upload_status: 'COMPLETED',
      })
      .select()
      .single();

    if (docError) throw docError;
    testDocument = document;

    // Create test user in auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'obligations-test@example.com',
      password: 'TestPassword123!',
      email_confirm: true,
    });

    if (authError) throw authError;

    // Create user in users table
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: 'obligations-test@example.com',
        full_name: 'Test Obligations User',
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

    // Sign in to get auth token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const client = createClient(supabaseUrl, supabaseAnonKey);
    const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
      email: 'obligations-test@example.com',
      password: 'TestPassword123!',
    });

    if (signInError) throw signInError;
    authToken = signInData.session?.access_token || '';
  });

  afterAll(async () => {
    const supabase = getSupabaseAdmin();

    // Clean up obligations
    if (testObligations.length > 0) {
      await supabase.from('obligations').delete().in('id', testObligations);
    }

    // Clean up document
    if (testDocument) {
      await supabase.from('documents').delete().eq('id', testDocument.id);
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
    testObligations = [];
  });

  describe('GET /api/v1/obligations', () => {
    it('should retrieve obligations for authenticated user', async () => {
      const supabase = getSupabaseAdmin();

      // Create test obligations
      const { data: obligation1, error: err1 } = await supabase
        .from('obligations')
        .insert({
          company_id: testCompany.id,
          site_id: testSite.id,
          document_id: testDocument.id,
          module_id: testModule.id,
          obligation_title: 'Test Obligation 1',
          original_text: 'Original text for obligation 1',
          category: 'MONITORING',
          frequency: 'MONTHLY',
          status: 'PENDING',
          review_status: 'PENDING',
        })
        .select()
        .single();

      if (err1) throw err1;

      const { data: obligation2, error: err2 } = await supabase
        .from('obligations')
        .insert({
          company_id: testCompany.id,
          site_id: testSite.id,
          document_id: testDocument.id,
          module_id: testModule.id,
          obligation_title: 'Test Obligation 2',
          original_text: 'Original text for obligation 2',
          category: 'REPORTING',
          frequency: 'QUARTERLY',
          status: 'PENDING',
          review_status: 'PENDING',
        })
        .select()
        .single();

      if (err2) throw err2;

      if (obligation1) testObligations.push(obligation1.id);
      if (obligation2) testObligations.push(obligation2.id);

      const response = await fetch(`http://localhost:3000/api/v1/obligations`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThanOrEqual(2);
      expect(data.pagination).toBeDefined();
    });

    it('should filter obligations by site_id', async () => {
      const supabase = getSupabaseAdmin();

      // Create obligation for test site
      const { data: obligation } = await supabase
        .from('obligations')
        .insert({
          company_id: testCompany.id,
          site_id: testSite.id,
          document_id: testDocument.id,
          module_id: testModule.id,
          obligation_title: 'Site Specific Obligation',
          original_text: 'Original text',
          category: 'MONITORING',
          status: 'PENDING',
          review_status: 'PENDING',
        })
        .select()
        .single();

      if (obligation) testObligations.push(obligation.id);

      const response = await fetch(
        `http://localhost:3000/api/v1/obligations?site_id=${testSite.id}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      data.data.forEach((obl: any) => {
        expect(obl.site_id).toBe(testSite.id);
      });
    });

    it('should filter obligations by status', async () => {
      const supabase = getSupabaseAdmin();

      // Create obligations with different statuses
      const { data: pendingObl } = await supabase
        .from('obligations')
        .insert({
          company_id: testCompany.id,
          site_id: testSite.id,
          document_id: testDocument.id,
          module_id: testModule.id,
          obligation_title: 'Pending Obligation',
          original_text: 'Original text',
          category: 'MONITORING',
          status: 'PENDING',
          review_status: 'PENDING',
        })
        .select()
        .single();

      const { data: completedObl } = await supabase
        .from('obligations')
        .insert({
          company_id: testCompany.id,
          site_id: testSite.id,
          document_id: testDocument.id,
          module_id: testModule.id,
          obligation_title: 'Completed Obligation',
          original_text: 'Original text',
          category: 'MONITORING',
          status: 'COMPLETED',
          review_status: 'CONFIRMED',
        })
        .select()
        .single();

      if (pendingObl) testObligations.push(pendingObl.id);
      if (completedObl) testObligations.push(completedObl.id);

      const response = await fetch(
        `http://localhost:3000/api/v1/obligations?status=PENDING`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      data.data.forEach((obl: any) => {
        expect(obl.status).toBe('PENDING');
      });
    });

    it('should filter obligations by category', async () => {
      const supabase = getSupabaseAdmin();

      // Create obligations with different categories
      const { data: monitoringObl } = await supabase
        .from('obligations')
        .insert({
          company_id: testCompany.id,
          site_id: testSite.id,
          document_id: testDocument.id,
          module_id: testModule.id,
          obligation_title: 'Monitoring Obligation',
          original_text: 'Original text',
          category: 'MONITORING',
          status: 'PENDING',
          review_status: 'PENDING',
        })
        .select()
        .single();

      const { data: reportingObl } = await supabase
        .from('obligations')
        .insert({
          company_id: testCompany.id,
          site_id: testSite.id,
          document_id: testDocument.id,
          module_id: testModule.id,
          obligation_title: 'Reporting Obligation',
          original_text: 'Original text',
          category: 'REPORTING',
          status: 'PENDING',
          review_status: 'PENDING',
        })
        .select()
        .single();

      if (monitoringObl) testObligations.push(monitoringObl.id);
      if (reportingObl) testObligations.push(reportingObl.id);

      const response = await fetch(
        `http://localhost:3000/api/v1/obligations?category=MONITORING`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      data.data.forEach((obl: any) => {
        expect(obl.category).toBe('MONITORING');
      });
    });

    it('should filter obligations by review_status', async () => {
      const supabase = getSupabaseAdmin();

      const { data: confirmedObl } = await supabase
        .from('obligations')
        .insert({
          company_id: testCompany.id,
          site_id: testSite.id,
          document_id: testDocument.id,
          module_id: testModule.id,
          obligation_title: 'Confirmed Obligation',
          original_text: 'Original text',
          category: 'MONITORING',
          status: 'PENDING',
          review_status: 'CONFIRMED',
        })
        .select()
        .single();

      if (confirmedObl) testObligations.push(confirmedObl.id);

      const response = await fetch(
        `http://localhost:3000/api/v1/obligations?review_status=CONFIRMED`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      data.data.forEach((obl: any) => {
        expect(obl.review_status).toBe('CONFIRMED');
      });
    });

    it('should support pagination with limit parameter', async () => {
      const supabase = getSupabaseAdmin();

      // Create multiple obligations
      for (let i = 0; i < 5; i++) {
        const { data } = await supabase
          .from('obligations')
          .insert({
            company_id: testCompany.id,
            site_id: testSite.id,
            document_id: testDocument.id,
            module_id: testModule.id,
            obligation_title: `Pagination Test Obligation ${i}`,
            original_text: `Original text ${i}`,
            category: 'MONITORING',
            status: 'PENDING',
            review_status: 'PENDING',
          })
          .select()
          .single();

        if (data) testObligations.push(data.id);
      }

      const response = await fetch(`http://localhost:3000/api/v1/obligations?limit=3`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(Array.isArray(responseData.data)).toBe(true);
      expect(responseData.data.length).toBeLessThanOrEqual(3);
      expect(responseData.pagination).toBeDefined();
      expect(responseData.pagination.has_more).toBeDefined();
    });

    it('should support pagination with cursor', async () => {
      // Get first page
      const firstResponse = await fetch(`http://localhost:3000/api/v1/obligations?limit=2`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const firstData = await firstResponse.json();

      if (firstData.pagination.next_cursor) {
        // Get second page
        const secondResponse = await fetch(
          `http://localhost:3000/api/v1/obligations?limit=2&cursor=${firstData.pagination.next_cursor}`,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        expect(secondResponse.status).toBe(200);

        const secondData = await secondResponse.json();
        expect(secondData.success).toBe(true);
        expect(Array.isArray(secondData.data)).toBe(true);

        // Ensure no overlap between pages
        const firstIds = firstData.data.map((n: any) => n.id);
        const secondIds = secondData.data.map((n: any) => n.id);
        const overlap = firstIds.filter((id: string) => secondIds.includes(id));
        expect(overlap.length).toBe(0);
      }
    });

    it('should reject invalid limit parameter', async () => {
      const response = await fetch(`http://localhost:3000/api/v1/obligations?limit=999`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(422);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should support search query', async () => {
      const supabase = getSupabaseAdmin();

      const { data: obligation } = await supabase
        .from('obligations')
        .insert({
          company_id: testCompany.id,
          site_id: testSite.id,
          document_id: testDocument.id,
          module_id: testModule.id,
          obligation_title: 'Unique Search Term XYZ123',
          original_text: 'Original text',
          category: 'MONITORING',
          status: 'PENDING',
          review_status: 'PENDING',
        })
        .select()
        .single();

      if (obligation) testObligations.push(obligation.id);

      const response = await fetch(
        `http://localhost:3000/api/v1/obligations?search=XYZ123`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      const found = data.data.find((obl: any) => obl.obligation_title.includes('XYZ123'));
      expect(found).toBeDefined();
    });

    it('should require authentication', async () => {
      const response = await fetch(`http://localhost:3000/api/v1/obligations`);

      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it('should return obligations with evidence count', async () => {
      const supabase = getSupabaseAdmin();

      const { data: obligation } = await supabase
        .from('obligations')
        .insert({
          company_id: testCompany.id,
          site_id: testSite.id,
          document_id: testDocument.id,
          module_id: testModule.id,
          obligation_title: 'Evidence Count Test',
          original_text: 'Original text',
          category: 'MONITORING',
          status: 'PENDING',
          review_status: 'PENDING',
        })
        .select()
        .single();

      if (obligation) testObligations.push(obligation.id);

      const response = await fetch(`http://localhost:3000/api/v1/obligations`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      const found = data.data.find((obl: any) => obl.id === obligation!.id);
      expect(found).toBeDefined();
      expect(found.evidence_count).toBeDefined();
      expect(typeof found.evidence_count).toBe('number');
    });
  });

  describe('GET /api/v1/obligations/[obligationId]', () => {
    it('should retrieve obligation by ID', async () => {
      const supabase = getSupabaseAdmin();

      // Create test obligation
      const { data: obligation } = await supabase
        .from('obligations')
        .insert({
          company_id: testCompany.id,
          site_id: testSite.id,
          document_id: testDocument.id,
          module_id: testModule.id,
          obligation_title: 'Get By ID Test',
          original_text: 'Original text',
          category: 'MONITORING',
          status: 'PENDING',
          review_status: 'PENDING',
        })
        .select()
        .single();

      if (obligation) testObligations.push(obligation.id);

      const response = await fetch(
        `http://localhost:3000/api/v1/obligations/${obligation!.id}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(obligation!.id);
      expect(data.data.obligation_title).toBe('Get By ID Test');
      expect(data.data.evidence_count).toBeDefined();
      expect(data.data.linked_evidence).toBeDefined();
      expect(Array.isArray(data.data.linked_evidence)).toBe(true);
      expect(data.data.schedules).toBeDefined();
      expect(Array.isArray(data.data.schedules)).toBe(true);
      expect(data.data.deadlines).toBeDefined();
      expect(Array.isArray(data.data.deadlines)).toBe(true);
    });

    it('should return 404 for non-existent obligation', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await fetch(
        `http://localhost:3000/api/v1/obligations/${fakeId}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await fetch(
        `http://localhost:3000/api/v1/obligations/invalid-uuid`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should not return soft-deleted obligations', async () => {
      const supabase = getSupabaseAdmin();

      // Create and soft delete an obligation
      const { data: obligation } = await supabase
        .from('obligations')
        .insert({
          company_id: testCompany.id,
          site_id: testSite.id,
          document_id: testDocument.id,
          module_id: testModule.id,
          obligation_title: 'Soft Delete Test',
          original_text: 'Original text',
          category: 'MONITORING',
          status: 'PENDING',
          review_status: 'PENDING',
          deleted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (obligation) testObligations.push(obligation.id);

      const response = await fetch(
        `http://localhost:3000/api/v1/obligations/${obligation!.id}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      expect(response.status).toBe(404);
    });

    it('should require authentication', async () => {
      const response = await fetch(
        `http://localhost:3000/api/v1/obligations/00000000-0000-0000-0000-000000000000`
      );

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/v1/obligations/[obligationId]', () => {
    it('should update obligation with valid data', async () => {
      const supabase = getSupabaseAdmin();

      // Create test obligation
      const { data: obligation } = await supabase
        .from('obligations')
        .insert({
          company_id: testCompany.id,
          site_id: testSite.id,
          document_id: testDocument.id,
          module_id: testModule.id,
          obligation_title: 'Update Test',
          original_text: 'Original text',
          category: 'MONITORING',
          status: 'PENDING',
          review_status: 'PENDING',
        })
        .select()
        .single();

      if (obligation) testObligations.push(obligation.id);

      const response = await fetch(
        `http://localhost:3000/api/v1/obligations/${obligation!.id}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            obligation_title: 'Updated Title',
            obligation_description: 'Updated description',
          }),
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.obligation_title).toBe('Updated Title');
      expect(data.data.obligation_description).toBe('Updated description');
      expect(data.data.review_status).toBe('EDITED');
    });

    it('should update obligation category', async () => {
      const supabase = getSupabaseAdmin();

      const { data: obligation } = await supabase
        .from('obligations')
        .insert({
          company_id: testCompany.id,
          site_id: testSite.id,
          document_id: testDocument.id,
          module_id: testModule.id,
          obligation_title: 'Category Update Test',
          original_text: 'Original text',
          category: 'MONITORING',
          status: 'PENDING',
          review_status: 'PENDING',
        })
        .select()
        .single();

      if (obligation) testObligations.push(obligation.id);

      const response = await fetch(
        `http://localhost:3000/api/v1/obligations/${obligation!.id}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            category: 'REPORTING',
          }),
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.category).toBe('REPORTING');
    });

    it('should reject invalid category', async () => {
      const supabase = getSupabaseAdmin();

      const { data: obligation } = await supabase
        .from('obligations')
        .insert({
          company_id: testCompany.id,
          site_id: testSite.id,
          document_id: testDocument.id,
          module_id: testModule.id,
          obligation_title: 'Invalid Category Test',
          original_text: 'Original text',
          category: 'MONITORING',
          status: 'PENDING',
          review_status: 'PENDING',
        })
        .select()
        .single();

      if (obligation) testObligations.push(obligation.id);

      const response = await fetch(
        `http://localhost:3000/api/v1/obligations/${obligation!.id}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            category: 'INVALID_CATEGORY',
          }),
        }
      );

      expect(response.status).toBe(422);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should update obligation frequency', async () => {
      const supabase = getSupabaseAdmin();

      const { data: obligation } = await supabase
        .from('obligations')
        .insert({
          company_id: testCompany.id,
          site_id: testSite.id,
          document_id: testDocument.id,
          module_id: testModule.id,
          obligation_title: 'Frequency Update Test',
          original_text: 'Original text',
          category: 'MONITORING',
          frequency: 'MONTHLY',
          status: 'PENDING',
          review_status: 'PENDING',
        })
        .select()
        .single();

      if (obligation) testObligations.push(obligation.id);

      const response = await fetch(
        `http://localhost:3000/api/v1/obligations/${obligation!.id}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            frequency: 'QUARTERLY',
          }),
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.frequency).toBe('QUARTERLY');
    });

    it('should reject invalid frequency', async () => {
      const supabase = getSupabaseAdmin();

      const { data: obligation } = await supabase
        .from('obligations')
        .insert({
          company_id: testCompany.id,
          site_id: testSite.id,
          document_id: testDocument.id,
          module_id: testModule.id,
          obligation_title: 'Invalid Frequency Test',
          original_text: 'Original text',
          category: 'MONITORING',
          status: 'PENDING',
          review_status: 'PENDING',
        })
        .select()
        .single();

      if (obligation) testObligations.push(obligation.id);

      const response = await fetch(
        `http://localhost:3000/api/v1/obligations/${obligation!.id}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            frequency: 'INVALID_FREQUENCY',
          }),
        }
      );

      expect(response.status).toBe(422);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject empty obligation title', async () => {
      const supabase = getSupabaseAdmin();

      const { data: obligation } = await supabase
        .from('obligations')
        .insert({
          company_id: testCompany.id,
          site_id: testSite.id,
          document_id: testDocument.id,
          module_id: testModule.id,
          obligation_title: 'Empty Title Test',
          original_text: 'Original text',
          category: 'MONITORING',
          status: 'PENDING',
          review_status: 'PENDING',
        })
        .select()
        .single();

      if (obligation) testObligations.push(obligation.id);

      const response = await fetch(
        `http://localhost:3000/api/v1/obligations/${obligation!.id}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            obligation_title: '',
          }),
        }
      );

      expect(response.status).toBe(422);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should prevent changing document_id', async () => {
      const supabase = getSupabaseAdmin();

      const { data: obligation } = await supabase
        .from('obligations')
        .insert({
          company_id: testCompany.id,
          site_id: testSite.id,
          document_id: testDocument.id,
          module_id: testModule.id,
          obligation_title: 'Document ID Change Test',
          original_text: 'Original text',
          category: 'MONITORING',
          status: 'PENDING',
          review_status: 'PENDING',
        })
        .select()
        .single();

      if (obligation) testObligations.push(obligation.id);

      const response = await fetch(
        `http://localhost:3000/api/v1/obligations/${obligation!.id}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            document_id: '00000000-0000-0000-0000-000000000000',
          }),
        }
      );

      expect(response.status).toBe(422);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for invalid JSON', async () => {
      const supabase = getSupabaseAdmin();

      const { data: obligation } = await supabase
        .from('obligations')
        .insert({
          company_id: testCompany.id,
          site_id: testSite.id,
          document_id: testDocument.id,
          module_id: testModule.id,
          obligation_title: 'Invalid JSON Test',
          original_text: 'Original text',
          category: 'MONITORING',
          status: 'PENDING',
          review_status: 'PENDING',
        })
        .select()
        .single();

      if (obligation) testObligations.push(obligation.id);

      const response = await fetch(
        `http://localhost:3000/api/v1/obligations/${obligation!.id}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: 'invalid json',
        }
      );

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for non-existent obligation', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await fetch(
        `http://localhost:3000/api/v1/obligations/${fakeId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            obligation_title: 'Updated Title',
          }),
        }
      );

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('NOT_FOUND');
    });

    it('should require authentication', async () => {
      const response = await fetch(
        `http://localhost:3000/api/v1/obligations/00000000-0000-0000-0000-000000000000`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            obligation_title: 'Updated Title',
          }),
        }
      );

      expect(response.status).toBe(401);
    });

    it('should increment version number on update', async () => {
      const supabase = getSupabaseAdmin();

      const { data: obligation } = await supabase
        .from('obligations')
        .insert({
          company_id: testCompany.id,
          site_id: testSite.id,
          document_id: testDocument.id,
          module_id: testModule.id,
          obligation_title: 'Version Test',
          original_text: 'Original text',
          category: 'MONITORING',
          status: 'PENDING',
          review_status: 'PENDING',
          version_number: 1,
        })
        .select()
        .single();

      if (obligation) testObligations.push(obligation.id);

      const response = await fetch(
        `http://localhost:3000/api/v1/obligations/${obligation!.id}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            obligation_title: 'Updated for Version',
          }),
        }
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.version_number).toBe(2);
    });
  });

  describe('Rate Limiting', () => {
    it('should include rate limit headers', async () => {
      const response = await fetch(`http://localhost:3000/api/v1/obligations`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.headers.get('X-Rate-Limit-Limit')).toBeDefined();
      expect(response.headers.get('X-Rate-Limit-Remaining')).toBeDefined();
      expect(response.headers.get('X-Rate-Limit-Reset')).toBeDefined();
    });
  });

  describe('Caching', () => {
    it('should include cache headers for list endpoint', async () => {
      const response = await fetch(`http://localhost:3000/api/v1/obligations`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const cacheControl = response.headers.get('Cache-Control');
      expect(cacheControl).toBeDefined();
      expect(cacheControl).toContain('private');
    });
  });
});
