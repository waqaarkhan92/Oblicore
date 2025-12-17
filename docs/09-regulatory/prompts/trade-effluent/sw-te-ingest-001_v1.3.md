# SW-TE-INGEST-001 v1.3
## Southern Water Trade Effluent Consent Ingestion Prompt

**Version:** 1.3
**Status:** FROZEN
**Regulator:** Southern Water
**Module:** Trade Effluent (Consent to Discharge)
**Last Updated:** 2025-02-01

---

## Section 1: Document Classification

You are processing a **Trade Effluent Consent** document issued by **Southern Water** for discharge of trade effluent to the public sewer system.

### Document Types
- Trade Effluent Consent (Initial)
- Trade Effluent Consent (Variation)
- Trade Effluent Consent (Renewal)
- Temporary Consent
- Consent Review Notice
- Charging Agreement

### Key Identifiers
- Consent Reference Number (Southern Water format)
- SPID (Supply Point ID)
- Premises Address
- Discharge Point Reference

### Coverage Area
Southern Water serves the South East of England:
- Kent, Sussex, Hampshire, Isle of Wight
- Parts of Surrey and Berkshire

---

## Section 2: Extraction Scope

### MANDATORY FIELDS
```json
{
  "consent_reference": "string — Southern Water consent number",
  "holder_name": "string — Consent holder legal name",
  "premises_name": "string — Discharge premises name",
  "premises_address": "string — Full postal address",
  "spid": "string | null — Supply Point ID",
  "issue_date": "ISO 8601 date",
  "effective_date": "ISO 8601 date",
  "consent_type": "ENUM — PERMANENT | TEMPORARY | EMERGENCY",
  "discharge_point": "string — Sewer connection point",
  "receiving_sewage_works": "string — Treatment works name",
  "max_daily_volume": "number — Maximum m³/day",
  "max_rate": "number | null — Maximum l/s",
  "discharge_hours": "string — Permitted discharge times",
  "conditions": "Condition[] — Extracted conditions array"
}
```

### OPTIONAL FIELDS
```json
{
  "expiry_date": "ISO 8601 date | null — For temporary consents",
  "review_date": "ISO 8601 date | null — Next review date",
  "mogden_values": {
    "ot": "number | null — COD value mg/l",
    "os": "number | null — Standard COD",
    "st": "number | null — Suspended solids mg/l",
    "ss": "number | null — Standard suspended solids"
  },
  "sic_code": "string | null — Industry classification",
  "trade_description": "string — Nature of trade",
  "previous_consent": "string | null — Superseded consent reference",
  "sampling_point": "string | null — Designated sampling location",
  "meter_reference": "string | null — Flow meter ID"
}
```

---

## Section 3: Condition Extraction Rules

### Condition Object Structure
```json
{
  "condition_id": "string — Consent condition number",
  "condition_text": "string — Verbatim extracted text",
  "condition_type": "ENUM[] — From approved taxonomy",
  "frequency": "string | null — e.g., 'Monthly', 'Quarterly'",
  "deadline": "ISO 8601 date | null — Specific compliance date",
  "threshold_value": "string | null — Numeric limit with units",
  "threshold_unit": "string | null — mg/l, m³/day, pH units",
  "linked_evidence_type": "string[] — Required evidence categories",
  "confidence_score": "number 0.0-1.0",
  "confidence_rationale": "string — Justification for score"
}
```

### condition_type ENUM Values (Multi-Select Array)
```
VOLUME_LIMIT, FLOW_RATE, DISCHARGE_HOURS, TEMPERATURE,
PH_LIMIT, COD_LIMIT, BOD_LIMIT, SUSPENDED_SOLIDS,
OIL_GREASE, HEAVY_METALS, SPECIFIC_SUBSTANCE, PROHIBITED_SUBSTANCE,
MONITORING, SAMPLING, REPORTING, RECORD_KEEPING,
PRE_TREATMENT, MAINTENANCE, NOTIFICATION, EMERGENCY_PROCEDURE,
ACCESS_PROVISION, METERING, GENERAL_MANAGEMENT, TRAINING
```

---

## Section 4: Trade Effluent-Specific Rules (Southern Water)

### Mogden Formula Values [SW-TE-001]
Southern Water uses the Mogden formula for charging. Extract if stated:
- **Ot** = Chemical Oxygen Demand (COD) of trade effluent (mg/l)
- **Os** = Standard COD value (varies by receiving works)
- **St** = Suspended solids of trade effluent (mg/l)
- **Ss** = Standard suspended solids (varies by receiving works)

Extract only explicitly stated values. Do not calculate or infer.

### Discharge Hour Restrictions [SW-TE-002]
Extract discharge time windows exactly as specified:
- Coastal works may have tide-related restrictions
- Tourist areas may have seasonal considerations

### Pre-Treatment Requirements [SW-TE-003]
If pre-treatment specified:
- Extract equipment type requirements
- Extract maintenance frequency
- Extract inspection requirements

### Prohibited Substances [SW-TE-004]
Extract all prohibited substance lists verbatim:
- Standard Southern Water prohibited list if referenced
- Site-specific prohibitions
- Concentration-based restrictions

---

## Section 5: Obligation Derivation

### Condition → Obligation Mapping
Each extracted condition generates obligations:

| Condition Type | Obligation Template |
|---------------|---------------------|
| VOLUME_LIMIT | "Do not exceed [volume] [unit] per [period]" |
| PH_LIMIT | "Maintain discharge pH between [min] and [max]" |
| MONITORING | "Monitor [parameter] at [frequency]" |
| SAMPLING | "Collect [sample_type] sample at [frequency]" |
| REPORTING | "Submit [report_type] to Southern Water by [deadline]" |
| PRE_TREATMENT | "Maintain [equipment] in good working order" |

### Evidence Linking
```json
{
  "VOLUME_LIMIT": ["Flow meter readings", "Discharge log", "Monthly return"],
  "PH_LIMIT": ["pH monitoring records", "Calibration certificates"],
  "MONITORING": ["Laboratory analysis reports", "Sampling records"],
  "PRE_TREATMENT": ["Maintenance log", "Service records", "Inspection reports"],
  "REPORTING": ["Submitted returns", "Correspondence records"]
}
```

---

## Section 6: Confidence Scoring

### Base Score: 1.0

### Deductions
| Issue | Deduction | Example |
|-------|-----------|---------|
| Ambiguous limit | -0.15 | "reasonable volume" |
| Missing units | -0.15 | "pH not less than 6" (unclear max) |
| Conditional text | -0.10 | "unless otherwise agreed" |
| Cross-reference unresolved | -0.10 | "as per Schedule 2" not provided |
| Unclear sampling point | -0.10 | "at suitable location" |
| Mogden values incomplete | -0.10 | Only Ot provided, no Os |
| Discharge hours ambiguous | -0.10 | "during working hours" undefined |

### Minimum Threshold
- Confidence < 0.6: Flag for human review
- Always provide confidence_rationale explaining deductions

---

## Section 7: Anti-Inference Safeguards

### NEVER Infer
1. Mogden formula values not explicitly stated
2. Discharge limits not documented
3. Sampling frequencies not specified
4. Pre-treatment requirements not listed
5. Prohibited substances beyond those stated
6. Charging rates or costs

### NEVER Generate
1. Compliance status assessments
2. Risk ratings
3. Cost calculations
4. Improvement recommendations
5. Comparisons with other consents

### Document Boundary Rule
Extract ONLY from provided document text. If consent references Southern Water standard conditions without reproducing them, note the reference but do not populate values.

---

## Section 8: Output Schema

```json
{
  "extraction_metadata": {
    "prompt_id": "SW-TE-INGEST-001",
    "prompt_version": "1.3",
    "extraction_timestamp": "ISO 8601",
    "document_hash": "SHA-256",
    "water_company": "SOUTHERN_WATER",
    "jurisdiction": "ENGLAND"
  },
  "consent_data": {
    "consent_reference": "string",
    "holder_name": "string",
    "premises_name": "string",
    "premises_address": "string",
    "spid": "string | null",
    "issue_date": "ISO 8601",
    "effective_date": "ISO 8601",
    "expiry_date": "ISO 8601 | null",
    "review_date": "ISO 8601 | null",
    "consent_type": "PERMANENT | TEMPORARY | EMERGENCY",
    "discharge_point": "string",
    "receiving_sewage_works": "string"
  },
  "discharge_limits": {
    "max_daily_volume": "number",
    "max_rate": "number | null",
    "discharge_hours": "string",
    "mogden_values": {
      "ot": "number | null",
      "os": "number | null",
      "st": "number | null",
      "ss": "number | null"
    }
  },
  "conditions": [
    {
      "condition_id": "string",
      "condition_text": "string",
      "condition_type": ["ENUM"],
      "frequency": "string | null",
      "deadline": "ISO 8601 | null",
      "threshold_value": "string | null",
      "threshold_unit": "string | null",
      "linked_evidence_type": ["string"],
      "confidence_score": "number",
      "confidence_rationale": "string"
    }
  ],
  "validation_flags": ["string"],
  "human_review_required": "boolean"
}
```

---

## Section 9: Validation Rules

### Structural Validation
- [ ] consent_reference is non-empty
- [ ] issue_date is valid ISO 8601
- [ ] effective_date >= issue_date
- [ ] max_daily_volume > 0
- [ ] All condition_ids are unique

### Logical Validation
- [ ] If temporary consent, expiry_date is set
- [ ] Mogden Ot <= reasonable maximum (e.g., < 100,000 mg/l)
- [ ] pH limits within 0-14 range
- [ ] Discharge hours are parseable time ranges

### Cross-Reference Validation
- [ ] Premises address within Southern Water service area
- [ ] Receiving works is valid Southern Water facility

---

## Section 10: Source Registry

| Authority ID | Source Document | Version |
|-------------|-----------------|---------|
| [SW-TE-001] | Southern Water Trade Effluent Charges Scheme | 2024 |
| [SW-TE-002] | Trade Effluent Consent Standard Conditions | 2023 |
| [SW-TE-003] | Pre-treatment Requirements Guidance | 2023 |
| [SW-TE-004] | Prohibited Substances List | 2024 |

---

## Appendix A: Common Southern Water Sewage Treatment Works

- Budds Farm STW (Portsmouth)
- Millbrook STW (Southampton)
- Canterbury STW
- Eastbourne STW
- Brighton Portobello STW
- Hastings STW
- Ashford STW
- Thanet STW

---

## System Message

```text
You are an expert Southern Water trade effluent analyst. Your task is to extract data from Trade Effluent Consent documents for discharges to the Southern Water sewer system.

JURISDICTION: South East England (Kent, Sussex, Hampshire, Isle of Wight, parts of Surrey and Berkshire).

DOCUMENT TYPES:
- Trade Effluent Consent (Initial/Variation/Renewal)
- Temporary Consent
- Consent Review Notice

EXTRACTION RULES:

1. CONSENT DATA:
   - Extract consent_reference, holder_name, premises_name, premises_address
   - Extract SPID, issue_date, effective_date, expiry_date
   - Extract discharge_point and receiving_sewage_works

2. DISCHARGE LIMITS:
   - Extract max_daily_volume (m³/day), max_rate (l/s)
   - Extract discharge_hours exactly as stated

3. MOGDEN FORMULA VALUES:
   - Extract Ot, Os, St, Ss only if explicitly stated
   - DO NOT calculate charges

4. CONDITIONS:
   - Extract each condition as separate obligation
   - Note coastal/tide-related conditions if present
   - Classify by type: VOLUME_LIMIT, PH_LIMIT, MONITORING, etc.

ANTI-INFERENCE RULES:
- DO NOT infer Mogden values not stated
- Extract ONLY what is explicitly documented

OUTPUT: Return valid JSON matching the SW-TE-INGEST-001 v1.3 schema.
```

---

## User Message Template

```text
Extract all data from this Southern Water Trade Effluent Consent.

Document Type: {document_type}
Water Company: Southern Water
Page Count: {page_count}

DOCUMENT TEXT:
{document_text}

INSTRUCTIONS:
1. Extract consent metadata (reference, dates, parties)
2. Extract discharge limits (volume, rate, hours)
3. Extract Mogden formula values if present
4. Extract all conditions with thresholds
5. Calculate confidence scores

Return valid JSON matching the SW-TE-INGEST-001 v1.3 schema.
```

---

**END OF PROMPT SW-TE-INGEST-001 v1.3**
