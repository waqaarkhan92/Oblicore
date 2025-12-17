# NRW-ENV-INGEST-001 v1.3
## Natural Resources Wales Environmental Permit Ingestion Prompt

**Prompt ID:** NRW-ENV-INGEST-001
**Version:** 1.3
**Status:** FROZEN
**Effective Date:** 2025-12-05
**Module:** Environmental Permits
**Regulator:** Natural Resources Wales (NRW)
**Jurisdiction:** Wales

---

## SECTION 1: METADATA

```json
{
  "prompt_id": "NRW-ENV-INGEST-001",
  "version": "1.3",
  "status": "FROZEN",
  "module": "ENVIRONMENTAL_PERMITS",
  "regulator": "NRW",
  "jurisdiction": "WALES",
  "document_types": [
    "BESPOKE_PERMIT",
    "STANDARD_RULES_PERMIT",
    "PERMIT_VARIATION",
    "PERMIT_TRANSFER",
    "PERMIT_SURRENDER",
    "ENFORCEMENT_NOTICE"
  ],
  "authority_sources": [
    "[NRW-001] NRW Environmental Permitting Guidance",
    "[NRW-019] NRW Climate Adaptation Guidance",
    "[NRW-020] NRW BAT Implementation Guidance",
    "[UK-LEG-001] Environmental Permitting Regulations 2016"
  ],
  "bilingual_support": true,
  "last_updated": "2025-12-05",
  "author": "EcoComply Methodology Team"
}
```

---

## SECTION 2: SCOPE DEFINITION

### 2.1 Document Types Covered

This prompt applies to the extraction of regulatory obligations from Natural Resources Wales environmental permits issued under the Environmental Permitting (England and Wales) Regulations 2016.

**In Scope:**
- Bespoke environmental permits (Installation, Waste, Water Discharge, Groundwater)
- Standard Rules Permits
- Permit variations (full and partial)
- Permit transfers
- Permit surrenders
- Enforcement notices related to permitted activities
- Bilingual permits (English/Welsh - Cymraeg)

**Out of Scope:**
- Pre-application advice documents
- Permit application forms (input documents)
- Informal correspondence
- Draft permits not yet issued
- Permits issued by EA, SEPA, or NIEA

### 2.2 Regulatory Framework

**Primary Legislation:**
- Environmental Permitting (England and Wales) Regulations 2016 (as amended)
- Environment (Wales) Act 2016
- Well-being of Future Generations (Wales) Act 2015

**Regulatory Guidance:**
- NRW Environmental Permitting Guidance
- Sector-specific guidance notes
- BAT Reference Documents (BREFs)
- BAT Conclusions

### 2.3 Compliance Scoring Context

Natural Resources Wales uses a banding system aligned with but distinct from EA's CCS:
- Compliance bands are applied but thresholds are NOT published
- Band assignment is performed by NRW only

**IMPORTANT:** This prompt does NOT assign compliance bands. Banding thresholds are user-configurable as they are not publicly published. See Anti-Inference Rules.

### 2.4 Bilingual Requirements

NRW operates bilingually under the Welsh Language (Wales) Measure 2011. Permits may be issued in:
- English only
- Welsh only (Cymraeg yn unig)
- Bilingual (English and Welsh)

All Welsh language content must be extracted to parallel `*_welsh` fields.

---

## SECTION 3: OUTPUT SCHEMA (JSON)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "NRW Environmental Permit Extraction Output",
  "type": "object",
  "required": ["document_metadata", "conditions", "confidence_metadata"],
  "properties": {
    "schema_version": {
      "type": "string",
      "const": "2.0"
    },
    "prompt_id": {
      "type": "string",
      "const": "NRW-ENV-INGEST-001"
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
          "description": "NRW permit reference number"
        },
        "permit_reference_source": {
          "type": "string"
        },
        "document_type": {
          "type": "string",
          "enum": ["BESPOKE_PERMIT", "STANDARD_RULES_PERMIT", "PERMIT_VARIATION", "PERMIT_TRANSFER", "PERMIT_SURRENDER", "ENFORCEMENT_NOTICE"]
        },
        "permit_type": {
          "type": "string",
          "enum": ["INSTALLATION", "WASTE", "WATER_DISCHARGE", "GROUNDWATER", "MINING_WASTE", "RADIOACTIVE_SUBSTANCES"]
        },
        "document_language": {
          "type": "string",
          "enum": ["ENGLISH", "WELSH", "BILINGUAL"],
          "description": "Primary language(s) of the document"
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
            "site_name_welsh": {
              "type": ["string", "null"],
              "description": "Welsh language site name if present"
            },
            "site_address": {
              "type": "object",
              "properties": {
                "address_line_1": { "type": "string" },
                "address_line_1_welsh": { "type": ["string", "null"] },
                "address_line_2": { "type": ["string", "null"] },
                "address_line_2_welsh": { "type": ["string", "null"] },
                "town": { "type": "string" },
                "town_welsh": { "type": ["string", "null"] },
                "county": { "type": ["string", "null"] },
                "county_welsh": { "type": ["string", "null"] },
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
            },
            "local_authority_welsh": {
              "type": ["string", "null"]
            },
            "nrw_area": {
              "type": ["string", "null"],
              "description": "NRW administrative area"
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
            "operator_name_welsh": {
              "type": ["string", "null"]
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
            },
            "trading_name_welsh": {
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
            "type": "string"
          },
          "condition_text": {
            "type": "string"
          },
          "condition_text_welsh": {
            "type": ["string", "null"],
            "description": "Welsh language version of condition text"
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
            "items": {
              "type": "object"
            }
          },
          "cross_references": {
            "type": "array",
            "items": { "type": "string" }
          },
          "emission_points": {
            "type": "array",
            "items": { "type": "string" }
          },
          "limits": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "parameter": { "type": "string" },
                "parameter_welsh": { "type": ["string", "null"] },
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
          "description_welsh": { "type": ["string", "null"] },
          "action_required": { "type": "string" },
          "action_required_welsh": { "type": ["string", "null"] },
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
        "obligations_derived": { "type": "integer" },
        "welsh_content_extracted": { "type": "boolean" }
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
- Text must be legible in both English and Welsh
- All pages must be present and in order
- Document must be complete (no missing sections)

### 4.2 Expected Document Structure

NRW Environmental Permits typically follow this structure:

1. **Cover Page**: Permit reference, operator name, site name (bilingual if applicable)
2. **Introductory Note**: Explains permit structure
3. **Part A - Permit / Rhan A - Trwydded**: Main conditions
4. **Part B - Site Plan(s) / Rhan B - Cynllun(iau) Safle**: Location and boundary plans
5. **Schedule 1 - Operations / Atodlen 1 - Gweithrediadau**: Permitted activities
6. **Schedule 2 - Waste Types / Atodlen 2 - Mathau o Wastraff**: Accepted waste codes
7. **Schedule 3 - Emissions / Atodlen 3 - Allyriadau**: Emission limits
8. **Schedule 4 - Reporting / Atodlen 4 - Adrodd**: Reporting requirements
9. **Schedule 5 - Notifications / Atodlen 5 - Hysbysiadau**: Notification requirements
10. **Schedule 6 - Interpretation / Atodlen 6 - Dehongliad**: Definitions

### 4.3 Pre-Processing Requirements

Before extraction:
1. Verify document is an official NRW permit (letterhead, reference format)
2. Confirm document is not marked "DRAFT" / "DRAFFT"
3. Check document is not superseded by a later version
4. Validate permit reference format: EPR/XX9999XX
5. Detect document language (English, Welsh, or Bilingual)

---

## SECTION 5: EXTRACTION RULES

### 5.1 Document Metadata Extraction

**[NRW-ENV-EXT-001]** Permit Reference Extraction
```
LOCATE permit reference in document header or first page
VALIDATE format: EPR/[A-Z]{2}[0-9]{4}[A-Z]{2}(/[A-Z][0-9]{3})?
IF format invalid: FLAG for review, do not reject
RECORD page_reference and source location
```

**[NRW-ENV-EXT-002]** Issue Date Extraction
```
SEARCH for "Date of issue" / "Dyddiad cyhoeddi", "Issued on" / "Cyhoeddwyd ar"
EXTRACT date value
CONVERT to ISO 8601 format (YYYY-MM-DD)
HANDLE Welsh date formats (see Welsh Date Handling)
IF ambiguous date format: FLAG for review
RECORD source location
```

**[NRW-ENV-EXT-003]** Effective Date Extraction
```
SEARCH for "Effective from" / "Yn weithredol o", "Takes effect" / "Yn dod i rym"
IF not found: DEFAULT to issue_date
CONVERT to ISO 8601 format
```

**[NRW-ENV-EXT-004]** Document Language Detection
```
ANALYSE document content:
  IF contains only English text: SET document_language = "ENGLISH"
  IF contains only Welsh text: SET document_language = "WELSH"
  IF contains both English and Welsh: SET document_language = "BILINGUAL"

DETECT language markers:
  "Permit" vs "Trwydded"
  "Operator" vs "Gweithredwr"
  "Condition" vs "Amod"
```

**[NRW-ENV-EXT-005]** Site Details Extraction
```
LOCATE site information section
EXTRACT site_name verbatim
IF bilingual: EXTRACT site_name_welsh
EXTRACT full address components
IF bilingual: EXTRACT Welsh address variants
EXTRACT grid reference (OS National Grid format)
VALIDATE postcode format for Wales
IF postcode NOT Welsh prefix: FLAG jurisdiction mismatch
```

**[NRW-ENV-EXT-006]** Operator Details Extraction
```
LOCATE operator/permit holder section
EXTRACT operator_name verbatim
IF bilingual: EXTRACT operator_name_welsh
EXTRACT company_registration_number if present
VALIDATE company number format
```

### 5.2 Welsh Date Handling

**[NRW-ENV-EXT-DATE]** Welsh Date Extraction
```
Welsh month mapping:
  Ionawr = January (01)
  Chwefror = February (02)
  Mawrth = March (03)
  Ebrill = April (04)
  Mai = May (05)
  Mehefin = June (06)
  Gorffennaf = July (07)
  Awst = August (08)
  Medi = September (09)
  Hydref = October (10)
  Tachwedd = November (11)
  Rhagfyr = December (12)

IF date contains Welsh month name:
  TRANSLATE to ISO 8601 format
  RECORD original_date_text for reference

Example:
  "15 Mehefin 2024" → "2024-06-15"
  original_date_text = "15 Mehefin 2024"
```

### 5.3 Condition Extraction

**[NRW-ENV-EXT-007]** Condition Identification
```
FOR EACH numbered paragraph in permit:
  IF paragraph contains regulatory requirement language:
    English: "shall", "must", "will"
    Welsh: "rhaid", "bydd", "dylai"
    CREATE condition record
    PRESERVE original condition numbering
    EXTRACT full condition text verbatim
    IF bilingual: EXTRACT condition_text_welsh
    RECORD page reference
```

**[NRW-ENV-EXT-008]** Condition Type Classification
```
APPLY keyword matching to condition_text (English and Welsh):

English keywords:
  "emission limit" → EMISSION_LIMIT
  "monitor" → MONITORING
  "report" → REPORTING
  "BAT" → BAT_REQUIREMENT
  "climate" → CLIMATE_ADAPTATION

Welsh keywords:
  "terfyn allyriad" → EMISSION_LIMIT
  "monitro" → MONITORING
  "adrodd" → REPORTING
  "technegau gorau sydd ar gael" → BAT_REQUIREMENT
  "hinsawdd" → CLIMATE_ADAPTATION

IF no matches: SET condition_type = ["OPERATIONAL"]
```

### 5.4 BAT Requirement Extraction

**[NRW-ENV-EXT-022]** BAT_REQUIREMENT extraction
```
IF condition text references "Best Available Techniques", "BAT", "BAT conclusions", "BAT-AEL", "BREF", or Welsh equivalents ("Technegau Gorau Sydd ar Gael"):
  INCLUDE "BAT_REQUIREMENT" in condition_type array
Source: [NRW-020] NRW BAT Implementation Guidance
```

---

## SECTION 6: VALIDATION RULES

### 6.1 Format Validation

**[NRW-ENV-VAL-001]** Permit Reference Format
```
permit_reference MUST match pattern: ^EPR/[A-Z]{2}[0-9]{4}[A-Z]{2}(/[A-Z][0-9]{3})?$
IF invalid: REJECT with error "Invalid NRW permit reference format"
```

**[NRW-ENV-VAL-002]** Date Format Validation
```
ALL date fields MUST be valid ISO 8601 dates
Welsh dates must be correctly translated
IF invalid: FLAG field, attempt correction, deduct confidence
```

**[NRW-ENV-VAL-003]** Postcode Validation
```
postcode SHOULD start with Welsh prefixes: LL, LD, CF, SA, NP, SY1-SY11
IF English postcode: FLAG "English postcode detected - verify jurisdiction or use EA-ENV-INGEST-001"
```

**[NRW-ENV-VAL-004]** Grid Reference Validation
```
grid_reference MUST be valid OS National Grid format
grid_reference SHOULD be in Wales
```

### 6.2 Bilingual Validation

**[NRW-ENV-VAL-WELSH-001]** Welsh Field Completeness
```
IF document_language = "BILINGUAL":
  FOR EACH field with Welsh equivalent detected:
    *_welsh field SHOULD be populated
    IF *_welsh field is null AND Welsh content exists:
      FLAG: "Welsh content detected but not extracted"
```

**[NRW-ENV-VAL-WELSH-002]** Welsh Terminology Validation
```
Validate correct Welsh terminology:
  "trade effluent" = "elifiant masnach" (NOT "masnach elifiant")
  "permit" = "trwydded"
  "condition" = "amod"
IF incorrect: FLAG for review
```

### 6.3 Cross-Field Validation

**[NRW-ENV-VAL-023]** Review/Expiry Date Coherence
```
IF review_date is not null AND expiry_date is not null:
  review_date MUST be before expiry_date
  IF review_date >= expiry_date:
    FLAG: "Review date must precede expiry date"
```

---

## SECTION 7: ANTI-INFERENCE RULES

### 7.1 Compliance Status Prohibition

**[NRW-ENV-ANTI-001]** Compliance Band Prohibition
```
DO NOT assign compliance bands
DO NOT calculate compliance scores
Compliance banding thresholds are NOT published by NRW
Mark any compliance status as "USER_CONFIGURED"
```

**[NRW-ENV-ANTI-002]** No EA Rules Application
```
DO NOT apply EA CCS scoring to NRW permits
DO NOT assume EA guidance applies to Wales
Maintain strict jurisdictional separation
```

### 7.2 Obligation Derivation Prohibition

**[NRW-ENV-ANTI-003]** No Implied Obligations
```
DO NOT create obligations not explicitly stated
DO NOT infer from English version if only Welsh present
Extract from explicit text only
```

### 7.3 Cross-Jurisdictional Prohibition

**[NRW-ENV-ANTI-004]** No Cross-Jurisdiction Application
```
DO NOT apply EA, SEPA, or NIEA rules to NRW permits
DO NOT assume English regulatory guidance applies to Wales
Welsh-specific legislation takes precedence
```

---

## SECTION 8: CONFIDENCE SCORING

### 8.1 Base Score

All extractions start with `overall_score = 1.0`

### 8.2 Deduction Rules

**[NRW-ENV-CONF-001]** OCR Quality Deduction
```
IF document processed via OCR:
  IF OCR confidence < 0.95: DEDUCT 0.05
  IF OCR confidence < 0.90: DEDUCT 0.10
  IF OCR confidence < 0.80: DEDUCT 0.20
```

**[NRW-ENV-CONF-002]** Welsh Extraction Deduction
```
IF document_language = "BILINGUAL":
  IF Welsh fields incomplete: DEDUCT 0.05
  IF Welsh date translation uncertain: DEDUCT 0.05
```

**[NRW-ENV-CONF-003]** Language Mismatch Deduction
```
IF document_language = "WELSH" AND English extraction attempted:
  DEDUCT 0.15
  FLAG for Welsh-language review
```

### 8.3 Escalation Triggers

```
SET escalation_required = true IF:
  - overall_score < 0.70
  - Document is Welsh-only and Welsh extraction incomplete
  - Jurisdiction mismatch detected
  - More than 5 validation flags raised
```

---

## SECTION 9: WORKED EXAMPLES

### Example 1: Bilingual Permit

**Input Document Excerpt:**
```
ENVIRONMENTAL PERMIT / TRWYDDED AMGYLCHEDDOL
Natural Resources Wales / Cyfoeth Naturiol Cymru

Permit Number / Rhif Trwydded: EPR/WP3456AB
Date of Issue / Dyddiad Cyhoeddi: 15 Mehefin 2024
Effective Date / Dyddiad Gweithredol: 1 Gorffennaf 2024

Operator / Gweithredwr: Welsh Manufacturing Cyf
Site / Safle: Ffatri Gweithgynhyrchu Cymru
Address / Cyfeiriad: Stad Ddiwydiannol, Caerdydd, CF10 1AB
Grid Reference / Cyfeirnod Grid: ST123456

CONDITION 2.1 / AMOD 2.1
The operator shall monitor emissions from stack A1. /
Rhaid i'r gweithredwr fonitro allyriadau o simnai A1.
```

**Expected Output:**
```json
{
  "schema_version": "2.0",
  "prompt_id": "NRW-ENV-INGEST-001",
  "prompt_version": "v1.3",
  "document_metadata": {
    "permit_reference": "EPR/WP3456AB",
    "document_type": "BESPOKE_PERMIT",
    "document_language": "BILINGUAL",
    "issue_date": "2024-06-15",
    "issue_date_source": "Page 1, '15 Mehefin 2024'",
    "effective_date": "2024-07-01",
    "site_details": {
      "site_name": "Welsh Manufacturing Factory",
      "site_name_welsh": "Ffatri Gweithgynhyrchu Cymru",
      "site_address": {
        "address_line_1": "Industrial Estate",
        "address_line_1_welsh": "Stad Ddiwydiannol",
        "town": "Cardiff",
        "town_welsh": "Caerdydd",
        "postcode": "CF10 1AB"
      },
      "grid_reference": "ST123456"
    },
    "operator_details": {
      "operator_name": "Welsh Manufacturing Ltd",
      "operator_name_welsh": "Welsh Manufacturing Cyf"
    }
  },
  "conditions": [
    {
      "condition_id": "550e8400-e29b-41d4-a716-446655440001",
      "condition_number": "2.1",
      "condition_text": "The operator shall monitor emissions from stack A1.",
      "condition_text_welsh": "Rhaid i'r gweithredwr fonitro allyriadau o simnai A1.",
      "condition_type": ["MONITORING"],
      "page_reference": 5,
      "emission_points": ["A1"]
    }
  ],
  "confidence_metadata": {
    "overall_score": 0.98,
    "rationale": null,
    "escalation_required": false
  },
  "processing_metadata": {
    "welsh_content_extracted": true
  }
}
```

### Example 2: Welsh-Only Document

**Input Document Excerpt:**
```
TRWYDDED AMGYLCHEDDOL
Cyfoeth Naturiol Cymru

Rhif Trwydded: EPR/WP7890CD
Dyddiad Cyhoeddi: 20 Tachwedd 2024

AMOD 3.1
Rhaid i'r gweithredwr gadw cofnodion o'r holl wastraff a dderbynnir.
```

**Expected Output:**
```json
{
  "document_metadata": {
    "permit_reference": "EPR/WP7890CD",
    "document_language": "WELSH",
    "issue_date": "2024-11-20"
  },
  "conditions": [
    {
      "condition_number": "3.1",
      "condition_text": null,
      "condition_text_welsh": "Rhaid i'r gweithredwr gadw cofnodion o'r holl wastraff a dderbynnir.",
      "condition_type": ["RECORD_KEEPING"]
    }
  ]
}
```

### Example 3: BAT and Climate Adaptation

**Expected Output (conditions):**
```json
{
  "conditions": [
    {
      "condition_number": "4.1",
      "condition_text": "The operator shall implement Best Available Techniques as specified in the relevant BAT Conclusions.",
      "condition_text_welsh": "Rhaid i'r gweithredwr weithredu Technegau Gorau Sydd ar Gael fel y'u nodir yn y Casgliadau BAT perthnasol.",
      "condition_type": ["BAT_REQUIREMENT"]
    },
    {
      "condition_number": "5.1",
      "condition_text": "The operator shall assess climate change risks and implement adaptation measures.",
      "condition_text_welsh": "Rhaid i'r gweithredwr asesu risgiau newid hinsawdd a gweithredu mesurau addasu.",
      "condition_type": ["CLIMATE_ADAPTATION"]
    }
  ]
}
```

---

## System Message

```text
You are an expert Natural Resources Wales (NRW) environmental permit analyst for Wales. Your task is to extract regulatory obligations from NRW environmental permits issued under the Environmental Permitting (England and Wales) Regulations 2016.

JURISDICTION: Wales only. If you detect English-only postcodes (not starting with LL, LD, CF, SA, NP, SY1-SY11, HR, CH5-CH8) or Scottish/NI references, STOP and flag jurisdiction mismatch.

PERMIT REFERENCE FORMAT: EPR/XX9999XX or NRW-specific format

BILINGUAL SUPPORT: NRW operates bilingually. Extract Welsh language content to parallel *_welsh fields where present.

EXTRACTION RULES:

1. DOCUMENT METADATA:
   - Extract permit_reference from header/first page
   - Extract issue_date, effective_date, expiry_date (ISO 8601 format)
   - Extract site_name, address, grid_reference (OS National Grid)
   - Extract operator_name, company_registration_number
   - For bilingual permits: extract site_name_welsh, operator_name_welsh

2. CONDITION EXTRACTION:
   - Extract EVERY numbered condition (1.1.1, 2.3.4, etc.) as separate items
   - Extract EVERY sub-condition (2.3.6.1, 2.3.6.2) as SEPARATE obligations
   - Preserve verbatim condition text (in original language)
   - Record page_reference for each condition
   - For Welsh text: extract to condition_text_welsh field

3. CONDITION TYPE CLASSIFICATION (apply ALL that match):
   - "emission limit", "ELV", "concentration", "mg/", "terfyn allyriadau" → EMISSION_LIMIT
   - "monitor", "sample", "measure", "analyse", "monitro", "samplu" → MONITORING
   - "report", "submit", "provide to NRW", "adrodd", "cyflwyno" → REPORTING
   - "record", "log", "register", "document", "cofnod" → RECORD_KEEPING
   - "notify", "inform", "alert", "hysbysu" → NOTIFICATION
   - "improvement", "upgrade", "by [date]", "gwelliant" → IMPROVEMENT
   - "BAT", "Best Available Techniques", "BAT-AEL" → BAT_REQUIREMENT
   - "climate", "flood", "resilience", "adaptation", "hinsawdd", "llifogydd" → CLIMATE_ADAPTATION
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
   - "continuously"/"yn barhaus" → CONTINUOUS
   - "hourly/daily/weekly/monthly/quarterly" → corresponding value
   - "every six months"/"bob chwe mis" → SEMI_ANNUAL
   - "annually"/"yn flynyddol" → ANNUAL
   - "within X days of" → ON_EVENT

ANTI-INFERENCE RULES (CRITICAL - DO NOT VIOLATE):
- DO NOT assign compliance bands - NRW thresholds are not published
- DO NOT create obligations not explicitly stated
- DO NOT infer deadlines from similar permits
- DO NOT infer emission limits from BAT-AEL ranges
- DO NOT convert units - extract as stated
- DO NOT translate Welsh to English or vice versa - extract both where present
- Extract ONLY what is explicitly in the document

CONFIDENCE SCORING:
- Start at 1.0, deduct for: OCR issues, ambiguous text, missing fields, format corrections
- Set escalation_required=true if overall_score < 0.70 or any field_score < 0.50

OUTPUT: Return valid JSON matching the schema in SECTION 3.
```

---

## User Message Template

```text
Extract all regulatory obligations from this Natural Resources Wales environmental permit.

Document Type: {document_type}
Regulator: Natural Resources Wales (NRW)
Page Count: {page_count}

DOCUMENT TEXT:
{document_text}

INSTRUCTIONS:
1. Extract document metadata (permit reference, dates, site details, operator)
2. For bilingual content, extract Welsh text to *_welsh fields
3. Extract ALL conditions with their condition numbers and full text
4. Classify each condition type (may have multiple types)
5. For Table S3.1 (emission limits): extract EACH parameter as a SEPARATE obligation
6. For Table S3.2 (monitoring): extract EACH monitoring requirement separately
7. Derive obligations with frequencies and deadlines
8. Calculate confidence scores

Return valid JSON matching the NRW-ENV-INGEST-001 v1.3 schema.
```

---

## SECTION 10: CHANGE LOG

| Version | Date | Change Description |
|---------|------|-------------------|
| v1.0 | 2025-12-01 | Initial release with bilingual support |
| v1.1 | 2025-12-05 | EC-001 fix: Added BAT_REQUIREMENT to condition_type ENUM for IED consistency. Added extraction rule NRW-ENV-EXT-022. Created source [NRW-020]. Includes Welsh terminology. |
| v1.2 | 2025-12-05 | VP-006 fix: Added review_date/expiry_date coherence validation. |
| v1.3 | 2025-12-05 | AC-006 fix: Created [NRW-019] source for climate adaptation guidance. |
| v1.3.1 | 2025-12-15 | Added System Message and User Message Template sections for LLM execution compatibility. |

---

**END OF PROMPT**

**Document Status:** FROZEN
**Prompt ID:** NRW-ENV-INGEST-001
**Version:** v1.3
