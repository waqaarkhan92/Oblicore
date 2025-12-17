# EcoComply Regulatory Methodology Handbook v2.0
## Document Ingestion Methodology Specification

**Document ID:** Methodology_Ingestion_v1.0.md
**Version:** 1.0
**Effective Date:** 2025-12-05
**Status:** APPROVED — FROZEN
**Scope:** All 23 Ingestion Prompts across 4 Modules

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Scope and Applicability](#2-scope-and-applicability)
3. [The 15-Step Ingestion Process](#3-the-15-step-ingestion-process)
4. [Condition → Obligation → Evidence Relationships](#4-condition--obligation--evidence-relationships)
5. [Confidence Scoring Rules and Deduction Mechanisms](#5-confidence-scoring-rules-and-deduction-mechanisms)
6. [Zero-Invention and Anti-Inference Safeguards](#6-zero-invention-and-anti-inference-safeguards)
7. [Source Registry Lookup Process](#7-source-registry-lookup-process)
8. [Versioning Governance](#8-versioning-governance)
9. [Multi-Regulator Divergence Management](#9-multi-regulator-divergence-management)
10. [Multi-Language Field Handling (Wales)](#10-multi-language-field-handling-wales)
11. [Appendix A: Schema Diagrams](#appendix-a-schema-diagrams)
12. [Appendix B: ENUM Reference Tables](#appendix-b-enum-reference-tables)
13. [Appendix C: Source Registry Master List](#appendix-c-source-registry-master-list)

---

## 1. Executive Summary

This document defines the formal ingestion methodology for extracting regulatory obligations from environmental compliance documents across four modules:

| Module | Document Types | Regulators/Authorities |
|--------|----------------|------------------------|
| **Module 1: Environmental Permits** | Permits, Variations, Surrenders | EA, NRW, SEPA, NIEA |
| **Module 2: Trade Effluent** | Consents, Agreements | 11 Water Companies |
| **Module 3: MCPD** | Registrations, Notifications | EA, NRW, SEPA, NIEA |
| **Module 4: Hazardous/Special Waste** | Consignment Notes, Registrations | EA, NRW, SEPA, NIEA |

### Core Principles

1. **Zero-Invention Policy**: Extract only what is explicitly stated in source documents
2. **Anti-Inference Safeguards**: Never derive compliance scores, bands, or unstated obligations
3. **Jurisdictional Separation**: Maintain distinct regulatory frameworks without cross-contamination
4. **Source Traceability**: Every extracted field must reference its authoritative source
5. **Confidence Transparency**: All uncertainty is quantified and escalated

---

## 2. Scope and Applicability

### 2.1 Document Types Covered

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        DOCUMENT INGESTION SCOPE                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  MODULE 1: ENVIRONMENTAL PERMITS                                        │
│  ├── Bespoke Permits (Installation, Waste, Water Discharge)            │
│  ├── Standard Rules Permits                                             │
│  ├── Permit Variations                                                  │
│  ├── Permit Transfers                                                   │
│  ├── Permit Surrenders                                                  │
│  └── Enforcement Notices                                                │
│                                                                         │
│  MODULE 2: TRADE EFFLUENT                                               │
│  ├── Trade Effluent Consents                                            │
│  ├── Temporary Consents                                                 │
│  ├── Consent Variations                                                 │
│  └── Charging Agreements                                                │
│                                                                         │
│  MODULE 3: MCPD (1-50MW)                                                │
│  ├── Generator Registrations                                            │
│  ├── Specified Generator Notifications                                  │
│  ├── Permit Variations (MCPD conditions)                                │
│  └── Emission Limit Value Schedules                                     │
│                                                                         │
│  MODULE 4: HAZARDOUS/SPECIAL WASTE                                      │
│  ├── Consignment Notes (Single/Multiple)                                │
│  ├── Premises Registration Certificates                                 │
│  ├── Carrier/Broker Registrations                                       │
│  └── Pre-notification Records (Scotland/NI only)                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Jurisdictional Coverage

| Jurisdiction | Regulator | Applicable Modules |
|--------------|-----------|-------------------|
| England | Environment Agency (EA) | 1, 2*, 3, 4 |
| Wales | Natural Resources Wales (NRW) | 1, 2*, 3, 4 |
| Scotland | Scottish Environment Protection Agency (SEPA) | 1, 2*, 3, 4 |
| Northern Ireland | Northern Ireland Environment Agency (NIEA) | 1, 2*, 3, 4 |

*Module 2 regulated by Water Companies, not environmental regulators

### 2.3 Prompt Inventory

| Module | Prompts | Current Versions |
|--------|---------|------------------|
| Environmental Permits | 4 | EA v1.3, NRW v1.3, SEPA v1.3, NIEA v1.3 |
| Trade Effluent | 11 | v1.3-v1.5 |
| MCPD | 4 | EA v1.4, NRW v1.5, SEPA v1.6, NIEA v1.6 |
| Hazardous/Special Waste | 4 | v1.4 each |
| **Total** | **23** | |

---

## 3. The 15-Step Ingestion Process

### 3.1 Process Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     15-STEP DOCUMENT INGESTION PROCESS                      │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────┐
    │   SOURCE    │
    │  DOCUMENT   │
    └──────┬──────┘
           │
           ▼
┌──────────────────────┐
│ STEP 1: INTAKE       │──────────────────────────────────────────────────────┐
│ Document Receipt     │                                                       │
└──────────┬───────────┘                                                       │
           │                                                                   │
           ▼                                                                   │
┌──────────────────────┐                                                       │
│ STEP 2: CLASSIFY     │                                                       │
│ Module & Regulator   │                                                       │
└──────────┬───────────┘                                                       │
           │                                                                   │
           ▼                                                                   │
┌──────────────────────┐     ┌─────────────────────┐                          │
│ STEP 3: SELECT       │────▶│ PROMPT LIBRARY      │                          │
│ Ingestion Prompt     │     │ (23 prompts)        │                          │
└──────────┬───────────┘     └─────────────────────┘                          │
           │                                                                   │
           ▼                                                                   │
┌──────────────────────┐     ┌─────────────────────┐                          │
│ STEP 4: VALIDATE     │────▶│ SOURCE REGISTRY     │                          │
│ Source Authority     │     │ (Authority lookup)  │                          │
└──────────┬───────────┘     └─────────────────────┘                          │
           │                                                                   │
           ▼                                                                   │
┌──────────────────────┐                                                       │
│ STEP 5: EXTRACT      │                                                       │
│ Metadata Fields      │                                                       │
└──────────┬───────────┘                                                       │
           │                                                                   │
           ▼                                                                   │
┌──────────────────────┐                                                       │
│ STEP 6: EXTRACT      │                                                       │
│ Conditions           │                                                       │
└──────────┬───────────┘                                                       │
           │                                                                   │
           ▼                                                                   │
┌──────────────────────┐     ┌─────────────────────┐                          │
│ STEP 7: CLASSIFY     │────▶│ CONDITION_TYPE      │                          │
│ Condition Types      │     │ ENUM (21 values)    │                          │
└──────────┬───────────┘     └─────────────────────┘                          │
           │                                                                   │
           ▼                                                                   │
┌──────────────────────┐                                                       │
│ STEP 8: DERIVE       │                                                       │
│ Obligations          │                                                       │
└──────────┬───────────┘                                                       │
           │                                                                   │
           ▼                                                                   │
┌──────────────────────┐                                                       │
│ STEP 9: IDENTIFY     │                                                       │
│ Evidence Reqmts      │                                                       │
└──────────┬───────────┘                                                       │
           │                                                                   │
           ▼                                                                   │
┌──────────────────────┐     ┌─────────────────────┐                          │
│ STEP 10: APPLY       │────▶│ VALIDATION RULES    │                          │
│ Validation Rules     │     │ (per prompt)        │                          │
└──────────┬───────────┘     └─────────────────────┘                          │
           │                                                                   │
           ▼                                                                   │
┌──────────────────────┐     ┌─────────────────────┐                          │
│ STEP 11: APPLY       │────▶│ ANTI-INFERENCE      │                          │
│ Anti-Inference       │     │ RULES               │                          │
└──────────┬───────────┘     └─────────────────────┘                          │
           │                                                                   │
           ▼                                                                   │
┌──────────────────────┐     ┌─────────────────────┐                          │
│ STEP 12: CALCULATE   │────▶│ CONFIDENCE          │◀──────────────────────────┘
│ Confidence Scores    │     │ SCORING MATRIX      │    (Feedback from all steps)
└──────────┬───────────┘     └─────────────────────┘
           │
           ▼
┌──────────────────────┐
│ STEP 13: ESCALATE    │────────┐
│ Low Confidence       │        │ IF escalation_required = true
└──────────┬───────────┘        │
           │                    ▼
           │            ┌─────────────────────┐
           │            │ HUMAN REVIEW QUEUE  │
           │            └─────────────────────┘
           ▼
┌──────────────────────┐
│ STEP 14: ASSEMBLE    │
│ Output JSON          │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ STEP 15: PERSIST     │
│ to Database          │
└──────────────────────┘
```

### 3.2 Detailed Step Definitions

#### STEP 1: INTAKE — Document Receipt

**Purpose:** Receive and register the source document for processing.

**Inputs:**
- Document file (PDF, image, or structured data)
- Submission metadata (upload timestamp, user ID, batch ID)

**Process:**
1. Generate unique `document_id` (UUID v4)
2. Calculate document hash (SHA-256) for deduplication
3. Extract basic file metadata (format, page count, file size)
4. Check for duplicate submissions via hash lookup
5. Queue for classification

**Outputs:**
```json
{
  "document_id": "uuid-v4",
  "file_hash": "sha256-hash",
  "file_format": "PDF|IMAGE|JSON",
  "page_count": 12,
  "intake_timestamp": "2025-12-05T10:30:00Z",
  "status": "PENDING_CLASSIFICATION"
}
```

---

#### STEP 2: CLASSIFY — Module & Regulator Identification

**Purpose:** Determine which module and regulator the document belongs to.

**Classification Matrix:**

| Document Indicators | Module | Regulator Detection |
|---------------------|--------|---------------------|
| "Environmental Permit", "EPR" reference | Module 1 | Header/letterhead |
| "Trade Effluent Consent", water company name | Module 2 | Company name |
| "MCPD", "Medium Combustion Plant", "MCP/" reference | Module 3 | Registration prefix |
| "Consignment Note", "Hazardous Waste", "Special Waste" | Module 4 | Form type/regulator |

**Regulator Detection Rules:**

```
IF document contains "Environment Agency" OR postcode starts with [non-Wales English regions]:
  regulator = "EA"
  jurisdiction = "ENGLAND"

IF document contains "Natural Resources Wales" OR "Cyfoeth Naturiol Cymru" OR postcode starts with [LL, LD, CF, SA, NP, SY1-SY11]:
  regulator = "NRW"
  jurisdiction = "WALES"

IF document contains "SEPA" OR "Scottish Environment Protection Agency" OR postcode starts with [AB, DD, DG, EH, FK, G, HS, IV, KA, KW, KY, ML, PA, PH, TD, ZE]:
  regulator = "SEPA"
  jurisdiction = "SCOTLAND"

IF document contains "NIEA" OR "Northern Ireland Environment Agency" OR postcode starts with "BT":
  regulator = "NIEA"
  jurisdiction = "NORTHERN_IRELAND"
```

**Outputs:**
```json
{
  "module": "ENV_PERMIT|TRADE_EFFLUENT|MCPD|HAZARDOUS_WASTE",
  "regulator": "EA|NRW|SEPA|NIEA|[WATER_COMPANY]",
  "jurisdiction": "ENGLAND|WALES|SCOTLAND|NORTHERN_IRELAND",
  "classification_confidence": 0.95,
  "classification_method": "HEADER_MATCH|POSTCODE|CONTENT_ANALYSIS"
}
```

---

#### STEP 3: SELECT — Ingestion Prompt Selection

**Purpose:** Select the appropriate ingestion prompt based on classification.

**Prompt Selection Logic:**

```
prompt_id = {module_code}-{regulator_code}-INGEST-001

LOOKUP prompt_library WHERE:
  module = classified_module
  AND regulator = classified_regulator
  AND status = "ACTIVE"

RETURN prompt with highest version number
```

**Prompt Selection Matrix:**

| Module | EA | NRW | SEPA | NIEA |
|--------|----|----|------|------|
| Environmental Permits | EA-ENV-INGEST-001 v1.3 | NRW-ENV-INGEST-001 v1.3 | SEPA-ENV-INGEST-001 v1.3 | NIEA-ENV-INGEST-001 v1.3 |
| MCPD | EA-MCPD-INGEST-001 v1.4 | NRW-MCPD-INGEST-001 v1.5 | SEPA-MCPD-INGEST-001 v1.6 | NIEA-MCPD-INGEST-001 v1.6 |
| Hazardous/Special Waste | EA-HW-INGEST-001 v1.4 | NRW-HW-INGEST-001 v1.4 | SEPA-SW-INGEST-001 v1.4 | NIEA-HW-INGEST-001 v1.4 |

| Trade Effluent | Thames | Severn Trent | United Utilities | Anglian | Yorkshire |
|----------------|--------|--------------|------------------|---------|-----------|
| Prompt | TW-TE v1.3 | ST-TE v1.3 | UU-TE v1.3 | AW-TE v1.3 | YW-TE v1.3 |

| Trade Effluent | Northumbrian | Southern | South West | Wessex | Dŵr Cymru | Scottish Water |
|----------------|--------------|----------|------------|--------|-----------|----------------|
| Prompt | NW-TE v1.3 | SW-TE v1.3 | SWW-TE v1.3 | WX-TE v1.3 | DC-TE v1.4 | SCW-TE v1.5 |

---

#### STEP 4: VALIDATE — Source Authority Verification

**Purpose:** Verify document authenticity and authoritative source.

**Validation Checks:**

1. **Regulator Branding Verification**
   - Logo presence and position
   - Letterhead format
   - Official document reference format

2. **Reference Format Validation**
   ```
   EA Environmental Permits: EPR/[A-Z]{2}[0-9]{4}[A-Z]{2}
   NRW Environmental Permits: EPR/[A-Z]{2}[0-9]{4}[A-Z]{2} OR Welsh format
   SEPA PPC Permits: PPC/[A-Z]/[0-9]{6}
   NIEA Permits: [A-Z]{2,3}/[0-9]{4,6}
   MCPD Registrations: MCP/[REGULATOR]/[REGION]/[NUMBER]
   ```

3. **Source Registry Lookup**
   - Match document type to registered authority sources
   - Validate issuing authority credentials
   - Check document date against authority operating periods

**Outputs:**
```json
{
  "source_validated": true,
  "authority_source_id": "[EA-001]",
  "validation_checks_passed": ["LOGO", "REFERENCE_FORMAT", "DATE_RANGE"],
  "validation_checks_failed": [],
  "authenticity_score": 0.98
}
```

---

#### STEP 5: EXTRACT — Metadata Fields

**Purpose:** Extract document-level metadata fields.

**Common Metadata Schema:**

```json
{
  "document_metadata": {
    "permit_reference": "string",
    "permit_reference_source": "string",
    "document_type": "PERMIT|VARIATION|CONSENT|REGISTRATION|CONSIGNMENT",
    "issue_date": "date",
    "issue_date_source": "string",
    "effective_date": "date",
    "expiry_date": "date|null",
    "review_date": "date|null",
    "issuing_authority": "string",
    "site_name": "string",
    "site_name_welsh": "string|null",
    "site_address": "object",
    "operator_name": "string",
    "operator_company_number": "string|null",
    "grid_reference": "string",
    "postcode": "string"
  }
}
```

**Extraction Rules:**
- Extract verbatim text only
- Populate `*_source` field with page/section reference
- Apply date format normalisation (ISO 8601)
- Mark fields as `null` if not present (do not infer)

---

#### STEP 6: EXTRACT — Conditions

**Purpose:** Extract individual conditions/requirements from the document.

**Condition Extraction Process:**

```
FOR EACH numbered condition/clause in document:
  1. Extract condition_number (preserve original numbering)
  2. Extract condition_text (verbatim, preserve formatting)
  3. Extract any tables/limits within condition
  4. Identify cross-references to other conditions
  5. Note any schedules/annexes referenced
  6. Record page number and position
```

**Condition Schema:**

```json
{
  "condition": {
    "condition_id": "uuid",
    "condition_number": "2.3.1",
    "condition_text": "The operator shall...",
    "condition_text_welsh": "Rhaid i'r gweithredwr...",
    "page_reference": 12,
    "section_reference": "Schedule 1",
    "tables": [],
    "cross_references": ["2.1.1", "3.4.2"],
    "annexes_referenced": ["Annex A"]
  }
}
```

---

#### STEP 7: CLASSIFY — Condition Types

**Purpose:** Assign condition type classifications using the standardised ENUM array.

**Condition Type ENUM (21 values):**

```
OPERATIONAL           - Day-to-day operational requirements
EMISSION_LIMIT        - Numeric emission/discharge limits
MONITORING            - Sampling, measurement, analysis requirements
REPORTING             - Periodic or event-based reporting obligations
RECORD_KEEPING        - Documentation and retention requirements
NOTIFICATION          - Regulator notification triggers
IMPROVEMENT           - Time-bound improvement programmes
PRE_OPERATIONAL       - Pre-commencement requirements
CESSATION             - Closure and decommissioning requirements
FINANCIAL_PROVISION   - Financial security/guarantee requirements
SITE_PROTECTION       - Baseline/site condition requirements
MANAGEMENT_SYSTEM     - EMS/quality system requirements
WASTE_ACCEPTANCE      - Waste acceptance criteria
WASTE_HANDLING        - Waste storage/treatment requirements
POLLUTION_PREVENTION  - Containment/prevention measures
RESOURCE_EFFICIENCY   - Resource use/efficiency requirements
ACCIDENT_MANAGEMENT   - Emergency/contingency requirements
NOISE_VIBRATION       - Noise and vibration limits
ODOUR                 - Odour management requirements
CLIMATE_ADAPTATION    - Climate resilience requirements
BAT_REQUIREMENT       - Best Available Techniques requirements
```

**Classification Rules:**

```
condition_type is ARRAY (allows multi-classification)

APPLY keyword matching:
  "shall monitor" → MONITORING
  "shall report" → REPORTING
  "shall record" → RECORD_KEEPING
  "shall notify" → NOTIFICATION
  "emission limit" OR "ELV" OR "mg/Nm³" → EMISSION_LIMIT
  "BAT" OR "Best Available Techniques" → BAT_REQUIREMENT
  ...

IF multiple keywords match:
  INCLUDE all matching types in array

IF no keywords match:
  SET condition_type = ["OPERATIONAL"]
  FLAG for manual review
```

**Example Multi-Classification:**

```json
{
  "condition_number": "3.2.1",
  "condition_text": "The operator shall continuously monitor NOx emissions and submit quarterly reports to the Agency.",
  "condition_type": ["MONITORING", "REPORTING", "EMISSION_LIMIT"]
}
```

---

#### STEP 8: DERIVE — Obligations

**Purpose:** Transform conditions into actionable obligations.

**Obligation Derivation Rules:**

```
FOR EACH condition:
  IF condition contains temporal requirement (frequency, deadline):
    CREATE obligation with recurrence schedule

  IF condition contains numeric limit:
    CREATE obligation with limit_value, limit_unit, limit_type

  IF condition contains action verb ("shall", "must", "will"):
    CREATE obligation with action_required

  SET obligation.source_condition_id = condition.condition_id
  SET obligation.source_document_id = document.document_id
```

**Obligation Schema:**

```json
{
  "obligation": {
    "obligation_id": "uuid",
    "source_condition_id": "uuid",
    "source_document_id": "uuid",
    "obligation_type": "condition_type[]",
    "description": "string",
    "action_required": "string",
    "frequency": "CONTINUOUS|DAILY|WEEKLY|MONTHLY|QUARTERLY|ANNUAL|AD_HOC|ONE_TIME",
    "deadline": "date|null",
    "recurrence_rule": "RRULE string|null",
    "limit_value": "number|null",
    "limit_unit": "string|null",
    "limit_type": "MAX|MIN|RANGE|AVERAGE",
    "responsible_party": "OPERATOR|REGULATOR|THIRD_PARTY",
    "evidence_required": "boolean",
    "evidence_type": "string[]"
  }
}
```

---

#### STEP 9: IDENTIFY — Evidence Requirements

**Purpose:** Determine what evidence is needed to demonstrate obligation compliance.

**Evidence Identification Rules:**

```
IF obligation_type INCLUDES "MONITORING":
  evidence_type += ["MONITORING_DATA", "CALIBRATION_RECORDS"]

IF obligation_type INCLUDES "REPORTING":
  evidence_type += ["SUBMITTED_REPORT", "ACKNOWLEDGEMENT"]

IF obligation_type INCLUDES "RECORD_KEEPING":
  evidence_type += ["LOG_ENTRIES", "SIGNED_RECORDS"]

IF obligation_type INCLUDES "NOTIFICATION":
  evidence_type += ["NOTIFICATION_COPY", "DELIVERY_CONFIRMATION"]

IF obligation_type INCLUDES "EMISSION_LIMIT":
  evidence_type += ["LAB_ANALYSIS", "MCERTS_CERTIFICATE"]
```

**Evidence Schema:**

```json
{
  "evidence_requirement": {
    "evidence_id": "uuid",
    "obligation_id": "uuid",
    "evidence_type": "MONITORING_DATA|LAB_ANALYSIS|REPORT|CERTIFICATE|LOG|PHOTOGRAPH|...",
    "description": "string",
    "retention_period_years": "number",
    "format_requirements": "string[]",
    "chain_of_custody_required": "boolean"
  }
}
```

---

#### STEP 10: APPLY — Validation Rules

**Purpose:** Apply prompt-specific validation rules to ensure data integrity.

**Validation Rule Categories:**

| Category | Rule Type | Example |
|----------|-----------|---------|
| Format | Regex match | Permit reference format |
| Range | Numeric bounds | Thermal input 1-50MW for MCPD |
| Enumeration | ENUM membership | condition_type values |
| Cross-field | Field relationship | review_date < expiry_date |
| Completeness | Required fields | site_address mandatory |
| Coherence | Logical consistency | consent_status vs expiry_date |

**Validation Execution:**

```
FOR EACH validation_rule IN selected_prompt.validation_rules:
  result = EVALUATE(rule, extracted_data)

  IF result = FAIL:
    IF rule.severity = "REJECT":
      ABORT ingestion
      LOG error
    ELIF rule.severity = "FLAG":
      ADD to review_flags
      CONTINUE
    ELIF rule.severity = "WARN":
      LOG warning
      CONTINUE
```

---

#### STEP 11: APPLY — Anti-Inference Safeguards

**Purpose:** Ensure no invented or inferred data enters the system.

**Anti-Inference Rule Application:**

See [Section 6](#6-zero-invention-and-anti-inference-safeguards) for complete rule set.

```
FOR EACH anti_inference_rule IN selected_prompt.anti_inference_rules:
  violation = CHECK(rule, extracted_data, derivation_log)

  IF violation DETECTED:
    REJECT affected field
    LOG violation with rule_id
    SET escalation_required = true
```

---

#### STEP 12: CALCULATE — Confidence Scores

**Purpose:** Quantify extraction reliability and uncertainty.

**Confidence Calculation Process:**

See [Section 5](#5-confidence-scoring-rules-and-deduction-mechanisms) for complete methodology.

```
overall_score = 1.0

FOR EACH field IN extracted_data:
  IF field.extraction_method = "OCR_LOW_QUALITY":
    overall_score -= 0.1
  IF field.extraction_method = "INFERENCE_REQUIRED":
    overall_score -= 0.2
    ADD field.name to low_confidence_fields
  IF field.value = "UNKNOWN":
    overall_score -= 0.2
    ADD field.name to low_confidence_fields

IF overall_score < 0.7:
  SET escalation_required = true
```

---

#### STEP 13: ESCALATE — Low Confidence Handling

**Purpose:** Route uncertain extractions to human review.

**Escalation Triggers:**

| Trigger | Threshold | Action |
|---------|-----------|--------|
| Overall confidence | < 0.7 | Full document review |
| Field confidence | < 0.5 | Field-level review |
| Validation failures | > 3 FLAGS | Document review |
| Anti-inference violation | Any | Immediate escalation |
| UNKNOWN enum value | Any | Field review |

**Escalation Queue Schema:**

```json
{
  "escalation": {
    "escalation_id": "uuid",
    "document_id": "uuid",
    "escalation_type": "FULL_REVIEW|FIELD_REVIEW|VALIDATION_REVIEW",
    "trigger_reason": "string",
    "affected_fields": ["field1", "field2"],
    "priority": "HIGH|MEDIUM|LOW",
    "assigned_reviewer": "user_id|null",
    "status": "PENDING|IN_REVIEW|RESOLVED|REJECTED",
    "resolution": "object|null"
  }
}
```

---

#### STEP 14: ASSEMBLE — Output JSON

**Purpose:** Compile all extracted data into standardised output format.

**Output Assembly Rules:**

1. Include all extracted metadata
2. Include all conditions with classifications
3. Include all derived obligations
4. Include all evidence requirements
5. Include confidence metadata
6. Include source traceability
7. Include processing metadata

**Master Output Schema:**

```json
{
  "ingestion_output": {
    "schema_version": "2.0",
    "document_id": "uuid",
    "prompt_id": "EA-ENV-INGEST-001",
    "prompt_version": "v1.3",
    "processing_timestamp": "ISO8601",

    "document_metadata": { ... },
    "conditions": [ ... ],
    "obligations": [ ... ],
    "evidence_requirements": [ ... ],

    "confidence_metadata": {
      "overall_score": 0.92,
      "rationale": "string|null",
      "field_scores": { ... },
      "low_confidence_fields": [],
      "escalation_required": false
    },

    "source_traceability": {
      "authority_sources": ["[EA-001]", "[EA-007]"],
      "extraction_rules_applied": ["EA-ENV-EXT-001", "EA-ENV-EXT-002"],
      "validation_rules_applied": ["EA-ENV-VAL-001", "EA-ENV-VAL-002"]
    },

    "processing_metadata": {
      "processing_duration_ms": 1234,
      "pages_processed": 24,
      "conditions_extracted": 45,
      "obligations_derived": 52,
      "flags_raised": 0,
      "escalations_required": 0
    }
  }
}
```

---

#### STEP 15: PERSIST — Database Storage

**Purpose:** Store validated output in the compliance database.

**Persistence Rules:**

1. **Atomic Transaction**: All-or-nothing persistence
2. **Audit Trail**: Record all ingestion events
3. **Version Control**: Maintain document version history
4. **Index Updates**: Update search indices
5. **Notification Triggers**: Alert relevant users

**Persistence Sequence:**

```
BEGIN TRANSACTION

  INSERT document_metadata
  INSERT conditions (batch)
  INSERT obligations (batch)
  INSERT evidence_requirements (batch)
  INSERT confidence_metadata
  INSERT processing_log

  UPDATE search_index
  UPDATE document_status = "INGESTED"

  IF escalation_required:
    INSERT escalation_queue
    NOTIFY reviewers

COMMIT TRANSACTION
```

---

## 4. Condition → Obligation → Evidence Relationships

### 4.1 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CONDITION → OBLIGATION → EVIDENCE MODEL                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐
│      DOCUMENT       │
│─────────────────────│
│ document_id (PK)    │
│ permit_reference    │
│ document_type       │
│ issue_date          │
│ regulator           │
│ jurisdiction        │
└──────────┬──────────┘
           │
           │ 1:N
           ▼
┌─────────────────────┐
│     CONDITION       │
│─────────────────────│
│ condition_id (PK)   │
│ document_id (FK)    │◄────────────────────────────────────────┐
│ condition_number    │                                          │
│ condition_text      │                                          │
│ condition_type[]    │                                          │
│ page_reference      │                                          │
└──────────┬──────────┘                                          │
           │                                                      │
           │ 1:N                                                  │
           ▼                                                      │
┌─────────────────────┐     ┌─────────────────────┐              │
│    OBLIGATION       │     │   OBLIGATION_LINK   │              │
│─────────────────────│     │─────────────────────│              │
│ obligation_id (PK)  │◄───▶│ obligation_id (FK)  │              │
│ condition_id (FK)   │     │ linked_condition_id │──────────────┘
│ obligation_type[]   │     │ link_type           │
│ description         │     └─────────────────────┘
│ action_required     │       (Cross-references)
│ frequency           │
│ deadline            │
│ limit_value         │
│ limit_unit          │
└──────────┬──────────┘
           │
           │ 1:N
           ▼
┌─────────────────────┐
│ EVIDENCE_REQUIREMENT│
│─────────────────────│
│ evidence_req_id (PK)│
│ obligation_id (FK)  │
│ evidence_type       │
│ description         │
│ retention_period    │
│ format_requirements │
└──────────┬──────────┘
           │
           │ 1:N
           ▼
┌─────────────────────┐
│   EVIDENCE_ITEM     │
│─────────────────────│
│ evidence_id (PK)    │
│ evidence_req_id (FK)│
│ file_reference      │
│ upload_date         │
│ status              │
│ verified_by         │
│ verification_date   │
└─────────────────────┘
```

### 4.2 Cardinality Rules

| Relationship | Cardinality | Description |
|--------------|-------------|-------------|
| Document → Condition | 1:N | One document contains many conditions |
| Condition → Obligation | 1:N | One condition may create multiple obligations |
| Obligation → Evidence Requirement | 1:N | One obligation may need multiple evidence types |
| Evidence Requirement → Evidence Item | 1:N | One requirement may be satisfied by multiple items |
| Condition → Condition (cross-ref) | N:N | Conditions may reference each other |

### 4.3 Derivation Rules

**Condition to Obligation Derivation:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      OBLIGATION DERIVATION FLOWCHART                        │
└─────────────────────────────────────────────────────────────────────────────┘

                         ┌──────────────────┐
                         │    CONDITION     │
                         │    (Extracted)   │
                         └────────┬─────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
                    ▼             ▼             ▼
            ┌───────────┐ ┌───────────┐ ┌───────────┐
            │ TEMPORAL? │ │ NUMERIC?  │ │ ACTION?   │
            │ (deadline,│ │ (limit,   │ │ (shall,   │
            │ frequency)│ │ threshold)│ │ must)     │
            └─────┬─────┘ └─────┬─────┘ └─────┬─────┘
                  │             │             │
            ┌─────▼─────┐ ┌─────▼─────┐ ┌─────▼─────┐
            │ CREATE    │ │ CREATE    │ │ CREATE    │
            │ RECURRING │ │ LIMIT     │ │ ACTION    │
            │ OBLIGATION│ │ OBLIGATION│ │ OBLIGATION│
            └─────┬─────┘ └─────┬─────┘ └─────┬─────┘
                  │             │             │
                  └─────────────┼─────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   COMBINED OBLIGATION │
                    │   (may have multiple  │
                    │   characteristics)    │
                    └───────────────────────┘
```

**Evidence Requirement Derivation:**

| Obligation Type | Required Evidence Types |
|-----------------|------------------------|
| MONITORING | Monitoring data, Calibration certificates, MCERTS records |
| REPORTING | Submitted report copy, Submission receipt, Regulator acknowledgement |
| RECORD_KEEPING | Log entries, Signed records, Database exports |
| EMISSION_LIMIT | Lab analysis certificates, Continuous monitor data, MCERTS reports |
| NOTIFICATION | Notification copy, Delivery proof, Regulator response |
| IMPROVEMENT | Progress reports, Completion certificates, Photographic evidence |
| WASTE_ACCEPTANCE | Waste transfer notes, Pre-acceptance analysis, Rejection records |

### 4.4 Worked Example

**Source Condition:**
```
Condition 3.2.1: The operator shall monitor the concentration of NOx in
emissions from Emission Point A1 on a continuous basis using equipment
certified to MCERTS standards and shall submit quarterly summary reports
to the Environment Agency by the 28th day of the month following each
quarter end.
```

**Extracted Condition:**
```json
{
  "condition_id": "c-001",
  "condition_number": "3.2.1",
  "condition_text": "The operator shall monitor...",
  "condition_type": ["MONITORING", "REPORTING", "EMISSION_LIMIT"],
  "page_reference": 15
}
```

**Derived Obligations:**

```json
[
  {
    "obligation_id": "o-001",
    "condition_id": "c-001",
    "obligation_type": ["MONITORING"],
    "description": "Continuous NOx monitoring at Emission Point A1",
    "action_required": "Operate MCERTS-certified continuous monitoring",
    "frequency": "CONTINUOUS",
    "evidence_required": true
  },
  {
    "obligation_id": "o-002",
    "condition_id": "c-001",
    "obligation_type": ["REPORTING"],
    "description": "Quarterly NOx summary report submission",
    "action_required": "Submit quarterly summary report to EA",
    "frequency": "QUARTERLY",
    "deadline_rule": "28th of month following quarter end",
    "evidence_required": true
  }
]
```

**Derived Evidence Requirements:**

```json
[
  {
    "evidence_req_id": "e-001",
    "obligation_id": "o-001",
    "evidence_type": "MONITORING_DATA",
    "description": "Continuous NOx monitoring data logs",
    "retention_period_years": 6
  },
  {
    "evidence_req_id": "e-002",
    "obligation_id": "o-001",
    "evidence_type": "MCERTS_CERTIFICATE",
    "description": "Current MCERTS certification for monitoring equipment",
    "retention_period_years": 6
  },
  {
    "evidence_req_id": "e-003",
    "obligation_id": "o-002",
    "evidence_type": "SUBMITTED_REPORT",
    "description": "Quarterly NOx summary report as submitted",
    "retention_period_years": 6
  },
  {
    "evidence_req_id": "e-004",
    "obligation_id": "o-002",
    "evidence_type": "SUBMISSION_RECEIPT",
    "description": "Proof of report submission to EA",
    "retention_period_years": 6
  }
]
```

---

## 5. Confidence Scoring Rules and Deduction Mechanisms

### 5.1 Confidence Scoring Framework

**Base Score:** Every extraction starts with `overall_score = 1.0`

**Score Range:** 0.0 (no confidence) to 1.0 (full confidence)

**Escalation Threshold:** `overall_score < 0.7` triggers human review

### 5.2 Deduction Categories

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CONFIDENCE DEDUCTION MATRIX                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┬────────────┬──────────────────────────────────────────┐
│ DEDUCTION CATEGORY   │ DEDUCTION  │ TRIGGER CONDITION                        │
├──────────────────────┼────────────┼──────────────────────────────────────────┤
│ EXTRACTION QUALITY   │            │                                          │
│ ├─ OCR Low Quality   │ -0.10      │ OCR confidence < 0.8 on source text      │
│ ├─ Handwritten Text  │ -0.15      │ Handwritten elements detected            │
│ ├─ Poor Image Quality│ -0.20      │ DPI < 150 or blur detected               │
│ └─ Partial Page      │ -0.10      │ Page truncated or incomplete             │
├──────────────────────┼────────────┼──────────────────────────────────────────┤
│ FIELD UNCERTAINTY    │            │                                          │
│ ├─ UNKNOWN Value     │ -0.20      │ Field set to UNKNOWN enum                │
│ ├─ Inferred Value    │ -0.15      │ Value derived rather than explicit       │
│ ├─ Ambiguous Text    │ -0.10      │ Multiple valid interpretations           │
│ └─ Missing Mandatory │ -0.25      │ Required field not found                 │
├──────────────────────┼────────────┼──────────────────────────────────────────┤
│ VALIDATION ISSUES    │            │                                          │
│ ├─ Format Mismatch   │ -0.05      │ Value doesn't match expected format      │
│ ├─ Range Violation   │ -0.10      │ Value outside expected range             │
│ ├─ Cross-field Error │ -0.15      │ Related fields are inconsistent          │
│ └─ Source Mismatch   │ -0.20      │ Authority source not in registry         │
├──────────────────────┼────────────┼──────────────────────────────────────────┤
│ DOCUMENT ISSUES      │            │                                          │
│ ├─ Unsigned Document │ -0.15      │ Official signature not detected          │
│ ├─ Draft Watermark   │ -0.30      │ "DRAFT" watermark present                │
│ ├─ Superseded Notice │ -0.40      │ Document marked as superseded            │
│ └─ Date Anomaly      │ -0.10      │ Dates illogical or impossible            │
└──────────────────────┴────────────┴──────────────────────────────────────────┘
```

### 5.3 Field-Level Confidence

Each extracted field maintains individual confidence:

```json
{
  "field_scores": {
    "permit_reference": 1.0,
    "issue_date": 0.95,
    "site_address": 0.85,
    "operator_name": 1.0,
    "condition_3_2_1_text": 0.90,
    "fuel_type": 0.70
  }
}
```

### 5.4 Confidence Metadata Schema

```json
{
  "confidence_metadata": {
    "overall_score": {
      "type": "number",
      "minimum": 0,
      "maximum": 1,
      "description": "Aggregate confidence score for entire extraction"
    },
    "rationale": {
      "type": ["string", "null"],
      "description": "Explanation referencing applicable rule IDs when deductions occur. Example: 'Deducted 0.2 for UNKNOWN fuel_type per EA-MCPD-CONF-002'"
    },
    "field_scores": {
      "type": "object",
      "description": "Map of field_name to confidence score (0-1)"
    },
    "low_confidence_fields": {
      "type": "array",
      "items": { "type": "string" },
      "description": "List of field names with confidence < 0.7"
    },
    "deductions_applied": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "rule_id": { "type": "string" },
          "deduction": { "type": "number" },
          "field_affected": { "type": "string" },
          "reason": { "type": "string" }
        }
      }
    },
    "escalation_required": {
      "type": "boolean",
      "description": "True if overall_score < 0.7 or critical field confidence < 0.5"
    }
  }
}
```

### 5.5 Confidence Scoring Examples

**Example 1: High Confidence Extraction**

```json
{
  "confidence_metadata": {
    "overall_score": 0.98,
    "rationale": null,
    "field_scores": {
      "permit_reference": 1.0,
      "issue_date": 1.0,
      "operator_name": 1.0,
      "all_conditions": 0.95
    },
    "low_confidence_fields": [],
    "deductions_applied": [
      {
        "rule_id": "EA-ENV-CONF-001",
        "deduction": 0.02,
        "field_affected": "site_address.postcode",
        "reason": "Minor OCR uncertainty on one character"
      }
    ],
    "escalation_required": false
  }
}
```

**Example 2: Low Confidence Extraction (Escalation Required)**

```json
{
  "confidence_metadata": {
    "overall_score": 0.58,
    "rationale": "Multiple deductions applied: UNKNOWN fuel_type (-0.20 per EA-MCPD-CONF-002), poor scan quality (-0.15 per CONF-003), missing thermal input value (-0.07 per CONF-004)",
    "field_scores": {
      "permit_reference": 1.0,
      "fuel_type": 0.0,
      "thermal_input_mw": 0.60,
      "commission_date": 0.75
    },
    "low_confidence_fields": ["fuel_type", "thermal_input_mw"],
    "deductions_applied": [
      {
        "rule_id": "EA-MCPD-CONF-002",
        "deduction": 0.20,
        "field_affected": "fuel_type",
        "reason": "Fuel type not determinable from source document"
      },
      {
        "rule_id": "CONF-003",
        "deduction": 0.15,
        "field_affected": "*",
        "reason": "Source document scan quality poor (DPI < 150)"
      },
      {
        "rule_id": "CONF-004",
        "deduction": 0.07,
        "field_affected": "thermal_input_mw",
        "reason": "Value partially obscured, extracted with uncertainty"
      }
    ],
    "escalation_required": true
  }
}
```

### 5.6 Confidence Rule Reference

Each prompt includes module-specific confidence rules:

| Rule ID Pattern | Module | Purpose |
|-----------------|--------|---------|
| EA-ENV-CONF-XXX | Env Permits (England) | EA permit confidence rules |
| NRW-ENV-CONF-XXX | Env Permits (Wales) | NRW permit confidence rules |
| EA-MCPD-CONF-XXX | MCPD (England) | MCPD-specific deductions |
| EA-HW-CONF-XXX | Hazardous Waste | Consignment confidence rules |
| TW-TE-CONF-XXX | Trade Effluent (Thames) | Water company-specific rules |

---

## 6. Zero-Invention and Anti-Inference Safeguards

### 6.1 Zero-Invention Policy Statement

> **ZERO-INVENTION POLICY**
>
> The EcoComply ingestion system shall NEVER create, generate, assume, or infer any regulatory obligation, compliance requirement, condition, deadline, limit value, or compliance status that is not explicitly and unambiguously stated in the source document being processed.
>
> All extracted data must be directly traceable to specific text, tables, or figures within the authoritative source document.

### 6.2 Anti-Inference Rule Categories

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ANTI-INFERENCE RULE FRAMEWORK                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ CATEGORY 1: COMPLIANCE STATUS INFERENCE PROHIBITION                         │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ [ANTI-001] DO NOT assign compliance bands (A, B, C, D, E, F)                │
│ [ANTI-002] DO NOT calculate compliance scores or points                      │
│ [ANTI-003] DO NOT infer CCS/CAS tier placements                             │
│ [ANTI-004] DO NOT determine "compliant" or "non-compliant" status           │
│ [ANTI-005] DO NOT predict enforcement likelihood or risk levels             │
│                                                                              │
│ RATIONALE: Compliance status is determined by regulators only.              │
│            Published CCS (EA) uses points: C1=60, C2=31, C3=4, C4=0.1       │
│            CAS (SEPA) is WITHDRAWN; EPAS replacing March 2026               │
│            NRW banding thresholds NOT published                             │
│            NIEA has no published compliance methodology                     │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ CATEGORY 2: OBLIGATION DERIVATION PROHIBITION                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ [ANTI-010] DO NOT create obligations not explicitly stated                  │
│ [ANTI-011] DO NOT infer deadlines from similar permits                      │
│ [ANTI-012] DO NOT assume standard conditions apply                          │
│ [ANTI-013] DO NOT extrapolate from partial condition text                   │
│ [ANTI-014] DO NOT apply cross-regime requirements                           │
│                                                                              │
│ RATIONALE: Each permit is bespoke. Standard rules may vary.                 │
│            Only extract what is explicitly written.                         │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ CATEGORY 3: LIMIT VALUE INFERENCE PROHIBITION                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ [ANTI-020] DO NOT infer ELVs from BAT-AEL ranges                            │
│ [ANTI-021] DO NOT calculate limits from related parameters                   │
│ [ANTI-022] DO NOT assume industry-standard limits                           │
│ [ANTI-023] DO NOT convert units without explicit instruction                │
│ [ANTI-024] DO NOT interpolate between stated values                         │
│                                                                              │
│ RATIONALE: Permit limits are site-specific and legally binding.             │
│            Any calculation could introduce legal liability.                 │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ CATEGORY 4: CLASSIFICATION INFERENCE PROHIBITION                            │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ [ANTI-030] DO NOT infer condition_type beyond keyword match                 │
│ [ANTI-031] DO NOT assume waste classification from descriptions             │
│ [ANTI-032] DO NOT derive EWC codes from waste names                         │
│ [ANTI-033] DO NOT infer HP codes from EWC codes                             │
│ [ANTI-034] DO NOT classify installations without explicit statement          │
│                                                                              │
│ RATIONALE: Waste and installation classification is technical.              │
│            Incorrect classification has legal consequences.                 │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ CATEGORY 5: CHAIN OF CUSTODY INFERENCE PROHIBITION                          │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ [ANTI-040] DO NOT assume chain complete without all signatures              │
│ [ANTI-041] DO NOT infer carrier from vehicle registration                   │
│ [ANTI-042] DO NOT assume delivery from partial documentation                │
│ [ANTI-043] DO NOT mark consignment "delivered" without proof                │
│                                                                              │
│ RATIONALE: Duty of care requires complete chain of custody.                 │
│            Gaps in chain are compliance failures.                           │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ CATEGORY 6: CROSS-JURISDICTIONAL INFERENCE PROHIBITION                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ [ANTI-050] DO NOT apply EA rules to NRW/SEPA/NIEA permits                   │
│ [ANTI-051] DO NOT assume CCS scoring applies outside England                │
│ [ANTI-052] DO NOT use WIA 1991 for Scottish Water consents                  │
│ [ANTI-053] DO NOT apply English pre-notification rules to Scotland/NI       │
│ [ANTI-054] DO NOT assume producer registration rules are universal          │
│                                                                              │
│ RATIONALE: Each jurisdiction has distinct regulatory framework.             │
│            Cross-application creates compliance failures.                   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 6.3 Anti-Inference Enforcement Mechanism

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ANTI-INFERENCE ENFORCEMENT FLOWCHART                     │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌──────────────────────┐
                    │   EXTRACTED VALUE    │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ SOURCE TRACEABLE?    │
                    │ (Page, Section, Text)│
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │ YES            │                │ NO
              ▼                │                ▼
    ┌─────────────────┐        │      ┌─────────────────┐
    │ EXPLICIT TEXT?  │        │      │ REJECT VALUE    │
    │ (Verbatim match)│        │      │ Log: "No source │
    └────────┬────────┘        │      │ traceability"   │
             │                 │      └─────────────────┘
    ┌────────┼────────┐        │
    │ YES    │        │ NO     │
    ▼        │        ▼        │
┌────────┐   │   ┌─────────────┴──────────────┐
│ ACCEPT │   │   │ DERIVATION RULE APPLIED?   │
│ VALUE  │   │   └─────────────┬──────────────┘
└────────┘   │                 │
             │    ┌────────────┼────────────┐
             │    │ YES        │            │ NO
             │    ▼            │            ▼
             │ ┌──────────────┐│     ┌─────────────────┐
             │ │ RULE IN      ││     │ REJECT VALUE    │
             │ │ APPROVED     ││     │ Log: "Inference │
             │ │ RULE SET?    ││     │ attempted"      │
             │ └──────┬───────┘│     └─────────────────┘
             │        │        │
             │   ┌────┼────┐   │
             │   │YES │    │NO │
             │   ▼    │    ▼   │
             │┌──────┐│┌───────┴───────┐
             ││ACCEPT│││ REJECT VALUE  │
             ││VALUE │││ Log: "Unauth- │
             ││+ LOG │││ orised rule"  │
             │└──────┘│└───────────────┘
             │        │
             └────────┘
```

### 6.4 Violation Logging

All anti-inference violations are logged:

```json
{
  "anti_inference_violation": {
    "violation_id": "uuid",
    "document_id": "uuid",
    "rule_id": "ANTI-032",
    "rule_description": "DO NOT derive EWC codes from waste names",
    "attempted_action": "Derive EWC code 17 05 03* from 'asbestos-containing waste'",
    "field_affected": "ewc_code",
    "timestamp": "ISO8601",
    "action_taken": "REJECTED",
    "escalation_raised": true
  }
}
```

---

## 7. Source Registry Lookup Process

### 7.1 Source Registry Purpose

The Source Registry is the authoritative catalogue of all regulatory sources recognised by the ingestion system. Only documents from registered sources may be ingested.

### 7.2 Source Registry Schema

```json
{
  "source_entry": {
    "source_id": "[EA-001]",
    "source_name": "EA Environmental Permitting Guidance",
    "source_type": "REGULATORY_GUIDANCE|PRIMARY_LEGISLATION|SECONDARY_LEGISLATION|TARIFF_DOCUMENT|TECHNICAL_STANDARD",
    "jurisdiction": "ENGLAND|WALES|SCOTLAND|NORTHERN_IRELAND|UK_WIDE",
    "issuing_authority": "Environment Agency",
    "url": "https://...",
    "effective_date": "2024-01-01",
    "superseded_date": null,
    "status": "CURRENT|SUPERSEDED|WITHDRAWN",
    "related_sources": ["[EA-002]", "[UK-LEG-001]"],
    "applicable_modules": ["ENV_PERMIT", "MCPD"],
    "notes": "Primary reference for permit condition interpretation"
  }
}
```

### 7.3 Source Registry Lookup Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SOURCE REGISTRY LOOKUP PROCESS                         │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌──────────────────────┐
                    │   INCOMING DOCUMENT  │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ EXTRACT AUTHORITY    │
                    │ INDICATORS:          │
                    │ - Letterhead         │
                    │ - Logo               │
                    │ - Reference format   │
                    │ - Issuing body name  │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ QUERY SOURCE         │
                    │ REGISTRY:            │
                    │                      │
                    │ SELECT * FROM        │
                    │ source_registry      │
                    │ WHERE                │
                    │   issuing_authority  │
                    │   MATCHES            │
                    │   extracted_authority│
                    │ AND status = CURRENT │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │ MATCH FOUND    │                │ NO MATCH
              ▼                │                ▼
    ┌─────────────────┐        │      ┌─────────────────┐
    │ VALIDATE MATCH: │        │      │ FLAG DOCUMENT:  │
    │ - Jurisdiction  │        │      │ "Unknown source"│
    │ - Module        │        │      │                 │
    │ - Date range    │        │      │ SET escalation_ │
    └────────┬────────┘        │      │ required = true │
             │                 │      │                 │
             ▼                 │      │ DEDUCT confidence│
    ┌─────────────────┐        │      │ -0.20           │
    │ RETURN SOURCE   │        │      └─────────────────┘
    │ METADATA:       │        │
    │ - source_id     │        │
    │ - source_name   │        │
    │ - applicable    │        │
    │   extraction    │        │
    │   rules         │        │
    └─────────────────┘        │
                               │
                               └────────────────────────
```

### 7.4 Source ID Conventions

| Prefix | Authority | Examples |
|--------|-----------|----------|
| EA-XXX | Environment Agency | [EA-001], [EA-021] |
| NRW-XXX | Natural Resources Wales | [NRW-001], [NRW-020] |
| SEPA-XXX | SEPA | [SEPA-001], [SEPA-016] |
| NIEA-XXX | NIEA | [NIEA-001], [NIEA-013] |
| UK-LEG-XXX | UK Primary Legislation | [UK-LEG-001] |
| TW-XXX | Thames Water | [TW-001], [TW-002] |
| ST-XXX | Severn Trent | [ST-001], [ST-002] |
| SCW-XXX | Scottish Water | [SCW-001], [SCW-002] |
| SCW-LEG-XXX | Scottish Legislation | [SCW-LEG-001] |
| DC-XXX | Dŵr Cymru Welsh Water | [DC-001], [DC-002] |

### 7.5 Source Traceability in Output

Every extracted field includes source traceability:

```json
{
  "permit_reference": "EPR/AB1234CD",
  "permit_reference_source": "Page 1, Header, [EA-001] format",

  "emission_limit_nox": 100,
  "emission_limit_nox_unit": "mg/Nm³",
  "emission_limit_nox_source": "Page 8, Table 3.1, Condition 3.2.1"
}
```

---

## 8. Versioning Governance

### 8.1 Version Numbering Convention

```
[PROMPT_ID] v[MAJOR].[MINOR]

Examples:
  EA-ENV-INGEST-001 v1.3
  SEPA-MCPD-INGEST-001 v1.6
```

**Version Increment Rules:**

| Change Type | Version Increment | Approval Required |
|-------------|-------------------|-------------------|
| Schema field addition | +0.1 (minor) | Hostile review |
| ENUM value addition | +0.1 (minor) | Hostile review |
| Validation rule addition | +0.1 (minor) | Hostile review |
| Extraction rule modification | +0.1 (minor) | Hostile review |
| Breaking schema change | +1.0 (major) | Full review cycle |
| Prompt architecture change | +1.0 (major) | Full review cycle |
| Typographical correction | No increment | None |

### 8.2 Change Log Requirements

Every prompt version must include a change log entry:

```
| Version | Date       | Change Description                                    |
|---------|------------|-------------------------------------------------------|
| v1.0    | 2025-12-01 | Initial release                                       |
| v1.1    | 2025-12-05 | CS-001/CS-002 fix: Added operational_status field     |
| v1.2    | 2025-12-05 | CS-003 fix: Confirmed plant_type ENUM alignment       |
| v1.3    | 2025-12-05 | EC-002 fix: Added plant_type_other_description        |
```

### 8.3 Version Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PROMPT VERSION LIFECYCLE                             │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
  │  DRAFT  │────▶│ REVIEW  │────▶│APPROVED │────▶│ FROZEN  │────▶│SUPERSEDED│
  └─────────┘     └─────────┘     └─────────┘     └─────────┘     └─────────┘
       │               │               │               │               │
       │               │               │               │               │
       ▼               ▼               ▼               ▼               ▼
  Development     Hostile        Production      No changes       Archived
  and testing     review         deployment      permitted        (historical)
                  cycle          allowed                          reference only
```

### 8.4 Frozen Status

Once a prompt library version is FROZEN:

1. **No modifications** without formal change request
2. **Hostile review mandatory** for any proposed change
3. **Version increment required** for approved changes
4. **Audit trail maintained** for all change requests
5. **Rollback procedure documented** for emergency reversions

### 8.5 Current Frozen Versions

| Prompt ID | Frozen Version | Freeze Date |
|-----------|----------------|-------------|
| EA-ENV-INGEST-001 | v1.3 | 2025-12-05 |
| NRW-ENV-INGEST-001 | v1.3 | 2025-12-05 |
| SEPA-ENV-INGEST-001 | v1.3 | 2025-12-05 |
| NIEA-ENV-INGEST-001 | v1.3 | 2025-12-05 |
| EA-MCPD-INGEST-001 | v1.4 | 2025-12-05 |
| NRW-MCPD-INGEST-001 | v1.5 | 2025-12-05 |
| SEPA-MCPD-INGEST-001 | v1.6 | 2025-12-05 |
| NIEA-MCPD-INGEST-001 | v1.6 | 2025-12-05 |
| EA-HW-INGEST-001 | v1.4 | 2025-12-05 |
| NRW-HW-INGEST-001 | v1.4 | 2025-12-05 |
| SEPA-SW-INGEST-001 | v1.4 | 2025-12-05 |
| NIEA-HW-INGEST-001 | v1.4 | 2025-12-05 |
| TW-TE-INGEST-001 | v1.3 | 2025-12-05 |
| ST-TE-INGEST-001 | v1.3 | 2025-12-05 |
| UU-TE-INGEST-001 | v1.3 | 2025-12-05 |
| AW-TE-INGEST-001 | v1.3 | 2025-12-05 |
| YW-TE-INGEST-001 | v1.3 | 2025-12-05 |
| NW-TE-INGEST-001 | v1.3 | 2025-12-05 |
| SW-TE-INGEST-001 | v1.3 | 2025-12-05 |
| SWW-TE-INGEST-001 | v1.3 | 2025-12-05 |
| WX-TE-INGEST-001 | v1.3 | 2025-12-05 |
| DC-TE-INGEST-001 | v1.4 | 2025-12-05 |
| SCW-TE-INGEST-001 | v1.5 | 2025-12-05 |

---

## 9. Multi-Regulator Divergence Management

### 9.1 Jurisdictional Separation Principle

> **PRINCIPLE:** Each UK jurisdiction (England, Wales, Scotland, Northern Ireland) operates under distinct regulatory frameworks. The ingestion system must maintain strict separation and never cross-apply rules between jurisdictions.

### 9.2 Divergence Matrix

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MULTI-REGULATOR DIVERGENCE MATRIX                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┬──────────┬──────────┬──────────┬──────────┐
│ CHARACTERISTIC       │ ENGLAND  │ WALES    │ SCOTLAND │ N.IRELAND│
│                      │ (EA)     │ (NRW)    │ (SEPA)   │ (NIEA)   │
├──────────────────────┼──────────┼──────────┼──────────┼──────────┤
│ COMPLIANCE SCORING   │          │          │          │          │
│ ├─ Published Method  │ CCS      │ Banding  │ CAS→EPAS │ None     │
│ ├─ Points System     │ Yes      │ No       │ Withdrawn│ No       │
│ └─ User-Configurable │ No       │ Yes      │ Yes      │ Yes      │
├──────────────────────┼──────────┼──────────┼──────────┼──────────┤
│ PERMIT TERMINOLOGY   │          │          │          │          │
│ ├─ Permit Type       │ EPR      │ EPR      │ PPC      │ PPC      │
│ ├─ Part A Subdivision│ A, B     │ A, B     │ A, B     │ A(1),A(2)│
│ └─ Bilingual         │ No       │ Yes      │ No       │ No       │
├──────────────────────┼──────────┼──────────┼──────────┼──────────┤
│ HAZARDOUS WASTE      │          │          │          │          │
│ ├─ Terminology       │ Hazardous│ Hazardous│ Special  │ Hazardous│
│ ├─ Pre-notification  │ No       │ No       │ 3 days   │ 72 hours │
│ └─ Producer Reg      │ >500kg   │ >500kg   │ Not req  │ >500kg   │
├──────────────────────┼──────────┼──────────┼──────────┼──────────┤
│ TRADE EFFLUENT       │          │          │          │          │
│ ├─ Legislation       │ WIA 1991 │ WIA 1991 │ S(S)A1968│ WIA 1991 │
│ └─ Water Companies   │ 8        │ 1        │ 1        │ 1        │
├──────────────────────┼──────────┼──────────┼──────────┼──────────┤
│ MCPD                 │          │          │          │          │
│ ├─ Reg. Format       │ MCP/EA/  │ MCP/NRW/ │ MCP/SEPA/│ MCP/NIEA/│
│ └─ Region Codes      │ No       │ No       │ Yes (N/E/W)│ No     │
└──────────────────────┴──────────┴──────────┴──────────┴──────────┘
```

### 9.3 Regulator-Specific ENUM Prefixes

To prevent ENUM collision and maintain clear jurisdiction separation, all regulator-specific enumerations use prefixes:

```
condition_type:
  - OPERATIONAL          (universal)
  - EMISSION_LIMIT       (universal)
  - BAT_REQUIREMENT      (universal, added for IED compliance)

permit_type (by regulator):
  - EA: INSTALLATION, WASTE, WATER_DISCHARGE, GROUNDWATER
  - NRW: INSTALLATION, WASTE, WATER_DISCHARGE, GROUNDWATER
  - SEPA: PPC_PART_A, PPC_PART_B, CAR, WML
  - NIEA: PART_A_1, PART_A_2, PART_B
```

### 9.4 Cross-Jurisdiction Validation Rules

```
[CROSS-VAL-001] Jurisdiction Match
IF document.regulator = "EA":
  REJECT any SEPA/NIEA-specific ENUM values
  REJECT any "special waste" terminology
  REJECT any Sewerage (Scotland) Act references

[CROSS-VAL-002] Legislation Match
IF document.jurisdiction = "SCOTLAND":
  Trade effluent MUST reference Sewerage (Scotland) Act 1968
  REJECT any Water Industry Act 1991 references

[CROSS-VAL-003] Compliance Methodology Match
IF document.regulator = "EA":
  IF compliance_band assigned without CCS methodology:
    REJECT: "CCS scoring required for EA compliance bands"
IF document.regulator = "NRW":
  compliance_band MUST be marked "USER_CONFIGURED"
IF document.regulator = "SEPA":
  compliance_status MUST reference "CAS_WITHDRAWN" or "EPAS"
IF document.regulator = "NIEA":
  compliance_status MUST be marked "NO_PUBLISHED_METHODOLOGY"
```

### 9.5 Regulator-Specific Field Mapping

| Field | EA | NRW | SEPA | NIEA |
|-------|----|----|------|------|
| permit_reference | EPR/XX9999XX | EPR/XX9999XX | PPC/X/999999 | XX/9999 |
| permit_type | enum[4] | enum[4] | enum[4] | enum[3] |
| region_code | N/A | N/A | N/E/W | N/A |
| local_council | N/A | N/A | N/A | enum[11] |
| bilingual_fields | No | Yes (*_welsh) | No | No |
| waste_terminology | hazardous | hazardous | special | hazardous |
| pre_notification | false | false | 3_WORKING_DAYS | 72_HOURS |

---

## 10. Multi-Language Field Handling (Wales)

### 10.1 Bilingual Support Scope

Natural Resources Wales (NRW) and Dŵr Cymru Welsh Water (DC) operate bilingually. All prompts for these authorities support dual-language extraction.

### 10.2 Welsh Field Naming Convention

For every field that may contain Welsh language content, a parallel `*_welsh` field is defined:

```json
{
  "site_name": "Example Waste Treatment Facility",
  "site_name_welsh": "Cyfleuster Trin Gwastraff Enghreifftiol",

  "operator_name": "ABC Environmental Ltd",
  "operator_name_welsh": "ABC Amgylcheddol Cyf",

  "condition_text": "The operator shall...",
  "condition_text_welsh": "Rhaid i'r gweithredwr...",

  "consent_type": "Trade Effluent Consent",
  "consent_type_welsh": "Caniatâd Elifiant Masnach"
}
```

### 10.3 Welsh Terminology Reference

| English Term | Welsh Term | Notes |
|--------------|------------|-------|
| trade effluent | elifiant masnach | Noun-adjective order |
| consent | caniatâd | |
| permit | trwydded | |
| operator | gweithredwr | |
| discharge | gollyngiad | |
| suspended solids | solidau crog | |
| chemical oxygen demand | galw ocsigen cemegol | |
| hazardous waste | gwastraff peryglus | |
| site | safle | |
| condition | amod | |
| active | gweithredol | consent_status |
| suspended | wedi'i atal | consent_status |
| revoked | wedi'i ddirymu | consent_status |
| expired | wedi dod i ben | consent_status |
| pending renewal | adnewyddu ar y gweill | consent_status |

### 10.4 Welsh Date Handling

Welsh documents may use Welsh month names:

| Welsh | English | Month Number |
|-------|---------|--------------|
| Ionawr | January | 01 |
| Chwefror | February | 02 |
| Mawrth | March | 03 |
| Ebrill | April | 04 |
| Mai | May | 05 |
| Mehefin | June | 06 |
| Gorffennaf | July | 07 |
| Awst | August | 08 |
| Medi | September | 09 |
| Hydref | October | 10 |
| Tachwedd | November | 11 |
| Rhagfyr | December | 12 |

**Date Extraction Rule:**

```
[NRW-ENV-EXT-DATE] Welsh date extraction
IF date contains Welsh month name:
  TRANSLATE to ISO 8601 format
  RECORD original_date_text for reference

Example:
  "15 Mehefin 2024" → "2024-06-15"
  original_date_text = "15 Mehefin 2024"
```

### 10.5 Bilingual Extraction Process

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     BILINGUAL EXTRACTION FLOWCHART                          │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌──────────────────────┐
                    │   SOURCE DOCUMENT    │
                    │   (NRW or DC)        │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ DETECT LANGUAGE      │
                    │ SECTIONS:            │
                    │ - Separate Welsh/Eng │
                    │ - Side-by-side       │
                    │ - Interleaved        │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │ ENGLISH SECTION │ │ WELSH SECTION   │ │ BILINGUAL       │
    │ Extract to      │ │ Extract to      │ │ Extract both    │
    │ standard fields │ │ *_welsh fields  │ │ in parallel     │
    └────────┬────────┘ └────────┬────────┘ └────────┬────────┘
             │                   │                   │
             └───────────────────┼───────────────────┘
                                 │
                                 ▼
                    ┌──────────────────────┐
                    │ VALIDATE ALIGNMENT   │
                    │ - Field counts match │
                    │ - Semantic alignment │
                    │ - No missing pairs   │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ OUTPUT PAIRED FIELDS │
                    │ field: "English"     │
                    │ field_welsh: "Welsh" │
                    └──────────────────────┘
```

### 10.6 Welsh Field Validation

```
[NRW-VAL-WELSH-001] Welsh field completeness
IF document contains Welsh language content:
  FOR EACH field with Welsh equivalent detected:
    *_welsh field SHOULD be populated
    IF *_welsh field is null AND Welsh content exists:
      FLAG: "Welsh content detected but not extracted"

[NRW-VAL-WELSH-002] Welsh terminology validation
IF consent_type_welsh contains "masnach elifiant":
  FLAG: "Incorrect Welsh word order - should be 'elifiant masnach'"
  AUTO-CORRECT if confidence > 0.9
```

---

## Appendix A: Schema Diagrams

### A.1 Master Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ECOCOMPLY DATA MODEL - COMPLETE                        │
└─────────────────────────────────────────────────────────────────────────────┘

                                 ┌─────────────┐
                                 │   COMPANY   │
                                 │─────────────│
                                 │ company_id  │
                                 │ name        │
                                 │ company_no  │
                                 └──────┬──────┘
                                        │ 1:N
                                        ▼
┌─────────────┐                  ┌─────────────┐                  ┌─────────────┐
│  REGULATOR  │                  │    SITE     │                  │    USER     │
│─────────────│                  │─────────────│                  │─────────────│
│ regulator_id│◄────────────────▶│ site_id     │◄────────────────▶│ user_id     │
│ name        │   N:N            │ company_id  │   N:N            │ company_id  │
│ jurisdiction│   (permits)      │ name        │   (access)       │ role        │
└─────────────┘                  │ address     │                  └─────────────┘
                                 └──────┬──────┘
                                        │ 1:N
                                        ▼
                                 ┌─────────────┐
                                 │  DOCUMENT   │
                                 │─────────────│
                                 │ document_id │
                                 │ site_id     │
                                 │ module      │
                                 │ regulator   │
                                 │ doc_type    │
                                 │ status      │
                                 └──────┬──────┘
                                        │ 1:N
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
                    ▼                   ▼                   ▼
           ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
           │  CONDITION  │      │  GENERATOR  │      │ CONSIGNMENT │
           │─────────────│      │  (MCPD)     │      │  (HW/SW)    │
           │ condition_id│      │─────────────│      │─────────────│
           │ document_id │      │ generator_id│      │ consign_id  │
           │ cond_number │      │ document_id │      │ document_id │
           │ cond_type[] │      │ plant_type  │      │ ewc_code    │
           │ cond_text   │      │ thermal_mw  │      │ hp_codes[]  │
           └──────┬──────┘      │ fuel_type   │      │ quantity    │
                  │             │ elv_nox     │      │ status      │
                  │ 1:N         └─────────────┘      └─────────────┘
                  ▼
           ┌─────────────┐
           │ OBLIGATION  │
           │─────────────│
           │ oblig_id    │
           │ condition_id│
           │ oblig_type[]│
           │ description │
           │ frequency   │
           │ deadline    │
           │ limit_value │
           └──────┬──────┘
                  │ 1:N
                  ▼
           ┌─────────────┐
           │ EVIDENCE_REQ│
           │─────────────│
           │ evid_req_id │
           │ oblig_id    │
           │ evid_type   │
           │ retention   │
           └──────┬──────┘
                  │ 1:N
                  ▼
           ┌─────────────┐
           │ EVIDENCE    │
           │─────────────│
           │ evidence_id │
           │ evid_req_id │
           │ file_ref    │
           │ upload_date │
           │ status      │
           └─────────────┘
```

### A.2 Module-Specific Schemas

**Module 1: Environmental Permits**
```
PERMIT
├── permit_reference (string, required)
├── permit_type (enum, required)
├── issue_date (date, required)
├── effective_date (date, required)
├── expiry_date (date, nullable)
├── review_date (date, nullable)
├── site_details (object)
│   ├── site_name (string)
│   ├── site_name_welsh (string, nullable)
│   ├── site_address (object)
│   ├── grid_reference (string)
│   └── postcode (string)
├── operator_details (object)
│   ├── operator_name (string)
│   └── company_number (string, nullable)
├── conditions (array[Condition])
└── confidence_metadata (object)
```

**Module 3: MCPD**
```
MCPD_REGISTRATION
├── registration_reference (string, required)
├── registration_date (date, required)
├── site_details (object)
├── generators (array[Generator])
│   ├── generator_id (string)
│   ├── plant_type (enum[11])
│   ├── plant_type_other_description (string, nullable)
│   ├── thermal_input_mw (number)
│   ├── fuel_type (enum[12])
│   ├── fuel_type_secondary (enum, nullable)
│   ├── commission_date (date)
│   ├── operational_status (enum[3])
│   ├── operating_mode (enum[4])
│   ├── elv_nox_mg_nm3 (number, nullable)
│   ├── elv_so2_mg_nm3 (number, nullable)
│   └── elv_dust_mg_nm3 (number, nullable)
├── late_registration_flag (boolean)
└── confidence_metadata (object)
```

**Module 4: Hazardous/Special Waste**
```
CONSIGNMENT
├── consignment_reference (string, required)
├── producer_details (object)
│   ├── premises_registered (boolean)
│   ├── premises_registration_number (string, nullable)
│   └── registration_exemption_reason (string, nullable)
├── waste_details (object)
│   ├── ewc_code (string)
│   ├── description (string)
│   ├── hp_codes (array[enum[15]])
│   ├── quantity_kg (number)
│   ├── disposal_code (enum[15], nullable)
│   └── recovery_code (enum[13], nullable)
├── consignment_legs (array[Leg])
│   ├── leg_number (integer)
│   ├── carrier_name (string)
│   ├── carrier_registration (string)
│   ├── leg_status (enum[4])
│   ├── handover_date (date)
│   └── handover_signature (boolean)
├── overall_consignment_status (enum[5])
├── pre_notification (object, Scotland/NI only)
│   ├── required (boolean)
│   ├── notification_date (date)
│   └── notification_reference (string)
└── confidence_metadata (object)
```

**Module 2: Trade Effluent**
```
TE_CONSENT
├── consent_reference (string, required)
├── consent_status (enum[5])
├── issue_date (date)
├── expiry_date (date, nullable)
├── discharge_details (object)
│   ├── discharge_type (enum[5])
│   ├── max_daily_volume_m3 (number)
│   ├── max_cod_mg_l (number)
│   └── max_ss_mg_l (number)
├── charging_details (object)
│   ├── mogden_formula_applicable (boolean)
│   ├── ot_value (number, nullable)
│   ├── os_value (number, nullable)
│   ├── st_value (number, nullable)
│   └── ss_value (number, nullable)
├── receiving_works (string)
└── confidence_metadata (object)
```

---

## Appendix B: ENUM Reference Tables

### B.1 condition_type ENUM (21 values)

| Value | Description |
|-------|-------------|
| OPERATIONAL | Day-to-day operational requirements |
| EMISSION_LIMIT | Numeric emission/discharge limits |
| MONITORING | Sampling, measurement, analysis requirements |
| REPORTING | Periodic or event-based reporting obligations |
| RECORD_KEEPING | Documentation and retention requirements |
| NOTIFICATION | Regulator notification triggers |
| IMPROVEMENT | Time-bound improvement programmes |
| PRE_OPERATIONAL | Pre-commencement requirements |
| CESSATION | Closure and decommissioning requirements |
| FINANCIAL_PROVISION | Financial security/guarantee requirements |
| SITE_PROTECTION | Baseline/site condition requirements |
| MANAGEMENT_SYSTEM | EMS/quality system requirements |
| WASTE_ACCEPTANCE | Waste acceptance criteria |
| WASTE_HANDLING | Waste storage/treatment requirements |
| POLLUTION_PREVENTION | Containment/prevention measures |
| RESOURCE_EFFICIENCY | Resource use/efficiency requirements |
| ACCIDENT_MANAGEMENT | Emergency/contingency requirements |
| NOISE_VIBRATION | Noise and vibration limits |
| ODOUR | Odour management requirements |
| CLIMATE_ADAPTATION | Climate resilience requirements |
| BAT_REQUIREMENT | Best Available Techniques requirements |

### B.2 plant_type ENUM (11 values)

| Value | Description |
|-------|-------------|
| DIESEL_GENERATOR | Diesel-fuelled generator |
| GAS_ENGINE | Spark-ignition gas engine |
| GAS_TURBINE | General gas turbine |
| DUAL_FUEL_ENGINE | Engine capable of multiple fuels |
| STEAM_BOILER | Steam-raising boiler |
| HOT_WATER_BOILER | Hot water boiler |
| RECIP_ENGINE | Reciprocating engine (generic) |
| COMBINED_HEAT_AND_POWER | CHP unit |
| GAS_TURBINE_OPEN_CYCLE | OCGT |
| GAS_TURBINE_COMBINED_CYCLE | CCGT |
| OTHER | Other (requires description) |

### B.3 fuel_type ENUM (12 values)

| Value | Description |
|-------|-------------|
| NATURAL_GAS | Natural gas |
| LPG | Liquefied petroleum gas |
| DIESEL | Diesel fuel |
| GAS_OIL | Gas oil |
| HEAVY_FUEL_OIL | HFO |
| BIOGAS | Biogas/biomethane |
| BIOMASS | Solid biomass |
| WASTE | Waste-derived fuel |
| COAL | Coal |
| DUAL_FUEL | Dual-fuel capability |
| OTHER | Other fuel |
| UNKNOWN | Unknown (escalation required) |

### B.4 consent_status ENUM (5 values)

| Value | Description |
|-------|-------------|
| ACTIVE | Consent currently in force |
| SUSPENDED | Consent temporarily suspended |
| REVOKED | Consent permanently revoked |
| EXPIRED | Consent has passed expiry date |
| PENDING_RENEWAL | Renewal application submitted |

### B.5 discharge_type ENUM (5 values)

| Value | Description |
|-------|-------------|
| CONTINUOUS | Continuous discharge |
| BATCH | Batch/tankered discharge |
| INTERMITTENT | Intermittent/occasional |
| EMERGENCY_ONLY | Emergency discharge only |
| UNKNOWN | Pattern not determinable |

### B.6 HP Codes ENUM (15 values)

| Value | Hazard Property |
|-------|-----------------|
| HP1 | Explosive |
| HP2 | Oxidising |
| HP3 | Flammable |
| HP4 | Irritant |
| HP5 | STOT/Aspiration toxicity |
| HP6 | Acute toxicity |
| HP7 | Carcinogenic |
| HP8 | Corrosive |
| HP9 | Infectious |
| HP10 | Toxic for reproduction |
| HP11 | Mutagenic |
| HP12 | Release of acute toxic gas |
| HP13 | Sensitising |
| HP14 | Ecotoxic |
| HP15 | Capable of yielding hazardous waste |

### B.7 Disposal Codes ENUM (15 values)

| Value | Operation |
|-------|-----------|
| D1 | Deposit into or onto land |
| D2 | Land treatment |
| D3 | Deep injection |
| D4 | Surface impoundment |
| D5 | Specially engineered landfill |
| D6 | Release into water body |
| D7 | Release into seas/oceans |
| D8 | Biological treatment |
| D9 | Physico-chemical treatment |
| D10 | Incineration on land |
| D11 | Incineration at sea |
| D12 | Permanent storage |
| D13 | Blending/mixing prior to D1-D12 |
| D14 | Repackaging prior to D1-D13 |
| D15 | Storage pending D1-D14 |

### B.8 Recovery Codes ENUM (13 values)

| Value | Operation |
|-------|-----------|
| R1 | Use as fuel/energy generation |
| R2 | Solvent reclamation/regeneration |
| R3 | Organic substances recycling |
| R4 | Metals recycling |
| R5 | Inorganic materials recycling |
| R6 | Acid/base regeneration |
| R7 | Recovery of pollution abatement components |
| R8 | Catalyst recovery |
| R9 | Oil re-refining |
| R10 | Land treatment for agricultural benefit |
| R11 | Use of wastes from R1-R10 |
| R12 | Exchange for R1-R11 |
| R13 | Storage pending R1-R12 |

---

## Appendix C: Source Registry Master List

### C.1 Environment Agency Sources

| ID | Name | Type | Status |
|----|------|------|--------|
| [EA-001] | EA Environmental Permitting Guidance | REGULATORY_GUIDANCE | CURRENT |
| [EA-007] | Hazardous Waste Regulations 2005 | SECONDARY_LEGISLATION | CURRENT |
| [EA-010] | MCPD Deadline Guidance | REGULATORY_GUIDANCE | CURRENT |
| [EA-020] | EA Climate Adaptation Guidance | REGULATORY_GUIDANCE | CURRENT |
| [EA-021] | EA BAT Conclusions Implementation | REGULATORY_GUIDANCE | CURRENT |

### C.2 Natural Resources Wales Sources

| ID | Name | Type | Status |
|----|------|------|--------|
| [NRW-001] | NRW Environmental Permitting Guidance | REGULATORY_GUIDANCE | CURRENT |
| [NRW-010] | NRW Hazardous Waste Guidance | REGULATORY_GUIDANCE | CURRENT |
| [NRW-018] | NRW HW Guidance (Welsh) | REGULATORY_GUIDANCE | CURRENT |
| [NRW-019] | NRW Climate Adaptation Guidance | REGULATORY_GUIDANCE | CURRENT |
| [NRW-020] | NRW BAT Implementation Guidance | REGULATORY_GUIDANCE | CURRENT |

### C.3 SEPA Sources

| ID | Name | Type | Status |
|----|------|------|--------|
| [SEPA-001] | SEPA Environmental Regulation Guidance | REGULATORY_GUIDANCE | CURRENT |
| [SEPA-015] | SEPA MCPD Registration Guidance | REGULATORY_GUIDANCE | CURRENT |
| [SEPA-016] | SEPA Climate Adaptation Guidance | REGULATORY_GUIDANCE | CURRENT |

### C.4 NIEA Sources

| ID | Name | Type | Status |
|----|------|------|--------|
| [NIEA-001] | NIEA Environmental Permitting Guidance | REGULATORY_GUIDANCE | CURRENT |
| [NIEA-012] | NIEA MCPD Registration Guidance | REGULATORY_GUIDANCE | CURRENT |
| [NIEA-013] | NIEA Climate Adaptation Guidance | REGULATORY_GUIDANCE | CURRENT |

### C.5 Water Company Sources

| ID | Name | Type | Status |
|----|------|------|--------|
| [TW-002] | Thames Water Charges Scheme | TARIFF_DOCUMENT | CURRENT |
| [ST-002] | Severn Trent Charges Scheme | TARIFF_DOCUMENT | CURRENT |
| [UU-002] | United Utilities Charges Scheme | TARIFF_DOCUMENT | CURRENT |
| [AW-002] | Anglian Water Charges Scheme | TARIFF_DOCUMENT | CURRENT |
| [YW-002] | Yorkshire Water Charges Scheme | TARIFF_DOCUMENT | CURRENT |
| [NW-002] | Northumbrian Water Charges Scheme | TARIFF_DOCUMENT | CURRENT |
| [SW-002] | Southern Water Charges Scheme | TARIFF_DOCUMENT | CURRENT |
| [SWW-002] | South West Water Charges Scheme | TARIFF_DOCUMENT | CURRENT |
| [WX-002] | Wessex Water Charges Scheme | TARIFF_DOCUMENT | CURRENT |
| [DC-002] | Dŵr Cymru Charges Scheme | TARIFF_DOCUMENT | CURRENT |
| [SCW-002] | Scottish Water Charges Scheme | TARIFF_DOCUMENT | CURRENT |

### C.6 Legislation Sources

| ID | Name | Type | Status |
|----|------|------|--------|
| [UK-LEG-001] | Environmental Permitting Regulations 2016 | PRIMARY_LEGISLATION | CURRENT |
| [UK-LEG-002] | Water Industry Act 1991 | PRIMARY_LEGISLATION | CURRENT |
| [UK-LEG-003] | Hazardous Waste Regulations 2005 | SECONDARY_LEGISLATION | CURRENT |
| [UK-LEG-005] | MCPD Regulations 2018 | SECONDARY_LEGISLATION | CURRENT |
| [SCW-LEG-001] | Sewerage (Scotland) Act 1968 | PRIMARY_LEGISLATION | CURRENT |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-05 | EcoComply | Initial release |

---

**END OF DOCUMENT**

**Document Status:** APPROVED — FROZEN
**Next Review Date:** On request or regulatory change
