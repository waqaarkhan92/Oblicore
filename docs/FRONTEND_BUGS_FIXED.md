# Frontend Bugs Fixed - UI Not Showing Obligations

## Summary
Found and fixed **3 critical frontend bugs** that were preventing obligations from displaying in the UI.

---

## 🐛 Bug #10: Frontend Checking for Non-Existent 'EXTRACTING' Status (CRITICAL)

### Issue
- Frontend was checking for `extraction_status === 'EXTRACTING'` in multiple places
- **But backend was changed to never use 'EXTRACTING' (it's not in DB constraint)**
- Frontend would stop polling/refetching too early
- Status display would show wrong messages

### Impact
- Frontend would stop polling for obligations when status was 'PROCESSING'
- Progress bar wouldn't update correctly
- Status messages would be wrong
- Obligations wouldn't appear even if extraction completed

### Fix
Removed all references to 'EXTRACTING' status and replaced with 'PROCESSING'

**Locations Fixed:**
1. `refetchInterval` logic for obligations query
2. `refetchInterval` logic for extraction-status query  
3. Status display messages
4. Empty state messages

**File:** `app/dashboard/documents/[id]/page.tsx`

---

## 🐛 Bug #11: Error Handling Silently Failing (CRITICAL)

### Issue
- If API call failed, error was thrown and query would fail
- No error recovery mechanism
- User wouldn't see obligations even if they existed
- Query would stop retrying after error

### Impact
- Silent failures - no obligations shown even if API returned them
- No retry mechanism after transient errors
- Poor user experience

### Fix
Added try-catch in queryFn to:
- Log errors with full details
- Return empty array instead of throwing
- Keep error available in `obligationsError` for display
- Allow query to continue retrying

**File:** `app/dashboard/documents/[id]/page.tsx`

---

## 🐛 Bug #12: Missing Error Display for Obligations (CRITICAL)

### Issue
- Error state was checked but not always displayed prominently
- User wouldn't know if API was failing
- No indication of what went wrong

### Impact
- User confusion - why aren't obligations showing?
- No way to debug API issues
- Poor error visibility

### Fix
- Enhanced error display
- Added better empty state messages
- Added warning when extraction completed but no obligations found

**File:** `app/dashboard/documents/[id]/page.tsx`

---

## 📋 Files Modified

1. `app/dashboard/documents/[id]/page.tsx` - Fixed status checks, error handling, and display

---

## ✅ Additional Improvements

1. **Better Error Logging**
   - Added detailed error logging in queryFn
   - Logs error message, status, and response

2. **Better Empty State Messages**
   - Different messages for different scenarios
   - Warning when extraction completed but no obligations found

3. **Status Display Improvements**
   - Removed references to non-existent 'EXTRACTING' status
   - Added support for 'EXTRACTION_FAILED' status

---

## 🔧 How to Verify Fixes

1. **Check Browser Console**
   - Look for logs starting with `📋`
   - Check for any error messages
   - Verify obligations are being fetched

2. **Check Network Tab**
   - Verify `/api/v1/documents/{id}/obligations` is being called
   - Check response status and data
   - Verify pagination structure

3. **Check UI**
   - Verify progress bar updates
   - Verify status messages are correct
   - Verify obligations appear when available
   - Verify error messages show if API fails

---

## 🚨 Common Issues to Check

1. **API Authentication**
   - Verify access token is being sent
   - Check if token is expired

2. **API Response Structure**
   - Verify response has `data` array
   - Verify `pagination` object exists

3. **Query Polling**
   - Verify query is polling when status is 'PROCESSING'
   - Check if polling stops too early

4. **Error Handling**
   - Check browser console for errors
   - Verify errors are being caught and logged

