-- ============================================================================
-- PACK SIGNATURES FIELD MIGRATION
-- ============================================================================
-- Description: Add signatures column to audit_packs table for digital signatures
-- Created: 2025-02-20
-- ============================================================================

-- Add signatures column to store digital signature records
ALTER TABLE audit_packs ADD COLUMN IF NOT EXISTS signatures JSONB NOT NULL DEFAULT '[]';

-- Add index for signature queries
CREATE INDEX IF NOT EXISTS idx_audit_packs_signatures ON audit_packs USING GIN(signatures)
WHERE signatures != '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN audit_packs.signatures IS 'Digital signatures for pack authenticity and audit trail. Stores array of signature objects with hash, type, signer, and timestamp.';

-- Add check constraint to ensure signatures is always an array
ALTER TABLE audit_packs ADD CONSTRAINT chk_audit_packs_signatures_is_array
CHECK (jsonb_typeof(signatures) = 'array');
