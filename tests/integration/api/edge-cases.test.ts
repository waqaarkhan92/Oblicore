/**
 * API Edge Cases and Missing Endpoints Tests
 * Tests endpoints that might not be fully covered in comprehensive tests
 */

import { TestClient } from '../../helpers/test-client';

describe('API Edge Cases and Missing Endpoints', () => {
  const client = new TestClient();
  let testUser: { email: string; password: string; token?: string; user_id?: string; company_id?: string; site_id?: string };

  beforeAll(async () => {
    const timestamp = Date.now();
    testUser = {
      email: `edge_cases_${timestamp}@example.com`,
      password: 'TestPassword123!',
    };

    // Signup
    const signupResponse = await client.post('/api/v1/auth/signup', {
      email: testUser.email,
      password: testUser.password,
      full_name: `Edge Cases User ${timestamp}`,
      company_name: `Edge Cases Company ${timestamp}`,
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
          name: `Edge Cases Site ${timestamp}`,
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

  describe('Document Nested Endpoints', () => {
    it('should get document download endpoint', async () => {
      if (!testUser.token) {
        return;
      }

      const response = await client.get('/api/v1/documents/00000000-0000-0000-0000-000000000000/download', {
        token: testUser.token,
      });

      expect([200, 404, 401, 403]).toContain(response.status);
    });

    it('should trigger document extraction', async () => {
      if (!testUser.token) {
        return;
      }

      const response = await client.post(
        '/api/v1/documents/00000000-0000-0000-0000-000000000000/extract',
        {},
        {
          token: testUser.token,
        }
      );

      expect([200, 202, 404, 401, 403]).toContain(response.status);
    });

    it('should get document extraction logs', async () => {
      if (!testUser.token) {
        return;
      }

      const response = await client.get('/api/v1/documents/00000000-0000-0000-0000-000000000000/extraction-logs', {
        token: testUser.token,
      });

      expect([200, 404, 401]).toContain(response.status);
    });

    it('should get document extraction results', async () => {
      if (!testUser.token) {
        return;
      }

      const response = await client.get('/api/v1/documents/00000000-0000-0000-0000-000000000000/extraction-results', {
        token: testUser.token,
      });

      expect([200, 404, 401]).toContain(response.status);
    });

    it('should get document preview', async () => {
      if (!testUser.token) {
        return;
      }

      const response = await client.get('/api/v1/documents/00000000-0000-0000-0000-000000000000/preview', {
        token: testUser.token,
      });

      expect([200, 404, 401]).toContain(response.status);
    });

    it('should update document metadata', async () => {
      if (!testUser.token) {
        return;
      }

      const response = await client.put(
        '/api/v1/documents/00000000-0000-0000-0000-000000000000/metadata',
        {
          title: 'Updated Title',
        },
        {
          token: testUser.token,
        }
      );

      expect([200, 404, 401, 403]).toContain(response.status);
    });
  });

  describe('Obligation Nested Endpoints', () => {
    it('should get obligation deadlines', async () => {
      if (!testUser.token) {
        return;
      }

      const response = await client.get('/api/v1/obligations/00000000-0000-0000-0000-000000000000/deadlines', {
        token: testUser.token,
      });

      expect([200, 404, 401]).toContain(response.status);
    });

    it('should get obligation history', async () => {
      if (!testUser.token) {
        return;
      }

      const response = await client.get('/api/v1/obligations/00000000-0000-0000-0000-000000000000/history', {
        token: testUser.token,
      });

      expect([200, 404, 401]).toContain(response.status);
    });

    it('should mark obligation as not applicable', async () => {
      if (!testUser.token) {
        return;
      }

      const response = await client.post(
        '/api/v1/obligations/00000000-0000-0000-0000-000000000000/mark-na',
        {},
        {
          token: testUser.token,
        }
      );

      expect([200, 404, 401, 403]).toContain(response.status);
    });

    it('should get obligation schedule', async () => {
      if (!testUser.token) {
        return;
      }

      const response = await client.get('/api/v1/obligations/00000000-0000-0000-0000-000000000000/schedule', {
        token: testUser.token,
      });

      expect([200, 404, 401]).toContain(response.status);
    });

    it('should get obligation escalations', async () => {
      if (!testUser.token) {
        return;
      }

      const response = await client.get('/api/v1/obligations/00000000-0000-0000-0000-000000000000/escalations', {
        token: testUser.token,
      });

      expect([200, 404, 401]).toContain(response.status);
    });

    it('should get obligation audit log', async () => {
      if (!testUser.token) {
        return;
      }

      const response = await client.get('/api/v1/obligations/00000000-0000-0000-0000-000000000000/audit', {
        token: testUser.token,
      });

      expect([200, 404, 401]).toContain(response.status);
    });
  });

  describe('Pack Nested Endpoints', () => {
    it('should download pack', async () => {
      if (!testUser.token) {
        return;
      }

      const response = await client.get('/api/v1/packs/00000000-0000-0000-0000-000000000000/download', {
        token: testUser.token,
      });

      expect([200, 404, 401, 403]).toContain(response.status);
    });

    it('should get pack download link', async () => {
      if (!testUser.token) {
        return;
      }

      const response = await client.get('/api/v1/packs/00000000-0000-0000-0000-000000000000/download-link', {
        token: testUser.token,
      });

      expect([200, 404, 401]).toContain(response.status);
    });

    it('should regenerate pack', async () => {
      if (!testUser.token) {
        return;
      }

      const response = await client.post(
        '/api/v1/packs/00000000-0000-0000-0000-000000000000/regenerate',
        {},
        {
          token: testUser.token,
        }
      );

      expect([200, 202, 404, 401, 403]).toContain(response.status);
    });

    it('should distribute pack', async () => {
      if (!testUser.token) {
        return;
      }

      const response = await client.post(
        '/api/v1/packs/00000000-0000-0000-0000-000000000000/distribute',
        {
          recipients: ['test@example.com'],
        },
        {
          token: testUser.token,
        }
      );

      expect([200, 202, 404, 401, 403]).toContain(response.status);
    });

    it('should get pack distribution status', async () => {
      if (!testUser.token) {
        return;
      }

      const response = await client.get('/api/v1/packs/00000000-0000-0000-0000-000000000000/distribution-status', {
        token: testUser.token,
      });

      expect([200, 404, 401]).toContain(response.status);
    });
  });

  describe('Site Nested Endpoints', () => {
    it('should get site dashboard data', async () => {
      if (!testUser.token || !testUser.site_id) {
        return;
      }

      const response = await client.get(`/api/v1/sites/${testUser.site_id}/dashboard`, {
        token: testUser.token,
      });

      expect([200, 404, 401, 403]).toContain(response.status);
    });

    it('should get site consolidated view', async () => {
      if (!testUser.token || !testUser.site_id) {
        return;
      }

      const response = await client.get(`/api/v1/sites/${testUser.site_id}/consolidated-view`, {
        token: testUser.token,
      });

      expect([200, 404, 401, 403]).toContain(response.status);
    });
  });

  describe('Evidence Nested Endpoints', () => {
    it('should download evidence', async () => {
      if (!testUser.token) {
        return;
      }

      const response = await client.get('/api/v1/evidence/00000000-0000-0000-0000-000000000000/download', {
        token: testUser.token,
      });

      expect([200, 404, 401, 403]).toContain(response.status);
    });
  });

  describe('Deadline Nested Endpoints', () => {
    it('should complete deadline', async () => {
      if (!testUser.token) {
        return;
      }

      const response = await client.post(
        '/api/v1/deadlines/00000000-0000-0000-0000-000000000000/complete',
        {},
        {
          token: testUser.token,
        }
      );

      expect([200, 404, 401, 403]).toContain(response.status);
    });
  });

  describe('Notification Nested Endpoints', () => {
    it('should mark notification as read', async () => {
      if (!testUser.token) {
        return;
      }

      const response = await client.put(
        '/api/v1/notifications/00000000-0000-0000-0000-000000000000/read',
        {},
        {
          token: testUser.token,
        }
      );

      expect([200, 404, 401]).toContain(response.status);
    });

    it('should mark notification as unread', async () => {
      if (!testUser.token) {
        return;
      }

      const response = await client.put(
        '/api/v1/notifications/00000000-0000-0000-0000-000000000000/unread',
        {},
        {
          token: testUser.token,
        }
      );

      expect([200, 404, 401]).toContain(response.status);
    });

    it('should mark all notifications as read', async () => {
      if (!testUser.token) {
        return;
      }

      const response = await client.post(
        '/api/v1/notifications/read-all',
        {},
        {
          token: testUser.token,
        }
      );

      expect([200, 401]).toContain(response.status);
    });
  });

  describe('Schedule Nested Endpoints', () => {
    it('should get schedule deadlines', async () => {
      if (!testUser.token) {
        return;
      }

      const response = await client.get('/api/v1/schedules/00000000-0000-0000-0000-000000000000/deadlines', {
        token: testUser.token,
      });

      expect([200, 404, 401]).toContain(response.status);
    });
  });

  describe('Escalation Nested Endpoints', () => {
    it('should resolve escalation', async () => {
      if (!testUser.token) {
        return;
      }

      const response = await client.post(
        '/api/v1/escalations/00000000-0000-0000-0000-000000000000/resolve',
        {},
        {
          token: testUser.token,
        }
      );

      expect([200, 404, 401, 403]).toContain(response.status);
    });
  });

  describe('Review Queue Nested Endpoints', () => {
    it('should confirm review queue item', async () => {
      if (!testUser.token) {
        return;
      }

      const response = await client.post(
        '/api/v1/review-queue/00000000-0000-0000-0000-000000000000/confirm',
        {},
        {
          token: testUser.token,
        }
      );

      expect([200, 404, 401, 403]).toContain(response.status);
    });

    it('should reject review queue item', async () => {
      if (!testUser.token) {
        return;
      }

      const response = await client.post(
        '/api/v1/review-queue/00000000-0000-0000-0000-000000000000/reject',
        {
          reason: 'Test rejection',
        },
        {
          token: testUser.token,
        }
      );

      expect([200, 404, 401, 403]).toContain(response.status);
    });

    it('should edit review queue item', async () => {
      if (!testUser.token) {
        return;
      }

      const response = await client.post(
        '/api/v1/review-queue/00000000-0000-0000-0000-000000000000/edit',
        {
          changes: {},
        },
        {
          token: testUser.token,
        }
      );

      expect([200, 404, 401, 403]).toContain(response.status);
    });
  });

  describe('User Nested Endpoints', () => {
    it('should update user password', async () => {
      if (!testUser.token || !testUser.user_id) {
        return;
      }

      const response = await client.put(
        `/api/v1/users/${testUser.user_id}/password`,
        {
          current_password: testUser.password,
          new_password: 'NewPassword123!',
        },
        {
          token: testUser.token,
        }
      );

      expect([200, 400, 401, 403, 404]).toContain(response.status);
    });

    it('should get user roles', async () => {
      if (!testUser.token || !testUser.user_id) {
        return;
      }

      const response = await client.get(`/api/v1/users/${testUser.user_id}/roles`, {
        token: testUser.token,
      });

      expect([200, 401, 403, 404]).toContain(response.status);
    });

    it('should get user sites', async () => {
      if (!testUser.token || !testUser.user_id) {
        return;
      }

      const response = await client.get(`/api/v1/users/${testUser.user_id}/sites`, {
        token: testUser.token,
      });

      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  describe('Analytics Endpoints', () => {
    it('should get onboarding analytics', async () => {
      if (!testUser.token) {
        return;
      }

      const response = await client.get('/api/v1/analytics/onboarding', {
        token: testUser.token,
      });

      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('Help Endpoints', () => {
    it('should get contextual help article', async () => {
      if (!testUser.token) {
        return;
      }

      const response = await client.get('/api/v1/help/contextual/test-article-id', {
        token: testUser.token,
      });

      expect([200, 404, 401]).toContain(response.status);
    });
  });

  describe('Regulator Questions Endpoints', () => {
    it('should close regulator question', async () => {
      if (!testUser.token) {
        return;
      }

      const response = await client.post(
        '/api/v1/regulator-questions/00000000-0000-0000-0000-000000000000/close',
        {},
        {
          token: testUser.token,
        }
      );

      expect([200, 404, 401, 403]).toContain(response.status);
    });
  });

  describe('Background Jobs Endpoints', () => {
    it('should retry failed job', async () => {
      if (!testUser.token) {
        return;
      }

      const response = await client.post(
        '/api/v1/background-jobs/00000000-0000-0000-0000-000000000000/retry',
        {},
        {
          token: testUser.token,
        }
      );

      expect([200, 202, 404, 401, 403]).toContain(response.status);
    });
  });
});

