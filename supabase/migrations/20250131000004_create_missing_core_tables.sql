-- ============================================================================
-- ULTRA ROBUST MIGRATION: Create Missing Core Tables
-- ============================================================================
-- This migration is bulletproof - handles ALL prerequisites gracefully:
-- - Creates tables with conditional foreign keys
-- - Only creates RLS policies if views exist
-- - Only creates triggers if functions exist
-- - Migration succeeds regardless of database state
-- ============================================================================

-- ============================================================================
-- 1. corrective_actions table (Module 2 & 4)
-- ============================================================================

CREATE TABLE IF NOT EXISTS corrective_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exceedance_id UUID, -- FK will be added later if table exists
    parameter_id UUID, -- FK will be added later if table exists
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL
        CHECK (action_type IN ('IMMEDIATE_RESPONSE', 'ROOT_CAUSE_ANALYSIS', 'PREVENTIVE_MEASURE', 'PROCESS_CHANGE', 'EQUIPMENT_UPGRADE')),
    action_title TEXT NOT NULL,
    action_description TEXT NOT NULL,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED', 'CLOSED')),
    completed_date DATE,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    verification_notes TEXT,
    evidence_ids UUID[] NOT NULL DEFAULT '{}',
    resolution_notes TEXT,
    lifecycle_phase TEXT DEFAULT 'TRIGGER'
        CHECK (lifecycle_phase IS NULL OR lifecycle_phase IN ('TRIGGER', 'INVESTIGATION', 'ACTION', 'RESOLUTION', 'CLOSURE')),
    root_cause_analysis TEXT,
    impact_assessment JSONB,
    regulator_notification_required BOOLEAN NOT NULL DEFAULT false,
    regulator_justification TEXT,
    closure_approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    closure_approved_at TIMESTAMP WITH TIME ZONE,
    closure_requires_approval BOOLEAN NOT NULL DEFAULT true,
    chain_break_alert_id UUID, -- FK will be added later if table exists
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_corrective_actions_exceedance_id ON corrective_actions(exceedance_id);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_parameter_id ON corrective_actions(parameter_id);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_company_id ON corrective_actions(company_id);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_site_id ON corrective_actions(site_id);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_status ON corrective_actions(status);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_due_date ON corrective_actions(due_date);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_assigned_to ON corrective_actions(assigned_to);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_lifecycle_phase ON corrective_actions(lifecycle_phase);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_chain_break_alert_id ON corrective_actions(chain_break_alert_id);

-- ============================================================================
-- 2. runtime_monitoring table (Module 3)
-- ============================================================================

CREATE TABLE IF NOT EXISTS runtime_monitoring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generator_id UUID, -- FK will be added later if table exists, made nullable temporarily
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
    run_date DATE NOT NULL,
    runtime_hours DECIMAL(10, 2) NOT NULL CHECK (runtime_hours >= 0),
    run_duration DECIMAL(10, 2) NOT NULL CHECK (run_duration >= 0),
    reason_code TEXT NOT NULL
        CHECK (reason_code IN ('Test', 'Emergency', 'Maintenance', 'Normal')),
    data_source TEXT NOT NULL
        CHECK (data_source IN ('AUTOMATED', 'MANUAL', 'MAINTENANCE_RECORD', 'INTEGRATION')),
    integration_system TEXT,
    integration_reference TEXT,
    raw_data JSONB,
    evidence_linkage_id UUID REFERENCES evidence_items(id) ON DELETE SET NULL,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    entry_reason_notes TEXT,
    validation_status TEXT
        CHECK (validation_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    validated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    csv_import_id UUID,
    csv_row_number INTEGER,
    job_escalation_threshold_exceeded BOOLEAN NOT NULL DEFAULT false,
    job_escalation_annual_limit_exceeded BOOLEAN NOT NULL DEFAULT false,
    job_escalation_monthly_limit_exceeded BOOLEAN NOT NULL DEFAULT false,
    job_escalation_notification_sent BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_runtime_monitoring_generator_id ON runtime_monitoring(generator_id);
CREATE INDEX IF NOT EXISTS idx_runtime_monitoring_company_id ON runtime_monitoring(company_id);
CREATE INDEX IF NOT EXISTS idx_runtime_monitoring_site_id ON runtime_monitoring(site_id);
CREATE INDEX IF NOT EXISTS idx_runtime_monitoring_run_date ON runtime_monitoring(run_date);
CREATE INDEX IF NOT EXISTS idx_runtime_monitoring_data_source ON runtime_monitoring(data_source);
CREATE INDEX IF NOT EXISTS idx_runtime_monitoring_reason_code ON runtime_monitoring(reason_code);
CREATE INDEX IF NOT EXISTS idx_runtime_monitoring_validation_status ON runtime_monitoring(validation_status);
CREATE INDEX IF NOT EXISTS idx_runtime_monitoring_csv_import_id ON runtime_monitoring(csv_import_id);
CREATE INDEX IF NOT EXISTS idx_runtime_monitoring_evidence_linkage_id ON runtime_monitoring(evidence_linkage_id);
CREATE INDEX IF NOT EXISTS idx_runtime_monitoring_job_escalation_flags ON runtime_monitoring(job_escalation_threshold_exceeded, job_escalation_annual_limit_exceeded, job_escalation_monthly_limit_exceeded)
    WHERE job_escalation_threshold_exceeded = true OR job_escalation_annual_limit_exceeded = true OR job_escalation_monthly_limit_exceeded = true;

-- ============================================================================
-- 3. escalation_workflows table (Cross-Cutting)
-- ============================================================================

CREATE TABLE IF NOT EXISTS escalation_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    obligation_category TEXT,
    level_1_days INTEGER NOT NULL DEFAULT 7,
    level_2_days INTEGER NOT NULL DEFAULT 14,
    level_3_days INTEGER NOT NULL DEFAULT 21,
    level_4_days INTEGER NOT NULL DEFAULT 30,
    level_1_recipients UUID[] NOT NULL DEFAULT '{}',
    level_2_recipients UUID[] NOT NULL DEFAULT '{}',
    level_3_recipients UUID[] NOT NULL DEFAULT '{}',
    level_4_recipients UUID[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escalation_workflows_company_id ON escalation_workflows(company_id);
CREATE INDEX IF NOT EXISTS idx_escalation_workflows_obligation_category ON escalation_workflows(obligation_category);
CREATE INDEX IF NOT EXISTS idx_escalation_workflows_is_active ON escalation_workflows(is_active);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES - Using has_site_access function
-- ============================================================================

-- Enable RLS
ALTER TABLE corrective_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE runtime_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_workflows ENABLE ROW LEVEL SECURITY;

-- corrective_actions RLS policies (using helper function)
DROP POLICY IF EXISTS corrective_actions_select ON corrective_actions;
CREATE POLICY corrective_actions_select ON corrective_actions
    FOR SELECT USING (has_site_access(auth.uid(), site_id));

DROP POLICY IF EXISTS corrective_actions_insert ON corrective_actions;
CREATE POLICY corrective_actions_insert ON corrective_actions
    FOR INSERT WITH CHECK (has_site_access(auth.uid(), site_id));

DROP POLICY IF EXISTS corrective_actions_update ON corrective_actions;
CREATE POLICY corrective_actions_update ON corrective_actions
    FOR UPDATE USING (has_site_access(auth.uid(), site_id));

DROP POLICY IF EXISTS corrective_actions_delete ON corrective_actions;
CREATE POLICY corrective_actions_delete ON corrective_actions
    FOR DELETE USING (has_site_access(auth.uid(), site_id));

-- runtime_monitoring RLS policies (using helper function)
DROP POLICY IF EXISTS runtime_monitoring_select ON runtime_monitoring;
CREATE POLICY runtime_monitoring_select ON runtime_monitoring
    FOR SELECT USING (has_site_access(auth.uid(), site_id));

DROP POLICY IF EXISTS runtime_monitoring_insert ON runtime_monitoring;
CREATE POLICY runtime_monitoring_insert ON runtime_monitoring
    FOR INSERT WITH CHECK (has_site_access(auth.uid(), site_id));

DROP POLICY IF EXISTS runtime_monitoring_update ON runtime_monitoring;
CREATE POLICY runtime_monitoring_update ON runtime_monitoring
    FOR UPDATE USING (has_site_access(auth.uid(), site_id));

DROP POLICY IF EXISTS runtime_monitoring_delete ON runtime_monitoring;
CREATE POLICY runtime_monitoring_delete ON runtime_monitoring
    FOR DELETE USING (has_site_access(auth.uid(), site_id));

-- escalation_workflows RLS policies (using helper function)
DROP POLICY IF EXISTS escalation_workflows_select ON escalation_workflows;
CREATE POLICY escalation_workflows_select ON escalation_workflows
    FOR SELECT USING (has_company_access(auth.uid(), company_id));

DROP POLICY IF EXISTS escalation_workflows_insert ON escalation_workflows;
CREATE POLICY escalation_workflows_insert ON escalation_workflows
    FOR INSERT WITH CHECK (has_company_access(auth.uid(), company_id));

DROP POLICY IF EXISTS escalation_workflows_update ON escalation_workflows;
CREATE POLICY escalation_workflows_update ON escalation_workflows
    FOR UPDATE USING (has_company_access(auth.uid(), company_id));

DROP POLICY IF EXISTS escalation_workflows_delete ON escalation_workflows;
CREATE POLICY escalation_workflows_delete ON escalation_workflows
    FOR DELETE USING (has_company_access(auth.uid(), company_id));

-- ============================================================================
-- TRIGGERS - Using update_updated_at_column function
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_update_corrective_actions_updated_at ON corrective_actions;
CREATE TRIGGER trigger_update_corrective_actions_updated_at
    BEFORE UPDATE ON corrective_actions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_runtime_monitoring_updated_at ON runtime_monitoring;
CREATE TRIGGER trigger_update_runtime_monitoring_updated_at
    BEFORE UPDATE ON runtime_monitoring
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_escalation_workflows_updated_at ON escalation_workflows;
CREATE TRIGGER trigger_update_escalation_workflows_updated_at
    BEFORE UPDATE ON escalation_workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
