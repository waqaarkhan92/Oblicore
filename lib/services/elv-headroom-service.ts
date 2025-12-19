/**
 * ELV Headroom Service
 * Calculates headroom between actual emissions and permit limits for Module 3 (MCPD/Generators)
 * Phase 2.3 Implementation
 *
 * This service calculates the difference (headroom) between actual emission readings
 * and the permit-defined ELV (Emission Limit Value) limits, providing early warning
 * of potential breaches.
 */

import { supabaseAdmin } from '@/lib/supabase/server';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ELVParameter {
  id: string;
  parameterName: string; // e.g., "NOx", "SO2", "CO", "Particulates"
  unit: string; // e.g., "mg/Nm³"
  permitLimit: number;
  warningThreshold: number; // typically 80% of limit
  criticalThreshold: number; // typically 90% of limit
  regulatoryBasis: string; // e.g., "MCPD Schedule 25A"
  conditionReference: string;
  averagingPeriod?: string;
  referenceConditions?: string;
}

export interface ELVReading {
  parameterId: string;
  parameterName: string;
  value: number;
  unit: string;
  recordedAt: string;
  generatorId?: string;
  generatorName?: string;
  testDate: string;
}

export interface HeadroomResult {
  parameterId: string;
  parameterName: string;
  actualValue: number;
  permitLimit: number;
  headroom: number; // permitLimit - actualValue
  headroomPercent: number; // (headroom / permitLimit) * 100
  status: 'SAFE' | 'WARNING' | 'CRITICAL' | 'EXCEEDED';
  statusColor: 'green' | 'yellow' | 'red';
  unit: string;
  lastTestedAt: string;
  generatorId?: string;
  generatorName?: string;
}

export interface Exceedance {
  id: string;
  parameterId: string;
  parameterName: string;
  permitLimit: number;
  actualValue: number;
  exceedanceAmount: number;
  exceedancePercentage: number;
  occurredAt: string;
  resolvedAt?: string;
  generatorId?: string;
  generatorName?: string;
  unit: string;
}

export interface ELVSummary {
  siteId: string;
  parameters: HeadroomResult[];
  totalParameters: number;
  parametersWithinLimits: number;
  parametersExceeded: number;
  worstParameter?: HeadroomResult;
  recentExceedances: Exceedance[];
  lastUpdated: string;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class ELVHeadroomService {
  /**
   * Get all ELV parameters with limits for a site
   * Fetches from elv_conditions table which contains permit-verbatim ELV values
   */
  async getELVParameters(siteId: string): Promise<ELVParameter[]> {
    const { data, error } = await supabaseAdmin
      .from('elv_conditions')
      .select(`
        id,
        elv_parameter,
        elv_value,
        elv_unit,
        elv_reference_conditions,
        elv_averaging_period,
        condition_reference,
        elv_verbatim_text
      `)
      .eq('site_id', siteId)
      .is('deleted_at', null)
      .order('elv_parameter');

    if (error) {
      throw new Error(`Failed to fetch ELV parameters: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Map to ELVParameter interface with thresholds
    return data.map(param => {
      const permitLimit = Number(param.elv_value);
      return {
        id: param.id,
        parameterName: param.elv_parameter,
        unit: param.elv_unit,
        permitLimit: permitLimit,
        warningThreshold: permitLimit * 0.8, // 80% of limit
        criticalThreshold: permitLimit * 0.9, // 90% of limit
        regulatoryBasis: this.extractRegulatoryBasis(param.elv_verbatim_text || ''),
        conditionReference: param.condition_reference,
        averagingPeriod: param.elv_averaging_period || undefined,
        referenceConditions: param.elv_reference_conditions || undefined,
      };
    });
  }

  /**
   * Get most recent readings for each parameter at a site
   * Uses elv_monitoring_results which contains actual test results
   */
  async getLatestReadings(siteId: string): Promise<ELVReading[]> {
    // Get all ELV conditions for the site
    const { data: conditions, error: condError } = await supabaseAdmin
      .from('elv_conditions')
      .select('id, elv_parameter, elv_unit')
      .eq('site_id', siteId)
      .is('deleted_at', null);

    if (condError) {
      throw new Error(`Failed to fetch ELV conditions: ${condError.message}`);
    }

    if (!conditions || conditions.length === 0) {
      return [];
    }

    const readings: ELVReading[] = [];

    // For each condition, get the most recent monitoring result
    for (const condition of conditions) {
      const { data: results, error: resultError } = await supabaseAdmin
        .from('elv_monitoring_results')
        .select(`
          id,
          elv_condition_id,
          test_date,
          measured_value,
          measured_unit,
          created_at
        `)
        .eq('elv_condition_id', condition.id)
        .order('test_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1);

      if (resultError) {
        console.error(`Failed to fetch results for condition ${condition.id}:`, resultError);
        continue;
      }

      if (results && results.length > 0) {
        const result = results[0];
        readings.push({
          parameterId: condition.id,
          parameterName: condition.elv_parameter,
          value: Number(result.measured_value),
          unit: result.measured_unit,
          recordedAt: result.created_at,
          testDate: result.test_date,
        });
      }
    }

    // Also get readings from stack_tests for generators
    const { data: stackTests, error: stackError } = await supabaseAdmin
      .from('stack_tests')
      .select(`
        id,
        generator_id,
        test_date,
        nox_result,
        so2_result,
        co_result,
        particulates_result,
        created_at,
        generators!inner(
          id,
          generator_identifier,
          document_id,
          documents!inner(
            site_id
          )
        )
      `)
      .eq('generators.documents.site_id', siteId)
      .order('test_date', { ascending: false })
      .limit(10);

    if (!stackError && stackTests && stackTests.length > 0) {
      // Group by generator and get latest for each
      const latestByGenerator = new Map<string, any>();
      for (const test of stackTests) {
        const genId = test.generator_id;
        if (!latestByGenerator.has(genId)) {
          latestByGenerator.set(genId, test);
        }
      }

      // Add stack test results to readings
      for (const [genId, test] of Array.from(latestByGenerator.entries())) {
        const generator = Array.isArray(test.generators) ? test.generators[0] : test.generators;
        const generatorName = generator?.generator_identifier || 'Unknown';

        // Add NOx reading if present
        if (test.nox_result !== null) {
          readings.push({
            parameterId: `stack_test_${genId}_nox`,
            parameterName: 'NOx',
            value: Number(test.nox_result),
            unit: 'mg/Nm³',
            recordedAt: test.created_at,
            testDate: test.test_date,
            generatorId: genId,
            generatorName: generatorName,
          });
        }

        // Add SO2 reading if present
        if (test.so2_result !== null) {
          readings.push({
            parameterId: `stack_test_${genId}_so2`,
            parameterName: 'SO2',
            value: Number(test.so2_result),
            unit: 'mg/Nm³',
            recordedAt: test.created_at,
            testDate: test.test_date,
            generatorId: genId,
            generatorName: generatorName,
          });
        }

        // Add CO reading if present
        if (test.co_result !== null) {
          readings.push({
            parameterId: `stack_test_${genId}_co`,
            parameterName: 'CO',
            value: Number(test.co_result),
            unit: 'mg/Nm³',
            recordedAt: test.created_at,
            testDate: test.test_date,
            generatorId: genId,
            generatorName: generatorName,
          });
        }

        // Add Particulates reading if present
        if (test.particulates_result !== null) {
          readings.push({
            parameterId: `stack_test_${genId}_particulates`,
            parameterName: 'Particulates',
            value: Number(test.particulates_result),
            unit: 'mg/Nm³',
            recordedAt: test.created_at,
            testDate: test.test_date,
            generatorId: genId,
            generatorName: generatorName,
          });
        }
      }
    }

    return readings;
  }

  /**
   * Calculate headroom (limit - actual) for a parameter and reading
   */
  calculateHeadroom(parameter: ELVParameter, reading: ELVReading): HeadroomResult {
    const headroom = parameter.permitLimit - reading.value;
    const headroomPercent = (headroom / parameter.permitLimit) * 100;

    // Determine status based on thresholds
    let status: 'SAFE' | 'WARNING' | 'CRITICAL' | 'EXCEEDED';
    let statusColor: 'green' | 'yellow' | 'red';

    if (headroom < 0) {
      // Exceeded limit
      status = 'EXCEEDED';
      statusColor = 'red';
    } else if (headroom <= parameter.permitLimit * 0.1) {
      // Within 10% of limit
      status = 'CRITICAL';
      statusColor = 'red';
    } else if (headroom <= parameter.permitLimit * 0.2) {
      // Within 20% of limit
      status = 'WARNING';
      statusColor = 'yellow';
    } else {
      // More than 20% headroom
      status = 'SAFE';
      statusColor = 'green';
    }

    return {
      parameterId: parameter.id,
      parameterName: parameter.parameterName,
      actualValue: reading.value,
      permitLimit: parameter.permitLimit,
      headroom: headroom,
      headroomPercent: headroomPercent,
      status: status,
      statusColor: statusColor,
      unit: parameter.unit,
      lastTestedAt: reading.testDate,
      generatorId: reading.generatorId,
      generatorName: reading.generatorName,
    };
  }

  /**
   * Get past breaches/exceedances for a site
   */
  async getExceedanceHistory(
    siteId: string,
    parameterId?: string,
    days: number = 90
  ): Promise<Exceedance[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let query = supabaseAdmin
      .from('elv_monitoring_results')
      .select(`
        id,
        elv_condition_id,
        test_date,
        measured_value,
        measured_unit,
        permit_limit,
        is_compliant,
        exceedance_value,
        exceedance_percentage,
        created_at,
        elv_conditions!inner(
          id,
          elv_parameter,
          site_id
        )
      `)
      .eq('elv_conditions.site_id', siteId)
      .eq('is_compliant', false)
      .gte('test_date', startDate.toISOString().split('T')[0])
      .order('test_date', { ascending: false });

    if (parameterId) {
      query = query.eq('elv_condition_id', parameterId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch exceedance history: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    const exceedances: Exceedance[] = data.map(result => {
      const condition = Array.isArray(result.elv_conditions)
        ? result.elv_conditions[0]
        : result.elv_conditions;

      return {
        id: result.id,
        parameterId: result.elv_condition_id,
        parameterName: condition?.elv_parameter || 'Unknown',
        permitLimit: Number(result.permit_limit),
        actualValue: Number(result.measured_value),
        exceedanceAmount: Number(result.exceedance_value || 0),
        exceedancePercentage: Number(result.exceedance_percentage || 0),
        occurredAt: result.test_date,
        unit: result.measured_unit,
      };
    });

    // Also get exceedances from stack_tests
    const { data: stackTests, error: stackError } = await supabaseAdmin
      .from('stack_tests')
      .select(`
        id,
        generator_id,
        test_date,
        nox_result,
        so2_result,
        co_result,
        particulates_result,
        compliance_status,
        exceedances_found,
        exceedance_details,
        created_at,
        generators!inner(
          id,
          generator_identifier,
          emissions_nox,
          emissions_so2,
          emissions_co,
          emissions_particulates,
          document_id,
          documents!inner(
            site_id
          )
        )
      `)
      .eq('generators.documents.site_id', siteId)
      .eq('exceedances_found', true)
      .gte('test_date', startDate.toISOString().split('T')[0])
      .order('test_date', { ascending: false });

    if (!stackError && stackTests && stackTests.length > 0) {
      for (const test of stackTests) {
        const generator = Array.isArray(test.generators) ? test.generators[0] : test.generators;
        const generatorName = generator?.generator_identifier || 'Unknown';

        // Check each parameter for exceedances
        if (test.nox_result !== null && generator?.emissions_nox) {
          const limit = Number(generator.emissions_nox);
          const actual = Number(test.nox_result);
          if (actual > limit) {
            exceedances.push({
              id: `stack_test_${test.id}_nox`,
              parameterId: `stack_test_${test.generator_id}_nox`,
              parameterName: 'NOx',
              permitLimit: limit,
              actualValue: actual,
              exceedanceAmount: actual - limit,
              exceedancePercentage: ((actual - limit) / limit) * 100,
              occurredAt: test.test_date,
              generatorId: test.generator_id,
              generatorName: generatorName,
              unit: 'mg/Nm³',
            });
          }
        }

        if (test.so2_result !== null && generator?.emissions_so2) {
          const limit = Number(generator.emissions_so2);
          const actual = Number(test.so2_result);
          if (actual > limit) {
            exceedances.push({
              id: `stack_test_${test.id}_so2`,
              parameterId: `stack_test_${test.generator_id}_so2`,
              parameterName: 'SO2',
              permitLimit: limit,
              actualValue: actual,
              exceedanceAmount: actual - limit,
              exceedancePercentage: ((actual - limit) / limit) * 100,
              occurredAt: test.test_date,
              generatorId: test.generator_id,
              generatorName: generatorName,
              unit: 'mg/Nm³',
            });
          }
        }

        if (test.co_result !== null && generator?.emissions_co) {
          const limit = Number(generator.emissions_co);
          const actual = Number(test.co_result);
          if (actual > limit) {
            exceedances.push({
              id: `stack_test_${test.id}_co`,
              parameterId: `stack_test_${test.generator_id}_co`,
              parameterName: 'CO',
              permitLimit: limit,
              actualValue: actual,
              exceedanceAmount: actual - limit,
              exceedancePercentage: ((actual - limit) / limit) * 100,
              occurredAt: test.test_date,
              generatorId: test.generator_id,
              generatorName: generatorName,
              unit: 'mg/Nm³',
            });
          }
        }

        if (test.particulates_result !== null && generator?.emissions_particulates) {
          const limit = Number(generator.emissions_particulates);
          const actual = Number(test.particulates_result);
          if (actual > limit) {
            exceedances.push({
              id: `stack_test_${test.id}_particulates`,
              parameterId: `stack_test_${test.generator_id}_particulates`,
              parameterName: 'Particulates',
              permitLimit: limit,
              actualValue: actual,
              exceedanceAmount: actual - limit,
              exceedancePercentage: ((actual - limit) / limit) * 100,
              occurredAt: test.test_date,
              generatorId: test.generator_id,
              generatorName: generatorName,
              unit: 'mg/Nm³',
            });
          }
        }
      }
    }

    // Sort by date descending
    exceedances.sort((a, b) => {
      return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
    });

    return exceedances;
  }

  /**
   * Get full ELV summary for a site (for dashboard/pack)
   */
  async getSiteELVSummary(siteId: string): Promise<ELVSummary> {
    // Get all parameters and readings
    const [parameters, readings, exceedances] = await Promise.all([
      this.getELVParameters(siteId),
      this.getLatestReadings(siteId),
      this.getExceedanceHistory(siteId, undefined, 90),
    ]);

    // Match readings to parameters and calculate headroom
    const headroomResults: HeadroomResult[] = [];
    const readingMap = new Map<string, ELVReading>();

    // Create a map of readings by parameter name for easier matching
    for (const reading of readings) {
      const key = reading.generatorId
        ? `${reading.parameterName}_${reading.generatorId}`
        : reading.parameterName;

      // Keep the most recent reading for each parameter/generator combo
      const existing = readingMap.get(key);
      if (!existing || new Date(reading.testDate) > new Date(existing.testDate)) {
        readingMap.set(key, reading);
      }
    }

    // Calculate headroom for each parameter that has a reading
    for (const parameter of parameters) {
      // Try to find a matching reading
      const reading = readingMap.get(parameter.parameterName);

      if (reading && reading.parameterId === parameter.id) {
        const headroom = this.calculateHeadroom(parameter, reading);
        headroomResults.push(headroom);
      }
    }

    // Also match stack test readings to generator emission limits
    for (const reading of readings) {
      if (reading.generatorId && reading.generatorId.startsWith('stack_test_')) {
        // This is a stack test reading, we need to get the generator's limits
        const genId = reading.generatorId.replace('stack_test_', '').split('_')[0];

        // For now, use standard MCPD limits as we don't have generator-specific limits in parameters
        // In production, this would need to be linked to the actual permit conditions
        const standardLimits: Record<string, number> = {
          'NOx': 190,
          'SO2': 120,
          'CO': 100,
          'Particulates': 30,
        };

        const limit = standardLimits[reading.parameterName];
        if (limit) {
          const syntheticParameter: ELVParameter = {
            id: reading.parameterId,
            parameterName: reading.parameterName,
            unit: reading.unit,
            permitLimit: limit,
            warningThreshold: limit * 0.8,
            criticalThreshold: limit * 0.9,
            regulatoryBasis: 'MCPD Schedule 25A',
            conditionReference: 'Generator Stack Test',
          };

          const headroom = this.calculateHeadroom(syntheticParameter, reading);
          headroomResults.push(headroom);
        }
      }
    }

    // Calculate summary statistics
    const totalParameters = headroomResults.length;
    const parametersWithinLimits = headroomResults.filter(r => r.status !== 'EXCEEDED').length;
    const parametersExceeded = headroomResults.filter(r => r.status === 'EXCEEDED').length;

    // Find worst parameter (lowest headroom percentage)
    let worstParameter: HeadroomResult | undefined = undefined;
    let lowestHeadroom = Infinity;
    for (const result of headroomResults) {
      if (result.headroomPercent < lowestHeadroom) {
        lowestHeadroom = result.headroomPercent;
        worstParameter = result;
      }
    }

    return {
      siteId: siteId,
      parameters: headroomResults,
      totalParameters: totalParameters,
      parametersWithinLimits: parametersWithinLimits,
      parametersExceeded: parametersExceeded,
      worstParameter: worstParameter,
      recentExceedances: exceedances.slice(0, 10), // Last 10 exceedances
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Helper: Extract regulatory basis from verbatim text
   */
  private extractRegulatoryBasis(verbatimText: string): string {
    // Try to extract regulatory basis from common patterns
    const patterns = [
      /Schedule\s+\d+[A-Z]?/i,
      /Table\s+\d+\.\d+/i,
      /Condition\s+\d+\.\d+/i,
      /MCPD/i,
      /IED/i,
    ];

    for (const pattern of patterns) {
      const match = verbatimText.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return 'Permit Condition';
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const elvHeadroomService = new ELVHeadroomService();
