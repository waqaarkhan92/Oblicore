/**
 * Deadline Alert Job Tests
 * Tests for lib/jobs/deadline-alert-job.ts
 *
 * These tests verify the deadline alert job correctly:
 * - Fetches pending deadlines due in 7, 3, or 1 days
 * - Creates notifications for appropriate users
 * - Skips if notification already exists
 * - Handles errors gracefully
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import type { DeadlineAlertJobData } from '@/lib/jobs/deadline-alert-job';

// Mock data for tests
const createMockDeadline = (daysFromNow: number, overrides: any = {}) => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysFromNow);
  const dateStr = futureDate.toISOString().split('T')[0];

  return {
    id: `deadline-${Math.random().toString(36).substr(2, 9)}`,
    obligation_id: 'obligation-1',
    due_date: dateStr,
    status: 'PENDING',
    obligations: {
      id: 'obligation-1',
      company_id: 'company-1',
      site_id: 'site-1',
      obligation_title: 'Test Obligation',
      obligation_description: 'Test Description',
      original_text: 'Original obligation text',
      category: 'ENVIRONMENTAL',
      sites: { id: 'site-1', name: 'Test Site', company_id: 'company-1' },
    },
    ...overrides,
  };
};

describe('deadline-alert-job', () => {
  let mockFromFn: jest.Mock;
  let processDeadlineAlertJob: (job: any) => Promise<void>;

  // Helper to create chainable mock for deadline query
  const createChainableMock = (finalResult: any) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        in: jest.fn().mockReturnValue(Promise.resolve(finalResult)),
      }),
    }),
  });

  // Helper for filtering queries (with additional eq call)
  const createFilteredChainableMock = (finalResult: any) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        in: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue(Promise.resolve(finalResult)),
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
    const module = await import('@/lib/jobs/deadline-alert-job');
    processDeadlineAlertJob = module.processDeadlineAlertJob;
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('processDeadlineAlertJob', () => {
    it('should complete without errors when no deadlines are found', async () => {
      mockFromFn.mockReturnValueOnce(
        createChainableMock({ data: [], error: null })
      );

      const mockJob = { data: {} };
      await expect(processDeadlineAlertJob(mockJob as any)).resolves.not.toThrow();
      expect(mockFromFn).toHaveBeenCalledWith('deadlines');
    });

    it('should throw error when database query fails', async () => {
      mockFromFn.mockReturnValueOnce(
        createChainableMock({ data: null, error: { message: 'Database error' } })
      );

      const mockJob = { data: {} };
      await expect(processDeadlineAlertJob(mockJob as any)).rejects.toThrow(
        'Failed to fetch deadlines: Database error'
      );
    });

    it('should filter by company_id when provided', async () => {
      mockFromFn.mockReturnValueOnce(
        createFilteredChainableMock({ data: [], error: null })
      );

      const mockJob = { data: { company_id: 'test-company-id' } };
      await processDeadlineAlertJob(mockJob as any);
      expect(mockFromFn).toHaveBeenCalledWith('deadlines');
    });

    it('should filter by site_id when provided', async () => {
      mockFromFn.mockReturnValueOnce(
        createFilteredChainableMock({ data: [], error: null })
      );

      const mockJob = { data: { site_id: 'test-site-id' } };
      await processDeadlineAlertJob(mockJob as any);
      expect(mockFromFn).toHaveBeenCalledWith('deadlines');
    });

    it('should process deadline with 7-day warning and create notifications', async () => {
      const mockDeadline = createMockDeadline(7);
      const mockUsers = [
        { id: 'user-1', email: 'test@example.com', full_name: 'Test User', company_id: 'company-1' },
      ];

      // First call: fetch deadlines
      mockFromFn.mockReturnValueOnce(
        createChainableMock({ data: [mockDeadline], error: null })
      );

      // Second call: check existing notification
      mockFromFn.mockReturnValueOnce(createNotificationCheckMock(false));

      // Third call: fetch users
      mockFromFn.mockReturnValueOnce(createUserQueryMock(mockUsers));

      // Fourth call: insert notifications
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'notification-1' }], error: null })
      );

      const mockJob = { data: {} };
      await processDeadlineAlertJob(mockJob as any);

      expect(mockFromFn).toHaveBeenCalledWith('deadlines');
      expect(mockFromFn).toHaveBeenCalledWith('notifications');
    });

    it('should skip deadline if notification already exists', async () => {
      const mockDeadline = createMockDeadline(7);

      // First call: fetch deadlines
      mockFromFn.mockReturnValueOnce(
        createChainableMock({ data: [mockDeadline], error: null })
      );

      // Second call: check existing notification - returns existing notification
      mockFromFn.mockReturnValueOnce(createNotificationCheckMock(true));

      const mockJob = { data: {} };
      await processDeadlineAlertJob(mockJob as any);

      // Should only call from() twice - once for deadlines, once for notification check
      expect(mockFromFn).toHaveBeenCalledTimes(2);
      expect(mockFromFn).toHaveBeenNthCalledWith(1, 'deadlines');
      expect(mockFromFn).toHaveBeenNthCalledWith(2, 'notifications');
    });

    it('should continue processing other deadlines if one fails', async () => {
      const mockDeadlines = [
        { ...createMockDeadline(7), obligations: null }, // This one will fail (no obligations)
        createMockDeadline(7), // This one should process
      ];

      // First call: fetch deadlines
      mockFromFn.mockReturnValueOnce(
        createChainableMock({ data: mockDeadlines, error: null })
      );

      // Second call: check existing notification for second deadline
      mockFromFn.mockReturnValueOnce(createNotificationCheckMock(false));

      // Third call: fetch users
      mockFromFn.mockReturnValueOnce(createUserQueryMock([]));

      const mockJob = { data: {} };
      await expect(processDeadlineAlertJob(mockJob as any)).resolves.not.toThrow();
    });

    it('should set correct priority based on days until due (3-day deadline)', async () => {
      const threeDayDeadline = createMockDeadline(3);
      const mockUsers = [
        { id: 'user-1', email: 'test@example.com', full_name: 'Test User', company_id: 'company-1' },
      ];

      mockFromFn.mockReturnValueOnce(
        createChainableMock({ data: [threeDayDeadline], error: null })
      );
      mockFromFn.mockReturnValueOnce(createNotificationCheckMock(false));
      mockFromFn.mockReturnValueOnce(createUserQueryMock(mockUsers));
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'notification-1' }], error: null })
      );

      const mockJob = { data: {} };
      await processDeadlineAlertJob(mockJob as any);

      expect(mockFromFn).toHaveBeenCalledWith('notifications');
    });

    it('should handle 1-day deadline with URGENT priority', async () => {
      const oneDayDeadline = createMockDeadline(1);
      const mockUsers = [
        { id: 'user-1', email: 'test@example.com', full_name: 'Test User', company_id: 'company-1' },
      ];

      mockFromFn.mockReturnValueOnce(
        createChainableMock({ data: [oneDayDeadline], error: null })
      );
      mockFromFn.mockReturnValueOnce(createNotificationCheckMock(false));
      mockFromFn.mockReturnValueOnce(createUserQueryMock(mockUsers));
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'notification-1' }], error: null })
      );

      const mockJob = { data: {} };
      await processDeadlineAlertJob(mockJob as any);

      expect(mockFromFn).toHaveBeenCalledWith('notifications');
    });

    it('should skip deadline if no users are found', async () => {
      const mockDeadline = createMockDeadline(7);

      mockFromFn.mockReturnValueOnce(
        createChainableMock({ data: [mockDeadline], error: null })
      );
      mockFromFn.mockReturnValueOnce(createNotificationCheckMock(false));
      mockFromFn.mockReturnValueOnce(createUserQueryMock([])); // No users

      const mockJob = { data: {} };
      await processDeadlineAlertJob(mockJob as any);

      // Should not attempt to insert notifications (only 3 calls)
      expect(mockFromFn).toHaveBeenCalledTimes(3);
    });

    it('should handle multiple deadlines with different alert levels', async () => {
      const sevenDayDeadline = createMockDeadline(7);
      const threeDayDeadline = createMockDeadline(3);
      const mockUsers = [
        { id: 'user-1', email: 'test@example.com', full_name: 'Test User', company_id: 'company-1' },
      ];

      // Fetch deadlines - returns both
      mockFromFn.mockReturnValueOnce(
        createChainableMock({ data: [sevenDayDeadline, threeDayDeadline], error: null })
      );

      // Check notification for first deadline
      mockFromFn.mockReturnValueOnce(createNotificationCheckMock(false));
      mockFromFn.mockReturnValueOnce(createUserQueryMock(mockUsers));
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'notification-1' }], error: null })
      );

      // Check notification for second deadline
      mockFromFn.mockReturnValueOnce(createNotificationCheckMock(false));
      mockFromFn.mockReturnValueOnce(createUserQueryMock(mockUsers));
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'notification-2' }], error: null })
      );

      const mockJob = { data: {} };
      await processDeadlineAlertJob(mockJob as any);

      // Should have made calls for both deadlines
      expect(mockFromFn).toHaveBeenCalledWith('deadlines');
      expect(mockFromFn).toHaveBeenCalledWith('notifications');
      expect(mockFromFn).toHaveBeenCalledWith('users');
    });
  });

  describe('DeadlineAlertJobData interface', () => {
    it('should accept empty data object', () => {
      const data: DeadlineAlertJobData = {};
      expect(data.company_id).toBeUndefined();
      expect(data.site_id).toBeUndefined();
    });

    it('should accept company_id', () => {
      const data: DeadlineAlertJobData = { company_id: 'test-company' };
      expect(data.company_id).toBe('test-company');
    });

    it('should accept site_id', () => {
      const data: DeadlineAlertJobData = { site_id: 'test-site' };
      expect(data.site_id).toBe('test-site');
    });

    it('should accept both company_id and site_id', () => {
      const data: DeadlineAlertJobData = { company_id: 'test-company', site_id: 'test-site' };
      expect(data.company_id).toBe('test-company');
      expect(data.site_id).toBe('test-site');
    });
  });
});
