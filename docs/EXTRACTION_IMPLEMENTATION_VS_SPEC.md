# PDF Extraction Implementation vs Specification Comparison

**Date:** 2025-12-01  
**Purpose:** Identify contradictions between implemented PDF extraction and specification documents

---

## 🔴 Critical Contradictions

### 1. **Extraction Status Values**

**Specification (41_Backend_Background_Jobs.md):**
- Spec mentions using `EXTRACTING` status during extraction phase
- Line 656: `SET extraction_status = 'PROCESSING'`
- Line 785: `SET extraction_status = 'COMPLETED'`
- But spec implies there should be an `EXTRACTING` intermediate state

**Database Constraint (20250128000004_create_phase4_module1_document_tables.sql):**
```sql
CHECK (extraction_status IN (
  'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 
  'REVIEW_REQUIRED', 'OCR_FAILED', 'PROCESSING_FAILED', 
  'ZERO_OBLIGATIONS', 'EXTRACTION_FAILED', 'MANUAL_MODE'
))
```
- ❌ **`EXTRACTING` is NOT in the allowed values**

**Implementation (lib/jobs/document-processing-job.ts):**
- Line 42: Uses `'PROCESSING'` (correct)
- Line 78: Uses `'PROCESSING'` instead of `'EXTRACTING'` (workaround)
- Line 86: Log says "EXTRACTING" but status is actually `'PROCESSING'`
- ✅ **Implementation correctly avoids `EXTRACTING` due to DB constraint**

**Contradiction:** Spec implies `EXTRACTING` status exists, but database doesn't allow it. Implementation correctly works around this.

---

### 2. **Pattern Discovery Trigger Condition**

**Specification (80_AI_Extraction_Rules_Library.md):**
- Section 5.1.1: "Did user CONFIRM extraction without edits?"
- Section 5.1.2: Requires 3+ similar successful extractions
- Line 869: "Require minimum 3 similar successful extractions"

**Implementation (lib/ai/pattern-discovery.ts):**
- Line 277: Checks `eq('original_extraction->>confirmed', 'true')`
- ❌ **Problem:** `original_extraction` is a JSONB field that may not have a `confirmed` property
- The code queries for `status IS NULL` (not rejected) but also checks for `confirmed = 'true'` which may not exist

**Contradiction:** Implementation checks for a field that may not exist in the obligations table structure.

---

### 3. **Job Status Mapping**

**Specification (41_Backend_Background_Jobs.md):**
- Section 7.2: Job statuses are `PENDING`, `RUNNING`, `COMPLETED`, `FAILED`
- Line 1684-1689: Status transition table shows `RUNNING` as the active state

**Implementation (lib/jobs/document-processing-job.ts):**
- Line 315: Maps `'PROCESSING'` to `'RUNNING'` for database
- ✅ **This is correct** - document status uses `PROCESSING`, job status uses `RUNNING`

**No Contradiction:** Implementation correctly maps between document status and job status.

---

### 4. **Pattern Discovery Requirements**

**Specification (80_AI_Extraction_Rules_Library.md):**
- Section 5.1.1: Pattern discovery requires:
  1. Segment NOT matched by library
  2. User CONFIRMED extraction without edits
  3. 3+ similar extractions with same result

**Implementation (lib/jobs/document-processing-job.ts):**
- Line 157: Only checks `if (extractionResult.usedLLM && creationResult.obligationsCreated > 0)`
- ❌ **Missing check:** Doesn't verify if user confirmed without edits
- ❌ **Missing check:** Doesn't verify if segment was NOT matched by library

**Implementation (lib/ai/pattern-discovery.ts):**
- Line 276: Checks `eq('original_extraction->>confirmed', 'true')` - but this field may not exist
- Line 280: Requires 3+ obligations

**Contradiction:** Implementation doesn't fully match spec requirements for pattern discovery triggers.

---

## ⚠️ Potential Issues (Not Directly Contradictory)

### 5. **Status Transition Logging**

**Implementation (lib/jobs/document-processing-job.ts):**
- Line 86: Logs "status updated to EXTRACTING" but actually sets status to `'PROCESSING'`
- This is misleading but not functionally wrong

**Recommendation:** Update log message to say "PROCESSING" instead of "EXTRACTING"

---

### 6. **Pattern Discovery Field Reference**

**Implementation (lib/ai/pattern-discovery.ts):**
- Line 277: `eq('original_extraction->>confirmed', 'true')`
- This assumes `obligations.original_extraction` JSONB has a `confirmed` field
- Need to verify if this field is actually set when users confirm extractions

**Recommendation:** Check if `review_queue_items` table tracks confirmations instead

---

## ✅ Correctly Implemented (No Contradictions)

### 7. **Rule Library Integration**
- ✅ Spec says to check rule library first (≥90% match)
- ✅ Implementation does this in `document-processor.ts` line 138-143

### 8. **Cost Tracking**
- ✅ Spec requires tracking tokens and costs
- ✅ Implementation logs to `extraction_logs` with cost data

### 9. **Error Handling**
- ✅ Spec defines error statuses (`OCR_FAILED`, `EXTRACTION_FAILED`, etc.)
- ✅ Implementation uses these correctly

### 10. **Job Status Updates**
- ✅ Spec requires updating `background_jobs` table
- ✅ Implementation correctly updates using `payload->>document_id`

---

## 📋 Summary

| Issue | Severity | Status |
|-------|----------|--------|
| `EXTRACTING` status not in DB | 🔴 Critical | ✅ Worked around correctly |
| Pattern discovery field check | 🔴 Critical | ⚠️ May fail silently |
| Pattern discovery requirements | 🟡 Medium | ⚠️ Not fully implemented |
| Status logging message | 🟢 Low | ⚠️ Misleading but harmless |

---

## 🔧 Recommended Fixes

1. **Fix Pattern Discovery Field Check:**
   - Instead of `original_extraction->>confirmed`, check `review_queue_items` table
   - Or add `confirmed` field to obligations when user confirms

2. **Update Log Messages:**
   - Change "EXTRACTING" log messages to "PROCESSING" for accuracy

3. **Complete Pattern Discovery Logic:**
   - Add check to verify segment was NOT matched by library
   - Add check to verify user confirmed without edits (via review_queue_items)

4. **Consider Adding `EXTRACTING` Status:**
   - Update database constraint to include `EXTRACTING` if spec requires it
   - Or update spec to remove `EXTRACTING` references

---

## 📝 Notes

- The implementation generally follows the spec well
- Most contradictions are due to database constraints vs spec expectations
- Pattern discovery is the main area needing attention
- Status value mismatch is already handled correctly in implementation

