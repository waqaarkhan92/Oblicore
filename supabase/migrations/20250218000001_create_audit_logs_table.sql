-- Migration: 20250218000001_create_audit_logs_table.sql
-- Description: Create audit_logs table for tracking all entity changes
-- Author: Build System
-- Date: 2025-02-18

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL, -- 'obligation', 'evidence', 'document', 'pack', 'corrective_action'
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'status_change'
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  changes JSONB DEFAULT '{}', -- { field: { old: value, new: value } }
  metadata JSONB DEFAULT '{}', -- Additional context
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add action column if table exists but column doesn't
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS action VARCHAR(50);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- Only create action index if the column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'action') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)';
  END IF;
END $$;

-- Add comment to table
COMMENT ON TABLE audit_logs IS 'Audit trail for tracking all changes to entities across the platform';

-- Add comments conditionally
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'entity_type') THEN
    COMMENT ON COLUMN audit_logs.entity_type IS 'Type of entity being audited (obligation, evidence, document, pack, corrective_action)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'entity_id') THEN
    COMMENT ON COLUMN audit_logs.entity_id IS 'ID of the entity being audited';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'action') THEN
    COMMENT ON COLUMN audit_logs.action IS 'Action performed (create, update, delete, status_change)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'user_id') THEN
    COMMENT ON COLUMN audit_logs.user_id IS 'User who performed the action';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'changes') THEN
    COMMENT ON COLUMN audit_logs.changes IS 'JSON object containing field changes: { field: { old: value, new: value } }';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'metadata') THEN
    COMMENT ON COLUMN audit_logs.metadata IS 'Additional context about the change';
  END IF;
END $$;

-- Create RLS policies for audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view audit logs for entities in their company
DROP POLICY IF EXISTS audit_logs_select_policy ON audit_logs;
CREATE POLICY audit_logs_select_policy ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
    )
  );

-- Policy: Only system (service role) can insert audit logs
DROP POLICY IF EXISTS audit_logs_insert_policy ON audit_logs;
CREATE POLICY audit_logs_insert_policy ON audit_logs
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
  );

-- No update or delete policies - audit logs are immutable
