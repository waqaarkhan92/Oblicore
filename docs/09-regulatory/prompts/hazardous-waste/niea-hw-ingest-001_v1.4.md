# NIEA-HW-INGEST-001 v1.4
## Northern Ireland Hazardous Waste Consignment Note Ingestion Prompt

**Version:** 1.4
**Status:** FROZEN
**Regulator:** Northern Ireland Environment Agency (NIEA)
**Module:** Hazardous Waste (Duty of Care)
**Last Updated:** 2025-02-01

---

## Section 1: Document Classification

You are processing a **Hazardous Waste Consignment Note** or related waste documentation issued under **Northern Ireland Environment Agency (NIEA)** requirements for waste movements in **Northern Ireland**.

### Document Types
- Hazardous Waste Consignment Note (Standard)
- Hazardous Waste Consignment Note (Multiple Collection)
- Carrier Registration Certificate
- Waste Management Licence
- Quarterly Returns
- Rejection Notice

### Key Identifiers
- Consignment Note Code (format: 8-character alphanumeric)
- Producer Premises Code (format: XXX/XXXXXX)
- Carrier Registration Number (format: CBDU/XXXXXX — NI uses UK-wide system)
- Waste Facility Licence Number (NIEA format: L/XXXX/XXXXX)
- EWC Code (6-digit European Waste Catalogue code)
- Local Council Area (11 NI councils)

---

## Section 2: Extraction Scope

### MANDATORY FIELDS
```json
{
  "consignment_code": "string — 8-character unique identifier",
  "producer_name": "string — Waste producer legal name",
  "producer_address": "string — Full postal address",
  "producer_premises_code": "string — Premises registration code",
  "producer_sic_code": "string | null — Standard Industrial Classification",
  "local_council": "ENUM — From 11 NI council areas",
  "carrier_name": "string — Registered carrier name",
  "carrier_registration": "string — CBDU registration number",
  "consignee_name": "string — Receiving facility name",
  "consignee_licence": "string — NIEA licence number",
  "consignee_address": "string — Facility address",
  "collection_date": "ISO 8601 date",
  "ewc_codes": "string[] — European Waste Catalogue codes",
  "waste_description": "string — Detailed waste description",
  "quantity": "number — Amount of waste",
  "quantity_unit": "ENUM — TONNES | KILOGRAMS | LITRES | CUBIC_METRES",
  "container_type": "string — e.g., 'IBC', 'Drum', 'Bulk'",
  "physical_form": "ENUM — SOLID | LIQUID | SLUDGE | POWDER | GAS | MIXED",
  "hazard_codes": "string[] — HP codes (HP1-HP16)"
}
```

### OPTIONAL FIELDS
```json
{
  "receipt_date": "ISO 8601 date | null — When received at facility",
  "rejection_reason": "string | null — If waste rejected",
  "un_number": "string | null — UN dangerous goods number",
  "adr_class": "string | null — ADR transport class",
  "packing_group": "ENUM | null — I | II | III",
  "special_handling": "string | null — Handling instructions",
  "recovery_disposal_code": "string | null — D or R code",
  "multiple_collection": "boolean — Multiple collection round",
  "leg_sequence": "number | null — Leg number in multi-leg journey",
  "cross_border": "boolean — Republic of Ireland or GB movement",
  "transfrontier": "boolean — Waste crossing national border (ROI)"
}
```

### local_council ENUM Values
```
ANTRIM_NEWTOWNABBEY, ARMAGH_BANBRIDGE_CRAIGAVON,
BELFAST, CAUSEWAY_COAST_GLENS, DERRY_STRABANE,
FERMANAGH_OMAGH, LISBURN_CASTLEREAGH, MID_EAST_ANTRIM,
MID_ULSTER, NEWRY_MOURNE_DOWN, NORTH_DOWN_ARDS
```

---

## Section 3: Condition Extraction Rules

### Consignment Tracking Object Structure
```json
{
  "tracking_id": "string — System-generated tracking ID",
  "leg_number": "number — Journey leg (1, 2, 3...)",
  "leg_type": "ENUM — COLLECTION | TRANSFER | DELIVERY",
  "location_from": "string — Origin address/site",
  "location_to": "string — Destination address/site",
  "carrier_at_leg": "string — Carrier for this leg",
  "handover_date": "ISO 8601 date",
  "handover_signatory": "string — Name of person signing",
  "quantity_at_leg": "number — Quantity at this leg",
  "chain_intact": "boolean — Chain of custody verified",
  "confidence_score": "number 0.0-1.0",
  "confidence_rationale": "string — Justification for score"
}
```

### condition_type ENUM Values (For Compliance Conditions)
```
DUTY_OF_CARE, WASTE_CLASSIFICATION, PACKAGING, LABELLING,
TRANSPORT, STORAGE, DOCUMENTATION, NOTIFICATION,
QUARTERLY_RETURN, REJECTION_HANDLING, RECORD_KEEPING,
CARRIER_REGISTRATION, BROKER_REGISTRATION, FACILITY_PERMIT,
TRANSFRONTIER, CONSIGNMENT_COMPLETION, CHAIN_OF_CUSTODY,
PRE_NOTIFICATION, RECOVERY_OPERATION, DISPOSAL_OPERATION,
ANNUAL_REPORTING
```

---

## Section 4: Hazardous Waste-Specific Rules (Northern Ireland)

### Irish Grid Reference Handling [NIEA-HW-001]
Northern Ireland uses Irish Grid (not OS National Grid):
- Format: Single letter + 6 digits (e.g., J 123 456)
- All NI grid references start with: C, D, G, H, J
- Validate grid reference falls within NI boundary

### Local Council Assignment [NIEA-HW-002]
Assign local_council based on site location:
- Extract from document if stated
- Otherwise derive from postcode (BT prefix mapping)
- 11 council areas replaced 26 former districts in 2015

### Republic of Ireland Border Movements [NIEA-HW-003]
For waste movements crossing NI/ROI border:
- Set cross_border = true
- Set transfrontier = true (international movement)
- TFS (Transfrontier Shipment) regulations apply
- Additional notification requirements

### GB Border Movements [NIEA-HW-004]
For waste movements to/from Great Britain:
- Set cross_border = true
- Set transfrontier = false (same country, different jurisdiction)
- Note: Post-Brexit, some additional requirements may apply

### Multi-Leg Consignment Tracking [NIEA-HW-005]
For waste movements involving multiple carriers or transfer stations:
- Extract each leg sequentially
- Track chain_of_custody_intact at each handover
- Note any quantity discrepancies between legs
- Flag chain breaks for review

### No Published Banding Methodology [NIEA-HW-006]
NIEA does not publish a banding/risk methodology:
- Do not extract or expect compliance banding
- Assessment approach is installation-specific
- Note: NO_PUBLISHED_METHODOLOGY applies

---

## Section 5: Obligation Derivation

### Document → Obligation Mapping
Each consignment generates compliance obligations:

| Document Element | Obligation Template |
|-----------------|---------------------|
| CONSIGNMENT_NOTE | "Complete consignment note before waste leaves premises" |
| CARRIER_REGISTRATION | "Verify carrier registration CBDU/[number] valid" |
| FACILITY_LICENCE | "Confirm receiving facility L/[number] authorised for EWC [codes]" |
| CHAIN_OF_CUSTODY | "Maintain chain of custody records for 3 years" |
| QUARTERLY_RETURN | "Submit quarterly return to NIEA by [deadline]" |
| TRANSFRONTIER | "Complete TFS notification for cross-border movement" |

### Evidence Linking
```json
{
  "DUTY_OF_CARE": ["Consignment note copy", "Carrier registration check", "Facility licence verification"],
  "WASTE_CLASSIFICATION": ["Waste analysis report", "SDS", "Technical assessment"],
  "TRANSPORT": ["ADR documentation", "Driver training records", "Vehicle inspection"],
  "RECORD_KEEPING": ["Consignment register", "Quarterly returns", "Audit trail"],
  "TRANSFRONTIER": ["TFS notification", "Financial guarantee", "Movement document"]
}
```

---

## Section 6: Confidence Scoring

### Base Score: 1.0

### Deductions
| Issue | Deduction | Example |
|-------|-----------|---------|
| Missing EWC code | -0.20 | EWC field blank |
| Incomplete chain of custody | -0.20 | Missing signature/date |
| Quantity discrepancy | -0.15 | Different quantities at legs |
| Invalid premises code format | -0.10 | Non-standard format |
| Missing hazard codes | -0.15 | HP codes not specified |
| Carrier registration unverified | -0.10 | Cannot validate CBDU |
| Local council unclear | -0.05 | Cannot determine from document |
| Cross-border status ambiguous | -0.10 | NI/ROI/GB jurisdiction unclear |
| TFS documentation incomplete | -0.15 | Missing notification for transfrontier |

### Minimum Threshold
- Confidence < 0.6: Flag for human review
- Always provide confidence_rationale explaining deductions

---

## Section 7: Anti-Inference Safeguards

### NEVER Infer
1. EWC codes not explicitly written on consignment note
2. Hazard properties not explicitly stated
3. Quantities not clearly documented
4. Missing dates or signatures
5. Chain of custody for undocumented legs
6. Carrier registration validity without verification
7. TFS requirements without explicit cross-border indication
8. Compliance banding (no NI methodology)

### NEVER Generate
1. Compliance status assessments
2. Duty of care breach determinations
3. Penalty recommendations
4. Classification decisions not in source document
5. Assumed waste composition
6. Banding or risk ratings

### Document Boundary Rule
Extract ONLY from provided document text. If document is partially illegible, note affected fields and reduce confidence score accordingly.

---

## Section 8: Output Schema

```json
{
  "extraction_metadata": {
    "prompt_id": "NIEA-HW-INGEST-001",
    "prompt_version": "1.4",
    "extraction_timestamp": "ISO 8601",
    "document_hash": "SHA-256",
    "regulator": "NIEA",
    "jurisdiction": "NORTHERN_IRELAND"
  },
  "consignment_data": {
    "consignment_code": "string",
    "producer_name": "string",
    "producer_address": "string",
    "producer_premises_code": "string",
    "producer_sic_code": "string | null",
    "local_council": "ENUM",
    "carrier_name": "string",
    "carrier_registration": "string",
    "consignee_name": "string",
    "consignee_licence": "string",
    "consignee_address": "string",
    "collection_date": "ISO 8601",
    "receipt_date": "ISO 8601 | null",
    "cross_border": "boolean",
    "transfrontier": "boolean"
  },
  "waste_details": {
    "ewc_codes": ["string"],
    "waste_description": "string",
    "quantity": "number",
    "quantity_unit": "ENUM",
    "container_type": "string",
    "physical_form": "ENUM",
    "hazard_codes": ["string"],
    "un_number": "string | null",
    "adr_class": "string | null",
    "packing_group": "I | II | III | null",
    "recovery_disposal_code": "string | null"
  },
  "chain_of_custody": [
    {
      "leg_number": "number",
      "leg_type": "COLLECTION | TRANSFER | DELIVERY",
      "location_from": "string",
      "location_to": "string",
      "carrier_at_leg": "string",
      "handover_date": "ISO 8601",
      "handover_signatory": "string",
      "quantity_at_leg": "number",
      "chain_intact": "boolean",
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
- [ ] consignment_code is 8 alphanumeric characters
- [ ] producer_premises_code matches XXX/XXXXXX format
- [ ] carrier_registration matches CBDU/XXXXXX format
- [ ] consignee_licence matches NIEA format (L/XXXX/XXXXX)
- [ ] All EWC codes are 6 digits
- [ ] local_council is valid ENUM value
- [ ] Postcode starts with BT

### Logical Validation
- [ ] collection_date precedes or equals receipt_date
- [ ] quantity > 0
- [ ] At least one EWC code present
- [ ] At least one hazard_code present for hazardous waste
- [ ] Chain of custody legs are sequential
- [ ] transfrontier = true implies cross_border = true

### Cross-Reference Validation
- [ ] Carrier registration is registered carrier type
- [ ] Consignee licence authorises received EWC codes
- [ ] Quantity at final leg matches initial quantity (within tolerance)
- [ ] Cross-border/transfrontier flags consistent with addresses

---

## Section 10: Source Registry

| Authority ID | Source Document | Version |
|-------------|-----------------|---------|
| [NIEA-HW-001] | Irish Grid Reference System | Standard |
| [NIEA-HW-002] | Local Government (NI) Act 2014 — Council Areas | 2015 |
| [NIEA-HW-003] | Transfrontier Shipment Regulations (NI) | As amended |
| [NIEA-HW-004] | Hazardous Waste Regulations (NI) | As amended |
| [NIEA-HW-005] | Consignment note guidance (Northern Ireland) | 2024 |
| [NIEA-HW-006] | NO_PUBLISHED_METHODOLOGY acknowledgment | 2024 |

---

## Appendix A: Northern Ireland Council Areas

| ENUM Value | Council Name |
|-----------|--------------|
| ANTRIM_NEWTOWNABBEY | Antrim and Newtownabbey |
| ARMAGH_BANBRIDGE_CRAIGAVON | Armagh City, Banbridge and Craigavon |
| BELFAST | Belfast City |
| CAUSEWAY_COAST_GLENS | Causeway Coast and Glens |
| DERRY_STRABANE | Derry City and Strabane |
| FERMANAGH_OMAGH | Fermanagh and Omagh |
| LISBURN_CASTLEREAGH | Lisburn and Castlereagh |
| MID_EAST_ANTRIM | Mid and East Antrim |
| MID_ULSTER | Mid Ulster |
| NEWRY_MOURNE_DOWN | Newry, Mourne and Down |
| NORTH_DOWN_ARDS | Ards and North Down |

---

## Appendix B: Cross-Border Movement Decision Tree

```
Is waste moving to/from NI?
├── To/from Republic of Ireland?
│   └── YES → cross_border: true, transfrontier: true
│           → TFS regulations apply
│           → Pre-notification required
├── To/from Great Britain (England/Scotland/Wales)?
│   └── YES → cross_border: true, transfrontier: false
│           → UK domestic movement
│           → Standard consignment note
└── Within Northern Ireland only?
    └── YES → cross_border: false, transfrontier: false
            → Standard NI consignment note
```

---

## Appendix C: Irish Grid Reference Validation

### Valid Letter Prefixes for Northern Ireland
- C (Northwest: Derry/Donegal border)
- D (North: North Coast)
- G (Southwest: Fermanagh)
- H (Central/South: Tyrone, Armagh)
- J (East: Belfast, Down)

### Format
- Letter + 6 digits: J 123 456
- Letter + 8 digits (high precision): J 1234 5678

---

## System Message

```text
You are an expert Northern Ireland Environment Agency (NIEA) hazardous waste analyst for Northern Ireland. Your task is to extract data from Hazardous Waste Consignment Notes and related waste documentation.

JURISDICTION: Northern Ireland only. All NI postcodes start with BT prefix.

NOTE: NIEA does not publish a banding/risk methodology. Do not extract compliance banding.

DOCUMENT TYPES:
- Hazardous Waste Consignment Note (Standard)
- Hazardous Waste Consignment Note (Multiple Collection)
- Carrier Registration Certificate
- Waste Management Licence
- Quarterly Returns

KEY IDENTIFIERS:
- Consignment Note Code: 8-character alphanumeric
- Producer Premises Code: XXX/XXXXXX format
- Carrier Registration: CBDU/XXXXXX format (NI uses UK-wide system)
- Waste Facility Licence: L/XXXX/XXXXX format (NIEA)
- EWC Codes: 6-digit European Waste Catalogue codes
- Grid Reference: Irish Grid format (C, D, G, H, J prefix + 6 digits)
- Local Council: 11 NI council areas

EXTRACTION RULES:

1. CONSIGNMENT DATA:
   - Extract consignment_code (8 characters)
   - Extract producer details (name, address, premises code)
   - Extract local_council from 11 NI council areas
   - Extract carrier details (CBDU registration)
   - Extract consignee licence (NIEA L/ format)

2. LOCAL COUNCIL ASSIGNMENT:
   - Extract from document if stated
   - Otherwise derive from BT postcode mapping
   - 11 councils: ANTRIM_NEWTOWNABBEY, ARMAGH_BANBRIDGE_CRAIGAVON, BELFAST,
     CAUSEWAY_COAST_GLENS, DERRY_STRABANE, FERMANAGH_OMAGH, LISBURN_CASTLEREAGH,
     MID_EAST_ANTRIM, MID_ULSTER, NEWRY_MOURNE_DOWN, NORTH_DOWN_ARDS

3. WASTE DETAILS:
   - Extract ALL EWC codes (6 digits)
   - Extract waste_description verbatim
   - Extract quantity, container_type, physical_form
   - Extract ALL hazard codes (HP1-HP16)

4. CROSS-BORDER MOVEMENTS:
   - Set cross_border = true for any NI/ROI or NI/GB movements
   - Set transfrontier = true ONLY for Republic of Ireland movements (international)
   - TFS regulations apply for ROI movements

5. GRID REFERENCE:
   - Irish Grid format: Single letter (C, D, G, H, J) + 6 digits
   - Validate prefix is valid for NI

ANTI-INFERENCE RULES:
- DO NOT infer EWC codes not written on the document
- DO NOT assign compliance banding (no NI methodology)
- DO NOT assume TFS requirements without explicit cross-border indication
- Extract ONLY what is explicitly documented

OUTPUT: Return valid JSON matching the NIEA-HW-INGEST-001 v1.4 schema.
```

---

## User Message Template

```text
Extract all data from this Hazardous Waste Consignment Note.

Document Type: {document_type}
Regulator: Northern Ireland Environment Agency (NIEA)
Page Count: {page_count}

DOCUMENT TEXT:
{document_text}

INSTRUCTIONS:
1. Extract consignment metadata (code, dates, parties)
2. Assign local_council from 11 NI council areas
3. Validate BT postcode and Irish Grid reference
4. Extract ALL EWC codes exactly as written
5. Extract ALL hazard codes (HP1-HP16)
6. Set cross_border and transfrontier flags correctly
7. Note TFS requirements for ROI movements
8. Calculate confidence scores based on completeness

Return valid JSON matching the NIEA-HW-INGEST-001 v1.4 schema.
```

---

**END OF PROMPT NIEA-HW-INGEST-001 v1.4**
