/**
 * Evidence Reminder Job Tests
 * Tests for lib/jobs/evidence-reminder-job.ts
 *
 * These tests verify the evidence reminder job correctly:
 * - Fetches obligations past deadline with no evidence
 * - Respects grace period (7 days after deadline)
 * - Creates notifications for appropriate users
 * - Skips if reminder already sent in last 24 hours
 * - Handles errors gracefully
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import type { EvidenceReminderJobData } from '@/lib/jobs/evidence-reminder-job';

// Mock data for tests
const createMockObligation = (daysAgo: number, overrides: any = {}) => {
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - daysAgo);
  const dateStr = pastDate.toISOString().split('T')[0];

  return {
    id: `obligation-${Math.random().toString(36).substr(2, 9)}`,
    company_id: 'company-1',
    site_id: 'site-1',
    original_text: 'Original obligation text',
    obligation_title: 'Test Obligation',
    obligation_description: 'Test Description',
    deadline_date: dateStr,
    status: 'ACTIVE',
    sites: { id: 'site-1', name: 'Test Site', company_id: 'company-1' },
    ...overrides,
  };
};

describe('evidence-reminder-job', () => {
  let mockFromFn: jest.Mock;
  let processEvidenceReminderJob: (job: any) => Promise<void>;

  // Helper to create chainable mock for obligations query
  const createObligationsQueryMock = (finalResult: any) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        is: jest.fn().mockReturnValue({
          not: jest.fn().mockReturnValue({
            lt: jest.fn().mockReturnValue(Promise.resolve(finalResult)),
          }),
        }),
      }),
    }),
  });

  // Helper for filtered query (with company_id or site_id)
  const createFilteredObligationsQueryMock = (finalResult: any) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        is: jest.fn().mockReturnValue({
          not: jest.fn().mockReturnValue({
            lt: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue(Promise.resolve(finalResult)),
            }),
          }),
        }),
      }),
    }),
  });

  // Helper for evidence links check
  const createEvidenceLinksCheckMock = (hasEvidence: boolean) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        is: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue(
            Promise.resolve({
              data: hasEvidence ? [{ id: 'evidence-1' }] : [],
              error: null,
            })
          ),
        }),
      }),
    }),
  });

  // Helper for notification check query
  const createNotificationCheckMock = (exists: boolean) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              single: jest.fn().mockReturnValue(
                Promise.resolve({
                  data: exists ? { id: 'existing-notification' } : null,
                  error: null,
                })
              ),
            }),
          }),
        }),
      }),
    }),
  });

  // Helper for user query
  const createUserQueryMock = (users: any[]) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        in: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue(
              Promise.resolve({ data: users, error: null })
            ),
          }),
        }),
      }),
    }),
  });

  // Helper for insert mock
  const createInsertMock = (result: any) => ({
    insert: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue(Promise.resolve(result)),
      }),
    }),
  });

  beforeEach(async () => {
    jest.resetModules();

    // Create fresh mock for each test
    mockFromFn = jest.fn();

    // Set up mocks before importing the module
    jest.doMock('@/lib/supabase/server', () => ({
      supabaseAdmin: {
        from: mockFromFn,
      },
    }));

    jest.doMock('@/lib/services/escalation-service', () => ({
      checkEscalation: jest.fn(),
      createEscalationNotification: jest.fn(),
    }));

    // Dynamic import to get fresh module with mocks
    const module = await import('@/lib/jobs/evidence-reminder-job');
    processEvidenceReminderJob = module.processEvidenceReminderJob;
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('processEvidenceReminderJob', () => {
    it('should complete without errors when no obligations are found', async () => {
      mockFromFn.mockReturnValueOnce(
        createObligationsQueryMock({ data: [], error: null })
      );

      const mockJob = { data: {} };
      await expect(processEvidenceReminderJob(mockJob as any)).resolves.not.toThrow();
      expect(mockFromFn).toHaveBeenCalledWith('obligations');
    });

    it('should throw error when database query fails', async () => {
      mockFromFn.mockReturnValueOnce(
        createObligationsQueryMock({ data: null, error: { message: 'Database error' } })
      );

      const mockJob = { data: {} };
      await expect(processEvidenceReminderJob(mockJob as any)).rejects.toThrow(
        'Failed to fetch obligations: Database error'
      );
    });

    it('should filter by company_id when provided', async () => {
      mockFromFn.mockReturnValueOnce(
        createFilteredObligationsQueryMock({ data: [], error: null })
      );

      const mockJob = { data: { company_id: 'test-company-id' } };
      await processEvidenceReminderJob(mockJob as any);
      expect(mockFromFn).toHaveBeenCalledWith('obligations');
    });

    it('should filter by site_id when provided', async () => {
      mockFromFn.mockReturnValueOnce(
        createFilteredObligationsQueryMock({ data: [], error: null })
      );

      const mockJob = { data: { site_id: 'test-site-id' } };
      await processEvidenceReminderJob(mockJob as any);
      expect(mockFromFn).toHaveBeenCalledWith('obligations');
    });

    it('should skip obligations within grace period (less than 7 days after deadline)', async () => {
      // Obligation with deadline 5 days ago (within grace period)
      const mockObligation = createMockObligation(5);

      // First call: fetch obligations
      mockFromFn.mockReturnValueOnce(
        createObligationsQueryMock({ data: [mockObligation], error: null })
      );

      // Second call: check evidence links (no evidence)
      mockFromFn.mockReturnValueOnce(createEvidenceLinksCheckMock(false));

      const mockJob = { data: {} };
      await processEvidenceReminderJob(mockJob as any);

      // Should only check evidence links, not create notification (within grace period)
      expect(mockFromFn).toHaveBeenCalledWith('obligations');
      expect(mockFromFn).toHaveBeenCalledWith('obligation_evidence_links');
      expect(mockFromFn).toHaveBeenCalledTimes(2); // No notification created
    });

    it('should process obligations past grace period and create notifications', async () => {
      // Obligation with deadline 10 days ago (past 7-day grace period)
      const mockObligation = createMockObligation(10);
      const mockUsers = [
        { id: 'user-1', email: 'test@example.com', full_name: 'Test User', company_id: 'company-1' },
      ];

      // First call: fetch obligations
      mockFromFn.mockReturnValueOnce(
        createObligationsQueryMock({ data: [mockObligation], error: null })
      );

      // Second call: check evidence links (no evidence)
      mockFromFn.mockReturnValueOnce(createEvidenceLinksCheckMock(false));

      // Third call: check existing notification
      mockFromFn.mockReturnValueOnce(createNotificationCheckMock(false));

      // Fourth call: fetch users
      mockFromFn.mockReturnValueOnce(createUserQueryMock(mockUsers));

      // Fifth call: insert notifications
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'notification-1' }], error: null })
      );

      const mockJob = { data: {} };
      await processEvidenceReminderJob(mockJob as any);

      expect(mockFromFn).toHaveBeenCalledWith('obligations');
      expect(mockFromFn).toHaveBeenCalledWith('notifications');
    });

    it('should skip obligation if evidence already exists', async () => {
      const mockObligation = createMockObligation(10);

      // First call: fetch obligations
      mockFromFn.mockReturnValueOnce(
        createObligationsQueryMock({ data: [mockObligation], error: null })
      );

      // Second call: check evidence links (has evidence)
      mockFromFn.mockReturnValueOnce(createEvidenceLinksCheckMock(true));

      const mockJob = { data: {} };
      await processEvidenceReminderJob(mockJob as any);

      // Should only check evidence, no notification created
      expect(mockFromFn).toHaveBeenCalledTimes(2);
    });

    it('should skip if reminder already sent in last 24 hours', async () => {
      const mockObligation = createMockObligation(10);

      // First call: fetch obligations
      mockFromFn.mockReturnValueOnce(
        createObligationsQueryMock({ data: [mockObligation], error: null })
      );

      // Second call: check evidence links (no evidence)
      mockFromFn.mockReturnValueOnce(createEvidenceLinksCheckMock(false));

      // Third call: check existing notification - returns existing (already reminded)
      mockFromFn.mockReturnValueOnce(createNotificationCheckMock(true));

      const mockJob = { data: {} };
      await processEvidenceReminderJob(mockJob as any);

      // Should stop at notification check, not fetch users or insert
      expect(mockFromFn).toHaveBeenCalledTimes(3);
    });

    it('should continue processing other obligations if one fails', async () => {
      const mockObligations = [
        { ...createMockObligation(10), sites: null }, // This one will fail (no sites)
        createMockObligation(10), // This one should process
      ];

      // First call: fetch obligations
      mockFromFn.mockReturnValueOnce(
        createObligationsQueryMock({ data: mockObligations, error: null })
      );

      // Second call: check evidence links for first (will fail when accessing site)
      mockFromFn.mockReturnValueOnce(createEvidenceLinksCheckMock(false));

      // Third call: check evidence links for second
      mockFromFn.mockReturnValueOnce(createEvidenceLinksCheckMock(false));

      // Fourth call: check existing notification for second
      mockFromFn.mockReturnValueOnce(createNotificationCheckMock(false));

      // Fifth call: fetch users
      mockFromFn.mockReturnValueOnce(createUserQueryMock([]));

      const mockJob = { data: {} };
      await expect(processEvidenceReminderJob(mockJob as any)).resolves.not.toThrow();
    });

    it('should skip notification creation if no users found', async () => {
      const mockObligation = createMockObligation(10);

      // First call: fetch obligations
      mockFromFn.mockReturnValueOnce(
        createObligationsQueryMock({ data: [mockObligation], error: null })
      );

      // Second call: check evidence links (no evidence)
      mockFromFn.mockReturnValueOnce(createEvidenceLinksCheckMock(false));

      // Third call: check existing notification
      mockFromFn.mockReturnValueOnce(createNotificationCheckMock(false));

      // Fourth call: fetch users - returns empty
      mockFromFn.mockReturnValueOnce(createUserQueryMock([]));

      const mockJob = { data: {} };
      await processEvidenceReminderJob(mockJob as any);

      // Should not attempt to insert notifications
      expect(mockFromFn).toHaveBeenCalledTimes(4);
    });

    it('should handle multiple obligations needing evidence', async () => {
      const mockObligations = [
        createMockObligation(10),
        createMockObligation(14),
      ];
      const mockUsers = [
        { id: 'user-1', email: 'test@example.com', full_name: 'Test User', company_id: 'company-1' },
      ];

      // First call: fetch obligations
      mockFromFn.mockReturnValueOnce(
        createObligationsQueryMock({ data: mockObligations, error: null })
      );

      // Check evidence for both obligations (no evidence)
      mockFromFn.mockReturnValueOnce(createEvidenceLinksCheckMock(false));
      mockFromFn.mockReturnValueOnce(createEvidenceLinksCheckMock(false));

      // Check notification, fetch users, insert for first obligation
      mockFromFn.mockReturnValueOnce(createNotificationCheckMock(false));
      mockFromFn.mockReturnValueOnce(createUserQueryMock(mockUsers));
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'notification-1' }], error: null })
      );

      // Check notification, fetch users, insert for second obligation
      mockFromFn.mockReturnValueOnce(createNotificationCheckMock(false));
      mockFromFn.mockReturnValueOnce(createUserQueryMock(mockUsers));
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'notification-2' }], error: null })
      );

      const mockJob = { data: {} };
      await processEvidenceReminderJob(mockJob as any);

      expect(mockFromFn).toHaveBeenCalledWith('obligations');
      expect(mockFromFn).toHaveBeenCalledWith('notifications');
      expect(mockFromFn).toHaveBeenCalledWith('users');
    });

    it('should use ecocomply.io domain for action URLs', async () => {
      const mockObligation = createMockObligation(10);
      const mockUsers = [
        { id: 'user-1', email: 'test@example.com', full_name: 'Test User', company_id: 'company-1' },
      ];

      let insertedNotifications: any = null;

      // First call: fetch obligations
      mockFromFn.mockReturnValueOnce(
        createObligationsQueryMock({ data: [mockObligation], error: null })
      );

      // Second call: check evidence links
      mockFromFn.mockReturnValueOnce(createEvidenceLinksCheckMock(false));

      // Third call: check existing notification
      mockFromFn.mockReturnValueOnce(createNotificationCheckMock(false));

      // Fourth call: fetch users
      mockFromFn.mockReturnValueOnce(createUserQueryMock(mockUsers));

      // Fifth call: insert notifications - capture the data
      mockFromFn.mockReturnValueOnce({
        insert: jest.fn().mockImplementation((data) => {
          insertedNotifications = data;
          return {
            select: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue(
                Promise.resolve({ data: [{ id: 'notification-1' }], error: null })
              ),
            }),
          };
        }),
      });

      const mockJob = { data: {} };
      await processEvidenceReminderJob(mockJob as any);

      expect(insertedNotifications).toBeDefined();
      expect(insertedNotifications[0].metadata.action_url).toContain('ecocomply.io');
    });
  });

  describe('EvidenceReminderJobData interface', () => {
    it('should accept empty data object', () => {
      const data: EvidenceReminderJobData = {};
      expect(data.company_id).toBeUndefined();
      expect(data.site_id).toBeUndefined();
    });

    it('should accept company_id', () => {
      const data: EvidenceReminderJobData = { company_id: 'test-company' };
      expect(data.company_id).toBe('test-company');
    });

    it('should accept site_id', () => {
      const data: EvidenceReminderJobData = { site_id: 'test-site' };
      expect(data.site_id).toBe('test-site');
    });

    it('should accept both company_id and site_id', () => {
      const data: EvidenceReminderJobData = { company_id: 'test-company', site_id: 'test-site' };
      expect(data.company_id).toBe('test-company');
      expect(data.site_id).toBe('test-site');
    });
  });
});
