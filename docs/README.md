# EcoComply Documentation

## Documentation Structure

```
docs/
├── README.md                           # This file - documentation index
├── 01-commercial/                      # Business & Commercial Strategy
│   ├── 01-commercial-master-plan.md
│   └── 02-product-plan.md
├── 02-architecture/                    # Technical Architecture
│   └── 01-technical-stack.md
├── 03-database/                        # Database Specifications
│   ├── 01-schema.md
│   ├── 02-rls-permissions.md
│   └── 03-canonical-dictionary.md
├── 04-backend/                         # Backend Specifications
│   ├── 01-business-logic.md
│   ├── 02-api-specification.md
│   ├── 03-background-jobs.md
│   ├── 04-notifications.md
│   └── 05-ai-integration.md
├── 05-frontend/                        # Frontend Specifications
│   ├── 01-ui-ux-design-system.md
│   ├── 02-routes-components.md
│   ├── 03-user-workflows.md
│   └── 04-onboarding-flow.md
├── 06-ai/                              # AI & Machine Learning
│   ├── 01-extraction-rules-library.md
│   ├── 02-cost-optimization.md
│   └── 03-prompts-complete.md
├── 07-implementation/                  # Implementation Guides
│   └── 01-blueprint.md
├── 08-features/                        # Feature Specifications
│   └── 01-enhanced-features-v2.md
├── 09-regulatory/                      # Regulatory & Methodology
│   ├── 01-methodology-handbook.md
│   ├── 02-methodology-ingestion.md
│   ├── prompts/                        # AI Ingestion Prompts (23 total)
│   │   ├── README.md
│   │   ├── source-registry.md
│   │   ├── environmental-permits/      # Module 1 (4 prompts)
│   │   ├── trade-effluent/             # Module 2 (11 prompts)
│   │   ├── mcpd/                       # Module 3 (4 prompts)
│   │   └── hazardous-waste/            # Module 4 (4 prompts)
│   └── ui/                             # UI Specifications
│       ├── 01-navigation-forms.md
│       ├── 02-obligations-review.md
│       ├── 03-evidence-confidence.md
│       ├── 04-wireframes.md
│       └── 05-auditpacks-accessibility.md
├── api/
│   └── openapi.yaml                    # OpenAPI specification
└── examples/
    └── permits/                        # Sample permit documents
```

---

## Quick Reference

### Authoritative Documents

| Document | Location | Purpose |
|----------|----------|---------|
| **Regulatory Methodology Handbook** | [09-regulatory/01-methodology-handbook.md](09-regulatory/01-methodology-handbook.md) | Master reference for all regulatory methodology |
| **Methodology Ingestion** | [09-regulatory/02-methodology-ingestion.md](09-regulatory/02-methodology-ingestion.md) | 15-step document ingestion process |
| **Prompt Index** | [09-regulatory/prompts/README.md](09-regulatory/prompts/README.md) | Index of all 23 AI ingestion prompts |
| **Source Registry** | [09-regulatory/prompts/source-registry.md](09-regulatory/prompts/source-registry.md) | 80 regulatory source references |

### Key Technical Specs

| Document | Location | Purpose |
|----------|----------|---------|
| Product Business Logic | [04-backend/01-business-logic.md](04-backend/01-business-logic.md) | Core business rules |
| Database Schema | [03-database/01-schema.md](03-database/01-schema.md) | Database structure |
| Backend API | [04-backend/02-api-specification.md](04-backend/02-api-specification.md) | API endpoints |
| AI Integration | [04-backend/05-ai-integration.md](04-backend/05-ai-integration.md) | AI layer implementation |

---

## Folder Naming Convention

| Folder | Category |
|--------|----------|
| `01-commercial` | Business & Commercial Strategy |
| `02-architecture` | Technical Architecture |
| `03-database` | Database Design |
| `04-backend` | Backend Services |
| `05-frontend` | Frontend & UI |
| `06-ai` | AI & Machine Learning |
| `07-implementation` | Implementation Guides |
| `08-features` | Feature Specifications |
| `09-regulatory` | Regulatory & Methodology |

### File Naming Convention

- All lowercase
- Words separated by hyphens (`-`)
- Numeric prefix for ordering (`01-`, `02-`, etc.)
- Example: `01-methodology-handbook.md`

---

## Regulatory Coverage

### Jurisdictions
- **England** - Environment Agency (EA)
- **Wales** - Natural Resources Wales (NRW)
- **Scotland** - SEPA
- **Northern Ireland** - NIEA

### Modules
| Module | Document Types | Prompts |
|--------|----------------|---------|
| Module 1: Environmental Permits | Permits, Variations, Surrenders | 4 |
| Module 2: Trade Effluent | Consents, Agreements | 11 |
| Module 3: MCPD | Registrations, ELV Schedules | 4 |
| Module 4: Hazardous/Special Waste | Consignment Notes | 4 |

---

## Cross-References

When documents reference each other:
- **Confidence Thresholds** → See [09-regulatory/01-methodology-handbook.md](09-regulatory/01-methodology-handbook.md) Section 7
- **Condition Types (21-value ENUM)** → See [09-regulatory/01-methodology-handbook.md](09-regulatory/01-methodology-handbook.md) Section 6.2
- **Anti-Inference Rules** → See [09-regulatory/01-methodology-handbook.md](09-regulatory/01-methodology-handbook.md) Section 8

---

*Last updated: 2025-12-05*
