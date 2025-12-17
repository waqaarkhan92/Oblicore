# Technical Implementation Blueprint v1.0
## EcoComply Ingestion Prompt Library → System Integration

**Version:** 1.0
**Status:** APPROVED
**Last Updated:** 2025-02-01
**Scope:** Mapping 23 Ingestion Prompts to Database, API, UI, and Worker Infrastructure

---

## Table of Contents

1. [Ingestion Field → DB Schema Mapping](#1-ingestion-field--db-schema-mapping)
2. [Validation Rule → Backend Enforcement](#2-validation-rule--backend-enforcement)
3. [condition_type / Obligation → UI Components](#3-condition_type--obligation--ui-components)
4. [Confidence Metadata → Visual Indicators + API](#4-confidence-metadata--visual-indicators--api)
5. [Multi-Jurisdiction Logic → RLS + Inference Barriers](#5-multi-jurisdiction-logic--rls--inference-barriers)
6. [Document Ingestion → Worker Queue Processes](#6-document-ingestion--worker-queue-processes)
7. [Error Escalation → Manual Review Workflows](#7-error-escalation--manual-review-workflows)
8. [Version Compatibility → Migration Rules](#8-version-compatibility--migration-rules)
9. [Entity Relationship Diagrams](#9-entity-relationship-diagrams)
10. [UI Routing Map + Screen List](#10-ui-routing-map--screen-list)
11. [API Contract: Ingestion + Output JSON](#11-api-contract-ingestion--output-json)
12. [File Naming + Module Packaging Strategy](#12-file-naming--module-packaging-strategy)

---

## 1. Ingestion Field → DB Schema Mapping

### 1.1 Environmental Permits Field Mapping

| Ingestion Field | DB Table | DB Column | Type | Constraints |
|-----------------|----------|-----------|------|-------------|
| `permit_reference` | `documents` | `reference_number` | TEXT | Unique per site |
| `operator_name` | `companies` | `name` | TEXT | NOT NULL |
| `site_name` | `sites` | `name` | TEXT | NOT NULL |
| `site_address` | `sites` | `address_line_1`, `city`, `postcode` | TEXT | Composite |
| `grid_reference` | `sites.settings` | `settings->>'grid_reference'` | JSONB | — |
| `issue_date` | `documents` | `issue_date` | DATE | — |
| `effective_date` | `documents` | `effective_date` | DATE | — |
| `expiry_date` | `documents` | `expiry_date` | DATE | — |
| `review_date` | `documents.metadata` | `metadata->>'review_date'` | JSONB | — |
| `regulator` | `documents` | `regulator` | TEXT | ENUM: EA, SEPA, NRW, NIEA |
| `permit_type` | `documents` | `document_type` | TEXT | ENUM constraint |
| `installation_subdivision` | `documents.metadata` | `metadata->>'installation_subdivision'` | JSONB | NIEA only |
| `local_council` | `sites.settings` | `settings->>'local_council'` | JSONB | NIEA only |
| `sepa_region` | `sites.settings` | `settings->>'sepa_region'` | JSONB | SEPA only |
| `nrw_banding` | `sites.settings` | `settings->>'nrw_banding'` | JSONB | NRW only |
| `ccs_band` | `sites.settings` | `settings->>'ccs_band'` | JSONB | EA only |

### 1.2 Condition/Obligation Field Mapping

| Ingestion Field | DB Table | DB Column | Type | Constraints |
|-----------------|----------|-----------|------|-------------|
| `condition_id` | `obligations` | `condition_reference` | TEXT | Unique per document |
| `condition_text` | `obligations` | `original_text` | TEXT | NOT NULL |
| `condition_text_welsh` | `obligations.metadata` | `metadata->>'condition_text_welsh'` | JSONB | NRW/DC only |
| `condition_type[]` | `obligations.metadata` | `metadata->>'condition_types'` | JSONB Array | Multi-select ENUM |
| `frequency` | `obligations` | `frequency` | TEXT | ENUM constraint |
| `deadline` | `obligations` | `deadline_date` | DATE | — |
| `threshold_value` | `obligations.metadata` | `metadata->>'threshold_value'` | JSONB | — |
| `threshold_unit` | `obligations.metadata` | `metadata->>'threshold_unit'` | JSONB | — |
| `linked_evidence_type[]` | `obligations` | `evidence_suggestions` | TEXT[] | Array |
| `confidence_score` | `obligations` | `confidence_score` | DECIMAL(5,4) | 0.0-1.0 |
| `confidence_rationale` | `obligations.metadata` | `metadata->>'confidence_rationale'` | JSONB | — |

### 1.3 MCPD-Specific Field Mapping

| Ingestion Field | DB Table | DB Column | Type | Notes |
|-----------------|----------|-----------|------|-------|
| `plant_category` | `documents.metadata` | `metadata->>'plant_category'` | JSONB | EXISTING_MCP, NEW_MCP, SPECIFIED_GENERATOR |
| `thermal_input_mw` | `documents.metadata` | `metadata->>'thermal_input_mw'` | JSONB | 1.0-50.0 |
| `fuel_type[]` | `documents.metadata` | `metadata->>'fuel_types'` | JSONB Array | GAS, LIQUID, SOLID, etc. |
| `operating_hours_limit` | `documents.metadata` | `metadata->>'operating_hours_limit'` | JSONB | Annual hours |
| `emission_limits.nox_mg_nm3` | `documents.metadata` | `metadata->'emission_limits'->>'nox'` | JSONB | — |
| `emission_limits.so2_mg_nm3` | `documents.metadata` | `metadata->'emission_limits'->>'so2'` | JSONB | — |
| `emission_limits.dust_mg_nm3` | `documents.metadata` | `metadata->'emission_limits'->>'dust'` | JSONB | — |
| `compliance_date` | `documents.metadata` | `metadata->>'compliance_date'` | JSONB | ELV deadline |
| `bat_reference` | `documents.metadata` | `metadata->>'bat_reference'` | JSONB | SEPA only |

### 1.4 Hazardous Waste Field Mapping

| Ingestion Field | DB Table | DB Column | Type | Notes |
|-----------------|----------|-----------|------|-------|
| `consignment_code` | `consignment_notes` | `reference_number` | TEXT | 8-char unique |
| `producer_name` | `consignment_notes.metadata` | `metadata->>'producer_name'` | JSONB | — |
| `producer_premises_code` | `consignment_notes.metadata` | `metadata->>'producer_premises_code'` | JSONB | XXX/XXXXXX |
| `carrier_registration` | `consignment_notes.metadata` | `metadata->>'carrier_registration'` | JSONB | CBDU/CBDW/CBDS |
| `consignee_permit` | `consignment_notes.metadata` | `metadata->>'consignee_permit'` | JSONB | — |
| `ewc_codes[]` | `consignment_notes` | `ewc_codes` | TEXT[] | 6-digit codes |
| `hazard_codes[]` | `consignment_notes.metadata` | `metadata->>'hazard_codes'` | JSONB Array | HP1-HP16 |
| `quantity` | `consignment_notes` | `quantity` | DECIMAL | — |
| `quantity_unit` | `consignment_notes` | `quantity_unit` | TEXT | ENUM |
| `chain_of_custody[]` | `chain_of_custody_legs` | Multiple columns | — | Separate table |
| `cross_border` | `consignment_notes.metadata` | `metadata->>'cross_border'` | JSONB | Boolean |
| `transfrontier` | `consignment_notes.metadata` | `metadata->>'transfrontier'` | JSONB | Boolean (NIEA) |

### 1.5 Trade Effluent Field Mapping

| Ingestion Field | DB Table | DB Column | Type | Notes |
|-----------------|----------|-----------|------|-------|
| `consent_reference` | `documents` | `reference_number` | TEXT | — |
| `holder_name` | `companies` | `name` | TEXT | — |
| `water_company` | `documents` | `water_company` | TEXT | — |
| `max_daily_volume` | `documents.metadata` | `metadata->>'max_daily_volume'` | JSONB | m³/day |
| `max_rate` | `documents.metadata` | `metadata->>'max_rate'` | JSONB | l/s |
| `discharge_hours` | `documents.metadata` | `metadata->>'discharge_hours'` | JSONB | — |
| `receiving_sewage_works` | `documents.metadata` | `metadata->>'receiving_sewage_works'` | JSONB | — |
| `mogden_values.ot` | `documents.metadata` | `metadata->'mogden'->>'ot'` | JSONB | COD mg/l |
| `mogden_values.os` | `documents.metadata` | `metadata->'mogden'->>'os'` | JSONB | Standard COD |
| `mogden_values.st` | `documents.metadata` | `metadata->'mogden'->>'st'` | JSONB | SS mg/l |
| `mogden_values.ss` | `documents.metadata` | `metadata->'mogden'->>'ss'` | JSONB | Standard SS |

### 1.6 Extraction Metadata Mapping

| Ingestion Field | DB Table | DB Column | Type |
|-----------------|----------|-----------|------|
| `prompt_id` | `extraction_logs` | `prompt_id` | TEXT |
| `prompt_version` | `extraction_logs` | `prompt_version` | TEXT |
| `extraction_timestamp` | `extraction_logs` | `created_at` | TIMESTAMPTZ |
| `document_hash` | `documents.metadata` | `metadata->>'document_hash'` | JSONB |
| `regulator` | `documents` | `regulator` | TEXT |
| `jurisdiction` | `sites` | `regulator` | TEXT |
| `document_language` | `documents.metadata` | `metadata->>'document_language'` | JSONB |

---

## 2. Validation Rule → Backend Enforcement

### 2.1 Structural Validation (Pre-Save)

| Validation Rule | Implementation Location | Method |
|-----------------|------------------------|--------|
| `permit_reference` format | `lib/validation/schemas.ts` | Zod regex pattern |
| `issue_date` valid ISO 8601 | `lib/validation/schemas.ts` | Zod date coercion |
| `confidence_score` 0.0-1.0 | DB constraint | CHECK constraint |
| `ewc_codes` 6-digit format | `lib/validation/schemas.ts` | Zod regex `/^\d{6}$/` |
| `condition_id` uniqueness | DB constraint | UNIQUE INDEX |
| `thermal_input_mw` 1.0-50.0 | `lib/validation/schemas.ts` | Zod `.min(1).max(50)` |
| `pH_limits` 0-14 range | `lib/validation/schemas.ts` | Zod `.min(0).max(14)` |

### 2.2 Logical Validation (Business Rules)

| Validation Rule | Implementation Location | Enforcement |
|-----------------|------------------------|-------------|
| `effective_date >= issue_date` | `lib/validation/middleware.ts` | Pre-insert check |
| `expiry_date > effective_date` | `lib/validation/middleware.ts` | Pre-insert check |
| Temporary consent requires `expiry_date` | `lib/validation/middleware.ts` | Conditional required |
| MCPD compliance_date aligns with plant_category | `lib/ai/document-processor.ts` | Extraction validation |
| Chain of custody legs sequential | `lib/services/chain-custody-service.ts` | Insert validation |
| `transfrontier = true` implies `cross_border = true` | `lib/validation/middleware.ts` | Logical constraint |

### 2.3 Cross-Reference Validation

| Validation Rule | Implementation Location | Method |
|-----------------|------------------------|--------|
| Premises address within water company area | `lib/services/jurisdiction-service.ts` | Postcode lookup |
| Grid reference valid for jurisdiction | `lib/services/jurisdiction-service.ts` | Coordinate bounds check |
| Carrier registration format per jurisdiction | `lib/validation/schemas.ts` | Dynamic regex |
| Receiving works exists in reference data | `lib/services/reference-data-service.ts` | DB lookup |

### 2.4 Database-Level Enforcement

```sql
-- Confidence score constraint
ALTER TABLE obligations ADD CONSTRAINT chk_confidence_score
  CHECK (confidence_score >= 0 AND confidence_score <= 1);

-- Regulator ENUM constraint
ALTER TABLE documents ADD CONSTRAINT chk_regulator
  CHECK (regulator IN ('EA', 'SEPA', 'NRW', 'NIEA', 'WATER_COMPANY'));

-- Document type ENUM constraint
ALTER TABLE documents ADD CONSTRAINT chk_document_type
  CHECK (document_type IN (
    'ENVIRONMENTAL_PERMIT',
    'TRADE_EFFLUENT_CONSENT',
    'MCPD_REGISTRATION',
    'HAZARDOUS_WASTE_CONSIGNMENT'
  ));

-- Unique condition reference per document
CREATE UNIQUE INDEX uq_obligations_document_condition
  ON obligations(document_id, condition_reference)
  WHERE deleted_at IS NULL AND condition_reference IS NOT NULL;
```

---

## 3. condition_type / Obligation → UI Components

### 3.1 condition_type to UI Page Mapping

| condition_type | Primary UI Page | Component Path |
|----------------|-----------------|----------------|
| EMISSION_LIMIT | `/dashboard/sites/[siteId]/permits/obligations` | `components/obligations/emission-limit-card.tsx` |
| MONITORING | `/dashboard/sites/[siteId]/module-2/lab-results` | `components/module-2/monitoring-tracker.tsx` |
| REPORTING | `/dashboard/sites/[siteId]/deadlines` | `components/deadlines/reporting-deadline.tsx` |
| OPERATIONAL_LIMIT | `/dashboard/sites/[siteId]/permits/obligations` | `components/obligations/operational-limit.tsx` |
| FUEL_SPECIFICATION | `/dashboard/sites/[siteId]/module-3/generators` | `components/module-3/fuel-spec-panel.tsx` |
| MAINTENANCE | `/dashboard/sites/[siteId]/module-3/maintenance-records` | `components/module-3/maintenance-schedule.tsx` |
| RECORD_KEEPING | `/dashboard/sites/[siteId]/evidence` | `components/evidence/record-keeping-list.tsx` |
| NOTIFICATION | `/dashboard/sites/[siteId]/deadlines` | `components/deadlines/notification-tracker.tsx` |
| STACK_HEIGHT | `/dashboard/sites/[siteId]/module-3/generators` | `components/module-3/stack-parameters.tsx` |
| OPERATING_HOURS | `/dashboard/sites/[siteId]/module-3/run-hours` | `components/module-3/run-hours-tracker.tsx` |
| BAT_REQUIREMENT | `/dashboard/sites/[siteId]/permits/obligations` | `components/obligations/bat-requirement.tsx` |
| VOLUME_LIMIT | `/dashboard/sites/[siteId]/module-2/discharge-volumes` | `components/module-2/volume-tracker.tsx` |
| PH_LIMIT | `/dashboard/sites/[siteId]/module-2/lab-results` | `components/module-2/ph-monitor.tsx` |
| COD_LIMIT | `/dashboard/sites/[siteId]/module-2/lab-results` | `components/module-2/cod-monitor.tsx` |
| SUSPENDED_SOLIDS | `/dashboard/sites/[siteId]/module-2/lab-results` | `components/module-2/ss-monitor.tsx` |
| PRE_TREATMENT | `/dashboard/sites/[siteId]/module-2/parameters` | `components/module-2/pre-treatment.tsx` |
| DUTY_OF_CARE | `/dashboard/module-4/consignment-notes` | `components/module-4/duty-of-care.tsx` |
| CHAIN_OF_CUSTODY | `/dashboard/module-4/consignment-notes/[noteId]` | `components/module-4/chain-custody-viewer.tsx` |
| QUARTERLY_RETURN | `/dashboard/sites/[siteId]/deadlines` | `components/deadlines/quarterly-return.tsx` |

### 3.2 Obligation Status UI Indicators

| Status | Badge Color | Icon | Component |
|--------|-------------|------|-----------|
| PENDING | `bg-gray-100 text-gray-700` | `Clock` | `<StatusBadge status="pending" />` |
| IN_PROGRESS | `bg-blue-100 text-blue-700` | `PlayCircle` | `<StatusBadge status="in_progress" />` |
| DUE_SOON | `bg-amber-100 text-amber-700` | `AlertTriangle` | `<StatusBadge status="due_soon" />` |
| COMPLETED | `bg-green-100 text-green-700` | `CheckCircle` | `<StatusBadge status="completed" />` |
| OVERDUE | `bg-red-100 text-red-700` | `XCircle` | `<StatusBadge status="overdue" />` |
| NOT_APPLICABLE | `bg-slate-100 text-slate-500` | `Minus` | `<StatusBadge status="not_applicable" />` |

### 3.3 Review Status UI Components

| Review Status | UI Location | Action Buttons |
|--------------|-------------|----------------|
| PENDING | Review Queue | `[Confirm] [Edit] [Reject]` |
| CONFIRMED | Obligation Detail | `[View History]` |
| EDITED | Obligation Detail | `[View Changes] [Revert]` |
| REJECTED | Archive | `[Restore] [Delete]` |
| PENDING_INTERPRETATION | Subjective Queue | `[Interpret] [Assign]` |
| INTERPRETED | Obligation Detail | `[View Interpretation]` |

---

## 4. Confidence Metadata → Visual Indicators + API

### 4.1 Confidence Score Visual Indicators

| Score Range | Color | Label | Icon | Action |
|-------------|-------|-------|------|--------|
| 0.9 - 1.0 | `text-green-600` | High Confidence | `ShieldCheck` | Auto-approve eligible |
| 0.7 - 0.89 | `text-blue-600` | Good Confidence | `CheckCircle` | Standard review |
| 0.6 - 0.69 | `text-amber-600` | Review Required | `AlertTriangle` | Manual review flag |
| < 0.6 | `text-red-600` | Low Confidence | `XCircle` | Human review mandatory |

### 4.2 Confidence Display Component

```tsx
// components/ui/confidence-indicator.tsx
interface ConfidenceIndicatorProps {
  score: number;
  rationale?: string;
  showDetails?: boolean;
}

export function ConfidenceIndicator({ score, rationale, showDetails }: ConfidenceIndicatorProps) {
  const config = getConfidenceConfig(score);

  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-1 ${config.textColor}`}>
        <config.icon className="w-4 h-4" />
        <span className="text-sm font-medium">{(score * 100).toFixed(0)}%</span>
      </div>
      {showDetails && rationale && (
        <Tooltip content={rationale}>
          <InfoIcon className="w-4 h-4 text-gray-400" />
        </Tooltip>
      )}
    </div>
  );
}
```

### 4.3 API Response Format

```json
{
  "obligation": {
    "id": "uuid",
    "confidence": {
      "score": 0.85,
      "rationale": "Deduction: -0.10 for conditional applicability ('where applicable'); -0.05 for cross-reference to Schedule 2",
      "flags": ["CONDITIONAL_TEXT", "CROSS_REFERENCE_UNRESOLVED"],
      "human_review_required": false
    },
    "extraction_metadata": {
      "prompt_id": "EA-ENV-INGEST-001",
      "prompt_version": "1.3",
      "extraction_timestamp": "2025-02-01T10:30:00Z",
      "processing_time_ms": 2340
    }
  }
}
```

### 4.4 Confidence Breakdown API Endpoint

```
GET /api/v1/obligations/{obligationId}/confidence
```

Response:
```json
{
  "base_score": 1.0,
  "deductions": [
    {
      "reason": "AMBIGUOUS_DEADLINE",
      "amount": -0.15,
      "text": "within reasonable time"
    },
    {
      "reason": "CONDITIONAL_APPLICABILITY",
      "amount": -0.10,
      "text": "where applicable"
    }
  ],
  "final_score": 0.75,
  "threshold_status": "REVIEW_REQUIRED",
  "human_review_required": false
}
```

---

## 5. Multi-Jurisdiction Logic → RLS + Inference Barriers

### 5.1 RLS Policies for Jurisdiction Isolation

```sql
-- Sites RLS: Users can only see sites in their company
CREATE POLICY sites_company_isolation ON sites
  FOR ALL
  USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

-- Documents RLS: Inherit from sites
CREATE POLICY documents_site_isolation ON documents
  FOR ALL
  USING (site_id IN (
    SELECT id FROM sites WHERE company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  ));

-- Obligations RLS: Inherit from documents
CREATE POLICY obligations_document_isolation ON obligations
  FOR ALL
  USING (document_id IN (
    SELECT id FROM documents WHERE site_id IN (
      SELECT id FROM sites WHERE company_id IN (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  ));
```

### 5.2 Jurisdiction-Aware Query Functions

```sql
-- Function to get jurisdiction-specific settings
CREATE OR REPLACE FUNCTION get_jurisdiction_config(p_site_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_regulator TEXT;
  v_config JSONB;
BEGIN
  SELECT regulator INTO v_regulator FROM sites WHERE id = p_site_id;

  CASE v_regulator
    WHEN 'EA' THEN
      v_config := '{"banding_method": "CCS", "language": "EN"}'::JSONB;
    WHEN 'NRW' THEN
      v_config := '{"banding_method": "NRW_BANDING", "language": "EN_CY", "bilingual": true}'::JSONB;
    WHEN 'SEPA' THEN
      v_config := '{"banding_method": "CAS_WITHDRAWN", "language": "EN", "terminology": "PPC"}'::JSONB;
    WHEN 'NIEA' THEN
      v_config := '{"banding_method": "NO_PUBLISHED_METHODOLOGY", "language": "EN", "grid_system": "IRISH_GRID"}'::JSONB;
    ELSE
      v_config := '{}'::JSONB;
  END CASE;

  RETURN v_config;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 5.3 Inference Barrier Implementation

```typescript
// lib/ai/inference-barriers.ts

export class InferenceBarrier {
  // Prevents cross-jurisdiction inference
  static validateExtractionScope(
    extraction: ExtractionResult,
    sourceDocument: Document
  ): ValidationResult {
    const errors: string[] = [];

    // Check for regulator mismatch
    if (extraction.regulator !== sourceDocument.regulator) {
      errors.push(`Regulator mismatch: extracted ${extraction.regulator}, expected ${sourceDocument.regulator}`);
    }

    // Check for jurisdiction leakage (e.g., CCS banding appearing in NIEA document)
    if (sourceDocument.regulator === 'NIEA' && extraction.metadata?.ccs_band) {
      errors.push('CCS banding not applicable to NIEA jurisdiction');
    }

    // Check for Welsh fields in non-Welsh documents
    if (sourceDocument.regulator !== 'NRW' && extraction.metadata?.condition_text_welsh) {
      errors.push('Welsh text fields only valid for NRW jurisdiction');
    }

    // Prevent inferred values
    for (const field of NEVER_INFER_FIELDS) {
      if (extraction.inferred_fields?.includes(field)) {
        errors.push(`Field '${field}' cannot be inferred - must be explicitly stated`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

const NEVER_INFER_FIELDS = [
  'emission_limits',
  'compliance_dates',
  'mogden_values',
  'ewc_codes',
  'hazard_codes',
  'operating_hours_limit'
];
```

### 5.4 Prompt Selection by Jurisdiction

```typescript
// lib/ai/prompt-selector.ts

export function selectIngestionPrompt(
  documentType: DocumentType,
  regulator: Regulator,
  waterCompany?: WaterCompany
): PromptConfig {
  const promptMatrix: Record<string, Record<string, string>> = {
    'ENVIRONMENTAL_PERMIT': {
      'EA': 'EA-ENV-INGEST-001',
      'NRW': 'NRW-ENV-INGEST-001',
      'SEPA': 'SEPA-ENV-INGEST-001',
      'NIEA': 'NIEA-ENV-INGEST-001'
    },
    'MCPD_REGISTRATION': {
      'EA': 'EA-MCPD-INGEST-001',
      'NRW': 'NRW-MCPD-INGEST-001',
      'SEPA': 'SEPA-MCPD-INGEST-001',
      'NIEA': 'NIEA-MCPD-INGEST-001'
    },
    'HAZARDOUS_WASTE_CONSIGNMENT': {
      'EA': 'EA-HW-INGEST-001',
      'NRW': 'NRW-HW-INGEST-001',
      'SEPA': 'SEPA-SW-INGEST-001', // Note: "Special Waste" terminology
      'NIEA': 'NIEA-HW-INGEST-001'
    },
    'TRADE_EFFLUENT_CONSENT': {
      'THAMES_WATER': 'TW-TE-INGEST-001',
      'SEVERN_TRENT': 'ST-TE-INGEST-001',
      'UNITED_UTILITIES': 'UU-TE-INGEST-001',
      'ANGLIAN_WATER': 'AW-TE-INGEST-001',
      'YORKSHIRE_WATER': 'YW-TE-INGEST-001',
      'NORTHUMBRIAN_WATER': 'NW-TE-INGEST-001',
      'SOUTHERN_WATER': 'SW-TE-INGEST-001',
      'SOUTH_WEST_WATER': 'SWW-TE-INGEST-001',
      'WESSEX_WATER': 'WX-TE-INGEST-001',
      'DWR_CYMRU': 'DC-TE-INGEST-001',
      'SCOTTISH_WATER': 'SCW-TE-INGEST-001'
    }
  };

  const key = documentType === 'TRADE_EFFLUENT_CONSENT' ? waterCompany : regulator;
  const promptId = promptMatrix[documentType]?.[key!];

  if (!promptId) {
    throw new Error(`No prompt configured for ${documentType} / ${key}`);
  }

  return loadPromptConfig(promptId);
}
```

---

## 6. Document Ingestion → Worker Queue Processes

### 6.1 Queue Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   API Upload    │────▶│   Redis Queue    │────▶│  Worker Process │
│   Endpoint      │     │                  │     │                 │
└─────────────────┘     │  Queues:         │     │  Jobs:          │
                        │  - document-     │     │  - OCR          │
                        │    processing    │     │  - Extraction   │
                        │  - extraction    │     │  - Validation   │
                        │  - validation    │     │  - Review       │
                        └──────────────────┘     └─────────────────┘
```

### 6.2 Document Processing Pipeline

| Stage | Queue Name | Job Type | Timeout | Retry |
|-------|-----------|----------|---------|-------|
| 1. Upload | `document-upload` | File validation, storage | 30s | 3 |
| 2. OCR | `document-ocr` | PDF text extraction | 120s | 2 |
| 3. Classification | `document-classify` | Type/regulator detection | 30s | 3 |
| 4. Extraction | `document-extract` | AI obligation extraction | 300s | 2 |
| 5. Validation | `extraction-validate` | Schema/logic validation | 30s | 3 |
| 6. Persistence | `extraction-persist` | DB write | 30s | 3 |
| 7. Review Queue | `review-assign` | Human review assignment | 10s | 3 |

### 6.3 Worker Implementation

```typescript
// lib/jobs/document-processing-job.ts

export async function processDocumentJob(job: Job<DocumentProcessingPayload>) {
  const { documentId, options } = job.data;

  // Stage 1: Load document
  const document = await getDocument(documentId);
  await job.updateProgress(10);

  // Stage 2: OCR if needed
  let extractedText = document.extracted_text;
  if (!extractedText) {
    extractedText = await performOCR(document.storage_path);
    await updateDocument(documentId, {
      extracted_text: extractedText,
      extraction_status: 'PROCESSING'
    });
  }
  await job.updateProgress(30);

  // Stage 3: Select prompt based on jurisdiction
  const promptConfig = selectIngestionPrompt(
    document.document_type,
    document.regulator,
    document.water_company
  );
  await job.updateProgress(40);

  // Stage 4: AI Extraction
  const extraction = await extractObligations(extractedText, promptConfig);
  await job.updateProgress(70);

  // Stage 5: Validate extraction
  const validationResult = InferenceBarrier.validateExtractionScope(
    extraction,
    document
  );

  if (!validationResult.valid) {
    await updateDocument(documentId, {
      extraction_status: 'EXTRACTION_FAILED',
      metadata: { ...document.metadata, extraction_errors: validationResult.errors }
    });
    throw new Error(`Extraction validation failed: ${validationResult.errors.join(', ')}`);
  }
  await job.updateProgress(80);

  // Stage 6: Persist obligations
  const obligations = await persistObligations(extraction.conditions, document);
  await job.updateProgress(90);

  // Stage 7: Queue for review if needed
  const lowConfidenceObligations = obligations.filter(o => o.confidence_score < 0.6);
  if (lowConfidenceObligations.length > 0) {
    await queueForReview(lowConfidenceObligations);
  }

  await updateDocument(documentId, {
    extraction_status: lowConfidenceObligations.length > 0 ? 'REVIEW_REQUIRED' : 'COMPLETED'
  });
  await job.updateProgress(100);

  return { obligationsCreated: obligations.length, requiresReview: lowConfidenceObligations.length };
}
```

### 6.4 Queue Job Definitions

```typescript
// lib/queue/queue-definitions.ts

export const QUEUE_DEFINITIONS = {
  'document-processing': {
    concurrency: 5,
    limiter: { max: 10, duration: 1000 },
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { age: 86400 }, // 24 hours
      removeOnFail: { age: 604800 }     // 7 days
    }
  },
  'extraction-validation': {
    concurrency: 10,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'fixed', delay: 1000 }
    }
  },
  'review-assignment': {
    concurrency: 20,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'fixed', delay: 500 }
    }
  }
};
```

---

## 7. Error Escalation → Manual Review Workflows

### 7.1 Review Queue States

```
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│    PENDING    │────▶│  IN_REVIEW    │────▶│   RESOLVED    │
│               │     │               │     │               │
│  Auto-queued  │     │  Assigned to  │     │  Confirmed/   │
│  by system    │     │  reviewer     │     │  Edited/      │
│               │     │               │     │  Rejected     │
└───────────────┘     └───────────────┘     └───────────────┘
        │                     │
        │                     │
        ▼                     ▼
┌───────────────┐     ┌───────────────┐
│   ESCALATED   │◀────│   STALLED     │
│               │     │               │
│  Manager      │     │  No action    │
│  attention    │     │  > 48 hours   │
└───────────────┘     └───────────────┘
```

### 7.2 Review Queue Triggers

| Trigger Condition | Queue Priority | Auto-Assign | SLA |
|-------------------|---------------|-------------|-----|
| `confidence_score < 0.6` | HIGH | Yes | 24h |
| `confidence_score < 0.7` | MEDIUM | Yes | 48h |
| `is_subjective = true` | HIGH | No | 24h |
| `validation_flags` not empty | HIGH | Yes | 24h |
| Zero obligations extracted | CRITICAL | No | 4h |
| Cross-reference unresolved | MEDIUM | Yes | 48h |
| Welsh-only document (NRW/DC) | LOW | Yes | 72h |

### 7.3 Review Queue UI

**Route:** `/dashboard/admin/review-queue`

| Column | Description | Actions |
|--------|-------------|---------|
| Document | Link to source document | View |
| Obligation | Condition reference + title | View/Edit |
| Confidence | Score with rationale tooltip | — |
| Flags | Validation flags as badges | — |
| Assigned To | Reviewer dropdown | Reassign |
| Age | Time in queue | — |
| Actions | Review buttons | Confirm / Edit / Reject |

### 7.4 Review API Endpoints

```
POST /api/v1/review-queue/{itemId}/confirm
POST /api/v1/review-queue/{itemId}/edit
POST /api/v1/review-queue/{itemId}/reject
POST /api/v1/review-queue/{itemId}/escalate
GET  /api/v1/review-queue/stats
GET  /api/v1/review-queue/my-assignments
```

### 7.5 Escalation Rules

```typescript
// lib/jobs/escalation-check-job.ts

export async function checkReviewEscalations() {
  // Find stalled items
  const stalledItems = await db.query(`
    SELECT * FROM review_queue_items
    WHERE status = 'IN_REVIEW'
    AND assigned_at < NOW() - INTERVAL '48 hours'
    AND escalated_at IS NULL
  `);

  for (const item of stalledItems) {
    // Escalate to manager
    await escalateReviewItem(item.id, {
      reason: 'SLA_BREACH',
      escalate_to: item.assigned_to_manager_id
    });

    // Send notification
    await sendNotification({
      type: 'REVIEW_ESCALATION',
      user_id: item.assigned_to_manager_id,
      data: { item_id: item.id, original_assignee: item.assigned_to }
    });
  }

  // Find critical unassigned items
  const criticalUnassigned = await db.query(`
    SELECT * FROM review_queue_items
    WHERE status = 'PENDING'
    AND priority = 'CRITICAL'
    AND created_at < NOW() - INTERVAL '2 hours'
  `);

  for (const item of criticalUnassigned) {
    // Auto-assign to on-call reviewer
    const onCallReviewer = await getOnCallReviewer(item.company_id);
    await assignReviewItem(item.id, onCallReviewer.id);
  }
}
```

---

## 8. Version Compatibility → Migration Rules

### 8.1 Prompt Version Schema

```typescript
interface PromptVersion {
  id: string;                    // e.g., "EA-ENV-INGEST-001"
  version: string;               // e.g., "1.3"
  status: 'DRAFT' | 'ACTIVE' | 'DEPRECATED' | 'RETIRED';
  effective_from: Date;
  effective_to?: Date;
  schema_version: string;        // e.g., "2.0"
  breaking_changes: string[];
  migration_notes: string;
}
```

### 8.2 Version Compatibility Matrix

| Prompt Version | DB Schema Version | API Version | Migration Required |
|----------------|-------------------|-------------|-------------------|
| v1.0 - v1.2 | v1.x | v1 | — |
| v1.3+ | v2.0+ | v1 | Yes: Add `condition_type[]` array |
| v1.4+ (MCPD) | v2.0+ | v1 | Yes: Add `plant_category` ENUM |
| v1.5+ (NRW) | v2.0+ | v1 | Yes: Add `*_welsh` fields |
| v1.6+ (SEPA/NIEA) | v2.0+ | v1 | Yes: Add `cas_status`, `local_council` |

### 8.3 Database Migration for Prompt Updates

```sql
-- Migration: Add condition_type array support (v1.3+)
-- File: 20250205000001_add_condition_type_array.sql

-- Add condition_types JSONB array to metadata
ALTER TABLE obligations
  ALTER COLUMN metadata SET DEFAULT '{"condition_types": []}';

-- Backfill existing obligations
UPDATE obligations
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'),
  '{condition_types}',
  CASE
    WHEN category = 'MONITORING' THEN '["MONITORING"]'::jsonb
    WHEN category = 'REPORTING' THEN '["REPORTING"]'::jsonb
    WHEN category = 'RECORD_KEEPING' THEN '["RECORD_KEEPING"]'::jsonb
    WHEN category = 'OPERATIONAL' THEN '["OPERATIONAL_LIMIT"]'::jsonb
    WHEN category = 'MAINTENANCE' THEN '["MAINTENANCE"]'::jsonb
    ELSE '[]'::jsonb
  END
)
WHERE metadata->>'condition_types' IS NULL;

-- Add Welsh field support for NRW/DC
ALTER TABLE obligations
  ADD COLUMN IF NOT EXISTS original_text_welsh TEXT;

-- Add index for condition_type queries
CREATE INDEX idx_obligations_condition_types
  ON obligations USING GIN ((metadata->'condition_types'));
```

### 8.4 Extraction Versioning

```typescript
// lib/ai/extraction-versioning.ts

export interface ExtractionRecord {
  document_id: string;
  prompt_id: string;
  prompt_version: string;
  schema_version: string;
  extraction_timestamp: Date;
  raw_extraction: unknown;
  normalized_extraction: NormalizedExtraction;
}

export async function reprocessWithNewPrompt(
  documentId: string,
  newPromptVersion: string
): Promise<void> {
  const document = await getDocument(documentId);
  const previousExtraction = await getLatestExtraction(documentId);

  // Archive previous extraction
  await archiveExtraction(previousExtraction.id);

  // Re-extract with new prompt
  const newPromptConfig = loadPromptConfig(
    previousExtraction.prompt_id,
    newPromptVersion
  );

  const newExtraction = await extractObligations(
    document.extracted_text,
    newPromptConfig
  );

  // Log migration
  await logExtractionMigration({
    document_id: documentId,
    from_version: previousExtraction.prompt_version,
    to_version: newPromptVersion,
    changes_detected: compareExtractions(
      previousExtraction.normalized_extraction,
      newExtraction
    )
  });

  // Update obligations
  await updateObligationsFromExtraction(documentId, newExtraction);
}
```

### 8.5 Backward Compatibility Rules

| Rule | Implementation |
|------|----------------|
| New fields must be optional | Add with `| null` or `DEFAULT` value |
| ENUM additions are non-breaking | Add new values to CHECK constraint |
| ENUM removals require migration | Map old values to new before removal |
| Schema changes require version bump | Increment `schema_version` in prompt |
| Extraction re-runs preserve history | Archive old, don't delete |

---

## 9. Entity Relationship Diagrams

### 9.1 Core Document Ingestion ERD

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DOCUMENT INGESTION ERD                            │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│  companies   │       │    sites     │       │   modules    │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │◀──┐   │ id (PK)      │   ┌──▶│ id (PK)      │
│ name         │   │   │ company_id   │───┘   │ module_code  │
│ billing_email│   └───│ (FK)         │       │ module_name  │
│ subscription │       │ name         │       │ document_    │
│ _tier        │       │ regulator    │       │ types        │
│ settings     │       │ water_company│       └──────────────┘
└──────────────┘       │ settings     │              │
                       └──────────────┘              │
                              │                      │
                              │                      │
                              ▼                      │
                       ┌──────────────┐              │
                       │  documents   │◀─────────────┘
                       ├──────────────┤
                       │ id (PK)      │
                       │ site_id (FK) │
                       │ module_id    │
                       │ (FK)         │
                       │ document_type│
                       │ regulator    │
                       │ water_company│
                       │ reference_   │
                       │ number       │
                       │ extraction_  │
                       │ status       │
                       │ extracted_   │
                       │ text         │
                       │ metadata     │
                       └──────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ obligations  │     │ extraction_  │     │ document_    │
├──────────────┤     │ logs         │     │ site_        │
│ id (PK)      │     ├──────────────┤     │ assignments  │
│ document_id  │     │ id (PK)      │     ├──────────────┤
│ (FK)         │     │ document_id  │     │ id (PK)      │
│ company_id   │     │ (FK)         │     │ document_id  │
│ (FK)         │     │ prompt_id    │     │ (FK)         │
│ site_id (FK) │     │ prompt_      │     │ site_id (FK) │
│ module_id    │     │ version      │     │ is_primary   │
│ (FK)         │     │ extraction_  │     │ obligations_ │
│ condition_   │     │ result       │     │ shared       │
│ reference    │     │ token_usage  │     └──────────────┘
│ original_text│     │ cost_usd     │
│ confidence_  │     │ created_at   │
│ score        │     └──────────────┘
│ review_status│
│ metadata     │
└──────────────┘
         │
         │
         ▼
┌──────────────┐     ┌──────────────┐
│  schedules   │     │ evidence_    │
├──────────────┤     │ items        │
│ id (PK)      │     ├──────────────┤
│ obligation_id│     │ id (PK)      │
│ (FK)         │     │ company_id   │
│ frequency    │     │ (FK)         │
│ base_date    │     │ site_id (FK) │
│ next_due_date│     │ file_name    │
└──────────────┘     │ storage_path │
         │           │ file_hash    │
         │           └──────────────┘
         ▼                   │
┌──────────────┐             │
│  deadlines   │             │
├──────────────┤             │
│ id (PK)      │             │
│ schedule_id  │◀────────────┘
│ (FK)         │      (via obligation_
│ obligation_id│       evidence_links)
│ (FK)         │
│ due_date     │
│ status       │
└──────────────┘
```

### 9.2 Module-Specific ERD (Hazardous Waste)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      MODULE 4: HAZARDOUS WASTE ERD                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│ consignment_     │
│ notes            │
├──────────────────┤
│ id (PK)          │
│ company_id (FK)  │
│ site_id (FK)     │
│ reference_number │◀─────────────────────────────────────────────────┐
│ producer_name    │                                                  │
│ carrier_name     │                                                  │
│ consignee_name   │                                                  │
│ collection_date  │                                                  │
│ ewc_codes[]      │                                                  │
│ quantity         │                                                  │
│ quantity_unit    │                                                  │
│ physical_form    │                                                  │
│ status           │                                                  │
│ metadata         │                                                  │
└──────────────────┘                                                  │
         │                                                            │
         │                                                            │
         ▼                                                            │
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ chain_of_        │     │ waste_streams    │     │ chain_break_     │
│ custody_legs     │     ├──────────────────┤     │ alerts           │
├──────────────────┤     │ id (PK)          │     ├──────────────────┤
│ id (PK)          │     │ company_id (FK)  │     │ id (PK)          │
│ consignment_id   │     │ ewc_code         │     │ consignment_id   │
│ (FK)             │     │ description      │     │ (FK)             │───┘
│ leg_number       │     │ hazard_codes[]   │     │ alert_type       │
│ leg_type         │     │ default_         │     │ detected_at      │
│ location_from    │     │ destination      │     │ severity         │
│ location_to      │     │ requires_special │     │ resolved_at      │
│ carrier_at_leg   │     │ _handling        │     │ resolution_notes │
│ handover_date    │     └──────────────────┘     └──────────────────┘
│ handover_        │
│ signatory        │
│ quantity_at_leg  │
│ chain_intact     │
└──────────────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐
│ contractor_      │     │ end_point_       │
│ licences         │     │ proofs           │
├──────────────────┤     ├──────────────────┤
│ id (PK)          │     │ id (PK)          │
│ company_id (FK)  │     │ waste_stream_id  │
│ contractor_name  │     │ (FK)             │
│ registration_    │     │ facility_name    │
│ number           │     │ permit_reference │
│ licence_type     │     │ proof_document_  │
│ expiry_date      │     │ id (FK)          │
│ status           │     │ verified_date    │
└──────────────────┘     └──────────────────┘
```

### 9.3 Review Queue ERD

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           REVIEW QUEUE ERD                                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│ review_queue_    │
│ items            │
├──────────────────┤
│ id (PK)          │
│ obligation_id    │───────────────────┐
│ (FK)             │                   │
│ document_id (FK) │                   │
│ company_id (FK)  │                   │
│ priority         │                   ▼
│ status           │          ┌──────────────────┐
│ trigger_reason   │          │ obligations      │
│ confidence_score │          └──────────────────┘
│ validation_flags │
│ assigned_to (FK) │──────────────────┐
│ assigned_at      │                  │
│ escalated_to (FK)│                  ▼
│ escalated_at     │          ┌──────────────────┐
│ resolved_at      │          │ users            │
│ resolution_type  │          └──────────────────┘
│ resolution_notes │
│ created_at       │
└──────────────────┘
         │
         │
         ▼
┌──────────────────┐     ┌──────────────────┐
│ review_actions   │     │ extraction_      │
├──────────────────┤     │ corrections      │
│ id (PK)          │     ├──────────────────┤
│ review_item_id   │     │ id (PK)          │
│ (FK)             │     │ obligation_id    │
│ action_type      │     │ (FK)             │
│ action_by (FK)   │     │ field_name       │
│ action_at        │     │ original_value   │
│ previous_values  │     │ corrected_value  │
│ new_values       │     │ correction_      │
│ notes            │     │ reason           │
└──────────────────┘     │ corrected_by(FK) │
                         │ corrected_at     │
                         │ fed_back_to_     │
                         │ training         │
                         └──────────────────┘
```

---

## 10. UI Routing Map + Screen List

### 10.1 Document Ingestion Routes

| Route | Page | Description |
|-------|------|-------------|
| `/dashboard/sites/[siteId]/permits/documents` | Document List | View all permits for site |
| `/dashboard/sites/[siteId]/permits/documents/upload` | Upload Document | Upload new permit |
| `/dashboard/sites/[siteId]/permits/documents/[docId]` | Document Detail | View extracted obligations |
| `/dashboard/sites/[siteId]/permits/documents/[docId]/reprocess` | Reprocess | Re-run extraction |
| `/dashboard/sites/[siteId]/permits/obligations` | Obligations List | All obligations for site |
| `/dashboard/sites/[siteId]/permits/obligations/[obligationId]` | Obligation Detail | View/edit obligation |

### 10.2 Module-Specific Routes

| Module | Route Pattern | Pages |
|--------|---------------|-------|
| Module 1 (Permits) | `/dashboard/sites/[siteId]/permits/*` | Documents, Obligations, Deadlines |
| Module 2 (Trade Effluent) | `/dashboard/sites/[siteId]/module-2/*` | Consents, Lab Results, Parameters |
| Module 3 (MCPD) | `/dashboard/sites/[siteId]/module-3/*` | Registrations, Generators, Run Hours |
| Module 4 (Haz Waste) | `/dashboard/module-4/*` | Consignments, Waste Streams, Contractors |

### 10.3 Admin/Review Routes

| Route | Page | Access |
|-------|------|--------|
| `/dashboard/admin/review-queue` | Review Queue | Admin, Reviewer |
| `/dashboard/admin/review-queue/[itemId]` | Review Item | Admin, Reviewer |
| `/dashboard/admin/extraction-logs` | Extraction Logs | Admin |
| `/dashboard/admin/prompt-versions` | Prompt Versions | Admin |
| `/dashboard/admin/jobs` | Background Jobs | Admin |
| `/dashboard/admin/jobs/[jobId]` | Job Detail | Admin |

### 10.4 Screen Component Matrix

| Screen | Components Used |
|--------|-----------------|
| Document Upload | `FileDropzone`, `ProgressBar`, `Toast` |
| Obligation List | `DataTable`, `FilterBar`, `StatusBadge`, `ConfidenceIndicator` |
| Obligation Detail | `Card`, `Badge`, `ConfidenceIndicator`, `EvidenceList`, `Timeline` |
| Review Queue | `DataTable`, `PriorityBadge`, `AssigneeDropdown`, `ActionButtons` |
| Review Item | `SplitView`, `DiffViewer`, `ConfirmDialog`, `TextArea` |
| Extraction Log | `DataTable`, `JSONViewer`, `CostDisplay`, `TokenUsage` |

### 10.5 Complete Page Inventory

```
/dashboard
├── /sites
│   └── /[siteId]
│       ├── /dashboard                 # Site Dashboard
│       ├── /permits
│       │   ├── /documents             # Document List
│       │   │   ├── /upload            # Upload Document
│       │   │   └── /[docId]           # Document Detail
│       │   │       └── /reprocess     # Reprocess Extraction
│       │   └── /obligations           # Obligations List
│       │       └── /[obligationId]    # Obligation Detail
│       │           ├── /edit          # Edit Obligation
│       │           └── /evidence      # Link Evidence
│       ├── /deadlines                 # Deadlines Calendar
│       ├── /evidence                  # Evidence Library
│       │   ├── /upload                # Upload Evidence
│       │   ├── /unlinked              # Unlinked Evidence
│       │   └── /[evidenceId]          # Evidence Detail
│       ├── /module-2                  # Trade Effluent
│       │   ├── /consents              # Consent Documents
│       │   ├── /lab-results           # Lab Results
│       │   ├── /parameters            # Monitored Parameters
│       │   ├── /discharge-volumes     # Volume Tracking
│       │   └── /exceedances           # Exceedance Alerts
│       ├── /module-3                  # MCPD
│       │   ├── /registrations         # MCP Registrations
│       │   ├── /generators            # Generator Inventory
│       │   ├── /run-hours             # Run Hour Logs
│       │   ├── /stack-tests           # Stack Test Results
│       │   ├── /maintenance-records   # Maintenance Logs
│       │   └── /aer                   # Annual Emissions Returns
│       ├── /schedules                 # Schedule Management
│       ├── /packs                     # Audit Packs
│       └── /settings                  # Site Settings
├── /module-4                          # Hazardous Waste (Cross-Site)
│   ├── /consignment-notes             # Consignment Notes
│   │   ├── /new                       # Create Note
│   │   └── /[noteId]                  # Note Detail
│   │       └── /chain-of-custody      # Chain Tracking
│   ├── /waste-streams                 # Waste Stream Config
│   ├── /contractor-licences           # Contractor Management
│   ├── /end-point-proofs              # Disposal Verification
│   ├── /validation-rules              # Validation Rules
│   └── /chain-break-alerts            # Alert Dashboard
├── /admin
│   ├── /review-queue                  # Human Review Queue
│   │   └── /[itemId]                  # Review Item
│   ├── /extraction-logs               # AI Extraction Logs
│   ├── /prompt-versions               # Prompt Version Control
│   ├── /jobs                          # Background Jobs
│   │   └── /[jobId]                   # Job Detail
│   └── /users                         # User Management
├── /compliance-clocks                 # Compliance Timers
├── /packs                             # Cross-Site Audit Packs
├── /reports                           # Reporting Dashboard
└── /settings                          # Account Settings
```

---

## 11. API Contract: Ingestion + Output JSON

### 11.1 Document Upload API

```
POST /api/v1/documents/upload
Content-Type: multipart/form-data
```

**Request:**
```
file: <binary>
site_id: uuid
document_type: ENVIRONMENTAL_PERMIT | TRADE_EFFLUENT_CONSENT | MCPD_REGISTRATION | HAZARDOUS_WASTE_CONSIGNMENT
regulator?: EA | SEPA | NRW | NIEA
water_company?: THAMES_WATER | SEVERN_TRENT | ...
auto_process: boolean
```

**Response (201 Created):**
```json
{
  "id": "uuid",
  "status": "PENDING",
  "original_filename": "permit_v2.pdf",
  "storage_path": "documents/uuid/permit_v2.pdf",
  "file_size_bytes": 2048576,
  "mime_type": "application/pdf",
  "created_at": "2025-02-01T10:00:00Z",
  "processing_job_id": "job_uuid"
}
```

### 11.2 Extraction Status API

```
GET /api/v1/documents/{documentId}/extraction-status
```

**Response:**
```json
{
  "document_id": "uuid",
  "extraction_status": "COMPLETED",
  "prompt_id": "EA-ENV-INGEST-001",
  "prompt_version": "1.3",
  "extraction_started_at": "2025-02-01T10:00:05Z",
  "extraction_completed_at": "2025-02-01T10:00:35Z",
  "processing_time_ms": 30000,
  "token_usage": {
    "input_tokens": 15000,
    "output_tokens": 3000,
    "total_tokens": 18000
  },
  "cost_usd": 0.27,
  "obligations_extracted": 15,
  "obligations_requiring_review": 2,
  "validation_flags": [
    "CROSS_REFERENCE_UNRESOLVED"
  ]
}
```

### 11.3 Obligations List API

```
GET /api/v1/documents/{documentId}/obligations
```

**Response:**
```json
{
  "document_id": "uuid",
  "obligations": [
    {
      "id": "uuid",
      "condition_reference": "2.1.1",
      "obligation_title": "Emission monitoring",
      "original_text": "The operator shall monitor...",
      "original_text_welsh": null,
      "condition_types": ["MONITORING", "REPORTING"],
      "category": "MONITORING",
      "frequency": "MONTHLY",
      "deadline_date": null,
      "deadline_relative": "Within 14 days of month end",
      "confidence": {
        "score": 0.85,
        "rationale": "Deduction: -0.10 for conditional text; -0.05 for relative deadline",
        "human_review_required": false
      },
      "evidence_suggestions": [
        "Monitoring report",
        "Calibration records"
      ],
      "review_status": "PENDING",
      "status": "PENDING",
      "metadata": {
        "threshold_value": "100",
        "threshold_unit": "mg/Nm³",
        "page_reference": 12
      }
    }
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "per_page": 20,
    "total_pages": 1
  }
}
```

### 11.4 Extraction Result Full Schema

```typescript
// API Response Schema: Full Extraction Result

interface ExtractionResult {
  extraction_metadata: {
    prompt_id: string;
    prompt_version: string;
    extraction_timestamp: string; // ISO 8601
    document_hash: string; // SHA-256
    regulator: 'EA' | 'SEPA' | 'NRW' | 'NIEA' | null;
    water_company: string | null;
    jurisdiction: 'ENGLAND' | 'WALES' | 'SCOTLAND' | 'NORTHERN_IRELAND';
    document_language?: 'EN' | 'CY' | 'BILINGUAL';
  };

  permit_data?: {
    permit_reference: string;
    operator_name: string;
    site_name: string;
    site_address: string;
    grid_reference?: string;
    issue_date: string; // ISO 8601 date
    effective_date?: string;
    expiry_date?: string | null;
    review_date?: string | null;
    permit_type: string;
    // Jurisdiction-specific
    ccs_band?: string; // EA
    nrw_banding?: 'A' | 'B' | 'C'; // NRW
    sepa_region?: 'NORTH' | 'EAST' | 'WEST'; // SEPA
    local_council?: string; // NIEA
    installation_subdivision?: 'PART_A1' | 'PART_A2' | 'PART_B'; // NIEA
    cas_status?: 'WITHDRAWN'; // SEPA
  };

  mcpd_data?: {
    plant_category: 'EXISTING_MCP' | 'NEW_MCP' | 'SPECIFIED_GENERATOR';
    thermal_input_mw: number;
    fuel_type: ('GAS' | 'LIQUID' | 'SOLID' | 'DUAL_FUEL' | 'MULTI_FUEL')[];
    operating_hours_limit?: number | null;
    emission_limits: {
      nox_mg_nm3?: number | null;
      so2_mg_nm3?: number | null;
      dust_mg_nm3?: number | null;
    };
    compliance_date: string;
    bat_reference?: string | null;
  };

  trade_effluent_data?: {
    consent_reference: string;
    max_daily_volume: number;
    max_rate?: number | null;
    discharge_hours: string;
    receiving_sewage_works: string;
    mogden_values?: {
      ot?: number | null;
      os?: number | null;
      st?: number | null;
      ss?: number | null;
    };
  };

  hazardous_waste_data?: {
    consignment_code: string;
    producer_premises_code: string;
    carrier_registration: string;
    consignee_permit: string;
    ewc_codes: string[];
    hazard_codes: string[];
    quantity: number;
    quantity_unit: 'TONNES' | 'KILOGRAMS' | 'LITRES' | 'CUBIC_METRES';
    physical_form: 'SOLID' | 'LIQUID' | 'SLUDGE' | 'POWDER' | 'GAS' | 'MIXED';
    cross_border?: boolean;
    transfrontier?: boolean;
  };

  conditions: Condition[];

  chain_of_custody?: ChainOfCustodyLeg[];

  validation_flags: string[];
  human_review_required: boolean;
}

interface Condition {
  condition_id: string;
  condition_text: string;
  condition_text_welsh?: string | null;
  condition_type: ConditionType[];
  frequency?: string | null;
  deadline?: string | null; // ISO 8601 date
  threshold_value?: string | null;
  threshold_unit?: string | null;
  linked_evidence_type: string[];
  confidence_score: number;
  confidence_rationale: string;
}

type ConditionType =
  | 'EMISSION_LIMIT' | 'MONITORING' | 'REPORTING' | 'OPERATIONAL_LIMIT'
  | 'FUEL_SPECIFICATION' | 'MAINTENANCE' | 'RECORD_KEEPING' | 'NOTIFICATION'
  | 'STACK_HEIGHT' | 'DISPERSION_MODELLING' | 'AGGREGATION_RULE'
  | 'OPERATING_HOURS' | 'TRIAD_RESPONSE' | 'BAT_REQUIREMENT'
  | 'IMPROVEMENT_PROGRAMME' | 'SITE_PROTECTION' | 'CLOSURE'
  | 'FINANCIAL_PROVISION' | 'INCIDENT_MANAGEMENT' | 'GENERAL_MANAGEMENT'
  | 'TRAINING' | 'VOLUME_LIMIT' | 'FLOW_RATE' | 'DISCHARGE_HOURS'
  | 'TEMPERATURE' | 'PH_LIMIT' | 'COD_LIMIT' | 'BOD_LIMIT'
  | 'SUSPENDED_SOLIDS' | 'OIL_GREASE' | 'HEAVY_METALS' | 'SPECIFIC_SUBSTANCE'
  | 'PROHIBITED_SUBSTANCE' | 'SAMPLING' | 'PRE_TREATMENT' | 'METERING'
  | 'ACCESS_PROVISION' | 'EMERGENCY_PROCEDURE' | 'DUTY_OF_CARE'
  | 'WASTE_CLASSIFICATION' | 'PACKAGING' | 'LABELLING' | 'TRANSPORT'
  | 'STORAGE' | 'DOCUMENTATION' | 'QUARTERLY_RETURN' | 'REJECTION_HANDLING'
  | 'CARRIER_REGISTRATION' | 'BROKER_REGISTRATION' | 'FACILITY_PERMIT'
  | 'TRANSFRONTIER' | 'CONSIGNMENT_COMPLETION' | 'CHAIN_OF_CUSTODY'
  | 'PRE_NOTIFICATION' | 'RECOVERY_OPERATION' | 'DISPOSAL_OPERATION'
  | 'ANNUAL_REPORTING';

interface ChainOfCustodyLeg {
  leg_number: number;
  leg_type: 'COLLECTION' | 'TRANSFER' | 'DELIVERY';
  location_from: string;
  location_to: string;
  carrier_at_leg: string;
  handover_date: string; // ISO 8601
  handover_signatory: string;
  quantity_at_leg: number;
  chain_intact: boolean;
  confidence_score: number;
  confidence_rationale: string;
}
```

### 11.5 Review Queue API

```
GET /api/v1/review-queue
POST /api/v1/review-queue/{itemId}/confirm
POST /api/v1/review-queue/{itemId}/edit
POST /api/v1/review-queue/{itemId}/reject
```

**Confirm Request:**
```json
{
  "notes": "Verified against source document"
}
```

**Edit Request:**
```json
{
  "changes": {
    "obligation_title": "Updated title",
    "frequency": "QUARTERLY",
    "metadata": {
      "threshold_value": "150"
    }
  },
  "correction_reason": "Threshold value was misread from OCR"
}
```

**Reject Request:**
```json
{
  "reason": "DUPLICATE",
  "notes": "Already captured in condition 2.1.2"
}
```

---

## 12. File Naming + Module Packaging Strategy

### 12.1 Ingestion Prompt File Structure

```
docs/
└── ingestion_prompts/
    ├── Prompt_Index_v2.0.md
    ├── Source_Registry_v2.0.md
    ├── Implementation_Blueprint_v1.0.md
    ├── environmental_permits/
    │   ├── EA-ENV-INGEST-001_v1.3.md
    │   ├── NRW-ENV-INGEST-001_v1.3.md
    │   ├── SEPA-ENV-INGEST-001_v1.3.md
    │   └── NIEA-ENV-INGEST-001_v1.3.md
    ├── mcpd/
    │   ├── EA-MCPD-INGEST-001_v1.4.md
    │   ├── NRW-MCPD-INGEST-001_v1.5.md
    │   ├── SEPA-MCPD-INGEST-001_v1.6.md
    │   └── NIEA-MCPD-INGEST-001_v1.6.md
    ├── hazardous_waste/
    │   ├── EA-HW-INGEST-001_v1.4.md
    │   ├── NRW-HW-INGEST-001_v1.4.md
    │   ├── SEPA-SW-INGEST-001_v1.4.md
    │   └── NIEA-HW-INGEST-001_v1.4.md
    └── trade_effluent/
        ├── TW-TE-INGEST-001_v1.3.md
        ├── ST-TE-INGEST-001_v1.3.md
        ├── UU-TE-INGEST-001_v1.3.md
        ├── AW-TE-INGEST-001_v1.3.md
        ├── YW-TE-INGEST-001_v1.3.md
        ├── NW-TE-INGEST-001_v1.3.md
        ├── SW-TE-INGEST-001_v1.3.md
        ├── SWW-TE-INGEST-001_v1.3.md
        ├── WX-TE-INGEST-001_v1.3.md
        ├── DC-TE-INGEST-001_v1.4.md
        └── SCW-TE-INGEST-001_v1.5.md
```

### 12.2 Library Code Structure

```
lib/
├── ai/
│   ├── document-processor.ts      # Main extraction orchestrator
│   ├── openai-client.ts           # OpenAI API wrapper
│   ├── prompts.ts                 # Prompt loader + templates
│   ├── prompt-selector.ts         # Jurisdiction-based selection
│   ├── extraction-cache.ts        # Result caching
│   ├── inference-barriers.ts      # Anti-inference validation
│   ├── confidence-calculator.ts   # Score calculation
│   ├── model-router.ts            # Model selection logic
│   └── extraction-strategies/
│       ├── environmental-permit.ts
│       ├── mcpd.ts
│       ├── hazardous-waste.ts
│       └── trade-effluent.ts
├── validation/
│   ├── schemas.ts                 # Zod schemas
│   ├── middleware.ts              # Validation middleware
│   ├── jurisdiction-rules.ts      # Jurisdiction-specific rules
│   └── ewc-validator.ts           # EWC code validation
├── services/
│   ├── jurisdiction-service.ts    # Postcode → jurisdiction
│   ├── reference-data-service.ts  # STW, carrier lookup
│   ├── chain-custody-service.ts   # Chain of custody logic
│   └── review-queue-service.ts    # Review workflow
├── jobs/
│   ├── document-processing-job.ts # Main extraction job
│   ├── extraction-validation-job.ts
│   ├── review-assignment-job.ts
│   └── escalation-check-job.ts
└── queue/
    ├── queue-manager.ts           # BullMQ manager
    └── queue-definitions.ts       # Queue configs
```

### 12.3 Component Structure

```
components/
├── ui/
│   ├── confidence-indicator.tsx
│   ├── status-badge.tsx
│   ├── priority-badge.tsx
│   └── jurisdiction-badge.tsx
├── documents/
│   ├── document-upload-form.tsx
│   ├── document-list.tsx
│   ├── document-detail.tsx
│   └── extraction-status.tsx
├── obligations/
│   ├── obligation-list.tsx
│   ├── obligation-detail.tsx
│   ├── obligation-edit-form.tsx
│   ├── condition-type-badges.tsx
│   └── evidence-linking.tsx
├── review/
│   ├── review-queue-table.tsx
│   ├── review-item-detail.tsx
│   ├── review-actions.tsx
│   └── diff-viewer.tsx
└── module-4/
    ├── consignment-form.tsx
    ├── chain-custody-viewer.tsx
    ├── chain-break-alert.tsx
    └── ewc-code-selector.tsx
```

### 12.4 Database Migration Naming

```
supabase/migrations/
├── 20250205000001_add_condition_type_array.sql
├── 20250205000002_add_welsh_text_fields.sql
├── 20250205000003_add_chain_custody_tables.sql
├── 20250205000004_add_review_queue_tables.sql
├── 20250205000005_add_extraction_logs_cost_tracking.sql
├── 20250205000006_add_jurisdiction_config_function.sql
└── 20250205000007_add_prompt_version_tracking.sql
```

### 12.5 API Route Structure

```
app/api/v1/
├── documents/
│   ├── route.ts                   # GET (list), POST (upload)
│   └── [documentId]/
│       ├── route.ts               # GET, PATCH, DELETE
│       ├── extraction-status/
│       │   └── route.ts           # GET extraction status
│       ├── obligations/
│       │   └── route.ts           # GET obligations for doc
│       └── reprocess/
│           └── route.ts           # POST reprocess
├── obligations/
│   ├── route.ts                   # GET (list)
│   └── [obligationId]/
│       ├── route.ts               # GET, PATCH, DELETE
│       ├── confidence/
│       │   └── route.ts           # GET confidence breakdown
│       └── evidence/
│           └── route.ts           # POST link, DELETE unlink
├── review-queue/
│   ├── route.ts                   # GET (list)
│   ├── stats/
│   │   └── route.ts               # GET queue stats
│   └── [itemId]/
│       ├── route.ts               # GET item
│       ├── confirm/
│       │   └── route.ts           # POST confirm
│       ├── edit/
│       │   └── route.ts           # POST edit
│       └── reject/
│           └── route.ts           # POST reject
└── admin/
    ├── extraction-logs/
    │   └── route.ts               # GET logs
    └── prompt-versions/
        └── route.ts               # GET versions
```

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| v1.0 | 2025-02-01 | System | Initial release |

---

**END OF DOCUMENT**
