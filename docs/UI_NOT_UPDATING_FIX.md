# UI Not Updating - Obligations Not Showing

## Issue
Obligations exist in database (40 found) but not showing in UI.

## Root Causes Found

### 1. Query Stops Polling Too Early
- When document status is COMPLETED and obligations.length > 0, polling stops after 30 seconds
- But if obligations aren't loaded yet, polling stops too early
- Fixed: Extended polling to 2 minutes if COMPLETED but no obligations found

### 2. Insufficient Debugging
- Hard to see what's happening in the UI
- No clear indication if data exists but isn't rendering
- Fixed: Added extensive console logging and UI debug messages

### 3. Error Handling Might Hide Issues
- Errors return empty array instead of throwing
- Query might succeed but return empty data
- Fixed: Added better error display and logging

## Fixes Applied

1. **Extended Polling Duration**
   - If COMPLETED but no obligations: poll for 2 minutes (was 30 seconds)
   - Added logging to show when/why polling stops

2. **Better Debugging**
   - Added console logs for refetchInterval decisions
   - Added UI debug panel showing:
     - Loading state
     - Error state  
     - Data count
     - Whether obligations data exists

3. **Better Error Display**
   - Errors now shown prominently in UI
   - Empty state messages more descriptive

## How to Debug

1. **Open Browser Console**
   - Look for logs starting with `📋`, `🔄`, `🔍`
   - Check for errors

2. **Check Network Tab**
   - Filter by "obligations"
   - Check response status and data
   - Verify response structure: `{ data: [...], pagination: {...} }`

3. **Check UI Debug Panel**
   - Look at the DEBUG section on the document page
   - See what the query is returning

4. **Check React Query DevTools** (if installed)
   - See query state
   - Check cache
   - Verify refetch intervals

## Common Issues

### API Returns Empty Array
- Check server logs for `[Obligations API]` messages
- Verify obligations exist in database
- Check RLS policies (though API uses supabaseAdmin)

### Query Not Running
- Check `enabled: !!id` - is id set?
- Check browser console for query errors
- Verify React Query is working

### Data Exists But Not Rendering
- Check `obligations && obligations.length > 0` condition
- Verify obligations array structure
- Check for React rendering errors

## Next Steps

1. Refresh the page
2. Check browser console for logs
3. Check Network tab for API calls
4. Look at UI debug panel
5. Report what you see in console/logs

