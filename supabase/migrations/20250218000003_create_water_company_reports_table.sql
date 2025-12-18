-- Water Company Reports Table
-- Stores generated reports for water company submissions

CREATE TABLE IF NOT EXISTS water_company_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  consent_id UUID REFERENCES documents(id) ON DELETE SET NULL,

  -- Report metadata
  report_type TEXT NOT NULL CHECK (report_type IN ('MONTHLY', 'QUARTERLY', 'ANNUAL', 'EXCEEDANCE', 'CUSTOM')),
  water_company TEXT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'GENERATING', 'COMPLETED', 'FAILED')),
  error_message TEXT,

  -- Generated file
  file_path TEXT,
  file_size_bytes INTEGER,

  -- Summary data (stored for quick access without downloading)
  summary JSONB DEFAULT '{}'::jsonb,

  -- Performance tracking
  generation_seconds INTEGER,

  -- Timestamps
  generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_water_company_reports_company ON water_company_reports(company_id);
CREATE INDEX idx_water_company_reports_site ON water_company_reports(site_id);
CREATE INDEX idx_water_company_reports_status ON water_company_reports(status);
CREATE INDEX idx_water_company_reports_type ON water_company_reports(report_type);
CREATE INDEX idx_water_company_reports_period ON water_company_reports(period_start, period_end);

-- RLS
ALTER TABLE water_company_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY water_company_reports_company_isolation ON water_company_reports
  FOR ALL
  USING (company_id IN (
    SELECT company_id FROM user_roles WHERE user_id = auth.uid()
  ));

-- Updated at trigger
CREATE TRIGGER set_water_company_reports_updated_at
  BEFORE UPDATE ON water_company_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE water_company_reports IS 'Stores generated reports for water company trade effluent submissions';
COMMENT ON COLUMN water_company_reports.summary IS 'JSON summary including total_samples, exceedances, parameters_monitored, total_discharge_volume, compliance_rate';
