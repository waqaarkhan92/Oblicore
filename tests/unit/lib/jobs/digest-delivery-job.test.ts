/**
 * Digest Delivery Job Tests
 * Comprehensive tests for lib/jobs/digest-delivery-job.ts
 *
 * Tests verify the digest delivery job correctly:
 * - Fetches users with digest notifications
 * - Respects notification preferences (daily/weekly)
 * - Aggregates notifications for digest period
 * - Generates digest content
 * - Sends digest email via email service
 * - Marks notifications as included in digest
 * - Handles empty digests (no notifications)
 * - Tracks digest delivery success
 * - Handles errors gracefully
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import type { DigestDeliveryJobData } from '@/lib/jobs/digest-delivery-job';

// Mock digest notifications for tests
const createMockDigestNotification = (overrides: any = {}) => ({
  notification_id: `notif-${Math.random().toString(36).substr(2, 9)}`,
  user_id: 'user-1',
  notification_type: 'DEADLINE_WARNING_7D',
  subject: 'Test Deadline',
  body_text: 'Test deadline notification',
  priority: 'HIGH',
  created_at: new Date().toISOString(),
  ...overrides,
});

describe('digest-delivery-job', () => {
  let mockFromFn: jest.Mock;
  let mockSendEmail: jest.Mock;
  let mockGetDigestNotifications: jest.Mock;
  let mockGenerateDigestContent: jest.Mock;
  let mockMarkDigestNotificationsAsSent: jest.Mock;
  let mockBaseEmailTemplate: jest.Mock;
  let processDigestDeliveryJob: (job: any) => Promise<void>;

  // Helper to create chainable mock for user notifications query
  const createUserNotificationsQueryMock = (notifications: any[]) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockReturnValue(Promise.resolve({ data: notifications, error: null })),
            }),
          }),
        }),
      }),
    }),
  });

  // Helper to create chainable mock for user query
  const createUserQueryMock = (user: any) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockReturnValue(Promise.resolve({ data: user, error: null })),
      }),
    }),
  });

  // Helper to create chainable mock for company query
  const createCompanyQueryMock = (company: any) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockReturnValue(Promise.resolve({ data: company, error: null })),
      }),
    }),
  });

  beforeEach(async () => {
    jest.resetModules();

    // Create fresh mocks for each test
    mockFromFn = jest.fn();
    mockSendEmail = jest.fn();
    mockGetDigestNotifications = jest.fn();
    mockGenerateDigestContent = jest.fn();
    mockMarkDigestNotificationsAsSent = jest.fn();
    mockBaseEmailTemplate = jest.fn();

    // Set up module mocks
    jest.doMock('@/lib/supabase/server', () => ({
      supabaseAdmin: {
        from: mockFromFn,
      },
    }));

    jest.doMock('@/lib/services/email-service', () => ({
      sendEmail: mockSendEmail,
    }));

    jest.doMock('@/lib/services/digest-service', () => ({
      getDigestNotifications: mockGetDigestNotifications,
      generateDigestContent: mockGenerateDigestContent,
      markDigestNotificationsAsSent: mockMarkDigestNotificationsAsSent,
    }));

    jest.doMock('@/lib/templates/notification-templates', () => ({
      baseEmailTemplate: mockBaseEmailTemplate,
    }));

    // Dynamic import to get fresh module with mocks
    const module = await import('@/lib/jobs/digest-delivery-job');
    processDigestDeliveryJob = module.processDigestDeliveryJob;
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('processDigestDeliveryJob - DAILY digest', () => {
    it('should complete without errors when no digest notifications are found', async () => {
      mockFromFn.mockReturnValueOnce(createUserNotificationsQueryMock([]));

      const mockJob = { data: { digest_type: 'DAILY' as const } };
      await expect(processDigestDeliveryJob(mockJob as any)).resolves.not.toThrow();

      expect(mockFromFn).toHaveBeenCalledWith('notifications');
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it('should process daily digest for single user successfully', async () => {
      const mockUserNotifications = [{ user_id: 'user-1' }];
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        full_name: 'Test User',
        company_id: 'company-1',
      };
      const mockCompany = { name: 'Test Company' };
      const mockDigestNotifications = [createMockDigestNotification()];
      const mockDigestContent = {
        subject: 'Daily Digest - 1 notification',
        html: '<h2>Daily Digest</h2>',
        text: 'Daily Digest\n',
      };
      const mockWrappedHtml = '<html>Wrapped HTML</html>';

      // Mock notification query
      mockFromFn.mockReturnValueOnce(createUserNotificationsQueryMock(mockUserNotifications));

      // Mock user query
      mockFromFn.mockReturnValueOnce(createUserQueryMock(mockUser));

      // Mock company query
      mockFromFn.mockReturnValueOnce(createCompanyQueryMock(mockCompany));

      // Mock digest service functions
      mockGetDigestNotifications.mockResolvedValue(mockDigestNotifications);
      mockGenerateDigestContent.mockReturnValue(mockDigestContent);
      mockBaseEmailTemplate.mockReturnValue(mockWrappedHtml);
      mockSendEmail.mockResolvedValue({ success: true });
      mockMarkDigestNotificationsAsSent.mockResolvedValue(undefined);

      const mockJob = { data: { digest_type: 'DAILY' as const } };
      await processDigestDeliveryJob(mockJob as any);

      // Verify notification query
      expect(mockFromFn).toHaveBeenCalledWith('notifications');

      // Verify digest service calls
      expect(mockGetDigestNotifications).toHaveBeenCalledWith(
        'user-1',
        'DAILY',
        expect.any(Date),
        expect.any(Date)
      );
      expect(mockGenerateDigestContent).toHaveBeenCalledWith(mockDigestNotifications, 'DAILY');
      expect(mockBaseEmailTemplate).toHaveBeenCalledWith(mockDigestContent.html, 'Test Company');

      // Verify email sent
      expect(mockSendEmail).toHaveBeenCalledWith({
        to: 'user@example.com',
        subject: 'Daily Digest - 1 notification',
        html: mockWrappedHtml,
        text: mockDigestContent.text,
      });

      // Verify notifications marked as sent
      expect(mockMarkDigestNotificationsAsSent).toHaveBeenCalledWith([
        mockDigestNotifications[0].notification_id,
      ]);
    });

    it('should calculate correct date range for daily digest (24 hours)', async () => {
      const mockUserNotifications = [{ user_id: 'user-1' }];
      const mockUser = { id: 'user-1', email: 'user@example.com', full_name: 'Test User', company_id: null };
      const mockDigestNotifications = [createMockDigestNotification()];

      mockFromFn.mockReturnValueOnce(createUserNotificationsQueryMock(mockUserNotifications));
      mockFromFn.mockReturnValueOnce(createUserQueryMock(mockUser));
      mockGetDigestNotifications.mockResolvedValue(mockDigestNotifications);
      mockGenerateDigestContent.mockReturnValue({ subject: 'Test', html: 'Test', text: 'Test' });
      mockBaseEmailTemplate.mockReturnValue('<html></html>');
      mockSendEmail.mockResolvedValue({ success: true });
      mockMarkDigestNotificationsAsSent.mockResolvedValue(undefined);

      const beforeTest = new Date();
      const mockJob = { data: { digest_type: 'DAILY' as const } };
      await processDigestDeliveryJob(mockJob as any);

      // Verify getDigestNotifications was called with date range ~24 hours
      expect(mockGetDigestNotifications).toHaveBeenCalled();
      const [, , startDate, endDate] = mockGetDigestNotifications.mock.calls[0];

      const timeDiff = endDate.getTime() - startDate.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      expect(hoursDiff).toBeGreaterThanOrEqual(23.9);
      expect(hoursDiff).toBeLessThanOrEqual(24.1);
    });

    it('should filter by user_id when provided in job data', async () => {
      const mockUserNotifications = [{ user_id: 'specific-user' }];

      // The query should be called with eq for user_id
      const mockQuery = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  lte: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue(
                      Promise.resolve({ data: mockUserNotifications, error: null })
                    ),
                  }),
                }),
              }),
            }),
          }),
        }),
      };

      mockFromFn.mockReturnValueOnce(mockQuery);

      const mockJob = { data: { digest_type: 'DAILY' as const, user_id: 'specific-user' } };
      await processDigestDeliveryJob(mockJob as any);

      expect(mockFromFn).toHaveBeenCalledWith('notifications');
    });

    it('should use default company name when user has no company', async () => {
      const mockUserNotifications = [{ user_id: 'user-1' }];
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        full_name: 'Test User',
        company_id: null,
      };
      const mockDigestNotifications = [createMockDigestNotification()];

      mockFromFn.mockReturnValueOnce(createUserNotificationsQueryMock(mockUserNotifications));
      mockFromFn.mockReturnValueOnce(createUserQueryMock(mockUser));
      mockGetDigestNotifications.mockResolvedValue(mockDigestNotifications);
      mockGenerateDigestContent.mockReturnValue({ subject: 'Test', html: 'Test', text: 'Test' });
      mockBaseEmailTemplate.mockReturnValue('<html></html>');
      mockSendEmail.mockResolvedValue({ success: true });
      mockMarkDigestNotificationsAsSent.mockResolvedValue(undefined);

      const mockJob = { data: { digest_type: 'DAILY' as const } };
      await processDigestDeliveryJob(mockJob as any);

      expect(mockBaseEmailTemplate).toHaveBeenCalledWith('Test', 'EcoComply');
    });

    it('should use default company name when company query returns null', async () => {
      const mockUserNotifications = [{ user_id: 'user-1' }];
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        full_name: 'Test User',
        company_id: 'company-1',
      };
      const mockDigestNotifications = [createMockDigestNotification()];

      mockFromFn.mockReturnValueOnce(createUserNotificationsQueryMock(mockUserNotifications));
      mockFromFn.mockReturnValueOnce(createUserQueryMock(mockUser));
      mockFromFn.mockReturnValueOnce(createCompanyQueryMock(null)); // Company not found
      mockGetDigestNotifications.mockResolvedValue(mockDigestNotifications);
      mockGenerateDigestContent.mockReturnValue({ subject: 'Test', html: 'Test', text: 'Test' });
      mockBaseEmailTemplate.mockReturnValue('<html></html>');
      mockSendEmail.mockResolvedValue({ success: true });
      mockMarkDigestNotificationsAsSent.mockResolvedValue(undefined);

      const mockJob = { data: { digest_type: 'DAILY' as const } };
      await processDigestDeliveryJob(mockJob as any);

      expect(mockBaseEmailTemplate).toHaveBeenCalledWith('Test', 'EcoComply');
    });
  });

  describe('processDigestDeliveryJob - WEEKLY digest', () => {
    it('should process weekly digest successfully', async () => {
      const mockUserNotifications = [{ user_id: 'user-1' }];
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        full_name: 'Test User',
        company_id: null,
      };
      const mockDigestNotifications = [
        createMockDigestNotification(),
        createMockDigestNotification({ notification_type: 'DEADLINE_WARNING_3D' }),
      ];
      const mockDigestContent = {
        subject: 'Weekly Digest - 2 notifications',
        html: '<h2>Weekly Digest</h2>',
        text: 'Weekly Digest\n',
      };

      mockFromFn.mockReturnValueOnce(createUserNotificationsQueryMock(mockUserNotifications));
      mockFromFn.mockReturnValueOnce(createUserQueryMock(mockUser));
      mockGetDigestNotifications.mockResolvedValue(mockDigestNotifications);
      mockGenerateDigestContent.mockReturnValue(mockDigestContent);
      mockBaseEmailTemplate.mockReturnValue('<html>Wrapped</html>');
      mockSendEmail.mockResolvedValue({ success: true });
      mockMarkDigestNotificationsAsSent.mockResolvedValue(undefined);

      const mockJob = { data: { digest_type: 'WEEKLY' as const } };
      await processDigestDeliveryJob(mockJob as any);

      expect(mockGetDigestNotifications).toHaveBeenCalledWith(
        'user-1',
        'WEEKLY',
        expect.any(Date),
        expect.any(Date)
      );
      expect(mockGenerateDigestContent).toHaveBeenCalledWith(mockDigestNotifications, 'WEEKLY');
      expect(mockSendEmail).toHaveBeenCalled();
      expect(mockMarkDigestNotificationsAsSent).toHaveBeenCalledWith(
        mockDigestNotifications.map((n) => n.notification_id)
      );
    });

    it('should calculate correct date range for weekly digest (7 days)', async () => {
      const mockUserNotifications = [{ user_id: 'user-1' }];
      const mockUser = { id: 'user-1', email: 'user@example.com', full_name: 'Test User', company_id: null };
      const mockDigestNotifications = [createMockDigestNotification()];

      mockFromFn.mockReturnValueOnce(createUserNotificationsQueryMock(mockUserNotifications));
      mockFromFn.mockReturnValueOnce(createUserQueryMock(mockUser));
      mockGetDigestNotifications.mockResolvedValue(mockDigestNotifications);
      mockGenerateDigestContent.mockReturnValue({ subject: 'Test', html: 'Test', text: 'Test' });
      mockBaseEmailTemplate.mockReturnValue('<html></html>');
      mockSendEmail.mockResolvedValue({ success: true });
      mockMarkDigestNotificationsAsSent.mockResolvedValue(undefined);

      const mockJob = { data: { digest_type: 'WEEKLY' as const } };
      await processDigestDeliveryJob(mockJob as any);

      // Verify getDigestNotifications was called with date range ~7 days
      expect(mockGetDigestNotifications).toHaveBeenCalled();
      const [, , startDate, endDate] = mockGetDigestNotifications.mock.calls[0];

      const timeDiff = endDate.getTime() - startDate.getTime();
      const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

      expect(daysDiff).toBeGreaterThanOrEqual(6.9);
      expect(daysDiff).toBeLessThanOrEqual(7.1);
    });
  });

  describe('processDigestDeliveryJob - Multiple Users', () => {
    it('should process digests for multiple users', async () => {
      const mockUserNotifications = [
        { user_id: 'user-1' },
        { user_id: 'user-2' },
        { user_id: 'user-1' }, // Duplicate user
      ];
      const mockUser1 = {
        id: 'user-1',
        email: 'user1@example.com',
        full_name: 'User One',
        company_id: null,
      };
      const mockUser2 = {
        id: 'user-2',
        email: 'user2@example.com',
        full_name: 'User Two',
        company_id: null,
      };
      const mockDigestNotifications = [createMockDigestNotification()];

      mockFromFn.mockReturnValueOnce(createUserNotificationsQueryMock(mockUserNotifications));

      // First user
      mockFromFn.mockReturnValueOnce(createUserQueryMock(mockUser1));
      mockGetDigestNotifications.mockResolvedValueOnce(mockDigestNotifications);

      // Second user
      mockFromFn.mockReturnValueOnce(createUserQueryMock(mockUser2));
      mockGetDigestNotifications.mockResolvedValueOnce(mockDigestNotifications);

      mockGenerateDigestContent.mockReturnValue({ subject: 'Test', html: 'Test', text: 'Test' });
      mockBaseEmailTemplate.mockReturnValue('<html></html>');
      mockSendEmail.mockResolvedValue({ success: true });
      mockMarkDigestNotificationsAsSent.mockResolvedValue(undefined);

      const mockJob = { data: { digest_type: 'DAILY' as const } };
      await processDigestDeliveryJob(mockJob as any);

      // Should only process unique users (user-1 and user-2)
      expect(mockSendEmail).toHaveBeenCalledTimes(2);
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'user1@example.com' })
      );
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'user2@example.com' })
      );
    });

    it('should track sent and failed counts correctly', async () => {
      const mockUserNotifications = [
        { user_id: 'user-1' },
        { user_id: 'user-2' },
      ];
      const mockUser1 = { id: 'user-1', email: 'user1@example.com', full_name: 'User One', company_id: null };
      const mockUser2 = { id: 'user-2', email: 'user2@example.com', full_name: 'User Two', company_id: null };
      const mockDigestNotifications = [createMockDigestNotification()];

      mockFromFn.mockReturnValueOnce(createUserNotificationsQueryMock(mockUserNotifications));

      // First user - success
      mockFromFn.mockReturnValueOnce(createUserQueryMock(mockUser1));
      mockGetDigestNotifications.mockResolvedValueOnce(mockDigestNotifications);

      // Second user - success
      mockFromFn.mockReturnValueOnce(createUserQueryMock(mockUser2));
      mockGetDigestNotifications.mockResolvedValueOnce(mockDigestNotifications);

      mockGenerateDigestContent.mockReturnValue({ subject: 'Test', html: 'Test', text: 'Test' });
      mockBaseEmailTemplate.mockReturnValue('<html></html>');

      // First succeeds, second fails
      mockSendEmail
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, error: 'Email send failed' });

      mockMarkDigestNotificationsAsSent.mockResolvedValue(undefined);

      const mockJob = { data: { digest_type: 'DAILY' as const } };
      await processDigestDeliveryJob(mockJob as any);

      // Only successful email should mark notifications as sent
      expect(mockMarkDigestNotificationsAsSent).toHaveBeenCalledTimes(1);
    });
  });

  describe('processDigestDeliveryJob - Error Handling', () => {
    it('should skip user if user query returns null', async () => {
      const mockUserNotifications = [{ user_id: 'user-1' }];

      mockFromFn.mockReturnValueOnce(createUserNotificationsQueryMock(mockUserNotifications));
      mockFromFn.mockReturnValueOnce(createUserQueryMock(null)); // User not found

      const mockJob = { data: { digest_type: 'DAILY' as const } };
      await processDigestDeliveryJob(mockJob as any);

      // Should not attempt to send email
      expect(mockSendEmail).not.toHaveBeenCalled();
      expect(mockGetDigestNotifications).not.toHaveBeenCalled();
    });

    it('should skip user if no digest notifications found', async () => {
      const mockUserNotifications = [{ user_id: 'user-1' }];
      const mockUser = { id: 'user-1', email: 'user@example.com', full_name: 'Test User', company_id: null };

      mockFromFn.mockReturnValueOnce(createUserNotificationsQueryMock(mockUserNotifications));
      mockFromFn.mockReturnValueOnce(createUserQueryMock(mockUser));
      mockGetDigestNotifications.mockResolvedValue([]); // No notifications

      const mockJob = { data: { digest_type: 'DAILY' as const } };
      await processDigestDeliveryJob(mockJob as any);

      // Should not attempt to send email
      expect(mockSendEmail).not.toHaveBeenCalled();
      expect(mockGenerateDigestContent).not.toHaveBeenCalled();
    });

    it('should not mark notifications as sent when email fails', async () => {
      const mockUserNotifications = [{ user_id: 'user-1' }];
      const mockUser = { id: 'user-1', email: 'user@example.com', full_name: 'Test User', company_id: null };
      const mockDigestNotifications = [createMockDigestNotification()];

      mockFromFn.mockReturnValueOnce(createUserNotificationsQueryMock(mockUserNotifications));
      mockFromFn.mockReturnValueOnce(createUserQueryMock(mockUser));
      mockGetDigestNotifications.mockResolvedValue(mockDigestNotifications);
      mockGenerateDigestContent.mockReturnValue({ subject: 'Test', html: 'Test', text: 'Test' });
      mockBaseEmailTemplate.mockReturnValue('<html></html>');
      mockSendEmail.mockResolvedValue({ success: false, error: 'Email send failed' });

      const mockJob = { data: { digest_type: 'DAILY' as const } };
      await processDigestDeliveryJob(mockJob as any);

      // Should not mark as sent
      expect(mockMarkDigestNotificationsAsSent).not.toHaveBeenCalled();
    });

    it('should continue processing other users if one fails', async () => {
      const mockUserNotifications = [
        { user_id: 'user-1' },
        { user_id: 'user-2' },
      ];
      const mockUser1 = { id: 'user-1', email: 'user1@example.com', full_name: 'User One', company_id: null };
      const mockUser2 = { id: 'user-2', email: 'user2@example.com', full_name: 'User Two', company_id: null };
      const mockDigestNotifications = [createMockDigestNotification()];

      mockFromFn.mockReturnValueOnce(createUserNotificationsQueryMock(mockUserNotifications));

      // First user - will throw error
      mockFromFn.mockReturnValueOnce(createUserQueryMock(mockUser1));
      mockGetDigestNotifications.mockRejectedValueOnce(new Error('Database error'));

      // Second user - should succeed
      mockFromFn.mockReturnValueOnce(createUserQueryMock(mockUser2));
      mockGetDigestNotifications.mockResolvedValueOnce(mockDigestNotifications);

      mockGenerateDigestContent.mockReturnValue({ subject: 'Test', html: 'Test', text: 'Test' });
      mockBaseEmailTemplate.mockReturnValue('<html></html>');
      mockSendEmail.mockResolvedValue({ success: true });
      mockMarkDigestNotificationsAsSent.mockResolvedValue(undefined);

      const mockJob = { data: { digest_type: 'DAILY' as const } };
      await processDigestDeliveryJob(mockJob as any);

      // Should have sent email for user-2
      expect(mockSendEmail).toHaveBeenCalledTimes(1);
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'user2@example.com' })
      );
    });

    it('should throw error when database query fails completely', async () => {
      mockFromFn.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  lte: jest.fn().mockImplementation(() => {
                    throw new Error('Database connection failed');
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const mockJob = { data: { digest_type: 'DAILY' as const } };
      await expect(processDigestDeliveryJob(mockJob as any)).rejects.toThrow();
    });
  });

  describe('DigestDeliveryJobData interface', () => {
    it('should accept DAILY digest_type', () => {
      const data: DigestDeliveryJobData = { digest_type: 'DAILY' };
      expect(data.digest_type).toBe('DAILY');
      expect(data.user_id).toBeUndefined();
    });

    it('should accept WEEKLY digest_type', () => {
      const data: DigestDeliveryJobData = { digest_type: 'WEEKLY' };
      expect(data.digest_type).toBe('WEEKLY');
      expect(data.user_id).toBeUndefined();
    });

    it('should accept optional user_id', () => {
      const data: DigestDeliveryJobData = { digest_type: 'DAILY', user_id: 'user-123' };
      expect(data.digest_type).toBe('DAILY');
      expect(data.user_id).toBe('user-123');
    });

    it('should accept WEEKLY digest_type with user_id', () => {
      const data: DigestDeliveryJobData = { digest_type: 'WEEKLY', user_id: 'user-456' };
      expect(data.digest_type).toBe('WEEKLY');
      expect(data.user_id).toBe('user-456');
    });
  });
});
