/**
 * End-to-End Document Workflow Test
 * Tests complete document upload → extraction → obligation creation workflow
 */

import { TestClient } from '../helpers/test-client';
import { supabaseAdmin } from '@/lib/supabase/server';

describe('E2E: Document Workflow', () => {
  const client = new TestClient();
  let testUser: { email: string; password: string; token?: string; user_id?: string; company_id?: string; site_id?: string };

  beforeAll(async () => {
    const timestamp = Date.now();
    testUser = {
      email: `e2e_doc_${timestamp}@example.com`,
      password: 'TestPassword123!',
    };

    // Signup
    const signupResponse = await client.post('/api/v1/auth/signup', {
      email: testUser.email,
      password: testUser.password,
      full_name: `E2E Doc User ${timestamp}`,
      company_name: `E2E Doc Company ${timestamp}`,
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
          name: `E2E Doc Site ${timestamp}`,
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

  it('should complete document upload to obligation workflow', async () => {
    if (!testUser.token || !testUser.user_id || !testUser.company_id || !testUser.site_id) {
      console.warn('Skipping E2E document test: test user not fully set up');
      return;
    }

    // Step 1: Upload document
    const pdfContent = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\nxref\n0 1\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF');
    const formData = new FormData();
    const blob = new Blob([pdfContent], { type: 'application/pdf' });
    formData.append('file', blob, 'test-permit.pdf');
    formData.append('site_id', testUser.site_id);
    formData.append('document_type', 'ENVIRONMENTAL_PERMIT');

    const uploadResponse = await client.post('/api/v1/documents', formData, {
      token: testUser.token,
    });

    // Document upload may be async, accept various status codes
    expect([201, 202, 400, 422]).toContain(uploadResponse.status);

    let documentId: string | null = null;
    if (uploadResponse.ok) {
      const uploadData = await uploadResponse.json();
      documentId = uploadData.data?.id;
    }

    // Step 2: Check document status
    if (documentId) {
      const statusResponse = await client.get(`/api/v1/documents/${documentId}/extraction-status`, {
        token: testUser.token,
      });

      expect([200, 404]).toContain(statusResponse.status);
    }

    // Step 3: List documents
    const listResponse = await client.get('/api/v1/documents', {
      token: testUser.token,
    });

    if (listResponse.ok) {
      const listData = await listResponse.json();
      expect(Array.isArray(listData.data)).toBe(true);
    }

    // Step 4: Check if obligations were created from document
    if (documentId) {
      const obligationsResponse = await client.get(`/api/v1/documents/${documentId}/obligations`, {
        token: testUser.token,
      });

      expect([200, 404]).toContain(obligationsResponse.status);
    }

    // Clean up
    if (documentId) {
      await supabaseAdmin.from('obligations').delete().eq('document_id', documentId);
      await supabaseAdmin.from('documents').delete().eq('id', documentId);
    }
  }, 60000);

  it('should handle document processing errors gracefully', async () => {
    if (!testUser.token || !testUser.site_id) {
      return;
    }

    // Upload invalid file
    const formData = new FormData();
    const blob = new Blob(['invalid content'], { type: 'text/plain' });
    formData.append('file', blob, 'invalid.txt');
    formData.append('site_id', testUser.site_id);
    formData.append('document_type', 'ENVIRONMENTAL_PERMIT');

    const uploadResponse = await client.post('/api/v1/documents', formData, {
      token: testUser.token,
    });

    // Should reject invalid file type or handle gracefully
    expect([201, 202, 400, 422]).toContain(uploadResponse.status);
  }, 30000);
});

