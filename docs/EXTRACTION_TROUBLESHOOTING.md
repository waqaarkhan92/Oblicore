# Extraction Troubleshooting Guide

## Issue: Progress Bar Stuck at 10% and No Obligations

### Root Causes

1. **Worker Not Running** - Most common issue
   - The background worker must be running to process extraction jobs
   - Check: Is `npm run worker` running?

2. **Job Stuck in Queue**
   - Job might be stuck in PROCESSING or EXTRACTING status
   - Check: Query `background_jobs` table for job status

3. **Extraction Returning 0 Obligations**
   - LLM extraction might be failing or returning empty results
   - Check: Worker logs for extraction errors

4. **Obligations Not Being Created**
   - Obligation creation might be failing silently
   - Check: Worker logs for creation errors

### How to Diagnose

#### 1. Check Worker Status
```bash
# Check if worker process is running
ps aux | grep "worker\|tsx.*workers"

# Or check PM2 if using PM2
pm2 list
```

#### 2. Check Recent Documents
```sql
SELECT id, title, extraction_status, created_at, updated_at 
FROM documents 
WHERE deleted_at IS NULL 
ORDER BY created_at DESC 
LIMIT 10;
```

#### 3. Check Background Jobs
```sql
SELECT id, status, job_type, entity_id, created_at, updated_at, result
FROM background_jobs
WHERE job_type = 'DOCUMENT_EXTRACTION'
ORDER BY created_at DESC
LIMIT 10;
```

#### 4. Check Obligations
```sql
SELECT id, document_id, obligation_title, deleted_at
FROM obligations
WHERE document_id = '<your-document-id>'
AND deleted_at IS NULL;
```

#### 5. Check Worker Logs
Look for logs starting with:
- `📋 Starting extraction for document...`
- `📋 Extraction result: X obligations...`
- `✅ Obligation creation result: X created...`
- `❌` for any errors

### Common Fixes

#### Fix 1: Start the Worker
```bash
npm run worker
# Or if using PM2:
pm2 start ecosystem.config.js
```

#### Fix 2: Retry Failed Jobs
If a job failed, you can manually retry it via the API:
```bash
POST /api/v1/documents/{documentId}/extract
```

#### Fix 3: Check Redis Connection
The worker needs Redis to process jobs:
```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG
```

#### Fix 4: Check Environment Variables
Ensure all required env vars are set:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `REDIS_URL`

### Status Flow

Normal flow:
1. `PENDING` → Job queued
2. `PROCESSING` → Job started, downloading file
3. `EXTRACTING` → Text extracted, extracting obligations
4. `COMPLETED` → Obligations created

If stuck:
- Stuck at `PROCESSING` → Worker might not be running or job failed
- Stuck at `EXTRACTING` → Extraction might be taking too long or failed
- `COMPLETED` but no obligations → Extraction returned 0 obligations or creation failed

### Debug Endpoints

Check extraction status:
```
GET /api/v1/documents/{documentId}/extraction-status
```

Check obligations:
```
GET /api/v1/documents/{documentId}/obligations
```

### Next Steps

1. **Verify worker is running** - This is the #1 issue
2. **Check worker logs** - Look for errors or warnings
3. **Check database** - Verify document status and job status
4. **Check Redis** - Ensure queue is working
5. **Review extraction logs** - See if extraction is actually running

