# EA-ENV-INGEST-001 v1.3
## Environment Agency Environmental Permit Ingestion Prompt

**Prompt ID:** EA-ENV-INGEST-001
**Version:** 1.3
**Status:** FROZEN
**Effective Date:** 2025-12-05
**Module:** Environmental Permits
**Regulator:** Environment Agency (EA)
**Jurisdiction:** England

---

## SECTION 1: METADATA

```json
{
  "prompt_id": "EA-ENV-INGEST-001",
  "version": "1.3",
  "status": "FROZEN",
  "module": "ENVIRONMENTAL_PERMITS",
  "regulator": "EA",
  "jurisdiction": "ENGLAND",
  "document_types": [
    "BESPOKE_PERMIT",
    "STANDARD_RULES_PERMIT",
    "PERMIT_VARIATION",
    "PERMIT_TRANSFER",
    "PERMIT_SURRENDER",
    "ENFORCEMENT_NOTICE"
  ],
  "authority_sources": [
    "[EA-001] EA Environmental Permitting Guidance",
    "[EA-007] Hazardous Waste Regulations 2005",
    "[EA-020] EA Climate Adaptation Guidance",
    "[EA-021] EA BAT Conclusions Implementation",
    "[UK-LEG-001] Environmental Permitting Regulations 2016"
  ],
  "last_updated": "2025-12-05",
  "author": "EcoComply Methodology Team"
}
```

---

## SECTION 2: SCOPE DEFINITION

### 2.1 Document Types Covered

This prompt applies to the extraction of regulatory obligations from Environment Agency environmental permits issued under the Environmental Permitting (England and Wales) Regulations 2016.

**In Scope:**
- Bespoke environmental permits (Installation, Waste, Water Discharge, Groundwater)
- Standard Rules Permits
- Permit variations (full and partial)
- Permit transfers
- Permit surrenders
- Enforcement notices related to permitted activities

**Out of Scope:**
- Pre-application advice documents
- Permit application forms (input documents)
- Informal correspondence
- Draft permits not yet issued
- Permits issued by NRW, SEPA, or NIEA

### 2.2 Regulatory Framework

**Primary Legislation:**
- Environmental Permitting (England and Wales) Regulations 2016 (as amended)
- Environment Act 1995
- Pollution Prevention and Control Act 1999

**Regulatory Guidance:**
- EA Environmental Permitting Guidance
- Sector-specific guidance notes
- BAT Reference Documents (BREFs)
- BAT Conclusions

### 2.3 Compliance Scoring Context

The Environment Agency uses the Compliance Classification Scheme (CCS) for scoring permit breaches:
- Category 1 (C1): Major breach - 60 points
- Category 2 (C2): Significant breach - 31 points
- Category 3 (C3): Minor breach - 4 points
- Category 4 (C4): Administrative breach - 0.1 points

**Compliance Bands:**
- Band A: 0 points (full compliance)
- Band B: 0.1 - 3.9 points
- Band C: 4 - 30.9 points
- Band D: 31 - 59.9 points
- Band E: 60 - 119.9 points
- Band F: 120+ points

**IMPORTANT:** This prompt does NOT assign compliance scores or bands. CCS scoring is performed by EA only. See Anti-Inference Rules.

---

## SECTION 3: OUTPUT SCHEMA (JSON)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "EA Environmental Permit Extraction Output",
  "type": "object",
  "required": ["document_metadata", "conditions", "confidence_metadata"],
  "properties": {
    "schema_version": {
      "type": "string",
      "const": "2.0"
    },
    "prompt_id": {
      "type": "string",
      "const": "EA-ENV-INGEST-001"
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
          "pattern": "^EPR/[A-Z]{2}[0-9]{4}[A-Z]{2}(/[A-Z][0-9]{3})?$",
          "description": "EA permit reference number"
        },
        "permit_reference_source": {
          "type": "string",
          "description": "Page/section where permit reference was extracted"
        },
        "document_type": {
          "type": "string",
          "enum": ["BESPOKE_PERMIT", "STANDARD_RULES_PERMIT", "PERMIT_VARIATION", "PERMIT_TRANSFER", "PERMIT_SURRENDER", "ENFORCEMENT_NOTICE"]
        },
        "permit_type": {
          "type": "string",
          "enum": ["INSTALLATION", "WASTE", "WATER_DISCHARGE", "GROUNDWATER", "MINING_WASTE", "RADIOACTIVE_SUBSTANCES"]
        },
        "issue_date": {
          "type": "string",
          "format": "date",
          "description": "Date permit was issued (ISO 8601)"
        },
        "issue_date_source": {
          "type": "string"
        },
        "effective_date": {
          "type": "string",
          "format": "date",
          "description": "Date permit comes into effect"
        },
        "expiry_date": {
          "type": ["string", "null"],
          "format": "date",
          "description": "Permit expiry date if applicable (null for perpetual permits)"
        },
        "review_date": {
          "type": ["string", "null"],
          "format": "date",
          "description": "Next scheduled permit review date"
        },
        "supersedes_reference": {
          "type": ["string", "null"],
          "description": "Reference of permit this document supersedes"
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
              "pattern": "^[A-Z]{2}[0-9]{6,10}$",
              "description": "OS National Grid Reference"
            },
            "local_authority": {
              "type": ["string", "null"]
            },
            "ea_area": {
              "type": ["string", "null"],
              "description": "EA administrative area"
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
              "pattern": "^[0-9]{8}$|^[A-Z]{2}[0-9]{6}$"
            },
            "registered_address": {
              "type": ["object", "null"]
            },
            "trading_name": {
              "type": ["string", "null"]
            }
          }
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
            "type": "string",
            "description": "Original condition numbering from permit (e.g., '2.3.1')"
          },
          "condition_text": {
            "type": "string",
            "description": "Verbatim text of the condition"
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
            "uniqueItems": true,
            "description": "Array of condition type classifications"
          },
          "schedule_reference": {
            "type": ["string", "null"],
            "description": "Schedule or annex where condition appears"
          },
          "page_reference": {
            "type": "integer",
            "description": "Page number in source document"
          },
          "tables": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "table_id": { "type": "string" },
                "table_title": { "type": ["string", "null"] },
                "table_data": { "type": "array" }
              }
            },
            "description": "Embedded tables within condition"
          },
          "cross_references": {
            "type": "array",
            "items": { "type": "string" },
            "description": "References to other conditions"
          },
          "emission_points": {
            "type": "array",
            "items": { "type": "string" },
            "description": "Emission point references if applicable"
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
          "obligation_id": {
            "type": "string",
            "format": "uuid"
          },
          "source_condition_id": {
            "type": "string",
            "format": "uuid"
          },
          "obligation_type": {
            "type": "array",
            "items": { "type": "string" }
          },
          "description": {
            "type": "string"
          },
          "action_required": {
            "type": "string"
          },
          "frequency": {
            "type": "string",
            "enum": ["CONTINUOUS", "HOURLY", "DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL", "AD_HOC", "ONE_TIME", "ON_EVENT"]
          },
          "deadline": {
            "type": ["string", "null"],
            "format": "date"
          },
          "recurrence_rule": {
            "type": ["string", "null"],
            "description": "RRULE format recurrence specification"
          },
          "responsible_party": {
            "type": "string",
            "enum": ["OPERATOR", "REGULATOR", "THIRD_PARTY"]
          },
          "evidence_required": {
            "type": "boolean"
          }
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
        "overall_score": {
          "type": "number",
          "minimum": 0,
          "maximum": 1
        },
        "rationale": {
          "type": ["string", "null"],
          "description": "Explanation referencing applicable extraction or uncertainty rule IDs when deductions occur"
        },
        "field_scores": {
          "type": "object",
          "additionalProperties": { "type": "number" }
        },
        "low_confidence_fields": {
          "type": "array",
          "items": { "type": "string" }
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
          "type": "boolean"
        }
      }
    },
    "source_traceability": {
      "type": "object",
      "properties": {
        "authority_sources": {
          "type": "array",
          "items": { "type": "string" }
        },
        "extraction_rules_applied": {
          "type": "array",
          "items": { "type": "string" }
        },
        "validation_rules_applied": {
          "type": "array",
          "items": { "type": "string" }
        }
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
- Document must be complete (no missing sections)

### 4.2 Expected Document Structure

EA Environmental Permits typically follow this structure:

1. **Cover Page**: Permit reference, operator name, site name
2. **Introductory Note**: Explains permit structure
3. **Part A - Permit**: Main conditions
4. **Part B - Site Plan(s)**: Location and boundary plans
5. **Schedule 1 - Operations**: Permitted activities
6. **Schedule 2 - Waste Types**: Accepted waste codes (if applicable)
7. **Schedule 3 - Emissions**: Emission limits and points
8. **Schedule 4 - Reporting**: Reporting requirements
9. **Schedule 5 - Notifications**: Notification requirements
10. **Schedule 6 - Interpretation**: Definitions

### 4.3 Pre-Processing Requirements

Before extraction:
1. Verify document is an official EA permit (letterhead, reference format)
2. Confirm document is not marked "DRAFT"
3. Check document is not superseded by a later version
4. Validate permit reference format: EPR/XX9999XX

---

## SECTION 5: EXTRACTION RULES

### 5.1 Document Metadata Extraction

**[EA-ENV-EXT-001]** Permit Reference Extraction
```
LOCATE permit reference in document header or first page
VALIDATE format: EPR/[A-Z]{2}[0-9]{4}[A-Z]{2}(/[A-Z][0-9]{3})?
IF format invalid: FLAG for review, do not reject
RECORD page_reference and source location
```

**[EA-ENV-EXT-002]** Issue Date Extraction
```
SEARCH for "Date of issue", "Issued on", "Permit dated"
EXTRACT date value
CONVERT to ISO 8601 format (YYYY-MM-DD)
IF ambiguous date format (e.g., 01/02/2024): FLAG for review
RECORD source location
```

**[EA-ENV-EXT-003]** Effective Date Extraction
```
SEARCH for "Effective from", "Takes effect", "Comes into force"
IF not found: DEFAULT to issue_date
CONVERT to ISO 8601 format
```

**[EA-ENV-EXT-004]** Expiry Date Extraction
```
SEARCH for "Expires on", "Valid until", "Expiry date"
IF not found: SET to null (perpetual permit)
IF found: CONVERT to ISO 8601 format
```

**[EA-ENV-EXT-005]** Site Details Extraction
```
LOCATE site information section
EXTRACT site_name verbatim
EXTRACT full address components
EXTRACT grid reference (OS National Grid format)
VALIDATE postcode format for England
IF postcode starts with Welsh prefix: FLAG jurisdiction mismatch
```

**[EA-ENV-EXT-006]** Operator Details Extraction
```
LOCATE operator/permit holder section
EXTRACT operator_name verbatim
EXTRACT company_registration_number if present
VALIDATE company number format (8 digits or 2 letters + 6 digits)
```

### 5.2 Condition Extraction

**[EA-ENV-EXT-007]** Condition Identification
```
FOR EACH numbered paragraph in permit:
  IF paragraph contains regulatory requirement language ("shall", "must", "will"):
    CREATE condition record
    PRESERVE original condition numbering
    EXTRACT full condition text verbatim
    RECORD page reference
```

**[EA-ENV-EXT-008]** Condition Type Classification
```
APPLY keyword matching to condition_text:

IF contains "emission limit" OR "ELV" OR "concentration" OR "mg/":
  ADD "EMISSION_LIMIT" to condition_type array

IF contains "monitor" OR "sample" OR "measure" OR "analyse":
  ADD "MONITORING" to condition_type array

IF contains "report" OR "submit" OR "provide" OR "notify the Agency":
  ADD "REPORTING" to condition_type array

IF contains "record" OR "log" OR "register" OR "document":
  ADD "RECORD_KEEPING" to condition_type array

IF contains "notify" OR "inform" OR "alert":
  ADD "NOTIFICATION" to condition_type array

IF contains "improvement" OR "upgrade" OR "by [date]":
  ADD "IMPROVEMENT" to condition_type array

IF contains "BAT" OR "Best Available Techniques" OR "BAT-AEL":
  ADD "BAT_REQUIREMENT" to condition_type array

IF contains "climate" OR "flood" OR "resilience" OR "adaptation":
  ADD "CLIMATE_ADAPTATION" to condition_type array

IF no matches: SET condition_type = ["OPERATIONAL"]
```

**[EA-ENV-EXT-009]** Table Extraction
```
FOR EACH table within condition text:
  EXTRACT table_id (generate if not present)
  EXTRACT table_title if present
  EXTRACT all rows and columns preserving structure
  LINK to parent condition
```

**[EA-ENV-EXT-010]** Cross-Reference Extraction
```
SEARCH condition_text for references to other conditions
PATTERN: "condition [0-9.]+" OR "paragraph [0-9.]+"
ADD referenced conditions to cross_references array
```

**[EA-ENV-EXT-011]** Emission Point Extraction
```
SEARCH condition_text for emission point references
PATTERN: "A[0-9]+" OR "W[0-9]+" OR "emission point [A-Z0-9]+"
ADD to emission_points array
```

### 5.3 Limit Extraction

**[EA-ENV-EXT-012]** Numeric Limit Extraction
```
FOR EACH condition with EMISSION_LIMIT type:
  SEARCH for numeric values with units
  EXTRACT parameter name
  EXTRACT limit_value (numeric)
  EXTRACT limit_unit (e.g., mg/Nm³, mg/l, kg/day)
  DETERMINE limit_type (MAX, MIN, AVERAGE, PERCENTILE)
  EXTRACT averaging_period if specified
  EXTRACT reference_conditions if specified (e.g., "at STP", "dry gas")
```

### 5.4 Temporal Extraction

**[EA-ENV-EXT-013]** Frequency Extraction
```
SEARCH condition_text for frequency indicators:
  "continuously" → CONTINUOUS
  "hourly" → HOURLY
  "daily" → DAILY
  "weekly" → WEEKLY
  "monthly" → MONTHLY
  "quarterly" → QUARTERLY
  "every six months" OR "twice yearly" → SEMI_ANNUAL
  "annually" OR "once per year" → ANNUAL
  "within [X] days of" → ON_EVENT
  No frequency specified → AD_HOC
```

**[EA-ENV-EXT-014]** Deadline Extraction
```
SEARCH for specific dates in condition_text
PATTERN: "by [date]", "before [date]", "no later than [date]"
CONVERT to ISO 8601 format
```

### 5.5 Obligation Derivation

**[EA-ENV-EXT-015]** Obligation Creation
```
FOR EACH condition:
  IF condition contains action verb:
    CREATE obligation record
    SET source_condition_id
    COPY obligation_type from condition_type
    GENERATE description from condition_text (first sentence)
    EXTRACT action_required (verb + object)
    SET frequency from extracted temporal data
    SET deadline if applicable
    SET responsible_party = "OPERATOR" (default)
    SET evidence_required based on obligation_type
```

### 5.6 Evidence Requirement Derivation

**[EA-ENV-EXT-016]** Evidence Requirement Creation
```
FOR EACH obligation:
  IF obligation_type includes "MONITORING":
    CREATE evidence_requirement:
      evidence_type = "MONITORING_DATA"
      retention_period_years = 6
    CREATE evidence_requirement:
      evidence_type = "CALIBRATION_RECORDS"
      retention_period_years = 6

  IF obligation_type includes "REPORTING":
    CREATE evidence_requirement:
      evidence_type = "SUBMITTED_REPORT"
      retention_period_years = 6
    CREATE evidence_requirement:
      evidence_type = "SUBMISSION_RECEIPT"
      retention_period_years = 6

  IF obligation_type includes "RECORD_KEEPING":
    CREATE evidence_requirement:
      evidence_type = "LOG_ENTRIES"
      retention_period_years = 6

  IF obligation_type includes "EMISSION_LIMIT":
    CREATE evidence_requirement:
      evidence_type = "LAB_ANALYSIS"
      retention_period_years = 6
```

### 5.7 BAT Requirement Extraction

**[EA-ENV-EXT-022]** BAT_REQUIREMENT extraction
```
IF condition text references "Best Available Techniques", "BAT", "BAT conclusions", "BAT-AEL", or "BAT reference document (BREF)":
  INCLUDE "BAT_REQUIREMENT" in condition_type array
Source: [EA-021] IED BAT Conclusions Implementation
```

---

## SECTION 6: VALIDATION RULES

### 6.1 Format Validation

**[EA-ENV-VAL-001]** Permit Reference Format
```
permit_reference MUST match pattern: ^EPR/[A-Z]{2}[0-9]{4}[A-Z]{2}(/[A-Z][0-9]{3})?$
IF invalid: REJECT with error "Invalid EA permit reference format"
```

**[EA-ENV-VAL-002]** Date Format Validation
```
ALL date fields MUST be valid ISO 8601 dates
IF invalid: FLAG field, attempt correction, deduct confidence
```

**[EA-ENV-VAL-003]** Postcode Validation
```
postcode MUST match English postcode pattern
postcode MUST NOT start with: LL, LD, CF, SA, NP, SY1-SY11 (Wales)
IF Welsh postcode: REJECT with error "Welsh postcode detected - use NRW-ENV-INGEST-001"
```

**[EA-ENV-VAL-004]** Grid Reference Validation
```
grid_reference MUST be valid OS National Grid format
grid_reference MUST be in England (first two letters indicate region)
```

### 6.2 Logical Validation

**[EA-ENV-VAL-005]** Date Coherence
```
effective_date MUST be >= issue_date
IF expiry_date present: expiry_date MUST be > effective_date
IF review_date present: review_date MUST be > issue_date AND review_date MUST be < expiry_date (if present)
```

**[EA-ENV-VAL-006]** Condition Numbering
```
condition_number values SHOULD be unique within document
IF duplicates found: FLAG for review
```

**[EA-ENV-VAL-007]** Cross-Reference Validation
```
FOR EACH cross_reference in condition:
  Referenced condition MUST exist in conditions array
  IF not found: FLAG "Unresolved cross-reference"
```

### 6.3 Completeness Validation

**[EA-ENV-VAL-008]** Required Fields
```
document_metadata.permit_reference: REQUIRED
document_metadata.document_type: REQUIRED
document_metadata.issue_date: REQUIRED
document_metadata.effective_date: REQUIRED
document_metadata.site_details.site_name: REQUIRED
document_metadata.site_details.grid_reference: REQUIRED
document_metadata.operator_details.operator_name: REQUIRED
conditions array: MUST have at least 1 item
```

**[EA-ENV-VAL-009]** Condition Completeness
```
EACH condition MUST have:
  - condition_number
  - condition_text (minimum 10 characters)
  - condition_type (minimum 1 value)
  - page_reference
```

### 6.4 ENUM Validation

**[EA-ENV-VAL-010]** Document Type ENUM
```
document_type MUST be one of:
  BESPOKE_PERMIT, STANDARD_RULES_PERMIT, PERMIT_VARIATION,
  PERMIT_TRANSFER, PERMIT_SURRENDER, ENFORCEMENT_NOTICE
```

**[EA-ENV-VAL-011]** Condition Type ENUM
```
ALL values in condition_type array MUST be valid ENUM values
REJECT any value not in defined ENUM set
```

**[EA-ENV-VAL-012]** Frequency ENUM
```
frequency MUST be one of:
  CONTINUOUS, HOURLY, DAILY, WEEKLY, MONTHLY, QUARTERLY,
  SEMI_ANNUAL, ANNUAL, AD_HOC, ONE_TIME, ON_EVENT
```

### 6.5 Cross-Field Validation

**[EA-ENV-VAL-023]** Review/Expiry Date Coherence
```
IF review_date is not null AND expiry_date is not null:
  review_date MUST be before expiry_date
  IF review_date >= expiry_date:
    FLAG: "Review date must precede expiry date"
```

---

## SECTION 7: ANTI-INFERENCE RULES

### 7.1 Compliance Status Prohibition

**[EA-ENV-ANTI-001]** Compliance Band Prohibition
```
DO NOT assign compliance bands (A, B, C, D, E, F)
DO NOT calculate CCS points
DO NOT infer compliance status from permit conditions
Compliance status is determined by EA only
Source: CCS is published by EA, not derived from permits
```

**[EA-ENV-ANTI-002]** Breach Category Prohibition
```
DO NOT categorise potential breaches (C1, C2, C3, C4)
DO NOT assess severity of conditions
DO NOT rank conditions by importance
```

### 7.2 Obligation Derivation Prohibition

**[EA-ENV-ANTI-003]** No Implied Obligations
```
DO NOT create obligations not explicitly stated in condition text
DO NOT infer obligations from permit type or sector
DO NOT assume standard conditions apply unless explicitly included
```

**[EA-ENV-ANTI-004]** No Deadline Inference
```
DO NOT infer deadlines from similar permits
DO NOT assume regulatory deadlines not stated in permit
DO NOT apply sector guidance deadlines unless referenced in permit
```

### 7.3 Limit Value Prohibition

**[EA-ENV-ANTI-005]** No Limit Inference
```
DO NOT infer emission limits from BAT-AEL ranges
DO NOT calculate limits from related parameters
DO NOT assume industry-standard limits apply
Extract only explicitly stated limits
```

**[EA-ENV-ANTI-006]** No Unit Conversion
```
DO NOT convert units unless explicitly instructed
Extract values in units as stated in document
```

### 7.4 Classification Prohibition

**[EA-ENV-ANTI-007]** No Activity Inference
```
DO NOT infer permitted activities beyond those explicitly listed
DO NOT classify installation type beyond explicit statement
DO NOT assume sector codes
```

**[EA-ENV-ANTI-008]** No Condition Type Expansion
```
DO NOT assign condition_type values beyond keyword matching
IF uncertain: default to OPERATIONAL
FLAG for human review if classification uncertain
```

### 7.5 Cross-Jurisdictional Prohibition

**[EA-ENV-ANTI-009]** No Cross-Jurisdiction Application
```
DO NOT apply NRW, SEPA, or NIEA rules to EA permits
DO NOT assume EA guidance applies to other jurisdictions
Maintain strict jurisdictional separation
```

---

## SECTION 8: CONFIDENCE SCORING

### 8.1 Base Score

All extractions start with `overall_score = 1.0`

### 8.2 Deduction Rules

**[EA-ENV-CONF-001]** OCR Quality Deduction
```
IF document processed via OCR:
  IF OCR confidence < 0.95: DEDUCT 0.05
  IF OCR confidence < 0.90: DEDUCT 0.10
  IF OCR confidence < 0.80: DEDUCT 0.20
  ADD affected fields to low_confidence_fields
```

**[EA-ENV-CONF-002]** Missing Optional Field Deduction
```
FOR EACH optional field not found:
  IF field is commonly present: DEDUCT 0.02
  No deduction for rarely-present fields
```

**[EA-ENV-CONF-003]** Format Correction Deduction
```
IF date format required correction: DEDUCT 0.05
IF postcode format required correction: DEDUCT 0.05
IF permit reference format required correction: DEDUCT 0.10
```

**[EA-ENV-CONF-004]** Ambiguity Deduction
```
IF condition_type classification uncertain: DEDUCT 0.05 per condition
IF cross-reference unresolved: DEDUCT 0.05 per reference
IF table extraction incomplete: DEDUCT 0.10 per table
```

**[EA-ENV-CONF-005]** Document Quality Deduction
```
IF document has watermark: DEDUCT 0.05
IF document marked "DRAFT": DEDUCT 0.30, SET escalation_required = true
IF document appears superseded: DEDUCT 0.40, SET escalation_required = true
IF pages missing: DEDUCT 0.20, SET escalation_required = true
```

### 8.3 Escalation Triggers

```
SET escalation_required = true IF:
  - overall_score < 0.70
  - Any field_score < 0.50
  - Document marked as DRAFT
  - Document appears superseded
  - Pages missing
  - More than 5 validation flags raised
  - Anti-inference rule violation detected
```

### 8.4 Confidence Metadata Assembly

```
confidence_metadata = {
  "overall_score": calculated_score,
  "rationale": "Deducted [X] for [reason] per [rule_id]" (if deductions applied),
  "field_scores": { field_name: score, ... },
  "low_confidence_fields": [fields with score < 0.7],
  "deductions_applied": [
    { "rule_id": "EA-ENV-CONF-001", "deduction": 0.10, "field_affected": "condition_text", "reason": "OCR confidence 0.85" }
  ],
  "escalation_required": boolean
}
```

---

## SECTION 9: WORKED EXAMPLES

### Example 1: Standard Bespoke Permit

**Input Document Excerpt:**
```
ENVIRONMENTAL PERMIT
Environment Agency

Permit Number: EPR/AB1234CD
Date of Issue: 15 March 2024
Effective Date: 1 April 2024

Operator: ABC Manufacturing Ltd
Company Registration: 12345678
Site: Main Production Facility
Address: Industrial Estate, Birmingham, B1 2CD
Grid Reference: SP123456

CONDITION 2.3.1
The operator shall continuously monitor emissions of NOx from emission
point A1 and shall not exceed a concentration of 100 mg/Nm³ (daily average,
at STP, dry gas basis).

CONDITION 2.3.2
The operator shall submit quarterly emission reports to the Environment
Agency by the 28th day of the month following each quarter end.
```

**Expected Output:**
```json
{
  "schema_version": "2.0",
  "prompt_id": "EA-ENV-INGEST-001",
  "prompt_version": "v1.3",
  "document_metadata": {
    "permit_reference": "EPR/AB1234CD",
    "permit_reference_source": "Page 1, Header",
    "document_type": "BESPOKE_PERMIT",
    "permit_type": "INSTALLATION",
    "issue_date": "2024-03-15",
    "issue_date_source": "Page 1, 'Date of Issue'",
    "effective_date": "2024-04-01",
    "expiry_date": null,
    "review_date": null,
    "site_details": {
      "site_name": "Main Production Facility",
      "site_address": {
        "address_line_1": "Industrial Estate",
        "town": "Birmingham",
        "postcode": "B1 2CD"
      },
      "grid_reference": "SP123456"
    },
    "operator_details": {
      "operator_name": "ABC Manufacturing Ltd",
      "company_registration_number": "12345678"
    }
  },
  "conditions": [
    {
      "condition_id": "550e8400-e29b-41d4-a716-446655440001",
      "condition_number": "2.3.1",
      "condition_text": "The operator shall continuously monitor emissions of NOx from emission point A1 and shall not exceed a concentration of 100 mg/Nm³ (daily average, at STP, dry gas basis).",
      "condition_type": ["MONITORING", "EMISSION_LIMIT"],
      "page_reference": 5,
      "emission_points": ["A1"],
      "limits": [
        {
          "parameter": "NOx",
          "limit_value": 100,
          "limit_unit": "mg/Nm³",
          "limit_type": "MAX",
          "averaging_period": "daily average",
          "reference_conditions": "at STP, dry gas basis"
        }
      ]
    },
    {
      "condition_id": "550e8400-e29b-41d4-a716-446655440002",
      "condition_number": "2.3.2",
      "condition_text": "The operator shall submit quarterly emission reports to the Environment Agency by the 28th day of the month following each quarter end.",
      "condition_type": ["REPORTING"],
      "page_reference": 5
    }
  ],
  "obligations": [
    {
      "obligation_id": "660e8400-e29b-41d4-a716-446655440001",
      "source_condition_id": "550e8400-e29b-41d4-a716-446655440001",
      "obligation_type": ["MONITORING"],
      "description": "Continuous NOx monitoring at emission point A1",
      "action_required": "Monitor emissions of NOx continuously",
      "frequency": "CONTINUOUS",
      "responsible_party": "OPERATOR",
      "evidence_required": true
    },
    {
      "obligation_id": "660e8400-e29b-41d4-a716-446655440002",
      "source_condition_id": "550e8400-e29b-41d4-a716-446655440001",
      "obligation_type": ["EMISSION_LIMIT"],
      "description": "NOx emission limit compliance at A1",
      "action_required": "Not exceed 100 mg/Nm³ NOx concentration",
      "frequency": "CONTINUOUS",
      "responsible_party": "OPERATOR",
      "evidence_required": true
    },
    {
      "obligation_id": "660e8400-e29b-41d4-a716-446655440003",
      "source_condition_id": "550e8400-e29b-41d4-a716-446655440002",
      "obligation_type": ["REPORTING"],
      "description": "Quarterly emission report submission",
      "action_required": "Submit quarterly emission reports",
      "frequency": "QUARTERLY",
      "deadline": null,
      "recurrence_rule": "FREQ=QUARTERLY;BYMONTHDAY=28",
      "responsible_party": "OPERATOR",
      "evidence_required": true
    }
  ],
  "confidence_metadata": {
    "overall_score": 0.98,
    "rationale": null,
    "field_scores": {
      "permit_reference": 1.0,
      "issue_date": 1.0,
      "operator_name": 1.0,
      "conditions": 0.98
    },
    "low_confidence_fields": [],
    "deductions_applied": [
      {
        "rule_id": "EA-ENV-CONF-002",
        "deduction": 0.02,
        "field_affected": "expiry_date",
        "reason": "Optional field not present (perpetual permit)"
      }
    ],
    "escalation_required": false
  },
  "source_traceability": {
    "authority_sources": ["[EA-001]"],
    "extraction_rules_applied": ["EA-ENV-EXT-001", "EA-ENV-EXT-002", "EA-ENV-EXT-007", "EA-ENV-EXT-008", "EA-ENV-EXT-012"],
    "validation_rules_applied": ["EA-ENV-VAL-001", "EA-ENV-VAL-002", "EA-ENV-VAL-005", "EA-ENV-VAL-008"]
  }
}
```

### Example 2: Permit with BAT Requirements and Climate Adaptation

**Input Document Excerpt:**
```
CONDITION 3.1.5
The operator shall implement Best Available Techniques as described in
the BAT Conclusions for the Large Combustion Plants sector (2017/1442/EU)
and achieve BAT-AEL compliance by 17 August 2021.

CONDITION 4.2.1
The operator shall undertake a climate change risk assessment and implement
appropriate adaptation measures to ensure site resilience against flood
risk and extreme weather events. The assessment shall be completed by
31 December 2024.
```

**Expected Output (conditions array):**
```json
{
  "conditions": [
    {
      "condition_id": "550e8400-e29b-41d4-a716-446655440010",
      "condition_number": "3.1.5",
      "condition_text": "The operator shall implement Best Available Techniques as described in the BAT Conclusions for the Large Combustion Plants sector (2017/1442/EU) and achieve BAT-AEL compliance by 17 August 2021.",
      "condition_type": ["BAT_REQUIREMENT", "IMPROVEMENT"],
      "page_reference": 8
    },
    {
      "condition_id": "550e8400-e29b-41d4-a716-446655440011",
      "condition_number": "4.2.1",
      "condition_text": "The operator shall undertake a climate change risk assessment and implement appropriate adaptation measures to ensure site resilience against flood risk and extreme weather events. The assessment shall be completed by 31 December 2024.",
      "condition_type": ["CLIMATE_ADAPTATION", "IMPROVEMENT"],
      "page_reference": 12
    }
  ],
  "obligations": [
    {
      "obligation_id": "660e8400-e29b-41d4-a716-446655440010",
      "source_condition_id": "550e8400-e29b-41d4-a716-446655440010",
      "obligation_type": ["BAT_REQUIREMENT"],
      "description": "Implementation of BAT Conclusions for Large Combustion Plants",
      "action_required": "Implement Best Available Techniques per 2017/1442/EU",
      "frequency": "ONE_TIME",
      "deadline": "2021-08-17",
      "responsible_party": "OPERATOR",
      "evidence_required": true
    },
    {
      "obligation_id": "660e8400-e29b-41d4-a716-446655440011",
      "source_condition_id": "550e8400-e29b-41d4-a716-446655440011",
      "obligation_type": ["CLIMATE_ADAPTATION"],
      "description": "Climate change risk assessment and adaptation measures",
      "action_required": "Complete climate change risk assessment and implement adaptation measures",
      "frequency": "ONE_TIME",
      "deadline": "2024-12-31",
      "responsible_party": "OPERATOR",
      "evidence_required": true
    }
  ]
}
```

### Example 3: Low Confidence Extraction (Escalation Required)

**Scenario:** Poor quality scanned document with partially illegible text

**Expected Confidence Metadata:**
```json
{
  "confidence_metadata": {
    "overall_score": 0.62,
    "rationale": "Multiple deductions applied: OCR confidence 0.75 (-0.20 per EA-ENV-CONF-001), 3 conditions with uncertain classification (-0.15 per EA-ENV-CONF-004), table extraction incomplete (-0.10 per EA-ENV-CONF-004)",
    "field_scores": {
      "permit_reference": 0.90,
      "issue_date": 0.85,
      "condition_2_1_1_text": 0.60,
      "condition_2_1_2_text": 0.55,
      "table_3_1": 0.50
    },
    "low_confidence_fields": [
      "condition_2_1_1_text",
      "condition_2_1_2_text",
      "table_3_1"
    ],
    "deductions_applied": [
      {
        "rule_id": "EA-ENV-CONF-001",
        "deduction": 0.20,
        "field_affected": "*",
        "reason": "OCR confidence 0.75 on source document"
      },
      {
        "rule_id": "EA-ENV-CONF-004",
        "deduction": 0.15,
        "field_affected": "condition_type",
        "reason": "3 conditions with uncertain classification"
      },
      {
        "rule_id": "EA-ENV-CONF-004",
        "deduction": 0.10,
        "field_affected": "table_3_1",
        "reason": "Table extraction incomplete - cells illegible"
      }
    ],
    "escalation_required": true
  }
}
```

---

## System Message

```text
You are an expert Environment Agency (EA) environmental permit analyst for England. Your task is to extract regulatory obligations from EA environmental permits issued under the Environmental Permitting (England and Wales) Regulations 2016.

JURISDICTION: England only. If you detect Welsh postcodes (LL, LD, CF, SA, NP) or Scottish/NI references, STOP and flag jurisdiction mismatch.

PERMIT REFERENCE FORMAT: EPR/XX9999XX (e.g., EPR/AB1234CD)

EXTRACTION RULES:

1. DOCUMENT METADATA:
   - Extract permit_reference from header/first page
   - Extract issue_date, effective_date, expiry_date (ISO 8601 format)
   - Extract site_name, address, grid_reference (OS National Grid)
   - Extract operator_name, company_registration_number

2. CONDITION EXTRACTION:
   - Extract EVERY numbered condition (1.1.1, 2.3.4, etc.) as separate items
   - Extract EVERY sub-condition (2.3.6.1, 2.3.6.2) as SEPARATE obligations
   - Preserve verbatim condition text
   - Record page_reference for each condition

3. CONDITION TYPE CLASSIFICATION (apply ALL that match):
   - "emission limit", "ELV", "concentration", "mg/" → EMISSION_LIMIT
   - "monitor", "sample", "measure", "analyse" → MONITORING
   - "report", "submit", "provide to Agency" → REPORTING
   - "record", "log", "register", "document" → RECORD_KEEPING
   - "notify", "inform", "alert" → NOTIFICATION
   - "improvement", "upgrade", "by [date]" → IMPROVEMENT
   - "BAT", "Best Available Techniques", "BAT-AEL" → BAT_REQUIREMENT
   - "climate", "flood", "resilience", "adaptation" → CLIMATE_ADAPTATION
   - No matches → OPERATIONAL

4. TABLE EXTRACTION (CRITICAL):
   - Table S1.2: Operating techniques - each row = ONE obligation
   - Table S1.3: Improvement Programme (IC1-ICn) - each row with deadline
   - Table S3.1: Emission limits - EACH PARAMETER (NOx, SO2, CO, PM, VOC, etc.) as SEPARATE obligation
   - Table S3.2: Monitoring frequencies - each parameter/frequency row = ONE obligation
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
- DO NOT assign compliance bands (A-F) or CCS points
- DO NOT categorize breach severity (C1-C4)
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
Extract all regulatory obligations from this Environment Agency environmental permit.

Document Type: {document_type}
Regulator: Environment Agency (EA)
Page Count: {page_count}

DOCUMENT TEXT:
{document_text}

INSTRUCTIONS:
1. Extract document metadata (permit reference, dates, site details, operator)
2. Extract ALL conditions with their condition numbers and full text
3. Classify each condition type (may have multiple types)
4. For Table S3.1 (emission limits): extract EACH parameter as a SEPARATE obligation
5. For Table S3.2 (monitoring): extract EACH monitoring requirement separately
6. Derive obligations with frequencies and deadlines
7. Calculate confidence scores

Return valid JSON matching the EA-ENV-INGEST-001 v1.3 schema.
```

---

## SECTION 10: CHANGE LOG

| Version | Date | Change Description |
|---------|------|-------------------|
| v1.0 | 2025-12-01 | Initial release |
| v1.1 | 2025-12-05 | Added [EA-020] source for CLIMATE_ADAPTATION. Changed condition_type from single ENUM to ENUM[] array for multi-classification. Added "rationale" field to confidence_metadata referencing rule IDs when deductions occur. |
| v1.2 | 2025-12-05 | EC-001 fix: Added BAT_REQUIREMENT to condition_type ENUM for IED consistency. Added extraction rule EA-ENV-EXT-022. Created source [EA-021]. |
| v1.3 | 2025-12-05 | VP-006 fix: Added review_date/expiry_date coherence validation EA-ENV-VAL-023. |
| v1.3.1 | 2025-12-15 | Added System Message and User Message Template sections for LLM execution compatibility. |

---

**END OF PROMPT**

**Document Status:** FROZEN
**Prompt ID:** EA-ENV-INGEST-001
**Version:** v1.3
