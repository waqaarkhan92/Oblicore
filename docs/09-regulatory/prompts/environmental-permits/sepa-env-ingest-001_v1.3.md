# SEPA-ENV-INGEST-001 v1.3
## Scottish Environment Protection Agency Environmental Permit Ingestion Prompt

**Prompt ID:** SEPA-ENV-INGEST-001
**Version:** 1.3
**Status:** FROZEN
**Effective Date:** 2025-12-05
**Module:** Environmental Permits
**Regulator:** Scottish Environment Protection Agency (SEPA)
**Jurisdiction:** Scotland

---

## SECTION 1: METADATA

```json
{
  "prompt_id": "SEPA-ENV-INGEST-001",
  "version": "1.3",
  "status": "FROZEN",
  "module": "ENVIRONMENTAL_PERMITS",
  "regulator": "SEPA",
  "jurisdiction": "SCOTLAND",
  "document_types": [
    "PPC_PERMIT",
    "CAR_LICENCE",
    "WASTE_MANAGEMENT_LICENCE",
    "PERMIT_VARIATION",
    "PERMIT_TRANSFER",
    "PERMIT_SURRENDER",
    "ENFORCEMENT_NOTICE"
  ],
  "authority_sources": [
    "[SEPA-001] SEPA Environmental Regulation Guidance",
    "[SEPA-016] SEPA Climate Adaptation Guidance",
    "[UK-LEG-001] Environmental Permitting Regulations 2016"
  ],
  "last_updated": "2025-12-05",
  "author": "EcoComply Methodology Team"
}
```

---

## SECTION 2: SCOPE DEFINITION

### 2.1 Document Types Covered

This prompt applies to the extraction of regulatory obligations from SEPA Pollution Prevention and Control (PPC) permits and related authorisations issued under Scottish environmental legislation.

**In Scope:**
- PPC Part A permits (IPPC installations)
- PPC Part B permits (LAPC installations)
- CAR licences (Controlled Activities Regulations)
- Waste Management Licences (WML)
- Permit variations
- Permit transfers
- Permit surrenders
- Enforcement notices

**Out of Scope:**
- Pre-application advice documents
- Permit application forms
- Informal correspondence
- Draft permits not yet issued
- Permits issued by EA, NRW, or NIEA

### 2.2 Regulatory Framework

**Primary Legislation:**
- Pollution Prevention and Control (Scotland) Regulations 2012
- Water Environment (Controlled Activities) (Scotland) Regulations 2011 (CAR)
- Waste Management Licensing (Scotland) Regulations 2011
- Environment Act 1995

**Regulatory Guidance:**
- SEPA Sector Guidance Notes
- SEPA Pollution Prevention Guidelines
- BAT Reference Documents (BREFs)
- BAT Conclusions

### 2.3 Compliance Scoring Context

SEPA previously used the Compliance Assessment Scheme (CAS) which has been **WITHDRAWN**.

**CAS Status:** WITHDRAWN
**Replacement:** Environmental Performance Assessment System (EPAS) - effective March 2026

**IMPORTANT:** This prompt does NOT assign CAS tiers or EPAS ratings. Compliance status is determined by SEPA only. See Anti-Inference Rules.

### 2.4 PPC Terminology

Scotland uses "Pollution Prevention and Control" (PPC) terminology rather than "Environmental Permitting Regulations" (EPR) used in England and Wales.

| Scotland Term | England/Wales Equivalent |
|---------------|-------------------------|
| PPC Permit | Environmental Permit |
| Part A | Part A Installation |
| Part B | Part B Installation |
| CAR Licence | Water Discharge Activity |
| WML | Waste Operation |

---

## SECTION 3: OUTPUT SCHEMA (JSON)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "SEPA Environmental Permit Extraction Output",
  "type": "object",
  "required": ["document_metadata", "conditions", "confidence_metadata"],
  "properties": {
    "schema_version": {
      "type": "string",
      "const": "2.0"
    },
    "prompt_id": {
      "type": "string",
      "const": "SEPA-ENV-INGEST-001"
    },
    "prompt_version": {
      "type": "string",
      "const": "v1.3"
    },
    "document_metadata": {
      "type": "object",
      "required": ["ppc_permit_reference", "document_type", "issue_date", "effective_date", "site_details", "operator_details"],
      "properties": {
        "ppc_permit_reference": {
          "type": "string",
          "pattern": "^PPC/[A-Z]/[0-9]{6}$",
          "description": "SEPA PPC permit reference number"
        },
        "ppc_permit_reference_source": {
          "type": "string"
        },
        "car_licence_reference": {
          "type": ["string", "null"],
          "pattern": "^CAR/[A-Z]/[0-9]{6}$",
          "description": "CAR licence reference if applicable"
        },
        "wml_reference": {
          "type": ["string", "null"],
          "pattern": "^WML/[A-Z]/[0-9]{6}$",
          "description": "Waste Management Licence reference if applicable"
        },
        "document_type": {
          "type": "string",
          "enum": ["PPC_PART_A", "PPC_PART_B", "CAR_LICENCE", "WML", "PERMIT_VARIATION", "PERMIT_TRANSFER", "PERMIT_SURRENDER", "ENFORCEMENT_NOTICE"]
        },
        "sepa_region": {
          "type": "string",
          "enum": ["NORTH", "EAST", "WEST"],
          "description": "SEPA administrative region"
        },
        "issue_date": {
          "type": "string",
          "format": "date"
        },
        "issue_date_source": {
          "type": "string"
        },
        "effective_date": {
          "type": "string",
          "format": "date"
        },
        "expiry_date": {
          "type": ["string", "null"],
          "format": "date"
        },
        "review_date": {
          "type": ["string", "null"],
          "format": "date"
        },
        "supersedes_reference": {
          "type": ["string", "null"]
        },
        "site_details": {
          "type": "object",
          "required": ["site_name", "site_address", "grid_reference"],
          "properties": {
            "site_name": {
              "type": "string"
            },
            "site_address": {
              "type": "object",
              "properties": {
                "address_line_1": { "type": "string" },
                "address_line_2": { "type": ["string", "null"] },
                "town": { "type": "string" },
                "county": { "type": ["string", "null"] },
                "postcode": {
                  "type": "string",
                  "pattern": "^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$"
                }
              }
            },
            "grid_reference": {
              "type": "string",
              "pattern": "^[A-Z]{2}[0-9]{6,10}$"
            },
            "local_authority": {
              "type": ["string", "null"]
            }
          }
        },
        "operator_details": {
          "type": "object",
          "required": ["operator_name"],
          "properties": {
            "operator_name": {
              "type": "string"
            },
            "company_registration_number": {
              "type": ["string", "null"],
              "pattern": "^SC[0-9]{6}$|^[0-9]{8}$"
            },
            "registered_address": {
              "type": ["object", "null"]
            },
            "trading_name": {
              "type": ["string", "null"]
            }
          }
        },
        "cas_status": {
          "type": "string",
          "const": "WITHDRAWN",
          "description": "CAS has been withdrawn by SEPA. EPAS replacing from March 2026."
        }
      }
    },
    "conditions": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["condition_id", "condition_number", "condition_text", "condition_type"],
        "properties": {
          "condition_id": {
            "type": "string",
            "format": "uuid"
          },
          "condition_number": {
            "type": "string"
          },
          "condition_text": {
            "type": "string"
          },
          "condition_type": {
            "type": "array",
            "items": {
              "type": "string",
              "enum": [
                "OPERATIONAL",
                "EMISSION_LIMIT",
                "MONITORING",
                "REPORTING",
                "RECORD_KEEPING",
                "NOTIFICATION",
                "IMPROVEMENT",
                "PRE_OPERATIONAL",
                "CESSATION",
                "FINANCIAL_PROVISION",
                "SITE_PROTECTION",
                "MANAGEMENT_SYSTEM",
                "WASTE_ACCEPTANCE",
                "WASTE_HANDLING",
                "POLLUTION_PREVENTION",
                "RESOURCE_EFFICIENCY",
                "ACCIDENT_MANAGEMENT",
                "NOISE_VIBRATION",
                "ODOUR",
                "CLIMATE_ADAPTATION",
                "BAT_REQUIREMENT"
              ]
            },
            "minItems": 1,
            "uniqueItems": true
          },
          "schedule_reference": {
            "type": ["string", "null"]
          },
          "page_reference": {
            "type": "integer"
          },
          "tables": {
            "type": "array",
            "items": { "type": "object" }
          },
          "cross_references": {
            "type": "array",
            "items": { "type": "string" }
          },
          "emission_points": {
            "type": "array",
            "items": { "type": "string" }
          },
          "bat_reference": {
            "type": ["string", "null"],
            "description": "Reference to specific BAT Conclusion or BREF if cited"
          },
          "limits": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "parameter": { "type": "string" },
                "limit_value": { "type": "number" },
                "limit_unit": { "type": "string" },
                "limit_type": {
                  "type": "string",
                  "enum": ["MAX", "MIN", "AVERAGE", "PERCENTILE", "RANGE"]
                },
                "averaging_period": { "type": ["string", "null"] },
                "reference_conditions": { "type": ["string", "null"] }
              }
            }
          }
        }
      }
    },
    "obligations": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["obligation_id", "source_condition_id", "obligation_type", "description"],
        "properties": {
          "obligation_id": { "type": "string", "format": "uuid" },
          "source_condition_id": { "type": "string", "format": "uuid" },
          "obligation_type": { "type": "array", "items": { "type": "string" } },
          "description": { "type": "string" },
          "action_required": { "type": "string" },
          "frequency": {
            "type": "string",
            "enum": ["CONTINUOUS", "HOURLY", "DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL", "AD_HOC", "ONE_TIME", "ON_EVENT"]
          },
          "deadline": { "type": ["string", "null"], "format": "date" },
          "recurrence_rule": { "type": ["string", "null"] },
          "responsible_party": {
            "type": "string",
            "enum": ["OPERATOR", "REGULATOR", "THIRD_PARTY"]
          },
          "evidence_required": { "type": "boolean" }
        }
      }
    },
    "evidence_requirements": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "evidence_id": { "type": "string", "format": "uuid" },
          "obligation_id": { "type": "string", "format": "uuid" },
          "evidence_type": { "type": "string" },
          "description": { "type": "string" },
          "retention_period_years": { "type": "number" },
          "format_requirements": { "type": "array", "items": { "type": "string" } }
        }
      }
    },
    "confidence_metadata": {
      "type": "object",
      "required": ["overall_score", "escalation_required"],
      "properties": {
        "overall_score": { "type": "number", "minimum": 0, "maximum": 1 },
        "rationale": { "type": ["string", "null"] },
        "field_scores": { "type": "object" },
        "low_confidence_fields": { "type": "array", "items": { "type": "string" } },
        "deductions_applied": { "type": "array" },
        "escalation_required": { "type": "boolean" }
      }
    },
    "source_traceability": {
      "type": "object",
      "properties": {
        "authority_sources": { "type": "array", "items": { "type": "string" } },
        "extraction_rules_applied": { "type": "array", "items": { "type": "string" } },
        "validation_rules_applied": { "type": "array", "items": { "type": "string" } }
      }
    },
    "processing_metadata": {
      "type": "object",
      "properties": {
        "processing_timestamp": { "type": "string", "format": "date-time" },
        "processing_duration_ms": { "type": "integer" },
        "pages_processed": { "type": "integer" },
        "conditions_extracted": { "type": "integer" },
        "obligations_derived": { "type": "integer" }
      }
    }
  }
}
```

---

## SECTION 4: INPUT EXPECTATIONS

### 4.1 Document Format Requirements

**Accepted Formats:**
- PDF (preferred, searchable text)
- PDF (image-based, will trigger OCR)
- TIFF/PNG/JPEG (will trigger OCR)
- Word documents (.docx) if official

**Quality Requirements:**
- Minimum 150 DPI for image-based documents
- Text must be legible
- All pages must be present and in order
- Document must be complete

### 4.2 Expected Document Structure

SEPA PPC Permits typically follow this structure:

1. **Cover Page**: Permit reference, operator name, site name
2. **Part 1 - General**: Scope and interpretation
3. **Part 2 - Permitted Activities**: Activities and limits
4. **Part 3 - Operating Conditions**: Operational requirements
5. **Part 4 - Monitoring**: Monitoring and sampling
6. **Part 5 - Records and Reporting**: Record keeping and reporting
7. **Part 6 - Notifications**: Notification requirements
8. **Schedule A - Site Plan**: Location and boundary
9. **Schedule B - Emission Limits**: Tables of limits
10. **Schedule C - Monitoring Points**: Monitoring locations

### 4.3 Pre-Processing Requirements

Before extraction:
1. Verify document is an official SEPA permit (letterhead, reference format)
2. Confirm document is not marked "DRAFT"
3. Check document is not superseded by a later version
4. Validate permit reference format: PPC/[A-Z]/[0-9]{6}
5. Detect SEPA region from permit reference

---

## SECTION 5: EXTRACTION RULES

### 5.1 Document Metadata Extraction

**[SEPA-ENV-EXT-001]** PPC Permit Reference Extraction
```
LOCATE permit reference in document header or first page
VALIDATE format: PPC/[A-Z]/[0-9]{6}
EXTRACT region code:
  N = NORTH
  E = EAST
  W = WEST
IF format invalid: FLAG for review, do not reject
RECORD page_reference and source location
```

**[SEPA-ENV-EXT-002]** Issue Date Extraction
```
SEARCH for "Date of issue", "Issued on", "Permit dated"
EXTRACT date value
CONVERT to ISO 8601 format (YYYY-MM-DD)
IF ambiguous date format: FLAG for review
RECORD source location
```

**[SEPA-ENV-EXT-003]** SEPA Region Extraction
```
EXTRACT region from permit reference:
  PPC/N/xxxxxx → sepa_region = "NORTH"
  PPC/E/xxxxxx → sepa_region = "EAST"
  PPC/W/xxxxxx → sepa_region = "WEST"
```

**[SEPA-ENV-EXT-004]** Site Details Extraction
```
LOCATE site information section
EXTRACT site_name verbatim
EXTRACT full address components
EXTRACT grid reference (OS National Grid format)
VALIDATE postcode format for Scotland
IF postcode NOT Scottish prefix: FLAG jurisdiction mismatch
```

**[SEPA-ENV-EXT-005]** Operator Details Extraction
```
LOCATE operator/permit holder section
EXTRACT operator_name verbatim
EXTRACT company_registration_number if present
VALIDATE Scottish company number format (SC prefix) or standard format
```

### 5.2 Condition Extraction

**[SEPA-ENV-EXT-006]** Condition Identification
```
FOR EACH numbered paragraph in permit:
  IF paragraph contains regulatory requirement language ("shall", "must", "will"):
    CREATE condition record
    PRESERVE original condition numbering
    EXTRACT full condition text verbatim
    RECORD page reference
```

**[SEPA-ENV-EXT-007]** Condition Type Classification
```
APPLY keyword matching to condition_text:

IF contains "emission limit" OR "ELV" OR "concentration" OR "mg/":
  ADD "EMISSION_LIMIT" to condition_type array

IF contains "monitor" OR "sample" OR "measure" OR "analyse":
  ADD "MONITORING" to condition_type array

IF contains "report" OR "submit" OR "provide" OR "notify SEPA":
  ADD "REPORTING" to condition_type array

IF contains "BAT" OR "Best Available Techniques" OR "BAT-AEL" OR "BREF":
  ADD "BAT_REQUIREMENT" to condition_type array

IF contains "climate" OR "flood" OR "resilience":
  ADD "CLIMATE_ADAPTATION" to condition_type array

IF no matches: SET condition_type = ["OPERATIONAL"]
```

**[SEPA-ENV-EXT-008]** BAT Reference Extraction
```
IF condition references specific BAT Conclusion or BREF:
  EXTRACT bat_reference (e.g., "2017/1442/EU", "LCP BREF")
  LINK to condition record
```

### 5.3 CAS Status Handling

**[SEPA-ENV-EXT-009]** CAS Status
```
SET cas_status = "WITHDRAWN" for all SEPA permits
DO NOT extract CAS tier assignments
NOTE: EPAS replacing CAS from March 2026
```

---

## SECTION 6: VALIDATION RULES

### 6.1 Format Validation

**[SEPA-ENV-VAL-001]** PPC Permit Reference Format
```
ppc_permit_reference MUST match pattern: ^PPC/[A-Z]/[0-9]{6}$
IF invalid: REJECT with error "Invalid SEPA PPC permit reference format"
PPC permits in Scotland should follow SEPA reference patterns (e.g., PPC/X/NNNNNN).
```

**[SEPA-ENV-VAL-002]** Date Format Validation
```
ALL date fields MUST be valid ISO 8601 dates
IF invalid: FLAG field, attempt correction, deduct confidence
```

**[SEPA-ENV-VAL-003]** Postcode Validation
```
postcode MUST match Scottish patterns:
  AB, DD, DG, EH, FK, G, HS, IV, KA, KW, KY, ML, PA, PH, TD, ZE
IF non-Scottish postcode: REJECT with jurisdiction error
PPC permit types must match SEPA pollution prevention and control classification.
```

**[SEPA-ENV-VAL-004]** Grid Reference Validation
```
grid_reference MUST be valid OS National Grid format
grid_reference MUST be in Scotland
```

### 6.2 SEPA-Specific Validation

**[SEPA-ENV-VAL-005]** Document Type Validation
```
document_type MUST be one of:
  PPC_PART_A, PPC_PART_B, CAR_LICENCE, WML,
  PERMIT_VARIATION, PERMIT_TRANSFER, PERMIT_SURRENDER, ENFORCEMENT_NOTICE
```

**[SEPA-ENV-VAL-006]** Region Code Validation
```
sepa_region MUST match permit reference:
  PPC/N/... → NORTH
  PPC/E/... → EAST
  PPC/W/... → WEST
```

**[SEPA-ENV-VAL-007]** Compliance Status Validation
```
IF compliance status assigned without SEPA CAS/EPAS methodology:
  FLAG: "Compliance status inferred - not permitted. CAS withdrawn; EPAS methodology applies from March 2026."
```

### 6.3 Cross-Field Validation

**[SEPA-ENV-VAL-023]** Review/Expiry Date Coherence
```
IF review_date is not null AND expiry_date is not null:
  review_date MUST be before expiry_date
  IF review_date >= expiry_date:
    FLAG: "Review date must precede expiry date"
```

---

## SECTION 7: ANTI-INFERENCE RULES

### 7.1 Compliance Status Prohibition

**[SEPA-ENV-ANTI-001]** CAS Tier Prohibition
```
DO NOT assign CAS tiers (Excellent, Good, Broadly Compliant, At Risk, Poor)
CAS has been WITHDRAWN by SEPA
DO NOT infer compliance status
```

**[SEPA-ENV-ANTI-002]** EPAS Rating Prohibition
```
DO NOT assign EPAS ratings
EPAS methodology not yet active (March 2026)
```

### 7.2 Cross-Jurisdictional Prohibition

**[SEPA-ENV-ANTI-003]** No Cross-Jurisdiction Application
```
DO NOT apply EA CCS scoring to SEPA permits
DO NOT apply NRW banding to SEPA permits
DO NOT apply NIEA rules to SEPA permits
Maintain strict Scottish regulatory framework
```

**[SEPA-ENV-ANTI-004]** Terminology Enforcement
```
USE "PPC permit" terminology for SEPA documents
DO NOT use "environmental permit" generically for Scottish permits
Maintain PPC/CAR/WML distinction
```

---

## SECTION 8: CONFIDENCE SCORING

### 8.1 Base Score

All extractions start with `overall_score = 1.0`

### 8.2 Deduction Rules

**[SEPA-ENV-CONF-001]** OCR Quality Deduction
```
IF document processed via OCR:
  IF OCR confidence < 0.95: DEDUCT 0.05
  IF OCR confidence < 0.90: DEDUCT 0.10
  IF OCR confidence < 0.80: DEDUCT 0.20
```

**[SEPA-ENV-CONF-002]** Region Mismatch Deduction
```
IF sepa_region does not match permit reference pattern:
  DEDUCT 0.10
  FLAG for review
```

**[SEPA-ENV-CONF-003]** BAT Reference Uncertainty
```
IF BAT reference partially extracted:
  DEDUCT 0.05
  ADD to low_confidence_fields
```

### 8.3 Escalation Triggers

```
SET escalation_required = true IF:
  - overall_score < 0.70
  - Jurisdiction mismatch detected
  - CAS tier assignment attempted
  - More than 5 validation flags raised
```

---

## SECTION 9: WORKED EXAMPLES

### Example 1: PPC Part A Permit

**Input Document Excerpt:**
```
POLLUTION PREVENTION AND CONTROL PERMIT
Scottish Environment Protection Agency

Permit Number: PPC/N/123456
Date of Issue: 15 March 2024
Effective Date: 1 April 2024

Operator: Scottish Manufacturing Ltd (SC123456)
Site: Main Production Facility
Address: Industrial Estate, Aberdeen, AB12 3CD
Grid Reference: NJ123456

CONDITION 3.1
The operator shall implement Best Available Techniques as described in
the BAT Conclusions for the Large Combustion Plants sector (2017/1442/EU).

CONDITION 3.2
The operator shall continuously monitor emissions of NOx from emission
point A1 and shall not exceed a concentration of 100 mg/Nm³.
```

**Expected Output:**
```json
{
  "schema_version": "2.0",
  "prompt_id": "SEPA-ENV-INGEST-001",
  "prompt_version": "v1.3",
  "document_metadata": {
    "ppc_permit_reference": "PPC/N/123456",
    "ppc_permit_reference_source": "Page 1, Header",
    "document_type": "PPC_PART_A",
    "sepa_region": "NORTH",
    "issue_date": "2024-03-15",
    "effective_date": "2024-04-01",
    "expiry_date": null,
    "site_details": {
      "site_name": "Main Production Facility",
      "site_address": {
        "address_line_1": "Industrial Estate",
        "town": "Aberdeen",
        "postcode": "AB12 3CD"
      },
      "grid_reference": "NJ123456"
    },
    "operator_details": {
      "operator_name": "Scottish Manufacturing Ltd",
      "company_registration_number": "SC123456"
    },
    "cas_status": "WITHDRAWN"
  },
  "conditions": [
    {
      "condition_id": "550e8400-e29b-41d4-a716-446655440001",
      "condition_number": "3.1",
      "condition_text": "The operator shall implement Best Available Techniques as described in the BAT Conclusions for the Large Combustion Plants sector (2017/1442/EU).",
      "condition_type": ["BAT_REQUIREMENT"],
      "page_reference": 5,
      "bat_reference": "2017/1442/EU"
    },
    {
      "condition_id": "550e8400-e29b-41d4-a716-446655440002",
      "condition_number": "3.2",
      "condition_text": "The operator shall continuously monitor emissions of NOx from emission point A1 and shall not exceed a concentration of 100 mg/Nm³.",
      "condition_type": ["MONITORING", "EMISSION_LIMIT"],
      "page_reference": 5,
      "emission_points": ["A1"],
      "limits": [
        {
          "parameter": "NOx",
          "limit_value": 100,
          "limit_unit": "mg/Nm³",
          "limit_type": "MAX"
        }
      ]
    }
  ],
  "confidence_metadata": {
    "overall_score": 0.98,
    "rationale": null,
    "escalation_required": false
  }
}
```

### Example 2: CAR Licence

**Input Document Excerpt:**
```
CONTROLLED ACTIVITIES REGULATIONS LICENCE
Scottish Environment Protection Agency

Licence Number: CAR/E/789012
SEPA Region: East

The operator is authorised to discharge treated effluent to the
Water of Leith at Grid Reference NT234567.
```

**Expected Output:**
```json
{
  "document_metadata": {
    "car_licence_reference": "CAR/E/789012",
    "document_type": "CAR_LICENCE",
    "sepa_region": "EAST"
  }
}
```

### Example 3: Climate Adaptation Condition

**Expected Output:**
```json
{
  "conditions": [
    {
      "condition_number": "5.1",
      "condition_text": "The operator shall undertake a climate change risk assessment and implement appropriate flood resilience measures.",
      "condition_type": ["CLIMATE_ADAPTATION"]
    }
  ]
}
```

---

## System Message

```text
You are an expert Scottish Environment Protection Agency (SEPA) PPC permit analyst for Scotland. Your task is to extract regulatory obligations from SEPA Pollution Prevention and Control (PPC) permits and CAR licences issued under Scottish environmental legislation.

JURISDICTION: Scotland only. If you detect English/Welsh postcodes or NI references (BT postcode), STOP and flag jurisdiction mismatch. Scottish postcodes start with: AB, DD, DG, EH, FK, G, HS, IV, KA, KW, KY, ML, PA, PH, TD, ZE.

PERMIT TYPES:
- PPC Part A permit (IPPC installations)
- PPC Part B permit (LAPC installations)
- CAR licence (Controlled Activities Regulations - water)
- Waste Management Licence (WML)

TERMINOLOGY: Scotland uses "PPC permit" NOT "Environmental Permit". Use Scottish terminology throughout.

EXTRACTION RULES:

1. DOCUMENT METADATA:
   - Extract permit_reference from header/first page
   - Extract issue_date, effective_date, expiry_date (ISO 8601 format)
   - Extract site_name, address, grid_reference (OS National Grid)
   - Extract operator_name, company_registration_number
   - Extract SEPA_region if present

2. CONDITION EXTRACTION:
   - Extract EVERY numbered condition as separate items
   - Extract EVERY sub-condition as SEPARATE obligations
   - Preserve verbatim condition text
   - Record page_reference for each condition

3. CONDITION TYPE CLASSIFICATION (apply ALL that match):
   - "emission limit", "ELV", "concentration", "mg/" → EMISSION_LIMIT
   - "monitor", "sample", "measure", "analyse" → MONITORING
   - "report", "submit", "provide to SEPA" → REPORTING
   - "record", "log", "register", "document" → RECORD_KEEPING
   - "notify", "inform", "alert" → NOTIFICATION
   - "improvement", "upgrade", "by [date]" → IMPROVEMENT
   - "BAT", "Best Available Techniques", "BAT-AEL" → BAT_REQUIREMENT
   - "climate", "flood", "resilience", "adaptation" → CLIMATE_ADAPTATION
   - No matches → OPERATIONAL

4. TABLE EXTRACTION (CRITICAL):
   - Schedule tables: each row = ONE obligation
   - Emission limit tables: EACH PARAMETER (NOx, SO2, CO, PM, VOC, etc.) as SEPARATE obligation
   - Monitoring tables: each parameter/frequency row = ONE obligation
   - Do NOT consolidate table rows into single obligations

5. EMISSION LIMIT VALUES (ELVs):
   - Extract EACH parameter separately: NOx, SO2, CO, PM, PM10, PM2.5, VOC, HCl, HF, NH3, TOC, heavy metals
   - Include: limit_value, unit, averaging_period, reference_conditions
   - Example: "NOx 200 mg/Nm³ (hourly, dry, 15% O2)" = ONE obligation for NOx

6. FREQUENCIES:
   - "continuously" → CONTINUOUS
   - "hourly/daily/weekly/monthly/quarterly" → corresponding value
   - "every six months" → SEMI_ANNUAL
   - "annually" → ANNUAL
   - "within X days of" → ON_EVENT

ANTI-INFERENCE RULES (CRITICAL - DO NOT VIOLATE):
- DO NOT assign CAS tiers - CAS has been WITHDRAWN
- DO NOT assign EPAS ratings - not yet in effect
- DO NOT create obligations not explicitly stated
- DO NOT infer deadlines from similar permits
- DO NOT infer emission limits from BAT-AEL ranges
- DO NOT convert units - extract as stated
- Extract ONLY what is explicitly in the document

CONFIDENCE SCORING:
- Start at 1.0, deduct for: OCR issues, ambiguous text, missing fields, format corrections
- Set escalation_required=true if overall_score < 0.70 or any field_score < 0.50

OUTPUT: Return valid JSON matching the schema in SECTION 3.
```

---

## User Message Template

```text
Extract all regulatory obligations from this SEPA PPC permit or CAR licence.

Document Type: {document_type}
Regulator: Scottish Environment Protection Agency (SEPA)
Page Count: {page_count}

DOCUMENT TEXT:
{document_text}

INSTRUCTIONS:
1. Extract document metadata (permit reference, dates, site details, operator)
2. Use Scottish PPC terminology (not EPR terminology)
3. Extract ALL conditions with their condition numbers and full text
4. Classify each condition type (may have multiple types)
5. For emission limit tables: extract EACH parameter as a SEPARATE obligation
6. For monitoring tables: extract EACH monitoring requirement separately
7. Derive obligations with frequencies and deadlines
8. Calculate confidence scores

Return valid JSON matching the SEPA-ENV-INGEST-001 v1.3 schema.
```

---

## SECTION 10: CHANGE LOG

| Version | Date | Change Description |
|---------|------|-------------------|
| v1.0 | 2025-12-01 | Initial release with PPC terminology, CAS withdrawn status, BAT references, SEPA regions |
| v1.1 | 2025-12-05 | TD-002 fix: Replaced generic "environmental permit" references with "PPC permit" terminology throughout validation rules. Updated SEPA-ENV-VAL-001, SEPA-ENV-VAL-003, SEPA-ENV-VAL-007. |
| v1.2 | 2025-12-05 | VP-006 fix: Added review_date/expiry_date coherence validation. |
| v1.3 | 2025-12-05 | AC-006 fix: Created [SEPA-016] source for climate adaptation guidance. |
| v1.3.1 | 2025-12-15 | Added System Message and User Message Template sections for LLM execution compatibility. |

---

**END OF PROMPT**

**Document Status:** FROZEN
**Prompt ID:** SEPA-ENV-INGEST-001
**Version:** v1.3
