# UX Improvement Recommendations

This document outlines specific recommendations to improve EcoComply's UI/UX from the current 6/10 to closer to 10/10.

---

## Current Scores & Targets

| Category | Current | Target | Gap |
|----------|---------|--------|-----|
| Information Architecture | 5/10 | 9/10 | Flatten hierarchy, reduce pages |
| Navigation | 6/10 | 9/10 | Quick actions, smart defaults |
| Route Design | 4/10 | 9/10 | Consolidate to ~20 core routes |
| Task Efficiency | 5/10 | 9/10 | 3 clicks max for core tasks |
| Cognitive Load | 5/10 | 9/10 | Progressive disclosure |
| Visual Design | 7/10 | 9/10 | Polish, animations, delight |

---

## 1. Information Architecture (5 → 9)

### Problem
- 150+ routes creating a maze
- 7 levels deep in some paths
- Users lose context and orientation

### Solution: Flatten to 3 Levels Max

**Current (Bad)**
```
/dashboard/sites/{siteId}/documents/{documentId}/workflows/{workflowId}/variation
```

**Proposed (Good)**
```
/sites/{siteId}/documents → Modal opens for document detail
                         → Tab within modal for workflows
                         → Inline action for variation
```

### Recommended Route Structure

```
LEVEL 1: Global Views
├── /                           → Redirect to /dashboard
├── /dashboard                  → Portfolio overview
├── /sites                      → All sites list
├── /deadlines                  → Global deadlines
├── /evidence                   → Global evidence library
├── /packs                      → Pack management
├── /search                     → Global search
└── /settings                   → All settings (tabbed)

LEVEL 2: Site Context
├── /sites/{id}                 → Site dashboard (tabbed by module)
├── /sites/{id}/obligations     → Obligations list + detail modal
├── /sites/{id}/documents       → Documents list + detail modal
├── /sites/{id}/evidence        → Evidence list + detail modal
└── /sites/{id}/deadlines       → Site deadlines

LEVEL 3: Deep Actions (Rare)
├── /sites/{id}/obligations/{obligationId}  → Full-page only if complex
└── /sites/{id}/settings                    → Site configuration
```

**Total: ~20 routes instead of 150+**

### Implementation Changes

| Current Approach | New Approach |
|------------------|--------------|
| Separate page for every entity | Modal/slide-over for detail views |
| Separate /new and /edit pages | Inline forms or modal forms |
| Nested routes for related data | Tabs within detail view |
| Multiple paths to same data | Single canonical path |

### Detail Views as Modals

```tsx
// Instead of navigating to /obligations/{id}
// Open a slide-over panel

<ObligationDetailPanel
  obligationId={selectedId}
  open={!!selectedId}
  onClose={() => setSelectedId(null)}
/>
```

**Benefits:**
- User never loses list context
- Back button works predictably
- Faster perceived performance
- Can open multiple items (compare mode)

---

## 2. Navigation (6 → 9)

### Problem
- 26 nav items visible when on site page
- No quick actions for power users
- No recent/favorites
- Site switching requires going back to list

### Solution A: Collapsible Nav Sections

```
┌─────────────────────────────┐
│ [Logo] EcoComply            │
├─────────────────────────────┤
│ ▼ Portfolio                 │  ← Collapsed by default when on site
│   Dashboard                 │
│   All Sites                 │
│   Deadlines                 │
├─────────────────────────────┤
│ ▼ Manchester Plant ✕        │  ← Current site, closeable
│   Overview                  │
│   Obligations (12)          │  ← Show counts
│   Documents (5)             │
│   Evidence (34)             │
│   ▶ Trade Effluent          │  ← Collapsed sub-section
│   ▶ Generators              │
├─────────────────────────────┤
│ + Add Site                  │
│ ⚙ Settings                  │
└─────────────────────────────┘
```

**Key Changes:**
1. Collapse sections not in use
2. Show item counts (12 obligations, 5 documents)
3. Add "close" button on site context to return to portfolio
4. Module sub-sections collapse until clicked

### Solution B: Command Palette (Cmd+K)

```
┌─────────────────────────────────────────────────┐
│ 🔍 Search or jump to...                         │
├─────────────────────────────────────────────────┤
│ RECENT                                          │
│   ↩ Manchester Plant - Obligations              │
│   ↩ London HQ - Evidence                        │
│   ↩ Pack: Q4 Regulatory Audit                   │
├─────────────────────────────────────────────────┤
│ QUICK ACTIONS                                   │
│   📄 Upload Document          ⌘⇧D               │
│   📎 Upload Evidence          ⌘⇧E               │
│   📦 Generate Pack            ⌘⇧P               │
├─────────────────────────────────────────────────┤
│ SITES                                           │
│   🏭 Manchester Plant                           │
│   🏢 London HQ                                  │
│   🏗 Birmingham Depot                           │
├─────────────────────────────────────────────────┤
│ PAGES                                           │
│   → Dashboard                                   │
│   → All Deadlines                               │
│   → Settings                                    │
└─────────────────────────────────────────────────┘
```

**Features:**
- Fuzzy search across everything
- Recent items for quick return
- Keyboard shortcuts for common actions
- Site switcher built-in
- Works from anywhere

### Solution C: Site Switcher in Header

```
┌────────────────────────────────────────────────────────────┐
│ [≡] [Logo]   [Manchester Plant ▼]   [🔍]  [🔔 3]  [👤]    │
└────────────────────────────────────────────────────────────┘
                      ↓
         ┌─────────────────────────┐
         │ ★ Manchester Plant   ✓  │  ← Current, favorited
         │   London HQ             │
         │   Birmingham Depot      │
         ├─────────────────────────┤
         │ ← Back to Portfolio     │
         │ + Add New Site          │
         └─────────────────────────┘
```

**Benefits:**
- Switch sites without leaving current page type
- Favoriting for quick access
- Always visible, always accessible

### Solution D: Smart Breadcrumbs

```
Dashboard / Sites / Manchester Plant / Obligations / OBL-2024-0042
                    └──────┬───────┘
                           ↓ Click to switch
              ┌─────────────────────────┐
              │ Recent Sites            │
              │   Manchester Plant   ✓  │
              │   London HQ             │
              │ ─────────────────────── │
              │ All Sites →             │
              └─────────────────────────┘
```

---

## 3. Route Design (4 → 9)

### Problem
- Inconsistent paths (`/packs` vs `/audit-packs`)
- Global AND site-level routes for same modules
- Deep nesting

### Solution: URL Redesign

#### Principle 1: One Canonical Path Per Resource

**Bad (Current)**
```
/dashboard/obligations/{id}           ← Global path
/dashboard/sites/{siteId}/permits/obligations/{id}  ← Site path
```

**Good (Proposed)**
```
/sites/{siteId}/obligations/{id}      ← Single source of truth
```

#### Principle 2: Module Routes Under Site Only

**Bad (Current)**
```
/dashboard/module-2/consent-states           ← Global module page?
/dashboard/sites/{siteId}/module-2/consents  ← Site module page?
```

**Good (Proposed)**
```
/sites/{siteId}/trade-effluent/consents      ← Clear, uses readable name
/settings/trade-effluent                     ← Global config only
```

#### Principle 3: Use Query Params for Filters, Not Routes

**Bad (Current)**
```
/dashboard/evidence/expiring          ← Separate route for filter
/dashboard/deadlines/upcoming         ← Separate route for filter
```

**Good (Proposed)**
```
/evidence?filter=expiring             ← Same page, filtered
/deadlines?range=upcoming             ← Same page, filtered
```

#### Principle 4: Actions via Query Params or State, Not Routes

**Bad (Current)**
```
/sites/{id}/packs/generate            ← Separate page for action
/sites/{id}/module-2/consents/upload  ← Separate page for upload
```

**Good (Proposed)**
```
/sites/{id}/packs?action=generate     ← Modal triggered by param
/sites/{id}/trade-effluent?action=upload-consent  ← Modal
```

#### Complete Proposed URL Structure

```
# Portfolio Level
/dashboard                        → Portfolio home
/sites                            → Sites list
/deadlines                        → All deadlines (?site=x&status=overdue)
/evidence                         → Evidence library (?site=x&type=photo)
/packs                            → All packs (?site=x&type=regulator)
/search                           → Global search (?q=emissions)
/notifications                    → Notification center

# Site Level
/sites/{id}                       → Site dashboard
/sites/{id}/obligations           → Obligations (?status=overdue&category=monitoring)
/sites/{id}/documents             → Documents (?type=permit&status=active)
/sites/{id}/evidence              → Site evidence
/sites/{id}/deadlines             → Site deadlines
/sites/{id}/settings              → Site settings

# Module Views (Tabs or Sections within /sites/{id})
/sites/{id}?module=trade-effluent        → Trade Effluent tab
/sites/{id}?module=generators            → Generators tab
/sites/{id}?module=hazardous-waste       → Hazardous Waste tab

# OR Dedicated Module Routes (if content is heavy)
/sites/{id}/trade-effluent        → Trade Effluent dashboard
/sites/{id}/trade-effluent/consents
/sites/{id}/trade-effluent/lab-results
/sites/{id}/generators
/sites/{id}/generators/run-hours
/sites/{id}/hazardous-waste
/sites/{id}/hazardous-waste/consignments

# Detail Views (Modal unless complex)
/sites/{id}/obligations/{obligationId}   → Full page for complex view
# Most others → Modal triggered by selection state

# Settings & Admin
/settings                         → Account settings (tabbed)
/settings/company                 → Company settings
/settings/users                   → User management
/settings/integrations            → Webhooks, calendar, etc.
/admin/jobs                       → Background jobs (admin only)
```

**Result: ~35 meaningful routes instead of 150+**

---

## 4. Task Efficiency (5 → 9)

### Problem
Core task takes 7+ clicks:
> Dashboard → Sites → Site → Obligations → Filter → Click → Detail → Upload Evidence → Mark Complete

### Solution: Reduce Core Tasks to 3 Clicks Max

#### Core Task 1: "Handle Overdue Items"

**Current Flow (7 clicks)**
```
1. Load Dashboard
2. Click "Sites" or site card
3. Click specific site
4. Click "Obligations"
5. Filter by "Overdue"
6. Click obligation
7. Upload evidence / Mark complete
```

**Optimized Flow (3 clicks)**
```
1. Dashboard shows overdue items directly (no navigation needed)
   ┌────────────────────────────────────────────┐
   │ 🔴 5 Overdue Items                         │
   ├────────────────────────────────────────────┤
   │ □ Quarterly emissions report               │
   │   Manchester Plant · Due 3 days ago        │
   │   [Upload Evidence] [Mark Complete] [...]  │ ← Inline actions
   ├────────────────────────────────────────────┤
   │ □ Noise monitoring submission              │
   │   London HQ · Due 1 day ago                │
   │   [Upload Evidence] [Mark Complete] [...]  │
   └────────────────────────────────────────────┘

2. Click [Upload Evidence] → Modal opens
3. Drop file → Auto-links → Done
```

**Implementation:**
```tsx
// Dashboard shows actionable items, not just stats
<OverdueItemsList>
  {overdueItems.map(item => (
    <OverdueItem key={item.id}>
      <Checkbox onClick={() => markComplete(item.id)} />
      <ItemDetails>{item.title}</ItemDetails>
      <SiteBadge>{item.site.name}</SiteBadge>
      <InlineActions>
        <Button onClick={() => openUploadModal(item.id)}>
          Upload Evidence
        </Button>
        <Button onClick={() => markComplete(item.id)}>
          Mark Complete
        </Button>
      </InlineActions>
    </OverdueItem>
  ))}
</OverdueItemsList>
```

#### Core Task 2: "Upload Evidence for Obligation"

**Current Flow (5+ clicks)**
```
1. Navigate to site
2. Go to obligations
3. Find obligation
4. Click to open detail
5. Click upload
6. Select file
7. Confirm
```

**Optimized Flow (2 clicks)**
```
1. Drag file anywhere on the app
   → Smart upload modal appears
   → AI suggests which obligation(s) to link

2. Confirm suggestion or search/select
   → Done
```

**Implementation:**
```tsx
// Global drop zone
<GlobalDropZone onDrop={handleGlobalDrop}>
  {children}
</GlobalDropZone>

// Smart upload modal
<SmartUploadModal file={droppedFile}>
  <p>We detected this might be evidence for:</p>
  <SuggestedObligation confidence={0.92}>
    Quarterly emissions monitoring - Manchester Plant
    <Button>Link Here</Button>
  </SuggestedObligation>
  <p>Or search for a different obligation:</p>
  <ObligationSearch onSelect={linkEvidence} />
</SmartUploadModal>
```

#### Core Task 3: "Check Site Compliance Status"

**Current Flow (4 clicks)**
```
1. Dashboard
2. Sites list
3. Click site
4. View dashboard
```

**Optimized Flow (1 click)**
```
1. Dashboard shows all sites with expandable detail
   ┌──────────────────────────────────────────────────┐
   │ Sites                                     [+ Add]│
   ├──────────────────────────────────────────────────┤
   │ ▶ Manchester Plant    🟢 92%   2 due   0 overdue │
   │ ▼ London HQ           🟡 78%   5 due   2 overdue │
   │   ├─ Obligations: 45 total, 2 overdue           │
   │   ├─ Upcoming: Noise assessment (3 days)        │
   │   ├─ [View Site] [Upload Evidence] [Generate Pack]│
   │   └─────────────────────────────────────────────│
   │ ▶ Birmingham Depot    🟢 95%   1 due   0 overdue │
   └──────────────────────────────────────────────────┘
```

#### Core Task 4: "Generate Regulatory Pack"

**Current Flow (6+ clicks)**
```
1. Navigate to Packs
2. Click Generate
3. Select type
4. Select site
5. Select date range
6. Select documents
7. Confirm
```

**Optimized Flow (3 clicks)**
```
1. From anywhere: Cmd+K → "Generate pack" OR right-click site
2. Smart wizard with defaults:
   ┌────────────────────────────────────────────────┐
   │ Generate Pack                                  │
   ├────────────────────────────────────────────────┤
   │ Type: [Regulator Pack ▼]                       │
   │ Site: [Manchester Plant ▼] ← Auto-selected if on site
   │ Period: [Last 12 months ▼] ← Smart default     │
   │                                                │
   │ ✓ Include all completed obligations            │
   │ ✓ Include linked evidence                      │
   │ □ Include pending items                        │
   │                                                │
   │ [Cancel]                    [Generate Pack →]  │
   └────────────────────────────────────────────────┘
3. Click Generate → Background job → Notification when ready
```

### Task Efficiency Summary

| Task | Current Clicks | Target Clicks | Solution |
|------|----------------|---------------|----------|
| Handle overdue item | 7 | 2-3 | Inline actions on dashboard |
| Upload evidence | 5+ | 2 | Global drag-drop + AI linking |
| Check site status | 4 | 1 | Expandable site cards |
| Generate pack | 6+ | 3 | Smart wizard with defaults |
| Switch sites | 3-4 | 1 | Site switcher in header |
| Find obligation | 4-5 | 1 | Cmd+K search |

---

## 5. Cognitive Load (5 → 9)

### Problem
- 26 nav items visible at once
- 150+ pages to understand
- Module terminology inconsistent
- No progressive disclosure

### Solution A: Progressive Disclosure

**Principle: Show only what's needed for the current task**

```
Level 1: Dashboard
- Shows summary stats and actionable items
- No module complexity visible
- Clear paths: "You have 5 overdue items"

Level 2: Site Dashboard
- Shows site-specific overview
- Module tabs only appear if activated
- Hides module internals until clicked

Level 3: Module Detail
- Only reached when user explicitly needs it
- Full complexity available but hidden by default
```

### Solution B: Smart Defaults

**Don't make users choose when there's an obvious answer**

| Scenario | Current | Smart Default |
|----------|---------|---------------|
| Generate pack for single site | User must select site | Pre-select current site |
| Upload evidence | User must find obligation | AI suggests based on filename/content |
| Create deadline | User enters all fields | Default to 30 days, suggest recurrence |
| Filter obligations | Shows all | Default to "Active" (hide completed) |

### Solution C: Contextual Actions

**Show actions relevant to current context only**

```tsx
// Bad: Generic button bar everywhere
<ButtonBar>
  <Button>Upload Document</Button>
  <Button>Upload Evidence</Button>
  <Button>Generate Pack</Button>
  <Button>Add Obligation</Button>
  <Button>Create Schedule</Button>
</ButtonBar>

// Good: Context-aware actions
<ContextualActions context={currentPage}>
  {context === 'obligations' && (
    <>
      <PrimaryAction>Upload Evidence</PrimaryAction>
      <SecondaryAction>Mark Complete</SecondaryAction>
    </>
  )}
  {context === 'documents' && (
    <>
      <PrimaryAction>Upload Document</PrimaryAction>
      <SecondaryAction>Re-extract</SecondaryAction>
    </>
  )}
</ContextualActions>
```

### Solution D: Unified Terminology

| Current (Confusing) | Proposed (Clear) |
|---------------------|------------------|
| Module 2 | Trade Effluent |
| Module 3 | Generator Compliance |
| Module 4 | Hazardous Waste |
| `/module-2/` | `/trade-effluent/` |
| Audit Packs / Packs | Compliance Packs |
| Consents (M2) vs Documents (M1) | Both called "Documents" with type filter |

### Solution E: Reduce Visible Options

**Current Sidebar (26 items possible)**
```
Dashboard
Sites
Deadlines
Compliance
Audit Packs
─────────
Site Name
  Overview
  Documents
  Obligations
  Evidence
─────────
EA Compliance
  CCS Assessment
  ELV Conditions
  CAPA Tracker
─────────
Trade Effluent
  Consents
  Parameters
  Lab Results
  Exceedances
─────────
Generators
  Generators
  Run Hours
  Stack Tests
  AER Report
─────────
Hazardous Waste
  Waste Streams
  Consignments
  Chain of Custody
  Contractors
─────────
Settings
Help
```

**Proposed Sidebar (8-12 items visible)**
```
Dashboard
Sites
Deadlines
Packs
─────────
Manchester Plant          ← Only if on site
  Overview
  Obligations (12)
  Documents (5)
  Evidence (34)
  ▶ Modules               ← Collapsed, expands on click
─────────
Settings
```

When "Modules" is expanded:
```
  ▼ Modules
    Trade Effluent
    Generators
    Hazardous Waste
    EA Compliance
```

---

## 6. Visual Design (7 → 9)

### Problem
- No documented loading states
- No micro-interactions
- No visual feedback for actions
- No delight moments

### Solution A: Loading States

```tsx
// Skeleton loading for lists
<ObligationListSkeleton>
  {[1,2,3,4,5].map(i => (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-700 rounded w-3/4 mb-2" />
      <div className="h-3 bg-gray-700 rounded w-1/2" />
    </div>
  ))}
</ObligationListSkeleton>

// Optimistic updates
const markComplete = (id) => {
  // Immediately update UI
  setObligations(prev =>
    prev.map(o => o.id === id ? {...o, status: 'COMPLETED'} : o)
  );
  // Then sync with server
  api.markComplete(id).catch(() => {
    // Revert on error
    setObligations(prev =>
      prev.map(o => o.id === id ? {...o, status: 'PENDING'} : o)
    );
    toast.error('Failed to update. Please try again.');
  });
};
```

### Solution B: Micro-Interactions

```tsx
// Checkbox with satisfying animation
<motion.div
  initial={{ scale: 1 }}
  animate={{ scale: isChecked ? [1, 1.2, 1] : 1 }}
  transition={{ duration: 0.2 }}
>
  <Checkbox checked={isChecked} onChange={handleCheck} />
</motion.div>

// Card hover effects
<motion.div
  whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
  transition={{ duration: 0.15 }}
>
  <SiteCard />
</motion.div>

// Success confetti for completing all overdue items
{overdueCount === 0 && previousOverdue > 0 && (
  <Confetti recycle={false} numberOfPieces={100} />
)}
```

### Solution C: Visual Feedback

```tsx
// Toast notifications with actions
toast.success(
  <div>
    <p>Marked as complete</p>
    <Button variant="link" onClick={undo}>Undo</Button>
  </div>,
  { duration: 5000 }
);

// Inline validation
<Input
  error={errors.dueDate}
  success={isValid}
  helperText={errors.dueDate || 'Looks good!'}
/>

// Progress indicators
<UploadProgress
  progress={uploadProgress}
  status={uploadStatus}
/>
```

### Solution D: Visual Hierarchy

```tsx
// Clear primary action
<div className="flex gap-2">
  <Button variant="primary" size="lg">
    Upload Evidence
  </Button>
  <Button variant="secondary" size="md">
    Mark Complete
  </Button>
  <Button variant="ghost" size="sm">
    Skip
  </Button>
</div>

// Status-driven colors (consistent)
const statusColors = {
  COMPLIANT: 'bg-green-500/10 text-green-400 border-green-500/20',
  AT_RISK: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  NON_COMPLIANT: 'bg-red-500/10 text-red-400 border-red-500/20',
  OVERDUE: 'bg-red-500/10 text-red-400 border-red-500/20',
  DUE_SOON: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  ON_TRACK: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};
```

### Solution E: Empty States with Personality

```tsx
// Current: Generic empty state
<EmptyState>
  <p>No obligations found</p>
  <Button>Upload a permit</Button>
</EmptyState>

// Proposed: Helpful, friendly empty state
<EmptyState
  icon={<CheckCircle className="text-green-400" />}
  title="All caught up!"
  description="No overdue items. Your compliance is looking great."
  action={
    <Button variant="secondary">
      Review upcoming deadlines
    </Button>
  }
/>

// First-time user empty state
<EmptyState
  icon={<Upload />}
  title="Let's get started"
  description="Upload your first environmental permit and we'll extract your compliance obligations automatically."
  action={
    <div className="space-y-2">
      <Button variant="primary">Upload Permit</Button>
      <Button variant="link">Watch 2-min tutorial</Button>
    </div>
  }
/>
```

---

## 7. Additional Recommendations

### A. Keyboard Navigation

```tsx
// Global shortcuts
const shortcuts = {
  'mod+k': openCommandPalette,
  'mod+shift+d': openUploadDocument,
  'mod+shift+e': openUploadEvidence,
  'mod+shift+p': openGeneratePack,
  'mod+/': openHelp,
  'g d': () => navigate('/dashboard'),
  'g s': () => navigate('/sites'),
  'g l': () => navigate('/deadlines'),
};

// List navigation
const listShortcuts = {
  'j': selectNext,
  'k': selectPrevious,
  'enter': openSelected,
  'e': editSelected,
  'x': toggleSelectedComplete,
};
```

### B. Bulk Actions

```tsx
<ObligationList>
  <BulkActionBar visible={selectedCount > 0}>
    <span>{selectedCount} selected</span>
    <Button onClick={bulkMarkComplete}>Mark Complete</Button>
    <Button onClick={bulkAssign}>Assign To...</Button>
    <Button onClick={bulkExport}>Export</Button>
    <Button variant="danger" onClick={bulkArchive}>Archive</Button>
  </BulkActionBar>

  <SelectAll
    checked={allSelected}
    indeterminate={someSelected}
    onChange={toggleSelectAll}
  />

  {obligations.map(o => (
    <ObligationRow
      key={o.id}
      selected={selected.includes(o.id)}
      onSelect={() => toggleSelect(o.id)}
    />
  ))}
</ObligationList>
```

### C. Undo Pattern

```tsx
// Instead of confirmation dialogs
const markComplete = async (id) => {
  const previous = obligations.find(o => o.id === id);

  // Optimistically update
  updateObligation(id, { status: 'COMPLETED' });

  // Show undo toast
  const { dismiss } = toast.success(
    <div className="flex items-center gap-4">
      <span>Marked as complete</span>
      <Button
        variant="link"
        onClick={() => {
          updateObligation(id, { status: previous.status });
          dismiss();
        }}
      >
        Undo
      </Button>
    </div>,
    { duration: 8000 }
  );

  // Sync with server after toast disappears
  await new Promise(r => setTimeout(r, 8000));
  await api.markComplete(id);
};
```

### D. Notification-Driven Navigation

```tsx
// Notifications with direct actions
<Notification>
  <NotificationContent>
    <strong>3 items overdue</strong> at Manchester Plant
  </NotificationContent>
  <NotificationActions>
    <Button onClick={() => navigate('/sites/manchester/obligations?status=overdue')}>
      View Items
    </Button>
    <Button variant="ghost" onClick={dismiss}>
      Dismiss
    </Button>
  </NotificationActions>
</Notification>
```

---

## Implementation Priority

### Phase 1: Quick Wins (1-2 weeks)
1. ✅ Add Command Palette (Cmd+K)
2. ✅ Add site switcher to header
3. ✅ Inline actions on dashboard for overdue items
4. ✅ Collapsible nav sections
5. ✅ Rename Module 2/3/4 to readable names in URLs

### Phase 2: Core Improvements (2-4 weeks)
1. Convert detail pages to modals/slide-overs
2. Consolidate routes (150+ → ~35)
3. Add keyboard shortcuts
4. Add bulk actions
5. Smart upload with AI suggestion

### Phase 3: Polish (2-4 weeks)
1. Loading skeletons everywhere
2. Micro-interactions and animations
3. Undo pattern for destructive actions
4. Empty states with personality
5. Optimistic updates

### Phase 4: Advanced (4+ weeks)
1. Drag-drop everywhere
2. Notification-driven workflows
3. Smart defaults based on user behavior
4. AI-powered search and suggestions

---

## Expected Outcome

| Category | Before | After |
|----------|--------|-------|
| Information Architecture | 5/10 | 9/10 |
| Navigation | 6/10 | 9/10 |
| Route Design | 4/10 | 9/10 |
| Task Efficiency | 5/10 | 9/10 |
| Cognitive Load | 5/10 | 9/10 |
| Visual Design | 7/10 | 9/10 |
| **Overall** | **6/10** | **9/10** |

The goal is not perfection (10/10) but a highly efficient, learnable, and pleasant experience for compliance managers who use this tool daily.
