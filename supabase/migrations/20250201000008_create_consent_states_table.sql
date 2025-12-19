-- Consent State Machine Table
-- Module 2: Trade Effluent

-- ============================================================================
-- CONSENT STATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS consent_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    state TEXT NOT NULL
        CHECK (state IN ('DRAFT', 'IN_FORCE', 'SUPERSEDED', 'EXPIRED')),
    effective_date DATE NOT NULL,
    expiry_date DATE,
    previous_state_id UUID REFERENCES consent_states(id) ON DELETE SET NULL,
    state_transition_reason TEXT,
    transitioned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    transitioned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_states_document_id ON consent_states(document_id);
CREATE INDEX IF NOT EXISTS idx_consent_states_company_id ON consent_states(company_id);
CREATE INDEX IF NOT EXISTS idx_consent_states_site_id ON consent_states(site_id);
CREATE INDEX IF NOT EXISTS idx_consent_states_state ON consent_states(state);
CREATE INDEX IF NOT EXISTS idx_consent_states_effective_date ON consent_states(effective_date);
CREATE INDEX IF NOT EXISTS idx_consent_states_previous_state_id ON consent_states(previous_state_id);

-- ============================================================================
-- RLS POLICIES - Using has_site_access helper function
-- ============================================================================

-- Enable RLS
ALTER TABLE consent_states ENABLE ROW LEVEL SECURITY;

-- consent_states RLS policies
DROP POLICY IF EXISTS consent_states_select_site_module ON consent_states;
CREATE POLICY consent_states_select_site_module ON consent_states
    FOR SELECT USING (has_site_access(auth.uid(), site_id));

DROP POLICY IF EXISTS consent_states_insert_staff_module ON consent_states;
CREATE POLICY consent_states_insert_staff_module ON consent_states
    FOR INSERT WITH CHECK (has_site_access(auth.uid(), site_id));

DROP POLICY IF EXISTS consent_states_update_staff_module ON consent_states;
CREATE POLICY consent_states_update_staff_module ON consent_states
    FOR UPDATE USING (has_site_access(auth.uid(), site_id));

DROP POLICY IF EXISTS consent_states_delete_owner_admin_module ON consent_states;
CREATE POLICY consent_states_delete_owner_admin_module ON consent_states
    FOR DELETE USING (has_site_access(auth.uid(), site_id));

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at for consent_states
DROP TRIGGER IF EXISTS trigger_update_consent_states_updated_at ON consent_states;
CREATE OR REPLACE FUNCTION update_consent_states_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_consent_states_updated_at
    BEFORE UPDATE ON consent_states
    FOR EACH ROW
    EXECUTE FUNCTION update_consent_states_updated_at();
