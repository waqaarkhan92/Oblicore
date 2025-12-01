# Critical Bugs Fixed - Extraction & Obligations

## Summary
Found and fixed **9 critical bugs** that were preventing document extraction and obligations from working.

---

## 🐛 Bug #1: Background Jobs Table Schema Mismatch (CRITICAL)

### Issue
- `updateJobStatus()` was querying `background_jobs` table using `entity_id` column
- **But the table doesn't have `entity_id` column!**
- Table only has `payload` (JSONB) column

### Impact
- Job status updates were failing silently
- Jobs couldn't be tracked or updated
- No way to know if extraction was running or failed

### Fix
Changed query from:
```typescript
.eq('entity_id', documentId)
```

To:
```typescript
.eq('payload->>document_id', documentId)
```

**File:** `lib/jobs/document-processing-job.ts`

---

## 🐛 Bug #2: Job Status Value Mismatch (CRITICAL)

### Issue
- Database table uses status: `'RUNNING'`
- Code was using status: `'PROCESSING'`
- Status check was failing because values didn't match

### Impact
- Active job detection was broken
- Couldn't prevent duplicate extractions
- Status updates weren't working

### Fix
- Updated status mapping: `'PROCESSING'` → `'RUNNING'` for database
- Updated status checks to use `'RUNNING'` instead of `'PROCESSING'`

**Files:**
- `lib/jobs/document-processing-job.ts`
- `app/api/v1/documents/[documentId]/extract/route.ts`

---

## 🐛 Bug #3: Wrong Column Names in Extract Route (CRITICAL)

### Issue
- Extract route was trying to insert `entity_id`, `entity_type`, `job_data`
- **But table only has `payload` column!**
- Also using wrong priority type (string instead of integer)

### Impact
- Job creation was failing
- Extraction jobs couldn't be queued
- Silent failures

### Fix
Changed from:
```typescript
{
  entity_id: documentId,
  entity_type: 'documents',
  job_data: { ... },
  priority: 'NORMAL',
}
```

To:
```typescript
{
  payload: {
    document_id: documentId,
    ...
  },
  priority: 5, // integer
}
```

**File:** `app/api/v1/documents/[documentId]/extract/route.ts`

---

## 🐛 Bug #4: Job Name Mismatch (CRITICAL)

### Issue
- Extract route was queuing job with name: `'document-extraction'`
- Worker was checking for: `'DOCUMENT_EXTRACTION'`
- **Names didn't match!**

### Impact
- Worker couldn't find jobs to process
- Jobs were queued but never executed
- Extraction never happened

### Fix
Changed job name from `'document-extraction'` to `'DOCUMENT_EXTRACTION'`

**File:** `app/api/v1/documents/[documentId]/extract/route.ts`

---

## 🐛 Bug #5: Progress Calculation Issues

### Issue
- Progress could be `null`, causing progress bar to not update
- Progress calculation wasn't using actual document status

### Impact
- Progress bar stuck at 10%
- No visual feedback during extraction

### Fix
- Progress always returns a number (never null)
- Uses actual document status for accurate progress
- Added minimum progress thresholds

**File:** `app/api/v1/documents/[documentId]/extraction-status/route.ts`

---

## 🐛 Bug #6: Invalid Status Query for Pattern Discovery (CRITICAL)

### Issue
- Pattern discovery query used `.is('status', null)` 
- But obligations always have status 'PENDING' when created, never null
- Query would never find obligations

### Impact
- Pattern discovery never worked
- Couldn't learn from successful extractions

### Fix
Changed from:
```typescript
.is('status', null)
```

To:
```typescript
.is('deleted_at', null)
```

**File:** `lib/jobs/document-processing-job.ts`

---

## 🐛 Bug #7: Non-Existent Column: extraction_started_at (CRITICAL)

### Issue
- Code tried to set `extraction_started_at` column
- **But this column doesn't exist in documents table!**
- Database update would fail silently

### Impact
- Status updates failing
- No way to track when extraction started

### Fix
Removed `extraction_started_at` from all update queries

**Files:**
- `app/api/v1/documents/route.ts`
- `app/api/v1/documents/[documentId]/extract/route.ts`

---

## 🐛 Bug #8: Invalid Status Value: EXTRACTING (CRITICAL)

### Issue
- Code tried to set `extraction_status = 'EXTRACTING'`
- **But 'EXTRACTING' is NOT in the database CHECK constraint!**
- Database would reject the update with constraint violation error

### Impact
- Status update would fail with database error
- Extraction would appear stuck
- Progress bar wouldn't update

### Fix
Changed status from `'EXTRACTING'` to `'PROCESSING'` (which is in the constraint)

**File:** `lib/jobs/document-processing-job.ts`

**Note:** Frontend still checks for 'EXTRACTING' for display purposes, but database only uses 'PROCESSING'

---

## 🐛 Bug #9: Non-Existent Columns: extraction_completed_at, obligation_count (CRITICAL)

### Issue
- Code tried to query `extraction_completed_at` and `obligation_count` columns
- **But these columns don't exist in documents table!**
- Query would fail or return null

### Impact
- Extraction results endpoint would fail
- No way to get completion timestamp
- Obligation count couldn't be retrieved

### Fix
Changed to use `updated_at` instead of `extraction_completed_at`
Removed `obligation_count` query (count obligations separately)

**File:** `app/api/v1/documents/[documentId]/extraction-results/route.ts`

---

## ✅ Additional Improvements

1. **Better Error Handling**
   - Added try-catch around obligation creation
   - Added validation for extracted text
   - Added detailed logging throughout pipeline

2. **Better Logging**
   - Added console logs at each step
   - Added warnings for stuck jobs (>5 minutes)
   - Added error details for debugging

3. **Status Update Improvements**
   - Status updates now throw errors if they fail
   - Added verification checks before/after updates
   - Added better error messages

---

## 🔧 How to Verify Fixes

1. **Start the Worker**
   ```bash
   npm run worker
   ```

2. **Upload a Document**
   - Upload via API or UI
   - Check that job is created in `background_jobs` table

3. **Check Job Status**
   ```sql
   SELECT id, status, payload->>'document_id', created_at, updated_at
   FROM background_jobs
   WHERE job_type = 'DOCUMENT_EXTRACTION'
   ORDER BY created_at DESC
   LIMIT 5;
   ```

4. **Check Document Status**
   ```sql
   SELECT id, extraction_status, created_at, updated_at
   FROM documents
   WHERE deleted_at IS NULL
   ORDER BY created_at DESC
   LIMIT 5;
   ```

5. **Check Obligations**
   ```sql
   SELECT COUNT(*) 
   FROM obligations 
   WHERE document_id = '<your-doc-id>' 
   AND deleted_at IS NULL;
   ```

---

## 📋 Files Modified

1. `lib/jobs/document-processing-job.ts` - Fixed job status updates, pattern discovery query, invalid EXTRACTING status
2. `app/api/v1/documents/[documentId]/extract/route.ts` - Fixed job creation, removed non-existent columns
3. `app/api/v1/documents/[documentId]/extraction-status/route.ts` - Fixed progress calculation
4. `app/api/v1/documents/[documentId]/extraction-results/route.ts` - Fixed non-existent column queries
5. `app/api/v1/documents/route.ts` - Fixed non-existent column usage
6. `lib/ai/obligation-creator.ts` - Added better error handling
7. `app/dashboard/documents/[id]/page.tsx` - Fixed progress bar display

---

## 🚨 IMPORTANT: Worker Must Be Running

**The worker MUST be running for extraction to work!**

```bash
# Start worker
npm run worker

# Or with PM2
pm2 start ecosystem.config.js
```

Without the worker, jobs will be queued but never processed.

---

## Next Steps

1. ✅ All critical bugs fixed
2. ⚠️ **Start the worker** - This is required!
3. ⚠️ **Test extraction** - Upload a document and verify it works
4. ⚠️ **Monitor logs** - Check worker logs for any errors

