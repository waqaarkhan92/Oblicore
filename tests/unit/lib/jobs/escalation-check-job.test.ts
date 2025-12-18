/**
 * Escalation Check Job Tests
 * Tests for lib/jobs/escalation-check-job.ts
 *
 * These tests verify the escalation check job correctly:
 * - Fetches overdue obligations/deadlines from compliance_clocks_universal
 * - Determines escalation level based on days overdue
 * - Gets escalation contacts based on workflow tier
 * - Creates escalation notifications for recipients
 * - Updates escalation records
 * - Handles multiple escalation tiers
 * - Respects company escalation settings
 * - Prevents double-escalation
 * - Handles errors gracefully
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import type { EscalationCheckJobData } from '@/lib/jobs/escalation-check-job';

// Mock data helpers
const createMockOverdueItem = (daysOverdue: number, overrides: any = {}) => ({
  id: `clock-${Math.random().toString(36).substr(2, 9)}`,
  company_id: 'company-1',
  site_id: 'site-1',
  entity_type: 'OBLIGATION',
  entity_id: 'obligation-1',
  days_remaining: -daysOverdue,
  clock_name: 'Test Obligation Clock',
  target_date: new Date(Date.now() - daysOverdue * 24 * 60 * 60 * 1000).toISOString(),
  status: 'ACTIVE',
  ...overrides,
});

const createMockObligation = (overrides: any = {}) => ({
  id: 'obligation-1',
  category: 'ENVIRONMENTAL',
  obligation_title: 'Test Environmental Obligation',
  ...overrides,
});

const createMockDeadline = (overrides: any = {}) => ({
  id: 'deadline-1',
  obligation_id: 'obligation-1',
  obligations: {
    category: 'ENVIRONMENTAL',
    obligation_title: 'Test Environmental Obligation',
  },
  ...overrides,
});

const createMockWorkflow = (overrides: any = {}) => ({
  id: 'workflow-1',
  company_id: 'company-1',
  obligation_category: 'ENVIRONMENTAL',
  level_1_days: 1,
  level_2_days: 3,
  level_3_days: 7,
  level_4_days: 14,
  level_1_recipients: ['user-1'],
  level_2_recipients: ['user-1', 'user-2'],
  level_3_recipients: ['user-1', 'user-2', 'user-3'],
  level_4_recipients: ['user-1', 'user-2', 'user-3', 'user-4'],
  is_active: true,
  workflow_name: 'Environmental Escalation Workflow',
  ...overrides,
});

const createMockUser = (id: string, email: string) => ({
  id,
  email,
  is_active: true,
  deleted_at: null,
});

describe('escalation-check-job', () => {
  let mockFromFn: jest.Mock;
  let processEscalationCheckJob: (job: any) => Promise<void>;
  let mockMatchEscalationWorkflow: jest.Mock;
  let mockDetermineEscalationLevel: jest.Mock;
  let mockGetEscalationRecipientsFromWorkflow: jest.Mock;
  let mockCreateOrUpdateEscalation: jest.Mock;
  let mockGetSystemDefaultWorkflow: jest.Mock;
  let mockGetCurrentEscalationLevel: jest.Mock;

  // Helper to create chainable mock for basic query
  const createChainableMock = (finalResult: any) => ({
    select: jest.fn().mockReturnValue({
      lt: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue(Promise.resolve(finalResult)),
      }),
    }),
  });

  // Helper for filtered query (with additional eq calls)
  const createFilteredChainableMock = (finalResult: any) => ({
    select: jest.fn().mockReturnValue({
      lt: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue(Promise.resolve(finalResult)),
        }),
      }),
    }),
  });

  // Helper for double filtered query (company_id and site_id)
  const createDoubleFilteredChainableMock = (finalResult: any) => ({
    select: jest.fn().mockReturnValue({
      lt: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue(Promise.resolve(finalResult)),
          }),
        }),
      }),
    }),
  });

  // Helper for obligation/deadline query
  const createEntityQueryMock = (finalResult: any) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockReturnValue(Promise.resolve(finalResult)),
      }),
    }),
  });

  // Helper for insert mock
  const createInsertMock = (result: any) => ({
    insert: jest.fn().mockReturnValue(Promise.resolve(result)),
  });

  beforeEach(async () => {
    jest.resetModules();

    // Create fresh mocks for each test
    mockFromFn = jest.fn();
    mockMatchEscalationWorkflow = jest.fn();
    mockDetermineEscalationLevel = jest.fn();
    mockGetEscalationRecipientsFromWorkflow = jest.fn();
    mockCreateOrUpdateEscalation = jest.fn();
    mockGetSystemDefaultWorkflow = jest.fn();
    mockGetCurrentEscalationLevel = jest.fn();

    // Set up mocks before importing the module
    jest.doMock('@/lib/supabase/server', () => ({
      supabaseAdmin: {
        from: mockFromFn,
      },
    }));

    jest.doMock('@/lib/services/escalation-workflow-service', () => ({
      matchEscalationWorkflow: mockMatchEscalationWorkflow,
      determineEscalationLevel: mockDetermineEscalationLevel,
      getEscalationRecipientsFromWorkflow: mockGetEscalationRecipientsFromWorkflow,
      createOrUpdateEscalation: mockCreateOrUpdateEscalation,
      getSystemDefaultWorkflow: mockGetSystemDefaultWorkflow,
      getCurrentEscalationLevel: mockGetCurrentEscalationLevel,
    }));

    // Dynamic import to get fresh module with mocks
    const module = await import('@/lib/jobs/escalation-check-job');
    processEscalationCheckJob = module.processEscalationCheckJob;
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('processEscalationCheckJob', () => {
    it('should complete without errors when no overdue items are found', async () => {
      mockFromFn.mockReturnValueOnce(
        createChainableMock({ data: [], error: null })
      );

      const mockJob = { data: {} };
      await expect(processEscalationCheckJob(mockJob as any)).resolves.not.toThrow();
      expect(mockFromFn).toHaveBeenCalledWith('compliance_clocks_universal');
    });

    it('should throw error when database query fails', async () => {
      mockFromFn.mockReturnValueOnce(
        createChainableMock({ data: null, error: { message: 'Database connection error' } })
      );

      const mockJob = { data: {} };
      await expect(processEscalationCheckJob(mockJob as any)).rejects.toThrow(
        'Failed to fetch overdue items: Database connection error'
      );
    });

    it('should filter by company_id when provided', async () => {
      mockFromFn.mockReturnValueOnce(
        createFilteredChainableMock({ data: [], error: null })
      );

      const mockJob = { data: { company_id: 'test-company-id' } };
      await processEscalationCheckJob(mockJob as any);
      expect(mockFromFn).toHaveBeenCalledWith('compliance_clocks_universal');
    });

    it('should filter by site_id when provided', async () => {
      mockFromFn.mockReturnValueOnce(
        createFilteredChainableMock({ data: [], error: null })
      );

      const mockJob = { data: { site_id: 'test-site-id' } };
      await processEscalationCheckJob(mockJob as any);
      expect(mockFromFn).toHaveBeenCalledWith('compliance_clocks_universal');
    });

    it('should filter by both company_id and site_id when both provided', async () => {
      mockFromFn.mockReturnValueOnce(
        createDoubleFilteredChainableMock({ data: [], error: null })
      );

      const mockJob = { data: { company_id: 'test-company-id', site_id: 'test-site-id' } };
      await processEscalationCheckJob(mockJob as any);
      expect(mockFromFn).toHaveBeenCalledWith('compliance_clocks_universal');
    });

    it('should process overdue obligation and create Level 1 escalation', async () => {
      const overdueItem = createMockOverdueItem(2); // 2 days overdue
      const mockObligation = createMockObligation();
      const mockWorkflow = createMockWorkflow();
      const mockRecipients = [{ userId: 'user-1', email: 'user1@example.com' }];

      // Mock clock query
      mockFromFn.mockReturnValueOnce(
        createChainableMock({ data: [overdueItem], error: null })
      );

      // Mock obligation query
      mockFromFn.mockReturnValueOnce(
        createEntityQueryMock({ data: mockObligation, error: null })
      );

      // Mock escalation workflow matching and level determination
      mockMatchEscalationWorkflow.mockResolvedValue(mockWorkflow);
      mockDetermineEscalationLevel.mockReturnValue(1);
      mockGetCurrentEscalationLevel.mockResolvedValue(0);
      mockGetEscalationRecipientsFromWorkflow.mockResolvedValue(mockRecipients);
      mockCreateOrUpdateEscalation.mockResolvedValue('escalation-1');

      // Mock notification insert
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'notification-1' }], error: null })
      );

      const mockJob = { data: {} };
      await processEscalationCheckJob(mockJob as any);

      expect(mockFromFn).toHaveBeenCalledWith('compliance_clocks_universal');
      expect(mockFromFn).toHaveBeenCalledWith('obligations');
      expect(mockFromFn).toHaveBeenCalledWith('notifications');
      expect(mockMatchEscalationWorkflow).toHaveBeenCalledWith('company-1', 'ENVIRONMENTAL', 2);
      expect(mockDetermineEscalationLevel).toHaveBeenCalledWith(2, mockWorkflow);
      expect(mockGetCurrentEscalationLevel).toHaveBeenCalledWith('obligation', 'obligation-1');
      expect(mockGetEscalationRecipientsFromWorkflow).toHaveBeenCalledWith(mockWorkflow, 1);
      expect(mockCreateOrUpdateEscalation).toHaveBeenCalled();
    });

    it('should process overdue deadline and create Level 2 escalation', async () => {
      const overdueItem = createMockOverdueItem(5, { entity_type: 'DEADLINE', entity_id: 'deadline-1' });
      const mockDeadline = createMockDeadline();
      const mockWorkflow = createMockWorkflow();
      const mockRecipients = [
        { userId: 'user-1', email: 'user1@example.com' },
        { userId: 'user-2', email: 'user2@example.com' },
      ];

      // Mock clock query
      mockFromFn.mockReturnValueOnce(
        createChainableMock({ data: [overdueItem], error: null })
      );

      // Mock deadline query
      mockFromFn.mockReturnValueOnce(
        createEntityQueryMock({ data: mockDeadline, error: null })
      );

      // Mock escalation workflow matching and level determination
      mockMatchEscalationWorkflow.mockResolvedValue(mockWorkflow);
      mockDetermineEscalationLevel.mockReturnValue(2);
      mockGetCurrentEscalationLevel.mockResolvedValue(0);
      mockGetEscalationRecipientsFromWorkflow.mockResolvedValue(mockRecipients);
      mockCreateOrUpdateEscalation.mockResolvedValue('escalation-2');

      // Mock notification insert
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'notification-1' }, { id: 'notification-2' }], error: null })
      );

      const mockJob = { data: {} };
      await processEscalationCheckJob(mockJob as any);

      expect(mockFromFn).toHaveBeenCalledWith('compliance_clocks_universal');
      expect(mockFromFn).toHaveBeenCalledWith('deadlines');
      expect(mockFromFn).toHaveBeenCalledWith('notifications');
      expect(mockDetermineEscalationLevel).toHaveBeenCalledWith(5, mockWorkflow);
      expect(mockGetEscalationRecipientsFromWorkflow).toHaveBeenCalledWith(mockWorkflow, 2);
    });

    it('should create Level 3 escalation with CRITICAL priority for highly overdue items', async () => {
      const overdueItem = createMockOverdueItem(10); // 10 days overdue
      const mockObligation = createMockObligation();
      const mockWorkflow = createMockWorkflow();
      const mockRecipients = [
        { userId: 'user-1', email: 'user1@example.com' },
        { userId: 'user-2', email: 'user2@example.com' },
        { userId: 'user-3', email: 'user3@example.com' },
      ];

      mockFromFn.mockReturnValueOnce(
        createChainableMock({ data: [overdueItem], error: null })
      );

      mockFromFn.mockReturnValueOnce(
        createEntityQueryMock({ data: mockObligation, error: null })
      );

      mockMatchEscalationWorkflow.mockResolvedValue(mockWorkflow);
      mockDetermineEscalationLevel.mockReturnValue(3);
      mockGetCurrentEscalationLevel.mockResolvedValue(0);
      mockGetEscalationRecipientsFromWorkflow.mockResolvedValue(mockRecipients);
      mockCreateOrUpdateEscalation.mockResolvedValue('escalation-3');

      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'notification-1' }], error: null })
      );

      const mockJob = { data: {} };
      await processEscalationCheckJob(mockJob as any);

      expect(mockDetermineEscalationLevel).toHaveBeenCalledWith(10, mockWorkflow);
      expect(mockGetEscalationRecipientsFromWorkflow).toHaveBeenCalledWith(mockWorkflow, 3);
    });

    it('should use system default workflow when no company workflow is found', async () => {
      const overdueItem = createMockOverdueItem(2);
      const mockObligation = createMockObligation();
      const systemDefaultWorkflow = {
        id: 'system-default',
        company_id: '',
        obligation_category: null,
        level_1_days: 1,
        level_2_days: 3,
        level_3_days: 7,
        level_4_days: 14,
        level_1_recipients: [],
        level_2_recipients: [],
        level_3_recipients: [],
        level_4_recipients: [],
        is_active: true,
      };
      const mockRecipients = [{ userId: 'user-1', email: 'user1@example.com' }];

      mockFromFn.mockReturnValueOnce(
        createChainableMock({ data: [overdueItem], error: null })
      );

      mockFromFn.mockReturnValueOnce(
        createEntityQueryMock({ data: mockObligation, error: null })
      );

      mockMatchEscalationWorkflow.mockResolvedValue(null);
      mockGetSystemDefaultWorkflow.mockReturnValue(systemDefaultWorkflow);
      mockDetermineEscalationLevel.mockReturnValue(1);
      mockGetCurrentEscalationLevel.mockResolvedValue(0);
      mockGetEscalationRecipientsFromWorkflow.mockResolvedValue(mockRecipients);
      mockCreateOrUpdateEscalation.mockResolvedValue('escalation-1');

      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'notification-1' }], error: null })
      );

      const mockJob = { data: {} };
      await processEscalationCheckJob(mockJob as any);

      expect(mockGetSystemDefaultWorkflow).toHaveBeenCalled();
      expect(mockDetermineEscalationLevel).toHaveBeenCalledWith(2, systemDefaultWorkflow);
    });

    it('should skip escalation when escalation level is 0 (not yet reached threshold)', async () => {
      const overdueItem = createMockOverdueItem(1); // Only 1 day overdue
      const mockObligation = createMockObligation();
      const mockWorkflow = createMockWorkflow({ level_1_days: 3 }); // Threshold is 3 days

      mockFromFn.mockReturnValueOnce(
        createChainableMock({ data: [overdueItem], error: null })
      );

      mockFromFn.mockReturnValueOnce(
        createEntityQueryMock({ data: mockObligation, error: null })
      );

      mockMatchEscalationWorkflow.mockResolvedValue(mockWorkflow);
      mockDetermineEscalationLevel.mockReturnValue(0); // Not yet reached threshold

      const mockJob = { data: {} };
      await processEscalationCheckJob(mockJob as any);

      expect(mockGetCurrentEscalationLevel).not.toHaveBeenCalled();
      expect(mockGetEscalationRecipientsFromWorkflow).not.toHaveBeenCalled();
      expect(mockCreateOrUpdateEscalation).not.toHaveBeenCalled();
    });

    it('should prevent double-escalation by checking current escalation level', async () => {
      const overdueItem = createMockOverdueItem(5);
      const mockObligation = createMockObligation();
      const mockWorkflow = createMockWorkflow();

      mockFromFn.mockReturnValueOnce(
        createChainableMock({ data: [overdueItem], error: null })
      );

      mockFromFn.mockReturnValueOnce(
        createEntityQueryMock({ data: mockObligation, error: null })
      );

      mockMatchEscalationWorkflow.mockResolvedValue(mockWorkflow);
      mockDetermineEscalationLevel.mockReturnValue(2);
      mockGetCurrentEscalationLevel.mockResolvedValue(2); // Already at level 2

      const mockJob = { data: {} };
      await processEscalationCheckJob(mockJob as any);

      expect(mockGetCurrentEscalationLevel).toHaveBeenCalledWith('obligation', 'obligation-1');
      expect(mockGetEscalationRecipientsFromWorkflow).not.toHaveBeenCalled();
      expect(mockCreateOrUpdateEscalation).not.toHaveBeenCalled();
    });

    it('should skip escalation when no recipients are found', async () => {
      const overdueItem = createMockOverdueItem(2);
      const mockObligation = createMockObligation();
      const mockWorkflow = createMockWorkflow();

      mockFromFn.mockReturnValueOnce(
        createChainableMock({ data: [overdueItem], error: null })
      );

      mockFromFn.mockReturnValueOnce(
        createEntityQueryMock({ data: mockObligation, error: null })
      );

      mockMatchEscalationWorkflow.mockResolvedValue(mockWorkflow);
      mockDetermineEscalationLevel.mockReturnValue(1);
      mockGetCurrentEscalationLevel.mockResolvedValue(0);
      mockGetEscalationRecipientsFromWorkflow.mockResolvedValue([]); // No recipients

      const mockJob = { data: {} };
      await processEscalationCheckJob(mockJob as any);

      expect(mockGetEscalationRecipientsFromWorkflow).toHaveBeenCalledWith(mockWorkflow, 1);
      expect(mockCreateOrUpdateEscalation).not.toHaveBeenCalled();
    });

    it('should skip escalation when escalation record creation fails', async () => {
      const overdueItem = createMockOverdueItem(2);
      const mockObligation = createMockObligation();
      const mockWorkflow = createMockWorkflow();
      const mockRecipients = [{ userId: 'user-1', email: 'user1@example.com' }];

      mockFromFn.mockReturnValueOnce(
        createChainableMock({ data: [overdueItem], error: null })
      );

      mockFromFn.mockReturnValueOnce(
        createEntityQueryMock({ data: mockObligation, error: null })
      );

      mockMatchEscalationWorkflow.mockResolvedValue(mockWorkflow);
      mockDetermineEscalationLevel.mockReturnValue(1);
      mockGetCurrentEscalationLevel.mockResolvedValue(0);
      mockGetEscalationRecipientsFromWorkflow.mockResolvedValue(mockRecipients);
      mockCreateOrUpdateEscalation.mockResolvedValue(null); // Failed to create

      const mockJob = { data: {} };
      await processEscalationCheckJob(mockJob as any);

      expect(mockCreateOrUpdateEscalation).toHaveBeenCalled();
      // Should not attempt to insert notifications
      expect(mockFromFn).not.toHaveBeenCalledWith('notifications');
    });

    it('should skip entity when obligation/deadline details are not found', async () => {
      const overdueItem = createMockOverdueItem(2);

      mockFromFn.mockReturnValueOnce(
        createChainableMock({ data: [overdueItem], error: null })
      );

      mockFromFn.mockReturnValueOnce(
        createEntityQueryMock({ data: null, error: { message: 'Not found' } })
      );

      const mockJob = { data: {} };
      await processEscalationCheckJob(mockJob as any);

      expect(mockFromFn).toHaveBeenCalledWith('obligations');
      expect(mockMatchEscalationWorkflow).not.toHaveBeenCalled();
    });

    it('should continue processing other items when one fails', async () => {
      const overdueItem1 = createMockOverdueItem(2, { id: 'clock-1', entity_id: 'obligation-1' });
      const overdueItem2 = createMockOverdueItem(5, { id: 'clock-2', entity_id: 'obligation-2' });
      const mockObligation1 = createMockObligation({ id: 'obligation-1' });
      const mockObligation2 = createMockObligation({ id: 'obligation-2' });
      const mockWorkflow = createMockWorkflow();
      const mockRecipients = [{ userId: 'user-1', email: 'user1@example.com' }];

      // Mock clock query - returns both items
      mockFromFn.mockReturnValueOnce(
        createChainableMock({ data: [overdueItem1, overdueItem2], error: null })
      );

      // First item - obligation query returns null (should skip)
      mockFromFn.mockReturnValueOnce(
        createEntityQueryMock({ data: null, error: { message: 'Not found' } })
      );

      // Second item - obligation query succeeds
      mockFromFn.mockReturnValueOnce(
        createEntityQueryMock({ data: mockObligation2, error: null })
      );

      mockMatchEscalationWorkflow.mockResolvedValue(mockWorkflow);
      mockDetermineEscalationLevel.mockReturnValue(2);
      mockGetCurrentEscalationLevel.mockResolvedValue(0);
      mockGetEscalationRecipientsFromWorkflow.mockResolvedValue(mockRecipients);
      mockCreateOrUpdateEscalation.mockResolvedValue('escalation-2');

      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'notification-1' }], error: null })
      );

      const mockJob = { data: {} };
      await expect(processEscalationCheckJob(mockJob as any)).resolves.not.toThrow();

      // Should have processed second item successfully
      expect(mockCreateOrUpdateEscalation).toHaveBeenCalledTimes(1);
    });

    it('should process multiple overdue items with different escalation levels', async () => {
      const overdueItem1 = createMockOverdueItem(2, { id: 'clock-1', entity_id: 'obligation-1' }); // Level 1
      const overdueItem2 = createMockOverdueItem(8, { id: 'clock-2', entity_id: 'obligation-2' }); // Level 3
      const mockObligation1 = createMockObligation({ id: 'obligation-1' });
      const mockObligation2 = createMockObligation({ id: 'obligation-2' });
      const mockWorkflow = createMockWorkflow();
      const mockRecipients1 = [{ userId: 'user-1', email: 'user1@example.com' }];
      const mockRecipients2 = [
        { userId: 'user-1', email: 'user1@example.com' },
        { userId: 'user-2', email: 'user2@example.com' },
        { userId: 'user-3', email: 'user3@example.com' },
      ];

      // Mock clock query - returns both items
      mockFromFn.mockReturnValueOnce(
        createChainableMock({ data: [overdueItem1, overdueItem2], error: null })
      );

      // First item - obligation query
      mockFromFn.mockReturnValueOnce(
        createEntityQueryMock({ data: mockObligation1, error: null })
      );

      mockMatchEscalationWorkflow.mockResolvedValueOnce(mockWorkflow);
      mockDetermineEscalationLevel.mockReturnValueOnce(1);
      mockGetCurrentEscalationLevel.mockResolvedValueOnce(0);
      mockGetEscalationRecipientsFromWorkflow.mockResolvedValueOnce(mockRecipients1);
      mockCreateOrUpdateEscalation.mockResolvedValueOnce('escalation-1');

      // First item - notification insert
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'notification-1' }], error: null })
      );

      // Second item - obligation query
      mockFromFn.mockReturnValueOnce(
        createEntityQueryMock({ data: mockObligation2, error: null })
      );

      mockMatchEscalationWorkflow.mockResolvedValueOnce(mockWorkflow);
      mockDetermineEscalationLevel.mockReturnValueOnce(3);
      mockGetCurrentEscalationLevel.mockResolvedValueOnce(0);
      mockGetEscalationRecipientsFromWorkflow.mockResolvedValueOnce(mockRecipients2);
      mockCreateOrUpdateEscalation.mockResolvedValueOnce('escalation-2');

      // Second item - notification insert
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'notification-2' }], error: null })
      );

      const mockJob = { data: {} };
      await processEscalationCheckJob(mockJob as any);

      expect(mockDetermineEscalationLevel).toHaveBeenNthCalledWith(1, 2, mockWorkflow);
      expect(mockDetermineEscalationLevel).toHaveBeenNthCalledWith(2, 8, mockWorkflow);
      expect(mockGetEscalationRecipientsFromWorkflow).toHaveBeenNthCalledWith(1, mockWorkflow, 1);
      expect(mockGetEscalationRecipientsFromWorkflow).toHaveBeenNthCalledWith(2, mockWorkflow, 3);
      expect(mockCreateOrUpdateEscalation).toHaveBeenCalledTimes(2);
    });

    it('should set correct priority for Level 3 escalation (CRITICAL)', async () => {
      const overdueItem = createMockOverdueItem(10);
      const mockObligation = createMockObligation();
      const mockWorkflow = createMockWorkflow();
      const mockRecipients = [{ userId: 'user-1', email: 'user1@example.com' }];

      mockFromFn.mockReturnValueOnce(
        createChainableMock({ data: [overdueItem], error: null })
      );

      mockFromFn.mockReturnValueOnce(
        createEntityQueryMock({ data: mockObligation, error: null })
      );

      mockMatchEscalationWorkflow.mockResolvedValue(mockWorkflow);
      mockDetermineEscalationLevel.mockReturnValue(3);
      mockGetCurrentEscalationLevel.mockResolvedValue(0);
      mockGetEscalationRecipientsFromWorkflow.mockResolvedValue(mockRecipients);
      mockCreateOrUpdateEscalation.mockResolvedValue('escalation-1');

      // Capture the insert call to verify priority
      let insertedNotifications: any[] = [];
      mockFromFn.mockReturnValueOnce({
        insert: jest.fn((notifications) => {
          insertedNotifications = notifications;
          return Promise.resolve({ data: [{ id: 'notification-1' }], error: null });
        }),
      });

      const mockJob = { data: {} };
      await processEscalationCheckJob(mockJob as any);

      expect(insertedNotifications[0].priority).toBe('CRITICAL');
    });

    it('should set correct priority for Level 2 escalation (HIGH)', async () => {
      const overdueItem = createMockOverdueItem(5);
      const mockObligation = createMockObligation();
      const mockWorkflow = createMockWorkflow();
      const mockRecipients = [{ userId: 'user-1', email: 'user1@example.com' }];

      mockFromFn.mockReturnValueOnce(
        createChainableMock({ data: [overdueItem], error: null })
      );

      mockFromFn.mockReturnValueOnce(
        createEntityQueryMock({ data: mockObligation, error: null })
      );

      mockMatchEscalationWorkflow.mockResolvedValue(mockWorkflow);
      mockDetermineEscalationLevel.mockReturnValue(2);
      mockGetCurrentEscalationLevel.mockResolvedValue(0);
      mockGetEscalationRecipientsFromWorkflow.mockResolvedValue(mockRecipients);
      mockCreateOrUpdateEscalation.mockResolvedValue('escalation-1');

      let insertedNotifications: any[] = [];
      mockFromFn.mockReturnValueOnce({
        insert: jest.fn((notifications) => {
          insertedNotifications = notifications;
          return Promise.resolve({ data: [{ id: 'notification-1' }], error: null });
        }),
      });

      const mockJob = { data: {} };
      await processEscalationCheckJob(mockJob as any);

      expect(insertedNotifications[0].priority).toBe('HIGH');
    });

    it('should set correct priority for Level 1 escalation (NORMAL)', async () => {
      const overdueItem = createMockOverdueItem(2);
      const mockObligation = createMockObligation();
      const mockWorkflow = createMockWorkflow();
      const mockRecipients = [{ userId: 'user-1', email: 'user1@example.com' }];

      mockFromFn.mockReturnValueOnce(
        createChainableMock({ data: [overdueItem], error: null })
      );

      mockFromFn.mockReturnValueOnce(
        createEntityQueryMock({ data: mockObligation, error: null })
      );

      mockMatchEscalationWorkflow.mockResolvedValue(mockWorkflow);
      mockDetermineEscalationLevel.mockReturnValue(1);
      mockGetCurrentEscalationLevel.mockResolvedValue(0);
      mockGetEscalationRecipientsFromWorkflow.mockResolvedValue(mockRecipients);
      mockCreateOrUpdateEscalation.mockResolvedValue('escalation-1');

      let insertedNotifications: any[] = [];
      mockFromFn.mockReturnValueOnce({
        insert: jest.fn((notifications) => {
          insertedNotifications = notifications;
          return Promise.resolve({ data: [{ id: 'notification-1' }], error: null });
        }),
      });

      const mockJob = { data: {} };
      await processEscalationCheckJob(mockJob as any);

      expect(insertedNotifications[0].priority).toBe('NORMAL');
    });

    it('should include escalation metadata in notification', async () => {
      const overdueItem = createMockOverdueItem(5);
      const mockObligation = createMockObligation();
      const mockWorkflow = createMockWorkflow();
      const mockRecipients = [{ userId: 'user-1', email: 'user1@example.com' }];

      mockFromFn.mockReturnValueOnce(
        createChainableMock({ data: [overdueItem], error: null })
      );

      mockFromFn.mockReturnValueOnce(
        createEntityQueryMock({ data: mockObligation, error: null })
      );

      mockMatchEscalationWorkflow.mockResolvedValue(mockWorkflow);
      mockDetermineEscalationLevel.mockReturnValue(2);
      mockGetCurrentEscalationLevel.mockResolvedValue(0);
      mockGetEscalationRecipientsFromWorkflow.mockResolvedValue(mockRecipients);
      mockCreateOrUpdateEscalation.mockResolvedValue('escalation-1');

      let insertedNotifications: any[] = [];
      mockFromFn.mockReturnValueOnce({
        insert: jest.fn((notifications) => {
          insertedNotifications = notifications;
          return Promise.resolve({ data: [{ id: 'notification-1' }], error: null });
        }),
      });

      const mockJob = { data: {} };
      await processEscalationCheckJob(mockJob as any);

      expect(insertedNotifications[0].metadata).toEqual({
        escalation_id: 'escalation-1',
        days_overdue: 5,
        workflow_id: 'workflow-1',
        workflow_name: 'Environmental Escalation Workflow',
      });
      expect(insertedNotifications[0].is_escalation).toBe(true);
      expect(insertedNotifications[0].escalation_level).toBe(2);
      expect(insertedNotifications[0].escalation_state).toBe('ESCALATED_LEVEL_2');
    });
  });

  describe('EscalationCheckJobData interface', () => {
    it('should accept empty data object', () => {
      const data: EscalationCheckJobData = {};
      expect(data.company_id).toBeUndefined();
      expect(data.site_id).toBeUndefined();
    });

    it('should accept company_id', () => {
      const data: EscalationCheckJobData = { company_id: 'test-company' };
      expect(data.company_id).toBe('test-company');
    });

    it('should accept site_id', () => {
      const data: EscalationCheckJobData = { site_id: 'test-site' };
      expect(data.site_id).toBe('test-site');
    });

    it('should accept both company_id and site_id', () => {
      const data: EscalationCheckJobData = { company_id: 'test-company', site_id: 'test-site' };
      expect(data.company_id).toBe('test-company');
      expect(data.site_id).toBe('test-site');
    });
  });
});
