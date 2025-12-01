# Pattern Discovery Recommendations

**Date:** 2025-12-01  
**Status:** Fixed Implementation Issues

---

## ✅ What Was Fixed

### 1. **Log Message Alignment**
- ✅ Fixed misleading log message: Changed "EXTRACTING" to "PROCESSING" to match actual status
- ✅ Code now fully aligned with spec

### 2. **Pattern Discovery Logic**
- ✅ Fixed field check: Now uses `source_pattern_id IS NULL` to verify segment was NOT matched by library
- ✅ Fixed confirmation check: Now uses `review_status = 'CONFIRMED'` or auto-confirmed (null) instead of non-existent `original_extraction->>confirmed`
- ✅ Added proper filtering: Only checks obligations that meet all spec requirements
- ✅ Added detailed logging for debugging

---

## 📋 Current Pattern Discovery Flow

### How It Works Now:

1. **After Document Extraction:**
   - System checks if LLM was used (meaning rule library didn't match)
   - Gets obligations that were NOT matched by library (`source_pattern_id IS NULL`)

2. **Pattern Discovery Check:**
   - Runs asynchronously after extraction
   - Checks for obligations that:
     - Were NOT matched by library (`source_pattern_id IS NULL`)
     - Were confirmed by user (`review_status = 'CONFIRMED'` or auto-confirmed)
     - Have 3+ similar instances

3. **Pattern Candidate Creation:**
   - Groups similar obligations by text similarity
   - Generates regex pattern from common text
   - Creates pattern candidate in `pattern_candidates` table
   - Status: `PENDING_REVIEW`

---

## ✅ Confirmation Trigger Implemented

**Pattern discovery now triggers when users confirm obligations!**

### How It Works:
1. **User confirms obligation** in review queue
2. **Obligation status updated** to `CONFIRMED`
3. **Pattern discovery triggered** automatically (non-blocking)
4. **System checks** for 3+ similar confirmed obligations
5. **Pattern candidate created** if criteria met

### Implementation Details:
- ✅ Trigger added to `/api/v1/review-queue/[itemId]/confirm` endpoint
- ✅ New function: `checkForPatternDiscoveryAfterConfirmation()`
- ✅ Non-blocking (async, doesn't slow down confirmation)
- ✅ Only processes obligations NOT matched by library
- ✅ Only processes confirmed obligations
- ✅ Groups similar obligations by category and text similarity

---

## 🔧 Recommendations

### Option 1: **Trigger Pattern Discovery on User Confirmation** (Recommended)

**When:** User confirms an obligation in the review queue

**Implementation:**
```typescript
// In review queue confirmation handler
async function confirmObligation(obligationId: string) {
  // ... existing confirmation logic ...
  
  // Trigger pattern discovery check for this obligation
  await checkForPatternDiscoveryAfterConfirmation(obligationId);
}
```

**Pros:**
- ✅ Patterns discovered as soon as users confirm
- ✅ Real-time pattern learning
- ✅ No need to wait for batch jobs

**Cons:**
- ⚠️ Slightly slower confirmation (but async, so minimal impact)

---

### Option 2: **Daily Batch Job for Pattern Discovery**

**When:** Daily cron job checks for new pattern opportunities

**Implementation:**
```typescript
// Daily job: Check all confirmed obligations from last 7 days
async function dailyPatternDiscovery() {
  const { data: confirmedObligations } = await supabaseAdmin
    .from('obligations')
    .select('id, document_id')
    .is('source_pattern_id', null) // Not matched by library
    .eq('review_status', 'CONFIRMED')
    .gte('reviewed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
  
  // Group by document and check for patterns
  // ...
}
```

**Pros:**
- ✅ Doesn't slow down user interactions
- ✅ Processes in batches
- ✅ Can analyze across multiple documents

**Cons:**
- ⚠️ Patterns discovered with delay (up to 24 hours)

---

### Option 3: **Hybrid Approach** (Best)

**Combine both:**
1. **Immediate check** after extraction (current) - for auto-confirmed obligations
2. **On confirmation** - check when user confirms obligation
3. **Daily batch** - catch any missed patterns

**Implementation:**
- Keep current extraction-time check (for high-confidence auto-confirmed)
- Add confirmation-time trigger (for user-confirmed)
- Add daily batch job (safety net)

---

## 🎯 Recommended Implementation Plan

### Phase 1: Immediate (Quick Fix) ✅ COMPLETED
1. ✅ Fix log message alignment (DONE)
2. ✅ Fix pattern discovery field checks (DONE)
3. ✅ Add confirmation-time trigger (DONE)

### Phase 2: Enhancement
1. Add daily batch job for pattern discovery
2. Add admin notification when pattern candidates are created
3. Add pattern candidate review UI

### Phase 3: Optimization
1. Improve pattern similarity matching (use embeddings)
2. Add pattern performance tracking
3. Auto-approve high-confidence patterns (>95% match rate)

---

## 📊 Current Behavior

### Implementation Status:
- ✅ Pattern discovery logic is correct
- ✅ Checks for library matches correctly
- ✅ Checks for confirmations correctly
- ✅ Triggers on user confirmation (NEW!)
- ✅ Also runs after extraction (for auto-confirmed high-confidence obligations)

### How It Works Now:
- ✅ Patterns discovered when users confirm obligations
- ✅ Real-time learning as users review
- ✅ Patterns available for next similar document
- ✅ Non-blocking (doesn't slow down user workflow)

---

## 🔍 How to Test

1. **Process 3+ documents with similar obligations**
2. **Confirm the obligations** (via review queue)
3. **Check for pattern candidates:**
   ```bash
   npx tsx scripts/check-pattern-candidates.ts
   ```
4. **Verify pattern candidate was created**

---

## 📝 Next Steps

1. **Add confirmation trigger** (Option 1 or 3)
2. **Test pattern discovery** with real confirmations
3. **Monitor pattern candidate creation**
4. **Build admin UI** for reviewing candidates (future)

