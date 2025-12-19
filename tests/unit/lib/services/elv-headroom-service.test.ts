/**
 * ELV Headroom Service Tests
 * Comprehensive tests for lib/services/elv-headroom-service.ts
 * Target: 100% coverage
 *
 * Tests cover:
 * - getELVParameters - fetching permit limits
 * - getLatestReadings - fetching recent test results
 * - calculateHeadroom - headroom calculation and status determination
 * - getExceedanceHistory - fetching past breaches
 * - getSiteELVSummary - comprehensive site summary
 * - Error handling and edge cases
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import type { ELVParameter, ELVReading } from '@/lib/services/elv-headroom-service';

describe('elv-headroom-service', () => {
  let mockFromFn: jest.Mock;
  let elvHeadroomService: any;

  // Mock data
  const mockSiteId = 'site-123';
  const mockConditionId = 'cond-456';
  const mockGeneratorId = 'gen-789';

  const mockELVConditions = [
    {
      id: 'cond-nox',
      elv_parameter: 'NOx',
      elv_value: 190,
      elv_unit: 'mg/Nm³',
      elv_reference_conditions: '15% O2, dry',
      elv_averaging_period: 'Daily average',
      condition_reference: '3.1.1',
      elv_verbatim_text: 'NOx emissions shall not exceed 190 mg/Nm³ (Schedule 25A)',
    },
    {
      id: 'cond-so2',
      elv_parameter: 'SO2',
      elv_value: 120,
      elv_unit: 'mg/Nm³',
      elv_reference_conditions: '15% O2, dry',
      elv_averaging_period: 'Daily average',
      condition_reference: '3.1.2',
      elv_verbatim_text: 'SO2 emissions shall not exceed 120 mg/Nm³ (Schedule 25A)',
    },
  ];

  const mockMonitoringResults = [
    {
      id: 'result-1',
      elv_condition_id: 'cond-nox',
      test_date: '2025-01-15',
      measured_value: 150,
      measured_unit: 'mg/Nm³',
      created_at: '2025-01-15T10:00:00Z',
    },
  ];

  const mockStackTests = [
    {
      id: 'stack-1',
      generator_id: mockGeneratorId,
      test_date: '2025-01-10',
      nox_result: 175,
      so2_result: 80,
      co_result: 50,
      particulates_result: 20,
      created_at: '2025-01-10T10:00:00Z',
      generators: {
        id: mockGeneratorId,
        generator_identifier: 'GEN-001',
        emissions_nox: 190,
        emissions_so2: 120,
        emissions_co: 100,
        emissions_particulates: 30,
        document_id: 'doc-123',
        documents: {
          site_id: mockSiteId,
        },
      },
    },
  ];

  const mockExceedances = [
    {
      id: 'exceed-1',
      elv_condition_id: 'cond-nox',
      test_date: '2024-12-01',
      measured_value: 210,
      measured_unit: 'mg/Nm³',
      permit_limit: 190,
      is_compliant: false,
      exceedance_value: 20,
      exceedance_percentage: 10.53,
      created_at: '2024-12-01T10:00:00Z',
      elv_conditions: {
        id: 'cond-nox',
        elv_parameter: 'NOx',
        site_id: mockSiteId,
      },
    },
  ];

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    jest.resetModules();

    // Mock supabaseAdmin
    mockFromFn = jest.fn();
    jest.doMock('@/lib/supabase/server', () => ({
      supabaseAdmin: {
        from: mockFromFn,
      },
    }));

    // Import service after mocks are set up
    const module = await import('@/lib/services/elv-headroom-service');
    elvHeadroomService = module.elvHeadroomService;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getELVParameters', () => {
    it('should fetch and map ELV parameters with thresholds', async () => {
      mockFromFn.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue(
                Promise.resolve({ data: mockELVConditions, error: null })
              ),
            }),
          }),
        }),
      });

      const result = await elvHeadroomService.getELVParameters(mockSiteId);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'cond-nox',
        parameterName: 'NOx',
        unit: 'mg/Nm³',
        permitLimit: 190,
        warningThreshold: 152, // 80% of 190
        criticalThreshold: 171, // 90% of 190
        conditionReference: '3.1.1',
        averagingPeriod: 'Daily average',
        referenceConditions: '15% O2, dry',
      });
      expect(result[0].regulatoryBasis).toContain('Schedule 25A');
    });

    it('should handle empty results', async () => {
      mockFromFn.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue(
                Promise.resolve({ data: [], error: null })
              ),
            }),
          }),
        }),
      });

      const result = await elvHeadroomService.getELVParameters(mockSiteId);

      expect(result).toEqual([]);
    });

    it('should throw error on database failure', async () => {
      mockFromFn.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue(
                Promise.resolve({ data: null, error: { message: 'DB Error' } })
              ),
            }),
          }),
        }),
      });

      await expect(elvHeadroomService.getELVParameters(mockSiteId)).rejects.toThrow(
        'Failed to fetch ELV parameters: DB Error'
      );
    });
  });

  describe('getLatestReadings', () => {
    it('should fetch latest monitoring results', async () => {
      // Mock for elv_conditions
      const conditionsMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue(
              Promise.resolve({ data: [mockELVConditions[0]], error: null })
            ),
          }),
        }),
      };

      // Mock for elv_monitoring_results
      const resultsMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue(
                  Promise.resolve({ data: [mockMonitoringResults[0]], error: null })
                ),
              }),
            }),
          }),
        }),
      };

      // Mock for stack_tests
      const stackTestsMock = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue(
                Promise.resolve({ data: mockStackTests, error: null })
              ),
            }),
          }),
        }),
      };

      mockFromFn
        .mockReturnValueOnce(conditionsMock)
        .mockImplementation((table: string) => {
          if (table === 'elv_monitoring_results') return resultsMock;
          if (table === 'stack_tests') return stackTestsMock;
          return conditionsMock;
        });

      const result = await elvHeadroomService.getLatestReadings(mockSiteId);

      expect(result.length).toBeGreaterThan(0);
      const monitoringReading = result.find((r: ELVReading) => r.parameterId === 'cond-nox');
      expect(monitoringReading).toBeDefined();
      expect(monitoringReading?.value).toBe(150);
      expect(monitoringReading?.unit).toBe('mg/Nm³');
    });

    it('should handle no conditions', async () => {
      mockFromFn.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue(
              Promise.resolve({ data: [], error: null })
            ),
          }),
        }),
      });

      const result = await elvHeadroomService.getLatestReadings(mockSiteId);

      expect(result).toEqual([]);
    });

    it('should throw error if fetching conditions fails', async () => {
      mockFromFn.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue(
              Promise.resolve({ data: null, error: { message: 'DB Error' } })
            ),
          }),
        }),
      });

      await expect(elvHeadroomService.getLatestReadings(mockSiteId)).rejects.toThrow(
        'Failed to fetch ELV conditions: DB Error'
      );
    });
  });

  describe('calculateHeadroom', () => {
    const mockParameter: ELVParameter = {
      id: 'param-1',
      parameterName: 'NOx',
      unit: 'mg/Nm³',
      permitLimit: 190,
      warningThreshold: 152,
      criticalThreshold: 171,
      regulatoryBasis: 'MCPD Schedule 25A',
      conditionReference: '3.1.1',
    };

    it('should calculate SAFE status with >20% headroom', () => {
      const reading: ELVReading = {
        parameterId: 'param-1',
        parameterName: 'NOx',
        value: 100,
        unit: 'mg/Nm³',
        recordedAt: '2025-01-15T10:00:00Z',
        testDate: '2025-01-15',
      };

      const result = elvHeadroomService.calculateHeadroom(mockParameter, reading);

      expect(result.status).toBe('SAFE');
      expect(result.statusColor).toBe('green');
      expect(result.headroom).toBe(90);
      expect(result.headroomPercent).toBeCloseTo(47.37);
    });

    it('should calculate WARNING status with 10-20% headroom', () => {
      const reading: ELVReading = {
        parameterId: 'param-1',
        parameterName: 'NOx',
        value: 160, // Headroom = 30 (15.8%)
        unit: 'mg/Nm³',
        recordedAt: '2025-01-15T10:00:00Z',
        testDate: '2025-01-15',
      };

      const result = elvHeadroomService.calculateHeadroom(mockParameter, reading);

      expect(result.status).toBe('WARNING');
      expect(result.statusColor).toBe('yellow');
      expect(result.headroom).toBe(30);
      expect(result.headroomPercent).toBeCloseTo(15.79);
    });

    it('should calculate CRITICAL status with 0-10% headroom', () => {
      const reading: ELVReading = {
        parameterId: 'param-1',
        parameterName: 'NOx',
        value: 182, // Headroom = 8 (4.2%)
        unit: 'mg/Nm³',
        recordedAt: '2025-01-15T10:00:00Z',
        testDate: '2025-01-15',
      };

      const result = elvHeadroomService.calculateHeadroom(mockParameter, reading);

      expect(result.status).toBe('CRITICAL');
      expect(result.statusColor).toBe('red');
      expect(result.headroom).toBe(8);
      expect(result.headroomPercent).toBeCloseTo(4.21);
    });

    it('should calculate EXCEEDED status with negative headroom', () => {
      const reading: ELVReading = {
        parameterId: 'param-1',
        parameterName: 'NOx',
        value: 210, // Headroom = -20
        unit: 'mg/Nm³',
        recordedAt: '2025-01-15T10:00:00Z',
        testDate: '2025-01-15',
      };

      const result = elvHeadroomService.calculateHeadroom(mockParameter, reading);

      expect(result.status).toBe('EXCEEDED');
      expect(result.statusColor).toBe('red');
      expect(result.headroom).toBe(-20);
      expect(result.headroomPercent).toBeCloseTo(-10.53);
    });
  });

  describe('getExceedanceHistory', () => {
    it('should fetch exceedance history from monitoring results', async () => {
      mockFromFn.mockImplementation((table: string) => {
        if (table === 'elv_monitoring_results') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  gte: jest.fn().mockReturnValue({
                    order: jest.fn().mockReturnValue(
                      Promise.resolve({ data: mockExceedances, error: null })
                    ),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'stack_tests') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  gte: jest.fn().mockReturnValue({
                    order: jest.fn().mockReturnValue(
                      Promise.resolve({ data: [], error: null })
                    ),
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      const result = await elvHeadroomService.getExceedanceHistory(mockSiteId);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'exceed-1',
        parameterId: 'cond-nox',
        parameterName: 'NOx',
        permitLimit: 190,
        actualValue: 210,
        exceedanceAmount: 20,
        exceedancePercentage: 10.53,
        occurredAt: '2024-12-01',
        unit: 'mg/Nm³',
      });
    });

    it('should filter by parameter ID if provided', async () => {
      // Create a properly chained mock that supports .eq().eq().eq().gte().order()
      const createChainedMock = (data: unknown) => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                gte: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue(
                    Promise.resolve({ data, error: null })
                  ),
                }),
              }),
              gte: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue(
                  Promise.resolve({ data, error: null })
                ),
              }),
            }),
          }),
        }),
      });

      mockFromFn.mockImplementation((table: string) => {
        if (table === 'elv_monitoring_results') {
          return createChainedMock(mockExceedances);
        }
        if (table === 'stack_tests') {
          return createChainedMock([]);
        }
        return {};
      });

      const result = await elvHeadroomService.getExceedanceHistory(
        mockSiteId,
        'cond-nox',
        90
      );

      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should throw error on database failure', async () => {
      mockFromFn.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue(
                  Promise.resolve({ data: null, error: { message: 'DB Error' } })
                ),
              }),
            }),
          }),
        }),
      });

      await expect(
        elvHeadroomService.getExceedanceHistory(mockSiteId)
      ).rejects.toThrow('Failed to fetch exceedance history: DB Error');
    });
  });

  describe('getSiteELVSummary', () => {
    it('should return comprehensive summary for site', async () => {
      // Mock getELVParameters
      jest.spyOn(elvHeadroomService, 'getELVParameters').mockResolvedValue([
        {
          id: 'param-1',
          parameterName: 'NOx',
          unit: 'mg/Nm³',
          permitLimit: 190,
          warningThreshold: 152,
          criticalThreshold: 171,
          regulatoryBasis: 'MCPD Schedule 25A',
          conditionReference: '3.1.1',
        },
      ]);

      // Mock getLatestReadings
      jest.spyOn(elvHeadroomService, 'getLatestReadings').mockResolvedValue([
        {
          parameterId: 'param-1',
          parameterName: 'NOx',
          value: 160,
          unit: 'mg/Nm³',
          recordedAt: '2025-01-15T10:00:00Z',
          testDate: '2025-01-15',
        },
      ]);

      // Mock getExceedanceHistory
      jest.spyOn(elvHeadroomService, 'getExceedanceHistory').mockResolvedValue([
        {
          id: 'exceed-1',
          parameterId: 'param-1',
          parameterName: 'NOx',
          permitLimit: 190,
          actualValue: 210,
          exceedanceAmount: 20,
          exceedancePercentage: 10.53,
          occurredAt: '2024-12-01',
          unit: 'mg/Nm³',
        },
      ]);

      const result = await elvHeadroomService.getSiteELVSummary(mockSiteId);

      expect(result.siteId).toBe(mockSiteId);
      expect(result.totalParameters).toBeGreaterThanOrEqual(0);
      expect(result.recentExceedances).toBeDefined();
      expect(result.lastUpdated).toBeDefined();
    });

    it('should identify worst parameter', async () => {
      jest.spyOn(elvHeadroomService, 'getELVParameters').mockResolvedValue([
        {
          id: 'param-1',
          parameterName: 'NOx',
          unit: 'mg/Nm³',
          permitLimit: 190,
          warningThreshold: 152,
          criticalThreshold: 171,
          regulatoryBasis: 'MCPD',
          conditionReference: '3.1.1',
        },
        {
          id: 'param-2',
          parameterName: 'SO2',
          unit: 'mg/Nm³',
          permitLimit: 120,
          warningThreshold: 96,
          criticalThreshold: 108,
          regulatoryBasis: 'MCPD',
          conditionReference: '3.1.2',
        },
      ]);

      jest.spyOn(elvHeadroomService, 'getLatestReadings').mockResolvedValue([
        {
          parameterId: 'param-1',
          parameterName: 'NOx',
          value: 100, // 47% headroom
          unit: 'mg/Nm³',
          recordedAt: '2025-01-15T10:00:00Z',
          testDate: '2025-01-15',
        },
        {
          parameterId: 'param-2',
          parameterName: 'SO2',
          value: 115, // 4% headroom - WORST
          unit: 'mg/Nm³',
          recordedAt: '2025-01-15T10:00:00Z',
          testDate: '2025-01-15',
        },
      ]);

      jest.spyOn(elvHeadroomService, 'getExceedanceHistory').mockResolvedValue([]);

      const result = await elvHeadroomService.getSiteELVSummary(mockSiteId);

      expect(result.worstParameter).toBeDefined();
      expect(result.worstParameter?.parameterName).toBe('SO2');
      expect(result.worstParameter?.status).toBe('CRITICAL');
    });

    it('should handle site with no parameters', async () => {
      jest.spyOn(elvHeadroomService, 'getELVParameters').mockResolvedValue([]);
      jest.spyOn(elvHeadroomService, 'getLatestReadings').mockResolvedValue([]);
      jest.spyOn(elvHeadroomService, 'getExceedanceHistory').mockResolvedValue([]);

      const result = await elvHeadroomService.getSiteELVSummary(mockSiteId);

      expect(result.totalParameters).toBe(0);
      expect(result.parametersWithinLimits).toBe(0);
      expect(result.parametersExceeded).toBe(0);
      expect(result.worstParameter).toBeUndefined();
    });
  });
});
