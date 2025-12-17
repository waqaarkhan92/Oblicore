# UX Optimization Plan: From Current State to 10/10

## Executive Summary

This plan details every enhancement needed to achieve 10/10 in each UX category. Current state: **209 dashboard pages**, **26+ sidebar items**, **14 levels of nesting**, and inconsistent patterns across the application.

---

## Category 1: Information Architecture (Current: 5/10 → Target: 10/10)

### Current Problems
- 209 pages when ~50 would suffice
- Duplicate paths for same data (compliance at global + site level)
- Four different entry points for packs
- No clear mental model for where things live
- Module naming inconsistent (permits/ vs module-1/ vs hazardous-waste/)

### Enhancements Required

#### 1.1 Consolidate Duplicate Routes
| Current Duplicates | Action | New Canonical Path |
|-------------------|--------|-------------------|
| `/dashboard/compliance` + `/dashboard/sites/[id]/compliance/*` | Merge | `/dashboard/compliance?siteId=X` |
| `/dashboard/packs` + `/dashboard/sites/[id]/packs` + `/dashboard/consultant/packs` | Merge | `/dashboard/packs?context=X` |
| `/dashboard/deadlines` + `/dashboard/sites/[id]/deadlines` | Merge | `/dashboard/deadlines?siteId=X` |
| `/dashboard/documents` + `/dashboard/sites/[id]/permits/documents` | Merge | `/dashboard/documents?siteId=X` |
| `/dashboard/evidence` + `/dashboard/sites/[id]/permits/evidence` | Merge | `/dashboard/evidence?siteId=X` |

**Implementation**:
- Add site filter dropdown to global pages
- Use query params for context instead of nested routes
- Redirect old routes to new canonical paths

#### 1.2 Flatten Module Navigation
| Current | New |
|---------|-----|
| `/dashboard/sites/[id]/module-2/consents` | `/dashboard/sites/[id]/trade-effluent` (single page with tabs) |
| `/dashboard/sites/[id]/module-3/generators` | `/dashboard/sites/[id]/generators` (single page with tabs) |
| `/dashboard/sites/[id]/hazardous-waste/*` | `/dashboard/sites/[id]/waste` (single page with tabs) |

**Each module becomes 1 page with tabs instead of 4 separate pages**

#### 1.3 Remove Unused/Empty Routes
- Delete placeholder pages that have no implementation
- Audit each of 209 pages for actual usage
- Target: Reduce to ~60 essential pages

#### 1.4 Create Clear URL Hierarchy
```
/dashboard                          # Portfolio overview
/dashboard/sites                    # All sites list
/dashboard/sites/[id]               # Site dashboard (redirect to /dashboard/sites/[id]/overview)
/dashboard/sites/[id]/overview      # Site overview
/dashboard/sites/[id]/obligations   # All obligations for site
/dashboard/sites/[id]/evidence      # All evidence for site
/dashboard/sites/[id]/documents     # Permits & documents
/dashboard/sites/[id]/compliance    # CCS, ELV, CAPA (tabs)
/dashboard/sites/[id]/trade-effluent # Module 2 (tabs: consents, parameters, results, exceedances)
/dashboard/sites/[id]/generators    # Module 3 (tabs: units, run-hours, tests, reports)
/dashboard/sites/[id]/waste         # Module 4 (tabs: streams, consignments, custody, contractors)
/dashboard/deadlines                # Global deadlines (with site filter)
/dashboard/packs                    # All packs (with site/type filter)
/dashboard/settings                 # User settings
```

#### 1.5 Establish Naming Conventions
- Use kebab-case for all routes
- Feature-based naming, not module numbers (`trade-effluent` not `module-2`)
- Consistent pluralization (always plural for lists: `obligations`, `documents`)

---

## Category 2: Navigation (Current: 6/10 → Target: 10/10)

### Current Problems
- 26 sidebar items when fully expanded
- Collapsible sections exist but not obvious
- Mobile drawer and bottom nav show different items
- No quick switcher between sites
- Command palette exists but underutilized

### Enhancements Required

#### 2.1 Reduce Sidebar to Maximum 10 Items Visible
**New Sidebar Structure**:
```
GLOBAL (always visible - 5 items)
├── Dashboard
├── Sites
├── Deadlines (with overdue badge)
├── Packs
└── Settings

SITE CONTEXT (when on site page - 5 items)
├── ← Back to Sites
├── Overview
├── Permits (dropdown: Documents, Obligations, Evidence)
├── Compliance (dropdown: CCS, ELV, CAPA)
└── Modules (dropdown: Trade Effluent, Generators, Waste - if active)
```

**Implementation**:
- Use dropdown menus instead of expanded sections
- Show only 5 global + 5 site = 10 max items
- Modules combined into single dropdown

#### 2.2 Add Site Switcher to Header
```tsx
// New component: SiteSwitcher in header
<SiteSwitcher>
  <CurrentSiteBadge name="Manchester Plant" score={87} />
  <Dropdown>
    <SearchInput placeholder="Search sites..." />
    <RecentSites limit={3} />
    <AllSitesList />
  </Dropdown>
</SiteSwitcher>
```

#### 2.3 Unify Mobile Navigation
**New Mobile Bottom Nav (5 items)**:
```
├── Home (Dashboard)
├── Sites (with site switcher)
├── Tasks (Deadlines + Overdue combined)
├── Search (opens command palette)
└── Menu (opens full drawer)
```

**New Mobile Drawer (matches desktop exactly)**:
- Same items as desktop sidebar
- Site context section when on site
- Full module access

#### 2.4 Enhance Command Palette
Already implemented - ensure discoverability:
- Add "Press ⌘K to search" hint in header
- Show keyboard shortcuts in all tooltips
- Add "?" shortcut to show all shortcuts

#### 2.5 Add Breadcrumbs to All Pages
```tsx
// Consistent breadcrumb component on every page
<Breadcrumbs>
  <Link href="/dashboard">Dashboard</Link>
  <Link href="/dashboard/sites">Sites</Link>
  <Link href={`/dashboard/sites/${siteId}`}>Manchester Plant</Link>
  <span>Obligations</span>
</Breadcrumbs>
```

#### 2.6 Implement Favorites
- Star icon on sites for quick access
- Favorites section at top of site list
- Persist in localStorage

---

## Category 3: Route Design (Current: 5/10 → Target: 10/10)

### Current Problems
- 14 levels deep nesting
- Multiple routes for same entity
- Query params underutilized
- No redirects for old routes

### Enhancements Required

#### 3.1 Enforce Maximum 4 Levels Deep
```
Level 1: /dashboard
Level 2: /dashboard/sites
Level 3: /dashboard/sites/[id]
Level 4: /dashboard/sites/[id]/obligations
```

**Everything else uses query params or modals**:
- `/dashboard/sites/[id]/obligations?selected=abc123` (opens SlideOver)
- `/dashboard/sites/[id]/obligations?filter=overdue`
- `/dashboard/sites/[id]/trade-effluent?tab=lab-results`

#### 3.2 Use Tabs Instead of Routes for Related Views
| Current (4 routes) | New (1 route with tabs) |
|-------------------|------------------------|
| `/module-2/consents` | `/trade-effluent?tab=consents` |
| `/module-2/parameters` | `/trade-effluent?tab=parameters` |
| `/module-2/lab-results` | `/trade-effluent?tab=results` |
| `/module-2/exceedances` | `/trade-effluent?tab=exceedances` |

#### 3.3 Use Query Params for Filters
| Current | New |
|---------|-----|
| `/deadlines/overdue` | `/deadlines?status=overdue` |
| `/deadlines/this-week` | `/deadlines?due=this-week` |
| `/evidence/expiring` | `/evidence?filter=expiring` |

#### 3.4 Use Modals/SlideOvers for Entity Details
| Current | New |
|---------|-----|
| `/obligations/[id]` (full page) | `/obligations?selected=[id]` (SlideOver) |
| `/evidence/[id]` (full page) | `/evidence?selected=[id]` (SlideOver) |
| `/deadlines/[id]` (full page) | `/deadlines?selected=[id]` (SlideOver) |

**Keep full page option for complex editing**:
- `/obligations/[id]/edit` - for full editing experience
- But default view is SlideOver from list

#### 3.5 Create Redirect Map for Old Routes
```typescript
// middleware.ts or redirect config
const redirects = {
  '/dashboard/module-1/*': '/dashboard/sites/:siteId/permits',
  '/dashboard/module-2/*': '/dashboard/sites/:siteId/trade-effluent',
  '/dashboard/module-3/*': '/dashboard/sites/:siteId/generators',
  '/dashboard/module-4/*': '/dashboard/sites/:siteId/waste',
  '/dashboard/compliance/ccs': '/dashboard/compliance?tab=ccs',
  '/dashboard/compliance/elv': '/dashboard/compliance?tab=elv',
  '/dashboard/compliance/capa': '/dashboard/compliance?tab=capa',
};
```

---

## Category 4: Task Efficiency (Current: 7/10 → Target: 10/10)

### Current State (Already Implemented)
- Keyboard shortcuts (g+d, g+s, etc.)
- Command palette (⌘K)
- Inline actions on overdue items
- SlideOver for details
- Bulk actions on obligations

### Enhancements Required

#### 4.1 Reduce Clicks for Core Tasks

**Upload Evidence (Current: 7 clicks → Target: 2 clicks)**
| Current Path | New Path |
|-------------|----------|
| Dashboard → Sites → [Site] → Permits → Obligations → [Obligation] → Upload Evidence | Dashboard → ⌘K → "upload evidence" → Select Obligation |

**Implementation**:
- Add "Upload Evidence" to command palette quick actions
- Show recent/due obligations in upload flow
- Add drag-drop zone to dashboard for quick upload

**Mark Obligation Complete (Current: 5 clicks → Target: 1 click)**
| Current | New |
|---------|-----|
| Navigate to obligation → Open → Click Complete | Inline "Complete" button on any obligation row |

Already partially implemented - extend to all lists.

#### 4.2 Add Quick Actions Menu to Every List Row
```tsx
<ObligationRow>
  <QuickActions>
    <Button icon={Check}>Complete</Button>
    <Button icon={Upload}>Add Evidence</Button>
    <Button icon={Calendar}>Reschedule</Button>
    <Button icon={MoreHorizontal}>More...</Button>
  </QuickActions>
</ObligationRow>
```

#### 4.3 Add Global Quick Actions FAB (Mobile)
```tsx
// Floating action button on mobile
<QuickActionsFAB>
  <Action icon={Upload} label="Upload Evidence" />
  <Action icon={Plus} label="Add Site" />
  <Action icon={FileText} label="Upload Permit" />
  <Action icon={Package} label="Generate Pack" />
</QuickActionsFAB>
```

#### 4.4 Smart Defaults
- Pre-select most likely site when uploading
- Remember last used filters
- Auto-suggest obligation when uploading evidence (based on due date)
- Pre-fill forms with sensible defaults

#### 4.5 Batch Operations Everywhere
Extend bulk actions to:
- Evidence list (bulk link, bulk archive)
- Documents list (bulk process, bulk delete)
- Sites list (bulk export, bulk compliance report)
- Deadlines (bulk reschedule, bulk complete)

---

## Category 5: Cognitive Load (Current: 6/10 → Target: 10/10)

### Current Problems
- Too many nav items (26)
- Empty pages with no guidance
- No progressive disclosure
- Information overload on dashboard

### Enhancements Required

#### 5.1 Progressive Disclosure Pattern
**Dashboard**: Show only what needs attention
```tsx
<Dashboard>
  {/* Priority 1: Action Required */}
  <ActionableOverdueItems />  // Already implemented

  {/* Priority 2: Coming Up */}
  <UpcomingDeadlines days={7} />

  {/* Priority 3: Summary (collapsed by default) */}
  <Collapsible title="Portfolio Summary">
    <SiteHealthOverview />
    <ComplianceStats />
  </Collapsible>
</Dashboard>
```

#### 5.2 Contextual Help Tooltips
```tsx
// Add help tooltips to complex features
<Label>
  Confidence Score
  <HelpTooltip>
    This score indicates how confident our AI is about the extracted
    obligation. Scores below 80% should be manually reviewed.
  </HelpTooltip>
</Label>
```

#### 5.3 Onboarding Checklists
```tsx
// Show for new users until dismissed
<OnboardingChecklist>
  <Step completed={hasSite}>Add your first site</Step>
  <Step completed={hasDocument}>Upload a permit document</Step>
  <Step completed={hasObligation}>Review extracted obligations</Step>
  <Step completed={hasEvidence}>Upload compliance evidence</Step>
  <Step completed={hasPack}>Generate your first audit pack</Step>
</OnboardingChecklist>
```

#### 5.4 Smart Empty States with Guidance
Replace all manual empty states with guided ones:
```tsx
<EmptyState
  variant="obligations"
  title="No obligations yet"
  description="Obligations are automatically extracted from your permit documents."
  action={{ label: "Upload Permit", href: "/upload" }}
  learnMore={{ label: "How extraction works", href: "/help/extraction" }}
/>
```

#### 5.5 Reduce Visual Noise
- Remove low-value stats from dashboard
- Use progressive disclosure for detailed data
- Collapse secondary information by default
- Use whitespace effectively

#### 5.6 Consistent Terminology
Create and enforce a glossary:
| Term | Definition | Never Use |
|------|-----------|-----------|
| Obligation | A compliance requirement from a permit | Task, Action, Requirement |
| Evidence | Proof of compliance | Attachment, Document, Proof |
| Deadline | Due date for an obligation | Due date, Target date |
| Pack | Audit-ready document bundle | Report, Bundle, Export |

---

## Category 6: Visual Design (Current: 8/10 → Target: 10/10)

### Current Strengths
- Consistent color palette
- Clean typography
- Good use of whitespace
- Modern component library

### Enhancements Required

#### 6.1 Loading States Audit
Ensure every page has:
```tsx
// Skeleton that matches final layout
<PageSkeleton>
  <HeaderSkeleton />
  <FilterBarSkeleton />
  <TableSkeleton rows={5} />
</PageSkeleton>
```

**Pages missing loading states**: Audit all 51 pages without isLoading

#### 6.2 Consistent Card Patterns
Standardize card layouts:
```tsx
// Standard metric card
<MetricCard
  label="Overdue"
  value={12}
  trend={{ direction: 'down', value: '3 from last week' }}
  status="danger"
  action={{ label: "View all", onClick: () => {} }}
/>
```

#### 6.3 Status Color Consistency
| Status | Color | Usage |
|--------|-------|-------|
| Success/Compliant | `green-500` | Completed, on-track |
| Warning/Due Soon | `yellow-500` | 7 days or less |
| Danger/Overdue | `red-500` | Past due, non-compliant |
| Info/Neutral | `blue-500` | Informational |
| Muted/N/A | `gray-400` | Not applicable |

#### 6.4 Icon Consistency
- Use Lucide icons exclusively
- Standard sizes: 16px (inline), 20px (buttons), 24px (headers)
- Always pair icons with text labels

#### 6.5 Animation Polish
- Ensure all transitions are 200-300ms
- Use ease-out for entrances, ease-in for exits
- Add subtle hover states to all interactive elements
- Loading spinners on all async actions

---

## Category 7: Micro-interactions (Current: 8/10 → Target: 10/10)

### Current Strengths
- Framer Motion animations
- Optimistic updates with undo
- Smooth transitions

### Enhancements Required

#### 7.1 Feedback for Every Action
```tsx
// Every mutation needs feedback
const mutation = useMutation({
  onMutate: () => toast.loading("Saving..."),
  onSuccess: () => toast.success("Saved!"),
  onError: () => toast.error("Failed to save"),
});
```

#### 7.2 Undo Pattern Everywhere
Extend undo capability to:
- Delete operations (evidence, documents)
- Status changes (obligation status)
- Archive operations
- Bulk actions

```tsx
toast.success("3 items archived", {
  action: {
    label: "Undo",
    onClick: () => restoreItems(ids),
  },
  duration: 8000,
});
```

#### 7.3 Skeleton Loading Transitions
```tsx
// Smooth transition from skeleton to content
<AnimatePresence mode="wait">
  {isLoading ? (
    <motion.div key="skeleton" exit={{ opacity: 0 }}>
      <Skeleton />
    </motion.div>
  ) : (
    <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Content />
    </motion.div>
  )}
</AnimatePresence>
```

#### 7.4 Pull-to-Refresh (Mobile)
```tsx
// Add pull-to-refresh on list pages
<PullToRefresh onRefresh={() => queryClient.invalidateQueries()}>
  <ObligationsList />
</PullToRefresh>
```

#### 7.5 Gesture Support (Mobile)
- Swipe right to complete obligation
- Swipe left to show actions
- Long press for context menu

---

## Category 8: Accessibility (Current: 6/10 → Target: 10/10)

### Current Problems
- Inconsistent aria-labels
- Missing focus indicators
- No skip links
- Color-only status indicators

### Enhancements Required

#### 8.1 Audit All Interactive Elements
Every button, link, and control needs:
```tsx
<Button
  aria-label="Mark obligation as complete"
  aria-describedby="obligation-title"
>
  <CheckIcon aria-hidden="true" />
  Complete
</Button>
```

#### 8.2 Add Skip Links
```tsx
// Add to layout
<SkipLinks>
  <SkipLink href="#main-content">Skip to main content</SkipLink>
  <SkipLink href="#navigation">Skip to navigation</SkipLink>
</SkipLinks>
```

#### 8.3 Visible Focus Indicators
```css
/* Add to global styles */
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Remove outline for mouse users */
:focus:not(:focus-visible) {
  outline: none;
}
```

#### 8.4 Screen Reader Announcements
```tsx
// Announce dynamic content changes
<LiveRegion>
  {isLoading ? "Loading obligations..." : `${count} obligations found`}
</LiveRegion>
```

#### 8.5 Color + Icon + Text for Status
```tsx
// Never use color alone
<StatusBadge status="overdue">
  <AlertCircle aria-hidden="true" /> {/* Icon */}
  <span>Overdue</span> {/* Text */}
  <span className="sr-only">This item is past its due date</span>
</StatusBadge>
```

#### 8.6 Keyboard Navigation Audit
- Tab order follows visual order
- All dropdowns keyboard accessible
- Modal focus trap
- Escape closes modals/drawers
- Arrow keys navigate lists

#### 8.7 Form Accessibility
```tsx
<FormField>
  <Label htmlFor="title">
    Obligation Title
    <RequiredIndicator />
  </Label>
  <Input
    id="title"
    aria-required="true"
    aria-invalid={!!errors.title}
    aria-describedby="title-error title-help"
  />
  <HelpText id="title-help">Enter a descriptive title</HelpText>
  {errors.title && <ErrorText id="title-error">{errors.title}</ErrorText>}
</FormField>
```

#### 8.8 WCAG 2.1 AA Compliance Checklist
- [ ] Color contrast ratio ≥ 4.5:1 for text
- [ ] Color contrast ratio ≥ 3:1 for UI components
- [ ] Touch targets ≥ 44x44px
- [ ] Text resizable to 200% without loss
- [ ] No content relies on color alone
- [ ] All images have alt text
- [ ] All forms have labels
- [ ] All errors are announced
- [ ] Page titles are descriptive
- [ ] Language is declared

---

## Implementation Priority

### Phase 1: Quick Wins (1-2 weeks)
1. Reduce sidebar to 10 items max with dropdowns
2. Migrate all empty states to EmptyState component
3. Add aria-labels to all buttons/links
4. Add visible focus indicators globally
5. Unify mobile navigation

### Phase 2: Route Consolidation (2-3 weeks)
1. Merge duplicate routes (compliance, packs, deadlines)
2. Convert module pages to tabs
3. Implement SlideOver for all entity details
4. Add query param filters to global pages
5. Create redirect map

### Phase 3: Task Efficiency (1-2 weeks)
1. Add quick actions to all list rows
2. Extend bulk actions to all lists
3. Add FAB for mobile quick actions
4. Implement smart defaults
5. Add drag-drop upload

### Phase 4: Polish (1-2 weeks)
1. Loading state audit (all pages)
2. Animation consistency audit
3. Terminology consistency audit
4. Accessibility audit (automated + manual)
5. Mobile gesture support

---

## Success Metrics

| Category | Current | Target | Measurement |
|----------|---------|--------|-------------|
| Information Architecture | 5/10 | 10/10 | ≤60 pages, 0 duplicates |
| Navigation | 6/10 | 10/10 | ≤10 sidebar items, unified mobile |
| Route Design | 5/10 | 10/10 | ≤4 levels deep, query params |
| Task Efficiency | 7/10 | 10/10 | Core tasks ≤3 clicks |
| Cognitive Load | 6/10 | 10/10 | Progressive disclosure, onboarding |
| Visual Design | 8/10 | 10/10 | 100% loading states, consistent |
| Micro-interactions | 8/10 | 10/10 | Undo everywhere, gestures |
| Accessibility | 6/10 | 10/10 | WCAG 2.1 AA compliant |

---

## Files to Create/Modify

### New Components
- `components/navigation/site-switcher.tsx`
- `components/navigation/quick-actions-fab.tsx`
- `components/layout/skip-links.tsx`
- `components/feedback/live-region.tsx`
- `components/onboarding/checklist.tsx`

### Components to Modify
- `components/dashboard/sidebar.tsx` - Reduce items, add dropdowns
- `components/dashboard/mobile-bottom-nav.tsx` - Unify with drawer
- `components/dashboard/mobile-sidebar.tsx` - Match desktop nav
- `components/ui/empty-state.tsx` - Already good, ensure usage

### Pages to Consolidate
- Merge `/dashboard/compliance/*` → `/dashboard/compliance` with tabs
- Merge `/dashboard/sites/[id]/module-2/*` → `/dashboard/sites/[id]/trade-effluent` with tabs
- Merge `/dashboard/sites/[id]/module-3/*` → `/dashboard/sites/[id]/generators` with tabs
- Merge `/dashboard/sites/[id]/hazardous-waste/*` → `/dashboard/sites/[id]/waste` with tabs

### Pages to Delete (After Consolidation)
- All `/module-1/`, `/module-2/`, `/module-3/`, `/module-4/` global routes
- Duplicate compliance pages
- Duplicate deadline pages
- Duplicate pack pages

---

## Estimated Total Effort

| Phase | Duration | Complexity |
|-------|----------|------------|
| Phase 1: Quick Wins | 1-2 weeks | Low |
| Phase 2: Route Consolidation | 2-3 weeks | High |
| Phase 3: Task Efficiency | 1-2 weeks | Medium |
| Phase 4: Polish | 1-2 weeks | Medium |
| **Total** | **5-9 weeks** | - |

---

*Document created: December 2024*
*Last updated: December 2024*
