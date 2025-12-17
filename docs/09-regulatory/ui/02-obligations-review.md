# UI Specification v1.0 - Part 2: Obligations & Review Screens

**Version:** 1.0
**Status:** DRAFT
**Date:** 2025-02-01
**Part:** 2 of 5

---

## Document Series Reference

| Part | Document | Content |
|------|----------|---------|
| 1 | UI_Specification_v1.0_Part1_Navigation_Forms.md | Navigation structure, module form specifications |
| **2** | **UI_Specification_v1.0_Part2_Obligations_Review.md** | **Obligation screens, review queue, assignment workflows** |
| 3 | UI_Specification_v1.0_Part3_Evidence_Confidence.md | Evidence upload, confidence badges, status indicators |
| 4 | UI_Specification_v1.0_Part4_Wireframes.md | ASCII wireframes for all required screens |
| 5 | UI_Specification_v1.0_Part5_AuditPacks_Accessibility.md | Audit pack assembly, PDF export, accessibility, error states |

---

## Table of Contents

1. [Obligation List Screen](#1-obligation-list-screen)
2. [Obligation Detail Screen](#2-obligation-detail-screen)
3. [Obligation Edit Screen](#3-obligation-edit-screen)
4. [Review Queue Interface](#4-review-queue-interface)
5. [Assignment Workflows](#5-assignment-workflows)
6. [Status Transitions](#6-status-transitions)
7. [Bulk Operations](#7-bulk-operations)
8. [Subjective Obligation Handling](#8-subjective-obligation-handling)

---

## 1. Obligation List Screen

### 1.1 Screen Purpose

The Obligation List displays all extracted obligations for a site, document, or company. Primary interface for compliance officers to monitor status and take action.

### 1.2 URL Route

```
/dashboard/sites/{siteId}/obligations
/dashboard/documents/{documentId}/obligations
/dashboard/obligations (company-wide)
```

### 1.3 Filter Panel

| Filter | Type | Options | Default |
|--------|------|---------|---------|
| Status | Multi-select | PENDING, IN_PROGRESS, DUE_SOON, COMPLETED, OVERDUE, INCOMPLETE, LATE_COMPLETE, NOT_APPLICABLE, REJECTED | All |
| Category | Multi-select | MONITORING, REPORTING, RECORD_KEEPING, OPERATIONAL, MAINTENANCE | All |
| Frequency | Multi-select | DAILY, WEEKLY, MONTHLY, QUARTERLY, ANNUAL, ONE_TIME, CONTINUOUS, EVENT_TRIGGERED | All |
| Review Status | Multi-select | PENDING, CONFIRMED, EDITED, REJECTED, PENDING_INTERPRETATION, INTERPRETED, NOT_APPLICABLE | All |
| Priority | Toggle | High Priority Only | Off |
| Subjective | Toggle | Subjective Only | Off |
| Assigned To | User dropdown | All users + Unassigned | All |
| Document | Document dropdown | All documents for site | All |
| Confidence | Range slider | 0.0 - 1.0 | Full range |
| Due Date | Date range picker | Start - End | None |

### 1.4 List Columns

| Column | Width | Sortable | Content |
|--------|-------|----------|---------|
| Checkbox | 40px | No | Bulk selection |
| Status Badge | 80px | Yes | Traffic light indicator (see Part 3) |
| Condition Ref | 100px | Yes | e.g., "3.1.2" |
| Title | Flex | Yes | `obligation_title` truncated to 60 chars |
| Category | 120px | Yes | Category badge |
| Frequency | 100px | Yes | Frequency label |
| Due Date | 100px | Yes | Next deadline date |
| Confidence | 80px | Yes | Score with color coding |
| Assigned | 120px | Yes | User avatar + name |
| Actions | 100px | No | Quick action buttons |

### 1.5 Quick Actions (Per Row)

| Icon | Action | Visibility Condition |
|------|--------|---------------------|
| 👁️ | View Detail | Always |
| ✏️ | Edit | User has edit permission |
| ✅ | Mark Complete | Status = PENDING, IN_PROGRESS, DUE_SOON |
| 🔗 | Link Evidence | Status != COMPLETED |
| 👤 | Assign | User has assign permission |
| ⚠️ | Flag for Review | Review Status = CONFIRMED |

### 1.6 Bulk Actions Toolbar

Appears when 1+ obligations selected:

```
┌─────────────────────────────────────────────────────────────────────┐
│ ☑ 5 selected  │ Assign To ▼ │ Change Status ▼ │ Export │ ✕ Clear │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.7 Empty State

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                    📋 No Obligations Found                          │
│                                                                     │
│     No obligations match your current filters.                      │
│     Try adjusting filters or upload a document to extract           │
│     obligations automatically.                                      │
│                                                                     │
│                    [ Clear Filters ]  [ Upload Document ]           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.8 Pagination

| Element | Specification |
|---------|---------------|
| Page Size | 25, 50, 100 (default 25) |
| Navigation | First, Prev, Page Numbers, Next, Last |
| Display | "Showing 1-25 of 142 obligations" |
| URL Sync | Page number in query param: `?page=2` |

---

## 2. Obligation Detail Screen

### 2.1 Screen Purpose

Full view of a single obligation with all metadata, linked evidence, deadline history, and audit trail.

### 2.2 URL Route

```
/dashboard/obligations/{obligationId}
```

### 2.3 Screen Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ ← Back to List          Condition 3.1.2                    [Edit]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ┌─────────────────────────────────────────┐ ┌─────────────────────┐ │
│ │ OBLIGATION DETAILS                      │ │ STATUS PANEL        │ │
│ │                                         │ │                     │ │
│ │ Title: Monthly Emissions Monitoring     │ │ ● PENDING           │ │
│ │ Category: [MONITORING]                  │ │                     │ │
│ │ Frequency: MONTHLY                      │ │ Due: 15 Feb 2025    │ │
│ │ Priority: [HIGH]                        │ │ (in 14 days)        │ │
│ │                                         │ │                     │ │
│ │ ─────────────────────────────────────── │ │ [Mark Complete]     │ │
│ │ ORIGINAL TEXT                           │ │ [Mark N/A]          │ │
│ │ "The operator shall monitor emissions   │ │                     │ │
│ │ of NOx and SO2 from Point A1 at least   │ │ ─────────────────── │ │
│ │ once per calendar month and record..."  │ │ ASSIGNED TO         │ │
│ │                                         │ │ 👤 John Smith       │ │
│ │ Page Reference: 12                      │ │ [Reassign]          │ │
│ │ ─────────────────────────────────────── │ │                     │ │
│ │ DESCRIPTION                             │ │ ─────────────────── │ │
│ │ Monthly monitoring requirement for      │ │ CONFIDENCE          │ │
│ │ NOx and SO2 emissions at Point A1.      │ │ 0.92 ████████░░     │ │
│ │                                         │ │ [View Breakdown]    │ │
│ └─────────────────────────────────────────┘ └─────────────────────┘ │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ TABS: [Evidence] [Deadlines] [History] [Notes]                  │ │
│ ├─────────────────────────────────────────────────────────────────┤ │
│ │                                                                 │ │
│ │ (Tab content area - see sections below)                         │ │
│ │                                                                 │ │
│ └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.4 Evidence Tab

| Column | Content |
|--------|---------|
| Thumbnail | 60x60 preview (or file type icon) |
| File Name | Original filename with link |
| Compliance Period | e.g., "Q1 2025" |
| Uploaded | Date + user |
| Verified | ✅ or ❌ with verifier name |
| Actions | View, Download, Unlink |

**Add Evidence Button:**
```
[ + Link Existing Evidence ]  [ Upload New Evidence ]
```

### 2.5 Deadlines Tab

| Column | Content |
|--------|---------|
| Compliance Period | e.g., "January 2025" |
| Due Date | Date with relative indicator |
| Status | Badge (PENDING, COMPLETED, OVERDUE, etc.) |
| Completed | Date + user (if completed) |
| Evidence Count | Number of linked evidence items |
| Actions | View, Mark Complete (if PENDING) |

### 2.6 History Tab (Audit Trail)

| Column | Content |
|--------|---------|
| Timestamp | Full datetime |
| User | Avatar + name |
| Action | Human-readable action description |
| Changes | JSON diff of field changes |

**Action Types:**
- Obligation created (extraction)
- Obligation edited
- Status changed
- Assigned to user
- Evidence linked/unlinked
- Deadline completed
- Review status changed
- Interpretation added

### 2.7 Notes Tab

| Element | Specification |
|---------|---------------|
| Note Input | Textarea with 500 char limit |
| Note Display | Reverse chronological list |
| Note Fields | Timestamp, user, text |
| Actions | Add Note button |

---

## 3. Obligation Edit Screen

### 3.1 Screen Purpose

Edit obligation details, interpretation, and schedule. Changes create version history entries.

### 3.2 URL Route

```
/dashboard/obligations/{obligationId}/edit
```

### 3.3 Editable Fields

| Field | Type | Validation | Notes |
|-------|------|------------|-------|
| `obligation_title` | Text input | Required, max 200 chars | |
| `obligation_description` | Textarea | Max 2000 chars | |
| `category` | Dropdown | ENUM values | |
| `frequency` | Dropdown | ENUM values | |
| `is_high_priority` | Toggle | Boolean | |
| `deadline_date` | Date picker | Optional | For ONE_TIME obligations |
| `deadline_relative` | Text input | Max 100 chars | e.g., "within 7 days of event" |
| `interpretation_notes` | Textarea | Max 2000 chars | For subjective obligations |

### 3.4 Non-Editable Fields (Display Only)

| Field | Reason |
|-------|--------|
| `original_text` | Preservation of source |
| `condition_reference` | Document integrity |
| `confidence_score` | System-calculated |
| `page_reference` | Document integrity |
| `document_id` | Cannot reassign to different document |

### 3.5 Schedule Editor

For obligations with schedules:

```
┌─────────────────────────────────────────────────────────────────────┐
│ SCHEDULE CONFIGURATION                                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Frequency:        [ MONTHLY          ▼ ]                           │
│                                                                     │
│ Base Date:        [ 2025-01-01       📅 ]                          │
│                                                                     │
│ Next Due Date:    [ 2025-02-01       📅 ]  (auto-calculated)       │
│                                                                     │
│ ☐ Rolling Schedule (next due = completion date + interval)          │
│ ☐ Adjust for Business Days                                          │
│                                                                     │
│ Reminder Days:    [ 7 ] [ 3 ] [ 1 ]  [ + Add ]                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.6 Version Warning

When editing a confirmed obligation:

```
┌─────────────────────────────────────────────────────────────────────┐
│ ⚠️ Warning: This obligation has been confirmed.                     │
│                                                                     │
│ Editing will:                                                       │
│ • Create a new version (v2)                                         │
│ • Change review status to EDITED                                    │
│ • Record your changes in the audit trail                            │
│                                                                     │
│                               [ Cancel ]  [ Continue Editing ]      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.7 Save Actions

| Button | Behavior |
|--------|----------|
| Cancel | Return to detail screen, discard changes |
| Save Draft | Save without changing review status |
| Save & Confirm | Save and set review_status = CONFIRMED |

---

## 4. Review Queue Interface

### 4.1 Screen Purpose

Prioritized list of obligations requiring human review, sorted by urgency and confidence. Primary workflow for extraction QA.

### 4.2 URL Route

```
/dashboard/review-queue
/dashboard/review-queue?filter=low_confidence
/dashboard/review-queue?filter=subjective
```

### 4.3 Queue Categories

| Category | Filter Criteria | Badge Color |
|----------|-----------------|-------------|
| Low Confidence | confidence_score < 0.7 | Red |
| Subjective | is_subjective = true AND review_status = PENDING_INTERPRETATION | Orange |
| Pending Review | review_status = PENDING | Yellow |
| Edited | review_status = EDITED | Blue |
| Zero Obligations | document.extraction_status = ZERO_OBLIGATIONS | Purple |

### 4.4 Queue Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ REVIEW QUEUE                                          [ Settings ] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ CATEGORIES                                                          │
│ ┌───────────────┬───────────────┬───────────────┬─────────────────┐│
│ │ Low Confidence│ Subjective    │ Pending Review│ Zero Obligations││
│ │     12        │     8         │     45        │     3           ││
│ │ (urgent)      │               │               │                 ││
│ └───────────────┴───────────────┴───────────────┴─────────────────┘│
│                                                                     │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                     │
│ QUEUE ITEMS (sorted by urgency)                                     │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ 🔴 0.45 │ Condition 2.3.1 - Waste Storage Requirements          │ │
│ │         │ Document: EP-12345 | Site: Birmingham Factory         │ │
│ │         │ Reason: Multiple ambiguous phrases detected           │ │
│ │         │                    [ Review Now ]  [ Skip ]  [ Assign ]│ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ 🟠 SUBJ │ Condition 4.1.2 - "Reasonable" Measures               │ │
│ │         │ Document: EP-12346 | Site: Manchester Plant           │ │
│ │         │ Phrases: "reasonable", "as soon as practicable"       │ │
│ │         │                    [ Review Now ]  [ Skip ]  [ Assign ]│ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.5 Review Modal

When "Review Now" clicked:

```
┌─────────────────────────────────────────────────────────────────────┐
│ REVIEW OBLIGATION                                            [ ✕ ] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ORIGINAL TEXT                                                       │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ "The operator shall take **reasonable** steps to minimise      │ │
│ │ fugitive emissions **as soon as practicable** following any    │ │
│ │ incident that may result in uncontrolled releases."            │ │
│ │                                                      Page: 15  │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ EXTRACTED DATA                                                      │
│ ┌───────────────────────────────┬─────────────────────────────────┐ │
│ │ Title                         │ [ Fugitive Emissions Control  ] │ │
│ │ Category                      │ [ OPERATIONAL            ▼   ] │ │
│ │ Frequency                     │ [ EVENT_TRIGGERED        ▼   ] │ │
│ └───────────────────────────────┴─────────────────────────────────┘ │
│                                                                     │
│ CONFIDENCE BREAKDOWN                                                │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Base Score:           0.85                                      │ │
│ │ Subjective Deduction: -0.25  (2 phrases: "reasonable", "asap") │ │
│ │ Ambiguity Deduction:  -0.15  (unclear trigger condition)        │ │
│ │ ─────────────────────────────                                   │ │
│ │ Final Score:          0.45                                      │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ INTERPRETATION (required for subjective obligations)                │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Define what "reasonable" means in this context:                 │ │
│ │                                                                 │ │
│ │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│ │                                                                 │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ [ Reject ]        [ Save as Draft ]        [ Confirm & Next ]  │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.6 Review Actions

| Action | Result |
|--------|--------|
| Confirm | review_status → CONFIRMED, interpreted_by → current user, interpreted_at → now |
| Reject | review_status → REJECTED, prompts for rejection reason |
| Mark N/A | review_status → NOT_APPLICABLE, prompts for reason |
| Save Draft | Saves edits without status change |
| Skip | Moves to next item, no changes |
| Assign | Opens assignment modal |

### 4.7 Zero Obligations Review

Special handling for documents with zero extracted obligations:

```
┌─────────────────────────────────────────────────────────────────────┐
│ ZERO OBLIGATIONS REVIEW                                      [ ✕ ] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Document: Environmental Permit EP-99999                             │
│ Site: Leeds Distribution Centre                                     │
│ Uploaded: 2025-01-15 by Jane Doe                                    │
│                                                                     │
│ ⚠️ No obligations were extracted from this document.                │
│                                                                     │
│ POSSIBLE REASONS:                                                   │
│ • Document is not a regulatory permit                               │
│ • Document is a cover letter or summary only                        │
│ • OCR quality was too low (confidence: 0.45)                        │
│ • Document is in an unsupported format                              │
│                                                                     │
│ [ View Document ]  [ Re-process with OCR ]  [ Manual Entry Mode ]  │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                     │
│ RESOLUTION:                                                         │
│ ○ Confirm - Document correctly has no obligations                   │
│ ○ Re-upload - User will upload correct document                     │
│ ○ Manual Mode - Enter obligations manually                          │
│                                                                     │
│                    [ Cancel ]  [ Resolve ]                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Assignment Workflows

### 5.1 Single Assignment

From obligation detail or list:

```
┌─────────────────────────────────────────────────────────────────────┐
│ ASSIGN OBLIGATION                                            [ ✕ ] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Obligation: Monthly Emissions Monitoring (Condition 3.1.2)          │
│                                                                     │
│ Currently Assigned: Unassigned                                      │
│                                                                     │
│ Assign To:                                                          │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ 🔍 Search users...                                              │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ SUGGESTED USERS (based on site access and workload)                 │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ ○ 👤 John Smith (12 active obligations)                         │ │
│ │ ○ 👤 Jane Doe (8 active obligations)                            │ │
│ │ ○ 👤 Bob Wilson (15 active obligations)                         │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ☐ Send notification to assigned user                                │
│                                                                     │
│ Note (optional):                                                    │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│                               [ Cancel ]  [ Assign ]                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Bulk Assignment

From obligation list with multiple selected:

```
┌─────────────────────────────────────────────────────────────────────┐
│ BULK ASSIGN OBLIGATIONS                                      [ ✕ ] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Assigning 5 obligations:                                            │
│ • Condition 3.1.2 - Monthly Emissions Monitoring                    │
│ • Condition 3.1.3 - Quarterly Stack Testing                         │
│ • Condition 3.2.1 - Annual Report Submission                        │
│ • Condition 4.1.1 - Waste Record Keeping                            │
│ • Condition 4.1.2 - Waste Transfer Notes                            │
│                                                                     │
│ Assignment Mode:                                                    │
│ ○ Assign all to single user                                         │
│ ○ Distribute evenly among selected users                            │
│ ○ Assign by category (user per category)                            │
│                                                                     │
│ [User selection UI based on mode]                                   │
│                                                                     │
│                               [ Cancel ]  [ Assign All ]            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.3 Auto-Assignment Rules

Site-level configuration:

```
┌─────────────────────────────────────────────────────────────────────┐
│ AUTO-ASSIGNMENT RULES                                        [ + ] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ When new obligations are extracted, automatically assign based on:  │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ Rule 1: MONITORING → John Smith                          [Edit]│ │
│ │ Rule 2: REPORTING → Jane Doe                             [Edit]│ │
│ │ Rule 3: OPERATIONAL → Bob Wilson                         [Edit]│ │
│ │ Rule 4: Default → Site Manager                           [Edit]│ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ☑ Enable auto-assignment for this site                              │
│ ☐ Override existing assignments on re-extraction                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. Status Transitions

### 6.1 Obligation Status State Machine

```
                    ┌─────────────┐
                    │   PENDING   │ ←── Initial state (extraction)
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
       ┌─────────────┐ ┌─────────┐ ┌──────────────┐
       │ IN_PROGRESS │ │DUE_SOON │ │NOT_APPLICABLE│
       └──────┬──────┘ └────┬────┘ └──────────────┘
              │             │
              └──────┬──────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
         ▼           ▼           ▼
   ┌──────────┐ ┌─────────┐ ┌────────────┐
   │COMPLETED │ │ OVERDUE │ │INCOMPLETE  │
   └──────────┘ └────┬────┘ └─────┬──────┘
                     │            │
                     ▼            ▼
              ┌─────────────┐ ┌──────────┐
              │LATE_COMPLETE│ │ REJECTED │
              └─────────────┘ └──────────┘
```

### 6.2 Status Transition Rules

| From | To | Trigger | Validation |
|------|-----|---------|------------|
| PENDING | IN_PROGRESS | User action | None |
| PENDING | DUE_SOON | System (due date - 7 days) | Has schedule |
| PENDING | NOT_APPLICABLE | User marks N/A | Requires reason |
| IN_PROGRESS | COMPLETED | User marks complete | Evidence optional |
| IN_PROGRESS | DUE_SOON | System (due date - 7 days) | Has schedule |
| DUE_SOON | COMPLETED | User marks complete | Evidence recommended |
| DUE_SOON | OVERDUE | System (due date passed) | Has schedule |
| OVERDUE | COMPLETED | User marks complete | is_late = true |
| OVERDUE | LATE_COMPLETE | System (when marked complete after due) | Automatic |
| OVERDUE | INCOMPLETE | User acknowledges incomplete | Requires reason |
| * | REJECTED | User rejects | Requires reason |

### 6.3 Status Change Modal

```
┌─────────────────────────────────────────────────────────────────────┐
│ CHANGE STATUS                                                [ ✕ ] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Obligation: Monthly Emissions Monitoring                            │
│ Current Status: ● PENDING                                           │
│                                                                     │
│ Change To:                                                          │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ ○ ● IN_PROGRESS - Mark as actively being worked on              │ │
│ │ ○ ✅ COMPLETED - Mark as successfully completed                  │ │
│ │ ○ ⚪ NOT_APPLICABLE - This obligation does not apply             │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ Notes (required for N/A):                                           │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│                               [ Cancel ]  [ Update Status ]         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.4 Review Status State Machine

```
                    ┌─────────────┐
                    │   PENDING   │ ←── Initial (after extraction)
                    └──────┬──────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
  ┌────────────┐  ┌───────────────────┐  ┌──────────┐
  │ CONFIRMED  │  │PENDING_INTERPRETATION│ │ REJECTED │
  └─────┬──────┘  └─────────┬─────────┘  └──────────┘
        │                   │
        ▼                   ▼
   ┌─────────┐       ┌─────────────┐
   │ EDITED  │       │ INTERPRETED │
   └─────────┘       └─────────────┘
```

---

## 7. Bulk Operations

### 7.1 Bulk Status Change

```
┌─────────────────────────────────────────────────────────────────────┐
│ BULK STATUS CHANGE                                           [ ✕ ] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Changing status for 8 obligations                                   │
│                                                                     │
│ New Status: [ COMPLETED              ▼ ]                           │
│                                                                     │
│ ⚠️ Warning: 3 obligations are currently OVERDUE.                    │
│    These will be marked as LATE_COMPLETE.                           │
│                                                                     │
│ Completion Notes (applies to all):                                  │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│                    [ Cancel ]  [ Update All (8) ]                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.2 Bulk Export

```
┌─────────────────────────────────────────────────────────────────────┐
│ EXPORT OBLIGATIONS                                           [ ✕ ] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Exporting: 25 obligations (current filter)                          │
│                                                                     │
│ Format:                                                             │
│ ○ Excel (.xlsx)                                                     │
│ ○ CSV (.csv)                                                        │
│ ○ PDF Summary                                                       │
│                                                                     │
│ Include:                                                            │
│ ☑ Basic fields (title, category, status, due date)                  │
│ ☑ Original text                                                     │
│ ☐ Confidence scores and breakdown                                   │
│ ☐ Assignment history                                                │
│ ☐ Evidence list                                                     │
│ ☐ Full audit trail                                                  │
│                                                                     │
│                               [ Cancel ]  [ Export ]                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.3 Bulk Delete / Archive

```
┌─────────────────────────────────────────────────────────────────────┐
│ ⚠️ ARCHIVE OBLIGATIONS                                       [ ✕ ] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ You are about to archive 5 obligations.                             │
│                                                                     │
│ Archived obligations will:                                          │
│ • No longer appear in active lists                                  │
│ • Retain all history and evidence links                             │
│ • Be recoverable by administrators                                  │
│                                                                     │
│ Archive Reason (required):                                          │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ [ Document superseded          ▼ ]                              │ │
│ │   ○ Document superseded                                         │ │
│ │   ○ Duplicate extraction                                        │ │
│ │   ○ No longer applicable                                        │ │
│ │   ○ Other (specify below)                                       │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ Additional Notes:                                                   │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│                         [ Cancel ]  [ Archive (5) ]                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 8. Subjective Obligation Handling

### 8.1 Subjective Detection

Obligations are flagged as subjective when original text contains:

| Phrase Category | Examples |
|-----------------|----------|
| Reasonableness | "reasonable", "reasonably practicable", "as appropriate" |
| Timeliness | "as soon as practicable", "without undue delay", "promptly" |
| Judgment | "where necessary", "if required", "as needed" |
| Adequacy | "adequate", "sufficient", "appropriate measures" |
| Condition-based | "in the event of", "where applicable", "if circumstances require" |

### 8.2 Subjective Indicator

In obligation lists and detail screens:

```
┌────────────────────────────────────────────┐
│ [SUBJECTIVE] 🟠                            │
│ Requires interpretation before compliance  │
│ tracking can begin.                        │
│                                            │
│ Subjective phrases detected:               │
│ • "reasonable"                             │
│ • "as soon as practicable"                 │
│                                            │
│ [ Add Interpretation ]                     │
└────────────────────────────────────────────┘
```

### 8.3 Interpretation Form

```
┌─────────────────────────────────────────────────────────────────────┐
│ INTERPRET SUBJECTIVE OBLIGATION                              [ ✕ ] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ORIGINAL TEXT                                                       │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ "The operator shall take **reasonable** steps to prevent        │ │
│ │ pollution and shall respond **as soon as practicable** to       │ │
│ │ any incident."                                                  │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ INTERPRETATION GUIDANCE                                             │
│ Define what each subjective phrase means in your operational        │
│ context. This interpretation will be used for compliance tracking.  │
│                                                                     │
│ What does "reasonable steps" mean for your site?                    │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ e.g., "Daily visual inspections, secondary containment for all │ │
│ │ chemical storage, spill kits within 10m of all storage areas"  │ │
│ │                                                                 │ │
│ │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ What does "as soon as practicable" mean for your site?              │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ e.g., "Within 2 hours during working hours, within 4 hours     │ │
│ │ outside working hours, weekend response within 8 hours"         │ │
│ │                                                                 │ │
│ │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ☐ Create checklist items from this interpretation                   │
│                                                                     │
│                         [ Cancel ]  [ Save Interpretation ]         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.4 Interpretation Display

After interpretation saved:

```
┌─────────────────────────────────────────────────────────────────────┐
│ INTERPRETATION                                              [Edit] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Interpreted by: John Smith on 2025-01-20                            │
│                                                                     │
│ "Reasonable steps" means:                                           │
│ Daily visual inspections, secondary containment for all chemical    │
│ storage, spill kits within 10m of all storage areas                 │
│                                                                     │
│ "As soon as practicable" means:                                     │
│ Within 2 hours during working hours, within 4 hours outside         │
│ working hours, weekend response within 8 hours                      │
│                                                                     │
│ Status: ✅ INTERPRETED                                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Reference Summary

### Screens Defined in Part 2

| Screen | Route | Primary Action |
|--------|-------|----------------|
| Obligation List | `/obligations` | Filter, sort, bulk actions |
| Obligation Detail | `/obligations/{id}` | View, link evidence, complete |
| Obligation Edit | `/obligations/{id}/edit` | Modify fields, schedule |
| Review Queue | `/review-queue` | QA workflow, interpretation |
| Assignment Modal | (overlay) | Single/bulk assignment |
| Status Change Modal | (overlay) | Status transitions |
| Interpretation Form | (overlay) | Subjective handling |

### API Endpoints Referenced

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/obligations` | GET | List with filters |
| `/api/v1/obligations/{id}` | GET | Single obligation |
| `/api/v1/obligations/{id}` | PATCH | Update obligation |
| `/api/v1/obligations/{id}/status` | POST | Status transition |
| `/api/v1/obligations/{id}/assign` | POST | Assignment |
| `/api/v1/obligations/{id}/interpret` | POST | Save interpretation |
| `/api/v1/review-queue` | GET | Queue items |
| `/api/v1/obligations/bulk/status` | POST | Bulk status change |
| `/api/v1/obligations/bulk/assign` | POST | Bulk assignment |
| `/api/v1/obligations/export` | POST | Export to file |

---

**END OF PART 2**

**Next:** Part 3 - Evidence & Confidence (Evidence upload, confidence badges, status indicators)
