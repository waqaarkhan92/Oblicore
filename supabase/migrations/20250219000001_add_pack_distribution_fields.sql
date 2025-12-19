-- Migration: 20250219000001_add_pack_distribution_fields.sql
-- Description: Add distribution_emails to audit_packs and expires_at to pack_distributions
--              for Phase 4.4 pack email distribution feature
-- Author: EcoComply Build System
-- Date: 2025-02-19

-- ============================================================================
-- SECTION 1: ADD distribution_emails TO audit_packs
-- ============================================================================

-- Add distribution_emails field to store recipient email addresses for pack distribution
ALTER TABLE audit_packs ADD COLUMN IF NOT EXISTS distribution_emails TEXT[];

-- Add index for distribution_emails queries
CREATE INDEX IF NOT EXISTS idx_audit_packs_distribution_emails
    ON audit_packs USING GIN(distribution_emails)
    WHERE distribution_emails IS NOT NULL AND array_length(distribution_emails, 1) > 0;

-- ============================================================================
-- SECTION 2: ADD expires_at TO pack_distributions
-- ============================================================================

-- Add expires_at field to track expiration of shared links and email distributions
ALTER TABLE pack_distributions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Add index for querying active/expired distributions
CREATE INDEX IF NOT EXISTS idx_pack_distributions_expires_at
    ON pack_distributions(expires_at)
    WHERE expires_at IS NOT NULL;

-- Add composite index for active distribution lookups
CREATE INDEX IF NOT EXISTS idx_pack_distributions_active
    ON pack_distributions(pack_id, distribution_method, expires_at)
    WHERE expires_at > NOW();

-- ============================================================================
-- SECTION 3: ADD delivery_status TO pack_distributions
-- ============================================================================

-- Add delivery_status to track email delivery confirmation
ALTER TABLE pack_distributions ADD COLUMN IF NOT EXISTS delivery_status TEXT
    CHECK (delivery_status IN ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED'));

-- Add message_id for email tracking
ALTER TABLE pack_distributions ADD COLUMN IF NOT EXISTS message_id TEXT;

-- Add delivered_at timestamp
ALTER TABLE pack_distributions ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Add error_message for failed deliveries
ALTER TABLE pack_distributions ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Index for delivery status queries
CREATE INDEX IF NOT EXISTS idx_pack_distributions_delivery_status
    ON pack_distributions(delivery_status, distributed_at);
