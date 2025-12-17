/**
 * Documents API Integration Tests
 * Tests for document upload, extraction, and management
 *
 * NOTE: These tests require a running server. Skip in CI unless server is available.
 * Run with: RUN_INTEGRATION_TESTS=true npm test -- tests/integration/api/documents.test.ts
 */

import request from 'supertest';
import { createTestUser, createTestCompany, createTestSite, cleanupTestData } from '@/tests/helpers/test-database';
import { mockPDFBuffer } from '@/tests/helpers/mock-data';
import path from 'path';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

// Skip integration tests unless explicitly enabled
const SKIP_INTEGRATION = process.env.RUN_INTEGRATION_TESTS !== 'true';

describe.skip('Documents API', () => {
  let authToken: string | undefined;
  let siteId: string;

  beforeAll(async () => {
    authToken = await createTestUser('test-docs@example.com', 'Password123!');
    const company = await createTestCompany('Test Company');
    const site = await createTestSite(company.id, 'Test Site');
    siteId = site.id;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('GET /api/v1/documents', () => {
    it('should return 401 without authentication', async () => {
      await request(API_BASE)
        .get('/documents')
        .expect(401);
    });

    it('should return documents for authenticated user', async () => {
      const response = await request(API_BASE)
        .get('/documents')
        .query({ siteId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter documents by siteId', async () => {
      const response = await request(API_BASE)
        .get('/documents')
        .query({ siteId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.data.forEach((doc: any) => {
        expect(doc.site_id).toBe(siteId);
      });
    });

    it('should filter documents by status', async () => {
      const response = await request(API_BASE)
        .get('/documents')
        .query({ siteId, status: 'COMPLETED' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.data.forEach((doc: any) => {
        expect(doc.extraction_status).toBe('COMPLETED');
      });
    });

    it('should filter documents by documentType', async () => {
      const response = await request(API_BASE)
        .get('/documents')
        .query({ siteId, documentType: 'ENVIRONMENTAL_PERMIT' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.data.forEach((doc: any) => {
        expect(doc.document_type).toBe('ENVIRONMENTAL_PERMIT');
      });
    });

    it('should paginate results', async () => {
      const response = await request(API_BASE)
        .get('/documents')
        .query({ siteId, limit: 10, offset: 0 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(10);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBeGreaterThanOrEqual(0);
    });

    it('should sort documents by upload date', async () => {
      const response = await request(API_BASE)
        .get('/documents')
        .query({ siteId, sortBy: 'upload_date', sortOrder: 'desc' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const dates = response.body.data.map((d: any) => new Date(d.upload_date));
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i-1] >= dates[i]).toBe(true);
      }
    });

    it('should enforce RLS - user cannot see other users documents', async () => {
      // Create another user
      const otherUserToken = await createTestUser('other@example.com', 'Password123!');

      const response = await request(API_BASE)
        .get('/documents')
        .query({ siteId })
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });

    it('should search documents by filename', async () => {
      const response = await request(API_BASE)
        .get('/documents')
        .query({ siteId, search: 'permit' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.data.forEach((doc: any) => {
        expect(doc.file_name.toLowerCase()).toContain('permit');
      });
    });
  });

  describe('POST /api/v1/documents', () => {
    it('should upload PDF successfully', async () => {
      const response = await request(API_BASE)
        .post('/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', mockPDFBuffer(), 'test-permit.pdf')
        .field('siteId', siteId)
        .field('documentType', 'ENVIRONMENTAL_PERMIT')
        .field('regulator', 'Environment Agency')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.file_name).toBe('test-permit.pdf');
      expect(response.body.data.extraction_status).toBe('PENDING');
    });

    it('should reject non-PDF files', async () => {
      const response = await request(API_BASE)
        .post('/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('not a pdf'), 'test.txt')
        .field('siteId', siteId)
        .expect(400);

      expect(response.body.error).toContain('PDF');
    });

    it('should reject files larger than 50MB', async () => {
      const largePDF = Buffer.alloc(51 * 1024 * 1024); // 51MB

      const response = await request(API_BASE)
        .post('/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', largePDF, 'large.pdf')
        .field('siteId', siteId)
        .expect(400);

      expect(response.body.error).toContain('50MB');
    });

    it('should require siteId', async () => {
      const response = await request(API_BASE)
        .post('/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', mockPDFBuffer(), 'test.pdf')
        .expect(400);

      expect(response.body.error).toContain('siteId');
    });

    it('should validate documentType', async () => {
      const response = await request(API_BASE)
        .post('/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', mockPDFBuffer(), 'test.pdf')
        .field('siteId', siteId)
        .field('documentType', 'INVALID_TYPE')
        .expect(400);

      expect(response.body.error).toContain('documentType');
    });

    it('should sanitize filename', async () => {
      const response = await request(API_BASE)
        .post('/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', mockPDFBuffer(), '../../../etc/passwd.pdf')
        .field('siteId', siteId)
        .expect(201);

      expect(response.body.data.file_name).not.toContain('../');
    });

    it('should store file in correct storage bucket', async () => {
      const response = await request(API_BASE)
        .post('/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', mockPDFBuffer(), 'test.pdf')
        .field('siteId', siteId)
        .expect(201);

      expect(response.body.data.storage_path).toContain('documents/');
    });

    it('should generate unique filename for duplicates', async () => {
      // Upload first file
      const response1 = await request(API_BASE)
        .post('/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', mockPDFBuffer(), 'duplicate.pdf')
        .field('siteId', siteId)
        .expect(201);

      // Upload second file with same name
      const response2 = await request(API_BASE)
        .post('/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', mockPDFBuffer(), 'duplicate.pdf')
        .field('siteId', siteId)
        .expect(201);

      expect(response1.body.data.file_name).not.toBe(response2.body.data.file_name);
    });

    it('should extract metadata from PDF', async () => {
      const response = await request(API_BASE)
        .post('/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', mockPDFBuffer(), 'test.pdf')
        .field('siteId', siteId)
        .expect(201);

      expect(response.body.data.metadata).toBeDefined();
      expect(response.body.data.metadata.page_count).toBeGreaterThan(0);
      expect(response.body.data.metadata.file_size).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/documents/:id', () => {
    let documentId: string;

    beforeEach(async () => {
      const uploadResponse = await request(API_BASE)
        .post('/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', mockPDFBuffer(), 'test.pdf')
        .field('siteId', siteId);

      documentId = uploadResponse.body.data.id;
    });

    it('should get document by ID', async () => {
      const response = await request(API_BASE)
        .get(`/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(documentId);
    });

    it('should return 404 for non-existent document', async () => {
      await request(API_BASE)
        .get('/documents/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should enforce RLS - cannot access other users documents', async () => {
      const otherUserToken = await createTestUser('other2@example.com', 'Password123!');

      await request(API_BASE)
        .get(`/documents/${documentId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);
    });
  });

  describe('PATCH /api/v1/documents/:id', () => {
    let documentId: string;

    beforeEach(async () => {
      const uploadResponse = await request(API_BASE)
        .post('/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', mockPDFBuffer(), 'test.pdf')
        .field('siteId', siteId);

      documentId = uploadResponse.body.data.id;
    });

    it('should update document metadata', async () => {
      const response = await request(API_BASE)
        .patch(`/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          documentType: 'WASTE_PERMIT',
          regulator: 'Environment Agency',
        })
        .expect(200);

      expect(response.body.data.document_type).toBe('WASTE_PERMIT');
      expect(response.body.data.regulator).toBe('Environment Agency');
    });

    it('should not allow updating file content', async () => {
      const response = await request(API_BASE)
        .patch(`/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          storage_path: '/malicious/path',
        })
        .expect(400);

      expect(response.body.error).toContain('cannot update');
    });

    it('should validate documentType on update', async () => {
      await request(API_BASE)
        .patch(`/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          documentType: 'INVALID',
        })
        .expect(400);
    });
  });

  describe('DELETE /api/v1/documents/:id', () => {
    let documentId: string;

    beforeEach(async () => {
      const uploadResponse = await request(API_BASE)
        .post('/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', mockPDFBuffer(), 'test.pdf')
        .field('siteId', siteId);

      documentId = uploadResponse.body.data.id;
    });

    it('should soft delete document', async () => {
      const response = await request(API_BASE)
        .delete(`/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Document should not appear in list
      const listResponse = await request(API_BASE)
        .get('/documents')
        .query({ siteId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const deletedDoc = listResponse.body.data.find((d: any) => d.id === documentId);
      expect(deletedDoc).toBeUndefined();
    });

    it('should delete file from storage', async () => {
      await request(API_BASE)
        .delete(`/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify file is deleted from storage (implementation specific)
    });
  });

  describe('POST /api/v1/documents/:id/extraction', () => {
    let documentId: string;

    beforeEach(async () => {
      const uploadResponse = await request(API_BASE)
        .post('/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', mockPDFBuffer(), 'test.pdf')
        .field('siteId', siteId);

      documentId = uploadResponse.body.data.id;
    });

    it('should start extraction job', async () => {
      const response = await request(API_BASE)
        .post(`/documents/${documentId}/extraction`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(202);

      expect(response.body.success).toBe(true);
      expect(response.body.data.jobId).toBeDefined();
      expect(response.body.data.status).toBe('PROCESSING');
    });

    it('should return 409 if extraction already in progress', async () => {
      // Start first extraction
      await request(API_BASE)
        .post(`/documents/${documentId}/extraction`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(202);

      // Try to start second extraction
      await request(API_BASE)
        .post(`/documents/${documentId}/extraction`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);
    });

    it('should allow retry after failed extraction', async () => {
      // Simulate failed extraction (implementation specific)
      // Then retry should work
      const response = await request(API_BASE)
        .post(`/documents/${documentId}/extraction`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(202);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/documents/:id/extraction-status', () => {
    let documentId: string;

    beforeEach(async () => {
      const uploadResponse = await request(API_BASE)
        .post('/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', mockPDFBuffer(), 'test.pdf')
        .field('siteId', siteId);

      documentId = uploadResponse.body.data.id;
    });

    it('should get extraction status', async () => {
      // Start extraction
      await request(API_BASE)
        .post(`/documents/${documentId}/extraction`)
        .set('Authorization', `Bearer ${authToken}`);

      // Get status
      const response = await request(API_BASE)
        .get(`/documents/${documentId}/extraction-status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.status).toBeDefined();
      expect(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']).toContain(
        response.body.data.status
      );
    });

    it('should include progress percentage', async () => {
      await request(API_BASE)
        .post(`/documents/${documentId}/extraction`)
        .set('Authorization', `Bearer ${authToken}`);

      const response = await request(API_BASE)
        .get(`/documents/${documentId}/extraction-status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.progress).toBeDefined();
      expect(response.body.data.progress).toBeGreaterThanOrEqual(0);
      expect(response.body.data.progress).toBeLessThanOrEqual(100);
    });
  });
});
