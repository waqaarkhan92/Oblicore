-- Migration: Add Performance Indexes
-- Purpose: Add critical indexes for query performance as application scales
-- Date: 2025-12-03
-- Author: System Optimization Audit
-- Note: Uses only columns that definitely exist in the schema

-- ==============================================================================
-- OBLIGATIONS TABLE INDEXES
-- ==============================================================================

-- Primary filtering index: site + review_status (review_status exists, status doesn't)
CREATE INDEX IF NOT EXISTS idx_obligations_site_review
  ON obligations(site_id, review_status);

-- Document lookup index (foreign key navigation)
CREATE INDEX IF NOT EXISTS idx_obligations_document
  ON obligations(document_id);

-- Category filtering index
CREATE INDEX IF NOT EXISTS idx_obligations_category_perf
  ON obligations(category);

-- ==============================================================================
-- DOCUMENTS TABLE INDEXES
-- ==============================================================================

-- Primary filtering index: site + type + extraction status
CREATE INDEX IF NOT EXISTS idx_documents_site_type_perf
  ON documents(site_id, document_type, extraction_status);

-- Extraction queue index (background job worker queries)
CREATE INDEX IF NOT EXISTS idx_documents_extraction_queue
  ON documents(extraction_status, created_at)
  WHERE extraction_status IN ('PENDING', 'PROCESSING');

-- Created date index (sorting by recency)
CREATE INDEX IF NOT EXISTS idx_documents_created_perf
  ON documents(created_at DESC);

-- ==============================================================================
-- OBLIGATION_EVIDENCE_LINKS TABLE INDEXES
-- ==============================================================================

-- Obligation lookup (most common: get evidence for obligation)
CREATE INDEX IF NOT EXISTS idx_evidence_links_obligation_perf
  ON obligation_evidence_links(obligation_id);

-- Evidence lookup (reverse: get obligations for evidence)
CREATE INDEX IF NOT EXISTS idx_evidence_links_evidence_perf
  ON obligation_evidence_links(evidence_id);

-- ==============================================================================
-- EVIDENCE_ITEMS TABLE INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_evidence_items_site_perf
  ON evidence_items(site_id);

CREATE INDEX IF NOT EXISTS idx_evidence_items_created_perf
  ON evidence_items(created_at DESC);

-- ==============================================================================
-- SITES TABLE INDEXES
-- ==============================================================================

-- Company lookup (multi-tenant queries)
CREATE INDEX IF NOT EXISTS idx_sites_company_perf
  ON sites(company_id);

-- ==============================================================================
-- USERS TABLE INDEXES
-- ==============================================================================

-- Company lookup (org-level queries)
CREATE INDEX IF NOT EXISTS idx_users_company_perf
  ON users(company_id);

-- Email lookup (login, password reset)
CREATE INDEX IF NOT EXISTS idx_users_email_perf
  ON users(email);

-- ==============================================================================
-- AUDIT_PACKS TABLE INDEXES
-- ==============================================================================

-- Site lookup
CREATE INDEX IF NOT EXISTS idx_audit_packs_site_perf
  ON audit_packs(site_id);

-- Pack type filtering (not status - that column doesn't exist)
CREATE INDEX IF NOT EXISTS idx_audit_packs_pack_type_perf
  ON audit_packs(pack_type);

-- ==============================================================================
-- RULE_LIBRARY PATTERNS TABLE INDEXES
-- ==============================================================================

-- Pattern matching index (document extraction lookups)
CREATE INDEX IF NOT EXISTS idx_rule_library_patterns_active_perf
  ON rule_library_patterns(is_active)
  WHERE is_active = true;

-- ==============================================================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ==============================================================================

-- Update table statistics for optimal query planning
ANALYZE obligations;
ANALYZE documents;
ANALYZE obligation_evidence_links;
ANALYZE evidence_items;
ANALYZE sites;
ANALYZE users;
ANALYZE audit_packs;
ANALYZE rule_library_patterns;
