-- Migration: 20250219000002_create_report_configs_table.sql
-- Description: Create report_configs table for storing saved report configurations
-- Author: Report Builder Feature
-- Date: 2025-12-19

-- ============================================================================
-- CREATE REPORT CONFIGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS report_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    data_type TEXT NOT NULL CHECK (data_type IN ('obligations', 'evidence', 'deadlines', 'sites', 'compliance')),
    columns TEXT[] NOT NULL DEFAULT '{}',
    filters JSONB NOT NULL DEFAULT '[]',
    date_range JSONB,
    group_by TEXT,
    sort_by JSONB,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_report_configs_company_id ON report_configs(company_id);
CREATE INDEX IF NOT EXISTS idx_report_configs_created_by ON report_configs(created_by);
CREATE INDEX IF NOT EXISTS idx_report_configs_data_type ON report_configs(data_type);
CREATE INDEX IF NOT EXISTS idx_report_configs_created_at ON report_configs(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_report_configs_updated_at
    BEFORE UPDATE ON report_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE report_configs ENABLE ROW LEVEL SECURITY;

-- Users can view report configs for their company
CREATE POLICY report_configs_select_policy ON report_configs
    FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Users can create report configs for their company
CREATE POLICY report_configs_insert_policy ON report_configs
    FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Users can update their own report configs
CREATE POLICY report_configs_update_policy ON report_configs
    FOR UPDATE
    USING (
        created_by = auth.uid() OR
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('COMPANY_ADMIN', 'SUPER_ADMIN')
        )
    );

-- Users can delete their own report configs
CREATE POLICY report_configs_delete_policy ON report_configs
    FOR DELETE
    USING (
        created_by = auth.uid() OR
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid() AND role IN ('COMPANY_ADMIN', 'SUPER_ADMIN')
        )
    );
