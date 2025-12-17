# NIEA-ENV-INGEST-001 v1.3
## Northern Ireland Environment Agency Environmental Permit Ingestion Prompt

**Prompt ID:** NIEA-ENV-INGEST-001
**Version:** 1.3
**Status:** FROZEN
**Effective Date:** 2025-12-05
**Module:** Environmental Permits
**Regulator:** Northern Ireland Environment Agency (NIEA)
**Jurisdiction:** Northern Ireland

---

## SECTION 1: METADATA

```json
{
  "prompt_id": "NIEA-ENV-INGEST-001",
  "version": "1.3",
  "status": "FROZEN",
  "module": "ENVIRONMENTAL_PERMITS",
  "regulator": "NIEA",
  "jurisdiction": "NORTHERN_IRELAND",
  "document_types": [
    "PPC_PERMIT",
    "PERMIT_VARIATION",
    "PERMIT_TRANSFER",
    "PERMIT_SURRENDER",
    "ENFORCEMENT_NOTICE"
  ],
  "authority_sources": [
    "[NIEA-001] NIEA Environmental Permitting Guidance",
    "[NIEA-013] NIEA Climate Adaptation Guidance",
    "[UK-LEG-001] Environmental Permitting Regulations 2016"
  ],
  "last_updated": "2025-12-05",
  "author": "EcoComply Methodology Team"
}
```

---

## SECTION 2: SCOPE DEFINITION

### 2.1 Document Types Covered

This prompt applies to the extraction of regulatory obligations from NIEA Pollution Prevention and Control (PPC) permits issued under Northern Ireland environmental legislation.

**In Scope:**
- PPC Part A(1) permits (IPPC installations regulated by NIEA)
- PPC Part A(2) permits (IPPC installations regulated by district councils)
- PPC Part B permits (LAPC installations)
- Permit variations
- Permit transfers
- Permit surrenders
- Enforcement notices

**Out of Scope:**
- Pre-application advice documents
- Permit application forms
- Informal correspondence
- Draft permits not yet issued
- Permits issued by EA, NRW, or SEPA

### 2.2 Regulatory Framework

**Primary Legislation:**
- Pollution Prevention and Control Regulations (Northern Ireland) 2003
- Waste Management Licensing Regulations (Northern Ireland) 2003
- Water (Northern Ireland) Order 1999

**Regulatory Guidance:**
- NIEA Process Guidance Notes
- NIEA Pollution Prevention Guidelines
- BAT Reference Documents (BREFs)
- BAT Conclusions

### 2.3 Compliance Scoring Context

NIEA does NOT publish a formal compliance scoring methodology.

**IMPORTANT:** This prompt does NOT assign compliance scores or ratings. No published methodology exists for NIEA compliance scoring. Compliance status must be marked as "NO_PUBLISHED_METHODOLOGY". See Anti-Inference Rules.

### 2.4 Part A Subdivision

Northern Ireland uniquely subdivides Part A installations:

| Classification | Description | Regulator |
|---------------|-------------|-----------|
| Part A(1) | Large IPPC installations | NIEA |
| Part A(2) | Smaller IPPC installations | District Councils |
| Part B | LAPC installations | District Councils |

### 2.5 Local Councils

Northern Ireland has 11 local councils that may regulate Part A(2) and Part B installations:

1. Antrim and Newtownabbey
2. Ards and North Down
3. Armagh City, Banbridge and Craigavon
4. Belfast
5. Causeway Coast and Glens
6. Derry City and Strabane
7. Fermanagh and Omagh
8. Lisburn and Castlereagh
9. Mid and East Antrim
10. Mid Ulster
11. Newry, Mourne and Down

---

## SECTION 3: OUTPUT SCHEMA (JSON)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "NIEA Environmental Permit Extraction Output",
  "type": "object",
  "required": ["document_metadata", "conditions", "confidence_metadata"],
  "properties": {
    "schema_version": {
      "type": "string",
      "const": "2.0"
    },
    "prompt_id": {
      "type": "string",
      "const": "NIEA-ENV-INGEST-001"
    },
    "prompt_version": {
      "type": "string",
      "const": "v1.3"
    },
    "document_metadata": {
      "type": "object",
      "required": ["permit_reference", "document_type", "issue_date", "effective_date", "site_details", "operator_details"],
      "properties": {
        "permit_reference": {
          "type": "string",
          "pattern": "^[A-Z]{2,3}/[0-9]{4,6}$",
          "description": "NIEA permit reference number"
        },
        "permit_reference_source": {
          "type": "string"
        },
        "document_type": {
          "type": "string",
          "enum": ["PART_A_1", "PART_A_2", "PART_B"],
          "description": "Type of environmental permit. PART_A_1 = Part A(1), PART_A_2 = Part A(2), PART_B = Part B."
        },
        "regulating_authority": {
          "type": "string",
          "enum": ["NIEA", "LOCAL_COUNCIL"],
          "description": "Authority responsible for regulating the installation"
        },
        "local_council": {
          "type": ["string", "null"],
          "enum": [
            "ANTRIM_AND_NEWTOWNABBEY",
            "ARDS_AND_NORTH_DOWN",
            "ARMAGH_BANBRIDGE_CRAIGAVON",
            "BELFAST",
            "CAUSEWAY_COAST_AND_GLENS",
            "DERRY_CITY_AND_STRABANE",
            "FERMANAGH_AND_OMAGH",
            "LISBURN_AND_CASTLEREAGH",
            "MID_AND_EAST_ANTRIM",
            "MID_ULSTER",
            "NEWRY_MOURNE_AND_DOWN",
            null
          ],
          "description": "Local council if Part A(2) or Part B installation"
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
                  "pattern": "^BT[0-9]{1,2} ?[0-9][A-Z]{2}$"
                }
              }
            },
            "grid_reference": {
              "type": "string",
              "pattern": "^[A-Z]{1}[0-9]{6,8}$",
              "description": "Irish Grid Reference"
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
              "pattern": "^NI[0-9]{6}$|^[0-9]{8}$"
            },
            "registered_address": {
              "type": ["object", "null"]
            },
            "trading_name": {
              "type": ["string", "null"]
            }
          }
        },
        "compliance_methodology": {
          "type": "string",
          "const": "NO_PUBLISHED_METHODOLOGY",
          "description": "NIEA does not publish a formal compliance scoring methodology"
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
            "type": ["string", "null"]
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

NIEA PPC Permits typically follow this structure:

1. **Cover Page**: Permit reference, operator name, site name
2. **Part 1 - General**: Scope and interpretation
3. **Part 2 - Permitted Activities**: Activities and limits
4. **Part 3 - Operating Conditions**: Operational requirements
5. **Part 4 - Monitoring**: Monitoring and sampling
6. **Part 5 - Records and Reporting**: Record keeping and reporting
7. **Part 6 - Notifications**: Notification requirements
8. **Schedule A - Site Plan**: Location and boundary
9. **Schedule B - Emission Limits**: Tables of limits

### 4.3 Pre-Processing Requirements

Before extraction:
1. Verify document is an official NIEA or council permit (letterhead, reference format)
2. Confirm document is not marked "DRAFT"
3. Check document is not superseded by a later version
4. Validate postcode format: BT prefix required
5. Determine regulating authority (NIEA or local council)

---

## SECTION 5: EXTRACTION RULES

### 5.1 Document Metadata Extraction

**[NIEA-ENV-EXT-001]** Permit Reference Extraction
```
LOCATE permit reference in document header or first page
VALIDATE format: [A-Z]{2,3}/[0-9]{4,6}
IF format invalid: FLAG for review, do not reject
RECORD page_reference and source location
```

**[NIEA-ENV-EXT-002]** Issue Date Extraction
```
SEARCH for "Date of issue", "Issued on", "Permit dated"
EXTRACT date value
CONVERT to ISO 8601 format (YYYY-MM-DD)
IF ambiguous date format: FLAG for review
RECORD source location
```

**[NIEA-ENV-EXT-003]** Permit Type Extraction
```
IF document references "Part A(1)" or "Part A1" or "A(1)": SET document_type = "PART_A_1"
IF document references "Part A(2)" or "Part A2" or "A(2)": SET document_type = "PART_A_2"
IF document references "Part B": SET document_type = "PART_B"
```

**[NIEA-ENV-EXT-004]** Regulating Authority Extraction
```
IF document_type = "PART_A_1":
  SET regulating_authority = "NIEA"
  SET local_council = null
ELSE:
  SET regulating_authority = "LOCAL_COUNCIL"
  EXTRACT local_council from document header or issuing authority
```

**[NIEA-ENV-EXT-005]** Site Details Extraction
```
LOCATE site information section
EXTRACT site_name verbatim
EXTRACT full address components
EXTRACT grid reference (Irish Grid format)
VALIDATE postcode starts with BT
IF postcode NOT BT prefix: FLAG jurisdiction mismatch
```

**[NIEA-ENV-EXT-006]** Operator Details Extraction
```
LOCATE operator/permit holder section
EXTRACT operator_name verbatim
EXTRACT company_registration_number if present
VALIDATE NI company number format (NI prefix) or standard format
```

### 5.2 Condition Extraction

**[NIEA-ENV-EXT-007]** Condition Identification
```
FOR EACH numbered paragraph in permit:
  IF paragraph contains regulatory requirement language ("shall", "must", "will"):
    CREATE condition record
    PRESERVE original condition numbering
    EXTRACT full condition text verbatim
    RECORD page reference
```

**[NIEA-ENV-EXT-008]** Condition Type Classification
```
APPLY keyword matching to condition_text:

IF contains "emission limit" OR "ELV" OR "concentration" OR "mg/":
  ADD "EMISSION_LIMIT" to condition_type array

IF contains "monitor" OR "sample" OR "measure" OR "analyse":
  ADD "MONITORING" to condition_type array

IF contains "report" OR "submit" OR "provide" OR "notify":
  ADD "REPORTING" to condition_type array

IF contains "BAT" OR "Best Available Techniques" OR "BAT-AEL":
  ADD "BAT_REQUIREMENT" to condition_type array

IF contains "climate" OR "flood" OR "resilience":
  ADD "CLIMATE_ADAPTATION" to condition_type array

IF no matches: SET condition_type = ["OPERATIONAL"]
```

### 5.3 72-Hour Pre-notification

**[NIEA-ENV-EXT-009]** Pre-notification Requirements
```
IF document contains pre-notification requirements:
  EXTRACT notification_period (typically 72 hours in NI)
  LINK to relevant condition
  Note: 72-hour pre-notification applies to certain activities in NI
```

---

## SECTION 6: VALIDATION RULES

### 6.1 Format Validation

**[NIEA-ENV-VAL-001]** Permit Reference Format
```
permit_reference MUST match pattern: ^[A-Z]{2,3}/[0-9]{4,6}$
IF invalid: FLAG for review
```

**[NIEA-ENV-VAL-002]** Permit Type Validation
```
document_type MUST be one of:
  PART_A_1, PART_A_2, PART_B
Part A(1) and Part A(2) installations require different regulatory treatment.
```

**[NIEA-ENV-VAL-003]** Postcode Validation
```
postcode MUST match pattern: ^BT[0-9]{1,2} ?[0-9][A-Z]{2}$
IF non-BT postcode: REJECT with error "Non-NI postcode detected - verify jurisdiction"
```

**[NIEA-ENV-VAL-004]** Grid Reference Validation
```
grid_reference MUST be valid Irish Grid format
grid_reference MUST be in Northern Ireland
```

### 6.2 NIEA-Specific Validation

**[NIEA-ENV-VAL-005]** Part A Subdivision Check
```
IF document_type = PART_A_1:
  Validate against Part A(1) requirements (IPPC installations regulated by NIEA)
IF document_type = PART_A_2:
  Validate against Part A(2) requirements (IPPC installations regulated by district councils)
```

**[NIEA-ENV-VAL-006]** Local Council Validation
```
IF regulating_authority = "LOCAL_COUNCIL":
  local_council MUST be one of the 11 NI councils
  IF local_council not in ENUM: FLAG for review
```

**[NIEA-ENV-VAL-007]** Compliance Methodology
```
compliance_methodology MUST be "NO_PUBLISHED_METHODOLOGY"
DO NOT assign compliance scores
```

### 6.3 Cross-Field Validation

**[NIEA-ENV-VAL-023]** Review/Expiry Date Coherence
```
IF review_date is not null AND expiry_date is not null:
  review_date MUST be before expiry_date
  IF review_date >= expiry_date:
    FLAG: "Review date must precede expiry date"
```

---

## SECTION 7: ANTI-INFERENCE RULES

### 7.1 Compliance Status Prohibition

**[NIEA-ENV-ANTI-001]** Compliance Scoring Prohibition
```
DO NOT assign compliance scores
DO NOT calculate compliance ratings
NIEA does not publish a formal compliance scoring methodology
Mark compliance_methodology = "NO_PUBLISHED_METHODOLOGY"
```

**[NIEA-ENV-ANTI-002]** No Cross-Methodology Application
```
DO NOT apply EA CCS scoring to NIEA permits
DO NOT apply SEPA CAS/EPAS to NIEA permits
DO NOT apply NRW banding to NIEA permits
```

### 7.2 Cross-Jurisdictional Prohibition

**[NIEA-ENV-ANTI-003]** No Cross-Jurisdiction Application
```
DO NOT apply EA, NRW, or SEPA rules to NIEA permits
Maintain strict Northern Ireland regulatory framework
72-hour pre-notification rules may differ from other jurisdictions
```

### 7.3 Local Council Inference Prohibition

**[NIEA-ENV-ANTI-004]** No Council Inference
```
DO NOT infer local_council from postcode
EXTRACT local_council only from explicit document statement
IF unclear: SET local_council = null, FLAG for review
```

---

## SECTION 8: CONFIDENCE SCORING

### 8.1 Base Score

All extractions start with `overall_score = 1.0`

### 8.2 Deduction Rules

**[NIEA-ENV-CONF-001]** OCR Quality Deduction
```
IF document processed via OCR:
  IF OCR confidence < 0.95: DEDUCT 0.05
  IF OCR confidence < 0.90: DEDUCT 0.10
  IF OCR confidence < 0.80: DEDUCT 0.20
```

**[NIEA-ENV-CONF-002]** Part A Classification Uncertainty
```
IF Part A subdivision uncertain (A1 vs A2):
  DEDUCT 0.10
  FLAG for review
  ADD to low_confidence_fields
```

**[NIEA-ENV-CONF-003]** Local Council Uncertainty
```
IF local_council required but not extracted:
  DEDUCT 0.05
  FLAG for review
```

### 8.3 Escalation Triggers

```
SET escalation_required = true IF:
  - overall_score < 0.70
  - Jurisdiction mismatch detected
  - Part A subdivision unclear
  - Local council required but unidentified
  - More than 5 validation flags raised
```

---

## SECTION 9: WORKED EXAMPLES

### Example 1: Part A(1) NIEA Permit

**Input Document Excerpt:**
```
POLLUTION PREVENTION AND CONTROL PERMIT
Northern Ireland Environment Agency

Permit Number: PPC/123456
Date of Issue: 15 March 2024
Effective Date: 1 April 2024

Part A(1) Installation

Operator: Belfast Manufacturing Ltd (NI123456)
Site: Main Production Facility
Address: Industrial Estate, Belfast, BT1 2AB
Grid Reference: J345678

CONDITION 3.1
The operator shall implement Best Available Techniques as specified
in the relevant BAT Conclusions.

CONDITION 3.2
The operator shall continuously monitor emissions of NOx from emission
point A1 and shall not exceed a concentration of 100 mg/Nm³.
```

**Expected Output:**
```json
{
  "schema_version": "2.0",
  "prompt_id": "NIEA-ENV-INGEST-001",
  "prompt_version": "v1.3",
  "document_metadata": {
    "permit_reference": "PPC/123456",
    "permit_reference_source": "Page 1, Header",
    "document_type": "PART_A_1",
    "regulating_authority": "NIEA",
    "local_council": null,
    "issue_date": "2024-03-15",
    "effective_date": "2024-04-01",
    "expiry_date": null,
    "site_details": {
      "site_name": "Main Production Facility",
      "site_address": {
        "address_line_1": "Industrial Estate",
        "town": "Belfast",
        "postcode": "BT1 2AB"
      },
      "grid_reference": "J345678"
    },
    "operator_details": {
      "operator_name": "Belfast Manufacturing Ltd",
      "company_registration_number": "NI123456"
    },
    "compliance_methodology": "NO_PUBLISHED_METHODOLOGY"
  },
  "conditions": [
    {
      "condition_id": "550e8400-e29b-41d4-a716-446655440001",
      "condition_number": "3.1",
      "condition_text": "The operator shall implement Best Available Techniques as specified in the relevant BAT Conclusions.",
      "condition_type": ["BAT_REQUIREMENT"],
      "page_reference": 5
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

### Example 2: Part A(2) Local Council Permit

**Input Document Excerpt:**
```
POLLUTION PREVENTION AND CONTROL PERMIT
Belfast City Council

Permit Number: BCC/A2/001234
Part A(2) Installation

The operator is permitted to operate a coating installation
at the premises identified below.
```

**Expected Output:**
```json
{
  "document_metadata": {
    "permit_reference": "BCC/A2/001234",
    "document_type": "PART_A_2",
    "regulating_authority": "LOCAL_COUNCIL",
    "local_council": "BELFAST",
    "compliance_methodology": "NO_PUBLISHED_METHODOLOGY"
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
      "condition_text": "The operator shall assess climate change risks and implement appropriate adaptation measures to ensure site resilience.",
      "condition_type": ["CLIMATE_ADAPTATION"]
    }
  ]
}
```

---

## System Message

```text
You are an expert Northern Ireland Environment Agency (NIEA) PPC permit analyst for Northern Ireland. Your task is to extract regulatory obligations from NIEA Pollution Prevention and Control (PPC) permits issued under Northern Ireland environmental legislation.

JURISDICTION: Northern Ireland only. If you detect GB postcodes (not starting with BT), STOP and flag jurisdiction mismatch. Northern Ireland postcodes start with BT only.

PERMIT TYPES - Northern Ireland uniquely subdivides Part A:
- Part A(1): Large IPPC installations regulated by NIEA
- Part A(2): Smaller IPPC installations regulated by District Councils
- Part B: LAPC installations regulated by District Councils

LOCAL COUNCILS (11): Antrim and Newtownabbey, Ards and North Down, Armagh City Banbridge and Craigavon, Belfast, Causeway Coast and Glens, Derry City and Strabane, Fermanagh and Omagh, Lisburn and Castlereagh, Mid and East Antrim, Mid Ulster, Newry Mourne and Down

EXTRACTION RULES:

1. DOCUMENT METADATA:
   - Extract permit_reference from header/first page
   - Extract issue_date, effective_date, expiry_date (ISO 8601 format)
   - Extract site_name, address, grid_reference (Irish Grid or OS NI)
   - Extract operator_name, company_registration_number
   - Extract local_council if Part A(2) or Part B permit
   - Extract part_classification: PART_A_1, PART_A_2, or PART_B

2. CONDITION EXTRACTION:
   - Extract EVERY numbered condition as separate items
   - Extract EVERY sub-condition as SEPARATE obligations
   - Preserve verbatim condition text
   - Record page_reference for each condition

3. CONDITION TYPE CLASSIFICATION (apply ALL that match):
   - "emission limit", "ELV", "concentration", "mg/" → EMISSION_LIMIT
   - "monitor", "sample", "measure", "analyse" → MONITORING
   - "report", "submit", "provide to NIEA" → REPORTING
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
- DO NOT assign compliance scores - NIEA has NO PUBLISHED METHODOLOGY
- Set compliance_methodology = "NO_PUBLISHED_METHODOLOGY"
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
Extract all regulatory obligations from this NIEA PPC permit.

Document Type: {document_type}
Regulator: Northern Ireland Environment Agency (NIEA)
Page Count: {page_count}

DOCUMENT TEXT:
{document_text}

INSTRUCTIONS:
1. Extract document metadata (permit reference, dates, site details, operator)
2. Identify Part A(1), Part A(2), or Part B classification
3. Extract local_council if Part A(2) or Part B permit
4. Extract ALL conditions with their condition numbers and full text
5. Classify each condition type (may have multiple types)
6. For emission limit tables: extract EACH parameter as a SEPARATE obligation
7. For monitoring tables: extract EACH monitoring requirement separately
8. Derive obligations with frequencies and deadlines
9. Calculate confidence scores

Return valid JSON matching the NIEA-ENV-INGEST-001 v1.3 schema.
```

---

## SECTION 10: CHANGE LOG

| Version | Date | Change Description |
|---------|------|-------------------|
| v1.0 | 2025-12-01 | Initial release with Part A(1)/A(2)/B subdivision, local council field (11 councils), BT postcode validation |
| v1.1 | 2025-12-05 | TD-004 fix: Standardised Part A notation to PART_A_1 and PART_A_2 ENUM values with parenthetical display format. Updated extraction rule NIEA-ENV-EXT-003 and validation rules NIEA-ENV-VAL-002, NIEA-ENV-VAL-005. |
| v1.2 | 2025-12-05 | VP-006 fix: Added review_date/expiry_date coherence validation. |
| v1.3 | 2025-12-05 | AC-006 fix: Created [NIEA-013] source for climate adaptation guidance. |
| v1.3.1 | 2025-12-15 | Added System Message and User Message Template sections for LLM execution compatibility. |

---

**END OF PROMPT**

**Document Status:** FROZEN
**Prompt ID:** NIEA-ENV-INGEST-001
**Version:** v1.3
