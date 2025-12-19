# ELV Headroom Service

**Phase 2.3 Implementation - Module 3 (MCPD/Generators)**

## Overview

The ELV (Emission Limit Value) Headroom Service calculates the "headroom" between actual emissions and permit-defined limits for Module 3 generators. This service provides early warning of potential breaches by monitoring how close emissions are to regulatory limits.

## Purpose

- **Early Warning**: Identify parameters approaching their limits before breaches occur
- **Compliance Monitoring**: Track emission compliance across all generators at a site
- **Risk Management**: Prioritize corrective actions based on headroom status
- **Regulatory Reporting**: Generate ELV compliance sections for regulatory packs

## Key Concepts

### Headroom
The difference between the permit limit and the actual measured value:
```
Headroom = Permit Limit - Actual Value
Headroom % = (Headroom / Permit Limit) × 100
```

### Status Thresholds
- **SAFE** (Green): Headroom > 20% of limit
- **WARNING** (Yellow): Headroom 10-20% of limit
- **CRITICAL** (Red): Headroom 0-10% of limit
- **EXCEEDED** (Red, Bold): Headroom < 0 (breach)

## Database Schema

The service queries the following tables:

### Primary Tables
1. **`elv_conditions`** - Permit-defined ELV parameters and limits
   - Contains verbatim permit text (Safeguard 3)
   - Links to obligations and documents
   - Stores limits, units, reference conditions

2. **`elv_monitoring_results`** - Actual test results
   - Stack test measurements
   - Compliance calculations (auto-computed via trigger)
   - Evidence links

3. **`stack_tests`** - Generator-specific stack tests
   - NOx, SO2, CO, Particulates results
   - Compliance status per test
   - Generator references

4. **`generators`** - Generator information
   - Emission limits (from permit)
   - Current operational status
   - Links to documents/sites via document_id

## API Reference

### Class: `ELVHeadroomService`

#### `getELVParameters(siteId: string): Promise<ELVParameter[]>`

Fetches all ELV parameters with their permit-defined limits for a site.

**Parameters:**
- `siteId` - UUID of the site

**Returns:** Array of `ELVParameter` objects containing:
- `id` - Condition ID
- `parameterName` - e.g., "NOx", "SO2", "CO", "Particulates"
- `unit` - e.g., "mg/Nm³"
- `permitLimit` - Maximum allowed value
- `warningThreshold` - 80% of limit
- `criticalThreshold` - 90% of limit
- `regulatoryBasis` - e.g., "MCPD Schedule 25A"
- `conditionReference` - Permit condition number
- `averagingPeriod` - e.g., "Daily average"
- `referenceConditions` - e.g., "15% O2, dry"

**Example:**
```typescript
const parameters = await elvHeadroomService.getELVParameters('site-123');
console.log(parameters[0]);
// {
//   id: 'cond-abc',
//   parameterName: 'NOx',
//   unit: 'mg/Nm³',
//   permitLimit: 190,
//   warningThreshold: 152,
//   criticalThreshold: 171,
//   regulatoryBasis: 'MCPD Schedule 25A',
//   ...
// }
```

---

#### `getLatestReadings(siteId: string): Promise<ELVReading[]>`

Fetches the most recent emission readings for each parameter at a site.

**Parameters:**
- `siteId` - UUID of the site

**Returns:** Array of `ELVReading` objects containing:
- `parameterId` - Condition or parameter ID
- `parameterName` - e.g., "NOx"
- `value` - Measured value
- `unit` - Unit of measurement
- `recordedAt` - Timestamp when recorded
- `testDate` - Date of the test
- `generatorId` - (Optional) Generator UUID
- `generatorName` - (Optional) Generator identifier

**Data Sources:**
1. `elv_monitoring_results` - Latest result per condition
2. `stack_tests` - Latest test per generator (for NOx, SO2, CO, Particulates)

**Example:**
```typescript
const readings = await elvHeadroomService.getLatestReadings('site-123');
console.log(readings[0]);
// {
//   parameterId: 'cond-abc',
//   parameterName: 'NOx',
//   value: 150,
//   unit: 'mg/Nm³',
//   testDate: '2025-01-15',
//   generatorId: 'gen-xyz',
//   generatorName: 'GEN-001'
// }
```

---

#### `calculateHeadroom(parameter: ELVParameter, reading: ELVReading): HeadroomResult`

Calculates headroom and determines status for a parameter/reading pair.

**Parameters:**
- `parameter` - ELV parameter with permit limit
- `reading` - Actual measured value

**Returns:** `HeadroomResult` object containing:
- `parameterId` - Parameter ID
- `parameterName` - Parameter name
- `actualValue` - Measured value
- `permitLimit` - Permit limit
- `headroom` - Absolute headroom (limit - actual)
- `headroomPercent` - Percentage headroom
- `status` - SAFE | WARNING | CRITICAL | EXCEEDED
- `statusColor` - green | yellow | red
- `unit` - Unit of measurement
- `lastTestedAt` - Test date
- `generatorId` - (Optional) Generator ID
- `generatorName` - (Optional) Generator name

**Example:**
```typescript
const parameter = {
  id: 'param-1',
  parameterName: 'NOx',
  permitLimit: 190,
  unit: 'mg/Nm³',
  // ... other fields
};

const reading = {
  parameterId: 'param-1',
  parameterName: 'NOx',
  value: 160,
  unit: 'mg/Nm³',
  testDate: '2025-01-15',
  // ... other fields
};

const result = elvHeadroomService.calculateHeadroom(parameter, reading);
// {
//   headroom: 30,
//   headroomPercent: 15.79,
//   status: 'WARNING',
//   statusColor: 'yellow',
//   ...
// }
```

---

#### `getExceedanceHistory(siteId: string, parameterId?: string, days?: number): Promise<Exceedance[]>`

Fetches historical exceedances (breaches) for a site.

**Parameters:**
- `siteId` - UUID of the site
- `parameterId` - (Optional) Filter to specific parameter
- `days` - (Optional) Number of days to look back (default: 90)

**Returns:** Array of `Exceedance` objects containing:
- `id` - Exceedance ID
- `parameterId` - Parameter ID
- `parameterName` - Parameter name
- `permitLimit` - Permit limit that was exceeded
- `actualValue` - Measured value
- `exceedanceAmount` - Amount over limit (actual - limit)
- `exceedancePercentage` - Percentage over limit
- `occurredAt` - Date of exceedance
- `resolvedAt` - (Optional) When resolved
- `generatorId` - (Optional) Generator ID
- `generatorName` - (Optional) Generator name
- `unit` - Unit of measurement

**Example:**
```typescript
// Get all exceedances in last 90 days
const exceedances = await elvHeadroomService.getExceedanceHistory('site-123');

// Get NOx exceedances in last 30 days
const noxExceedances = await elvHeadroomService.getExceedanceHistory(
  'site-123',
  'param-nox',
  30
);
```

---

#### `getSiteELVSummary(siteId: string): Promise<ELVSummary>`

Gets comprehensive ELV summary for a site (dashboard/pack generation).

**Parameters:**
- `siteId` - UUID of the site

**Returns:** `ELVSummary` object containing:
- `siteId` - Site ID
- `parameters` - Array of `HeadroomResult` for all parameters
- `totalParameters` - Count of monitored parameters
- `parametersWithinLimits` - Count of compliant parameters
- `parametersExceeded` - Count of exceeded parameters
- `worstParameter` - Parameter with lowest headroom (optional)
- `recentExceedances` - Last 10 exceedances
- `lastUpdated` - Timestamp of summary generation

**Example:**
```typescript
const summary = await elvHeadroomService.getSiteELVSummary('site-123');

console.log(`Total Parameters: ${summary.totalParameters}`);
console.log(`Within Limits: ${summary.parametersWithinLimits}`);
console.log(`Exceeded: ${summary.parametersExceeded}`);

if (summary.worstParameter) {
  console.log(`Worst: ${summary.worstParameter.parameterName}`);
  console.log(`Headroom: ${summary.worstParameter.headroomPercent.toFixed(1)}%`);
}

summary.parameters.forEach(p => {
  console.log(`${p.parameterName}: ${p.status}`);
});
```

---

## Usage Examples

See `elv-headroom-service.example.ts` for complete usage examples including:

1. **Dashboard Integration** - Display ELV summary with status indicators
2. **Alert System** - Check for critical parameters and send notifications
3. **Chart Data** - Generate data for ELV headroom charts
4. **Pack Generation** - Create ELV compliance section for regulatory packs
5. **Trend Analysis** - Analyze exceedance trends over time
6. **API Routes** - Expose ELV data via REST endpoints
7. **Parameter Monitoring** - Monitor specific parameters in detail

## Integration Points

### Pack Generation Job
```typescript
// In lib/jobs/pack-generation-job.ts
import { elvHeadroomService } from '@/lib/services/elv-headroom-service';

async function generateModule3Section(siteId: string) {
  const elvSummary = await elvHeadroomService.getSiteELVSummary(siteId);

  // Add to pack data
  packData.module3 = {
    elvCompliance: elvSummary,
    // ... other module 3 data
  };
}
```

### Module 3 Dashboard
```typescript
// In app/dashboard/module3/page.tsx
import { elvHeadroomService } from '@/lib/services/elv-headroom-service';

export default async function Module3Dashboard({ siteId }) {
  const summary = await elvHeadroomService.getSiteELVSummary(siteId);

  return (
    <div>
      <ELVHeadroomChart data={summary.parameters} />
      <ExceedanceHistory exceedances={summary.recentExceedances} />
    </div>
  );
}
```

### Alert Job
```typescript
// In lib/jobs/elv-alert-job.ts
import { elvHeadroomService } from '@/lib/services/elv-headroom-service';

async function checkELVAlerts(siteId: string) {
  const summary = await elvHeadroomService.getSiteELVSummary(siteId);

  const criticalParams = summary.parameters.filter(
    p => p.status === 'CRITICAL' || p.status === 'EXCEEDED'
  );

  if (criticalParams.length > 0) {
    // Send alert notification
    await notificationService.sendELVAlert(siteId, criticalParams);
  }
}
```

## Testing

Comprehensive tests are available in:
```
tests/unit/lib/services/elv-headroom-service.test.ts
```

Run tests with:
```bash
npm test tests/unit/lib/services/elv-headroom-service.test.ts
```

## Phase 2.3 Checklist

- [x] Service implementation with all required methods
- [x] TypeScript type definitions
- [x] Database query integration (elv_conditions, elv_monitoring_results, stack_tests)
- [x] Status threshold calculations (SAFE, WARNING, CRITICAL, EXCEEDED)
- [x] Headroom calculations (absolute and percentage)
- [x] Exceedance history tracking
- [x] Comprehensive site summary
- [x] Unit tests (targeting 100% coverage)
- [x] Usage examples and documentation
- [x] Singleton export pattern

## Next Steps (Phase 2.4+)

1. **Dashboard Components** - Build React components to visualize ELV data
2. **API Routes** - Create REST endpoints for frontend consumption
3. **Alert Integration** - Integrate with notification/alert system
4. **Pack Integration** - Add ELV section to pack generation
5. **Trend Visualization** - Historical charts showing headroom over time
6. **Predictive Analysis** - ML model to predict when parameters will exceed limits

## Dependencies

- `@/lib/supabase/server` - Database client
- PostgreSQL tables:
  - `elv_conditions`
  - `elv_monitoring_results`
  - `stack_tests`
  - `generators`
  - `documents`
  - `sites`

## License

Internal EcoComply service - Phase 2.3 MCPD/Generator Module
