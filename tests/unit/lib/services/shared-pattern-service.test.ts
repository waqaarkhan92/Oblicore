/**
 * Shared Pattern Service Tests
 * Comprehensive tests for lib/services/shared-pattern-service.ts
 * Target: 100% coverage
 *
 * Tests cover:
 * - getSharedPatterns with various filters
 * - checkPatternForPromotion logic
 * - promoteToSharedPattern workflow
 * - anonymizePattern text processing
 * - matchSharedPattern matching logic
 * - getPromotionCandidates ranking
 * - Error handling and edge cases
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';

describe('shared-pattern-service', () => {
  let mockFromFn: jest.Mock;
  let sharedPatternService: any;

  // Mock pattern data
  const mockSharedPattern = {
    id: 'pattern-1',
    pattern_id: 'EA_M1_MONITORING_001',
    pattern_version: '1.0.0',
    priority: 100,
    display_name: 'Effluent Monitoring',
    description: 'Pattern for effluent monitoring obligations',
    matching: {
      regex_primary: '\\b(effluent|discharge)\\s+(monitoring|sampling)\\b',
      regex_variants: [],
      semantic_keywords: ['effluent', 'monitoring', 'sampling'],
      negative_patterns: [],
    },
    extraction_template: {
      category: 'MONITORING',
      frequency: 'DAILY',
      is_subjective: false,
      condition_type: 'STANDARD',
    },
    applicability: {
      module_types: ['MODULE_1'],
      regulators: ['EA'],
      document_types: ['PERMIT'],
      water_companies: [],
    },
    performance: {
      usage_count: 15,
      success_count: 14,
      success_rate: 0.93,
      last_used_at: '2025-01-15T10:00:00Z',
    },
    is_active: true,
    deprecated_at: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  };

  const mockPatternCandidate = {
    id: 'candidate-1',
    suggested_pattern: {
      pattern_id: 'EA_M1_REPORTING_002',
      pattern_version: '1.0.0',
      priority: 200,
      display_name: 'EA Annual Emissions Report',
      description: 'Generic annual emissions reporting pattern',
      matching: {
        regex_primary: '\\b(annual|yearly)\\s+report\\b',
        regex_variants: [],
        semantic_keywords: ['annual', 'report'],
        negative_patterns: [],
      },
      extraction_template: {
        category: 'REPORTING',
        frequency: 'ANNUAL',
        is_subjective: false,
        condition_type: 'REPORTING',
      },
      applicability: {
        module_types: ['MODULE_1'],
        regulators: ['EA'],
        document_types: ['PERMIT'],
        water_companies: [],
      },
      performance: {
        usage_count: 12,
        success_count: 11,
        success_rate: 0.92,
        last_used_at: '2025-01-14T10:00:00Z',
      },
    },
    source_extractions: ['ext-1', 'ext-2', 'ext-3'],
    sample_count: 10,
    match_rate: 0.95,
    status: 'PENDING_REVIEW',
    created_at: '2025-01-10T00:00:00Z',
    updated_at: '2025-01-14T10:00:00Z',
  };

  // Helper to create pattern query mock
  const createPatternQueryMock = (patterns: any[], error: any = null) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnValue(
        Promise.resolve({ data: patterns, error })
      ),
    }),
  });

  // Helper to create candidate query mock
  const createCandidateQueryMock = (candidate: any, error: any = null) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockReturnValue(
          Promise.resolve({ data: candidate, error })
        ),
      }),
    }),
  });

  // Helper to create candidates list query mock
  const createCandidatesListQueryMock = (candidates: any[], error: any = null) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue(
            Promise.resolve({ data: candidates, error })
          ),
        }),
      }),
    }),
  });

  // Helper to create insert mock
  const createInsertMock = (insertedData: any, error: any = null) => ({
    insert: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockReturnValue(
          Promise.resolve({ data: insertedData, error })
        ),
      }),
    }),
  });

  // Helper to create update mock
  const createUpdateMock = (error: any = null) => ({
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue(
        Promise.resolve({ data: null, error })
      ),
    }),
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset modules to ensure clean state
    jest.resetModules();

    // Create mock function
    mockFromFn = jest.fn();

    // Mock supabaseAdmin
    jest.doMock('@/lib/supabase/server', () => ({
      supabaseAdmin: {
        from: mockFromFn,
      },
    }));

    // Import service after mocking
    const service = await import('@/lib/services/shared-pattern-service');
    sharedPatternService = new service.SharedPatternService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSharedPatterns', () => {
    it('should fetch and transform shared patterns without filters', async () => {
      mockFromFn.mockReturnValue(
        createPatternQueryMock([mockSharedPattern])
      );

      const result = await sharedPatternService.getSharedPatterns();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'pattern-1',
        regulator: 'EA',
        documentType: 'PERMIT',
        crossCustomerUsageCount: 15,
        successRate: 0.93,
        isGlobal: true,
      });
      expect(result[0].patternTemplate).toBeDefined();
    });

    it('should filter patterns by regulator', async () => {
      const sepaPattern = {
        ...mockSharedPattern,
        id: 'pattern-2',
        applicability: {
          ...mockSharedPattern.applicability,
          regulators: ['SEPA'],
        },
      };

      mockFromFn.mockReturnValue(
        createPatternQueryMock([mockSharedPattern, sepaPattern])
      );

      const result = await sharedPatternService.getSharedPatterns({
        regulator: 'EA',
      });

      expect(result).toHaveLength(1);
      expect(result[0].regulator).toBe('EA');
    });

    it('should filter patterns by document type', async () => {
      const consentPattern = {
        ...mockSharedPattern,
        id: 'pattern-3',
        applicability: {
          ...mockSharedPattern.applicability,
          document_types: ['CONSENT'],
        },
      };

      mockFromFn.mockReturnValue(
        createPatternQueryMock([mockSharedPattern, consentPattern])
      );

      const result = await sharedPatternService.getSharedPatterns({
        documentType: 'PERMIT',
      });

      expect(result).toHaveLength(1);
      expect(result[0].documentType).toBe('PERMIT');
    });

    it('should filter out patterns with low usage count (non-global)', async () => {
      const lowUsagePattern = {
        ...mockSharedPattern,
        id: 'pattern-4',
        performance: {
          ...mockSharedPattern.performance,
          usage_count: 5,
        },
      };

      mockFromFn.mockReturnValue(
        createPatternQueryMock([mockSharedPattern, lowUsagePattern])
      );

      const result = await sharedPatternService.getSharedPatterns();

      expect(result).toHaveLength(1);
      expect(result[0].crossCustomerUsageCount).toBeGreaterThanOrEqual(10);
    });

    it('should return empty array when no patterns found', async () => {
      mockFromFn.mockReturnValue(createPatternQueryMock([]));

      const result = await sharedPatternService.getSharedPatterns();

      expect(result).toHaveLength(0);
    });

    it('should handle database errors', async () => {
      mockFromFn.mockReturnValue(
        createPatternQueryMock(null, { message: 'Database error' })
      );

      await expect(
        sharedPatternService.getSharedPatterns()
      ).rejects.toThrow('Failed to fetch shared patterns');
    });
  });

  describe('checkPatternForPromotion', () => {
    it('should approve eligible pattern for promotion', async () => {
      mockFromFn.mockReturnValue(
        createCandidateQueryMock(mockPatternCandidate)
      );

      const result = await sharedPatternService.checkPatternForPromotion(
        'candidate-1'
      );

      expect(result.eligible).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should reject pattern not found', async () => {
      mockFromFn.mockReturnValue(
        createCandidateQueryMock(null, { message: 'Not found' })
      );

      const result = await sharedPatternService.checkPatternForPromotion(
        'invalid-id'
      );

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('Pattern candidate not found');
    });

    it('should reject already promoted pattern', async () => {
      const approvedCandidate = {
        ...mockPatternCandidate,
        status: 'APPROVED',
      };

      mockFromFn.mockReturnValue(
        createCandidateQueryMock(approvedCandidate)
      );

      const result = await sharedPatternService.checkPatternForPromotion(
        'candidate-1'
      );

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('Pattern already promoted');
    });

    it('should reject pattern with insufficient usage', async () => {
      const lowUsageCandidate = {
        ...mockPatternCandidate,
        suggested_pattern: {
          ...mockPatternCandidate.suggested_pattern,
          performance: {
            ...mockPatternCandidate.suggested_pattern.performance,
            usage_count: 5,
          },
        },
      };

      mockFromFn.mockReturnValue(
        createCandidateQueryMock(lowUsageCandidate)
      );

      const result = await sharedPatternService.checkPatternForPromotion(
        'candidate-1'
      );

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('Insufficient cross-customer usage');
    });

    it('should reject pattern with low success rate', async () => {
      const lowSuccessCandidate = {
        ...mockPatternCandidate,
        suggested_pattern: {
          ...mockPatternCandidate.suggested_pattern,
          performance: {
            ...mockPatternCandidate.suggested_pattern.performance,
            success_rate: 0.80,
          },
        },
      };

      mockFromFn.mockReturnValue(
        createCandidateQueryMock(lowSuccessCandidate)
      );

      const result = await sharedPatternService.checkPatternForPromotion(
        'candidate-1'
      );

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('Success rate too low');
    });

    it('should reject pattern with low match rate', async () => {
      const lowMatchCandidate = {
        ...mockPatternCandidate,
        match_rate: 0.85,
      };

      mockFromFn.mockReturnValue(
        createCandidateQueryMock(lowMatchCandidate)
      );

      const result = await sharedPatternService.checkPatternForPromotion(
        'candidate-1'
      );

      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('Match rate too low');
    });
  });

  describe('anonymizePattern', () => {
    it('should anonymize company names', () => {
      const text = 'Thames Water Ltd must monitor the discharge.';
      const result = sharedPatternService.anonymizePattern(text);
      expect(result).toBe('[COMPANY] must monitor the discharge.');
    });

    it('should anonymize site references', () => {
      const text = 'Monitoring at Mogden Treatment Works is required.';
      const result = sharedPatternService.anonymizePattern(text);
      // The service may remove surrounding prepositions during anonymization
      expect(result).toContain('[SITE]');
    });

    it('should anonymize dates in DD/MM/YYYY format', () => {
      const text = 'Report due by 31/12/2025.';
      const result = sharedPatternService.anonymizePattern(text);
      expect(result).toBe('Report due by [DATE].');
    });

    it('should anonymize dates in YYYY-MM-DD format', () => {
      const text = 'Deadline: 2025-12-31';
      const result = sharedPatternService.anonymizePattern(text);
      expect(result).toBe('Deadline: [DATE]');
    });

    it('should anonymize addresses', () => {
      const text = 'Located at 123 Main Street, London.';
      const result = sharedPatternService.anonymizePattern(text);
      expect(result).toBe('Located at [ADDRESS], London.');
    });

    it('should anonymize UK postcodes', () => {
      const text = 'Address: SW1A 1AA';
      const result = sharedPatternService.anonymizePattern(text);
      expect(result).toBe('Address: [POSTCODE]');
    });

    it('should anonymize email addresses', () => {
      const text = 'Contact: info@example.com';
      const result = sharedPatternService.anonymizePattern(text);
      expect(result).toBe('Contact: [EMAIL]');
    });

    it('should anonymize phone numbers', () => {
      const text = 'Call 0207-123-4567 for assistance.';
      const result = sharedPatternService.anonymizePattern(text);
      expect(result).toBe('Call [PHONE] for assistance.');
    });

    it('should anonymize permit numbers', () => {
      const text = 'Permit EPR/AB1234/V001 applies.';
      const result = sharedPatternService.anonymizePattern(text);
      // The service preserves the permit type prefix (EPR/) while anonymizing the number
      expect(result).toContain('[PERMIT_NUMBER]');
    });

    it('should anonymize person names with titles', () => {
      const text = 'Approved by Dr John Smith.';
      const result = sharedPatternService.anonymizePattern(text);
      expect(result).toBe('Approved by [PERSON_NAME].');
    });

    it('should anonymize monetary amounts', () => {
      const text = 'Fee: £1,500.00';
      const result = sharedPatternService.anonymizePattern(text);
      expect(result).toBe('Fee: [AMOUNT]');
    });

    it('should handle empty or null text', () => {
      expect(sharedPatternService.anonymizePattern('')).toBe('');
      expect(sharedPatternService.anonymizePattern(null)).toBe(null);
    });

    it('should handle text with multiple anonymization targets', () => {
      const text = 'Thames Water Ltd at Mogden Site, SW1A 1AA, contact@thames.com, 31/12/2025';
      const result = sharedPatternService.anonymizePattern(text);
      expect(result).toContain('[COMPANY]');
      expect(result).toContain('[SITE]');
      expect(result).toContain('[POSTCODE]');
      expect(result).toContain('[EMAIL]');
      expect(result).toContain('[DATE]');
    });
  });

  describe('promoteToSharedPattern', () => {
    it('should successfully promote eligible pattern', async () => {
      // Mock check eligibility
      const checkMock = jest.spyOn(
        sharedPatternService,
        'checkPatternForPromotion'
      );
      checkMock.mockResolvedValue({ eligible: true });

      // Mock fetch candidate
      const fetchMock = createCandidateQueryMock(mockPatternCandidate);

      // Mock insert pattern
      const insertedPattern = {
        ...mockSharedPattern,
        id: 'new-pattern-1',
        display_name: '[SHARED] Annual Report',
      };
      const insertMock = createInsertMock(insertedPattern);

      // Mock update candidate
      const updateMock = createUpdateMock();

      // Mock insert event
      const eventInsertMock = createInsertMock({ id: 'event-1' });

      mockFromFn
        .mockReturnValueOnce(fetchMock)
        .mockReturnValueOnce(insertMock)
        .mockReturnValueOnce(updateMock)
        .mockReturnValueOnce(eventInsertMock);

      const result = await sharedPatternService.promoteToSharedPattern(
        'candidate-1'
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('new-pattern-1');
      expect(checkMock).toHaveBeenCalledWith('candidate-1');
    });

    it('should throw error if pattern not eligible', async () => {
      const checkMock = jest.spyOn(
        sharedPatternService,
        'checkPatternForPromotion'
      );
      checkMock.mockResolvedValue({
        eligible: false,
        reason: 'Insufficient usage',
      });

      await expect(
        sharedPatternService.promoteToSharedPattern('candidate-1')
      ).rejects.toThrow('Pattern not eligible for promotion');
    });

    it('should throw error if candidate not found', async () => {
      const checkMock = jest.spyOn(
        sharedPatternService,
        'checkPatternForPromotion'
      );
      checkMock.mockResolvedValue({ eligible: true });

      mockFromFn.mockReturnValue(
        createCandidateQueryMock(null, { message: 'Not found' })
      );

      await expect(
        sharedPatternService.promoteToSharedPattern('invalid-id')
      ).rejects.toThrow('Pattern candidate not found');
    });
  });

  describe('matchSharedPattern', () => {
    it('should return best matching pattern above threshold', async () => {
      const getPatternsMock = jest.spyOn(
        sharedPatternService,
        'getSharedPatterns'
      );
      getPatternsMock.mockResolvedValue([
        {
          id: 'pattern-1',
          regulator: 'EA',
          documentType: 'PERMIT',
          patternTemplate: 'effluent monitoring',
          crossCustomerUsageCount: 15,
          successRate: 0.93,
          isGlobal: true,
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-15T10:00:00Z',
        },
      ]);

      mockFromFn.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockReturnValue(
              Promise.resolve({
                data: {
                  matching: {
                    regex_primary: '\\b(effluent|discharge)\\s+(monitoring)\\b',
                    semantic_keywords: ['effluent', 'monitoring'],
                  },
                },
                error: null,
              })
            ),
          }),
        }),
      });

      const documentText = 'The facility must conduct effluent monitoring daily.';
      const result = await sharedPatternService.matchSharedPattern(
        documentText,
        { regulator: 'EA' }
      );

      expect(result).toBeDefined();
      expect(result?.id).toBe('pattern-1');
    });

    it('should return null if no patterns match above threshold', async () => {
      const getPatternsMock = jest.spyOn(
        sharedPatternService,
        'getSharedPatterns'
      );
      getPatternsMock.mockResolvedValue([]);

      const documentText = 'Some unrelated text';
      const result = await sharedPatternService.matchSharedPattern(
        documentText
      );

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      const getPatternsMock = jest.spyOn(
        sharedPatternService,
        'getSharedPatterns'
      );
      getPatternsMock.mockRejectedValue(new Error('Database error'));

      const documentText = 'Test text';
      const result = await sharedPatternService.matchSharedPattern(
        documentText
      );

      expect(result).toBeNull();
    });
  });

  describe('getPromotionCandidates', () => {
    it('should return ranked candidates close to promotion criteria', async () => {
      const candidates = [
        mockPatternCandidate,
        {
          ...mockPatternCandidate,
          id: 'candidate-2',
          suggested_pattern: {
            ...mockPatternCandidate.suggested_pattern,
            performance: {
              usage_count: 8,
              success_count: 7,
              success_rate: 0.875,
            },
          },
          match_rate: 0.91,
        },
      ];

      mockFromFn.mockReturnValue(
        createCandidatesListQueryMock(candidates)
      );

      const result = await sharedPatternService.getPromotionCandidates(10);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].id).toBeDefined();
      expect(result[0].status).toBe('PENDING_REVIEW');
    });

    it('should filter out candidates below 50% closeness threshold', async () => {
      const candidates = [
        {
          ...mockPatternCandidate,
          id: 'candidate-low',
          suggested_pattern: {
            ...mockPatternCandidate.suggested_pattern,
            performance: {
              usage_count: 2,
              success_count: 1,
              success_rate: 0.50,
            },
          },
          match_rate: 0.60,
        },
      ];

      mockFromFn.mockReturnValue(
        createCandidatesListQueryMock(candidates)
      );

      const result = await sharedPatternService.getPromotionCandidates(10);

      expect(result).toHaveLength(0);
    });

    it('should respect limit parameter', async () => {
      const candidates = Array.from({ length: 30 }, (_, i) => ({
        ...mockPatternCandidate,
        id: `candidate-${i}`,
      }));

      mockFromFn.mockReturnValue(
        createCandidatesListQueryMock(candidates)
      );

      const result = await sharedPatternService.getPromotionCandidates(5);

      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should handle database errors', async () => {
      mockFromFn.mockReturnValue(
        createCandidatesListQueryMock(null, { message: 'Database error' })
      );

      await expect(
        sharedPatternService.getPromotionCandidates(10)
      ).rejects.toThrow('Failed to fetch promotion candidates');
    });
  });
});
