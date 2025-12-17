# EcoComply Frontend Structure & Navigation Guide

This document provides a comprehensive overview of the EcoComply frontend application structure, navigation, modules, screens, user flows, conditional rendering, and page linking.

---

## Table of Contents

1. [Application Overview](#application-overview)
2. [Navigation System](#navigation-system)
3. [Module System](#module-system)
4. [Complete Page Hierarchy](#complete-page-hierarchy)
5. [Screen Descriptions](#screen-descriptions)
6. [User Flows](#user-flows)
7. [Conditional Rendering Rules](#conditional-rendering-rules)
8. [Page Linking & Connections](#page-linking--connections)
9. [Layout & Components](#layout--components)

---

## Application Overview

EcoComply is a multi-tenant SaaS environmental compliance management platform. The application follows a hierarchical structure:

```
Company (Tenant)
  └── Sites (Locations/Facilities)
       └── Modules (Feature Sets)
            └── Data (Obligations, Evidence, Documents, etc.)
```

**Key Concepts:**
- **Company**: The top-level tenant (customer organization)
- **Sites**: Physical locations managed by the company
- **Modules**: Feature packages that can be activated per company/site
- **Consultant Mode**: Multi-client view for environmental consultants

---

## Navigation System

The application uses a **context-aware dual-level navigation** system that adapts based on user role and current location.

### Global Navigation

The sidebar shows different navigation based on whether the user is a **Company User** or a **Consultant**.

#### Company User Navigation
| Item | Path | Description |
|------|------|-------------|
| Dashboard | `/dashboard` | Portfolio overview of all sites |
| Sites | `/dashboard/sites` | List of all company sites |
| Deadlines | `/dashboard/deadlines` | Cross-site deadline tracker |
| Compliance | `/dashboard/compliance` | EA Compliance Classification overview |
| Audit Packs | `/dashboard/packs` | Generate and manage audit packs |

#### Consultant Navigation
| Item | Path | Description |
|------|------|-------------|
| Dashboard | `/dashboard/consultant` | Multi-client overview |
| Clients | `/dashboard/consultant/clients` | Client company management |
| Deadlines | `/dashboard/deadlines` | Cross-client deadline tracker |
| Compliance | `/dashboard/compliance` | Compliance overview |
| Audit Packs | `/dashboard/consultant/packs` | Client pack management |

#### Account Navigation (All Users)
| Item | Path | Description |
|------|------|-------------|
| Settings | `/dashboard/settings` | Account configuration |
| Help | `/dashboard/help` | Help center |

### Site-Level Navigation

When navigating to any site page (`/dashboard/sites/{siteId}/*`), the sidebar dynamically adds site-specific navigation sections:

```
┌─────────────────────────────────┐
│ Global Navigation               │
├─────────────────────────────────┤
│ {Site Name}                     │  ← Dynamic section header
│   Overview                      │
│   Documents                     │
│   Obligations                   │
│   Evidence                      │
├─────────────────────────────────┤
│ EA Compliance                   │  ← Always visible
│   CCS Assessment                │
│   ELV Conditions                │
│   CAPA Tracker                  │
├─────────────────────────────────┤
│ Trade Effluent (Module 2)       │  ← Only if activated
│   Consents                      │
│   Parameters                    │
│   Lab Results                   │
│   Exceedances                   │
├─────────────────────────────────┤
│ Generators (Module 3)           │  ← Only if activated
│   Generators                    │
│   Run Hours                     │
│   Stack Tests                   │
│   AER Report                    │
├─────────────────────────────────┤
│ Hazardous Waste (Module 4)      │  ← Only if activated
│   Waste Streams                 │
│   Consignments                  │
│   Chain of Custody              │
│   Contractors                   │
└─────────────────────────────────┘
```

---

## Module System

EcoComply uses a modular subscription system. Modules can be activated per company and determine which features are available.

### Module Overview

| Module | ID | Name | Always Active? | Description |
|--------|-----|------|----------------|-------------|
| Module 1 | `MODULE_1` | Environmental Permits | **Yes** | Core permit management, obligations, evidence |
| Module 2 | `MODULE_2` | Trade Effluent | No | Water discharge consent management |
| Module 3 | `MODULE_3` | Generators | No | MCPD generator compliance tracking |
| Module 4 | `MODULE_4` | Hazardous Waste | No | Hazardous waste chain-of-custody |

### How Module Activation Works

```typescript
// Modules are checked using the useModuleActivation hook
const { data: isModule2Active } = useModuleActivation('MODULE_2');
const { data: isModule3Active } = useModuleActivation('MODULE_3');
const { data: isModule4Active } = useModuleActivation('MODULE_4');

// Navigation sections render conditionally
{isModule2Active && <Module2Navigation />}
{isModule3Active && <Module3Navigation />}
{isModule4Active && <Module4Navigation />}
```

### Module Impact on UI

| UI Element | Module 1 | Module 2 | Module 3 | Module 4 |
|------------|----------|----------|----------|----------|
| Sidebar sections | Always | If active | If active | If active |
| Site dashboard tabs | Always | If active | If active | If active |
| Site dashboard cards | Always | If active | If active | If active |
| Quick actions | Always | If active | If active | If active |

---

## Complete Page Hierarchy

### Global Pages

```
/dashboard                          → Portfolio Dashboard (home)
/dashboard/sites                    → Sites List
/dashboard/sites/new                → Create New Site
/dashboard/deadlines                → Cross-Site Deadlines Hub
/dashboard/compliance               → EA Compliance Overview
/dashboard/packs                    → Audit Pack Management
/dashboard/evidence                 → Global Evidence Repository
/dashboard/evidence/upload          → Upload Evidence
/dashboard/evidence/expiring        → Expiring Evidence
/dashboard/search                   → Global Search
/dashboard/reports                  → Reports Generation
/dashboard/review-queue             → Review Queue (AI extractions)
/dashboard/settings                 → Account Settings
/dashboard/settings/notifications   → Notification Preferences
/dashboard/help                     → Help Center
/dashboard/profile                  → User Profile
/dashboard/users                    → User Management (admin)
/dashboard/companies                → Company Management (admin)
/dashboard/company                  → Company Settings
/dashboard/modules                  → Module Management
/dashboard/notifications            → Notification Center
/dashboard/compliance-clocks        → Compliance Clock Tracking
/dashboard/recurrence-trigger-rules → Recurrence Rule Management
/dashboard/recurrence-events        → Recurrence Events
/dashboard/escalation-workflows     → Escalation Workflow Config
/dashboard/pack-sharing             → Pack Sharing Management
```

### Consultant-Specific Pages

```
/dashboard/consultant                           → Consultant Dashboard
/dashboard/consultant/clients                   → Client List
/dashboard/consultant/clients/{clientId}        → Client Detail
/dashboard/consultant/clients/{clientId}/packs  → Client Packs
/dashboard/consultant/packs                     → All Client Packs
```

### Admin Pages

```
/dashboard/admin/jobs              → Background Job Monitor
/dashboard/admin/jobs/{jobId}      → Job Detail
```

### Site-Level Pages

#### Core Site Pages
```
/dashboard/sites/{siteId}/dashboard    → Site Dashboard (overview)
/dashboard/sites/{siteId}/settings     → Site Settings
/dashboard/sites/{siteId}/deadlines    → Site Deadlines
/dashboard/sites/{siteId}/deadlines/upcoming → Upcoming Deadlines
/dashboard/sites/{siteId}/deadlines/{deadlineId} → Deadline Detail
/dashboard/sites/{siteId}/review-queue → Site Review Queue
/dashboard/sites/{siteId}/packs        → Site Audit Packs
/dashboard/sites/{siteId}/packs/generate → Generate Pack
/dashboard/sites/{siteId}/packs/{packId} → Pack Detail
/dashboard/sites/{siteId}/packs/{packId}/distribute → Distribute Pack
/dashboard/sites/{siteId}/audit-packs  → Audit Packs (alternate path)
/dashboard/sites/{siteId}/audit-packs/{auditPackId} → Audit Pack Detail
```

#### Module 1: Environmental Permits (Always Available)
```
/dashboard/sites/{siteId}/permits/documents             → Permit Documents List
/dashboard/sites/{siteId}/permits/obligations           → Obligations List
/dashboard/sites/{siteId}/permits/evidence              → Evidence List

/dashboard/sites/{siteId}/documents/{documentId}/extraction       → Document Extraction
/dashboard/sites/{siteId}/documents/{documentId}/review           → Document Review
/dashboard/sites/{siteId}/documents/{documentId}/obligations      → Document Obligations
/dashboard/sites/{siteId}/documents/{documentId}/versions         → Document Versions
/dashboard/sites/{siteId}/documents/{documentId}/versions/{versionId}/impact → Version Impact
/dashboard/sites/{siteId}/documents/{documentId}/workflows        → Document Workflows
/dashboard/sites/{siteId}/documents/{documentId}/workflows/{workflowId} → Workflow Detail
/dashboard/sites/{siteId}/documents/{documentId}/workflows/{workflowId}/variation → Variation
/dashboard/sites/{siteId}/documents/{documentId}/workflows/{workflowId}/surrender → Surrender

/dashboard/sites/{siteId}/obligations/{obligationId}/schedule     → Obligation Schedule
/dashboard/sites/{siteId}/obligations/{obligationId}/evidence/upload → Upload Evidence
/dashboard/sites/{siteId}/obligations/{obligationId}/evidence-rules → Evidence Rules
/dashboard/sites/{siteId}/obligations/{obligationId}/recurrence-triggers → Recurrence Triggers
/dashboard/sites/{siteId}/obligations/{obligationId}/recurrence-triggers/{triggerId} → Trigger Detail

/dashboard/sites/{siteId}/evidence/{evidenceId}     → Evidence Detail
/dashboard/sites/{siteId}/evidence/unlinked         → Unlinked Evidence

/dashboard/sites/{siteId}/schedules              → Schedules List
/dashboard/sites/{siteId}/schedules/new          → New Schedule
/dashboard/sites/{siteId}/schedules/{scheduleId} → Schedule Detail
/dashboard/sites/{siteId}/schedules/{scheduleId}/edit → Edit Schedule
```

#### EA Compliance (Always Available)
```
/dashboard/sites/{siteId}/compliance/ccs   → CCS Assessment
/dashboard/sites/{siteId}/compliance/elv   → ELV Conditions
/dashboard/sites/{siteId}/compliance/capa  → CAPA Tracker
```

#### Module Management
```
/dashboard/sites/{siteId}/modules/{moduleId}/deactivate → Deactivate Module
```

#### Regulator Questions
```
/dashboard/sites/{siteId}/regulator-questions          → Questions List
/dashboard/sites/{siteId}/regulator-questions/new      → New Question
/dashboard/sites/{siteId}/regulator-questions/{questionId} → Question Detail
```

#### Module 2: Trade Effluent (If Activated)
```
/dashboard/sites/{siteId}/module-2/consents             → Consents List
/dashboard/sites/{siteId}/module-2/consents/upload      → Upload Consent
/dashboard/sites/{siteId}/module-2/consents/{consentId} → Consent Detail

/dashboard/sites/{siteId}/module-2/parameters              → Parameters List
/dashboard/sites/{siteId}/module-2/parameters/{parameterId} → Parameter Detail

/dashboard/sites/{siteId}/module-2/lab-results         → Lab Results List
/dashboard/sites/{siteId}/module-2/lab-results/new     → New Lab Result
/dashboard/sites/{siteId}/module-2/lab-results/import  → Import Lab Results
/dashboard/sites/{siteId}/module-2/lab-results/{resultId} → Lab Result Detail

/dashboard/sites/{siteId}/module-2/exceedances             → Exceedances List
/dashboard/sites/{siteId}/module-2/exceedances/{exceedanceId} → Exceedance Detail

/dashboard/sites/{siteId}/module-2/discharge-volumes       → Discharge Volumes
/dashboard/sites/{siteId}/module-2/discharge-volumes/new   → New Volume Record
/dashboard/sites/{siteId}/module-2/discharge-volumes/{volumeId} → Volume Detail
```

#### Module 2: Global Trade Effluent Pages
```
/dashboard/module-2/consent-states           → Consent States List
/dashboard/module-2/consent-states/new       → New Consent State
/dashboard/module-2/consent-states/{stateId} → Consent State Detail

/dashboard/module-2/sampling-logistics            → Sampling Logistics
/dashboard/module-2/sampling-logistics/new        → New Sampling Record
/dashboard/module-2/sampling-logistics/{recordId} → Sampling Detail
/dashboard/module-2/sampling-logistics/{recordId}/edit → Edit Sampling

/dashboard/module-2/monthly-statements              → Monthly Statements
/dashboard/module-2/monthly-statements/new          → New Statement
/dashboard/module-2/monthly-statements/{statementId} → Statement Detail
/dashboard/module-2/monthly-statements/{statementId}/edit → Edit Statement

/dashboard/module-2/corrective-actions           → Corrective Actions
/dashboard/module-2/corrective-actions/new       → New Action
/dashboard/module-2/corrective-actions/{actionId} → Action Detail
/dashboard/module-2/corrective-actions/{actionId}/edit → Edit Action
```

#### Module 3: Generators (If Activated)
```
/dashboard/sites/{siteId}/module-3/generators              → Generators List
/dashboard/sites/{siteId}/module-3/generators/{generatorId} → Generator Detail

/dashboard/sites/{siteId}/module-3/run-hours      → Run Hours Log
/dashboard/sites/{siteId}/module-3/run-hours/new  → Log Run Hours

/dashboard/sites/{siteId}/module-3/stack-tests     → Stack Tests List
/dashboard/sites/{siteId}/module-3/stack-tests/new → New Stack Test

/dashboard/sites/{siteId}/module-3/maintenance-records     → Maintenance Records
/dashboard/sites/{siteId}/module-3/maintenance-records/new → New Maintenance Record

/dashboard/sites/{siteId}/module-3/registrations                  → MCPD Registrations
/dashboard/sites/{siteId}/module-3/registrations/upload           → Upload Registration
/dashboard/sites/{siteId}/module-3/registrations/{registrationId} → Registration Detail

/dashboard/sites/{siteId}/module-3/aer           → AER Reports List
/dashboard/sites/{siteId}/module-3/aer/generate  → Generate AER
/dashboard/sites/{siteId}/module-3/aer/{aerId}   → AER Detail
```

#### Module 3: Global Generator Pages
```
/dashboard/module-3/regulation-thresholds               → Regulation Thresholds
/dashboard/module-3/regulation-thresholds/new           → New Threshold
/dashboard/module-3/regulation-thresholds/{thresholdId} → Threshold Detail
/dashboard/module-3/regulation-thresholds/{thresholdId}/edit → Edit Threshold

/dashboard/module-3/runtime-monitoring              → Runtime Monitoring
/dashboard/module-3/runtime-monitoring/new          → New Monitoring Record
/dashboard/module-3/runtime-monitoring/{recordId}   → Monitoring Detail
/dashboard/module-3/runtime-monitoring/{recordId}/edit → Edit Monitoring

/dashboard/module-3/exemptions                → Generator Exemptions
/dashboard/module-3/exemptions/new            → New Exemption
/dashboard/module-3/exemptions/{exemptionId}  → Exemption Detail
/dashboard/module-3/exemptions/{exemptionId}/edit → Edit Exemption
```

#### Module 4: Hazardous Waste (If Activated)
```
/dashboard/sites/{siteId}/hazardous-waste/waste-streams   → Waste Streams List
/dashboard/sites/{siteId}/hazardous-waste/consignments    → Consignment Notes
/dashboard/sites/{siteId}/hazardous-waste/chain-of-custody → Chain of Custody
/dashboard/sites/{siteId}/hazardous-waste/contractors     → Waste Contractors
/dashboard/sites/{siteId}/hazardous-waste/validation-rules/{ruleId}/executions → Rule Executions
```

#### Module 4: Global Hazardous Waste Pages
```
/dashboard/module-4/waste-streams              → Waste Streams Config
/dashboard/module-4/waste-streams/new          → New Waste Stream
/dashboard/module-4/waste-streams/{streamId}   → Stream Detail
/dashboard/module-4/waste-streams/{streamId}/edit → Edit Stream

/dashboard/module-4/consignment-notes           → Consignment Notes
/dashboard/module-4/consignment-notes/new       → New Consignment
/dashboard/module-4/consignment-notes/{noteId}  → Consignment Detail
/dashboard/module-4/consignment-notes/{noteId}/edit → Edit Consignment

/dashboard/module-4/validation-rules            → Validation Rules
/dashboard/module-4/validation-rules/new        → New Rule
/dashboard/module-4/validation-rules/{ruleId}   → Rule Detail
/dashboard/module-4/validation-rules/{ruleId}/edit → Edit Rule

/dashboard/module-4/contractor-licences              → Contractor Licences
/dashboard/module-4/contractor-licences/new          → New Licence
/dashboard/module-4/contractor-licences/{licenceId}  → Licence Detail
/dashboard/module-4/contractor-licences/{licenceId}/edit → Edit Licence

/dashboard/module-4/end-point-proofs            → End Point Proofs
/dashboard/module-4/end-point-proofs/new        → New Proof
/dashboard/module-4/end-point-proofs/{proofId}  → Proof Detail
/dashboard/module-4/end-point-proofs/{proofId}/edit → Edit Proof

/dashboard/module-4/chain-break-alerts → Chain Break Alerts
```

---

## Screen Descriptions

### Global Screens

#### Portfolio Dashboard (`/dashboard`)
**Purpose**: Executive overview of company-wide compliance status

**Displays**:
- Overall compliance score (aggregate across all sites)
- Deadline status breakdown (Overdue / Due Soon / On Track)
- Sites requiring attention (sites below threshold)
- Site health overview with traffic-light indicators
- All sites grid (max 6, with "View All" link)
- Upcoming deadlines list (5 most urgent)
- Recent activity feed

**Actions**: Add site, View all sites, View all deadlines

---

#### Sites List (`/dashboard/sites`)
**Purpose**: Central hub for multi-site management

**Displays**:
- Summary stats: Total sites, Compliant, At-Risk, Non-Compliant, Overdue items
- Table with columns:
  - Site name & location
  - Compliance score (with progress bar)
  - Overdue count
  - Upcoming count
  - Active module badges (M1, M2, M3, M4)

**Actions**: Add site, Click row to navigate to site dashboard

---

#### Deadlines Hub (`/dashboard/deadlines`)
**Purpose**: Cross-site deadline tracking and management

**Displays**:
- Stat cards: Overdue, This Week, This Month, Total
- Filter tabs: All, Overdue, This Week, This Month
- Filter dropdowns: By Site, By Module
- Grouped deadline list:
  - **Overdue section** (red highlighting)
  - **This Week section** (yellow highlighting)
  - **Upcoming section** (neutral)
- Each deadline shows: Title, Site name, Days remaining, Due date

**Actions**: Filter, Export calendar, Navigate to obligation detail

---

#### Evidence Hub (`/dashboard/evidence`)
**Purpose**: Central evidence repository with search and management

**Displays**:
- Search bar with filters
- View mode toggle (Grid / List)
- Grid view: Evidence cards with preview thumbnails
- List view: Table with preview, filename, type, size, date
- Evidence metadata: Description, file size, upload date

**Actions**: Upload evidence, Search, Filter, View detail, Link to obligation

---

#### Audit Packs (`/dashboard/packs`)
**Purpose**: Generate and manage regulatory/audit packs

**Displays**:
- Header with "Generate Pack" button
- Packs table (or empty state):
  - Pack type
  - Date range
  - Status (Pending / Generating / Completed / Failed)
  - Generation date
  - Actions

**Pack Types**:
| Pack Type | Description | Site Required? | Role Restriction |
|-----------|-------------|----------------|------------------|
| Regulator | For regulatory submission | Yes | - |
| Audit | For external audits | Yes | - |
| Tender | For tender responses | Yes | - |
| Board | Multi-site executive summary | No | Owner/Admin only |
| Insurer | For insurance renewals | Yes | - |

**Actions**: Generate pack, Download, Share, View contents

---

#### Settings (`/dashboard/settings`)
**Purpose**: Account and application configuration

**Tabs**:
- **General**: Account & security settings
- **Calendar**: iCal integration settings
- **Webhooks**: Webhook configuration
- **Notifications**: Link to notification preferences

---

### Site-Level Screens

#### Site Dashboard (`/dashboard/sites/{siteId}/dashboard`)
**Purpose**: Single site command center

**Displays**:
- Site header (name, address, settings link)
- Module-specific tabs (based on activations)
- Compliance score card
- Deadline status breakdown (Overdue / Due Soon / On Track)
- Quick action cards:
  - View Evidence
  - Generate Pack
  - Upload Document
- Module status cards (metrics for each active module)
- Upcoming deadlines timeline

**Actions**: Navigate to modules, Upload evidence, Generate packs, Configure settings

---

#### Permit Documents (`/dashboard/sites/{siteId}/permits/documents`)
**Purpose**: Manage environmental permit documents

**Displays**:
- Document table:
  - File icon, Title
  - Extraction status badge
  - Document type
  - Status badge
  - Upload date
  - Uploader
- Search/filter bar (by type, status)
- Empty state with upload CTA

**Actions**: Upload document, View document, Trigger extraction

---

#### Obligations List (`/dashboard/sites/{siteId}/permits/obligations`)
**Purpose**: Track regulatory obligations extracted from permits

**Displays**:
- Stats row: Total, Completed, Due Soon, Overdue
- Filter bar: Status, Category
- Obligation list:
  - Title & description
  - Category badge
  - Status badge (Completed / Pending / Overdue / Due Soon)
  - Due date
  - Evidence count
- Empty state with upload CTA

**Actions**: Search, Filter, Navigate to obligation detail

---

#### Obligation Detail (`/dashboard/obligations/{obligationId}`)
**Purpose**: Full obligation management view

**Displays**:
- Obligation header (title, permit reference)
- Status and due date
- Description and requirements
- Evidence section (linked evidence)
- Deadline timeline
- Action history

**Actions**: Link evidence, Mark complete, Mark N/A, Edit schedule

---

### Module-Specific Screens

#### Module 2: Consents (`/dashboard/sites/{siteId}/module-2/consents`)
**Purpose**: Trade effluent consent document management

**Displays**:
- Header with upload button
- Search bar
- Consent list:
  - File icon, Title
  - Status badge (Active / Expired)
  - Extraction status
  - Reference number
  - Upload date

**Actions**: Upload consent, View details

---

#### Module 3: Generators (`/dashboard/sites/{siteId}/module-3/generators`)
**Purpose**: Generator compliance monitoring

**Displays**:
- Header with upload registration button
- Generator cards:
  - Generator ID & status
  - Type, capacity (MW)
  - Annual/monthly run hours
  - Usage percentage (circular progress)
  - Warning alerts (approaching limits)
- Empty state with upload registration CTA

**Actions**: Upload registration, View generator detail

---

#### Module 4: Waste Streams (`/dashboard/sites/{siteId}/hazardous-waste/waste-streams`)
**Purpose**: Hazardous waste stream management

**Displays**:
- Waste stream list
- Stream details (EWC codes, descriptions)
- Associated contractors

**Actions**: Add waste stream, View details, Manage contractors

---

## User Flows

### Flow 1: First-Time Setup

```
Login
  ↓
Portfolio Dashboard (empty state)
  ↓
Click "Add Site"
  ↓
Site Creation Form
  ↓
Site Dashboard (new site)
  ↓
Click "Upload Document"
  ↓
Upload Permit Document
  ↓
AI Extracts Obligations (automatic)
  ↓
Review Queue → Confirm Extractions
  ↓
Obligations List (populated)
  ↓
Link Evidence → Monitor Deadlines
```

### Flow 2: Ongoing Compliance Management

```
Portfolio Dashboard
  ├─ Check compliance score
  ├─ Review "Sites Requiring Attention"
  └─ Click site with issues
       ↓
Site Dashboard
  ├─ View overdue/due soon counts
  └─ Click overdue card
       ↓
Obligations List (filtered: overdue)
  └─ Click obligation
       ↓
Obligation Detail
  ├─ Upload/link evidence
  ├─ Mark as complete
  └─ Return to list
```

### Flow 3: Deadline Management

```
Deadlines Hub (/dashboard/deadlines)
  ├─ Filter by "Overdue"
  └─ Click deadline
       ↓
Obligation Detail
  ├─ Review requirements
  ├─ Link evidence
  └─ Mark complete
       ↓
Deadline moves to "Completed"
```

### Flow 4: Pack Generation

```
Audit Packs (/dashboard/packs)
  └─ Click "Generate Pack"
       ↓
Select Pack Type
  ↓
Select Site (if not Board pack)
  ↓
Select Date Range (optional)
  ↓
Submit
  ↓
Background Generation (polling)
  ↓
Pack Status: Completed
  └─ Download / Share
```

### Flow 5: Consultant Multi-Client Flow

```
Consultant Dashboard (/dashboard/consultant)
  ├─ View client summary stats
  └─ Click "Clients"
       ↓
Clients List
  └─ Click client
       ↓
Client Detail
  └─ Click client site
       ↓
Site Dashboard (full access as company user)
```

### Flow 6: Module-Specific Workflow (Trade Effluent)

```
Site Dashboard
  └─ Click "Trade Effluent" tab
       ↓
Consents List
  └─ Upload consent document
       ↓
AI Extraction → Parameters extracted
       ↓
Parameters List
  └─ Review discharge limits
       ↓
Lab Results
  └─ Import lab test results
       ↓
Exceedances (if any)
  └─ Review and create CAPA
```

---

## Conditional Rendering Rules

### Navigation Visibility

| Condition | What Changes |
|-----------|--------------|
| User role = CONSULTANT | Different global nav items, different packs path |
| Currently on site page | Site-level navigation sections appear |
| Module 2 activated | Trade Effluent section in sidebar |
| Module 3 activated | Generators section in sidebar |
| Module 4 activated | Hazardous Waste section in sidebar |
| Sidebar collapsed | Labels hidden, tooltips on hover |

### Site Dashboard

| Condition | What Shows |
|-----------|-----------|
| Module 2 active | Trade Effluent tab, Trade Effluent status card |
| Module 3 active | Generators tab, Generators status card |
| Module 4 active | Hazardous Waste tab, Hazardous Waste status card |
| No deadlines | Empty state for upcoming deadlines |
| Overdue > 0 | Red-highlighted overdue card |

### Pack Generation

| Condition | What's Available |
|-----------|-----------------|
| Subscription tier | Filters available pack types |
| User role = OWNER or ADMIN | Board pack type enabled |
| Pack type ≠ Board | Site selection required |

### Data Display States

```typescript
// Loading state
{isLoading && <Skeleton components />}

// Empty state
{data.length === 0 && <EmptyState with CTA />}

// Error state
{error && <ErrorCard with Refresh button />}

// Data loaded
{data && <DataDisplay />}
```

### Status-Based Styling

| Entity | Status | Visual Indicator |
|--------|--------|------------------|
| Compliance Score | Compliant | Green badge/progress |
| Compliance Score | At-Risk | Yellow badge/progress |
| Compliance Score | Non-Compliant | Red badge/progress |
| Deadline | Overdue | Red text, danger badge |
| Deadline | Due Soon | Yellow text, warning badge |
| Deadline | On Track | Gray text, neutral badge |
| Obligation | Completed | Green checkmark |
| Obligation | Pending | Gray clock |
| Document | Extraction Failed | Red error badge |

---

## Page Linking & Connections

### From Portfolio Dashboard

```
/dashboard
  ├─→ "View all sites" → /dashboard/sites
  ├─→ "View all deadlines" → /dashboard/deadlines
  ├─→ Site card click → /dashboard/sites/{siteId}/dashboard
  ├─→ Deadline click → /dashboard/obligations/{obligationId}
  └─→ "Add Site" button → /dashboard/sites/new
```

### From Sites List

```
/dashboard/sites
  ├─→ Site row click → /dashboard/sites/{siteId}/dashboard
  └─→ "Add Site" button → /dashboard/sites/new
```

### From Site Dashboard

```
/dashboard/sites/{siteId}/dashboard
  ├─→ Module tabs → Module landing pages
  ├─→ "View Evidence" → /dashboard/sites/{siteId}/permits/evidence
  ├─→ "Generate Pack" → /dashboard/sites/{siteId}/packs/generate
  ├─→ "Settings" → /dashboard/sites/{siteId}/settings
  ├─→ Overdue card → /dashboard/sites/{siteId}/permits/obligations?status=OVERDUE
  ├─→ Due Soon card → /dashboard/sites/{siteId}/permits/obligations?status=DUE_SOON
  └─→ Deadline click → /dashboard/obligations/{obligationId}
```

### From Documents List

```
/dashboard/sites/{siteId}/permits/documents
  ├─→ "Upload Document" → /dashboard/documents/upload?siteId={siteId}
  └─→ Document row → /dashboard/sites/{siteId}/documents/{documentId}/extraction
```

### From Obligations List

```
/dashboard/sites/{siteId}/permits/obligations
  ├─→ "Upload Permit" → /dashboard/sites/{siteId}/permits/documents
  └─→ Obligation row → /dashboard/obligations/{obligationId}
```

### From Obligation Detail

```
/dashboard/obligations/{obligationId}
  ├─→ "Link Evidence" → Evidence linking modal
  ├─→ "Upload Evidence" → Evidence upload modal
  ├─→ "View Schedule" → /dashboard/sites/{siteId}/obligations/{obligationId}/schedule
  └─→ Evidence item click → /dashboard/evidence/{evidenceId}
```

### Breadcrumb Trail Pattern

```
Dashboard → Sites → {Site Name} → Permits → Documents → {Document Name}
Dashboard → Sites → {Site Name} → Module 2 → Lab Results → New
Dashboard → Deadlines → [Filtered View]
```

---

## Layout & Components

### Dashboard Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│                         Header                              │
│  [Mobile Menu] [Logo]              [Search] [Notifications] │
├─────────────────────────────────────────────────────────────┤
│        │                                                    │
│        │                                                    │
│        │                                                    │
│ Sidebar│              Main Content Area                     │
│ (hidden│                                                    │
│  on    │                                                    │
│ mobile)│                                                    │
│        │                                                    │
│        │                                                    │
├────────┴────────────────────────────────────────────────────┤
│              Mobile Bottom Navigation (mobile only)          │
└─────────────────────────────────────────────────────────────┘
```

### Sidebar States

| State | Width | Labels | Behavior |
|-------|-------|--------|----------|
| Expanded | 256px | Visible | Full navigation text |
| Collapsed | 64px | Hidden | Icons only, tooltips on hover |
| Mobile | 0px (hidden) | N/A | Drawer overlay when triggered |

### Common Page Patterns

**List Page**:
```
1. Page Header (title, description, primary action button)
2. Stats Row (summary cards)
3. Filter Bar (search, dropdowns, clear button)
4. Data Table or Grid
5. Pagination (if applicable)
6. Empty State (if no data)
```

**Detail Page**:
```
1. Breadcrumbs
2. Page Header (title, status badge, action buttons)
3. Content Sections (cards or tabs)
4. Related Items (linked entities)
5. Action History / Timeline
```

**Form Page**:
```
1. Breadcrumbs
2. Page Header (title)
3. Form Fields (grouped in sections)
4. Action Buttons (Save, Cancel)
5. Validation Messages
```

### Responsive Breakpoints

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | < 768px | Sidebar hidden, bottom nav shows, single column |
| Tablet | 768px - 1024px | Sidebar collapsible, 2-column grids |
| Desktop | > 1024px | Full sidebar, multi-column layouts |

---

## Summary

EcoComply's frontend is organized as a hierarchical, module-aware, role-sensitive application:

1. **Two navigation modes**: Company user vs Consultant
2. **Context-aware sidebar**: Global nav + site-specific nav when on site pages
3. **Four modules**: Module 1 always on; Modules 2, 3, 4 conditional
4. **Consistent patterns**: List pages, detail pages, forms follow standard layouts
5. **Status-driven UI**: Color coding and badges reflect compliance/deadline status
6. **Responsive design**: Adapts from mobile to desktop with sidebar collapsing

The structure enables users to:
- Get portfolio-wide visibility from the dashboard
- Drill down into specific sites
- Access module-specific features when activated
- Track and manage compliance deadlines
- Generate audit packs for regulators and stakeholders
