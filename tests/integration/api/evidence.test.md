# Evidence API Integration Tests

Comprehensive integration tests for the Evidence API endpoints.

## Overview

This test suite covers all Evidence API endpoints with 37 test cases across 6 test suites:

1. **GET /api/v1/evidence** - List evidence with filtering and pagination (10 tests)
2. **POST /api/v1/evidence** - Upload evidence files (13 tests)
3. **GET /api/v1/evidence/[evidenceId]** - Get single evidence item (7 tests)
4. **PUT /api/v1/evidence/[evidenceId]** - Update evidence metadata (2 tests - skipped)
5. **DELETE /api/v1/evidence/[evidenceId]** - Delete evidence (3 tests - skipped)
6. **Edge Cases and Error Handling** - Various edge cases (8 tests)

## Running the Tests

### Prerequisites

1. Running Supabase instance (local or remote)
2. Environment variables configured:
   ```bash
   SUPABASE_URL=http://localhost:54321
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
   ```

### Run All Tests

```bash
RUN_INTEGRATION_TESTS=true npm test -- tests/integration/api/evidence.test.ts
```

### Run Specific Test Suite

```bash
RUN_INTEGRATION_TESTS=true npm test -- tests/integration/api/evidence.test.ts -t "GET /api/v1/evidence"
```

### Run Single Test

```bash
RUN_INTEGRATION_TESTS=true npm test -- tests/integration/api/evidence.test.ts -t "should return 401 for unauthenticated"
```

### Run with Coverage

```bash
RUN_INTEGRATION_TESTS=true npm test -- tests/integration/api/evidence.test.ts --coverage
```

## Test Coverage

### GET /api/v1/evidence - List Evidence

| Test Case | What It Tests |
|-----------|---------------|
| Returns 401 for unauthenticated | Auth middleware works |
| Returns empty array when no evidence | Handles empty state |
| Filters by site_id | Query parameter filtering |
| Filters by company_id | Query parameter filtering |
| Filters by obligation_id | Joins with obligation_evidence_links |
| Paginates with limit | Pagination implementation |
| Returns 422 for invalid pagination | Input validation |
| Sorts by created_at | Default sorting |
| Includes file_url | Storage URL generation |
| Enforces RLS | Row-level security |

### POST /api/v1/evidence - Upload Evidence

| Test Case | What It Tests |
|-----------|---------------|
| Returns 401 for unauthenticated | Auth middleware |
| Returns 403 without required role | RBAC enforcement |
| Uploads PDF successfully | Happy path file upload |
| Uploads image successfully | Image file handling |
| Returns 422 when file missing | Required field validation |
| Returns 422 when obligation_id missing | Required field validation |
| Returns 404 when obligation not found | Foreign key validation |
| Returns 422 for invalid file type | File type validation |
| Returns 413 for oversized file | File size limits |
| Supports multiple obligation_ids | Array parameter handling |
| Calculates file hash | SHA-256 hash generation |
| Stores file metadata | Metadata extraction |
| Returns 422 for cross-site obligations | Business rule validation |

### GET /api/v1/evidence/[evidenceId] - Get Single Item

| Test Case | What It Tests |
|-----------|---------------|
| Returns 401 for unauthenticated | Auth middleware |
| Returns evidence by ID | Happy path retrieval |
| Returns 404 for non-existent | Error handling |
| Returns 404 for invalid UUID | Input validation |
| Includes linked obligations | Relationship loading |
| Returns 403 without access | RLS enforcement |
| Does not return archived items | Soft delete filtering |

### Edge Cases and Error Handling

| Test Case | What It Tests |
|-----------|---------------|
| Handles malformed JSON metadata | Error recovery |
| Handles special characters in filename | String escaping |
| Handles very long descriptions | Field length limits |
| Handles concurrent uploads | Race conditions |
| Includes request_id in responses | Request tracking |
| Includes Cache-Control headers | HTTP caching |
| Includes rate limit headers | Rate limiting |

## Test Data

### Test Fixtures

The tests create the following fixtures in `beforeAll`:

```typescript
- Test User (test-evidence@example.com)
- Test Company (Evidence Test Company)
- Test Site (Evidence Test Site)
- Test Obligation (Test Obligation for Evidence)
```

All test data is cleaned up in `afterAll` using the `cleanupTestData()` helper.

### Mock Files

The tests use mock file buffers from `@/tests/helpers/mock-data`:

- `mockPDFBuffer()` - Minimal valid PDF (< 1KB)
- `mockPNGBuffer()` - 1x1 pixel transparent PNG
- `mockJPEGBuffer()` - Minimal valid JPEG
- `mockCSVBuffer()` - Sample CSV data

## Key Test Patterns

### Authentication Testing

```typescript
// Unauthenticated request
await request(API_BASE)
  .get('/evidence')
  .expect(401);

// Authenticated request
await request(API_BASE)
  .get('/evidence')
  .set('Authorization', `Bearer ${authToken}`)
  .expect(200);
```

### File Upload Testing

```typescript
await request(API_BASE)
  .post('/evidence')
  .set('Authorization', `Bearer ${authToken}`)
  .attach('file', mockPDFBuffer(), 'test.pdf')
  .field('obligation_id', obligationId)
  .field('metadata', JSON.stringify({ description: 'Test' }))
  .expect(201);
```

### RLS Testing

```typescript
// Create separate user/company
const otherUserToken = await createTestUser('other@example.com');
const otherCompany = await createTestCompany('Other Company');

// Try to access first user's data
const response = await request(API_BASE)
  .get('/evidence')
  .query({ site_id: firstUserSiteId })
  .set('Authorization', `Bearer ${otherUserToken}`)
  .expect(200);

expect(response.body.data.length).toBe(0); // RLS blocks access
```

## Extending the Tests

### Adding New Test Cases

1. Identify the endpoint and scenario
2. Add test case to appropriate `describe` block
3. Use existing helpers and patterns
4. Verify assertions match actual behavior

Example:

```typescript
it('should filter by file_type', async () => {
  const response = await request(API_BASE)
    .get('/evidence')
    .query({ file_type: 'PDF' })
    .set('Authorization', `Bearer ${authToken}`)
    .expect(200);

  response.body.data.forEach((item: any) => {
    expect(item.file_type).toBe('PDF');
  });
});
```

### Testing New Endpoints

When new endpoints are added (PUT, DELETE), unskip the placeholder tests:

```typescript
// Change from:
it.skip('should update evidence metadata', async () => {
  // ...
});

// To:
it('should update evidence metadata', async () => {
  // ...
});
```

## Common Issues

### Tests Skipped by Default

The tests are skipped unless `RUN_INTEGRATION_TESTS=true` is set. This prevents them from running in CI/CD where the server may not be available.

### File Upload Errors

If file upload tests fail:
1. Check Supabase storage bucket exists (`evidence`)
2. Verify storage policies allow authenticated users
3. Check file size limits in environment

### RLS Policy Errors

If RLS tests fail:
1. Verify RLS policies are applied to `evidence_items` table
2. Check user has access through `company_users` or `site_users`
3. Review RLS helper functions in database

### Timeout Errors

For slow tests, increase Jest timeout:

```typescript
jest.setTimeout(30000); // 30 seconds
```

## Performance Considerations

### Test Isolation

Each test is isolated but shares fixtures from `beforeAll`. This speeds up test execution while maintaining independence.

### Parallel Execution

Tests can run in parallel within a suite but not across suites due to shared fixtures.

### Database Cleanup

The `cleanupTestData()` function deletes in reverse dependency order:
1. obligation_evidence_links
2. evidence_items
3. deadlines
4. obligations
5. documents
6. sites
7. companies

## Future Improvements

- [ ] Add tests for file download endpoint
- [ ] Add tests for evidence validation workflow
- [ ] Add tests for chain-of-custody tracking
- [ ] Add tests for evidence expiration
- [ ] Add performance benchmarks
- [ ] Add load testing scenarios
- [ ] Test storage quota enforcement
- [ ] Test duplicate file detection

## Related Documentation

- [API Response Format](../../../lib/api/response.ts)
- [Evidence API Routes](../../../app/api/v1/evidence/route.ts)
- [Test Database Helpers](../../helpers/test-database.ts)
- [Mock Data Generators](../../helpers/mock-data.ts)
