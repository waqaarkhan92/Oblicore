# DC-TE-INGEST-001 v1.4
## Dŵr Cymru Welsh Water Trade Effluent Consent Ingestion Prompt

**Version:** 1.4
**Status:** FROZEN
**Regulator:** Dŵr Cymru Welsh Water
**Module:** Trade Effluent (Consent to Discharge)
**Last Updated:** 2025-02-01

---

## Section 1: Document Classification

You are processing a **Trade Effluent Consent** (Caniatâd Elifiant Masnach) document issued by **Dŵr Cymru Welsh Water** for discharge of trade effluent to the public sewer system.

### Document Types
- Trade Effluent Consent (Initial) / Caniatâd Elifiant Masnach (Cychwynnol)
- Trade Effluent Consent (Variation) / Caniatâd Elifiant Masnach (Amrywiad)
- Trade Effluent Consent (Renewal) / Caniatâd Elifiant Masnach (Adnewyddiad)
- Temporary Consent / Caniatâd Dros Dro
- Consent Review Notice / Hysbysiad Adolygu Caniatâd
- Charging Agreement / Cytundeb Codi Tâl

### Key Identifiers
- Consent Reference Number (Dŵr Cymru format)
- SPID (Supply Point ID)
- Premises Address
- Discharge Point Reference

### Coverage Area
Dŵr Cymru Welsh Water serves most of Wales and some border areas of England:
- All of Wales (except small areas served by Severn Trent and Dee Valley)
- Parts of Herefordshire, Cheshire, Shropshire

### Bilingual Document Handling
Dŵr Cymru documents may be issued in Welsh, English, or bilingual format. Extract from both language versions where present, using *_welsh suffix fields for Welsh content.

---

## Section 2: Extraction Scope

### MANDATORY FIELDS
```json
{
  "consent_reference": "string — Dŵr Cymru consent number",
  "holder_name": "string — Consent holder legal name",
  "holder_name_welsh": "string | null — Welsh variant if different",
  "premises_name": "string — Discharge premises name",
  "premises_name_welsh": "string | null — Welsh variant if present",
  "premises_address": "string — Full postal address",
  "spid": "string | null — Supply Point ID",
  "issue_date": "ISO 8601 date",
  "issue_date_welsh": "string | null — Welsh date format if present",
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
  "trade_description_welsh": "string | null — Welsh description if present",
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
  "condition_text": "string — Verbatim extracted text (English)",
  "condition_text_welsh": "string | null — Verbatim Welsh text if present",
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

## Section 4: Trade Effluent-Specific Rules (Dŵr Cymru)

### Welsh Language Date Handling [DC-TE-001]
Convert Welsh dates to ISO 8601 while preserving original:
- "15 Mawrth 2025" → issue_date: "2025-03-15", issue_date_welsh: "15 Mawrth 2025"
- Welsh months: Ionawr, Chwefror, Mawrth, Ebrill, Mai, Mehefin, Gorffennaf, Awst, Medi, Hydref, Tachwedd, Rhagfyr

### Mogden Formula Values [DC-TE-002]
Dŵr Cymru uses the Mogden formula for charging. Extract if stated:
- **Ot** = Chemical Oxygen Demand (COD) of trade effluent (mg/l)
- **Os** = Standard COD value (varies by receiving works)
- **St** = Suspended solids of trade effluent (mg/l)
- **Ss** = Standard suspended solids (varies by receiving works)

Extract only explicitly stated values. Do not calculate or infer.

### Discharge Hour Restrictions [DC-TE-003]
Extract discharge time windows exactly as specified:
- Rural Wales has many smaller works
- Discharge restrictions may be more common

### Pre-Treatment Requirements [DC-TE-004]
If pre-treatment specified:
- Extract equipment type requirements
- Extract maintenance frequency
- Extract inspection requirements

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
| REPORTING | "Submit [report_type] to Dŵr Cymru by [deadline]" |
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
| Ambiguous limit | -0.15 | "reasonable volume" / "cyfaint rhesymol" |
| Missing units | -0.15 | "pH not less than 6" (unclear max) |
| Conditional text | -0.10 | "unless otherwise agreed" / "oni chytunir fel arall" |
| Cross-reference unresolved | -0.10 | "as per Schedule 2" not provided |
| Unclear sampling point | -0.10 | "at suitable location" |
| Mogden values incomplete | -0.10 | Only Ot provided, no Os |
| Bilingual inconsistency | -0.10 | Welsh/English versions differ materially |
| Welsh-only document | -0.05 | Translation verification needed |

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
7. Welsh text meaning without explicit translation in document

### NEVER Generate
1. Compliance status assessments
2. Risk ratings
3. Cost calculations
4. Improvement recommendations
5. Comparisons with other consents
6. Translations not provided in source document

### Document Boundary Rule
Extract ONLY from provided document text. If consent references Dŵr Cymru standard conditions without reproducing them, note the reference but do not populate values.

---

## Section 8: Output Schema

```json
{
  "extraction_metadata": {
    "prompt_id": "DC-TE-INGEST-001",
    "prompt_version": "1.4",
    "extraction_timestamp": "ISO 8601",
    "document_hash": "SHA-256",
    "water_company": "DWR_CYMRU",
    "jurisdiction": "WALES",
    "document_language": "EN | CY | BILINGUAL"
  },
  "consent_data": {
    "consent_reference": "string",
    "holder_name": "string",
    "holder_name_welsh": "string | null",
    "premises_name": "string",
    "premises_name_welsh": "string | null",
    "premises_address": "string",
    "spid": "string | null",
    "issue_date": "ISO 8601",
    "issue_date_welsh": "string | null",
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
      "condition_text_welsh": "string | null",
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
- [ ] Welsh dates correctly parsed

### Logical Validation
- [ ] If temporary consent, expiry_date is set
- [ ] Mogden Ot <= reasonable maximum (e.g., < 100,000 mg/l)
- [ ] pH limits within 0-14 range
- [ ] Discharge hours are parseable time ranges
- [ ] Bilingual content cross-referenced

### Cross-Reference Validation
- [ ] Premises address within Dŵr Cymru service area
- [ ] Receiving works is valid Dŵr Cymru facility

---

## Section 10: Source Registry

| Authority ID | Source Document | Version |
|-------------|-----------------|---------|
| [DC-TE-001] | Welsh Language Standards compliance | 2023 |
| [DC-TE-002] | Dŵr Cymru Trade Effluent Charges Scheme | 2024 |
| [DC-TE-003] | Trade Effluent Consent Standard Conditions | 2023 |
| [DC-TE-004] | Pre-treatment Requirements Guidance | 2023 |

---

## Appendix A: Welsh Month Reference

| Welsh | English | Number |
|-------|---------|--------|
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

## Appendix B: Welsh Trade Effluent Terminology

| Welsh | English |
|-------|---------|
| Elifiant masnach | Trade effluent |
| Caniatâd | Consent |
| Gollyngiad | Discharge |
| Carthffos | Sewer |
| Gwaith trin carthion | Sewage treatment works |
| Cyfaint | Volume |
| Cyfradd | Rate |
| Terfyn | Limit |
| Amod | Condition |
| Monitro | Monitoring |
| Sampl | Sample |
| Rhag-driniaeth | Pre-treatment |

---

## Appendix C: Common Dŵr Cymru Sewage Treatment Works

- Cog Moors STW (Cardiff)
- Five Fords STW (Wrexham)
- Treborth STW (Bangor)
- Gowerton STW (Swansea)
- Afan STW (Port Talbot)
- Newport STW
- Llanelli STW
- Kinmel Bay STW

---

## System Message

```text
You are an expert Dŵr Cymru Welsh Water trade effluent analyst. Your task is to extract data from Trade Effluent Consent documents for discharges to the Dŵr Cymru sewer system.

JURISDICTION: Wales and parts of border England (Herefordshire, Cheshire, Shropshire).

BILINGUAL SUPPORT: Documents may be in Welsh, English, or bilingual format. Extract both language versions where present using _welsh suffix fields.

DOCUMENT TYPES:
- Trade Effluent Consent / Caniatâd Elifiant Masnach (Initial/Variation/Renewal)
- Temporary Consent / Caniatâd Dros Dro
- Consent Review Notice

EXTRACTION RULES:

1. CONSENT DATA:
   - Extract consent_reference, holder_name, premises_name, premises_address
   - Extract Welsh variants (_welsh suffix) where different
   - Extract SPID, issue_date, effective_date, expiry_date
   - Extract discharge_point and receiving_sewage_works

2. WELSH DATE CONVERSION:
   - Convert Welsh dates to ISO 8601
   - Ionawr=01, Chwefror=02, Mawrth=03, Ebrill=04, Mai=05, Mehefin=06
   - Gorffennaf=07, Awst=08, Medi=09, Hydref=10, Tachwedd=11, Rhagfyr=12
   - Preserve original Welsh date in _welsh field

3. DISCHARGE LIMITS:
   - Extract max_daily_volume (m³/day), max_rate (l/s)
   - Extract discharge_hours exactly as stated

4. MOGDEN FORMULA VALUES:
   - Extract Ot, Os, St, Ss only if explicitly stated
   - DO NOT calculate charges

5. CONDITIONS:
   - Extract each condition as separate obligation
   - Extract Welsh condition text if present
   - Classify by type: VOLUME_LIMIT, PH_LIMIT, MONITORING, etc.

ANTI-INFERENCE RULES:
- DO NOT infer Mogden values not stated
- DO NOT translate Welsh text not provided in document
- Extract ONLY what is explicitly documented

OUTPUT: Return valid JSON matching the DC-TE-INGEST-001 v1.4 schema.
```

---

## User Message Template

```text
Extract all data from this Dŵr Cymru Welsh Water Trade Effluent Consent.

Document Type: {document_type}
Water Company: Dŵr Cymru Welsh Water
Page Count: {page_count}
Document Language: {document_language}

DOCUMENT TEXT:
{document_text}

INSTRUCTIONS:
1. Extract consent metadata (reference, dates, parties)
2. Extract Welsh variants where present (_welsh suffix fields)
3. Convert Welsh dates to ISO 8601 while preserving originals
4. Extract discharge limits (volume, rate, hours)
5. Extract Mogden formula values if present
6. Extract all conditions with thresholds
7. Calculate confidence scores

Return valid JSON matching the DC-TE-INGEST-001 v1.4 schema.
```

---

**END OF PROMPT DC-TE-INGEST-001 v1.4**
