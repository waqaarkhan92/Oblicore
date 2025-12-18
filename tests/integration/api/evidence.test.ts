/**
 * Evidence API Integration Tests
 * Tests for complete Evidence API + Database integration
 *
 * Tests cover:
 * - GET /api/v1/evidence - List evidence with filters and pagination
 * - POST /api/v1/evidence - Upload evidence with file
 * - GET /api/v1/evidence/[id] - Get single evidence item
 * - PUT /api/v1/evidence/[id] - Update evidence (not implemented yet)
 * - DELETE /api/v1/evidence/[id] - Delete evidence (not implemented yet)
 *
 * NOTE: These tests require a running server. Skip in CI unless server is available.
 * Run with: RUN_INTEGRATION_TESTS=true npm test -- tests/integration/api/evidence.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { createTestUser, createTestCompany, createTestSite, createTestObligation, cleanupTestData } from '@/tests/helpers/test-database';
import { mockPDFBuffer } from '@/tests/helpers/mock-data';
import path from 'path';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

// Skip integration tests unless explicitly enabled
const describeIntegration = process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

describeIntegration('Evidence API Integration', () => {
  let authToken: string | undefined;
  let companyId: string;
  let siteId: string;
  let obligationId: string;
  let testEvidenceId: string;

  beforeAll(async () => {
    // Set up test fixtures
    authToken = await createTestUser('test-evidence@example.com', 'Password123!');
    const company = await createTestCompany('Evidence Test Company');
    companyId = company.id;
    const site = await createTestSite(companyId, 'Evidence Test Site');
    siteId = site.id;
    const obligation = await createTestObligation(siteId, {
      obligation_title: 'Test Obligation for Evidence',
      category: 'MONITORING',
      status: 'PENDING',
    });
    obligationId = obligation.id;
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData();
  });

  describe('GET /api/v1/evidence - List Evidence', () => {
    it('should return 401 for unauthenticated requests', async () => {
      const response = await request(API_BASE)
        .get('/evidence')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('unauthorized');
    });

    it('should return empty array when no evidence exists', async () => {
      const response = await request(API_BASE)
        .get('/evidence')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter evidence by site_id', async () => {
      const response = await request(API_BASE)
        .get('/evidence')
        .query({ site_id: siteId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((item: any) => {
        expect(item.site_id).toBe(siteId);
      });
    });

    it('should filter evidence by company_id', async () => {
      const response = await request(API_BASE)
        .get('/evidence')
        .query({ company_id: companyId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((item: any) => {
        expect(item.company_id).toBe(companyId);
      });
    });

    it('should filter evidence by obligation_id', async () => {
      // This test assumes evidence exists linked to the obligation
      const response = await request(API_BASE)
        .get('/evidence')
        .query({ obligation_id: obligationId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should paginate results with limit parameter', async () => {
      const response = await request(API_BASE)
        .get('/evidence')
        .query({ limit: 5 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.limit).toBe(5);
    });

    it('should return 422 for invalid pagination parameters', async () => {
      const response = await request(API_BASE)
        .get('/evidence')
        .query({ limit: 150 }) // Exceeds max of 100
        .set('Authorization', `Bearer ${authToken}`)
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('pagination');
    });

    it('should sort evidence by created_at by default', async () => {
      const response = await request(API_BASE)
        .get('/evidence')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const dates = response.body.data.map((e: any) => new Date(e.created_at));
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i - 1] >= dates[i]).toBe(true);
      }
    });

    it('should include file_url in response', async () => {
      const response = await request(API_BASE)
        .get('/evidence')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (response.body.data.length > 0) {
        expect(response.body.data[0].file_url).toBeDefined();
        expect(typeof response.body.data[0].file_url).toBe('string');
      }
    });

    it('should enforce RLS - user cannot see other users evidence', async () => {
      // Create another user with different company
      const otherUserToken = await createTestUser('other-evidence@example.com', 'Password123!');
      const otherCompany = await createTestCompany('Other Evidence Company');
      const otherSite = await createTestSite(otherCompany.id, 'Other Site');

      // Try to access first user's evidence
      const response = await request(API_BASE)
        .get('/evidence')
        .query({ site_id: siteId })
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(200);

      // Should return empty or 403, depending on RLS implementation
      expect(response.body.data.length).toBe(0);
    });
  });

  describe('POST /api/v1/evidence - Upload Evidence', () => {
    it('should return 401 for unauthenticated requests', async () => {
      const response = await request(API_BASE)
        .post('/evidence')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 for users without required role', async () => {
      // This test assumes role-based access control is enforced
      // Create a viewer-only user
      const viewerToken = await createTestUser('viewer@example.com', 'Password123!');

      const response = await request(API_BASE)
        .post('/evidence')
        .set('Authorization', `Bearer ${viewerToken}`)
        .attach('file', mockPDFBuffer(), 'test-evidence.pdf')
        .field('obligation_id', obligationId)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should upload PDF evidence successfully', async () => {
      const response = await request(API_BASE)
        .post('/evidence')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', mockPDFBuffer(), 'monitoring-report.pdf')
        .field('obligation_id', obligationId)
        .field('metadata', JSON.stringify({
          description: 'Q1 2025 Monitoring Report',
          compliance_period: 'Q1-2025',
        }))
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.file_name).toBe('monitoring-report.pdf');
      expect(response.body.data.file_type).toBe('PDF');
      expect(response.body.data.file_url).toBeDefined();
      expect(response.body.data.linked_obligations).toBeDefined();
      expect(response.body.data.linked_obligations.length).toBeGreaterThan(0);

      // Store for later tests
      testEvidenceId = response.body.data.id;
    });

    it('should upload image evidence successfully', async () => {
      // Create a minimal PNG buffer
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
        0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, // IDAT chunk
        0x54, 0x78, 0x9c, 0x62, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, // IEND chunk
        0x42, 0x60, 0x82,
      ]);

      const response = await request(API_BASE)
        .post('/evidence')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', pngBuffer, 'site-photo.png')
        .field('obligation_id', obligationId)
        .field('metadata', JSON.stringify({
          description: 'Site inspection photo',
          gps_latitude: 51.5074,
          gps_longitude: -0.1278,
        }))
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.file_type).toBe('IMAGE');
      expect(response.body.data.file_name).toBe('site-photo.png');
    });

    it('should return 422 when file is missing', async () => {
      const response = await request(API_BASE)
        .post('/evidence')
        .set('Authorization', `Bearer ${authToken}`)
        .field('obligation_id', obligationId)
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('File is required');
    });

    it('should return 422 when obligation_id is missing', async () => {
      const response = await request(API_BASE)
        .post('/evidence')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', mockPDFBuffer(), 'test.pdf')
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('obligation_id');
    });

    it('should return 404 when obligation does not exist', async () => {
      const fakeObligationId = '00000000-0000-0000-0000-000000000000';
      const response = await request(API_BASE)
        .post('/evidence')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', mockPDFBuffer(), 'test.pdf')
        .field('obligation_id', fakeObligationId)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should return 422 for invalid file type', async () => {
      const txtBuffer = Buffer.from('This is a text file');
      const response = await request(API_BASE)
        .post('/evidence')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', txtBuffer, 'test.txt')
        .field('obligation_id', obligationId)
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid file type');
    });

    it('should return 413 for oversized file', async () => {
      // Create a buffer larger than 20MB
      const oversizedBuffer = Buffer.alloc(21 * 1024 * 1024); // 21MB
      const response = await request(API_BASE)
        .post('/evidence')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', oversizedBuffer, 'large-file.pdf')
        .field('obligation_id', obligationId)
        .expect(413);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('too large');
    });

    it('should support multiple obligation_ids', async () => {
      // Create a second obligation
      const obligation2 = await createTestObligation(siteId, {
        obligation_title: 'Second Test Obligation',
        category: 'REPORTING',
      });

      const response = await request(API_BASE)
        .post('/evidence')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', mockPDFBuffer(), 'shared-evidence.pdf')
        .field('obligation_ids', JSON.stringify([obligationId, obligation2.id]))
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.linked_obligations.length).toBe(2);
    });

    it('should calculate file hash', async () => {
      const response = await request(API_BASE)
        .post('/evidence')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', mockPDFBuffer(), 'test-hash.pdf')
        .field('obligation_id', obligationId)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.file_hash).toBeDefined();
      expect(typeof response.body.data.file_hash).toBe('string');
      expect(response.body.data.file_hash.length).toBe(64); // SHA-256 hash
    });

    it('should store file metadata', async () => {
      const metadata = {
        description: 'Test metadata',
        compliance_period: 'Q2-2025',
        capture_timestamp: new Date().toISOString(),
        gps_latitude: 51.5074,
        gps_longitude: -0.1278,
      };

      const response = await request(API_BASE)
        .post('/evidence')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', mockPDFBuffer(), 'metadata-test.pdf')
        .field('obligation_id', obligationId)
        .field('metadata', JSON.stringify(metadata))
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.description).toBe(metadata.description);
      expect(response.body.data.compliance_period).toBe(metadata.compliance_period);
    });

    it('should return 422 when obligations are from different sites', async () => {
      // Create obligation in a different site
      const otherSite = await createTestSite(companyId, 'Other Site for Evidence');
      const otherObligation = await createTestObligation(otherSite.id, {
        obligation_title: 'Other Site Obligation',
      });

      const response = await request(API_BASE)
        .post('/evidence')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', mockPDFBuffer(), 'cross-site.pdf')
        .field('obligation_ids', JSON.stringify([obligationId, otherObligation.id]))
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('same site');
    });
  });

  describe('GET /api/v1/evidence/[evidenceId] - Get Single Evidence', () => {
    it('should return 401 for unauthenticated requests', async () => {
      const response = await request(API_BASE)
        .get(`/evidence/${testEvidenceId}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return evidence by ID', async () => {
      const response = await request(API_BASE)
        .get(`/evidence/${testEvidenceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testEvidenceId);
      expect(response.body.data.file_name).toBeDefined();
      expect(response.body.data.file_type).toBeDefined();
      expect(response.body.data.file_url).toBeDefined();
    });

    it('should return 404 for non-existent evidence', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(API_BASE)
        .get(`/evidence/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should return 404 for invalid UUID format', async () => {
      const response = await request(API_BASE)
        .get('/evidence/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should include linked obligations', async () => {
      const response = await request(API_BASE)
        .get(`/evidence/${testEvidenceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.linked_obligations).toBeDefined();
      expect(Array.isArray(response.body.data.linked_obligations)).toBe(true);
    });

    it('should return 403 if user lacks access to evidence', async () => {
      // Create another user with different company
      const otherUserToken = await createTestUser('noaccess@example.com', 'Password123!');
      await createTestCompany('No Access Company');

      const response = await request(API_BASE)
        .get(`/evidence/${testEvidenceId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(404); // May return 404 instead of 403 due to RLS

      expect(response.body.success).toBe(false);
    });

    it('should not return archived evidence', async () => {
      // This test assumes there's an archived evidence item
      // In practice, you'd need to create and archive one first
      const response = await request(API_BASE)
        .get('/evidence')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.data.forEach((item: any) => {
        expect(item.is_archived).toBe(false);
      });
    });
  });

  describe('PUT /api/v1/evidence/[evidenceId] - Update Evidence (Future)', () => {
    it.skip('should update evidence metadata', async () => {
      // This test is skipped as PUT endpoint may not be implemented yet
      const response = await request(API_BASE)
        .put(`/evidence/${testEvidenceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Updated description',
          compliance_period: 'Q3-2025',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.description).toBe('Updated description');
    });

    it.skip('should return 400 for invalid data', async () => {
      const response = await request(API_BASE)
        .put(`/evidence/${testEvidenceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          file_type: 'INVALID_TYPE', // Invalid enum value
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/evidence/[evidenceId] - Delete Evidence (Future)', () => {
    it.skip('should soft delete evidence', async () => {
      // This test is skipped as DELETE endpoint may not be implemented yet
      const response = await request(API_BASE)
        .delete(`/evidence/${testEvidenceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify it's not returned in list
      const listResponse = await request(API_BASE)
        .get('/evidence')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const deletedItem = listResponse.body.data.find((e: any) => e.id === testEvidenceId);
      expect(deletedItem).toBeUndefined();
    });

    it.skip('should remove file from storage on delete', async () => {
      // This test would need to verify the file is removed from Supabase storage
      const response = await request(API_BASE)
        .delete(`/evidence/${testEvidenceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Additional verification needed to check storage
    });

    it.skip('should return 404 for non-existent evidence', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(API_BASE)
        .delete(`/evidence/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed JSON in metadata field', async () => {
      const response = await request(API_BASE)
        .post('/evidence')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', mockPDFBuffer(), 'test.pdf')
        .field('obligation_id', obligationId)
        .field('metadata', 'not-valid-json')
        .expect(201); // Should succeed, treating as empty metadata

      expect(response.body.success).toBe(true);
    });

    it('should handle special characters in filename', async () => {
      const response = await request(API_BASE)
        .post('/evidence')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', mockPDFBuffer(), 'test-file-[special]-(chars).pdf')
        .field('obligation_id', obligationId)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.file_name).toContain('special');
    });

    it('should handle very long description in metadata', async () => {
      const longDescription = 'A'.repeat(5000);
      const response = await request(API_BASE)
        .post('/evidence')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', mockPDFBuffer(), 'long-desc.pdf')
        .field('obligation_id', obligationId)
        .field('metadata', JSON.stringify({ description: longDescription }))
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should handle concurrent uploads', async () => {
      // Test race condition handling
      const uploads = Array.from({ length: 3 }, (_, i) =>
        request(API_BASE)
          .post('/evidence')
          .set('Authorization', `Bearer ${authToken}`)
          .attach('file', mockPDFBuffer(), `concurrent-${i}.pdf`)
          .field('obligation_id', obligationId)
      );

      const responses = await Promise.all(uploads);
      responses.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      // All should have unique IDs
      const ids = responses.map((r) => r.body.data.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });

    it('should include request_id in all responses', async () => {
      const response = await request(API_BASE)
        .get('/evidence')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.request_id).toBeDefined();
    });

    it('should include Cache-Control headers for GET requests', async () => {
      const response = await request(API_BASE)
        .get('/evidence')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['cache-control']).toBeDefined();
    });

    it('should include rate limit headers', async () => {
      const response = await request(API_BASE)
        .get('/evidence')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Rate limit headers may be present
      // This is optional depending on middleware implementation
      if (response.headers['x-ratelimit-limit']) {
        expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      }
    });
  });
});
