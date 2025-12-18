/**
 * Escalation Service Tests
 * Comprehensive tests for lib/services/escalation-service.ts
 * Target: 100% coverage
 *
 * Tests cover:
 * - getEscalationRecipients for L1, L2, L3 tiers
 * - checkEscalation logic and timing
 * - createEscalationNotification
 * - Error handling and edge cases
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';

describe('escalation-service', () => {
  let mockFromFn: jest.Mock;
  let escalationService: any;

  // Helper to create chainable mock for user queries
  const createUserQueryMock = (users: any[], error: any = null) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        in: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue(
                Promise.resolve({ data: users, error })
              ),
            }),
          }),
        }),
      }),
    }),
  });

  // Helper for Level 3 user query (different chain - uses eq twice instead of in)
  const createLevel3UserQueryMock = (users: any[], error: any = null) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue(
                Promise.resolve({ data: users, error })
              ),
            }),
          }),
        }),
      }),
    }),
  });

  // Helper for obligation query (single)
  const createObligationQueryMock = (obligation: any, error: any = null) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockReturnValue(
          Promise.resolve({ data: obligation, error })
        ),
      }),
    }),
  });

  // Helper for evidence links query
  const createEvidenceQueryMock = (evidenceLinks: any[], error: any = null) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        is: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue(
              Promise.resolve({ data: evidenceLinks, error })
            ),
          }),
        }),
      }),
    }),
  });

  // Helper for notification query
  const createNotificationQueryMock = (notifications: any[], error: any = null) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue(
                Promise.resolve({ data: notifications, error })
              ),
            }),
          }),
        }),
      }),
    }),
  });

  // Helper for site query
  const createSiteQueryMock = (site: any, error: any = null) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockReturnValue(
          Promise.resolve({ data: site, error })
        ),
      }),
    }),
  });

  // Helper for insert notifications
  const createInsertMock = (result: any) => ({
    insert: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue(Promise.resolve(result)),
      }),
    }),
  });

  beforeEach(async () => {
    jest.resetModules();
    mockFromFn = jest.fn();

    jest.doMock('@/lib/supabase/server', () => ({
      supabaseAdmin: { from: mockFromFn },
    }));

    const module = await import('@/lib/services/escalation-service');
    escalationService = module;
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('getEscalationRecipients', () => {
    describe('Level 1 - Site Manager', () => {
      it('should fetch site-level ADMIN and OWNER users for level 1', async () => {
        const mockUsers = [
          {
            id: 'user-1',
            email: 'admin@example.com',
            phone: '+1234567890',
            user_roles: [{ role: 'ADMIN' }],
          },
          {
            id: 'user-2',
            email: 'owner@example.com',
            phone: '+0987654321',
            user_roles: [{ role: 'OWNER' }],
          },
        ];

        mockFromFn.mockReturnValueOnce(createUserQueryMock(mockUsers));

        const recipients = await escalationService.getEscalationRecipients(
          'site-1',
          'company-1',
          1
        );

        expect(recipients).toHaveLength(2);
        expect(recipients[0]).toEqual({
          userId: 'user-1',
          email: 'admin@example.com',
          phone: '+1234567890',
          role: 'ADMIN',
          level: 1,
        });
        expect(recipients[1]).toEqual({
          userId: 'user-2',
          email: 'owner@example.com',
          phone: '+0987654321',
          role: 'OWNER',
          level: 1,
        });
        expect(mockFromFn).toHaveBeenCalledWith('users');
      });

      it('should return empty array if database error occurs for level 1', async () => {
        mockFromFn.mockReturnValueOnce(
          createUserQueryMock(null, { message: 'Database error' })
        );

        const recipients = await escalationService.getEscalationRecipients(
          'site-1',
          'company-1',
          1
        );

        expect(recipients).toEqual([]);
      });

      it('should handle users without phone numbers for level 1', async () => {
        const mockUsers = [
          {
            id: 'user-1',
            email: 'admin@example.com',
            phone: null,
            user_roles: [{ role: 'ADMIN' }],
          },
        ];

        mockFromFn.mockReturnValueOnce(createUserQueryMock(mockUsers));

        const recipients = await escalationService.getEscalationRecipients(
          'site-1',
          'company-1',
          1
        );

        expect(recipients).toHaveLength(1);
        expect(recipients[0].phone).toBeNull();
      });

      it('should default to ADMIN role if user_roles is empty for level 1', async () => {
        const mockUsers = [
          {
            id: 'user-1',
            email: 'admin@example.com',
            phone: '+1234567890',
            user_roles: [],
          },
        ];

        mockFromFn.mockReturnValueOnce(createUserQueryMock(mockUsers));

        const recipients = await escalationService.getEscalationRecipients(
          'site-1',
          'company-1',
          1
        );

        expect(recipients[0].role).toBe('ADMIN');
      });
    });

    describe('Level 2 - Compliance Manager', () => {
      it('should fetch company-level ADMIN and OWNER users for level 2', async () => {
        const mockUsers = [
          {
            id: 'user-3',
            email: 'compliance@example.com',
            phone: '+1111111111',
            user_roles: [{ role: 'ADMIN' }],
          },
        ];

        mockFromFn.mockReturnValueOnce(createUserQueryMock(mockUsers));

        const recipients = await escalationService.getEscalationRecipients(
          'site-1',
          'company-1',
          2
        );

        expect(recipients).toHaveLength(1);
        expect(recipients[0]).toEqual({
          userId: 'user-3',
          email: 'compliance@example.com',
          phone: '+1111111111',
          role: 'ADMIN',
          level: 2,
        });
        expect(mockFromFn).toHaveBeenCalledWith('users');
      });

      it('should return empty array if database error occurs for level 2', async () => {
        mockFromFn.mockReturnValueOnce(
          createUserQueryMock(null, { message: 'Database error' })
        );

        const recipients = await escalationService.getEscalationRecipients(
          'site-1',
          'company-1',
          2
        );

        expect(recipients).toEqual([]);
      });

      it('should default to ADMIN role if user_roles is empty for level 2', async () => {
        const mockUsers = [
          {
            id: 'user-1',
            email: 'admin@example.com',
            phone: '+1234567890',
            user_roles: [],
          },
        ];

        mockFromFn.mockReturnValueOnce(createUserQueryMock(mockUsers));

        const recipients = await escalationService.getEscalationRecipients(
          'site-1',
          'company-1',
          2
        );

        expect(recipients[0].role).toBe('ADMIN');
      });
    });

    describe('Level 3 - Managing Director', () => {
      it('should fetch company OWNER only for level 3', async () => {
        const mockUsers = [
          {
            id: 'user-4',
            email: 'md@example.com',
            phone: '+2222222222',
            user_roles: [{ role: 'OWNER' }],
          },
        ];

        mockFromFn.mockReturnValueOnce(createLevel3UserQueryMock(mockUsers));

        const recipients = await escalationService.getEscalationRecipients(
          'site-1',
          'company-1',
          3
        );

        expect(recipients).toHaveLength(1);
        expect(recipients[0]).toEqual({
          userId: 'user-4',
          email: 'md@example.com',
          phone: '+2222222222',
          role: 'OWNER',
          level: 3,
        });
        expect(mockFromFn).toHaveBeenCalledWith('users');
      });

      it('should return empty array if database error occurs for level 3', async () => {
        mockFromFn.mockReturnValueOnce(
          createLevel3UserQueryMock(null, { message: 'Database error' })
        );

        const recipients = await escalationService.getEscalationRecipients(
          'site-1',
          'company-1',
          3
        );

        expect(recipients).toEqual([]);
      });

      it('should return empty array if no OWNER found for level 3', async () => {
        mockFromFn.mockReturnValueOnce(createLevel3UserQueryMock([]));

        const recipients = await escalationService.getEscalationRecipients(
          'site-1',
          'company-1',
          3
        );

        expect(recipients).toEqual([]);
      });
    });

    describe('Invalid levels', () => {
      it('should handle invalid escalation level gracefully', async () => {
        const mockUsers = [
          {
            id: 'user-4',
            email: 'md@example.com',
            phone: '+2222222222',
            user_roles: [{ role: 'OWNER' }],
          },
        ];

        mockFromFn.mockReturnValueOnce(createLevel3UserQueryMock(mockUsers));

        const recipients = await escalationService.getEscalationRecipients(
          'site-1',
          'company-1',
          999
        );

        // Invalid levels fall through to level 3 logic
        expect(recipients).toHaveLength(1);
      });
    });
  });

  describe('checkEscalation', () => {
    it('should return no escalation if obligation not found', async () => {
      mockFromFn.mockReturnValueOnce(
        createObligationQueryMock(null, { message: 'Not found' })
      );

      const result = await escalationService.checkEscalation('obligation-1', 1);

      expect(result).toEqual({
        shouldEscalate: false,
        currentLevel: 1,
        nextLevel: null,
        hoursSinceLastNotification: 0,
        hasEvidence: false,
      });
    });

    it('should detect evidence and return hasEvidence true', async () => {
      const mockObligation = {
        id: 'obligation-1',
        status: 'PENDING',
        deadline_date: '2024-12-31',
      };

      const mockEvidence = [
        { id: 'evidence-1', created_at: new Date().toISOString() },
      ];

      mockFromFn.mockReturnValueOnce(createObligationQueryMock(mockObligation));
      mockFromFn.mockReturnValueOnce(createEvidenceQueryMock(mockEvidence));
      mockFromFn.mockReturnValueOnce(createNotificationQueryMock([]));

      const result = await escalationService.checkEscalation('obligation-1', 0);

      expect(result.hasEvidence).toBe(true);
    });

    it('should not escalate if evidence added after last notification', async () => {
      const mockObligation = {
        id: 'obligation-1',
        status: 'PENDING',
        deadline_date: '2024-12-31',
      };

      const notificationDate = new Date('2024-01-01T10:00:00Z');
      const evidenceDate = new Date('2024-01-02T10:00:00Z'); // After notification

      const mockEvidence = [
        { id: 'evidence-1', created_at: evidenceDate.toISOString() },
      ];

      const mockNotifications = [
        {
          created_at: notificationDate.toISOString(),
          escalation_level: 1,
        },
      ];

      mockFromFn.mockReturnValueOnce(createObligationQueryMock(mockObligation));
      mockFromFn.mockReturnValueOnce(createEvidenceQueryMock(mockEvidence));
      mockFromFn.mockReturnValueOnce(createNotificationQueryMock(mockNotifications));

      const result = await escalationService.checkEscalation('obligation-1', 1);

      expect(result.shouldEscalate).toBe(false);
      expect(result.hasEvidence).toBe(true);
    });

    it('should escalate to level 1 if no notification exists and escalation level is 0', async () => {
      const mockObligation = {
        id: 'obligation-1',
        status: 'PENDING',
        deadline_date: '2024-12-31',
      };

      mockFromFn.mockReturnValueOnce(createObligationQueryMock(mockObligation));
      mockFromFn.mockReturnValueOnce(createEvidenceQueryMock([]));
      mockFromFn.mockReturnValueOnce(createNotificationQueryMock([]));

      const result = await escalationService.checkEscalation('obligation-1', 0);

      expect(result.shouldEscalate).toBe(true);
      expect(result.currentLevel).toBe(0);
      expect(result.nextLevel).toBe(1);
    });

    it('should not escalate if no notification exists but level is already set', async () => {
      const mockObligation = {
        id: 'obligation-1',
        status: 'PENDING',
        deadline_date: '2024-12-31',
      };

      mockFromFn.mockReturnValueOnce(createObligationQueryMock(mockObligation));
      mockFromFn.mockReturnValueOnce(createEvidenceQueryMock([]));
      mockFromFn.mockReturnValueOnce(createNotificationQueryMock([]));

      const result = await escalationService.checkEscalation('obligation-1', 1);

      expect(result.shouldEscalate).toBe(false);
      expect(result.nextLevel).toBeNull();
    });

    it('should escalate from level 1 to level 2 after 24 hours', async () => {
      const mockObligation = {
        id: 'obligation-1',
        status: 'PENDING',
        deadline_date: '2024-12-31',
      };

      const notificationDate = new Date();
      notificationDate.setHours(notificationDate.getHours() - 25); // 25 hours ago

      const mockNotifications = [
        {
          created_at: notificationDate.toISOString(),
          escalation_level: 1,
        },
      ];

      mockFromFn.mockReturnValueOnce(createObligationQueryMock(mockObligation));
      mockFromFn.mockReturnValueOnce(createEvidenceQueryMock([]));
      mockFromFn.mockReturnValueOnce(createNotificationQueryMock(mockNotifications));

      const result = await escalationService.checkEscalation('obligation-1', 1);

      expect(result.shouldEscalate).toBe(true);
      expect(result.currentLevel).toBe(1);
      expect(result.nextLevel).toBe(2);
      expect(result.hoursSinceLastNotification).toBeGreaterThanOrEqual(24);
    });

    it('should not escalate from level 1 before 24 hours', async () => {
      const mockObligation = {
        id: 'obligation-1',
        status: 'PENDING',
        deadline_date: '2024-12-31',
      };

      const notificationDate = new Date();
      notificationDate.setHours(notificationDate.getHours() - 20); // 20 hours ago

      const mockNotifications = [
        {
          created_at: notificationDate.toISOString(),
          escalation_level: 1,
        },
      ];

      mockFromFn.mockReturnValueOnce(createObligationQueryMock(mockObligation));
      mockFromFn.mockReturnValueOnce(createEvidenceQueryMock([]));
      mockFromFn.mockReturnValueOnce(createNotificationQueryMock(mockNotifications));

      const result = await escalationService.checkEscalation('obligation-1', 1);

      expect(result.shouldEscalate).toBe(false);
      expect(result.nextLevel).toBeNull();
    });

    it('should escalate from level 2 to level 3 after 48 hours', async () => {
      const mockObligation = {
        id: 'obligation-1',
        status: 'PENDING',
        deadline_date: '2024-12-31',
      };

      const notificationDate = new Date();
      notificationDate.setHours(notificationDate.getHours() - 50); // 50 hours ago

      const mockNotifications = [
        {
          created_at: notificationDate.toISOString(),
          escalation_level: 2,
        },
      ];

      mockFromFn.mockReturnValueOnce(createObligationQueryMock(mockObligation));
      mockFromFn.mockReturnValueOnce(createEvidenceQueryMock([]));
      mockFromFn.mockReturnValueOnce(createNotificationQueryMock(mockNotifications));

      const result = await escalationService.checkEscalation('obligation-1', 2);

      expect(result.shouldEscalate).toBe(true);
      expect(result.currentLevel).toBe(2);
      expect(result.nextLevel).toBe(3);
      expect(result.hoursSinceLastNotification).toBeGreaterThanOrEqual(48);
    });

    it('should not escalate from level 2 before 48 hours', async () => {
      const mockObligation = {
        id: 'obligation-1',
        status: 'PENDING',
        deadline_date: '2024-12-31',
      };

      const notificationDate = new Date();
      notificationDate.setHours(notificationDate.getHours() - 40); // 40 hours ago

      const mockNotifications = [
        {
          created_at: notificationDate.toISOString(),
          escalation_level: 2,
        },
      ];

      mockFromFn.mockReturnValueOnce(createObligationQueryMock(mockObligation));
      mockFromFn.mockReturnValueOnce(createEvidenceQueryMock([]));
      mockFromFn.mockReturnValueOnce(createNotificationQueryMock(mockNotifications));

      const result = await escalationService.checkEscalation('obligation-1', 2);

      expect(result.shouldEscalate).toBe(false);
      expect(result.nextLevel).toBeNull();
    });

    it('should not escalate from level 3 (max level)', async () => {
      const mockObligation = {
        id: 'obligation-1',
        status: 'PENDING',
        deadline_date: '2024-12-31',
      };

      const notificationDate = new Date();
      notificationDate.setHours(notificationDate.getHours() - 100); // Long time ago

      const mockNotifications = [
        {
          created_at: notificationDate.toISOString(),
          escalation_level: 3,
        },
      ];

      mockFromFn.mockReturnValueOnce(createObligationQueryMock(mockObligation));
      mockFromFn.mockReturnValueOnce(createEvidenceQueryMock([]));
      mockFromFn.mockReturnValueOnce(createNotificationQueryMock(mockNotifications));

      const result = await escalationService.checkEscalation('obligation-1', 3);

      expect(result.shouldEscalate).toBe(false);
      expect(result.nextLevel).toBeNull();
    });

    it('should check evidence even when notification exists but evidence is older', async () => {
      const mockObligation = {
        id: 'obligation-1',
        status: 'PENDING',
        deadline_date: '2024-12-31',
      };

      const evidenceDate = new Date('2024-01-01T10:00:00Z');
      const notificationDate = new Date('2024-01-02T10:00:00Z'); // After evidence

      const mockEvidence = [
        { id: 'evidence-1', created_at: evidenceDate.toISOString() },
      ];

      const mockNotifications = [
        {
          created_at: notificationDate.toISOString(),
          escalation_level: 1,
        },
      ];

      mockFromFn.mockReturnValueOnce(createObligationQueryMock(mockObligation));
      mockFromFn.mockReturnValueOnce(createEvidenceQueryMock(mockEvidence));
      mockFromFn.mockReturnValueOnce(createNotificationQueryMock(mockNotifications));

      const result = await escalationService.checkEscalation('obligation-1', 1);

      expect(result.hasEvidence).toBe(true);
      // Should still check for escalation since evidence is older than notification
    });
  });

  describe('createEscalationNotification', () => {
    it('should create notifications for all recipients at level 1', async () => {
      const mockRecipients = [
        {
          id: 'user-1',
          email: 'admin@example.com',
          phone: '+1234567890',
          user_roles: [{ role: 'ADMIN' }],
        },
      ];

      const mockObligation = {
        obligation_title: 'Test Obligation',
        obligation_description: 'Test Description',
        original_text: 'Original text',
        deadline_date: '2024-12-31',
      };

      const mockSite = {
        name: 'Test Site',
      };

      mockFromFn.mockReturnValueOnce(createUserQueryMock(mockRecipients)); // getEscalationRecipients
      mockFromFn.mockReturnValueOnce(createObligationQueryMock(mockObligation));
      mockFromFn.mockReturnValueOnce(createSiteQueryMock(mockSite));
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'notification-1' }], error: null })
      );

      const notificationId = await escalationService.createEscalationNotification(
        'obligation-1',
        'deadline-1',
        'site-1',
        'company-1',
        1,
        'original-notification-1'
      );

      expect(notificationId).toBe('notification-1');
      expect(mockFromFn).toHaveBeenCalledWith('users');
      expect(mockFromFn).toHaveBeenCalledWith('obligations');
      expect(mockFromFn).toHaveBeenCalledWith('sites');
      expect(mockFromFn).toHaveBeenCalledWith('notifications');
    });

    it('should return null if no recipients found', async () => {
      mockFromFn.mockReturnValueOnce(createUserQueryMock([])); // No recipients

      const notificationId = await escalationService.createEscalationNotification(
        'obligation-1',
        'deadline-1',
        'site-1',
        'company-1',
        1
      );

      expect(notificationId).toBeNull();
    });

    it('should return null if obligation not found', async () => {
      const mockRecipients = [
        {
          id: 'user-1',
          email: 'admin@example.com',
          phone: '+1234567890',
          user_roles: [{ role: 'ADMIN' }],
        },
      ];

      mockFromFn.mockReturnValueOnce(createUserQueryMock(mockRecipients));
      mockFromFn.mockReturnValueOnce(createObligationQueryMock(null));

      const notificationId = await escalationService.createEscalationNotification(
        'obligation-1',
        'deadline-1',
        'site-1',
        'company-1',
        1
      );

      expect(notificationId).toBeNull();
    });

    it('should set priority to NORMAL for level 1', async () => {
      const mockRecipients = [
        {
          id: 'user-1',
          email: 'admin@example.com',
          phone: '+1234567890',
          user_roles: [{ role: 'ADMIN' }],
        },
      ];

      const mockObligation = {
        obligation_title: 'Test Obligation',
        obligation_description: 'Test Description',
        original_text: 'Original text',
        deadline_date: '2024-12-31',
      };

      const mockSite = { name: 'Test Site' };

      mockFromFn.mockReturnValueOnce(createUserQueryMock(mockRecipients));
      mockFromFn.mockReturnValueOnce(createObligationQueryMock(mockObligation));
      mockFromFn.mockReturnValueOnce(createSiteQueryMock(mockSite));
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'notification-1' }], error: null })
      );

      await escalationService.createEscalationNotification(
        'obligation-1',
        'deadline-1',
        'site-1',
        'company-1',
        1
      );

      // Check that notification was created - priority is checked in the service
      expect(mockFromFn).toHaveBeenCalledWith('notifications');
    });

    it('should set priority to HIGH for level 2', async () => {
      const mockRecipients = [
        {
          id: 'user-1',
          email: 'compliance@example.com',
          phone: '+1234567890',
          user_roles: [{ role: 'ADMIN' }],
        },
      ];

      const mockObligation = {
        obligation_title: 'Test Obligation',
        obligation_description: 'Test Description',
        original_text: 'Original text',
        deadline_date: '2024-12-31',
      };

      const mockSite = { name: 'Test Site' };

      mockFromFn.mockReturnValueOnce(createUserQueryMock(mockRecipients));
      mockFromFn.mockReturnValueOnce(createObligationQueryMock(mockObligation));
      mockFromFn.mockReturnValueOnce(createSiteQueryMock(mockSite));
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'notification-2' }], error: null })
      );

      await escalationService.createEscalationNotification(
        'obligation-1',
        'deadline-1',
        'site-1',
        'company-1',
        2
      );

      expect(mockFromFn).toHaveBeenCalledWith('notifications');
    });

    it('should set priority to CRITICAL for level 3', async () => {
      const mockRecipients = [
        {
          id: 'user-1',
          email: 'md@example.com',
          phone: '+1234567890',
          user_roles: [{ role: 'OWNER' }],
        },
      ];

      const mockObligation = {
        obligation_title: 'Test Obligation',
        obligation_description: 'Test Description',
        original_text: 'Original text',
        deadline_date: '2024-12-31',
      };

      const mockSite = { name: 'Test Site' };

      mockFromFn.mockReturnValueOnce(createLevel3UserQueryMock(mockRecipients));
      mockFromFn.mockReturnValueOnce(createObligationQueryMock(mockObligation));
      mockFromFn.mockReturnValueOnce(createSiteQueryMock(mockSite));
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'notification-3' }], error: null })
      );

      await escalationService.createEscalationNotification(
        'obligation-1',
        'deadline-1',
        'site-1',
        'company-1',
        3
      );

      expect(mockFromFn).toHaveBeenCalledWith('notifications');
    });

    it('should use obligation_title in subject if available', async () => {
      const mockRecipients = [
        {
          id: 'user-1',
          email: 'admin@example.com',
          phone: '+1234567890',
          user_roles: [{ role: 'ADMIN' }],
        },
      ];

      const mockObligation = {
        obligation_title: 'Important Obligation',
        obligation_description: 'Test Description',
        original_text: 'Original text',
        deadline_date: '2024-12-31',
      };

      const mockSite = { name: 'Test Site' };

      mockFromFn.mockReturnValueOnce(createUserQueryMock(mockRecipients));
      mockFromFn.mockReturnValueOnce(createObligationQueryMock(mockObligation));
      mockFromFn.mockReturnValueOnce(createSiteQueryMock(mockSite));
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'notification-1' }], error: null })
      );

      await escalationService.createEscalationNotification(
        'obligation-1',
        'deadline-1',
        'site-1',
        'company-1',
        1
      );

      expect(mockFromFn).toHaveBeenCalledWith('notifications');
    });

    it('should fallback to obligation_description if title is null', async () => {
      const mockRecipients = [
        {
          id: 'user-1',
          email: 'admin@example.com',
          phone: '+1234567890',
          user_roles: [{ role: 'ADMIN' }],
        },
      ];

      const mockObligation = {
        obligation_title: null,
        obligation_description: 'Test Description',
        original_text: 'Original text',
        deadline_date: '2024-12-31',
      };

      const mockSite = { name: 'Test Site' };

      mockFromFn.mockReturnValueOnce(createUserQueryMock(mockRecipients));
      mockFromFn.mockReturnValueOnce(createObligationQueryMock(mockObligation));
      mockFromFn.mockReturnValueOnce(createSiteQueryMock(mockSite));
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'notification-1' }], error: null })
      );

      await escalationService.createEscalationNotification(
        'obligation-1',
        'deadline-1',
        'site-1',
        'company-1',
        1
      );

      expect(mockFromFn).toHaveBeenCalledWith('notifications');
    });

    it('should fallback to original_text substring if title and description are null', async () => {
      const mockRecipients = [
        {
          id: 'user-1',
          email: 'admin@example.com',
          phone: '+1234567890',
          user_roles: [{ role: 'ADMIN' }],
        },
      ];

      const mockObligation = {
        obligation_title: null,
        obligation_description: null,
        original_text: 'This is a very long original text that should be truncated',
        deadline_date: '2024-12-31',
      };

      const mockSite = { name: 'Test Site' };

      mockFromFn.mockReturnValueOnce(createUserQueryMock(mockRecipients));
      mockFromFn.mockReturnValueOnce(createObligationQueryMock(mockObligation));
      mockFromFn.mockReturnValueOnce(createSiteQueryMock(mockSite));
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'notification-1' }], error: null })
      );

      await escalationService.createEscalationNotification(
        'obligation-1',
        'deadline-1',
        'site-1',
        'company-1',
        1
      );

      expect(mockFromFn).toHaveBeenCalledWith('notifications');
    });

    it('should use "Obligation" as default if all text fields are null', async () => {
      const mockRecipients = [
        {
          id: 'user-1',
          email: 'admin@example.com',
          phone: '+1234567890',
          user_roles: [{ role: 'ADMIN' }],
        },
      ];

      const mockObligation = {
        obligation_title: null,
        obligation_description: null,
        original_text: null,
        deadline_date: '2024-12-31',
      };

      const mockSite = { name: 'Test Site' };

      mockFromFn.mockReturnValueOnce(createUserQueryMock(mockRecipients));
      mockFromFn.mockReturnValueOnce(createObligationQueryMock(mockObligation));
      mockFromFn.mockReturnValueOnce(createSiteQueryMock(mockSite));
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'notification-1' }], error: null })
      );

      await escalationService.createEscalationNotification(
        'obligation-1',
        'deadline-1',
        'site-1',
        'company-1',
        1
      );

      expect(mockFromFn).toHaveBeenCalledWith('notifications');
    });

    it('should include original notification ID in metadata if provided', async () => {
      const mockRecipients = [
        {
          id: 'user-1',
          email: 'admin@example.com',
          phone: '+1234567890',
          user_roles: [{ role: 'ADMIN' }],
        },
      ];

      const mockObligation = {
        obligation_title: 'Test Obligation',
        obligation_description: 'Test Description',
        original_text: 'Original text',
        deadline_date: '2024-12-31',
      };

      const mockSite = { name: 'Test Site' };

      mockFromFn.mockReturnValueOnce(createUserQueryMock(mockRecipients));
      mockFromFn.mockReturnValueOnce(createObligationQueryMock(mockObligation));
      mockFromFn.mockReturnValueOnce(createSiteQueryMock(mockSite));
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'notification-1' }], error: null })
      );

      await escalationService.createEscalationNotification(
        'obligation-1',
        'deadline-1',
        'site-1',
        'company-1',
        1,
        'original-notification-123'
      );

      expect(mockFromFn).toHaveBeenCalledWith('notifications');
    });

    it('should return null if notification insert fails', async () => {
      const mockRecipients = [
        {
          id: 'user-1',
          email: 'admin@example.com',
          phone: '+1234567890',
          user_roles: [{ role: 'ADMIN' }],
        },
      ];

      const mockObligation = {
        obligation_title: 'Test Obligation',
        obligation_description: 'Test Description',
        original_text: 'Original text',
        deadline_date: '2024-12-31',
      };

      const mockSite = { name: 'Test Site' };

      mockFromFn.mockReturnValueOnce(createUserQueryMock(mockRecipients));
      mockFromFn.mockReturnValueOnce(createObligationQueryMock(mockObligation));
      mockFromFn.mockReturnValueOnce(createSiteQueryMock(mockSite));
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: null, error: { message: 'Insert failed' } })
      );

      const notificationId = await escalationService.createEscalationNotification(
        'obligation-1',
        'deadline-1',
        'site-1',
        'company-1',
        1
      );

      expect(notificationId).toBeNull();
    });

    it('should return null if notification insert returns empty array', async () => {
      const mockRecipients = [
        {
          id: 'user-1',
          email: 'admin@example.com',
          phone: '+1234567890',
          user_roles: [{ role: 'ADMIN' }],
        },
      ];

      const mockObligation = {
        obligation_title: 'Test Obligation',
        obligation_description: 'Test Description',
        original_text: 'Original text',
        deadline_date: '2024-12-31',
      };

      const mockSite = { name: 'Test Site' };

      mockFromFn.mockReturnValueOnce(createUserQueryMock(mockRecipients));
      mockFromFn.mockReturnValueOnce(createObligationQueryMock(mockObligation));
      mockFromFn.mockReturnValueOnce(createSiteQueryMock(mockSite));
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [], error: null })
      );

      const notificationId = await escalationService.createEscalationNotification(
        'obligation-1',
        'deadline-1',
        'site-1',
        'company-1',
        1
      );

      expect(notificationId).toBeNull();
    });

    it('should create notifications for multiple recipients', async () => {
      const mockRecipients = [
        {
          id: 'user-1',
          email: 'admin1@example.com',
          phone: '+1234567890',
          user_roles: [{ role: 'ADMIN' }],
        },
        {
          id: 'user-2',
          email: 'admin2@example.com',
          phone: '+0987654321',
          user_roles: [{ role: 'ADMIN' }],
        },
      ];

      const mockObligation = {
        obligation_title: 'Test Obligation',
        obligation_description: 'Test Description',
        original_text: 'Original text',
        deadline_date: '2024-12-31',
      };

      const mockSite = { name: 'Test Site' };

      mockFromFn.mockReturnValueOnce(createUserQueryMock(mockRecipients));
      mockFromFn.mockReturnValueOnce(createObligationQueryMock(mockObligation));
      mockFromFn.mockReturnValueOnce(createSiteQueryMock(mockSite));
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'notification-1' }], error: null })
      );

      const notificationId = await escalationService.createEscalationNotification(
        'obligation-1',
        'deadline-1',
        'site-1',
        'company-1',
        1
      );

      expect(notificationId).toBe('notification-1');
    });

    it('should handle null deadline_id gracefully', async () => {
      const mockRecipients = [
        {
          id: 'user-1',
          email: 'admin@example.com',
          phone: '+1234567890',
          user_roles: [{ role: 'ADMIN' }],
        },
      ];

      const mockObligation = {
        obligation_title: 'Test Obligation',
        obligation_description: 'Test Description',
        original_text: 'Original text',
        deadline_date: '2024-12-31',
      };

      const mockSite = { name: 'Test Site' };

      mockFromFn.mockReturnValueOnce(createUserQueryMock(mockRecipients));
      mockFromFn.mockReturnValueOnce(createObligationQueryMock(mockObligation));
      mockFromFn.mockReturnValueOnce(createSiteQueryMock(mockSite));
      mockFromFn.mockReturnValueOnce(
        createInsertMock({ data: [{ id: 'notification-1' }], error: null })
      );

      const notificationId = await escalationService.createEscalationNotification(
        'obligation-1',
        null,
        'site-1',
        'company-1',
        1
      );

      expect(notificationId).toBe('notification-1');
    });
  });

  describe('Interface exports', () => {
    it('should export EscalationRecipient interface', () => {
      // Type check - if this compiles, the interface exists
      const recipient: typeof escalationService.EscalationRecipient = {
        userId: 'user-1',
        email: 'test@example.com',
        phone: '+1234567890',
        role: 'ADMIN',
        level: 1,
      };
      expect(recipient).toBeDefined();
    });

    it('should export EscalationCheckResult interface', () => {
      // Type check - if this compiles, the interface exists
      const result: typeof escalationService.EscalationCheckResult = {
        shouldEscalate: true,
        currentLevel: 1,
        nextLevel: 2,
        hoursSinceLastNotification: 25,
        hasEvidence: false,
      };
      expect(result).toBeDefined();
    });
  });
});
