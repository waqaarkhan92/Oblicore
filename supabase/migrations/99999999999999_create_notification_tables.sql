-- Migration: Create notification-related tables
-- Reference: docs/specs/42_Backend_Notifications.md

-- Notification Templates Table
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_code TEXT NOT NULL, -- e.g., 'DEADLINE_WARNING_7D'
  version INTEGER NOT NULL DEFAULT 1,
  subject_template TEXT NOT NULL,
  html_template TEXT NOT NULL,
  text_template TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  effective_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deprecated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  UNIQUE(template_code, version)
);

CREATE INDEX IF NOT EXISTS idx_notification_templates_active 
  ON notification_templates(template_code, is_active) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_notification_templates_code 
  ON notification_templates(template_code);

-- Dead Letter Queue Table (for failed notifications after max retries)
CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_dead_letter_queue_job_type 
  ON dead_letter_queue(job_type);

CREATE INDEX IF NOT EXISTS idx_dead_letter_queue_created_at 
  ON dead_letter_queue(created_at);

CREATE INDEX IF NOT EXISTS idx_dead_letter_queue_resolved 
  ON dead_letter_queue(resolved_at) 
  WHERE resolved_at IS NULL;

