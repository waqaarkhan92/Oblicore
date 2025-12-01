# Extraction Not Working - Quick Fix

## The Problem

Your test extraction works because the test **creates a worker** that processes jobs immediately. However, in your actual application, **the worker needs to be running as a separate process** to process jobs from the queue.

## The Solution

### Step 1: Start the Worker

Open a new terminal and run:

```bash
npm run worker
```

You should see:
```
🚀 Auto-starting background workers (PDF extraction, etc.)...
✅ Background workers started successfully - PDF extraction is ready!
```

### Step 2: Verify It's Working

1. Upload a document through the UI
2. The worker should process it automatically
3. Check the worker terminal for logs like:
   ```
   📋 Starting extraction for document <id>
   ✅ Document <id> extraction completed: X obligations created
   ```

### Step 3: Keep Worker Running

The worker must stay running while you're using the app. Options:

**Option A: Run in foreground (for development)**
```bash
npm run worker
```

**Option B: Run in background**
```bash
npm run worker > worker.log 2>&1 &
```

**Option C: Use PM2 (for production)**
```bash
pm2 start npm --name "oblicore-worker" -- run worker
```

## Why This Happens

1. **Test**: Creates a worker inline → jobs process immediately ✅
2. **Production**: Jobs go to a queue → worker must be running to process them ❌

If the worker isn't running:
- Jobs queue up but never process
- Documents stay in "PROCESSING" status forever
- No obligations appear in the UI

## Diagnostic Tools

If extraction still doesn't work after starting the worker:

```bash
# Check Redis connection
npm run test:redis

# Check worker connection  
npm run test:worker

# Run full diagnostic
tsx scripts/diagnose-extraction.ts
```

## Common Issues

### "REDIS_URL environment variable is required"
- Check your `.env.local` file has `REDIS_URL` set
- Make sure Redis is running

### "Jobs are queued but not processing"
- Worker is not running → Start it with `npm run worker`
- Check worker logs for errors

### "Extraction completes but no obligations"
- Check worker logs for errors
- Run diagnostic script to see what happened
- Check database: `SELECT * FROM obligations WHERE document_id = '<id>'`

## Next Steps

1. ✅ Start the worker: `npm run worker`
2. ✅ Upload a test document
3. ✅ Check if extraction works
4. ✅ If not, run diagnostic: `tsx scripts/diagnose-extraction.ts`

For more details, see: `docs/EXTRACTION_NOT_WORKING.md`


