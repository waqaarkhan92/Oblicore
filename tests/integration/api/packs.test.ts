/**
 * Packs API Integration Tests
 * Tests for audit pack generation, retrieval, and management
 *
 * NOTE: These tests require a running server. Skip in CI unless server is available.
 * Run with: RUN_INTEGRATION_TESTS=true npm test -- tests/integration/api/packs.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createTestUser, createTestCompany, createTestSite, cleanupTestData, testDb } from '../../helpers/test-database';

const API_BASE = '/api/v1';

// Skip integration tests unless explicitly enabled
const describeIntegration = process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

describeIntegration('Packs API', () => {
  let authToken: string;
  let testCompanyId: string;
  let testSiteId: string;
  let testDocumentId: string;

  beforeAll(async () => {
    // Create test fixtures
    authToken = await createTestUser('test-packs@example.com', 'Password123!');
    const company = await createTestCompany('Test Pack Company');
    testCompanyId = company.id;
    const site = await createTestSite(testCompanyId, 'Test Pack Site');
    testSiteId = site.id;

    // Create a test document for pack generation
    const { data: document } = await testDb
      .from('documents')
      .insert({
        company_id: testCompanyId,
        site_id: testSiteId,
        file_name: 'test-permit.pdf',
        file_type: 'PDF',
        document_type: 'ENVIRONMENTAL_PERMIT',
        storage_path: 'documents/test-permit.pdf',
        file_size_bytes: 1024,
        extraction_status: 'COMPLETED',
      })
      .select()
      .single();

    if (document) {
      testDocumentId = document.id;
    }
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData();
  });

  describe('GET /api/v1/packs', () => {
    let createdPackId: string;

    beforeAll(async () => {
      // Create a test pack for listing tests
      const { data: pack } = await testDb
        .from('audit_packs')
        .insert({
          company_id: testCompanyId,
          site_id: testSiteId,
          document_id: testDocumentId,
          pack_type: 'AUDIT_PACK',
          title: 'Test Audit Pack',
          date_range_start: '2025-01-01',
          date_range_end: '2025-12-31',
          storage_path: 'pending',
          file_size_bytes: 0,
          generated_by: 'test-user-id',
        })
        .select()
        .single();

      if (pack) {
        createdPackId = pack.id;
      }
    });

    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE)
        .get('/packs')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return packs for authenticated user', async () => {
      const response = await request(API_BASE)
        .get('/packs')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter packs by company_id', async () => {
      const response = await request(API_BASE)
        .get('/packs')
        .query({ company_id: testCompanyId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((pack: any) => {
        expect(pack.company_id).toBe(testCompanyId);
      });
    });

    it('should filter packs by site_id', async () => {
      const response = await request(API_BASE)
        .get('/packs')
        .query({ site_id: testSiteId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((pack: any) => {
        expect(pack.site_id).toBe(testSiteId);
      });
    });

    it('should filter packs by pack_type', async () => {
      const response = await request(API_BASE)
        .get('/packs')
        .query({ pack_type: 'AUDIT_PACK' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((pack: any) => {
        expect(pack.pack_type).toBe('AUDIT_PACK');
      });
    });

    it('should derive status from storage_path', async () => {
      const response = await request(API_BASE)
        .get('/packs')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((pack: any) => {
        expect(pack.status).toBeDefined();
        expect(['GENERATING', 'COMPLETED']).toContain(pack.status);

        if (pack.storage_path === 'pending') {
          expect(pack.status).toBe('GENERATING');
        } else {
          expect(pack.status).toBe('COMPLETED');
        }
      });
    });

    it('should include file_url for completed packs', async () => {
      // Create a completed pack
      const { data: completedPack } = await testDb
        .from('audit_packs')
        .insert({
          company_id: testCompanyId,
          site_id: testSiteId,
          pack_type: 'AUDIT_PACK',
          title: 'Completed Pack',
          date_range_start: '2025-01-01',
          date_range_end: '2025-12-31',
          storage_path: 'packs/completed-pack.pdf',
          file_size_bytes: 2048,
          generated_by: 'test-user-id',
        })
        .select()
        .single();

      const response = await request(API_BASE)
        .get('/packs')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const completedPackInList = response.body.data.find((p: any) => p.id === completedPack?.id);
      if (completedPackInList) {
        expect(completedPackInList.file_url).toBeDefined();
        expect(completedPackInList.file_url).toContain('completed-pack.pdf');
      }
    });

    it('should paginate results', async () => {
      const response = await request(API_BASE)
        .get('/packs')
        .query({ limit: 5 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
      expect(response.body.pagination).toBeDefined();
    });

    it('should support cursor-based pagination', async () => {
      const firstPage = await request(API_BASE)
        .get('/packs')
        .query({ limit: 2 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (firstPage.body.pagination?.next_cursor) {
        const secondPage = await request(API_BASE)
          .get('/packs')
          .query({ limit: 2, cursor: firstPage.body.pagination.next_cursor })
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(secondPage.body.success).toBe(true);
        // Ensure different results
        const firstIds = firstPage.body.data.map((p: any) => p.id);
        const secondIds = secondPage.body.data.map((p: any) => p.id);
        const overlap = firstIds.filter((id: string) => secondIds.includes(id));
        expect(overlap.length).toBe(0);
      }
    });

    it('should filter by date_range_start', async () => {
      const response = await request(API_BASE)
        .get('/packs')
        .query({ 'date_range_start[gte]': '2025-01-01' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((pack: any) => {
        expect(new Date(pack.date_range_start) >= new Date('2025-01-01')).toBe(true);
      });
    });

    it('should filter by date_range_end', async () => {
      const response = await request(API_BASE)
        .get('/packs')
        .query({ 'date_range_end[lte]': '2025-12-31' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((pack: any) => {
        expect(new Date(pack.date_range_end) <= new Date('2025-12-31')).toBe(true);
      });
    });
  });

  describe('POST /api/v1/packs/generate', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE)
        .post('/packs/generate')
        .send({
          pack_type: 'AUDIT_PACK',
          company_id: testCompanyId,
          site_id: testSiteId,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should create AUDIT_PACK', async () => {
      const response = await request(API_BASE)
        .post('/packs/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pack_type: 'AUDIT_PACK',
          company_id: testCompanyId,
          site_id: testSiteId,
          date_range_start: '2025-01-01',
          date_range_end: '2025-12-31',
          recipient_type: 'INTERNAL',
          purpose: 'Internal audit review',
        })
        .expect(202);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pack_id).toBeDefined();
      expect(response.body.data.pack_type).toBe('AUDIT_PACK');
      expect(response.body.data.status).toBe('GENERATING');
      expect(response.body.data.message).toContain('generation started');
    });

    it('should create REGULATOR_INSPECTION pack', async () => {
      const response = await request(API_BASE)
        .post('/packs/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pack_type: 'REGULATOR_INSPECTION',
          company_id: testCompanyId,
          site_id: testSiteId,
          date_range_start: '2025-01-01',
          date_range_end: '2025-12-31',
          recipient_type: 'REGULATOR',
          recipient_name: 'Environment Agency',
          purpose: 'Pre-inspection preparation',
        })
        .expect(202);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pack_type).toBe('REGULATOR_INSPECTION');
    });

    it('should create TENDER_CLIENT_ASSURANCE pack', async () => {
      const response = await request(API_BASE)
        .post('/packs/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pack_type: 'TENDER_CLIENT_ASSURANCE',
          company_id: testCompanyId,
          site_id: testSiteId,
          recipient_type: 'CLIENT',
          recipient_name: 'ABC Corporation',
        })
        .expect(202);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pack_type).toBe('TENDER_CLIENT_ASSURANCE');
    });

    it('should create BOARD_MULTI_SITE_RISK pack without site_id', async () => {
      const response = await request(API_BASE)
        .post('/packs/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pack_type: 'BOARD_MULTI_SITE_RISK',
          company_id: testCompanyId,
          recipient_type: 'BOARD',
          purpose: 'Quarterly board review',
        })
        .expect(202);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pack_type).toBe('BOARD_MULTI_SITE_RISK');
    });

    it('should create INSURER_BROKER pack', async () => {
      const response = await request(API_BASE)
        .post('/packs/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pack_type: 'INSURER_BROKER',
          company_id: testCompanyId,
          site_id: testSiteId,
          recipient_type: 'INSURER',
          recipient_name: 'XYZ Insurance',
        })
        .expect(202);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pack_type).toBe('INSURER_BROKER');
    });

    it('should return 422 for invalid pack_type', async () => {
      const response = await request(API_BASE)
        .post('/packs/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pack_type: 'INVALID_TYPE',
          company_id: testCompanyId,
          site_id: testSiteId,
        })
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid pack_type');
    });

    it('should return 422 when pack_type is missing', async () => {
      const response = await request(API_BASE)
        .post('/packs/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          company_id: testCompanyId,
          site_id: testSiteId,
        })
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('pack_type is required');
    });

    it('should return 422 when company_id is missing', async () => {
      const response = await request(API_BASE)
        .post('/packs/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pack_type: 'AUDIT_PACK',
          site_id: testSiteId,
        })
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('company_id is required');
    });

    it('should return 422 when site_id is missing for non-BOARD pack types', async () => {
      const response = await request(API_BASE)
        .post('/packs/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pack_type: 'AUDIT_PACK',
          company_id: testCompanyId,
        })
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('site_id is required');
    });

    it('should return 404 for non-existent company', async () => {
      const response = await request(API_BASE)
        .post('/packs/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pack_type: 'AUDIT_PACK',
          company_id: '00000000-0000-0000-0000-000000000000',
          site_id: testSiteId,
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Company not found');
    });

    it('should return 404 for non-existent site', async () => {
      const response = await request(API_BASE)
        .post('/packs/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pack_type: 'AUDIT_PACK',
          company_id: testCompanyId,
          site_id: '00000000-0000-0000-0000-000000000000',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Site not found');
    });

    it('should trigger pack generation job', async () => {
      const response = await request(API_BASE)
        .post('/packs/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pack_type: 'AUDIT_PACK',
          company_id: testCompanyId,
          site_id: testSiteId,
        })
        .expect(202);

      const packId = response.body.data.pack_id;

      // Verify background job was created
      const { data: job } = await testDb
        .from('background_jobs')
        .select('*')
        .eq('entity_id', packId)
        .eq('job_type', 'AUDIT_PACK_GENERATION')
        .single();

      expect(job).toBeDefined();
      expect(job?.status).toBe('PENDING');
    });

    it('should use default date range when not provided', async () => {
      const response = await request(API_BASE)
        .post('/packs/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pack_type: 'AUDIT_PACK',
          company_id: testCompanyId,
          site_id: testSiteId,
        })
        .expect(202);

      const packId = response.body.data.pack_id;

      // Verify pack has default date range (last 12 months)
      const { data: pack } = await testDb
        .from('audit_packs')
        .select('date_range_start, date_range_end')
        .eq('id', packId)
        .single();

      expect(pack).toBeDefined();
      expect(pack?.date_range_start).toBeDefined();
      expect(pack?.date_range_end).toBeDefined();
    });

    it('should support custom filters', async () => {
      const filters = {
        status: ['COMPLETED', 'OVERDUE'],
        category: ['MONITORING', 'REPORTING'],
      };

      const response = await request(API_BASE)
        .post('/packs/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pack_type: 'AUDIT_PACK',
          company_id: testCompanyId,
          site_id: testSiteId,
          filters,
        })
        .expect(202);

      const packId = response.body.data.pack_id;

      // Verify filters were saved
      const { data: pack } = await testDb
        .from('audit_packs')
        .select('filters_applied')
        .eq('id', packId)
        .single();

      expect(pack?.filters_applied).toEqual(filters);
    });

    it('should include document_id when provided', async () => {
      const response = await request(API_BASE)
        .post('/packs/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pack_type: 'AUDIT_PACK',
          company_id: testCompanyId,
          site_id: testSiteId,
          document_id: testDocumentId,
        })
        .expect(202);

      const packId = response.body.data.pack_id;

      // Verify document_id was saved
      const { data: pack } = await testDb
        .from('audit_packs')
        .select('document_id')
        .eq('id', packId)
        .single();

      expect(pack?.document_id).toBe(testDocumentId);
    });
  });

  describe('GET /api/v1/packs/[packId]', () => {
    let testPackId: string;
    let completedPackId: string;

    beforeAll(async () => {
      // Create a test pack for detail tests
      const { data: pack } = await testDb
        .from('audit_packs')
        .insert({
          company_id: testCompanyId,
          site_id: testSiteId,
          pack_type: 'AUDIT_PACK',
          title: 'Test Pack Detail',
          date_range_start: '2025-01-01',
          date_range_end: '2025-12-31',
          storage_path: 'pending',
          file_size_bytes: 0,
          generated_by: 'test-user-id',
        })
        .select()
        .single();

      if (pack) {
        testPackId = pack.id;
      }

      // Create a completed pack
      const { data: completedPack } = await testDb
        .from('audit_packs')
        .insert({
          company_id: testCompanyId,
          site_id: testSiteId,
          pack_type: 'REGULATOR_INSPECTION',
          title: 'Completed Pack',
          date_range_start: '2025-01-01',
          date_range_end: '2025-12-31',
          storage_path: 'packs/completed-pack.pdf',
          file_size_bytes: 2048,
          status: 'COMPLETED',
          generated_by: 'test-user-id',
        })
        .select()
        .single();

      if (completedPack) {
        completedPackId = completedPack.id;
      }
    });

    it('should return 401 without authentication', async () => {
      const response = await request(API_BASE)
        .get(`/packs/${testPackId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return pack by ID', async () => {
      const response = await request(API_BASE)
        .get(`/packs/${testPackId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testPackId);
      expect(response.body.data.pack_type).toBe('AUDIT_PACK');
      expect(response.body.data.title).toBe('Test Pack Detail');
    });

    it('should include all pack fields', async () => {
      const response = await request(API_BASE)
        .get(`/packs/${testPackId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const pack = response.body.data;
      expect(pack.id).toBeDefined();
      expect(pack.company_id).toBeDefined();
      expect(pack.site_id).toBeDefined();
      expect(pack.pack_type).toBeDefined();
      expect(pack.title).toBeDefined();
      expect(pack.date_range_start).toBeDefined();
      expect(pack.date_range_end).toBeDefined();
      expect(pack.storage_path).toBeDefined();
      expect(pack.created_at).toBeDefined();
    });

    it('should include evidence_count and obligation_count', async () => {
      const response = await request(API_BASE)
        .get(`/packs/${testPackId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.evidence_count).toBeDefined();
      expect(response.body.data.obligation_count).toBeDefined();
      expect(typeof response.body.data.evidence_count).toBe('number');
      expect(typeof response.body.data.obligation_count).toBe('number');
    });

    it('should return download URL when pack is completed', async () => {
      const response = await request(API_BASE)
        .get(`/packs/${completedPackId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.file_url).toBeDefined();
      expect(response.body.data.file_url).toContain('completed-pack.pdf');
    });

    it('should not return download URL when pack is generating', async () => {
      const response = await request(API_BASE)
        .get(`/packs/${testPackId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // file_url should be empty or undefined for pending packs
      expect(response.body.data.file_url).toBeFalsy();
    });

    it('should return 404 for non-existent pack', async () => {
      const response = await request(API_BASE)
        .get('/packs/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Pack not found');
    });

    it('should return 404 for invalid pack ID format', async () => {
      const response = await request(API_BASE)
        .get('/packs/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should enforce RLS - cannot access other company packs', async () => {
      // Create another user with different company
      const otherUserToken = await createTestUser('other-pack-user@example.com', 'Password123!');
      const otherCompany = await createTestCompany('Other Company');
      const otherSite = await createTestSite(otherCompany.id, 'Other Site');

      // Create a pack for the other company
      const { data: otherPack } = await testDb
        .from('audit_packs')
        .insert({
          company_id: otherCompany.id,
          site_id: otherSite.id,
          pack_type: 'AUDIT_PACK',
          title: 'Other Company Pack',
          date_range_start: '2025-01-01',
          date_range_end: '2025-12-31',
          storage_path: 'pending',
          file_size_bytes: 0,
        })
        .select()
        .single();

      // Try to access other company's pack with original user token
      const response = await request(API_BASE)
        .get(`/packs/${otherPack?.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Pack Types Validation', () => {
    it('should accept all valid pack types', async () => {
      const validTypes = [
        'AUDIT_PACK',
        'REGULATOR_INSPECTION',
        'TENDER_CLIENT_ASSURANCE',
        'BOARD_MULTI_SITE_RISK',
        'INSURER_BROKER',
      ];

      for (const packType of validTypes) {
        const siteId = packType === 'BOARD_MULTI_SITE_RISK' ? undefined : testSiteId;

        const response = await request(API_BASE)
          .post('/packs/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            pack_type: packType,
            company_id: testCompanyId,
            site_id: siteId,
          })
          .expect(202);

        expect(response.body.success).toBe(true);
        expect(response.body.data.pack_type).toBe(packType);
      }
    });

    it('should reject unknown pack types', async () => {
      const invalidTypes = [
        'UNKNOWN_PACK',
        'CUSTOM_PACK',
        'TEST_PACK',
      ];

      for (const packType of invalidTypes) {
        const response = await request(API_BASE)
          .post('/packs/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            pack_type: packType,
            company_id: testCompanyId,
            site_id: testSiteId,
          })
          .expect(422);

        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('Pack Generation with Metadata', () => {
    it('should store recipient information', async () => {
      const response = await request(API_BASE)
        .post('/packs/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pack_type: 'REGULATOR_INSPECTION',
          company_id: testCompanyId,
          site_id: testSiteId,
          recipient_type: 'REGULATOR',
          recipient_name: 'Environment Agency',
          purpose: 'Annual inspection preparation',
        })
        .expect(202);

      const packId = response.body.data.pack_id;

      const { data: pack } = await testDb
        .from('audit_packs')
        .select('recipient_type, recipient_name, purpose')
        .eq('id', packId)
        .single();

      expect(pack?.recipient_type).toBe('REGULATOR');
      expect(pack?.recipient_name).toBe('Environment Agency');
      expect(pack?.purpose).toBe('Annual inspection preparation');
    });

    it('should default to INTERNAL recipient when not specified', async () => {
      const response = await request(API_BASE)
        .post('/packs/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pack_type: 'AUDIT_PACK',
          company_id: testCompanyId,
          site_id: testSiteId,
        })
        .expect(202);

      const packId = response.body.data.pack_id;

      const { data: pack } = await testDb
        .from('audit_packs')
        .select('recipient_type')
        .eq('id', packId)
        .single();

      expect(pack?.recipient_type).toBe('INTERNAL');
    });

    it('should record generation_trigger as MANUAL', async () => {
      const response = await request(API_BASE)
        .post('/packs/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pack_type: 'AUDIT_PACK',
          company_id: testCompanyId,
          site_id: testSiteId,
        })
        .expect(202);

      const packId = response.body.data.pack_id;

      const { data: pack } = await testDb
        .from('audit_packs')
        .select('generation_trigger')
        .eq('id', packId)
        .single();

      expect(pack?.generation_trigger).toBe('MANUAL');
    });
  });
});
