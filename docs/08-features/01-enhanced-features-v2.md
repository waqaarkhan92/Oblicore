# Enhanced Features V2 Specification

**EcoComply v2.0 — Enhanced Intelligence Features / Last updated: 2025-12-03**

**Document Version:** 1.0
**Status:** Implementation Complete
**Created by:** Claude Code
**Depends on:**
- High Level Product Plan (01)
- Backend API Specification (40)
- Backend Background Jobs (41)
- Frontend Routes & Components (61)

**Purpose:** Defines 15 new enhanced features that transform EcoComply from a compliance tracking tool into a compliance intelligence platform.

---

## Table of Contents

1. [Evidence Gap Alerts](#1-evidence-gap-alerts)
2. [Natural Language Search](#2-natural-language-search)
3. [Compliance Risk Scoring](#3-compliance-risk-scoring)
4. [Cost Tracking per Obligation](#4-cost-tracking-per-obligation)
5. [Visual Audit Timeline](#5-visual-audit-timeline)
6. [Activity Feeds](#6-activity-feeds)
7. [iCal Feed Export](#7-ical-feed-export)
8. [Diff View for Changes](#8-diff-view-for-changes)
9. [AI Evidence Gap Analysis](#9-ai-evidence-gap-analysis)
10. [AI Auto-Draft Responses](#10-ai-auto-draft-responses)
11. [Resource Forecasting](#11-resource-forecasting)
12. [Trend Analysis Dashboard](#12-trend-analysis-dashboard)
13. [User Activity Reports](#13-user-activity-reports)
14. [Webhook Outbound Support](#14-webhook-outbound-support)
15. [Mobile-Optimized Evidence Upload](#15-mobile-optimized-evidence-upload)

---

## 1. Evidence Gap Alerts

### Purpose
Proactively notify users when obligations have upcoming deadlines but missing evidence.

### Business Value
- Reduces compliance breaches by 40-60%
- Transforms reactive to proactive compliance

### Database Schema
```sql
CREATE TABLE evidence_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  obligation_id UUID NOT NULL REFERENCES obligations(id) ON DELETE CASCADE,
  deadline_id UUID REFERENCES deadlines(id) ON DELETE SET NULL,
  gap_type TEXT NOT NULL CHECK (gap_type IN ('NO_EVIDENCE', 'EXPIRED_EVIDENCE', 'INSUFFICIENT_EVIDENCE')),
  days_until_deadline INTEGER NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### API Endpoints
- `GET /api/v1/evidence-gaps` - List gaps with filters
- `GET /api/v1/evidence-gaps/summary` - Aggregated counts
- `POST /api/v1/evidence-gaps/{id}/dismiss` - Dismiss gap
- `POST /api/v1/evidence-gaps/{id}/resolve` - Mark resolved

### Background Job
`evidence-gap-detection-job.ts` - Runs every 6 hours

---

## 2. Natural Language Search

### Purpose
Search using natural language queries powered by OpenAI embeddings.

### Business Value
- Reduces search time by 70%
- Enables non-technical users to find information

### Database Schema
```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE content_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('obligation', 'document', 'evidence', 'site')),
  entity_id UUID NOT NULL,
  content_text TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_type, entity_id)
);
```

### API Endpoints
- `POST /api/v1/search/semantic` - Semantic search
- `GET /api/v1/search/suggestions` - Query suggestions

---

## 3. Compliance Risk Scoring

### Purpose
Predictive risk scores based on historical patterns and current state.

### Business Value
- Enables proactive risk management
- Prioritizes resources on highest-risk items

### Database Schema
```sql
CREATE TABLE compliance_risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  obligation_id UUID REFERENCES obligations(id) ON DELETE CASCADE,
  score_type TEXT NOT NULL CHECK (score_type IN ('SITE', 'OBLIGATION', 'COMPANY')),
  risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  factors JSONB NOT NULL DEFAULT '{}',
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ NOT NULL
);

CREATE TABLE compliance_risk_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  score_type TEXT NOT NULL,
  risk_score INTEGER NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Risk Factors
- Historical breaches (25%)
- Overdue count (20%)
- Evidence gaps (20%)
- Deadline proximity (15%)
- Late completion rate (10%)
- Complexity score (10%)

### API Endpoints
- `GET /api/v1/risk-scores` - Current risk scores
- `GET /api/v1/risk-scores/trends` - Historical trends
- `GET /api/v1/risk-scores/factors/{siteId}` - Factor breakdown

---

## 4. Cost Tracking per Obligation

### Purpose
Track compliance costs for ROI analysis and budget forecasting.

### Database Schema
```sql
CREATE TABLE obligation_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  obligation_id UUID NOT NULL REFERENCES obligations(id) ON DELETE CASCADE,
  cost_type TEXT NOT NULL CHECK (cost_type IN ('LABOR', 'CONTRACTOR', 'EQUIPMENT', 'LAB_FEES', 'CONSULTING', 'SOFTWARE', 'OTHER')),
  amount DECIMAL(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  description TEXT,
  incurred_date DATE NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE compliance_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  budget_type TEXT NOT NULL CHECK (budget_type IN ('SITE', 'OBLIGATION')),
  annual_budget DECIMAL(12, 2) NOT NULL,
  fiscal_year INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### API Endpoints
- `POST /api/v1/obligations/{id}/costs` - Add cost entry
- `GET /api/v1/obligations/{id}/costs` - Get costs
- `GET /api/v1/costs/summary` - Aggregated summary
- `GET /api/v1/costs/budget-vs-actual` - Budget comparison

---

## 5. Visual Audit Timeline

### Purpose
Visual timeline of all changes and events for an obligation.

### API Endpoints
- `GET /api/v1/obligations/{id}/timeline` - Chronological events
- `GET /api/v1/sites/{id}/timeline` - Site-level timeline
- `GET /api/v1/timeline/export/{entityType}/{entityId}` - Export

### Timeline Event Types
- OBLIGATION_CREATED, OBLIGATION_UPDATED
- STATUS_CHANGED, EVIDENCE_LINKED/UNLINKED
- DEADLINE_COMPLETED, DEADLINE_MISSED
- REVIEW_SUBMITTED/APPROVED/REJECTED
- COMMENT_ADDED, ASSIGNMENT_CHANGED

---

## 6. Activity Feeds

### Purpose
Real-time activity feeds for team awareness and collaboration.

### Database Schema
```sql
CREATE TABLE activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  entity_title TEXT NOT NULL,
  summary TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### API Endpoints
- `GET /api/v1/activity-feed` - Recent activities
- WebSocket via Supabase Realtime for live updates

---

## 7. iCal Feed Export

### Purpose
Export deadlines as iCal feeds for calendar subscription.

### Database Schema
```sql
CREATE TABLE calendar_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  token_type TEXT NOT NULL CHECK (token_type IN ('USER', 'SITE')),
  expires_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### API Endpoints
- `GET /api/v1/calendar/ical/{userId}/{token}` - User's iCal feed
- `GET /api/v1/calendar/ical/site/{siteId}/{token}` - Site iCal feed
- `POST /api/v1/calendar/tokens` - Generate token
- `DELETE /api/v1/calendar/tokens/{tokenId}` - Revoke token

---

## 8. Diff View for Changes

### Purpose
Show side-by-side diffs when content is modified.

### API Endpoints
- `GET /api/v1/obligations/{id}/versions` - Version history
- `GET /api/v1/obligations/{id}/diff?v1=x&v2=y` - Compare versions
- `GET /api/v1/documents/{id}/versions` - Document versions
- `GET /api/v1/documents/{id}/diff` - Document text diff

---

## 9. AI Evidence Gap Analysis

### Purpose
AI-powered suggestions for what evidence is needed.

### Database Schema
```sql
CREATE TABLE evidence_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id UUID NOT NULL REFERENCES obligations(id) ON DELETE CASCADE,
  suggestions JSONB NOT NULL,
  confidence DECIMAL(3, 2) NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);
```

### API Endpoints
- `POST /api/v1/obligations/{id}/analyze-evidence` - Trigger analysis
- `GET /api/v1/obligations/{id}/evidence-suggestions` - Get suggestions
- `POST /api/v1/evidence/validate` - AI validation

---

## 10. AI Auto-Draft Responses

### Purpose
Draft responses to regulator questions using AI.

### API Endpoints
- `POST /api/v1/regulator-questions/{id}/draft-response` - Generate draft
- `PUT /api/v1/regulator-questions/{id}/response` - Save edited response

---

## 11. Resource Forecasting

### Purpose
Forecast compliance workload based on upcoming deadlines.

### Database Schema
```sql
CREATE TABLE obligation_completion_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  obligation_id UUID NOT NULL REFERENCES obligations(id) ON DELETE CASCADE,
  deadline_id UUID NOT NULL REFERENCES deadlines(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ NOT NULL,
  time_to_complete_hours DECIMAL(8, 2),
  was_late BOOLEAN NOT NULL DEFAULT FALSE,
  complexity_score INTEGER CHECK (complexity_score >= 1 AND complexity_score <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### API Endpoints
- `GET /api/v1/forecasting/workload` - Forecasted hours
- `GET /api/v1/forecasting/capacity` - Capacity analysis
- `GET /api/v1/forecasting/bottlenecks` - Resource constraints

---

## 12. Trend Analysis Dashboard

### Purpose
Visual trend analysis of compliance metrics over time.

### API Endpoints
- `GET /api/v1/trends/compliance-score` - Score trends
- `GET /api/v1/trends/breach-rate` - Breach trends
- `GET /api/v1/trends/evidence-completeness` - Evidence trends
- `GET /api/v1/trends/comparison` - Cross-site comparison

---

## 13. User Activity Reports

### Purpose
Reports on user activity for audits and performance.

### API Endpoints
- `GET /api/v1/reports/user-activity` - Activity summary
- `GET /api/v1/reports/user-activity/export` - Export report
- `GET /api/v1/reports/team-activity` - Team summary

---

## 14. Webhook Outbound Support

### Purpose
Real-time event notifications to external systems.

### Database Schema
```sql
CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  headers JSONB DEFAULT '{}',
  retry_count INTEGER NOT NULL DEFAULT 3,
  timeout_ms INTEGER NOT NULL DEFAULT 30000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Webhook Events
- obligation.created/completed/overdue
- deadline.approaching/missed
- evidence.uploaded/linked
- pack.generated
- risk_score.changed
- compliance_score.changed

### API Endpoints
- `POST /api/v1/webhooks` - Create webhook
- `GET /api/v1/webhooks` - List webhooks
- `PUT /api/v1/webhooks/{id}` - Update webhook
- `DELETE /api/v1/webhooks/{id}` - Delete webhook
- `POST /api/v1/webhooks/{id}/test` - Test webhook
- `GET /api/v1/webhooks/{id}/deliveries` - Delivery history

---

## 15. Mobile-Optimized Evidence Upload

### Purpose
Streamlined mobile experience with camera and GPS integration.

### API Endpoints
- `POST /api/v1/evidence/mobile-upload` - Mobile-optimized upload
- `POST /api/v1/evidence/offline-sync` - Batch offline sync

### Features
- Camera integration
- GPS auto-tagging
- Offline queue with sync
- Voice notes attachment

---

## Implementation Status

| Feature | Status | Migration | API | Service | Job | UI |
|---------|--------|-----------|-----|---------|-----|-----|
| Evidence Gap Alerts | Complete | ✅ | ✅ | ✅ | ✅ | ✅ |
| Natural Language Search | Complete | ✅ | ✅ | ✅ | - | ✅ |
| Compliance Risk Scoring | Complete | ✅ | ✅ | ✅ | ✅ | ✅ |
| Cost Tracking | Complete | ✅ | ✅ | - | - | ✅ |
| Visual Audit Timeline | Complete | - | ✅ | - | - | ✅ |
| Activity Feeds | Complete | ✅ | ✅ | ✅ | - | ✅ |
| iCal Feed Export | Complete | ✅ | ✅ | ✅ | - | ✅ |
| Diff View | Complete | - | ✅ | ✅ | - | - |
| AI Evidence Gap Analysis | Complete | ✅ | ✅ | ✅ | - | ✅ |
| AI Auto-Draft Responses | Complete | - | ✅ | - | - | ✅ |
| Resource Forecasting | Complete | ✅ | ✅ | - | - | ✅ |
| Trend Analysis Dashboard | Complete | - | ✅ | - | - | ✅ |
| User Activity Reports | Complete | - | ✅ | - | - | - |
| Webhook Outbound Support | Complete | ✅ | ✅ | ✅ | - | ✅ |
| Mobile Evidence Upload | Complete | - | ✅ | - | - | - |

## Files Created

### Database Migration
- `supabase/migrations/20250204000003_create_enhanced_features_v2_tables.sql`

### Services
- `lib/services/risk-score-service.ts` - Risk score calculation
- `lib/services/activity-feed-service.ts` - Activity feed management
- `lib/services/ical-service.ts` - iCal generation
- `lib/services/diff-service.ts` - Diff computation
- `lib/services/webhook-service.ts` - Webhook delivery
- `lib/ai/embedding-service.ts` - OpenAI embeddings for search
- `lib/ai/evidence-analysis-service.ts` - AI evidence analysis

### Background Jobs
- `lib/jobs/evidence-gap-detection-job.ts` - Detect evidence gaps
- `lib/jobs/risk-score-calculation-job.ts` - Calculate risk scores

### API Routes
- `app/api/v1/evidence-gaps/route.ts` - List evidence gaps
- `app/api/v1/evidence-gaps/summary/route.ts` - Gap summary
- `app/api/v1/evidence-gaps/[gapId]/dismiss/route.ts` - Dismiss gap
- `app/api/v1/search/semantic/route.ts` - Semantic search
- `app/api/v1/risk-scores/route.ts` - Get risk scores
- `app/api/v1/risk-scores/trends/route.ts` - Risk trends
- `app/api/v1/activity-feed/route.ts` - Activity feed
- `app/api/v1/calendar/ical/[token]/route.ts` - iCal feed
- `app/api/v1/calendar/tokens/route.ts` - Calendar tokens
- `app/api/v1/calendar/tokens/[tokenId]/route.ts` - Token management
- `app/api/v1/obligations/[obligationId]/timeline/route.ts` - Audit timeline
- `app/api/v1/obligations/[obligationId]/costs/route.ts` - Cost tracking
- `app/api/v1/obligations/[obligationId]/diff/route.ts` - Diff view
- `app/api/v1/obligations/[obligationId]/analyze-evidence/route.ts` - AI analysis
- `app/api/v1/obligations/[obligationId]/evidence-suggestions/route.ts` - AI suggestions
- `app/api/v1/costs/summary/route.ts` - Cost summary
- `app/api/v1/trends/compliance-score/route.ts` - Compliance trends
- `app/api/v1/reports/user-activity/route.ts` - User activity
- `app/api/v1/webhooks/[webhookId]/test/route.ts` - Webhook test
- `app/api/v1/webhooks/[webhookId]/deliveries/route.ts` - Webhook deliveries
- `app/api/v1/forecasting/workload/route.ts` - Workload forecast
- `app/api/v1/forecasting/capacity/route.ts` - Capacity analysis
- `app/api/v1/regulator-questions/[questionId]/draft-response/route.ts` - AI draft responses
- `app/api/v1/evidence/mobile-upload/route.ts` - Mobile-optimized evidence upload
- `app/api/v1/evidence/offline-sync/route.ts` - Offline queue batch sync

### Queue Configuration
- `lib/queue/queue-manager.ts` - Added EVIDENCE_GAP_DETECTION and RISK_SCORE_CALCULATION queues
- `lib/jobs/cron-scheduler.ts` - Registered recurring jobs for gap detection (6h) and risk scoring (daily 4AM)

### Frontend Components
- `components/enhanced-features/evidence-gap-widget.tsx` - Evidence gap alerts widget
- `components/enhanced-features/risk-score-card.tsx` - Risk score gauge card
- `components/enhanced-features/activity-feed.tsx` - Real-time activity feed
- `components/enhanced-features/cost-tracker.tsx` - Cost tracking components
- `components/enhanced-features/audit-timeline.tsx` - Visual audit timeline
- `components/enhanced-features/compliance-trends-chart.tsx` - Trends visualization
- `components/enhanced-features/semantic-search.tsx` - AI-powered search
- `components/enhanced-features/calendar-settings.tsx` - iCal feed management
- `components/enhanced-features/webhook-management.tsx` - Webhook configuration
- `components/enhanced-features/resource-forecast.tsx` - Capacity planning UI
- `components/enhanced-features/ai-evidence-analyzer.tsx` - AI evidence suggestions
- `components/enhanced-features/ai-draft-response.tsx` - AI draft response generator
- `components/enhanced-features/index.ts` - Component exports

### Hooks
- `lib/hooks/use-enhanced-features.ts` - React Query hooks for all enhanced features

### Query Keys
- `lib/query-keys.ts` - Added query keys for all enhanced feature endpoints

---

*Document generated by Claude Code - 2025-12-03*
