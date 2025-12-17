# Ingestion Prompt Master Index v2.0

**Version:** 2.0
**Status:** FROZEN
**Last Updated:** 2025-02-01
**Total Prompts:** 23

---

## Prompt Library Summary

| Module | Count | Jurisdictions |
|--------|-------|---------------|
| Environmental Permits | 4 | England, Wales, Scotland, Northern Ireland |
| MCPD | 4 | England, Wales, Scotland, Northern Ireland |
| Hazardous/Special Waste | 4 | England, Wales, Scotland, Northern Ireland |
| Trade Effluent | 11 | England (9), Wales (1), Scotland (1) |
| **Total** | **23** | |

---

## Complete Prompt Index

| Module | Prompt ID | Version | Jurisdiction | File Path |
|--------|-----------|---------|--------------|-----------|
| Environmental Permits | EA-ENV-INGEST-001 | v1.3 | England | `docs/ingestion_prompts/environmental_permits/EA-ENV-INGEST-001_v1.3.md` |
| Environmental Permits | NRW-ENV-INGEST-001 | v1.3 | Wales | `docs/ingestion_prompts/environmental_permits/NRW-ENV-INGEST-001_v1.3.md` |
| Environmental Permits | SEPA-ENV-INGEST-001 | v1.3 | Scotland | `docs/ingestion_prompts/environmental_permits/SEPA-ENV-INGEST-001_v1.3.md` |
| Environmental Permits | NIEA-ENV-INGEST-001 | v1.3 | Northern Ireland | `docs/ingestion_prompts/environmental_permits/NIEA-ENV-INGEST-001_v1.3.md` |
| MCPD | EA-MCPD-INGEST-001 | v1.4 | England | `docs/ingestion_prompts/mcpd/EA-MCPD-INGEST-001_v1.4.md` |
| MCPD | NRW-MCPD-INGEST-001 | v1.5 | Wales | `docs/ingestion_prompts/mcpd/NRW-MCPD-INGEST-001_v1.5.md` |
| MCPD | SEPA-MCPD-INGEST-001 | v1.6 | Scotland | `docs/ingestion_prompts/mcpd/SEPA-MCPD-INGEST-001_v1.6.md` |
| MCPD | NIEA-MCPD-INGEST-001 | v1.6 | Northern Ireland | `docs/ingestion_prompts/mcpd/NIEA-MCPD-INGEST-001_v1.6.md` |
| Hazardous/Special Waste | EA-HW-INGEST-001 | v1.4 | England | `docs/ingestion_prompts/hazardous_waste/EA-HW-INGEST-001_v1.4.md` |
| Hazardous/Special Waste | NRW-HW-INGEST-001 | v1.4 | Wales | `docs/ingestion_prompts/hazardous_waste/NRW-HW-INGEST-001_v1.4.md` |
| Hazardous/Special Waste | SEPA-SW-INGEST-001 | v1.4 | Scotland | `docs/ingestion_prompts/hazardous_waste/SEPA-SW-INGEST-001_v1.4.md` |
| Hazardous/Special Waste | NIEA-HW-INGEST-001 | v1.4 | Northern Ireland | `docs/ingestion_prompts/hazardous_waste/NIEA-HW-INGEST-001_v1.4.md` |
| Trade Effluent | TW-TE-INGEST-001 | v1.3 | England | `docs/ingestion_prompts/trade_effluent/TW-TE-INGEST-001_v1.3.md` |
| Trade Effluent | ST-TE-INGEST-001 | v1.3 | England | `docs/ingestion_prompts/trade_effluent/ST-TE-INGEST-001_v1.3.md` |
| Trade Effluent | UU-TE-INGEST-001 | v1.3 | England | `docs/ingestion_prompts/trade_effluent/UU-TE-INGEST-001_v1.3.md` |
| Trade Effluent | AW-TE-INGEST-001 | v1.3 | England | `docs/ingestion_prompts/trade_effluent/AW-TE-INGEST-001_v1.3.md` |
| Trade Effluent | YW-TE-INGEST-001 | v1.3 | England | `docs/ingestion_prompts/trade_effluent/YW-TE-INGEST-001_v1.3.md` |
| Trade Effluent | NW-TE-INGEST-001 | v1.3 | England | `docs/ingestion_prompts/trade_effluent/NW-TE-INGEST-001_v1.3.md` |
| Trade Effluent | SW-TE-INGEST-001 | v1.3 | England | `docs/ingestion_prompts/trade_effluent/SW-TE-INGEST-001_v1.3.md` |
| Trade Effluent | SWW-TE-INGEST-001 | v1.3 | England | `docs/ingestion_prompts/trade_effluent/SWW-TE-INGEST-001_v1.3.md` |
| Trade Effluent | WX-TE-INGEST-001 | v1.3 | England | `docs/ingestion_prompts/trade_effluent/WX-TE-INGEST-001_v1.3.md` |
| Trade Effluent | DC-TE-INGEST-001 | v1.4 | Wales | `docs/ingestion_prompts/trade_effluent/DC-TE-INGEST-001_v1.4.md` |
| Trade Effluent | SCW-TE-INGEST-001 | v1.5 | Scotland | `docs/ingestion_prompts/trade_effluent/SCW-TE-INGEST-001_v1.5.md` |

---

## Module Breakdown

### Environmental Permits
Permits issued by environmental regulators for industrial activities with environmental impact.

| Prompt ID | Regulator | Bilingual | Key Features |
|-----------|-----------|-----------|--------------|
| EA-ENV-INGEST-001 | Environment Agency | No | CCS banding, BAT requirements |
| NRW-ENV-INGEST-001 | Natural Resources Wales | Yes (Welsh) | NRW banding, *_welsh fields |
| SEPA-ENV-INGEST-001 | SEPA | No | PPC terminology, CAS withdrawn |
| NIEA-ENV-INGEST-001 | NIEA | No | Part A(1)/A(2)/B, Irish Grid |

### MCPD (Medium Combustion Plant Directive)
Registration and permits for combustion plants 1-50MW thermal input.

| Prompt ID | Regulator | Bilingual | Key Features |
|-----------|-----------|-----------|--------------|
| EA-MCPD-INGEST-001 | Environment Agency | No | Specified Generators, aggregation |
| NRW-MCPD-INGEST-001 | Natural Resources Wales | Yes (Welsh) | NRW banding integration |
| SEPA-MCPD-INGEST-001 | SEPA | No | PPC integration, BAT reference |
| NIEA-MCPD-INGEST-001 | NIEA | No | SEM market (no triad), Irish Grid |

### Hazardous/Special Waste
Consignment notes and duty of care documentation for hazardous waste movements.

| Prompt ID | Regulator | Bilingual | Key Features |
|-----------|-----------|-----------|--------------|
| EA-HW-INGEST-001 | Environment Agency | No | Multi-leg tracking, EWC codes |
| NRW-HW-INGEST-001 | Natural Resources Wales | Yes (Welsh) | Cross-border (England/Wales) |
| SEPA-SW-INGEST-001 | SEPA | No | "Special Waste" terminology |
| NIEA-HW-INGEST-001 | NIEA | No | ROI transfrontier, Irish Grid |

### Trade Effluent
Consent to discharge trade effluent to public sewers.

| Prompt ID | Water Company | Jurisdiction | Key Features |
|-----------|---------------|--------------|--------------|
| TW-TE-INGEST-001 | Thames Water | England | Mogden formula, largest UK |
| ST-TE-INGEST-001 | Severn Trent | England | Midlands coverage |
| UU-TE-INGEST-001 | United Utilities | England | North West coverage |
| AW-TE-INGEST-001 | Anglian Water | England | Agricultural focus |
| YW-TE-INGEST-001 | Yorkshire Water | England | Yorkshire coverage |
| NW-TE-INGEST-001 | Northumbrian Water | England | North East coverage |
| SW-TE-INGEST-001 | Southern Water | England | South East coverage |
| SWW-TE-INGEST-001 | South West Water | England | Devon/Cornwall |
| WX-TE-INGEST-001 | Wessex Water | England | Dorset/Somerset |
| DC-TE-INGEST-001 | Dŵr Cymru | Wales | Bilingual (Welsh) |
| SCW-TE-INGEST-001 | Scottish Water | Scotland | CAS withdrawn, regions |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v2.0 | 2025-02-01 | Initial frozen release with all 23 prompts |

---

**END OF DOCUMENT**
