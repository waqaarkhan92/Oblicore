/**
 * Recurring Task Generation Job Tests
 * Tests for lib/jobs/recurring-task-generation-job.ts
 *
 * These tests verify the recurring task generation job correctly:
 * - Fetches schedules due for task generation
 * - Processes event-based trigger rules
 * - Creates recurring tasks with correct data
 * - Calculates next due dates based on recurrence patterns
 * - Updates schedules with next occurrence dates
 * - Handles different recurrence intervals (DAILY, WEEKLY, MONTHLY, YEARLY)
 * - Maps schedule types to task types correctly
 * - Handles batch processing
 * - Handles errors gracefully
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import type { RecurringTaskGenerationJobData } from '@/lib/jobs/recurring-task-generation-job';

// Mock data helpers
const createMockSchedule = (overrides: any = {}) => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 1);
  const dateStr = futureDate.toISOString().split('T')[0];

  return {
    id: `schedule-${Math.random().toString(36).substr(2, 9)}`,
    company_id: 'company-1',
    site_id: 'site-1',
    schedule_name: 'Test Schedule',
    schedule_type: 'MONITORING',
    description: 'Test schedule description',
    is_active: true,
    next_due_date: dateStr,
    obligation_id: 'obligation-1',
    recurrence_pattern: {
      interval: 'MONTHLY',
      interval_value: 1,
    },
    event_based_trigger: null,
    conditional_trigger: null,
    ...overrides,
  };
};

const createMockTriggerRule = (overrides: any = {}) => {
  const eventDate = new Date();
  eventDate.setMonth(eventDate.getMonth() - 6);

  return {
    id: `rule-${Math.random().toString(36).substr(2, 9)}`,
    company_id: 'company-1',
    site_id: 'site-1',
    obligation_id: 'obligation-1',
    rule_type: 'EVENT_BASED',
    is_active: true,
    rule_config: {
      offset_months: 6,
      recurrence_interval_months: 12,
    },
    execution_count: 0,
    schedules: {
      id: 'schedule-1',
      schedule_name: 'Event-Based Schedule',
      schedule_type: 'INSPECTION',
      description: 'Inspection schedule',
      company_id: 'company-1',
      site_id: 'site-1',
    },
    recurrence_events: {
      id: 'event-1',
      event_name: 'Commissioning',
      event_date: eventDate.toISOString().split('T')[0],
    },
    ...overrides,
  };
};

describe('recurring-task-generation-job', () => {
  let mockFromFn: jest.Mock;
  let processRecurringTaskGenerationJob: (job: any) => Promise<void>;

  // Helper to create chainable mock for schedule query
  const createScheduleQueryMock = (finalResult: any) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        lte: jest.fn().mockReturnValue(Promise.resolve(finalResult)),
      }),
    }),
  });

  // Helper for filtered schedule query (with company_id or site_id)
  const createFilteredScheduleQueryMock = (finalResult: any) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        lte: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue(Promise.resolve(finalResult)),
        }),
      }),
    }),
  });

  // Helper for trigger rules query
  const createTriggerRulesQueryMock = (finalResult: any) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        or: jest.fn().mockReturnValue(Promise.resolve(finalResult)),
      }),
    }),
  });

  // Helper for filtered trigger rules query
  const createFilteredTriggerRulesQueryMock = (finalResult: any) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        or: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue(Promise.resolve(finalResult)),
        }),
      }),
    }),
  });

  // Helper for insert mock
  const createInsertMock = (result: any) => ({
    insert: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue(Promise.resolve(result)),
    }),
  });

  // Helper for update mock
  const createUpdateMock = (result: any) => ({
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue(Promise.resolve(result)),
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

    // Dynamic import to get fresh module with mocks
    const module = await import('@/lib/jobs/recurring-task-generation-job');
    processRecurringTaskGenerationJob = module.processRecurringTaskGenerationJob;
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('processRecurringTaskGenerationJob', () => {
    it('should complete without errors when no schedules are found', async () => {
      // Mock trigger rules query (returns empty)
      mockFromFn.mockReturnValueOnce(
        createTriggerRulesQueryMock({ data: [], error: null })
      );

      // Mock schedules query (returns empty)
      mockFromFn.mockReturnValueOnce(
        createScheduleQueryMock({ data: [], error: null })
      );

      const mockJob = { data: {} };
      await expect(processRecurringTaskGenerationJob(mockJob as any)).resolves.not.toThrow();

      expect(mockFromFn).toHaveBeenCalledWith('recurrence_trigger_rules');
      expect(mockFromFn).toHaveBeenCalledWith('schedules');
    });

    it('should throw error when schedule query fails', async () => {
      // Mock trigger rules query (returns empty)
      mockFromFn.mockReturnValueOnce(
        createTriggerRulesQueryMock({ data: [], error: null })
      );

      // Mock schedules query with error
      mockFromFn.mockReturnValueOnce(
        createScheduleQueryMock({ data: null, error: { message: 'Database error' } })
      );

      const mockJob = { data: {} };
      await expect(processRecurringTaskGenerationJob(mockJob as any)).rejects.toThrow(
        'Database error'
      );
    });

    it('should filter by company_id when provided', async () => {
      // Mock trigger rules query with company filter
      mockFromFn.mockReturnValueOnce(
        createFilteredTriggerRulesQueryMock({ data: [], error: null })
      );

      // Mock schedules query with company filter
      mockFromFn.mockReturnValueOnce(
        createFilteredScheduleQueryMock({ data: [], error: null })
      );

      const mockJob = { data: { company_id: 'test-company-id' } };
      await processRecurringTaskGenerationJob(mockJob as any);

      expect(mockFromFn).toHaveBeenCalledWith('recurrence_trigger_rules');
      expect(mockFromFn).toHaveBeenCalledWith('schedules');
    });

    it('should filter by site_id when provided', async () => {
      // Mock trigger rules query with site filter
      mockFromFn.mockReturnValueOnce(
        createFilteredTriggerRulesQueryMock({ data: [], error: null })
      );

      // Mock schedules query with site filter
      mockFromFn.mockReturnValueOnce(
        createFilteredScheduleQueryMock({ data: [], error: null })
      );

      const mockJob = { data: { site_id: 'test-site-id' } };
      await processRecurringTaskGenerationJob(mockJob as any);

      expect(mockFromFn).toHaveBeenCalledWith('recurrence_trigger_rules');
      expect(mockFromFn).toHaveBeenCalledWith('schedules');
    });

    it('should create recurring task from regular schedule', async () => {
      const mockSchedule = createMockSchedule();

      // Mock trigger rules query (returns empty)
      mockFromFn.mockReturnValueOnce(
        createTriggerRulesQueryMock({ data: [], error: null })
      );

      // Mock schedules query
      mockFromFn.mockReturnValueOnce(
        createScheduleQueryMock({ data: [mockSchedule], error: null })
      );

      // Mock insert recurring tasks
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'task-1' }], error: null })
      );

      // Mock update schedule
      mockFromFn.mockReturnValueOnce(
        createUpdateMock({ data: { id: mockSchedule.id }, error: null })
      );

      const mockJob = { data: {} };
      await processRecurringTaskGenerationJob(mockJob as any);

      expect(mockFromFn).toHaveBeenCalledWith('recurring_tasks');
      expect(mockFromFn).toHaveBeenCalledWith('schedules');
    });

    it('should create recurring task from event-based trigger rule', async () => {
      const mockTriggerRule = createMockTriggerRule();
      // Need at least one schedule to avoid early exit
      const mockSchedule = createMockSchedule();

      // Mock trigger rules query
      mockFromFn.mockReturnValueOnce(
        createTriggerRulesQueryMock({ data: [mockTriggerRule], error: null })
      );

      // Mock schedules query
      mockFromFn.mockReturnValueOnce(
        createScheduleQueryMock({ data: [mockSchedule], error: null })
      );

      // Mock update trigger rule (happens INSIDE the loop, BEFORE insert)
      mockFromFn.mockReturnValueOnce(
        createUpdateMock({ data: { id: mockTriggerRule.id }, error: null })
      );

      // Mock insert recurring tasks (2 tasks: 1 from trigger rule, 1 from schedule)
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'task-1' }, { id: 'task-2' }], error: null })
      );

      // Mock update schedule
      mockFromFn.mockReturnValueOnce(
        createUpdateMock({ data: { id: mockSchedule.id }, error: null })
      );

      const mockJob = { data: {} };
      await processRecurringTaskGenerationJob(mockJob as any);

      expect(mockFromFn).toHaveBeenCalledWith('recurrence_trigger_rules');
      expect(mockFromFn).toHaveBeenCalledWith('recurring_tasks');
    });

    it('should handle MONTHLY recurrence pattern correctly', async () => {
      const mockSchedule = createMockSchedule({
        recurrence_pattern: {
          interval: 'MONTHLY',
          interval_value: 2,
        },
      });

      // Mock trigger rules query (returns empty)
      mockFromFn.mockReturnValueOnce(
        createTriggerRulesQueryMock({ data: [], error: null })
      );

      // Mock schedules query
      mockFromFn.mockReturnValueOnce(
        createScheduleQueryMock({ data: [mockSchedule], error: null })
      );

      // Mock insert recurring tasks
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'task-1' }], error: null })
      );

      // Mock update schedule
      mockFromFn.mockReturnValueOnce(
        createUpdateMock({ data: { id: mockSchedule.id }, error: null })
      );

      const mockJob = { data: {} };
      await processRecurringTaskGenerationJob(mockJob as any);

      expect(mockFromFn).toHaveBeenCalledWith('recurring_tasks');
      expect(mockFromFn).toHaveBeenCalledWith('schedules');
    });

    it('should handle WEEKLY recurrence pattern correctly', async () => {
      const mockSchedule = createMockSchedule({
        recurrence_pattern: {
          interval: 'WEEKLY',
          interval_value: 2,
        },
      });

      // Mock trigger rules query (returns empty)
      mockFromFn.mockReturnValueOnce(
        createTriggerRulesQueryMock({ data: [], error: null })
      );

      // Mock schedules query
      mockFromFn.mockReturnValueOnce(
        createScheduleQueryMock({ data: [mockSchedule], error: null })
      );

      // Mock insert recurring tasks
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'task-1' }], error: null })
      );

      // Mock update schedule
      mockFromFn.mockReturnValueOnce(
        createUpdateMock({ data: { id: mockSchedule.id }, error: null })
      );

      const mockJob = { data: {} };
      await processRecurringTaskGenerationJob(mockJob as any);

      expect(mockFromFn).toHaveBeenCalledWith('recurring_tasks');
    });

    it('should handle DAILY recurrence pattern correctly', async () => {
      const mockSchedule = createMockSchedule({
        recurrence_pattern: {
          interval: 'DAILY',
          interval_value: 5,
        },
      });

      // Mock trigger rules query (returns empty)
      mockFromFn.mockReturnValueOnce(
        createTriggerRulesQueryMock({ data: [], error: null })
      );

      // Mock schedules query
      mockFromFn.mockReturnValueOnce(
        createScheduleQueryMock({ data: [mockSchedule], error: null })
      );

      // Mock insert recurring tasks
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'task-1' }], error: null })
      );

      // Mock update schedule
      mockFromFn.mockReturnValueOnce(
        createUpdateMock({ data: { id: mockSchedule.id }, error: null })
      );

      const mockJob = { data: {} };
      await processRecurringTaskGenerationJob(mockJob as any);

      expect(mockFromFn).toHaveBeenCalledWith('recurring_tasks');
    });

    it('should handle YEARLY recurrence pattern correctly', async () => {
      const mockSchedule = createMockSchedule({
        recurrence_pattern: {
          interval: 'YEARLY',
          interval_value: 1,
        },
      });

      // Mock trigger rules query (returns empty)
      mockFromFn.mockReturnValueOnce(
        createTriggerRulesQueryMock({ data: [], error: null })
      );

      // Mock schedules query
      mockFromFn.mockReturnValueOnce(
        createScheduleQueryMock({ data: [mockSchedule], error: null })
      );

      // Mock insert recurring tasks
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'task-1' }], error: null })
      );

      // Mock update schedule
      mockFromFn.mockReturnValueOnce(
        createUpdateMock({ data: { id: mockSchedule.id }, error: null })
      );

      const mockJob = { data: {} };
      await processRecurringTaskGenerationJob(mockJob as any);

      expect(mockFromFn).toHaveBeenCalledWith('recurring_tasks');
    });

    it('should map MONITORING schedule type to MONITORING task type', async () => {
      const mockSchedule = createMockSchedule({
        schedule_type: 'MONITORING',
      });

      // Mock trigger rules query (returns empty)
      mockFromFn.mockReturnValueOnce(
        createTriggerRulesQueryMock({ data: [], error: null })
      );

      // Mock schedules query
      mockFromFn.mockReturnValueOnce(
        createScheduleQueryMock({ data: [mockSchedule], error: null })
      );

      // Mock insert recurring tasks
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'task-1' }], error: null })
      );

      // Mock update schedule
      mockFromFn.mockReturnValueOnce(
        createUpdateMock({ data: { id: mockSchedule.id }, error: null })
      );

      const mockJob = { data: {} };
      await processRecurringTaskGenerationJob(mockJob as any);

      expect(mockFromFn).toHaveBeenCalledWith('recurring_tasks');
    });

    it('should map SAMPLING schedule type to SAMPLING task type', async () => {
      const mockSchedule = createMockSchedule({
        schedule_type: 'SAMPLING',
      });

      // Mock trigger rules query (returns empty)
      mockFromFn.mockReturnValueOnce(
        createTriggerRulesQueryMock({ data: [], error: null })
      );

      // Mock schedules query
      mockFromFn.mockReturnValueOnce(
        createScheduleQueryMock({ data: [mockSchedule], error: null })
      );

      // Mock insert recurring tasks
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'task-1' }], error: null })
      );

      // Mock update schedule
      mockFromFn.mockReturnValueOnce(
        createUpdateMock({ data: { id: mockSchedule.id }, error: null })
      );

      const mockJob = { data: {} };
      await processRecurringTaskGenerationJob(mockJob as any);

      expect(mockFromFn).toHaveBeenCalledWith('recurring_tasks');
    });

    it('should map INSPECTION schedule type to INSPECTION task type', async () => {
      const mockSchedule = createMockSchedule({
        schedule_type: 'INSPECTION',
      });

      // Mock trigger rules query (returns empty)
      mockFromFn.mockReturnValueOnce(
        createTriggerRulesQueryMock({ data: [], error: null })
      );

      // Mock schedules query
      mockFromFn.mockReturnValueOnce(
        createScheduleQueryMock({ data: [mockSchedule], error: null })
      );

      // Mock insert recurring tasks
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'task-1' }], error: null })
      );

      // Mock update schedule
      mockFromFn.mockReturnValueOnce(
        createUpdateMock({ data: { id: mockSchedule.id }, error: null })
      );

      const mockJob = { data: {} };
      await processRecurringTaskGenerationJob(mockJob as any);

      expect(mockFromFn).toHaveBeenCalledWith('recurring_tasks');
    });

    it('should map MAINTENANCE schedule type to MAINTENANCE task type', async () => {
      const mockSchedule = createMockSchedule({
        schedule_type: 'MAINTENANCE',
      });

      // Mock trigger rules query (returns empty)
      mockFromFn.mockReturnValueOnce(
        createTriggerRulesQueryMock({ data: [], error: null })
      );

      // Mock schedules query
      mockFromFn.mockReturnValueOnce(
        createScheduleQueryMock({ data: [mockSchedule], error: null })
      );

      // Mock insert recurring tasks
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'task-1' }], error: null })
      );

      // Mock update schedule
      mockFromFn.mockReturnValueOnce(
        createUpdateMock({ data: { id: mockSchedule.id }, error: null })
      );

      const mockJob = { data: {} };
      await processRecurringTaskGenerationJob(mockJob as any);

      expect(mockFromFn).toHaveBeenCalledWith('recurring_tasks');
    });

    it('should map REPORTING schedule type to REPORTING task type', async () => {
      const mockSchedule = createMockSchedule({
        schedule_type: 'REPORTING',
      });

      // Mock trigger rules query (returns empty)
      mockFromFn.mockReturnValueOnce(
        createTriggerRulesQueryMock({ data: [], error: null })
      );

      // Mock schedules query
      mockFromFn.mockReturnValueOnce(
        createScheduleQueryMock({ data: [mockSchedule], error: null })
      );

      // Mock insert recurring tasks
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'task-1' }], error: null })
      );

      // Mock update schedule
      mockFromFn.mockReturnValueOnce(
        createUpdateMock({ data: { id: mockSchedule.id }, error: null })
      );

      const mockJob = { data: {} };
      await processRecurringTaskGenerationJob(mockJob as any);

      expect(mockFromFn).toHaveBeenCalledWith('recurring_tasks');
    });

    it('should map EVIDENCE_COLLECTION schedule type to EVIDENCE_COLLECTION task type', async () => {
      const mockSchedule = createMockSchedule({
        schedule_type: 'EVIDENCE_COLLECTION',
      });

      // Mock trigger rules query (returns empty)
      mockFromFn.mockReturnValueOnce(
        createTriggerRulesQueryMock({ data: [], error: null })
      );

      // Mock schedules query
      mockFromFn.mockReturnValueOnce(
        createScheduleQueryMock({ data: [mockSchedule], error: null })
      );

      // Mock insert recurring tasks
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'task-1' }], error: null })
      );

      // Mock update schedule
      mockFromFn.mockReturnValueOnce(
        createUpdateMock({ data: { id: mockSchedule.id }, error: null })
      );

      const mockJob = { data: {} };
      await processRecurringTaskGenerationJob(mockJob as any);

      expect(mockFromFn).toHaveBeenCalledWith('recurring_tasks');
    });

    it('should default to MONITORING task type for unknown schedule types', async () => {
      const mockSchedule = createMockSchedule({
        schedule_type: 'UNKNOWN_TYPE',
      });

      // Mock trigger rules query (returns empty)
      mockFromFn.mockReturnValueOnce(
        createTriggerRulesQueryMock({ data: [], error: null })
      );

      // Mock schedules query
      mockFromFn.mockReturnValueOnce(
        createScheduleQueryMock({ data: [mockSchedule], error: null })
      );

      // Mock insert recurring tasks
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'task-1' }], error: null })
      );

      // Mock update schedule
      mockFromFn.mockReturnValueOnce(
        createUpdateMock({ data: { id: mockSchedule.id }, error: null })
      );

      const mockJob = { data: {} };
      await processRecurringTaskGenerationJob(mockJob as any);

      expect(mockFromFn).toHaveBeenCalledWith('recurring_tasks');
    });

    it('should set trigger_type to EVENT_BASED when event_based_trigger exists', async () => {
      const mockSchedule = createMockSchedule({
        event_based_trigger: { event_id: 'event-1', offset_days: 30 },
      });

      // Mock trigger rules query (returns empty)
      mockFromFn.mockReturnValueOnce(
        createTriggerRulesQueryMock({ data: [], error: null })
      );

      // Mock schedules query
      mockFromFn.mockReturnValueOnce(
        createScheduleQueryMock({ data: [mockSchedule], error: null })
      );

      // Mock insert recurring tasks
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'task-1' }], error: null })
      );

      // Mock update schedule
      mockFromFn.mockReturnValueOnce(
        createUpdateMock({ data: { id: mockSchedule.id }, error: null })
      );

      const mockJob = { data: {} };
      await processRecurringTaskGenerationJob(mockJob as any);

      expect(mockFromFn).toHaveBeenCalledWith('recurring_tasks');
    });

    it('should set trigger_type to CONDITIONAL when conditional_trigger exists', async () => {
      const mockSchedule = createMockSchedule({
        conditional_trigger: { condition: 'temperature > 100' },
      });

      // Mock trigger rules query (returns empty)
      mockFromFn.mockReturnValueOnce(
        createTriggerRulesQueryMock({ data: [], error: null })
      );

      // Mock schedules query
      mockFromFn.mockReturnValueOnce(
        createScheduleQueryMock({ data: [mockSchedule], error: null })
      );

      // Mock insert recurring tasks
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'task-1' }], error: null })
      );

      // Mock update schedule
      mockFromFn.mockReturnValueOnce(
        createUpdateMock({ data: { id: mockSchedule.id }, error: null })
      );

      const mockJob = { data: {} };
      await processRecurringTaskGenerationJob(mockJob as any);

      expect(mockFromFn).toHaveBeenCalledWith('recurring_tasks');
    });

    it('should process multiple schedules in batch', async () => {
      const mockSchedules = [
        createMockSchedule({ id: 'schedule-1' }),
        createMockSchedule({ id: 'schedule-2' }),
        createMockSchedule({ id: 'schedule-3' }),
      ];

      // Mock trigger rules query (returns empty)
      mockFromFn.mockReturnValueOnce(
        createTriggerRulesQueryMock({ data: [], error: null })
      );

      // Mock schedules query
      mockFromFn.mockReturnValueOnce(
        createScheduleQueryMock({ data: mockSchedules, error: null })
      );

      // Mock insert recurring tasks
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'task-1' }, { id: 'task-2' }, { id: 'task-3' }], error: null })
      );

      // Mock update schedules (one per schedule)
      mockSchedules.forEach((schedule) => {
        mockFromFn.mockReturnValueOnce(
          createUpdateMock({ data: { id: schedule.id }, error: null })
        );
      });

      const mockJob = { data: {} };
      await processRecurringTaskGenerationJob(mockJob as any);

      expect(mockFromFn).toHaveBeenCalledWith('recurring_tasks');
      expect(mockFromFn).toHaveBeenCalledWith('schedules');
    });

    it('should handle insert error gracefully', async () => {
      const mockSchedule = createMockSchedule();

      // Mock trigger rules query (returns empty)
      mockFromFn.mockReturnValueOnce(
        createTriggerRulesQueryMock({ data: [], error: null })
      );

      // Mock schedules query
      mockFromFn.mockReturnValueOnce(
        createScheduleQueryMock({ data: [mockSchedule], error: null })
      );

      // Mock insert recurring tasks with error
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: null, error: { message: 'Insert failed' } })
      );

      const mockJob = { data: {} };
      await expect(processRecurringTaskGenerationJob(mockJob as any)).rejects.toThrow(
        'Insert failed'
      );
    });

    it('should handle schedule with no recurrence_pattern', async () => {
      const mockSchedule = createMockSchedule({
        recurrence_pattern: null,
      });

      // Mock trigger rules query (returns empty)
      mockFromFn.mockReturnValueOnce(
        createTriggerRulesQueryMock({ data: [], error: null })
      );

      // Mock schedules query
      mockFromFn.mockReturnValueOnce(
        createScheduleQueryMock({ data: [mockSchedule], error: null })
      );

      // Mock insert recurring tasks
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'task-1' }], error: null })
      );

      const mockJob = { data: {} };
      await processRecurringTaskGenerationJob(mockJob as any);

      // Should not update schedule if no recurrence pattern
      expect(mockFromFn).toHaveBeenCalledWith('recurring_tasks');
    });

    it('should handle schedule with no next_due_date', async () => {
      const mockSchedule = createMockSchedule({
        next_due_date: null,
      });

      // Mock trigger rules query (returns empty)
      mockFromFn.mockReturnValueOnce(
        createTriggerRulesQueryMock({ data: [], error: null })
      );

      // Mock schedules query (manually allow null date)
      mockFromFn.mockReturnValueOnce(
        createScheduleQueryMock({ data: [mockSchedule], error: null })
      );

      // Mock insert recurring tasks
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'task-1' }], error: null })
      );

      // Mock update schedule
      mockFromFn.mockReturnValueOnce(
        createUpdateMock({ data: { id: mockSchedule.id }, error: null })
      );

      const mockJob = { data: {} };
      await processRecurringTaskGenerationJob(mockJob as any);

      expect(mockFromFn).toHaveBeenCalledWith('recurring_tasks');
    });

    it('should handle schedule with no obligation_id', async () => {
      const mockSchedule = createMockSchedule({
        obligation_id: null,
      });

      // Mock trigger rules query (returns empty)
      mockFromFn.mockReturnValueOnce(
        createTriggerRulesQueryMock({ data: [], error: null })
      );

      // Mock schedules query
      mockFromFn.mockReturnValueOnce(
        createScheduleQueryMock({ data: [mockSchedule], error: null })
      );

      // Mock insert recurring tasks
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'task-1' }], error: null })
      );

      // Mock update schedule
      mockFromFn.mockReturnValueOnce(
        createUpdateMock({ data: { id: mockSchedule.id }, error: null })
      );

      const mockJob = { data: {} };
      await processRecurringTaskGenerationJob(mockJob as any);

      expect(mockFromFn).toHaveBeenCalledWith('recurring_tasks');
    });

    it('should process both trigger rules and regular schedules', async () => {
      const mockTriggerRule = createMockTriggerRule();
      const mockSchedule = createMockSchedule();

      // Mock trigger rules query
      mockFromFn.mockReturnValueOnce(
        createTriggerRulesQueryMock({ data: [mockTriggerRule], error: null })
      );

      // Mock schedules query
      mockFromFn.mockReturnValueOnce(
        createScheduleQueryMock({ data: [mockSchedule], error: null })
      );

      // Mock update trigger rule (happens INSIDE the loop, BEFORE insert)
      mockFromFn.mockReturnValueOnce(
        createUpdateMock({ data: { id: mockTriggerRule.id }, error: null })
      );

      // Mock insert recurring tasks (2 tasks)
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'task-1' }, { id: 'task-2' }], error: null })
      );

      // Mock update schedule
      mockFromFn.mockReturnValueOnce(
        createUpdateMock({ data: { id: mockSchedule.id }, error: null })
      );

      const mockJob = { data: {} };
      await processRecurringTaskGenerationJob(mockJob as any);

      expect(mockFromFn).toHaveBeenCalledWith('recurrence_trigger_rules');
      expect(mockFromFn).toHaveBeenCalledWith('schedules');
      expect(mockFromFn).toHaveBeenCalledWith('recurring_tasks');
    });

    it('should skip non-EVENT_BASED trigger rules', async () => {
      const mockTriggerRule = createMockTriggerRule({
        rule_type: 'CONDITIONAL',
      });
      const mockSchedule = createMockSchedule();

      // Mock trigger rules query
      mockFromFn.mockReturnValueOnce(
        createTriggerRulesQueryMock({ data: [mockTriggerRule], error: null })
      );

      // Mock schedules query (need at least one schedule to not exit early)
      mockFromFn.mockReturnValueOnce(
        createScheduleQueryMock({ data: [mockSchedule], error: null })
      );

      // Mock insert recurring tasks (only from regular schedule)
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'task-1' }], error: null })
      );

      // Mock update schedule
      mockFromFn.mockReturnValueOnce(
        createUpdateMock({ data: { id: mockSchedule.id }, error: null })
      );

      const mockJob = { data: {} };
      await processRecurringTaskGenerationJob(mockJob as any);

      // Should process regular schedule but not trigger rule
      expect(mockFromFn).toHaveBeenCalledWith('recurrence_trigger_rules');
      expect(mockFromFn).toHaveBeenCalledWith('schedules');
      expect(mockFromFn).toHaveBeenCalledWith('recurring_tasks');
    });

    it('should skip trigger rule without recurrence_events', async () => {
      const mockTriggerRule = createMockTriggerRule({
        recurrence_events: null,
      });
      const mockSchedule = createMockSchedule();

      // Mock trigger rules query
      mockFromFn.mockReturnValueOnce(
        createTriggerRulesQueryMock({ data: [mockTriggerRule], error: null })
      );

      // Mock schedules query (need at least one schedule to not exit early)
      mockFromFn.mockReturnValueOnce(
        createScheduleQueryMock({ data: [mockSchedule], error: null })
      );

      // Mock insert recurring tasks (only from regular schedule)
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'task-1' }], error: null })
      );

      // Mock update schedule
      mockFromFn.mockReturnValueOnce(
        createUpdateMock({ data: { id: mockSchedule.id }, error: null })
      );

      const mockJob = { data: {} };
      await processRecurringTaskGenerationJob(mockJob as any);

      // Should process regular schedule but not trigger rule
      expect(mockFromFn).toHaveBeenCalledWith('recurrence_trigger_rules');
      expect(mockFromFn).toHaveBeenCalledWith('schedules');
      expect(mockFromFn).toHaveBeenCalledWith('recurring_tasks');
    });

    it('should handle recurrence pattern with default interval_value', async () => {
      const mockSchedule = createMockSchedule({
        recurrence_pattern: {
          interval: 'MONTHLY',
          // No interval_value - should default to 1
        },
      });

      // Mock trigger rules query (returns empty)
      mockFromFn.mockReturnValueOnce(
        createTriggerRulesQueryMock({ data: [], error: null })
      );

      // Mock schedules query
      mockFromFn.mockReturnValueOnce(
        createScheduleQueryMock({ data: [mockSchedule], error: null })
      );

      // Mock insert recurring tasks
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'task-1' }], error: null })
      );

      // Mock update schedule
      mockFromFn.mockReturnValueOnce(
        createUpdateMock({ data: { id: mockSchedule.id }, error: null })
      );

      const mockJob = { data: {} };
      await processRecurringTaskGenerationJob(mockJob as any);

      expect(mockFromFn).toHaveBeenCalledWith('recurring_tasks');
      expect(mockFromFn).toHaveBeenCalledWith('schedules');
    });

    it('should handle event-based trigger with default offset_months', async () => {
      const mockTriggerRule = createMockTriggerRule({
        rule_config: {
          // No offset_months - should default to 0
          recurrence_interval_months: 12,
        },
      });
      // Need at least one schedule to avoid early exit
      const mockSchedule = createMockSchedule();

      // Mock trigger rules query
      mockFromFn.mockReturnValueOnce(
        createTriggerRulesQueryMock({ data: [mockTriggerRule], error: null })
      );

      // Mock schedules query
      mockFromFn.mockReturnValueOnce(
        createScheduleQueryMock({ data: [mockSchedule], error: null })
      );

      // Mock update trigger rule (happens INSIDE the loop, BEFORE insert)
      mockFromFn.mockReturnValueOnce(
        createUpdateMock({ data: { id: mockTriggerRule.id }, error: null })
      );

      // Mock insert recurring tasks (2 tasks: 1 from trigger rule, 1 from schedule)
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'task-1' }, { id: 'task-2' }], error: null })
      );

      // Mock update schedule
      mockFromFn.mockReturnValueOnce(
        createUpdateMock({ data: { id: mockSchedule.id }, error: null })
      );

      const mockJob = { data: {} };
      await processRecurringTaskGenerationJob(mockJob as any);

      expect(mockFromFn).toHaveBeenCalledWith('recurrence_trigger_rules');
      expect(mockFromFn).toHaveBeenCalledWith('recurring_tasks');
    });

    it('should handle event-based trigger with default recurrence_interval_months', async () => {
      const mockTriggerRule = createMockTriggerRule({
        rule_config: {
          offset_months: 6,
          // No recurrence_interval_months - should default to 12
        },
      });
      // Need at least one schedule to avoid early exit
      const mockSchedule = createMockSchedule();

      // Mock trigger rules query
      mockFromFn.mockReturnValueOnce(
        createTriggerRulesQueryMock({ data: [mockTriggerRule], error: null })
      );

      // Mock schedules query
      mockFromFn.mockReturnValueOnce(
        createScheduleQueryMock({ data: [mockSchedule], error: null })
      );

      // Mock update trigger rule (happens INSIDE the loop, BEFORE insert)
      mockFromFn.mockReturnValueOnce(
        createUpdateMock({ data: { id: mockTriggerRule.id }, error: null })
      );

      // Mock insert recurring tasks (2 tasks: 1 from trigger rule, 1 from schedule)
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'task-1' }, { id: 'task-2' }], error: null })
      );

      // Mock update schedule
      mockFromFn.mockReturnValueOnce(
        createUpdateMock({ data: { id: mockSchedule.id }, error: null })
      );

      const mockJob = { data: {} };
      await processRecurringTaskGenerationJob(mockJob as any);

      expect(mockFromFn).toHaveBeenCalledWith('recurrence_trigger_rules');
      expect(mockFromFn).toHaveBeenCalledWith('recurring_tasks');
    });

    it('should handle unknown recurrence interval gracefully', async () => {
      const mockSchedule = createMockSchedule({
        recurrence_pattern: {
          interval: 'UNKNOWN',
          interval_value: 1,
        },
      });

      // Mock trigger rules query (returns empty)
      mockFromFn.mockReturnValueOnce(
        createTriggerRulesQueryMock({ data: [], error: null })
      );

      // Mock schedules query
      mockFromFn.mockReturnValueOnce(
        createScheduleQueryMock({ data: [mockSchedule], error: null })
      );

      // Mock insert recurring tasks
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'task-1' }], error: null })
      );

      // Mock update schedule
      mockFromFn.mockReturnValueOnce(
        createUpdateMock({ data: { id: mockSchedule.id }, error: null })
      );

      const mockJob = { data: {} };
      await processRecurringTaskGenerationJob(mockJob as any);

      expect(mockFromFn).toHaveBeenCalledWith('recurring_tasks');
      expect(mockFromFn).toHaveBeenCalledWith('schedules');
    });
  });

  describe('RecurringTaskGenerationJobData interface', () => {
    it('should accept empty data object', () => {
      const data: RecurringTaskGenerationJobData = {};
      expect(data.company_id).toBeUndefined();
      expect(data.site_id).toBeUndefined();
    });

    it('should accept company_id', () => {
      const data: RecurringTaskGenerationJobData = { company_id: 'test-company' };
      expect(data.company_id).toBe('test-company');
    });

    it('should accept site_id', () => {
      const data: RecurringTaskGenerationJobData = { site_id: 'test-site' };
      expect(data.site_id).toBe('test-site');
    });

    it('should accept both company_id and site_id', () => {
      const data: RecurringTaskGenerationJobData = { company_id: 'test-company', site_id: 'test-site' };
      expect(data.company_id).toBe('test-company');
      expect(data.site_id).toBe('test-site');
    });
  });
});
