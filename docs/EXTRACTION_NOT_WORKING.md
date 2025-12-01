# Extraction Not Working - Troubleshooting Guide

## Problem
Test extraction works, but actual extraction in the application doesn't work and UI doesn't show results.

## Root Cause
The test creates a worker that processes jobs immediately, but in production, **the worker must be running as a separate process** to process jobs from the queue.

## Quick Fix

### 1. Check if Worker is Running

```bash
# Check if worker process is running
ps aux | grep "workers/index.ts" | grep -v grep
```

If nothing is returned, the worker is **not running**.

### 2. Start the Worker

```bash
# Start the worker (runs in foreground)
npm run worker
```

Or run it in the background:

```bash
# Start worker in background
npm run worker > worker.log 2>&1 &
```

### 3. Verify Worker is Processing Jobs

After starting the worker, you should see:
```
🚀 Auto-starting background workers (PDF extraction, etc.)...
✅ Background workers started successfully - PDF extraction is ready!
```

### 4. Check Queue Status

Run the diagnostic script:

```bash
tsx scripts/diagnose-extraction.ts
```

This will show:
- Redis connection status
- Jobs waiting in queue
- Failed jobs
- Recent documents and their extraction status

## Common Issues

### Issue 1: Worker Not Running
**Symptoms:**
- Documents upload successfully
- Extraction status stays at "PROCESSING" forever
- No obligations appear in UI
- Jobs are queued but not processing

**Solution:**
```bash
npm run worker
```

### Issue 2: Redis Not Connected
**Symptoms:**
- Worker fails to start
- Error: "REDIS_URL environment variable is required"
- Error: "Redis connection error"

**Solution:**
1. Check `.env.local` has `REDIS_URL` set
2. Verify Redis is running and accessible
3. Test connection: `tsx scripts/test-redis-connection.ts`

### Issue 3: Jobs Failing Silently
**Symptoms:**
- Worker is running
- Jobs are processed but fail
- No error shown in UI

**Solution:**
1. Check worker logs for errors
2. Run diagnostic: `tsx scripts/diagnose-extraction.ts`
3. Check `background_jobs` table for failed jobs:
   ```sql
   SELECT * FROM background_jobs 
   WHERE job_type = 'DOCUMENT_EXTRACTION' 
   AND status = 'FAILED' 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

### Issue 4: Auto-Start Not Working
**Symptoms:**
- Worker should start automatically but doesn't
- No worker logs on app startup

**Solution:**
1. Check `instrumentation.ts` is being called
2. Check Next.js config has `instrumentationHook: true`
3. Manually start worker: `npm run worker`

## Production Deployment

For production, use a process manager like PM2:

```bash
# Install PM2
npm install -g pm2

# Start worker with PM2
pm2 start npm --name "oblicore-worker" -- run worker

# Save PM2 config
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

Or use the provided `ecosystem.config.js`:

```bash
pm2 start ecosystem.config.js
```

## Testing

### Test Worker Connection
```bash
npm run test:worker
```

### Test Redis Connection
```bash
npm run test:redis
```

### Test Full Extraction Flow
```bash
npm test -- tests/quick-extraction.test.ts
```

## Debugging

### Check Recent Documents
```sql
SELECT id, title, extraction_status, created_at 
FROM documents 
ORDER BY created_at DESC 
LIMIT 5;
```

### Check Job Queue
```sql
SELECT id, job_type, status, created_at, started_at, completed_at, result
FROM background_jobs
WHERE job_type = 'DOCUMENT_EXTRACTION'
ORDER BY created_at DESC
LIMIT 10;
```

### Check Obligations
```sql
SELECT o.id, o.obligation_title, o.document_id, d.title
FROM obligations o
JOIN documents d ON o.document_id = d.id
WHERE d.id = '<document-id>'
AND o.deleted_at IS NULL;
```

## Summary

**Most Common Issue:** Worker is not running.

**Quick Fix:**
1. Start worker: `npm run worker`
2. Upload a document
3. Check extraction status in UI

**If Still Not Working:**
1. Run diagnostic: `tsx scripts/diagnose-extraction.ts`
2. Check worker logs for errors
3. Verify Redis connection
4. Check database for failed jobs



