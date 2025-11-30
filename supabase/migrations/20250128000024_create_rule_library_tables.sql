-- Migration: Create Rule Library Tables for Learning Mechanism
-- Reference: docs/specs/80_AI_Extraction_Rules_Library.md Section 11

-- ============================================================================
-- 1. rule_library_patterns Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS rule_library_patterns (
  -- Primary identifier
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Pattern identification
  pattern_id TEXT NOT NULL UNIQUE,
  pattern_version TEXT NOT NULL DEFAULT '1.0.0',
  priority INTEGER NOT NULL DEFAULT 500,
  display_name TEXT NOT NULL,
  description TEXT,
  
  -- Matching configuration (JSONB for flexibility)
  matching JSONB NOT NULL DEFAULT '{}'::JSONB,
  -- Expected structure:
  -- {
  --   "regex_primary": "string",
  --   "regex_variants": ["string"],
  --   "semantic_keywords": ["string"],
  --   "negative_patterns": ["string"],
  --   "min_text_length": integer,
  --   "max_text_length": integer
  -- }
  
  -- Extraction template
  extraction_template JSONB NOT NULL DEFAULT '{}'::JSONB,
  -- Expected structure:
  -- {
  --   "category": "string",
  --   "frequency": "string",
  --   "deadline_relative": "string",
  --   "is_subjective": boolean,
  --   "subjective_phrases": ["string"],
  --   "evidence_types": ["string"],
  --   "condition_type": "string"
  -- }
  
  -- Applicability filters
  applicability JSONB NOT NULL DEFAULT '{}'::JSONB,
  -- Expected structure:
  -- {
  --   "module_types": ["MODULE_1", "MODULE_2", "MODULE_3", ...],
  --   "regulators": ["EA", "SEPA", "NRW", "WATER_COMPANY"],
  --   "document_types": ["string"],
  --   "water_companies": ["string"]
  -- }
  
  -- Performance tracking
  performance JSONB NOT NULL DEFAULT '{
    "usage_count": 0,
    "success_count": 0,
    "false_positive_count": 0,
    "false_negative_count": 0,
    "user_override_count": 0,
    "success_rate": 1.0,
    "last_used_at": null
  }'::JSONB,
  
  -- Metadata
  source_documents TEXT[] DEFAULT '{}',
  added_by UUID REFERENCES users(id) ON DELETE SET NULL,
  last_validated_at TIMESTAMP WITH TIME ZONE,
  validated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  deprecated_at TIMESTAMP WITH TIME ZONE,
  deprecated_reason TEXT,
  replaced_by_pattern_id TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT chk_pattern_version CHECK (pattern_version ~ '^\d+\.\d+\.\d+$'),
  CONSTRAINT chk_success_rate CHECK (
    (performance->>'success_rate')::DECIMAL >= 0 AND 
    (performance->>'success_rate')::DECIMAL <= 1
  ),
  CONSTRAINT chk_priority CHECK (priority >= 1 AND priority <= 999)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_rlp_pattern_id ON rule_library_patterns(pattern_id);
CREATE INDEX IF NOT EXISTS idx_rlp_is_active ON rule_library_patterns(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_rlp_module_types ON rule_library_patterns USING GIN ((applicability->'module_types'));
CREATE INDEX IF NOT EXISTS idx_rlp_regulators ON rule_library_patterns USING GIN ((applicability->'regulators'));
CREATE INDEX IF NOT EXISTS idx_rlp_document_types ON rule_library_patterns USING GIN ((applicability->'document_types'));
CREATE INDEX IF NOT EXISTS idx_rlp_category ON rule_library_patterns((extraction_template->>'category'));
CREATE INDEX IF NOT EXISTS idx_rlp_usage_count ON rule_library_patterns(((performance->>'usage_count')::INTEGER) DESC);
CREATE INDEX IF NOT EXISTS idx_rlp_success_rate ON rule_library_patterns(((performance->>'success_rate')::DECIMAL) DESC);
CREATE INDEX IF NOT EXISTS idx_rlp_created_at ON rule_library_patterns(created_at);
CREATE INDEX IF NOT EXISTS idx_rlp_priority ON rule_library_patterns(priority ASC);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_rule_library_patterns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rule_library_patterns_updated_at ON rule_library_patterns;
CREATE TRIGGER trg_rule_library_patterns_updated_at
  BEFORE UPDATE ON rule_library_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_rule_library_patterns_updated_at();

-- ============================================================================
-- 2. pattern_candidates Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS pattern_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Suggested pattern
  suggested_pattern JSONB NOT NULL,
  -- Structure matches rule_library_patterns fields
  
  -- Discovery metadata
  source_extractions UUID[] NOT NULL DEFAULT '{}',
  sample_count INTEGER NOT NULL DEFAULT 0,
  match_rate DECIMAL(5, 4) NOT NULL DEFAULT 0,
  
  -- Review status
  status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  -- Values: PENDING_REVIEW, APPROVED, REJECTED, MERGED
  
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  
  -- If approved, link to created pattern
  created_pattern_id TEXT REFERENCES rule_library_patterns(pattern_id),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT chk_candidate_status CHECK (
    status IN ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'MERGED')
  )
);

CREATE INDEX IF NOT EXISTS idx_pc_status ON pattern_candidates(status);
CREATE INDEX IF NOT EXISTS idx_pc_created_at ON pattern_candidates(created_at DESC);

-- ============================================================================
-- 3. pattern_events Table (Audit Log)
-- ============================================================================

CREATE TABLE IF NOT EXISTS pattern_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  pattern_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  -- Values: CREATED, UPDATED, DEPRECATED, ACTIVATED, ROLLBACK, PERFORMANCE_UPDATE
  
  from_version TEXT,
  to_version TEXT,
  
  event_data JSONB DEFAULT '{}',
  reason TEXT,
  
  performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT chk_event_type CHECK (
    event_type IN ('CREATED', 'UPDATED', 'DEPRECATED', 'ACTIVATED', 'ROLLBACK', 'PERFORMANCE_UPDATE')
  )
);

CREATE INDEX IF NOT EXISTS idx_pe_pattern_id ON pattern_events(pattern_id);
CREATE INDEX IF NOT EXISTS idx_pe_event_type ON pattern_events(event_type);
CREATE INDEX IF NOT EXISTS idx_pe_created_at ON pattern_events(created_at DESC);

-- ============================================================================
-- 4. correction_records Table (Track User Corrections)
-- ============================================================================

CREATE TABLE IF NOT EXISTS correction_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  extraction_log_id UUID REFERENCES extraction_logs(id) ON DELETE SET NULL,
  obligation_id UUID REFERENCES obligations(id) ON DELETE SET NULL,
  pattern_id_used TEXT,
  
  original_data JSONB NOT NULL,
  corrected_data JSONB NOT NULL,
  correction_type TEXT NOT NULL,
  -- Values: category, frequency, deadline, subjective, text, other
  
  corrected_by UUID REFERENCES users(id) ON DELETE SET NULL,
  corrected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT chk_correction_type CHECK (
    correction_type IN ('category', 'frequency', 'deadline', 'subjective', 'text', 'other')
  )
);

CREATE INDEX IF NOT EXISTS idx_cr_pattern_id ON correction_records(pattern_id_used) WHERE pattern_id_used IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cr_correction_type ON correction_records(correction_type);
CREATE INDEX IF NOT EXISTS idx_cr_corrected_at ON correction_records(corrected_at DESC);
CREATE INDEX IF NOT EXISTS idx_cr_obligation_id ON correction_records(obligation_id);

-- ============================================================================
-- 5. RLS Policies (Enable Row Level Security)
-- ============================================================================

ALTER TABLE rule_library_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE correction_records ENABLE ROW LEVEL SECURITY;

-- Patterns: Read-only for authenticated users, write for admins
CREATE POLICY "rule_library_patterns_read" ON rule_library_patterns
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "rule_library_patterns_write" ON rule_library_patterns
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_site_assignments usa
      JOIN sites s ON usa.site_id = s.id
      WHERE usa.user_id = auth.uid()
      AND s.company_id IN (
        SELECT id FROM companies WHERE subscription_tier = 'ENTERPRISE'
      )
    )
    OR EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Pattern candidates: Admin only for now
CREATE POLICY "pattern_candidates_read" ON pattern_candidates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "pattern_candidates_write" ON pattern_candidates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Pattern events: Read for authenticated, write for system/admin
CREATE POLICY "pattern_events_read" ON pattern_events
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "pattern_events_write" ON pattern_events
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'SYSTEM'))
  );

-- Correction records: Users can only see their own corrections
CREATE POLICY "correction_records_read" ON correction_records
  FOR SELECT
  TO authenticated
  USING (corrected_by = auth.uid());

CREATE POLICY "correction_records_write" ON correction_records
  FOR INSERT
  TO authenticated
  WITH CHECK (corrected_by = auth.uid());

COMMENT ON TABLE rule_library_patterns IS 'Stores learned patterns for document extraction. Patterns improve over time with user corrections.';
COMMENT ON TABLE pattern_candidates IS 'Temporary storage for potential new patterns discovered from successful extractions.';
COMMENT ON TABLE pattern_events IS 'Audit log for pattern lifecycle events (creation, updates, deprecation).';
COMMENT ON TABLE correction_records IS 'Tracks user corrections to extracted obligations for pattern improvement.';

