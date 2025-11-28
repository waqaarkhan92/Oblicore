# Testing & Quality Assurance Strategy

**Version:** 1.0  
**Created:** 2025-01-28  
**Purpose:** Comprehensive testing strategy to ensure system works as expected

---

## Current State Assessment

### ✅ What's Good
- Build order has checkpoints
- Manual validation scripts provided
- Acceptance criteria defined per phase

### ⚠️ What's Missing
- **Automated test suites** (currently manual checkpoints only)
- **Continuous Integration** (tests don't run automatically)
- **Integration tests** (components tested in isolation)
- **E2E test automation** (Playwright/Cypress)
- **Performance benchmarks** (no SLA definitions)
- **Monitoring/observability** (no health dashboards)
- **Security testing** (no penetration tests)
- **Accessibility testing** (WCAG compliance)

---

## Recommended Testing Strategy

### 1. Automated Test Suites (Critical)

**Why:** Manual checkpoints are error-prone and don't scale.

**What to Add:**

#### Unit Tests (Per Component)
```typescript
// Example: RLS helper function test
describe('has_company_access', () => {
  it('should return true for user in same company', async () => {
    const result = await has_company_access(userId, companyId);
    expect(result).toBe(true);
  });
  
  it('should return false for user in different company', async () => {
    const result = await has_company_access(userId, otherCompanyId);
    expect(result).toBe(false);
  });
});
```

**Coverage Target:** >80% for critical functions

#### Integration Tests (API + Database)
```typescript
// Example: Document upload integration test
describe('POST /api/v1/documents/upload', () => {
  it('should create document and trigger processing job', async () => {
    const response = await request(app)
      .post('/api/v1/documents/upload')
      .attach('file', testPdf)
      .field('site_id', siteId);
    
    expect(response.status).toBe(201);
    expect(response.body.extraction_status).toBe('PROCESSING');
    
    // Verify job created
    const job = await db.query('SELECT * FROM background_jobs WHERE ...');
    expect(job.rows[0].job_type).toBe('DOCUMENT_PROCESSING');
  });
});
```

**Coverage Target:** >70% for API endpoints

#### E2E Tests (Full User Journeys)
```typescript
// Example: Complete signup → upload → extract workflow
test('complete user onboarding flow', async ({ page }) => {
  // Signup
  await page.goto('/signup');
  await page.fill('[name="company_name"]', 'Test Co');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'Test1234!');
  await page.click('button[type="submit"]');
  
  // Upload document
  await page.goto('/documents');
  await page.setInputFiles('input[type="file"]', 'test-permit.pdf');
  await page.click('button:has-text("Upload")');
  
  // Wait for extraction
  await page.waitForSelector('text=Extraction Complete', { timeout: 60000 });
  
  // Verify obligations created
  await page.goto('/obligations');
  const obligationCount = await page.locator('tbody tr').count();
  expect(obligationCount).toBeGreaterThan(0);
});
```

**Coverage Target:** All critical user journeys

---

### 2. Continuous Integration (CI/CD)

**Setup GitHub Actions or similar:**

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test:e2e
      - run: npm run lint
      - run: npm run type-check
```

**Benefits:**
- Tests run automatically on every commit
- Catch bugs before they reach main
- Prevent regressions

---

### 3. Performance Benchmarks & SLAs

**Define SLAs for each phase:**

| Metric | Target | How to Measure |
|--------|--------|----------------|
| API Response Time (p95) | <200ms | APM tool (Sentry, Datadog) |
| Page Load Time | <3s | Lighthouse, WebPageTest |
| Database Query Time (p95) | <100ms | PostgreSQL slow query log |
| Document Extraction Time | <30s (standard) | Background job logs |
| Background Job Completion | <5min | Job status tracking |
| Error Rate | <1% | Error tracking (Sentry) |

**Implementation:**
```typescript
// Performance monitoring middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 200) {
      logger.warn(`Slow request: ${req.path} took ${duration}ms`);
    }
    metrics.record('api.response_time', duration);
  });
  next();
});
```

---

### 4. Health Monitoring & Observability

**Set up monitoring dashboards:**

#### Health Check Endpoint (Enhanced)
```typescript
GET /api/v1/health
{
  "status": "healthy",
  "timestamp": "2025-01-28T12:00:00Z",
  "services": {
    "database": {
      "status": "healthy",
      "response_time_ms": 15,
      "connection_pool": {
        "active": 5,
        "idle": 45,
        "max": 50
      }
    },
    "redis": {
      "status": "healthy",
      "response_time_ms": 2
    },
    "storage": {
      "status": "healthy",
      "quota_used_percent": 12
    },
    "openai": {
      "status": "healthy",
      "rate_limit_remaining": 5000
    }
  },
  "metrics": {
    "api_requests_per_minute": 45,
    "error_rate_percent": 0.2,
    "average_response_time_ms": 120
  }
}
```

#### Monitoring Dashboard (Grafana/Supabase Dashboard)
- Real-time API request rate
- Error rate by endpoint
- Database query performance
- Background job queue depth
- OpenAI API usage/costs
- User activity metrics

---

### 5. Security Testing

**Add security test suite:**

```typescript
describe('Security Tests', () => {
  it('should prevent SQL injection', async () => {
    const maliciousInput = "'; DROP TABLE users; --";
    const response = await request(app)
      .get(`/api/v1/obligations?search=${maliciousInput}`);
    
    // Should not crash, should sanitize input
    expect(response.status).not.toBe(500);
  });
  
  it('should prevent XSS attacks', async () => {
    const xssPayload = '<script>alert("XSS")</script>';
    const response = await request(app)
      .post('/api/v1/obligations')
      .send({ obligation_text: xssPayload });
    
    // Should sanitize HTML
    expect(response.body.obligation_text).not.toContain('<script>');
  });
  
  it('should enforce RLS policies', async () => {
    // User 1 creates data
    const user1Token = await login('user1@example.com');
    const doc = await createDocument(user1Token, { company_id: 'company1' });
    
    // User 2 tries to access (should fail)
    const user2Token = await login('user2@example.com');
    const response = await request(app)
      .get(`/api/v1/documents/${doc.id}`)
      .set('Authorization', `Bearer ${user2Token}`);
    
    expect(response.status).toBe(403); // Forbidden
  });
});
```

---

### 6. Accessibility Testing

**Add a11y tests:**

```typescript
import { injectAxe, checkA11y } from 'axe-playwright';

test('dashboard should be accessible', async ({ page }) => {
  await page.goto('/dashboard');
  await injectAxe(page);
  await checkA11y(page);
});
```

**WCAG 2.1 AA Compliance:**
- Keyboard navigation works
- Screen reader compatible
- Color contrast ratios meet standards
- Focus indicators visible

---

### 7. Load & Stress Testing

**Set up load tests:**

```typescript
// Using k6 or Artillery
import http from 'k6/http';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
};

export default function () {
  http.get('https://api.oblicore.com/api/v1/obligations');
}
```

**Test Scenarios:**
- 100 concurrent users
- 1000 documents uploaded simultaneously
- Background job queue under load (1000 jobs)
- Database connection pool exhaustion

---

### 8. User Acceptance Testing (UAT)

**Create UAT checklist:**

#### Critical User Journeys
- [ ] **Journey 1:** Signup → Upload Permit → Extract Obligations → Link Evidence → Generate Pack
  - **Expected:** Complete in <10 minutes
  - **Verify:** All steps work, no errors
  
- [ ] **Journey 2:** Multi-site company → Upload documents per site → View consolidated dashboard
  - **Expected:** Data isolated per site, dashboard aggregates correctly
  - **Verify:** No cross-site data leakage

- [ ] **Journey 3:** Consultant → Assign client → View client data → Generate client pack
  - **Expected:** Consultant sees only assigned clients
  - **Verify:** RLS policies work, pack generation succeeds

#### Feature Completeness
- [ ] All 5 pack types generate correctly
- [ ] All notification types send correctly
- [ ] All background jobs run on schedule
- [ ] All API endpoints return correct data
- [ ] All UI pages render correctly

---

### 9. Regression Testing

**Automated regression test suite:**

```typescript
// Run before every deployment
describe('Regression Tests', () => {
  it('should not break existing functionality', async () => {
    // Test all critical paths
    await testSignupFlow();
    await testDocumentUpload();
    await testObligationExtraction();
    await testEvidenceLinking();
    await testPackGeneration();
  });
});
```

**Run:** Before every merge to main, before every deployment

---

### 10. Production Monitoring

**Set up production observability:**

#### Error Tracking (Sentry)
- Track all errors in production
- Alert on error rate spikes
- Track error trends over time

#### Performance Monitoring (APM)
- Track API response times
- Identify slow queries
- Monitor background job performance

#### Business Metrics
- User signups per day
- Documents uploaded per day
- Obligations extracted per day
- Pack generations per day
- Active users (DAU/MAU)

---

## How to Know If Things Work

### Daily Checks (Automated)

1. **CI/CD Pipeline:**
   - All tests pass ✅
   - No linting errors ✅
   - Build succeeds ✅

2. **Health Dashboard:**
   - All services healthy ✅
   - Error rate <1% ✅
   - Response times within SLA ✅

3. **Background Jobs:**
   - All scheduled jobs run ✅
   - No jobs stuck in PROCESSING ✅
   - DLQ empty or low ✅

### Weekly Checks (Manual)

1. **User Acceptance:**
   - Test complete user journey
   - Verify all features work
   - Check for UI/UX issues

2. **Performance Review:**
   - Review slow query log
   - Check API response times
   - Review background job performance

3. **Security Audit:**
   - Review error logs for suspicious activity
   - Check RLS policies still enforced
   - Verify authentication working

### Monthly Checks

1. **Load Testing:**
   - Run full load test suite
   - Verify system handles expected load
   - Identify bottlenecks

2. **Security Testing:**
   - Run penetration tests
   - Review access logs
   - Check for vulnerabilities

3. **User Feedback:**
   - Review support tickets
   - Analyze user behavior
   - Identify pain points

---

## Recommended Test Structure

```
tests/
├── unit/
│   ├── rls/
│   │   └── helper-functions.test.ts
│   ├── api/
│   │   └── middleware.test.ts
│   └── utils/
│       └── validation.test.ts
├── integration/
│   ├── api/
│   │   ├── auth.test.ts
│   │   ├── documents.test.ts
│   │   └── obligations.test.ts
│   └── database/
│       └── rls-policies.test.ts
├── e2e/
│   ├── onboarding.test.ts
│   ├── document-upload.test.ts
│   └── pack-generation.test.ts
├── performance/
│   ├── api-load.test.ts
│   └── database-load.test.ts
└── security/
    ├── sql-injection.test.ts
    ├── xss.test.ts
    └── rls-enforcement.test.ts
```

---

## Test Data Management

### Test Database
- Separate test database (not production)
- Seed with realistic test data
- Reset between test runs

### Test Users
```typescript
const testUsers = {
  owner: { email: 'owner@test.com', role: 'OWNER' },
  admin: { email: 'admin@test.com', role: 'ADMIN' },
  staff: { email: 'staff@test.com', role: 'STAFF' },
  consultant: { email: 'consultant@test.com', role: 'CONSULTANT' },
  viewer: { email: 'viewer@test.com', role: 'VIEWER' }
};
```

### Test Documents
- `test-permit-small.pdf` (5 pages, standard extraction)
- `test-permit-large.pdf` (60 pages, large document timeout)
- `test-permit-corrupted.pdf` (error handling)
- `test-obligations.xlsx` (Excel import)

---

## Quality Gates

### Before Merging to Main
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Linting passes
- [ ] Type checking passes
- [ ] Code coverage >80%

### Before Deploying to Production
- [ ] All tests pass
- [ ] Performance benchmarks met
- [ ] Security tests pass
- [ ] UAT checklist complete
- [ ] Health checks pass
- [ ] Monitoring configured

---

## Recommended Tools

### Testing
- **Unit/Integration:** Jest, Vitest
- **E2E:** Playwright (recommended) or Cypress
- **API Testing:** Supertest
- **Load Testing:** k6 or Artillery

### Monitoring
- **Error Tracking:** Sentry
- **APM:** Datadog, New Relic, or Supabase Analytics
- **Logging:** Winston + Supabase Logs
- **Dashboards:** Grafana or Supabase Dashboard

### CI/CD
- **GitHub Actions** (recommended)
- **Vercel** (automatic deployments)
- **Railway/Render** (worker deployments)

---

## Implementation Priority

### Phase 1 (Critical - Do First)
1. ✅ Automated unit tests for RLS functions
2. ✅ Integration tests for API endpoints
3. ✅ E2E tests for critical user journeys
4. ✅ CI/CD pipeline (GitHub Actions)

### Phase 2 (Important - Do Soon)
5. ✅ Performance benchmarks
6. ✅ Health monitoring dashboard
7. ✅ Error tracking (Sentry)
8. ✅ Security test suite

### Phase 3 (Nice to Have)
9. ✅ Load testing suite
10. ✅ Accessibility testing
11. ✅ Advanced monitoring (APM)

---

## Success Metrics

**You'll know things work when:**

1. **Automated Tests:**
   - All tests pass on every commit ✅
   - Test coverage >80% ✅
   - No flaky tests ✅

2. **Production Metrics:**
   - Error rate <1% ✅
   - API response time <200ms (p95) ✅
   - Uptime >99.9% ✅

3. **User Experience:**
   - Onboarding completion rate >80% ✅
   - Document extraction success rate >95% ✅
   - User satisfaction score >4.5/5 ✅

4. **Business Metrics:**
   - Users can complete full workflow ✅
   - No critical bugs reported ✅
   - System handles expected load ✅

---

## Next Steps

1. **Add automated test suites** to build order (Phase 7.1)
2. **Set up CI/CD** before starting Phase 2
3. **Add monitoring** during Phase 2 (API layer)
4. **Create UAT checklist** before Phase 7
5. **Set up production monitoring** before launch

**Recommendation:** Add automated testing from the start (don't wait until Phase 7). Write tests alongside code.

