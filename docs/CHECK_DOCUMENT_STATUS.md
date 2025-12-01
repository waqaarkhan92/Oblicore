# How to Check Last Document Status

## Quick Check via Browser Console

Open your browser console (F12) on the document page and run:

```javascript
// Get the current document ID from the URL
const docId = window.location.pathname.split('/').pop();

// Check extraction status
fetch(`/api/v1/documents/${docId}/extraction-status`, {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
  },
})
.then(r => r.json())
.then(data => {
  console.log('📊 EXTRACTION STATUS:', data.data);
  console.log('   Status:', data.data?.status);
  console.log('   Progress:', data.data?.progress + '%');
  console.log('   Obligation Count:', data.data?.obligation_count);
});

// Check obligations
fetch(`/api/v1/documents/${docId}/obligations`, {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
  },
})
.then(r => r.json())
.then(data => {
  console.log('📋 OBLIGATIONS:', data.data?.length || 0);
  if (data.data && data.data.length > 0) {
    console.log('   Sample:', data.data[0]);
  } else {
    console.log('   ⚠️ NO OBLIGATIONS FOUND');
  }
});

// Check document details
fetch(`/api/v1/documents/${docId}`, {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`,
  },
})
.then(r => r.json())
.then(data => {
  console.log('📄 DOCUMENT:', {
    id: data.data?.id,
    title: data.data?.title,
    status: data.data?.extraction_status,
    created: data.data?.created_at,
    updated: data.data?.updated_at,
    hasText: !!data.data?.extracted_text,
    textLength: data.data?.extracted_text?.length || 0,
  });
});
```

## Check Network Tab

1. Open DevTools (F12)
2. Go to Network tab
3. Filter by "extraction-status" or "obligations"
4. Look at the responses to see:
   - What status is returned
   - What progress is shown
   - How many obligations are returned

## Check Server Logs

Look for logs starting with:
- `[Extraction-Status]` - Progress calculation logs
- `[Obligations API]` - Obligation fetching logs
- `📋 Starting extraction` - Job start logs
- `✅ Document ... extraction completed` - Completion logs
- `❌` - Error logs

## Common Issues

### Stuck at 12% Progress
- **Cause**: Worker not running or job stuck
- **Check**: Look for `jobRunning: false` in logs
- **Fix**: Start worker with `npm run worker`

### Status: PROCESSING but no progress
- **Cause**: Job not actually running
- **Check**: Background job status in database
- **Fix**: Restart worker or retry extraction

### Status: COMPLETED but no obligations
- **Cause**: Extraction returned 0 obligations or creation failed
- **Check**: Extraction logs for errors
- **Fix**: Check extraction logs, retry if needed

### No obligations showing
- **Cause**: API returning empty array or error
- **Check**: Network tab for API response
- **Fix**: Check API logs, verify obligations exist in DB

