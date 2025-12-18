/**
 * Emission Calculation Service
 * Calculates emissions from fuel consumption data for generators
 * Supports UK regulatory requirements including MCPD and Specified Generator regulations
 */

import { supabaseAdmin } from '@/lib/supabase/server';

// Emission factors (kg per unit fuel)
// Based on UK Government GHG Conversion Factors 2024
const EMISSION_FACTORS: Record<string, Record<string, number>> = {
  // Diesel/Gas Oil (kg per litre)
  DIESEL: {
    CO2: 2.68, // kg CO2 per litre
    NOX: 0.0088, // kg NOx per litre (typical diesel generator)
    SO2: 0.00026, // kg SO2 per litre (assuming 10ppm sulphur)
    CO: 0.0025, // kg CO per litre
    PM: 0.00035, // kg particulates per litre
  },
  GAS_OIL: {
    CO2: 2.68,
    NOX: 0.0088,
    SO2: 0.00026,
    CO: 0.0025,
    PM: 0.00035,
  },
  // Natural Gas (kg per cubic metre)
  NATURAL_GAS: {
    CO2: 2.02, // kg CO2 per m³
    NOX: 0.0018, // kg NOx per m³ (gas engines)
    SO2: 0.000005, // negligible sulphur
    CO: 0.0008, // kg CO per m³
    PM: 0.00001, // very low particulates
  },
  // LPG/Propane (kg per kg)
  LPG: {
    CO2: 2.94, // kg CO2 per kg LPG
    NOX: 0.0035,
    SO2: 0.000005,
    CO: 0.001,
    PM: 0.00005,
  },
  // Heavy Fuel Oil (kg per litre)
  HFO: {
    CO2: 3.17,
    NOX: 0.015,
    SO2: 0.0052, // higher sulphur content
    CO: 0.003,
    PM: 0.0008,
  },
};

// Unit conversion factors to standard units
const UNIT_CONVERSIONS: Record<string, Record<string, number>> = {
  LITRES: { LITRES: 1, CUBIC_METRES: 0.001, TONNES: 0.00084, KILOGRAMS: 0.84 },
  CUBIC_METRES: { LITRES: 1000, CUBIC_METRES: 1, TONNES: 0.84, KILOGRAMS: 840 },
  TONNES: { LITRES: 1190, CUBIC_METRES: 1.19, TONNES: 1, KILOGRAMS: 1000 },
  KILOGRAMS: { LITRES: 1.19, CUBIC_METRES: 0.00119, TONNES: 0.001, KILOGRAMS: 1 },
  MEGAWATT_HOURS: { MEGAWATT_HOURS: 1 }, // Electrical output, needs separate handling
};

// Regulatory thresholds (mg/Nm³ at reference conditions)
const REGULATORY_LIMITS = {
  MCPD_1_5MW: {
    NOX: 190, // mg/Nm³ for existing medium combustion plants 1-5MW
    SO2: 120,
    PM: 30,
  },
  MCPD_5_50MW: {
    NOX: 150, // mg/Nm³ for existing medium combustion plants 5-50MW
    SO2: 120,
    PM: 25,
  },
  SPECIFIED_GENERATOR: {
    NOX: 190,
    SO2: 400, // Temporary Operating Reserve generators
    PM: 30,
  },
};

export interface EmissionCalculationResult {
  generator_id: string;
  calculation_date: string;
  period_start: string;
  period_end: string;
  fuel_type: string;
  fuel_quantity: number;
  fuel_unit: string;
  emissions: {
    CO2_kg: number;
    NOX_kg: number;
    SO2_kg: number;
    CO_kg: number;
    PM_kg: number;
  };
  emissions_tonnes: {
    CO2: number;
    NOX: number;
    SO2: number;
    CO: number;
    PM: number;
  };
  regulatory_status: {
    compliant: boolean;
    exceedances: string[];
    warnings: string[];
  };
}

export interface AnnualEmissionsSummary {
  company_id: string;
  site_id?: string;
  year: number;
  total_emissions: {
    CO2_tonnes: number;
    NOX_tonnes: number;
    SO2_tonnes: number;
    CO_tonnes: number;
    PM_tonnes: number;
  };
  by_generator: Array<{
    generator_id: string;
    generator_identifier: string;
    emissions: {
      CO2_tonnes: number;
      NOX_tonnes: number;
      SO2_tonnes: number;
      CO_tonnes: number;
      PM_tonnes: number;
    };
    total_run_hours: number;
    total_fuel: number;
    fuel_unit: string;
  }>;
  by_fuel_type: Array<{
    fuel_type: string;
    quantity: number;
    unit: string;
    emissions: {
      CO2_tonnes: number;
      NOX_tonnes: number;
    };
  }>;
}

/**
 * Calculate emissions from fuel usage for a specific generator
 */
export async function calculateGeneratorEmissions(
  generatorId: string,
  periodStart: string,
  periodEnd: string
): Promise<EmissionCalculationResult | null> {
  // Get generator details
  const { data: generator, error: genError } = await supabaseAdmin
    .from('generators')
    .select('id, generator_identifier, generator_type, capacity_mw, company_id')
    .eq('id', generatorId)
    .single();

  if (genError || !generator) {
    console.error('Generator not found:', genError);
    return null;
  }

  // Get fuel usage for the period
  const { data: fuelLogs, error: fuelError } = await supabaseAdmin
    .from('fuel_usage_logs')
    .select('id, fuel_type, quantity, unit, sulphur_content_percent, log_date')
    .eq('generator_id', generatorId)
    .gte('log_date', periodStart)
    .lte('log_date', periodEnd);

  if (fuelError) {
    console.error('Failed to fetch fuel logs:', fuelError);
    return null;
  }

  if (!fuelLogs || fuelLogs.length === 0) {
    return {
      generator_id: generatorId,
      calculation_date: new Date().toISOString(),
      period_start: periodStart,
      period_end: periodEnd,
      fuel_type: 'NONE',
      fuel_quantity: 0,
      fuel_unit: 'LITRES',
      emissions: { CO2_kg: 0, NOX_kg: 0, SO2_kg: 0, CO_kg: 0, PM_kg: 0 },
      emissions_tonnes: { CO2: 0, NOX: 0, SO2: 0, CO: 0, PM: 0 },
      regulatory_status: { compliant: true, exceedances: [], warnings: [] },
    };
  }

  // Calculate emissions for each fuel log
  let totalEmissions = {
    CO2_kg: 0,
    NOX_kg: 0,
    SO2_kg: 0,
    CO_kg: 0,
    PM_kg: 0,
  };

  let totalFuelQuantity = 0;
  const primaryFuelType = fuelLogs[0]?.fuel_type || 'DIESEL';
  const primaryFuelUnit = fuelLogs[0]?.unit || 'LITRES';

  for (const log of fuelLogs) {
    const fuelType = log.fuel_type || 'DIESEL';
    const factors = EMISSION_FACTORS[fuelType] || EMISSION_FACTORS.DIESEL;

    // Convert quantity to standard unit for the fuel type
    let quantity = log.quantity || 0;
    const unit = log.unit || 'LITRES';

    // For gas, we need m³; for liquids, litres; for solids, kg
    if (fuelType === 'NATURAL_GAS') {
      // Convert to m³
      if (unit === 'LITRES') quantity = quantity / 1000;
      else if (unit === 'KILOGRAMS') quantity = quantity / 0.7; // approximate density
    } else if (fuelType === 'LPG') {
      // LPG factors are per kg
      if (unit === 'LITRES') quantity = quantity * 0.51; // LPG density ~0.51 kg/L
    }

    totalFuelQuantity += log.quantity || 0;

    // Calculate emissions
    totalEmissions.CO2_kg += quantity * factors.CO2;
    totalEmissions.NOX_kg += quantity * factors.NOX;

    // Adjust SO2 based on actual sulphur content if available
    if (log.sulphur_content_percent) {
      // SO2 = 2 * sulphur content (stoichiometric)
      const sulphurFraction = log.sulphur_content_percent / 100;
      // Fuel density varies but ~0.84 kg/L for diesel
      const fuelMass = fuelType === 'LPG' ? quantity : quantity * 0.84;
      totalEmissions.SO2_kg += fuelMass * sulphurFraction * 2;
    } else {
      totalEmissions.SO2_kg += quantity * factors.SO2;
    }

    totalEmissions.CO_kg += quantity * factors.CO;
    totalEmissions.PM_kg += quantity * factors.PM;
  }

  // Convert to tonnes
  const emissions_tonnes = {
    CO2: totalEmissions.CO2_kg / 1000,
    NOX: totalEmissions.NOX_kg / 1000,
    SO2: totalEmissions.SO2_kg / 1000,
    CO: totalEmissions.CO_kg / 1000,
    PM: totalEmissions.PM_kg / 1000,
  };

  // Check regulatory compliance
  const regulatoryStatus = checkRegulatoryCompliance(
    generator.generator_type,
    totalEmissions,
    totalFuelQuantity
  );

  return {
    generator_id: generatorId,
    calculation_date: new Date().toISOString(),
    period_start: periodStart,
    period_end: periodEnd,
    fuel_type: primaryFuelType,
    fuel_quantity: totalFuelQuantity,
    fuel_unit: primaryFuelUnit,
    emissions: totalEmissions,
    emissions_tonnes,
    regulatory_status: regulatoryStatus,
  };
}

/**
 * Calculate annual emissions summary for a company or site
 */
export async function calculateAnnualEmissionsSummary(
  companyId: string,
  year: number,
  siteId?: string
): Promise<AnnualEmissionsSummary> {
  const periodStart = `${year}-01-01`;
  const periodEnd = `${year}-12-31`;

  // Get all generators for the company/site
  let generatorQuery = supabaseAdmin
    .from('generators')
    .select('id, generator_identifier, generator_type, company_id')
    .eq('company_id', companyId);

  const { data: generators, error: genError } = await generatorQuery;

  if (genError || !generators) {
    throw new Error(`Failed to fetch generators: ${genError?.message}`);
  }

  const byGenerator: AnnualEmissionsSummary['by_generator'] = [];
  const byFuelType = new Map<string, { quantity: number; unit: string; CO2: number; NOX: number }>();
  let totalEmissions = {
    CO2_tonnes: 0,
    NOX_tonnes: 0,
    SO2_tonnes: 0,
    CO_tonnes: 0,
    PM_tonnes: 0,
  };

  for (const generator of generators) {
    const result = await calculateGeneratorEmissions(generator.id, periodStart, periodEnd);
    if (!result) continue;

    byGenerator.push({
      generator_id: generator.id,
      generator_identifier: generator.generator_identifier,
      emissions: {
        CO2_tonnes: result.emissions_tonnes.CO2,
        NOX_tonnes: result.emissions_tonnes.NOX,
        SO2_tonnes: result.emissions_tonnes.SO2,
        CO_tonnes: result.emissions_tonnes.CO,
        PM_tonnes: result.emissions_tonnes.PM,
      },
      total_run_hours: 0, // Would need to fetch from run_hour_records
      total_fuel: result.fuel_quantity,
      fuel_unit: result.fuel_unit,
    });

    totalEmissions.CO2_tonnes += result.emissions_tonnes.CO2;
    totalEmissions.NOX_tonnes += result.emissions_tonnes.NOX;
    totalEmissions.SO2_tonnes += result.emissions_tonnes.SO2;
    totalEmissions.CO_tonnes += result.emissions_tonnes.CO;
    totalEmissions.PM_tonnes += result.emissions_tonnes.PM;

    // Aggregate by fuel type
    const fuelKey = result.fuel_type;
    const existing = byFuelType.get(fuelKey) || { quantity: 0, unit: result.fuel_unit, CO2: 0, NOX: 0 };
    existing.quantity += result.fuel_quantity;
    existing.CO2 += result.emissions_tonnes.CO2;
    existing.NOX += result.emissions_tonnes.NOX;
    byFuelType.set(fuelKey, existing);
  }

  return {
    company_id: companyId,
    site_id: siteId,
    year,
    total_emissions: totalEmissions,
    by_generator: byGenerator,
    by_fuel_type: Array.from(byFuelType.entries()).map(([fuel_type, data]) => ({
      fuel_type,
      quantity: data.quantity,
      unit: data.unit,
      emissions: {
        CO2_tonnes: data.CO2,
        NOX_tonnes: data.NOX,
      },
    })),
  };
}

/**
 * Check regulatory compliance based on generator type and emissions
 */
function checkRegulatoryCompliance(
  generatorType: string,
  emissions: { CO2_kg: number; NOX_kg: number; SO2_kg: number; CO_kg: number; PM_kg: number },
  fuelQuantity: number
): { compliant: boolean; exceedances: string[]; warnings: string[] } {
  const exceedances: string[] = [];
  const warnings: string[] = [];

  // Get applicable limits based on generator type
  let limits = REGULATORY_LIMITS.MCPD_1_5MW;
  if (generatorType === 'MCPD_5_50MW') {
    limits = REGULATORY_LIMITS.MCPD_5_50MW;
  } else if (generatorType === 'SPECIFIED_GENERATOR') {
    limits = REGULATORY_LIMITS.SPECIFIED_GENERATOR;
  }

  // Note: For proper compliance checking, we'd need stack test results
  // These calculations are indicative based on fuel consumption
  // Actual regulatory compliance requires measured concentrations

  if (fuelQuantity > 0) {
    // Rough estimates of concentration from total emissions
    // This is simplified - real calculations need exhaust flow rates
    const estimatedNOxConcentration = (emissions.NOX_kg / fuelQuantity) * 1000 * 50; // rough factor
    const estimatedSO2Concentration = (emissions.SO2_kg / fuelQuantity) * 1000 * 50;
    const estimatedPMConcentration = (emissions.PM_kg / fuelQuantity) * 1000 * 50;

    if (estimatedNOxConcentration > limits.NOX) {
      exceedances.push(`NOx estimated concentration may exceed limit of ${limits.NOX} mg/Nm³`);
    } else if (estimatedNOxConcentration > limits.NOX * 0.8) {
      warnings.push(`NOx approaching limit (>80% of ${limits.NOX} mg/Nm³)`);
    }

    if (estimatedSO2Concentration > limits.SO2) {
      exceedances.push(`SO2 estimated concentration may exceed limit of ${limits.SO2} mg/Nm³`);
    }

    if (estimatedPMConcentration > limits.PM) {
      exceedances.push(`Particulates estimated concentration may exceed limit of ${limits.PM} mg/Nm³`);
    }
  }

  return {
    compliant: exceedances.length === 0,
    exceedances,
    warnings,
  };
}

/**
 * Store emission calculation results
 */
export async function storeEmissionCalculation(result: EmissionCalculationResult): Promise<void> {
  const { error } = await supabaseAdmin.from('emission_calculations').upsert({
    generator_id: result.generator_id,
    calculation_date: result.calculation_date,
    period_start: result.period_start,
    period_end: result.period_end,
    fuel_type: result.fuel_type,
    fuel_quantity: result.fuel_quantity,
    fuel_unit: result.fuel_unit,
    co2_kg: result.emissions.CO2_kg,
    nox_kg: result.emissions.NOX_kg,
    so2_kg: result.emissions.SO2_kg,
    co_kg: result.emissions.CO_kg,
    pm_kg: result.emissions.PM_kg,
    regulatory_compliant: result.regulatory_status.compliant,
    exceedances: result.regulatory_status.exceedances,
    warnings: result.regulatory_status.warnings,
  }, {
    onConflict: 'generator_id,period_start,period_end',
  });

  if (error) {
    console.error('Failed to store emission calculation:', error);
  }
}
