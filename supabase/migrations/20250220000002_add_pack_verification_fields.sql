-- ============================================================================
-- PACK VERIFICATION FIELDS MIGRATION
-- ============================================================================
-- Description: Add content_hash and verification fields to audit_packs table
--              for pack authenticity verification via QR codes
-- Created: 2025-02-20
-- ============================================================================

-- Add content_hash column to store SHA-256 hash of pack PDF
ALTER TABLE audit_packs ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- Add verification timestamp
ALTER TABLE audit_packs ADD COLUMN IF NOT EXISTS verification_generated_at TIMESTAMPTZ;

-- Add index for content_hash lookups
CREATE INDEX IF NOT EXISTS idx_audit_packs_content_hash ON audit_packs(content_hash)
WHERE content_hash IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN audit_packs.content_hash IS 'SHA-256 hash of pack PDF contents for tamper detection and verification';
COMMENT ON COLUMN audit_packs.verification_generated_at IS 'Timestamp when verification hash was generated';

-- For packs that don't have a dedicated column yet, we store in metadata JSONB
-- This migration ensures backward compatibility
-- Existing packs with hash in metadata will continue to work
-- New packs should use the dedicated content_hash column
