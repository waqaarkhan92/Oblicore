-- Migration: 20250128000000_enable_extensions.sql
-- Description: Enable required PostgreSQL extensions
-- Author: Build System
-- Date: 2025-01-28

-- Enable UUID generation extension
-- Provides gen_random_uuid() function for UUID primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable trigram similarity extension
-- Provides fuzzy text search capabilities (used in full-text search indexes)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Verify extensions are enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp'
  ) THEN
    RAISE EXCEPTION 'uuid-ossp extension not enabled';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'
  ) THEN
    RAISE EXCEPTION 'pg_trgm extension not enabled';
  END IF;
END $$;

-- JSONB support is built-in to PostgreSQL, no extension needed

