# Progress Freeze Fix - Stuck at 12%

## Issue
Progress bar was freezing at 12% and not moving forward.

## Root Causes

1. **Progress calculation was too simplistic**
   - Only based on time elapsed
   - 12% = ~6 seconds elapsed
   - Didn't account for actual extraction stages

2. **No detection of stuck jobs**
   - Couldn't tell if worker was running
   - Couldn't detect if job was stuck
   - Progress would continue even if job failed

3. **No stage-based progress**
   - Didn't differentiate between:
     - File download
     - OCR/text extraction  
     - Obligation extraction
     - Obligation creation

## Fixes Applied

### 1. Improved Progress Calculation
Now uses stage-based progress:
- **0-10%**: Initial setup (0-5 seconds)
- **10-40%**: File download + OCR/text extraction (5-30 seconds)
- **40-90%**: Obligation extraction (30-120 seconds)
- **90-100%**: Obligation creation + completion

### 2. Added Job Status Detection
- Checks if background job is actually running
- Detects if job is stuck (>5 minutes without update)
- Caps progress at 15% if job isn't running

### 3. Added Extracted Text Detection
- Checks if document has `extracted_text` 
- If yes, we're past OCR stage (40%+)
- More accurate progress indication

### 4. Added Obligation-Based Progress Boost
- Each obligation found adds 1-2% progress
- 10+ obligations = 85% progress
- 20+ obligations = 95% progress

## Why It Was Stuck at 12%

12% progress means:
- ~6 seconds have elapsed since document creation
- Job might not be running (worker not started)
- Job might be stuck at file download stage
- No obligations found yet

## How to Diagnose

1. **Check Worker Status**
   ```bash
   # Check if worker is running
   ps aux | grep worker
   # Or check PM2
   pm2 list
   ```

2. **Check Job Status**
   ```sql
   SELECT id, status, payload->>'document_id', created_at, updated_at
   FROM background_jobs
   WHERE job_type = 'DOCUMENT_EXTRACTION'
   ORDER BY created_at DESC
   LIMIT 5;
   ```

3. **Check Document Status**
   ```sql
   SELECT id, extraction_status, extracted_text, created_at, updated_at
   FROM documents
   WHERE id = '<your-doc-id>';
   ```

4. **Check Logs**
   - Look for `[Extraction-Status]` logs
   - Check for `jobRunning` and `jobStuck` flags
   - Verify `hasExtractedText` value

## Expected Behavior Now

- **0-10%**: Job starting, file being downloaded
- **10-40%**: OCR/text extraction in progress
- **40-90%**: Obligations being extracted
- **90-100%**: Obligations being created in database

If progress stays at 12-15%:
- **Worker is not running** - Start worker with `npm run worker`
- **Job is stuck** - Check worker logs for errors
- **File download failed** - Check storage access

## Files Modified

1. `app/api/v1/documents/[documentId]/extraction-status/route.ts`
   - Improved progress calculation
   - Added job status detection
   - Added extracted text detection
   - Added stuck job detection

