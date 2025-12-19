-- Migration: Add Approval Metadata to Review Queue Items
-- Purpose: Support multi-level approval workflow for high-risk review queue items
-- Date: 2025-02-19

BEGIN;

-- ============================================================================
-- ADD APPROVAL_METADATA COLUMN
-- ============================================================================

-- Add JSONB column to store approval workflow metadata
ALTER TABLE review_queue_items
ADD COLUMN IF NOT EXISTS approval_metadata JSONB DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN review_queue_items.approval_metadata IS
'Approval workflow metadata for multi-level approvals. Structure:
{
  "required_level": 1 | 2,
  "current_level": 0 | 1 | 2,
  "level1_approved_by": "uuid",
  "level1_approved_at": "timestamp",
  "level2_approved_by": "uuid",
  "level2_approved_at": "timestamp",
  "approval_status": "PENDING" | "LEVEL1_APPROVED" | "FULLY_APPROVED" | "REJECTED",
  "triggers": ["hallucination_risk", "low_confidence_score", "conflict_review_type"],
  "rejection_reason": "string",
  "escalation_reason": "string"
}';

-- ============================================================================
-- CREATE INDEX FOR APPROVAL QUERIES
-- ============================================================================

-- Index for finding items requiring Level 2 approval
CREATE INDEX IF NOT EXISTS idx_review_queue_items_approval_level2
ON review_queue_items ((approval_metadata->>'required_level'))
WHERE approval_metadata IS NOT NULL
  AND approval_metadata->>'required_level' = '2'
  AND review_status = 'PENDING';

-- Index for approval status queries
CREATE INDEX IF NOT EXISTS idx_review_queue_items_approval_status
ON review_queue_items ((approval_metadata->>'approval_status'))
WHERE approval_metadata IS NOT NULL;

-- GIN index for flexible JSONB queries on approval_metadata
CREATE INDEX IF NOT EXISTS idx_review_queue_items_approval_metadata_gin
ON review_queue_items USING GIN (approval_metadata);

-- ============================================================================
-- HELPER FUNCTION: Initialize approval metadata for existing items
-- ============================================================================

CREATE OR REPLACE FUNCTION initialize_approval_metadata_for_item(item_id UUID)
RETURNS JSONB AS $$
DECLARE
  item_record RECORD;
  required_level INTEGER;
  triggers TEXT[];
BEGIN
  -- Fetch the review queue item
  SELECT * INTO item_record
  FROM review_queue_items
  WHERE id = item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Review queue item not found: %', item_id;
  END IF;

  -- Skip if already has approval metadata
  IF item_record.approval_metadata IS NOT NULL THEN
    RETURN item_record.approval_metadata;
  END IF;

  -- Initialize triggers array and default level
  triggers := '{}';
  required_level := 1;

  -- Check Level 2 triggers
  IF item_record.hallucination_risk = true THEN
    triggers := array_append(triggers, 'hallucination_risk');
    required_level := 2;
  END IF;

  -- Check confidence score (requires joining with obligations table)
  IF item_record.obligation_id IS NOT NULL THEN
    DECLARE
      conf_score NUMERIC;
    BEGIN
      SELECT confidence_score INTO conf_score
      FROM obligations
      WHERE id = item_record.obligation_id;

      IF conf_score IS NOT NULL AND conf_score < 0.50 THEN
        triggers := array_append(triggers, 'low_confidence_score');
        required_level := 2;
      END IF;
    END;
  END IF;

  IF item_record.review_type = 'CONFLICT' THEN
    triggers := array_append(triggers, 'conflict_review_type');
    required_level := 2;
  END IF;

  -- Build approval metadata object
  RETURN jsonb_build_object(
    'required_level', required_level,
    'current_level', 0,
    'approval_status', 'PENDING',
    'triggers', to_jsonb(triggers)
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION initialize_approval_metadata_for_item IS
'Initializes approval metadata for a review queue item based on risk factors. Returns the metadata object.';

-- ============================================================================
-- BULK INITIALIZE EXISTING PENDING ITEMS (Optional)
-- ============================================================================

-- Uncomment to initialize approval metadata for all existing PENDING items
-- UPDATE review_queue_items
-- SET approval_metadata = initialize_approval_metadata_for_item(id)
-- WHERE review_status = 'PENDING'
--   AND approval_metadata IS NULL;

COMMIT;
