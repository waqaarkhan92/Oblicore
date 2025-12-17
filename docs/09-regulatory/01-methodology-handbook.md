# EcoComply Regulatory Methodology Handbook

## Unified Compliance Engine & Document Ingestion Specification
### Version 2.0 | All UK Jurisdictions | All 4 Modules

---

## Document Control

| Attribute | Value |
|-----------|-------|
| Document ID | ECO-REG-METH-002 |
| Version | 2.0 |
| Status | Implementation Ready |
| Effective Date | 2025-12-05 |
| Supersedes | ECO-REG-METH-001 v1.0 |
| Jurisdictions | England, Wales, Scotland, Northern Ireland |
| Regulators | EA, NRW, SEPA, NIEA, 11 Water Companies |

**VALIDATION CHECKPOINT**: This document consolidates the Regulatory Methodology Handbook v1.0 with the Document Ingestion Methodology v1.0 into a single authoritative reference.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Scope & Jurisdictional Coverage](#2-scope--jurisdictional-coverage)
3. [Core Principles](#3-core-principles)
4. [Module Definitions](#4-module-definitions)
5. [The 15-Step Ingestion Process](#5-the-15-step-ingestion-process)
6. [Condition → Obligation → Evidence Model](#6-condition--obligation--evidence-model)
7. [Confidence Scoring Framework](#7-confidence-scoring-framework)
8. [Zero-Invention & Anti-Inference Safeguards](#8-zero-invention--anti-inference-safeguards)
9. [Multi-Regulator Divergence Management](#9-multi-regulator-divergence-management)
10. [Compliance Assessment Methodologies](#10-compliance-assessment-methodologies)
11. [Pack Architecture & Readiness Rules](#11-pack-architecture--readiness-rules)
12. [Commercial Safeguards](#12-commercial-safeguards)
13. [Multi-Language Field Handling (Wales)](#13-multi-language-field-handling-wales)
14. [Source Registry](#14-source-registry)
15. [Versioning Governance](#15-versioning-governance)
16. [Change Control Protocol](#16-change-control-protocol)
17. [Appendices](#appendices)

---

## 1. Executive Summary

This handbook defines the complete regulatory methodology for the EcoComply environmental compliance platform, covering:

- **Document Ingestion**: AI-powered extraction of regulatory obligations from permits and consents
- **Compliance Management**: Tracking, evidencing, and reporting on regulatory obligations
- **Pack Generation**: Creating audit-ready documentation packs for regulators, auditors, and boards

### Coverage Matrix

| Module | Document Types | Regulators/Authorities | Prompts |
|--------|----------------|------------------------|---------|
| **Module 1: Environmental Permits** | Permits, Variations, Surrenders, Enforcement | EA, NRW, SEPA, NIEA | 4 |
| **Module 2: Trade Effluent** | Consents, Agreements, Variations | 11 Water Companies | 11 |
| **Module 3: MCPD** | Registrations, Notifications, ELV Schedules | EA, NRW, SEPA, NIEA | 4 |
| **Module 4: Hazardous/Special Waste** | Consignment Notes, Registrations | EA, NRW, SEPA, NIEA | 4 |
| **Total** | | **15 Authorities** | **23** |

---

## 2. Scope & Jurisdictional Coverage

### 2.1 Full UK Coverage

| Jurisdiction | Environmental Regulator | Trade Effluent Authority | Status |
|--------------|------------------------|--------------------------|--------|
| England | Environment Agency (EA) | 9 Water Companies | ✅ FULL SUPPORT |
| Wales | Natural Resources Wales (NRW) | Dŵr Cymru Welsh Water | ✅ FULL SUPPORT |
| Scotland | SEPA | Scottish Water | ✅ FULL SUPPORT |
| Northern Ireland | NIEA | NI Water | ✅ FULL SUPPORT |

### 2.2 Document Types Covered

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

### 2.3 Prompt Inventory

| Module | Prompts | Current Versions |
|--------|---------|------------------|
| Environmental Permits | 4 | EA v1.3, NRW v1.3, SEPA v1.3, NIEA v1.3 |
| Trade Effluent | 11 | v1.3-v1.5 (per water company) |
| MCPD | 4 | EA v1.4, NRW v1.5, SEPA v1.6, NIEA v1.6 |
| Hazardous/Special Waste | 4 | v1.4 each |
| **Total** | **23** | |

---

## 3. Core Principles

### 3.1 Zero-Invention Policy

> **ZERO-INVENTION POLICY**
>
> The EcoComply system shall NEVER create, generate, assume, or infer any regulatory obligation, compliance requirement, condition, deadline, limit value, or compliance status that is not explicitly and unambiguously stated in the source document being processed.

### 3.2 Five Pillars

| Principle | Description |
|-----------|-------------|
| **Zero-Invention** | Extract only what is explicitly stated in source documents |
| **Anti-Inference** | Never derive compliance scores, bands, or unstated obligations |
| **Jurisdictional Separation** | Maintain distinct regulatory frameworks without cross-contamination |
| **Source Traceability** | Every extracted field must reference its authoritative source |
| **Confidence Transparency** | All uncertainty is quantified and escalated |

---

## 4. Module Definitions

### 4.1 Module 1: Environmental Permits

**Scope**: Permits issued under EPR 2016 (England/Wales), PPC Regulations (Scotland/NI)

| Regulator | Permit Format | Key Features |
|-----------|--------------|--------------|
| EA | EPR/XX9999XX | CCS banding, BAT requirements |
| NRW | EPR/XX9999XX | NRW banding, Welsh language support |
| SEPA | PPC/X/999999 | PPC terminology, CAS withdrawn |
| NIEA | XX/9999 | Part A(1)/A(2)/B, Irish Grid |

### 4.2 Module 2: Trade Effluent

**Scope**: Consents to discharge trade effluent to public sewers

| Water Company | Code | Jurisdiction | Charging |
|--------------|------|--------------|----------|
| Thames Water | TW | England | Mogden formula |
| Severn Trent | ST | England | Mogden formula |
| United Utilities | UU | England | Mogden formula |
| Anglian Water | AW | England | Mogden formula |
| Yorkshire Water | YW | England | Mogden formula |
| Northumbrian Water | NW | England | Mogden formula |
| Southern Water | SW | England | Mogden formula |
| South West Water | SWW | England | Mogden formula |
| Wessex Water | WX | England | Mogden formula |
| Dŵr Cymru | DC | Wales | Mogden formula, bilingual |
| Scottish Water | SCW | Scotland | Scottish scheme |

**Note**: Trade effluent is regulated by Water Companies under the Water Industry Act 1991 (England/Wales) and Sewerage (Scotland) Act 1968, NOT by environmental regulators.

### 4.3 Module 3: MCPD

**Scope**: Medium Combustion Plant Directive registrations for 1-50MW thermal input generators

| Regulator | Registration Format | Special Features |
|-----------|-------------------|------------------|
| EA | MCP/EA/[region]/[number] | Specified Generators, aggregation |
| NRW | MCP/NRW/[number] | NRW banding integration |
| SEPA | MCP/SEPA/[N/E/W]/[number] | Region codes (North/East/West) |
| NIEA | MCP/NIEA/[number] | SEM market (no triad) |

### 4.4 Module 4: Hazardous/Special Waste

**Scope**: Consignment notes and duty of care for hazardous waste movements

| Jurisdiction | Terminology | Pre-notification | Producer Registration |
|--------------|-------------|------------------|----------------------|
| England | Hazardous | Not required | >500kg/year |
| Wales | Hazardous | Not required | >500kg/year |
| Scotland | **Special** | 3 working days | Not required |
| Northern Ireland | Hazardous | 72 hours | >500kg/year |

---

## 5. The 15-Step Ingestion Process

### 5.1 Process Overview

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
│ STEP 1: INTAKE       │ Document receipt, hash, deduplication
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ STEP 2: CLASSIFY     │ Module & Regulator identification
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ STEP 3: SELECT       │ Choose appropriate ingestion prompt (1 of 23)
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ STEP 4: VALIDATE     │ Source authority verification via registry
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ STEP 5: EXTRACT      │ Metadata fields (permit ref, dates, site, operator)
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ STEP 6: EXTRACT      │ Conditions (verbatim text, tables, cross-refs)
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ STEP 7: CLASSIFY     │ Condition types using 21-value ENUM
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ STEP 8: DERIVE       │ Transform conditions into actionable obligations
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ STEP 9: IDENTIFY     │ Evidence requirements per obligation type
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ STEP 10: APPLY       │ Validation rules (format, range, completeness)
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ STEP 11: APPLY       │ Anti-inference safeguards (see Section 8)
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ STEP 12: CALCULATE   │ Confidence scores (see Section 7)
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ STEP 13: ESCALATE    │ Route low-confidence items to human review
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ STEP 14: ASSEMBLE    │ Compile output JSON with full traceability
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ STEP 15: PERSIST     │ Atomic transaction to database
└──────────────────────┘
```

### 5.2 Prompt Selection Matrix

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

## 6. Condition → Obligation → Evidence Model

### 6.1 Entity Relationship Chain

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│   DOCUMENT   │────▶│   CONDITION     │────▶│  OBLIGATION  │
│  (Permit)    │ 1:N │  (Extracted)    │ 1:N │  (Derived)   │
└──────────────┘     └─────────────────┘     └──────────────┘
                                                    │
                                                    │ 1:N
                                                    ▼
                                             ┌──────────────┐
                                             │  EVIDENCE    │
                                             │  REQUIREMENT │
                                             └──────────────┘
                                                    │
                                                    │ 1:N
                                                    ▼
                                             ┌──────────────┐
                                             │  EVIDENCE    │
                                             │  ITEM        │
                                             └──────────────┘
```

### 6.2 Condition Type ENUM (21 values)

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

### 6.3 Evidence Derivation Rules

| Obligation Type | Required Evidence Types |
|-----------------|------------------------|
| MONITORING | Monitoring data, Calibration certificates, MCERTS records |
| REPORTING | Submitted report copy, Submission receipt, Regulator acknowledgement |
| RECORD_KEEPING | Log entries, Signed records, Database exports |
| EMISSION_LIMIT | Lab analysis certificates, Continuous monitor data, MCERTS reports |
| NOTIFICATION | Notification copy, Delivery proof, Regulator response |
| IMPROVEMENT | Progress reports, Completion certificates, Photographic evidence |
| WASTE_ACCEPTANCE | Waste transfer notes, Pre-acceptance analysis, Rejection records |

### 6.4 Evidence Retention Requirements

| Evidence Type | Retention Period | Source |
|---------------|------------------|--------|
| Waste Transfer Notes | 2 years minimum | Duty of Care Regulations |
| Consignment Notes (Hazardous) | 3 years minimum | Hazardous Waste Regs 2005 |
| ELV Monitoring Results | Duration of permit + 6 years | EPR 2016 Schedule 5 |
| MCP Run Hours | 6 years | MCPD Implementation |
| Stack Test Certificates | 6 years minimum | MCPD + MCERTS |

---

## 7. Confidence Scoring Framework

### 7.1 Scoring Methodology

**Base Score**: Every extraction starts with `overall_score = 1.0`

**Score Range**: 0.0 (no confidence) to 1.0 (full confidence)

**Escalation Threshold**: `overall_score < 0.7` triggers human review

### 7.2 Deduction Matrix

| Deduction Category | Deduction | Trigger Condition |
|--------------------|-----------|-------------------|
| **Extraction Quality** | | |
| OCR Low Quality | -0.10 | OCR confidence < 0.8 on source text |
| Handwritten Text | -0.15 | Handwritten elements detected |
| Poor Image Quality | -0.20 | DPI < 150 or blur detected |
| Partial Page | -0.10 | Page truncated or incomplete |
| **Field Uncertainty** | | |
| UNKNOWN Value | -0.20 | Field set to UNKNOWN enum |
| Inferred Value | -0.15 | Value derived rather than explicit |
| Ambiguous Text | -0.10 | Multiple valid interpretations |
| Missing Mandatory | -0.25 | Required field not found |
| **Validation Issues** | | |
| Format Mismatch | -0.05 | Value doesn't match expected format |
| Range Violation | -0.10 | Value outside expected range |
| Cross-field Error | -0.15 | Related fields are inconsistent |
| Source Mismatch | -0.20 | Authority source not in registry |
| **Document Issues** | | |
| Unsigned Document | -0.15 | Official signature not detected |
| Draft Watermark | -0.30 | "DRAFT" watermark present |
| Superseded Notice | -0.40 | Document marked as superseded |
| Date Anomaly | -0.10 | Dates illogical or impossible |

### 7.3 Confidence Metadata Schema

```json
{
  "confidence_metadata": {
    "overall_score": 0.92,
    "rationale": "string|null",
    "field_scores": {
      "permit_reference": 1.0,
      "issue_date": 0.95,
      "site_address": 0.85
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

---

## 8. Zero-Invention & Anti-Inference Safeguards

### 8.1 Anti-Inference Rule Categories

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ CATEGORY 1: COMPLIANCE STATUS INFERENCE PROHIBITION                         │
├──────────────────────────────────────────────────────────────────────────────┤
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
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ CATEGORY 2: OBLIGATION DERIVATION PROHIBITION                               │
├──────────────────────────────────────────────────────────────────────────────┤
│ [ANTI-010] DO NOT create obligations not explicitly stated                  │
│ [ANTI-011] DO NOT infer deadlines from similar permits                      │
│ [ANTI-012] DO NOT assume standard conditions apply                          │
│ [ANTI-013] DO NOT extrapolate from partial condition text                   │
│ [ANTI-014] DO NOT apply cross-regime requirements                           │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ CATEGORY 3: LIMIT VALUE INFERENCE PROHIBITION                               │
├──────────────────────────────────────────────────────────────────────────────┤
│ [ANTI-020] DO NOT infer ELVs from BAT-AEL ranges                            │
│ [ANTI-021] DO NOT calculate limits from related parameters                   │
│ [ANTI-022] DO NOT assume industry-standard limits                           │
│ [ANTI-023] DO NOT convert units without explicit instruction                │
│ [ANTI-024] DO NOT interpolate between stated values                         │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ CATEGORY 4: CLASSIFICATION INFERENCE PROHIBITION                            │
├──────────────────────────────────────────────────────────────────────────────┤
│ [ANTI-030] DO NOT infer condition_type beyond keyword match                 │
│ [ANTI-031] DO NOT assume waste classification from descriptions             │
│ [ANTI-032] DO NOT derive EWC codes from waste names                         │
│ [ANTI-033] DO NOT infer HP codes from EWC codes                             │
│ [ANTI-034] DO NOT classify installations without explicit statement          │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ CATEGORY 5: CHAIN OF CUSTODY INFERENCE PROHIBITION                          │
├──────────────────────────────────────────────────────────────────────────────┤
│ [ANTI-040] DO NOT assume chain complete without all signatures              │
│ [ANTI-041] DO NOT infer carrier from vehicle registration                   │
│ [ANTI-042] DO NOT assume delivery from partial documentation                │
│ [ANTI-043] DO NOT mark consignment "delivered" without proof                │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ CATEGORY 6: CROSS-JURISDICTIONAL INFERENCE PROHIBITION                      │
├──────────────────────────────────────────────────────────────────────────────┤
│ [ANTI-050] DO NOT apply EA rules to NRW/SEPA/NIEA permits                   │
│ [ANTI-051] DO NOT assume CCS scoring applies outside England                │
│ [ANTI-052] DO NOT use WIA 1991 for Scottish Water consents                  │
│ [ANTI-053] DO NOT apply English pre-notification rules to Scotland/NI       │
│ [ANTI-054] DO NOT assume producer registration rules are universal          │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Violation Logging

All anti-inference violations are logged for audit:

```json
{
  "anti_inference_violation": {
    "violation_id": "uuid",
    "document_id": "uuid",
    "rule_id": "ANTI-032",
    "rule_description": "DO NOT derive EWC codes from waste names",
    "attempted_action": "Derive EWC code 17 05 03* from 'asbestos-containing waste'",
    "field_affected": "ewc_code",
    "action_taken": "REJECTED",
    "escalation_raised": true
  }
}
```

---

## 9. Multi-Regulator Divergence Management

### 9.1 Divergence Matrix

| Characteristic | England (EA) | Wales (NRW) | Scotland (SEPA) | N. Ireland (NIEA) |
|----------------|--------------|-------------|-----------------|-------------------|
| **Compliance Scoring** | | | | |
| Published Method | CCS | Banding | CAS→EPAS | None |
| Points System | Yes | No | Withdrawn | No |
| User-Configurable | No | Yes | Yes | Yes |
| **Permit Terminology** | | | | |
| Permit Type | EPR | EPR | PPC | PPC |
| Part A Subdivision | A, B | A, B | A, B | A(1), A(2) |
| Bilingual | No | Yes | No | No |
| **Hazardous Waste** | | | | |
| Terminology | Hazardous | Hazardous | Special | Hazardous |
| Pre-notification | No | No | 3 days | 72 hours |
| Producer Reg | >500kg | >500kg | Not req | >500kg |
| **Trade Effluent** | | | | |
| Legislation | WIA 1991 | WIA 1991 | S(S)A 1968 | WIA 1991 |
| Water Companies | 9 | 1 | 1 | 1 |
| **MCPD** | | | | |
| Reg. Format | MCP/EA/ | MCP/NRW/ | MCP/SEPA/ | MCP/NIEA/ |
| Region Codes | No | No | Yes (N/E/W) | No |

### 9.2 Cross-Jurisdiction Validation Rules

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

---

## 10. Compliance Assessment Methodologies

### 10.1 England: CCS (Compliance Classification Scheme)

**Source**: EA "Assessing and Scoring Environmental Permit Compliance"

#### Risk Category Points (Exact EA Values)

| Category | Points | EA Definition (Verbatim) |
|----------|--------|--------------------------|
| 1 | 60 | "major impact on human health, quality of life or the environment" |
| 2 | 31 | "significant impact on human health, quality of life or the environment" |
| 3 | 4 | "minor impact on human health, quality of life or the environment" |
| 4 | 0.1 | "no impact on human health, quality of life or the environment" |

#### Compliance Band Thresholds (Exact EA Values)

| Band | Points Range | EA Interpretation |
|------|--------------|-------------------|
| A | 0 | Full compliance |
| B | 0.1 – 3.9 | Acceptable compliance |
| C | 4 – 30.9 | "must improve in order to achieve permit compliance" |
| D | 31 – 59.9 | "must improve in order to achieve permit compliance" |
| E | 60 – 119.9 | "must significantly improve in order to achieve permit compliance" |
| F | ≥120 | "must significantly improve...more likely to have permit revoked" |

**IMPORTANT**: CCS scoring is performed by EA only. The system records self-assessed CCS for tracking but flags it as `SELF_ASSESSMENT`.

### 10.2 Wales: NRW Banding

**Status**: NRW uses an installation banding system, but exact thresholds are NOT publicly published.

**Implementation**: User-configurable banding with `compliance_methodology = "NRW_USER_CONFIGURED"`

### 10.3 Scotland: CAS → EPAS

**Status**: The Compliance Assessment Scheme (CAS) is WITHDRAWN. The Environmental Performance Assessment System (EPAS) is replacing it from March 2026.

**Implementation**: `compliance_methodology = "CAS_WITHDRAWN"` until EPAS methodology published.

### 10.4 Northern Ireland: No Published Methodology

**Status**: NIEA has no published compliance scoring methodology.

**Implementation**: `compliance_methodology = "NO_PUBLISHED_METHODOLOGY"`

---

## 11. Pack Architecture & Readiness Rules

### 11.1 Pack Types

| Pack Type | Code | Purpose | Primary Audience |
|-----------|------|---------|------------------|
| Regulator Pack | `REGULATOR_PACK` | EA/NRW/SEPA/NIEA inspection readiness | Environmental Regulators |
| Internal Audit Pack | `INTERNAL_AUDIT_PACK` | EMS/ISO audit evidence | Internal auditors, certifiers |
| Board Pack | `BOARD_PACK` | Multi-site risk summary | Board, Executive |
| Tender Pack | `TENDER_PACK` | External compliance assurance | Clients, procurement |

### 11.2 Readiness Rule Engine

#### Evaluation Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Pack Request   │────▶│ Get Applicable   │────▶│  Evaluate Each  │
│  (type, sites)  │     │ Rules for Type   │     │  Rule           │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                              ┌──────────────────────────────────────┐
                              │  Categorize Results:                 │
                              │  - PASS → Passed Rules               │
                              │  - FAIL + blocking → Blocking        │
                              │  - FAIL + !blocking → Warning        │
                              │  - WARNING → Warning                 │
                              │  - INFO → Passed Rules               │
                              └──────────────────────────────────────┘
                                                        │
                                                        ▼
                              ┌──────────────────────────────────────┐
                              │  canGenerate = (blockingFailures == 0)│
                              └──────────────────────────────────────┘
```

#### Implemented Rules

| Rule ID | Pack Types | Description | Blocking |
|---------|------------|-------------|----------|
| RA-001 | REGULATOR | All permit conditions assessed | Yes |
| RA-002 | REGULATOR | Monitoring returns exist | Yes |
| RA-003 | REGULATOR | WTNs cover 2-year retention | Yes |
| RA-004 | REGULATOR | CNs cover 3-year retention | Yes |
| RA-005 | REGULATOR | Management review within 12 months | No |
| RA-006 | REGULATOR, AUDIT | Climate adaptation (post-Apr 2023) | Yes |
| RA-007 | REGULATOR | Climate risk assessment (pre-2023) | Yes |
| RA-008 | REGULATOR | TCM attendance records (waste) | Yes |
| RA-009 | REGULATOR | Non-compliances have CAPA | No |
| RA-010 | REGULATOR | MCP records 6-year coverage | Yes |
| RB-001 | AUDIT | Environmental policy current | Yes |
| RB-005 | AUDIT | Management review complete | Yes |
| RB-007 | AUDIT | Emergency preparedness exists | Yes |
| RC-001 | BOARD | 90% obligations assessed | Yes |
| RC-002 | BOARD | CCS band calculated | Yes |
| RC-003 | BOARD | Cat 1-2 breaches have CAPA | Yes |
| RC-006 | BOARD | 2-year trend data | No |
| RD-001 | TENDER | Permits ACTIVE | Yes |
| RD-002 | TENDER | Band A-C preferred | No |
| RD-004 | TENDER | No active prosecutions | Yes |
| RD-005 | TENDER | No Cat 1 in current year | No |
| RD-006 | TENDER | Policy current | Yes |
| RD-008 | TENDER | Data current (30 days) | Yes |

### 11.3 Pack Sections by Type

| Section | REGULATOR | AUDIT | BOARD | TENDER |
|---------|-----------|-------|-------|--------|
| 1. Executive Summary | ✅ | ✅ | ✅ | ✅ |
| 2. Permit Register | ✅ | ✅ | ✅ | ✅ |
| 3. Compliance Status | ✅ | ✅ | ✅ (agg) | ✅ |
| 4. Evidence Index | ✅ | ✅ | ❌ | ✅ |
| 5. Monitoring Returns | ✅ | ✅ | ❌ | ✅ |
| 6. Non-Compliance Summary | ✅ | ✅ | ✅ (agg) | ❌ |
| 7. CAPA Register | ✅ | ✅ | ✅ | ✅ |
| 8. CCS Assessment | ✅ | ❌ | ✅ | ❌ |
| 9. Incident Log | ❌ | ✅ | ✅ (opt-in) | ⚠️ opt-in |

---

## 12. Commercial Safeguards

### 12.1 Safeguard 1: First-Year Adoption Mode

**PURPOSE**: New tenants cannot meet historical lookback requirements (e.g., 6 years of MCP records) on day one.

**IMPLEMENTATION**:
- `adoption_mode = 'FIRST_YEAR'` triggers relaxed lookback
- Rules check from `onboarding_date` instead of full lookback period
- Auto-expires after 12 months
- After expiry, system enforces standard lookbacks

**AFFECTED RULES**: RA-003, RA-004, RA-010, RC-006, RD-002

### 12.2 Safeguard 2: Board Pack Aggregation Default

**PURPOSE**: Board reports should show aggregate risk counts by default; granular detail requires explicit approval.

**IMPLEMENTATION**:
- Board Pack defaults to `detailLevel = 'AGGREGATED'`
- User can request `SUMMARY` or `DETAILED`
- Request requires justification
- Approval required before generation
- Audit trail retained

### 12.3 Safeguard 3: ELV Permit-Verbatim Compliance Checks

**PURPOSE**: ELV compliance must be checked against the actual permit limit, not generic MCPD default values.

**IMPLEMENTATION**:
- `elv_verbatim_text` is MANDATORY for all ELV conditions
- Database trigger blocks NULL values
- Compliance check uses permit-specific limits only
- Unit validation ensures measurement matches permit

### 12.4 Safeguard 4: Tender Pack Incident Opt-In

**PURPOSE**: Incident statistics are commercially sensitive. Tender packs exclude them by default.

**DISCLOSURE LEVELS**:

| Level | Content |
|-------|---------|
| AGGREGATE | Total incident count only |
| SEVERITY_BREAKDOWN | Counts by Category 1-4 |
| FULL | Incident details (dates, types, descriptions) |

**IMPLEMENTATION**:
- Default: `includeIncidentStatistics = false`
- Opt-in requires `approvedBy` and `justification`
- Snapshot of incident data frozen at opt-in time

---

## 13. Multi-Language Field Handling (Wales)

### 13.1 Bilingual Support Scope

Natural Resources Wales (NRW) and Dŵr Cymru Welsh Water (DC) operate bilingually. All prompts for these authorities support dual-language extraction.

### 13.2 Welsh Field Naming Convention

For every field that may contain Welsh language content, a parallel `*_welsh` field is defined:

```json
{
  "site_name": "Example Waste Treatment Facility",
  "site_name_welsh": "Cyfleuster Trin Gwastraff Enghreifftiol",

  "condition_text": "The operator shall...",
  "condition_text_welsh": "Rhaid i'r gweithredwr..."
}
```

### 13.3 Welsh Terminology Reference

| English Term | Welsh Term |
|--------------|------------|
| trade effluent | elifiant masnach |
| consent | caniatâd |
| permit | trwydded |
| operator | gweithredwr |
| discharge | gollyngiad |
| suspended solids | solidau crog |
| hazardous waste | gwastraff peryglus |
| site | safle |
| condition | amod |
| active | gweithredol |
| revoked | wedi'i ddirymu |
| expired | wedi dod i ben |

### 13.4 Welsh Date Handling

| Welsh | English | Month |
|-------|---------|-------|
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

---

## 14. Source Registry

### 14.1 Registry Summary

| Category | Source Count |
|----------|--------------|
| **By Jurisdiction** | |
| England | 41 |
| Wales | 12 |
| Scotland | 13 |
| Northern Ireland | 14 |
| **Total** | **80** |

### 14.2 Source ID Conventions

| Prefix | Authority | Examples |
|--------|-----------|----------|
| EA-XXX | Environment Agency | [EA-001], [EA-021] |
| NRW-XXX | Natural Resources Wales | [NRW-001], [NRW-020] |
| SEPA-XXX | SEPA | [SEPA-001], [SEPA-016] |
| NIEA-XXX | NIEA | [NIEA-001], [NIEA-013] |
| UK-LEG-XXX | UK Primary Legislation | [UK-LEG-001] |
| TW-XXX | Thames Water | [TW-001], [TW-002] |
| ST-XXX | Severn Trent | [ST-001] |
| SCW-XXX | Scottish Water | [SCW-001] |
| DC-XXX | Dŵr Cymru Welsh Water | [DC-001] |

### 14.3 Key Sources

#### Environmental Permits

| ID | Source Document | Jurisdiction |
|----|-----------------|--------------|
| [EA-001] | EA Environmental Permitting Guidance | England |
| [EA-004] | Compliance Classification Scheme (CCS) methodology | England |
| [NRW-001] | NRW Environmental Permitting Guidance | Wales |
| [SEPA-001] | PPC Regulations (Scotland) guidance | Scotland |
| [NIEA-001] | PPC (Industrial Emissions) Regulations (NI) guidance | Northern Ireland |

#### Hazardous Waste

| ID | Source Document | Jurisdiction |
|----|-----------------|--------------|
| [EA-HW-001] | Hazardous Waste: technical guidance WM2 | England |
| [SEPA-SW-001] | Special Waste Regulations (Scotland) | Scotland |

#### Legislation

| ID | Source Document | Type |
|----|-----------------|------|
| [UK-LEG-001] | Environmental Permitting Regulations 2016 | Primary |
| [UK-LEG-002] | Water Industry Act 1991 | Primary |
| [UK-LEG-003] | Hazardous Waste Regulations 2005 | Secondary |
| [UK-LEG-005] | MCPD Regulations 2018 | Secondary |
| [SCW-LEG-001] | Sewerage (Scotland) Act 1968 | Primary |

---

## 15. Versioning Governance

### 15.1 Version Numbering Convention

```
[PROMPT_ID] v[MAJOR].[MINOR]

Examples:
  EA-ENV-INGEST-001 v1.3
  SEPA-MCPD-INGEST-001 v1.6
```

### 15.2 Version Increment Rules

| Change Type | Version Increment | Approval Required |
|-------------|-------------------|-------------------|
| Schema field addition | +0.1 (minor) | Hostile review |
| ENUM value addition | +0.1 (minor) | Hostile review |
| Validation rule addition | +0.1 (minor) | Hostile review |
| Extraction rule modification | +0.1 (minor) | Hostile review |
| Breaking schema change | +1.0 (major) | Full review cycle |
| Prompt architecture change | +1.0 (major) | Full review cycle |
| Typographical correction | No increment | None |

### 15.3 Version Lifecycle

```
  ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌──────────┐
  │  DRAFT  │────▶│ REVIEW  │────▶│APPROVED │────▶│ FROZEN  │────▶│SUPERSEDED│
  └─────────┘     └─────────┘     └─────────┘     └─────────┘     └──────────┘
       │               │               │               │               │
       ▼               ▼               ▼               ▼               ▼
  Development     Hostile        Production      No changes       Archived
  and testing     review         deployment      permitted        reference
                  cycle          allowed                          only
```

### 15.4 Current Frozen Versions

All 23 prompts are FROZEN as of 2025-12-05. See Section 5.2 for complete version matrix.

---

## 16. Change Control Protocol

### 16.1 Trigger Events

- New regulatory guidance document published
- EPR/PPC amendments enacted
- CCS/EPAS methodology changes
- New permit condition types issued
- Water company tariff updates

### 16.2 Response Protocol

```
1. DETECT: Monitor GOV.UK RSS feeds for regulatory updates
2. ASSESS: Determine if change affects implemented model
3. CLASSIFY:
   - MINOR: Field label change → UI update only
   - MODERATE: New evidence type → Schema extension
   - MAJOR: Scoring methodology change → Full recalculation required
4. IMPLEMENT: Version-controlled migration
5. VALIDATE: User confirmation before production
6. DOCUMENT: Update this handbook with change log
```

### 16.3 Review Schedule

| Check | Frequency | Method |
|-------|-----------|--------|
| CCS Points | Annual | Compare against EA published tables |
| Retention Periods | Annual | Verify against current regulations |
| Rule Applicability | Quarterly | Review EA consultation responses |
| Climate Deadlines | Ongoing | Track EA phased implementation |
| Water Company Tariffs | Annual | April tariff updates |

---

## Appendices

### Appendix A: Complete ENUM Reference

#### A.1 plant_type ENUM (11 values)

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

#### A.2 fuel_type ENUM (12 values)

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

#### A.3 consent_status ENUM (5 values)

| Value | Description |
|-------|-------------|
| ACTIVE | Consent currently in force |
| SUSPENDED | Consent temporarily suspended |
| REVOKED | Consent permanently revoked |
| EXPIRED | Consent has passed expiry date |
| PENDING_RENEWAL | Renewal application submitted |

#### A.4 HP Codes ENUM (15 values)

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

### Appendix B: API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/regulatory/packs` | GET | List packs |
| `/api/v1/regulatory/packs` | POST | Generate pack |
| `/api/v1/regulatory/packs/evaluate-readiness` | POST | Check rules |
| `/api/v1/regulatory/ccs/assessments` | GET/POST | CCS CRUD |
| `/api/v1/regulatory/ccs/dashboard` | GET | Site CCS summary |
| `/api/v1/regulatory/elv/summary` | GET | ELV compliance summary |
| `/api/v1/regulatory/dashboard/stats` | GET | Company-wide stats |

### Appendix C: TypeScript Type Definitions

Located at: `lib/types/regulatory.ts`

Key exports:
- `PackType`, `PackStatus`, `RiskCategory`, `ComplianceBand`
- `CcsAssessment`, `CcsNonCompliance`
- `ElvCondition`, `ElvMonitoringResult`, `ElvComplianceCheckResult`
- `RegulatoryPack`, `PackConfiguration`
- `CompanyAdoptionConfig`, `RelaxedRule`
- `RuleEvaluation`, `PackGenerationRequest`, `PackGenerationResult`
- `ConditionType` (21-value enum)
- `PlantType`, `FuelType`, `ConsentStatus`

### Appendix D: Database Tables

```
INGESTION TABLES:
├── documents              [Source documents]
├── conditions             [Extracted conditions]
├── obligations            [Derived obligations]
├── evidence_requirements  [Per-obligation evidence needs]
├── evidence_items         [Uploaded evidence files]
├── confidence_metadata    [Extraction confidence]
├── escalation_queue       [Human review items]
└── anti_inference_log     [Violation audit]

COMPLIANCE TABLES:
├── ccs_risk_categories    [EA CCS points]
├── ccs_compliance_bands   [EA band thresholds]
├── ccs_assessments        [Site assessments]
├── ccs_non_compliances    [Breach records]
├── compliance_assessment_reports [CAR records]
├── regulatory_capas       [CAPA tracking]
└── regulatory_incidents   [Incident log]

PACK ENGINE TABLES:
├── regulatory_packs       [Generated packs]
├── pack_readiness_rules   [Rule definitions]
├── board_pack_detail_requests [Safeguard 2]
├── tender_pack_incident_optins [Safeguard 4]
├── elv_conditions         [Safeguard 3]
└── elv_monitoring_results [ELV data]

COMMERCIAL TABLES:
├── company_relaxed_rules  [Safeguard 1]
└── companies (adoption_mode columns)
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-02-05 | Initial implementation (EA only) |
| 2.0 | 2025-12-05 | Full UK coverage, all 4 modules, 23 prompts, consolidated with Ingestion Methodology |

---

## Validation Checkpoint

**STATUS**: Implementation Ready

This handbook documents the complete methodology implemented across all modules. Before production deployment:

User must confirm:
- [ ] Scope boundaries correct (all 4 UK jurisdictions)
- [ ] All 23 prompts reviewed
- [ ] Source registry complete (80 sources)
- [ ] Safeguard implementations acceptable
- [ ] Anti-inference rules acknowledged
- [ ] Change control protocol approved

---

*Document generated: 2025-12-05*
*Supersedes: REGULATORY_METHODOLOGY_HANDBOOK v1.0*
*Related: Methodology_Ingestion_v1.0.md, Prompt_Index_v2.0.md, Source_Registry_v2.0.md*
