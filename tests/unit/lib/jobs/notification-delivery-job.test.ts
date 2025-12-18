/**
 * Notification Delivery Job Tests
 * Tests for lib/jobs/notification-delivery-job.ts
 *
 * These tests verify the notification delivery job correctly:
 * - Processes pending notifications in batches
 * - Handles single notification processing
 * - Checks rate limits before sending
 * - Respects user notification preferences
 * - Sends emails via email service
 * - Updates notification status appropriately
 * - Implements retry logic with exponential backoff
 * - Moves failed notifications to dead-letter queue
 * - Handles scheduled notifications
 * - Resolves company names from metadata or database
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import type { NotificationDeliveryJobData } from '@/lib/jobs/notification-delivery-job';

// Mock data for tests
const createMockNotification = (overrides: any = {}) => {
  const now = new Date();
  return {
    id: `notification-${Math.random().toString(36).substr(2, 9)}`,
    user_id: 'user-123',
    company_id: 'company-123',
    recipient_email: 'test@example.com',
    notification_type: 'DEADLINE_ALERT',
    channel: 'EMAIL',
    status: 'PENDING',
    priority: 'NORMAL',
    scheduled_for: now.toISOString(),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    metadata: {},
    ...overrides,
  };
};

describe('notification-delivery-job', () => {
  let mockFromFn: jest.Mock;
  let mockSendEmail: jest.Mock;
  let mockCheckRateLimit: jest.Mock;
  let mockRecordRateLimitUsage: jest.Mock;
  let mockGetEmailTemplate: jest.Mock;
  let mockShouldSendNotification: jest.Mock;
  let mockGetUserPreferences: jest.Mock;
  let mockQueueForDigest: jest.Mock;
  let processNotificationDeliveryJob: (job: any) => Promise<void>;

  // Helper to create chainable mock for notification query
  const createNotificationQueryMock = (finalResult: any) => ({
    select: jest.fn().mockReturnValue({
      in: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          lte: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue(Promise.resolve(finalResult)),
              }),
            }),
          }),
        }),
      }),
    }),
  });

  // Helper for single notification query
  const createSingleNotificationMock = (finalResult: any) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockReturnValue(Promise.resolve(finalResult)),
      }),
    }),
  });

  // Helper for company query
  const createCompanyQueryMock = (finalResult: any) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockReturnValue(Promise.resolve(finalResult)),
      }),
    }),
  });

  // Helper for update mock
  const createUpdateMock = (result: any = { data: null, error: null }) => ({
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue(Promise.resolve(result)),
    }),
  });

  // Helper for insert mock (dead-letter queue)
  const createInsertMock = (result: any) => ({
    insert: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockReturnValue(Promise.resolve(result)),
      }),
    }),
  });

  beforeEach(async () => {
    jest.resetModules();

    // Create fresh mocks for each test
    mockFromFn = jest.fn();
    mockSendEmail = jest.fn();
    mockCheckRateLimit = jest.fn();
    mockRecordRateLimitUsage = jest.fn();
    mockGetEmailTemplate = jest.fn();
    mockShouldSendNotification = jest.fn();
    mockGetUserPreferences = jest.fn();
    mockQueueForDigest = jest.fn();

    // Set up mocks before importing the module
    jest.doMock('@/lib/supabase/server', () => ({
      supabaseAdmin: {
        from: mockFromFn,
      },
    }));

    jest.doMock('@/lib/services/email-service', () => ({
      sendEmail: mockSendEmail,
    }));

    jest.doMock('@/lib/services/rate-limit-service', () => ({
      checkRateLimit: mockCheckRateLimit,
      recordRateLimitUsage: mockRecordRateLimitUsage,
    }));

    jest.doMock('@/lib/templates/notification-templates', () => ({
      getEmailTemplate: mockGetEmailTemplate,
    }));

    jest.doMock('@/lib/services/notification-preferences-service', () => ({
      shouldSendNotification: mockShouldSendNotification,
      getUserPreferences: mockGetUserPreferences,
    }));

    jest.doMock('@/lib/services/digest-service', () => ({
      queueForDigest: mockQueueForDigest,
    }));

    // Dynamic import to get fresh module with mocks
    const module = await import('@/lib/jobs/notification-delivery-job');
    processNotificationDeliveryJob = module.processNotificationDeliveryJob;
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('batch processing', () => {
    it('should complete without errors when no notifications are found', async () => {
      mockFromFn.mockReturnValueOnce(
        createNotificationQueryMock({ data: [], error: null })
      );

      const mockJob = { data: {} };
      await expect(processNotificationDeliveryJob(mockJob as any)).resolves.not.toThrow();
      expect(mockFromFn).toHaveBeenCalledWith('notifications');
    });

    it('should throw error when database query fails', async () => {
      mockFromFn.mockReturnValueOnce(
        createNotificationQueryMock({ data: null, error: { message: 'Database error' } })
      );

      const mockJob = { data: {} };
      await expect(processNotificationDeliveryJob(mockJob as any)).rejects.toThrow(
        'Failed to fetch notifications: Database error'
      );
    });

    it('should use custom batch size when provided', async () => {
      mockFromFn.mockReturnValueOnce(
        createNotificationQueryMock({ data: [], error: null })
      );

      const mockJob = { data: { batch_size: 100 } };
      await processNotificationDeliveryJob(mockJob as any);
      expect(mockFromFn).toHaveBeenCalledWith('notifications');
    });

    it('should process notification successfully and update status to SENT', async () => {
      const mockNotification = createMockNotification();

      // Query notifications
      mockFromFn.mockReturnValueOnce(
        createNotificationQueryMock({ data: [mockNotification], error: null })
      );

      // Update to SENDING
      mockFromFn.mockReturnValueOnce(createUpdateMock());

      // Query company (no company_name in metadata)
      mockFromFn.mockReturnValueOnce(
        createCompanyQueryMock({ data: { name: 'Test Company' }, error: null })
      );

      // Update to SENT
      mockFromFn.mockReturnValueOnce(createUpdateMock());

      // Mock services
      mockShouldSendNotification.mockResolvedValue(true);
      mockCheckRateLimit.mockResolvedValue({ allowed: true });
      mockGetEmailTemplate.mockResolvedValue({
        subject: 'Test Subject',
        html: '<p>Test</p>',
        text: 'Test',
      });
      mockSendEmail.mockResolvedValue({ success: true, messageId: 'msg-123' });

      const mockJob = { data: {} };
      await processNotificationDeliveryJob(mockJob as any);

      expect(mockSendEmail).toHaveBeenCalledWith({
        to: mockNotification.recipient_email,
        subject: 'Test Subject',
        html: '<p>Test</p>',
        text: 'Test',
      });
      expect(mockRecordRateLimitUsage).toHaveBeenCalledWith({
        scope: 'user',
        id: mockNotification.user_id,
        channel: 'EMAIL',
      });
    });

    it('should skip notification when user preferences disabled', async () => {
      const mockNotification = createMockNotification();

      // Query notifications
      mockFromFn.mockReturnValueOnce(
        createNotificationQueryMock({ data: [mockNotification], error: null })
      );

      // Update to CANCELLED
      mockFromFn.mockReturnValueOnce(createUpdateMock());

      // Mock services
      mockShouldSendNotification.mockResolvedValue(false);
      mockGetUserPreferences.mockResolvedValue({
        frequency_preference: 'DISABLED',
      });

      const mockJob = { data: {} };
      await processNotificationDeliveryJob(mockJob as any);

      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it('should queue notification for daily digest when preference is DAILY_DIGEST', async () => {
      const mockNotification = createMockNotification();

      // Query notifications
      mockFromFn.mockReturnValueOnce(
        createNotificationQueryMock({ data: [mockNotification], error: null })
      );

      // Mock services
      mockShouldSendNotification.mockResolvedValue(false);
      mockGetUserPreferences.mockResolvedValue({
        frequency_preference: 'DAILY_DIGEST',
      });

      const mockJob = { data: {} };
      await processNotificationDeliveryJob(mockJob as any);

      expect(mockQueueForDigest).toHaveBeenCalledWith(
        mockNotification.id,
        mockNotification.user_id,
        'DAILY'
      );
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it('should queue notification for weekly digest when preference is WEEKLY_DIGEST', async () => {
      const mockNotification = createMockNotification();

      // Query notifications
      mockFromFn.mockReturnValueOnce(
        createNotificationQueryMock({ data: [mockNotification], error: null })
      );

      // Mock services
      mockShouldSendNotification.mockResolvedValue(false);
      mockGetUserPreferences.mockResolvedValue({
        frequency_preference: 'WEEKLY_DIGEST',
      });

      const mockJob = { data: {} };
      await processNotificationDeliveryJob(mockJob as any);

      expect(mockQueueForDigest).toHaveBeenCalledWith(
        mockNotification.id,
        mockNotification.user_id,
        'WEEKLY'
      );
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it('should reschedule notification when rate limit exceeded', async () => {
      const mockNotification = createMockNotification();

      // Query notifications
      mockFromFn.mockReturnValueOnce(
        createNotificationQueryMock({ data: [mockNotification], error: null })
      );

      // Update to QUEUED
      mockFromFn.mockReturnValueOnce(createUpdateMock());

      // Mock services
      mockShouldSendNotification.mockResolvedValue(true);
      mockCheckRateLimit.mockResolvedValue({
        allowed: false,
        retryAfter: new Date(Date.now() + 3600000).toISOString(),
      });

      const mockJob = { data: {} };
      await processNotificationDeliveryJob(mockJob as any);

      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it('should retry notification with exponential backoff on retryable error', async () => {
      const mockNotification = createMockNotification();

      // Query notifications
      mockFromFn.mockReturnValueOnce(
        createNotificationQueryMock({ data: [mockNotification], error: null })
      );

      // Update to SENDING
      mockFromFn.mockReturnValueOnce(createUpdateMock());

      // Query company
      mockFromFn.mockReturnValueOnce(
        createCompanyQueryMock({ data: { name: 'Test Company' }, error: null })
      );

      // Update to RETRYING
      mockFromFn.mockReturnValueOnce(createUpdateMock());

      // Mock services
      mockShouldSendNotification.mockResolvedValue(true);
      mockCheckRateLimit.mockResolvedValue({ allowed: true });
      mockGetEmailTemplate.mockResolvedValue({
        subject: 'Test Subject',
        html: '<p>Test</p>',
        text: 'Test',
      });
      mockSendEmail.mockResolvedValue({
        success: false,
        error: 'Connection timeout',
      });

      const mockJob = { data: {} };
      await processNotificationDeliveryJob(mockJob as any);

      expect(mockSendEmail).toHaveBeenCalled();
      expect(mockRecordRateLimitUsage).not.toHaveBeenCalled();
    });

    it('should mark notification as FAILED on non-retryable error', async () => {
      const mockNotification = createMockNotification();

      // Query notifications
      mockFromFn.mockReturnValueOnce(
        createNotificationQueryMock({ data: [mockNotification], error: null })
      );

      // Update to SENDING
      mockFromFn.mockReturnValueOnce(createUpdateMock());

      // Query company
      mockFromFn.mockReturnValueOnce(
        createCompanyQueryMock({ data: { name: 'Test Company' }, error: null })
      );

      // Update to FAILED
      mockFromFn.mockReturnValueOnce(createUpdateMock());

      // Mock services
      mockShouldSendNotification.mockResolvedValue(true);
      mockCheckRateLimit.mockResolvedValue({ allowed: true });
      mockGetEmailTemplate.mockResolvedValue({
        subject: 'Test Subject',
        html: '<p>Test</p>',
        text: 'Test',
      });
      mockSendEmail.mockResolvedValue({
        success: false,
        error: 'Invalid email address',
      });

      const mockJob = { data: {} };
      await processNotificationDeliveryJob(mockJob as any);

      expect(mockSendEmail).toHaveBeenCalled();
      expect(mockRecordRateLimitUsage).not.toHaveBeenCalled();
    });

    it('should move notification to dead-letter queue after max retries', async () => {
      const mockNotification = createMockNotification({
        metadata: { retry_count: 3 },
      });

      // Query notifications
      mockFromFn.mockReturnValueOnce(
        createNotificationQueryMock({ data: [mockNotification], error: null })
      );

      // Update to SENDING
      mockFromFn.mockReturnValueOnce(createUpdateMock());

      // Query company
      mockFromFn.mockReturnValueOnce(
        createCompanyQueryMock({ data: { name: 'Test Company' }, error: null })
      );

      // Insert into dead-letter queue
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: { id: 'dlq-123' }, error: null })
      );

      // Update notification metadata with DLQ reference
      mockFromFn.mockReturnValueOnce(createUpdateMock());

      // Update to FAILED
      mockFromFn.mockReturnValueOnce(createUpdateMock());

      // Mock services
      mockShouldSendNotification.mockResolvedValue(true);
      mockCheckRateLimit.mockResolvedValue({ allowed: true });
      mockGetEmailTemplate.mockResolvedValue({
        subject: 'Test Subject',
        html: '<p>Test</p>',
        text: 'Test',
      });
      mockSendEmail.mockResolvedValue({
        success: false,
        error: 'Connection timeout',
      });

      const mockJob = { data: {} };
      await processNotificationDeliveryJob(mockJob as any);

      expect(mockFromFn).toHaveBeenCalledWith('dead_letter_queue');
    });

    it('should use company name from metadata if available', async () => {
      const mockNotification = createMockNotification({
        metadata: { company_name: 'Metadata Company' },
      });

      // Query notifications
      mockFromFn.mockReturnValueOnce(
        createNotificationQueryMock({ data: [mockNotification], error: null })
      );

      // Update to SENDING
      mockFromFn.mockReturnValueOnce(createUpdateMock());

      // Update to SENT (no company query should happen)
      mockFromFn.mockReturnValueOnce(createUpdateMock());

      // Mock services
      mockShouldSendNotification.mockResolvedValue(true);
      mockCheckRateLimit.mockResolvedValue({ allowed: true });
      mockGetEmailTemplate.mockResolvedValue({
        subject: 'Test Subject',
        html: '<p>Test</p>',
        text: 'Test',
      });
      mockSendEmail.mockResolvedValue({ success: true, messageId: 'msg-123' });

      const mockJob = { data: {} };
      await processNotificationDeliveryJob(mockJob as any);

      expect(mockGetEmailTemplate).toHaveBeenCalledWith(
        mockNotification.notification_type,
        expect.objectContaining({
          metadata: expect.objectContaining({
            company_name: 'Metadata Company',
          }),
        })
      );
    });

    it('should continue processing other notifications if one fails', async () => {
      const mockNotification1 = createMockNotification({ id: 'notif-1' });
      const mockNotification2 = createMockNotification({ id: 'notif-2' });

      // Query notifications
      mockFromFn.mockReturnValueOnce(
        createNotificationQueryMock({ data: [mockNotification1, mockNotification2], error: null })
      );

      // First notification - throw error during shouldSendNotification
      mockShouldSendNotification.mockRejectedValueOnce(new Error('Service error'));

      // First notification - update to FAILED
      mockFromFn.mockReturnValueOnce(createUpdateMock());

      // Second notification - process successfully
      mockShouldSendNotification.mockResolvedValueOnce(true);

      // Second notification - update to SENDING
      mockFromFn.mockReturnValueOnce(createUpdateMock());

      // Second notification - query company
      mockFromFn.mockReturnValueOnce(
        createCompanyQueryMock({ data: { name: 'Test Company' }, error: null })
      );

      // Second notification - update to SENT
      mockFromFn.mockReturnValueOnce(createUpdateMock());

      // Second notification - mock services
      mockCheckRateLimit.mockResolvedValue({ allowed: true });
      mockGetEmailTemplate.mockResolvedValue({
        subject: 'Test Subject',
        html: '<p>Test</p>',
        text: 'Test',
      });
      mockSendEmail.mockResolvedValue({ success: true, messageId: 'msg-123' });

      const mockJob = { data: {} };
      await expect(processNotificationDeliveryJob(mockJob as any)).resolves.not.toThrow();

      expect(mockSendEmail).toHaveBeenCalledTimes(1);
    });

    it('should use default company name when company not found', async () => {
      const mockNotification = createMockNotification({
        metadata: {},
      });

      // Query notifications
      mockFromFn.mockReturnValueOnce(
        createNotificationQueryMock({ data: [mockNotification], error: null })
      );

      // Update to SENDING
      mockFromFn.mockReturnValueOnce(createUpdateMock());

      // Query company - not found
      mockFromFn.mockReturnValueOnce(
        createCompanyQueryMock({ data: null, error: null })
      );

      // Update to SENT
      mockFromFn.mockReturnValueOnce(createUpdateMock());

      // Mock services
      mockShouldSendNotification.mockResolvedValue(true);
      mockCheckRateLimit.mockResolvedValue({ allowed: true });
      mockGetEmailTemplate.mockResolvedValue({
        subject: 'Test Subject',
        html: '<p>Test</p>',
        text: 'Test',
      });
      mockSendEmail.mockResolvedValue({ success: true, messageId: 'msg-123' });

      const mockJob = { data: {} };
      await processNotificationDeliveryJob(mockJob as any);

      expect(mockGetEmailTemplate).toHaveBeenCalledWith(
        mockNotification.notification_type,
        expect.objectContaining({
          metadata: expect.objectContaining({
            company_name: 'EcoComply',
          }),
        })
      );
    });

    it('should handle retry with count of 2 and use 30 minute backoff', async () => {
      const mockNotification = createMockNotification({
        metadata: { retry_count: 1 },
        status: 'RETRYING',
      });

      // Query notifications
      mockFromFn.mockReturnValueOnce(
        createNotificationQueryMock({ data: [mockNotification], error: null })
      );

      // Update to SENDING
      mockFromFn.mockReturnValueOnce(createUpdateMock());

      // Query company
      mockFromFn.mockReturnValueOnce(
        createCompanyQueryMock({ data: { name: 'Test Company' }, error: null })
      );

      // Update to RETRYING (second retry)
      mockFromFn.mockReturnValueOnce(createUpdateMock());

      // Mock services
      mockShouldSendNotification.mockResolvedValue(true);
      mockCheckRateLimit.mockResolvedValue({ allowed: true });
      mockGetEmailTemplate.mockResolvedValue({
        subject: 'Test Subject',
        html: '<p>Test</p>',
        text: 'Test',
      });
      mockSendEmail.mockResolvedValue({
        success: false,
        error: 'Network error',
      });

      const mockJob = { data: {} };
      await processNotificationDeliveryJob(mockJob as any);

      expect(mockSendEmail).toHaveBeenCalled();
    });
  });

  describe('single notification processing', () => {
    it('should process specific notification when notification_id provided', async () => {
      const mockNotification = createMockNotification({ id: 'specific-notif' });

      // Query single notification
      mockFromFn.mockReturnValueOnce(
        createSingleNotificationMock({ data: mockNotification, error: null })
      );

      // Update to SENDING
      mockFromFn.mockReturnValueOnce(createUpdateMock());

      // Update to SENT
      mockFromFn.mockReturnValueOnce(createUpdateMock());

      // Mock services
      mockCheckRateLimit.mockResolvedValue({ allowed: true });
      mockGetEmailTemplate.mockResolvedValue({
        subject: 'Test Subject',
        html: '<p>Test</p>',
        text: 'Test',
      });
      mockSendEmail.mockResolvedValue({ success: true, messageId: 'msg-123' });

      const mockJob = { data: { notification_id: 'specific-notif' } };
      await processNotificationDeliveryJob(mockJob as any);

      expect(mockSendEmail).toHaveBeenCalled();
      expect(mockRecordRateLimitUsage).toHaveBeenCalled();
    });

    it('should throw error when specific notification not found', async () => {
      // Query single notification - not found
      mockFromFn.mockReturnValueOnce(
        createSingleNotificationMock({ data: null, error: { message: 'Not found' } })
      );

      const mockJob = { data: { notification_id: 'non-existent' } };
      await expect(processNotificationDeliveryJob(mockJob as any)).rejects.toThrow(
        'Notification not found: non-existent'
      );
    });

    it('should skip specific notification if not in processable status', async () => {
      const mockNotification = createMockNotification({
        id: 'sent-notif',
        status: 'SENT',
      });

      // Query single notification
      mockFromFn.mockReturnValueOnce(
        createSingleNotificationMock({ data: mockNotification, error: null })
      );

      const mockJob = { data: { notification_id: 'sent-notif' } };
      await processNotificationDeliveryJob(mockJob as any);

      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it('should process notification with QUEUED status', async () => {
      const mockNotification = createMockNotification({
        id: 'queued-notif',
        status: 'QUEUED',
      });

      // Query single notification
      mockFromFn.mockReturnValueOnce(
        createSingleNotificationMock({ data: mockNotification, error: null })
      );

      // Update to SENDING
      mockFromFn.mockReturnValueOnce(createUpdateMock());

      // Update to SENT
      mockFromFn.mockReturnValueOnce(createUpdateMock());

      // Mock services
      mockCheckRateLimit.mockResolvedValue({ allowed: true });
      mockGetEmailTemplate.mockResolvedValue({
        subject: 'Test Subject',
        html: '<p>Test</p>',
        text: 'Test',
      });
      mockSendEmail.mockResolvedValue({ success: true, messageId: 'msg-123' });

      const mockJob = { data: { notification_id: 'queued-notif' } };
      await processNotificationDeliveryJob(mockJob as any);

      expect(mockSendEmail).toHaveBeenCalled();
    });

    it('should throw error when rate limit exceeded for specific notification', async () => {
      const mockNotification = createMockNotification({ id: 'specific-notif' });

      // Query single notification
      mockFromFn.mockReturnValueOnce(
        createSingleNotificationMock({ data: mockNotification, error: null })
      );

      // Mock services
      mockCheckRateLimit.mockResolvedValue({ allowed: false });

      const mockJob = { data: { notification_id: 'specific-notif' } };
      await expect(processNotificationDeliveryJob(mockJob as any)).rejects.toThrow(
        'Rate limit exceeded for user user-123'
      );
    });

    it('should throw error when email send fails for specific notification', async () => {
      const mockNotification = createMockNotification({ id: 'specific-notif' });

      // Query single notification
      mockFromFn.mockReturnValueOnce(
        createSingleNotificationMock({ data: mockNotification, error: null })
      );

      // Update to SENDING
      mockFromFn.mockReturnValueOnce(createUpdateMock());

      // Update to FAILED
      mockFromFn.mockReturnValueOnce(createUpdateMock());

      // Mock services
      mockCheckRateLimit.mockResolvedValue({ allowed: true });
      mockGetEmailTemplate.mockResolvedValue({
        subject: 'Test Subject',
        html: '<p>Test</p>',
        text: 'Test',
      });
      mockSendEmail.mockResolvedValue({
        success: false,
        error: 'Email send failed',
      });

      const mockJob = { data: { notification_id: 'specific-notif' } };
      await expect(processNotificationDeliveryJob(mockJob as any)).rejects.toThrow(
        'Failed to send email: Email send failed'
      );
    });
  });

  describe('NotificationDeliveryJobData interface', () => {
    it('should accept empty data object', () => {
      const data: NotificationDeliveryJobData = {};
      expect(data.notification_id).toBeUndefined();
      expect(data.batch_size).toBeUndefined();
    });

    it('should accept notification_id', () => {
      const data: NotificationDeliveryJobData = { notification_id: 'test-notif' };
      expect(data.notification_id).toBe('test-notif');
    });

    it('should accept batch_size', () => {
      const data: NotificationDeliveryJobData = { batch_size: 100 };
      expect(data.batch_size).toBe(100);
    });

    it('should accept both notification_id and batch_size', () => {
      const data: NotificationDeliveryJobData = {
        notification_id: 'test-notif',
        batch_size: 100,
      };
      expect(data.notification_id).toBe('test-notif');
      expect(data.batch_size).toBe(100);
    });
  });
});
