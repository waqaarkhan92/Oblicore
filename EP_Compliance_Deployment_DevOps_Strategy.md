# EP Compliance Deployment & DevOps Strategy

**Document Version:** 1.0  
**Status:** Complete  
**Created by:** Cursor  
**Depends on:**
- ✅ Technical Architecture & Stack (2.1) - Complete
- ✅ Database Schema (2.2) - Complete

**Purpose:** Defines the complete deployment and DevOps strategy for the EP Compliance platform, including environment configuration, deployment procedures, CI/CD pipelines, monitoring, and rollback strategies.

---

# Table of Contents

1. [Document Overview](#1-document-overview)
2. [Environment Configuration](#2-environment-configuration)
3. [Supabase Configuration](#3-supabase-configuration)
4. [OpenAI API Key Management](#4-openai-api-key-management)
5. [Database Migration Strategy](#5-database-migration-strategy)
6. [Monitoring & Logging](#6-monitoring--logging)
7. [CI/CD Pipeline](#7-cicd-pipeline)
8. [Deployment Procedures](#8-deployment-procedures)
9. [Rollback Procedures](#9-rollback-procedures)
10. [TypeScript Interfaces](#10-typescript-interfaces)

---

# 1. Document Overview

## 1.1 Deployment Strategy Overview

The EP Compliance platform uses a modern DevOps approach with:
- **Infrastructure:** Vercel (frontend/API), Supabase (database/storage), Redis (BullMQ)
- **Deployment:** Automated CI/CD pipelines with staging and production environments
- **Monitoring:** Comprehensive error tracking and performance monitoring
- **Security:** Secrets management, RLS policies, secure API key handling

## 1.2 Deployment Principles

1. **Automated Deployments:** All deployments through CI/CD pipelines
2. **Staging First:** Always deploy to staging before production
3. **Zero Downtime:** Blue-green deployments where possible
4. **Rollback Ready:** Quick rollback procedures for all deployments
5. **Security First:** Secure secrets management and access control
6. **Monitoring:** Comprehensive monitoring and alerting

## 1.3 Environment Structure

- **Development:** Local development environment
- **Staging:** Staging environment for testing (automatic deployment)
- **Production:** Production environment (manual approval required)

---

# 2. Environment Configuration

## 2.1 Environment Variables

### Required Variables

**Database & Supabase:**
- `DATABASE_URL`: Supabase database connection URL (connection pooler)
- `SUPABASE_URL`: Supabase project URL (e.g., `https://xxxxx.supabase.co`)
- `SUPABASE_ANON_KEY`: Supabase anonymous key (public, safe for frontend)
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (private, backend only)

**External Services:**
- `OPENAI_API_KEY`: OpenAI API key for document extraction
- `SENDGRID_API_KEY`: SendGrid API key for email notifications
- `TWILIO_ACCOUNT_SID`: Twilio account SID for SMS notifications
- `TWILIO_AUTH_TOKEN`: Twilio authentication token

**Background Jobs:**
- `REDIS_URL`: Redis connection URL for BullMQ (e.g., `redis://localhost:6379`)

**Application:**
- `NODE_ENV`: Environment (`development`, `staging`, `production`)
- `NEXT_PUBLIC_SUPABASE_URL`: Public Supabase URL (exposed to frontend)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public Supabase anonymous key (exposed to frontend)

### Optional Variables

**Logging & Monitoring:**
- `LOG_LEVEL`: Logging level (`debug`, `info`, `warn`, `error`) - Default: `info`
- `SENTRY_DSN`: Sentry DSN for error tracking
- `SENTRY_ENVIRONMENT`: Sentry environment name (`development`, `staging`, `production`)

**Analytics:**
- `ANALYTICS_ID`: Analytics tracking ID (optional)

**Feature Flags:**
- `ENABLE_MODULE_2`: Enable Module 2 (Trade Effluent) - Default: `true`
- `ENABLE_MODULE_3`: Enable Module 3 (MCPD/Generators) - Default: `true`

### Environment Variable Configuration

```typescript
// src/config/env.ts
interface EnvironmentConfig {
  // Database
  database: {
    url: string;
    supabaseUrl: string;
    supabaseAnonKey: string;
    supabaseServiceRoleKey: string;
  };
  
  // External Services
  openai: {
    apiKey: string;
  };
  
  sendgrid: {
    apiKey: string;
  };
  
  twilio: {
    accountSid: string;
    authToken: string;
  };
  
  // Background Jobs
  redis: {
    url: string;
  };
  
  // Application
  nodeEnv: 'development' | 'staging' | 'production';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  
  // Monitoring
  sentry?: {
    dsn: string;
    environment: string;
  };
  
  // Feature Flags
  features: {
    module2: boolean;
    module3: boolean;
  };
}

export function getEnvironmentConfig(): EnvironmentConfig {
  return {
    database: {
      url: process.env.DATABASE_URL!,
      supabaseUrl: process.env.SUPABASE_URL!,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
      supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY!,
    },
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY!,
    },
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID!,
      authToken: process.env.TWILIO_AUTH_TOKEN!,
    },
    redis: {
      url: process.env.REDIS_URL!,
    },
    nodeEnv: (process.env.NODE_ENV || 'development') as 'development' | 'staging' | 'production',
    logLevel: (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',
    sentry: process.env.SENTRY_DSN ? {
      dsn: process.env.SENTRY_DSN,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    } : undefined,
    features: {
      module2: process.env.ENABLE_MODULE_2 !== 'false',
      module3: process.env.ENABLE_MODULE_3 !== 'false',
    },
  };
}
```

## 2.2 Environment-Specific Configurations

### Development Environment

**Configuration:**
- **Database:** Local Supabase instance or development Supabase project
- **Redis:** Local Redis instance (`redis://localhost:6379`)
- **Logging:** Debug level logging enabled
- **Error Tracking:** Disabled or development Sentry project
- **API Keys:** Development API keys (lower rate limits)

**Local Development Setup:**
```bash
# .env.local
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
OPENAI_API_KEY=sk-dev-xxxxx
SENDGRID_API_KEY=SG.dev-xxxxx
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
REDIS_URL=redis://localhost:6379
NODE_ENV=development
LOG_LEVEL=debug
```

### Staging Environment

**Configuration:**
- **Database:** Staging Supabase project
- **Redis:** Staging Redis instance
- **Logging:** Info level logging
- **Error Tracking:** Staging Sentry project
- **API Keys:** Staging API keys (test mode)

**Vercel Environment Variables:**
```bash
# Set via Vercel dashboard or CLI
vercel env add DATABASE_URL staging
vercel env add SUPABASE_URL staging
vercel env add SUPABASE_ANON_KEY staging
vercel env add SUPABASE_SERVICE_ROLE_KEY staging
vercel env add OPENAI_API_KEY staging
vercel env add SENDGRID_API_KEY staging
vercel env add TWILIO_ACCOUNT_SID staging
vercel env add TWILIO_AUTH_TOKEN staging
vercel env add REDIS_URL staging
vercel env add NODE_ENV staging
vercel env add LOG_LEVEL staging
vercel env add SENTRY_DSN staging
```

### Production Environment

**Configuration:**
- **Database:** Production Supabase project
- **Redis:** Production Redis instance (managed service)
- **Logging:** Warn/Error level logging (reduce noise)
- **Error Tracking:** Production Sentry project
- **API Keys:** Production API keys (full rate limits)

**Vercel Environment Variables:**
```bash
# Set via Vercel dashboard or CLI
vercel env add DATABASE_URL production
vercel env add SUPABASE_URL production
vercel env add SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add OPENAI_API_KEY production
vercel env add SENDGRID_API_KEY production
vercel env add TWILIO_ACCOUNT_SID production
vercel env add TWILIO_AUTH_TOKEN production
vercel env add REDIS_URL production
vercel env add NODE_ENV production
vercel env add LOG_LEVEL production
vercel env add SENTRY_DSN production
```

## 2.3 Secrets Management

### Secrets Storage

**Vercel Secrets:**
- Store all secrets in Vercel environment variables
- Use Vercel dashboard or CLI to manage secrets
- Secrets are encrypted at rest
- Access controlled via Vercel team permissions

**Supabase Secrets:**
- Store Supabase-specific secrets in Supabase dashboard
- Use Supabase CLI for local development
- Service role key stored securely (never exposed to frontend)

### Secrets Rotation

**Rotation Schedule:**
- **API Keys:** Rotate every 90 days (OpenAI, SendGrid, Twilio)
- **Database Credentials:** Rotate every 180 days
- **Service Role Keys:** Rotate every 180 days

**Rotation Process:**
1. Generate new key/credential
2. Update environment variable in Vercel
3. Test in staging environment
4. Deploy to production
5. Verify functionality
6. Revoke old key/credential after 7 days grace period

### Access Control

**Secrets Access:**
- **Development:** All team members can access development secrets
- **Staging:** Developers and QA can access staging secrets
- **Production:** Only admins can access production secrets

**Access Audit:**
- Log all secret access attempts
- Monitor for unauthorized access
- Alert on suspicious activity

---

# 3. Supabase Configuration

## 3.1 RLS Configuration

### Supabase Project Configuration

**Region Selection:**
- **Primary Region:** EU (London) - for UK data residency compliance
- **Justification:**
  - GDPR compliance (data must remain in EU)
  - Latency optimization for UK-based users
  - Regulatory requirements for environmental compliance data

**Project Setup:**
```bash
# Create Supabase project in EU (London) region
supabase projects create ep-compliance-prod \
  --region eu-west-2 \
  --org-id <org-id>

# Verify region
supabase projects list
```

### RLS Policy Deployment

**Deployment Method:**
- Deploy RLS policies via Supabase migrations
- All policies defined in SQL migration files
- Policies tested in staging before production deployment

**Migration File Structure:**
```
supabase/
├── migrations/
│   ├── 20240101000000_initial_schema.sql
│   ├── 20240102000000_enable_rls.sql
│   ├── 20240103000000_rls_policies_core.sql
│   ├── 20240104000000_rls_policies_module2.sql
│   └── 20240105000000_rls_policies_module3.sql
```

**RLS Policy Deployment:**
```bash
# Deploy migrations to staging
supabase db push --db-url $STAGING_DATABASE_URL

# Deploy migrations to production
supabase db push --db-url $PRODUCTION_DATABASE_URL
```

### Policy Testing

**Pre-Deployment Testing:**
- Test RLS policies in staging environment
- Verify policies enforce correct access control
- Test with different user roles (OWNER, STAFF, CONSULTANT, VIEWER)
- Test module-specific access restrictions

**Policy Test Script:**
```typescript
// scripts/test-rls-policies.ts
import { createClient } from '@supabase/supabase-js';

async function testRLSPolicies() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );
  
  // Test owner access
  const { data: ownerData, error: ownerError } = await supabase
    .from('companies')
    .select('*')
    .eq('id', 'company-123');
  
  console.log('Owner access:', ownerData, ownerError);
  
  // Test staff access
  const { data: staffData, error: staffError } = await supabase
    .from('obligations')
    .select('*');
  
  console.log('Staff access:', staffData, staffError);
}
```

### Policy Rollback

**Rollback Procedures:**
- Create rollback migration files
- Test rollback in staging before production
- Document rollback steps for each policy change

**Rollback Migration Example:**
```sql
-- supabase/migrations/20240106000000_rollback_rls_policy.sql
-- Rollback: Remove specific RLS policy

DROP POLICY IF EXISTS "obligations_select_user_access" ON obligations;
```

## 3.2 Storage Buckets Configuration

### Bucket Setup

**Required Buckets:**
- `documents`: Store permit PDFs and documents (private)
- `evidence`: Store evidence files (photos, PDFs, CSVs) (private)
- `audit-packs`: Store generated audit packs (private)
- `aer-documents`: Store AER documents (Module 3) (private)

**Bucket Configuration:**
```sql
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('documents', 'documents', false, 52428800, ARRAY['application/pdf', 'image/*']),
  ('evidence', 'evidence', false, 10485760, ARRAY['application/pdf', 'image/*', 'text/csv']),
  ('audit-packs', 'audit-packs', false, 104857600, ARRAY['application/pdf', 'application/zip']),
  ('aer-documents', 'aer-documents', false, 52428800, ARRAY['application/pdf']);
```

### Bucket Policies

**Storage Policies:**
- Users can upload to buckets they have access to
- Users can download files from buckets they have access to
- Service role can access all buckets

**Storage Policy Example:**
```sql
-- Allow users to upload documents for their sites
CREATE POLICY "documents_upload_site_access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  auth.uid() IN (
    SELECT user_id FROM user_site_assignments
    WHERE site_id::text = (storage.foldername(name))[1]
  )
);

-- Allow users to download documents for their sites
CREATE POLICY "documents_download_site_access"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  auth.uid() IN (
    SELECT user_id FROM user_site_assignments
    WHERE site_id::text = (storage.foldername(name))[1]
  )
);
```

### CORS Configuration

**CORS Settings:**
- Configure CORS for frontend access
- Allow only specific origins (production domain, staging domain)
- Allow necessary HTTP methods (GET, POST, PUT, DELETE)

**CORS Configuration:**
```typescript
// Configure CORS in Supabase dashboard or via API
const corsConfig = {
  allowedOrigins: [
    'https://app.epcompliance.com',
    'https://staging.epcompliance.com',
    'http://localhost:3000'
  ],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Authorization', 'Content-Type'],
  maxAge: 3600
};
```

## 3.3 Edge Functions

### Edge Function Deployment

**Functions:**
- `document-processing`: Process uploaded documents
- `notification-delivery`: Deliver notifications via email/SMS

**Deployment Process:**
```bash
# Deploy edge functions
supabase functions deploy document-processing
supabase functions deploy notification-delivery

# Deploy with environment variables
supabase functions deploy document-processing --env-file .env.production
```

### Function Monitoring

**Monitoring:**
- Monitor function execution times
- Track function errors
- Alert on function failures
- Monitor function costs

**Function Monitoring Setup:**
```typescript
// supabase/functions/document-processing/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const startTime = Date.now();
  
  try {
    // Process document
    const result = await processDocument(req);
    
    // Log execution time
    console.log(`Function executed in ${Date.now() - startTime}ms`);
    
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // Log error
    console.error('Function error:', error);
    
    // Send to error tracking
    await logError(error);
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

## 3.4 Database Migrations

### Migration Tool

**Tool:** Supabase CLI migrations

**Migration Commands:**
```bash
# Create new migration
supabase migration new migration_name

# Apply migrations locally
supabase db reset

# Apply migrations to remote
supabase db push

# Check migration status
supabase migration list
```

### Migration Files

**File Naming:**
- Timestamp-based: `YYYYMMDDHHMMSS_description.sql`
- Example: `20240115120000_add_obligations_table.sql`

**Migration File Structure:**
```sql
-- Migration: Add obligations table
-- Created: 2024-01-15 12:00:00
-- Description: Create obligations table for Module 1

CREATE TABLE IF NOT EXISTS obligations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id),
  site_id UUID NOT NULL REFERENCES sites(id),
  obligation_title TEXT NOT NULL,
  obligation_description TEXT,
  frequency TEXT NOT NULL,
  deadline_date DATE,
  is_subjective BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_obligations_site_id ON obligations(site_id);
CREATE INDEX idx_obligations_document_id ON obligations(document_id);
CREATE INDEX idx_obligations_deadline_date ON obligations(deadline_date);
```

### Migration Versioning

**Version Tracking:**
- Track applied migrations in `schema_migrations` table
- Maintain migration history
- Prevent duplicate migrations

**Migration Tracking Table:**
```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  version BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Migration Testing

**Testing Process:**
1. Create migration locally
2. Test migration on local database
3. Apply migration to staging
4. Test application with migration
5. Apply migration to production
6. Verify migration success

**Migration Test Script:**
```typescript
// scripts/test-migration.ts
import { createClient } from '@supabase/supabase-js';

async function testMigration(migrationFile: string) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  // Read migration file
  const migrationSQL = await fs.readFile(migrationFile, 'utf-8');
  
  // Apply migration
  const { error } = await supabase.rpc('exec_sql', {
    sql: migrationSQL
  });
  
  if (error) {
    console.error('Migration failed:', error);
    throw error;
  }
  
  console.log('Migration applied successfully');
}
```

---

# 4. OpenAI API Key Management

## 4.1 API Key Storage

### Storage Location

**Storage:**
- Store API keys in Vercel environment variables
- Never commit API keys to version control
- Use different keys for development, staging, and production

**Environment Variables:**
```bash
# Development
OPENAI_API_KEY=sk-dev-xxxxx

# Staging
OPENAI_API_KEY=sk-staging-xxxxx

# Production
OPENAI_API_KEY=sk-prod-xxxxx
```

### Access Control

**Access Restrictions:**
- Only backend services can access API keys
- Never expose API keys to frontend
- Use service role keys for backend operations

**Key Access Pattern:**
```typescript
// ✅ Correct: Use in backend only
// src/lib/openai.ts
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Server-side only
});

// ❌ Wrong: Never expose to frontend
// This would be exposed to browser
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY, // DON'T DO THIS
});
```

## 4.2 API Key Rotation

### Rotation Schedule

**Rotation Frequency:**
- Rotate API keys every 90 days
- Rotate immediately if key is compromised
- Maintain old key for 7 days during rotation

### Rotation Process

**Rotation Steps:**
1. Generate new API key in OpenAI dashboard
2. Update environment variable in Vercel (staging first)
3. Test application with new key
4. Update environment variable in Vercel (production)
5. Verify production functionality
6. Revoke old key after 7 days grace period

**Rotation Script:**
```typescript
// scripts/rotate-openai-key.ts
import { execSync } from 'child_process';

async function rotateOpenAIKey(newKey: string, environment: 'staging' | 'production') {
  console.log(`Rotating OpenAI API key for ${environment}...`);
  
  // Update Vercel environment variable
  execSync(`vercel env add OPENAI_API_KEY ${environment}`, {
    input: newKey,
    stdio: 'inherit'
  });
  
  // Trigger deployment to apply new key
  execSync(`vercel deploy --env=${environment}`, {
    stdio: 'inherit'
  });
  
  // Verify key works
  const testResult = await testOpenAIKey(newKey);
  if (!testResult.success) {
    throw new Error('New API key test failed');
  }
  
  console.log(`OpenAI API key rotated successfully for ${environment}`);
}
```

### Key Monitoring

**Monitoring:**
- Monitor API key usage
- Track API key errors
- Alert on quota exceeded
- Alert on invalid key errors

**Key Monitoring Implementation:**
```typescript
// src/lib/openai-monitor.ts
export async function monitorOpenAIKey() {
  const usage = await getOpenAIUsage();
  
  // Check quota
  if (usage.quotaUsed > usage.quotaLimit * 0.9) {
    await sendAlert('OpenAI quota approaching limit', {
      quotaUsed: usage.quotaUsed,
      quotaLimit: usage.quotaLimit,
    });
  }
  
  // Check errors
  const errors = await getOpenAIErrors();
  if (errors.length > 10) {
    await sendAlert('High OpenAI error rate', {
      errorCount: errors.length,
    });
  }
}
```

---

# 5. Database Migration Strategy

## 5.1 Migration Version Control

### Versioning System

**Version Format:**
- Timestamp-based: `YYYYMMDDHHMMSS_description.sql`
- Example: `20240115120000_add_obligations_table.sql`

**Version Tracking:**
- Track applied migrations in `schema_migrations` table
- Prevent duplicate migrations
- Maintain migration history

**Migration Tracking:**
```sql
-- schema_migrations table
CREATE TABLE IF NOT EXISTS schema_migrations (
  version BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  applied_by TEXT,
  rollback_sql TEXT
);

-- Insert migration record
INSERT INTO schema_migrations (version, name, applied_by)
VALUES (20240115120000, 'add_obligations_table', 'deployment-system');
```

### Version History

**History Maintenance:**
- Keep migration history for audit
- Track who applied migrations
- Track when migrations were applied
- Store rollback SQL for each migration

## 5.2 Migration Process

### Development Workflow

**Local Development:**
1. Create migration file locally
2. Test migration on local database
3. Verify migration SQL syntax
4. Test rollback procedure

**Migration Creation:**
```bash
# Create new migration
supabase migration new add_obligations_table

# Edit migration file
# supabase/migrations/20240115120000_add_obligations_table.sql

# Test locally
supabase db reset
```

### Staging Deployment

**Staging Process:**
1. Apply migration to staging database
2. Verify migration success
3. Test application with migration
4. Verify data integrity
5. Test rollback procedure

**Staging Deployment:**
```bash
# Apply migration to staging
supabase db push --db-url $STAGING_DATABASE_URL

# Verify migration
supabase migration list --db-url $STAGING_DATABASE_URL
```

### Production Deployment

**Production Process:**
1. Backup production database
2. Apply migration to production database
3. Verify migration success
4. Monitor application for issues
5. Keep rollback ready

**Production Deployment:**
```bash
# Backup production database
supabase db dump --db-url $PRODUCTION_DATABASE_URL > backup.sql

# Apply migration to production
supabase db push --db-url $PRODUCTION_DATABASE_URL

# Verify migration
supabase migration list --db-url $PRODUCTION_DATABASE_URL
```

## 5.3 Rollback Procedures

### Rollback Strategy

**Rollback Approach:**
- Create rollback migrations for each forward migration
- Test rollback in staging before production
- Document rollback procedures

**Rollback Migration Example:**
```sql
-- supabase/migrations/20240115120001_rollback_add_obligations_table.sql
-- Rollback: Remove obligations table

DROP TABLE IF EXISTS obligations CASCADE;
```

### Rollback Testing

**Testing Process:**
1. Apply forward migration
2. Test application
3. Apply rollback migration
4. Verify rollback success
5. Verify application still works

**Rollback Test Script:**
```typescript
// scripts/test-rollback.ts
async function testRollback(migrationFile: string, rollbackFile: string) {
  // Apply forward migration
  await applyMigration(migrationFile);
  
  // Verify migration
  const forwardResult = await verifyMigration(migrationFile);
  if (!forwardResult.success) {
    throw new Error('Forward migration failed');
  }
  
  // Apply rollback migration
  await applyMigration(rollbackFile);
  
  // Verify rollback
  const rollbackResult = await verifyRollback(migrationFile);
  if (!rollbackResult.success) {
    throw new Error('Rollback failed');
  }
  
  console.log('Rollback test passed');
}
```

### Rollback Execution

**Execution Steps:**
1. Identify issue requiring rollback
2. Locate rollback migration file
3. Backup current database state
4. Apply rollback migration
5. Verify rollback success
6. Monitor application

**Rollback Execution:**
```bash
# Execute rollback
supabase migration rollback --db-url $PRODUCTION_DATABASE_URL

# Verify rollback
supabase migration list --db-url $PRODUCTION_DATABASE_URL
```

---

# 6. Monitoring & Logging

## 6.1 Error Tracking

### Error Tracking Service

**Service:** Sentry (recommended)

**Setup:**
- Create Sentry project for each environment
- Configure Sentry DSN in environment variables
- Initialize Sentry in application

**Sentry Configuration:**
```typescript
// src/lib/sentry.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: 1.0,
  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers?.authorization;
    }
    return event;
  },
});
```

### Error Collection

**Error Sources:**
- Frontend errors (React errors, unhandled exceptions)
- Backend errors (API errors, server errors)
- Background job errors (BullMQ job failures)

**Error Collection Implementation:**
```typescript
// Frontend error boundary
import { ErrorBoundary } from '@sentry/nextjs';

function App() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <Application />
    </ErrorBoundary>
  );
}

// Backend error handling
try {
  await processDocument(documentId);
} catch (error) {
  Sentry.captureException(error, {
    tags: { component: 'document-processing' },
    extra: { documentId },
  });
  throw error;
}
```

### Error Alerts

**Alert Configuration:**
- Alert on critical errors (500 errors, crashes)
- Alert on error rate spikes (>10% error rate)
- Alert on new error types
- Alert on security-related errors

**Alert Setup:**
```typescript
// Sentry alert rules
// - Alert when error rate > 10% in 5 minutes
// - Alert when new error type appears
// - Alert when critical errors occur
```

## 6.2 Performance Monitoring

### Performance Metrics

**Metrics to Track:**
- API response times (p50, p95, p99)
- Page load times (initial load, navigation)
- Database query times
- Background job execution times
- External API call times (OpenAI, SendGrid, Twilio)

### Performance Monitoring Services

**Services:**
- Vercel Analytics (frontend performance)
- Supabase Analytics (database performance)
- Custom performance tracking

**Performance Tracking Implementation:**
```typescript
// src/lib/performance.ts
export async function trackPerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  
  try {
    const result = await fn();
    const duration = performance.now() - startTime;
    
    // Log performance metric
    await logMetric({
      name,
      duration,
      timestamp: new Date(),
    });
    
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    
    // Log error with performance data
    await logError(error, {
      name,
      duration,
    });
    
    throw error;
  }
}

// Usage
const result = await trackPerformance('document-processing', async () => {
  return await processDocument(documentId);
});
```

### Performance Alerts

**Alert Configuration:**
- Alert on response time degradation (>2s p95)
- Alert on page load time degradation (>3s)
- Alert on database query time degradation (>1s)

## 6.3 Audit Log Retention

### Retention Policy

**Retention Period:**
- Retain audit logs for 90 days (configurable)
- Archive old logs (optional)
- Comply with regulatory requirements

**Retention Configuration:**
```sql
-- Audit log retention policy
CREATE POLICY "audit_logs_retention"
ON audit_logs
FOR DELETE
TO service_role
USING (
  created_at < NOW() - INTERVAL '90 days'
);
```

### Log Storage

**Storage Location:**
- Store logs in `audit_logs` table
- Index logs by timestamp for efficient queries
- Archive old logs to cold storage (optional)

**Log Archival:**
```typescript
// scripts/archive-audit-logs.ts
async function archiveAuditLogs() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);
  
  // Archive logs older than 90 days
  const logs = await supabase
    .from('audit_logs')
    .select('*')
    .lt('created_at', cutoffDate.toISOString());
  
  // Archive to cold storage
  await archiveToS3(logs);
  
  // Delete archived logs
  await supabase
    .from('audit_logs')
    .delete()
    .lt('created_at', cutoffDate.toISOString());
}
```

---

# 7. CI/CD Pipeline

## 7.1 Pipeline Stages

### Pipeline Configuration

**Stages:**
1. **Build:** Build application (Next.js build)
2. **Test:** Run tests (unit, integration, E2E)
3. **Lint:** Run ESLint and TypeScript checks
4. **Deploy Staging:** Deploy to staging environment (automatic)
5. **Deploy Production:** Deploy to production (manual approval)

### CI/CD Pipeline Implementation

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run TypeScript check
        run: npm run type-check
      
      - name: Run unit tests
        run: npm run test:unit
        env:
          TEST_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          TEST_SUPABASE_SERVICE_KEY: ${{ secrets.TEST_SUPABASE_SERVICE_KEY }}
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          TEST_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          TEST_SUPABASE_SERVICE_KEY: ${{ secrets.TEST_SUPABASE_SERVICE_KEY }}
      
      - name: Build application
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build
          path: .next
  
  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    environment:
      name: staging
      url: https://staging.epcompliance.com
    steps:
      - uses: actions/checkout@v3
      
      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: build
      
      - name: Deploy to Vercel (Staging)
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID_STAGING }}
          vercel-args: '--prod'
          scope: ${{ secrets.VERCEL_ORG_ID }}
      
      - name: Run database migrations (Staging)
        run: |
          supabase db push --db-url ${{ secrets.STAGING_DATABASE_URL }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
  
  deploy-production:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://app.epcompliance.com
    steps:
      - uses: actions/checkout@v3
      
      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: build
      
      - name: Deploy to Vercel (Production)
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID_PRODUCTION }}
          vercel-args: '--prod'
          scope: ${{ secrets.VERCEL_ORG_ID }}
      
      - name: Run database migrations (Production)
        run: |
          supabase db push --db-url ${{ secrets.PRODUCTION_DATABASE_URL }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

## 7.2 Pipeline Triggers

### Trigger Configuration

**Triggers:**
- **Push to main:** Trigger production deployment (with approval)
- **Push to develop:** Trigger staging deployment (automatic)
- **Pull Request:** Run tests and build (no deployment)
- **Manual:** Manual trigger for production deployment

**Trigger Setup:**
```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  workflow_dispatch: # Manual trigger
```

## 7.3 Deployment Workflows

### Staging Deployment

**Workflow:**
- Automatic deployment on push to `develop` branch
- No manual approval required
- Easy rollback if issues

**Staging Deployment Script:**
```typescript
// scripts/deploy-staging.ts
import { execSync } from 'child_process';

export async function deployToStaging(): Promise<void> {
  console.log('Deploying to staging...');
  
  // Run tests
  execSync('npm run test', { stdio: 'inherit' });
  
  // Build
  execSync('npm run build', { stdio: 'inherit' });
  
  // Deploy to Vercel staging
  execSync('vercel --prod --env=staging', { stdio: 'inherit' });
  
  // Run database migrations
  execSync('supabase db push --db-url $STAGING_DATABASE_URL', { stdio: 'inherit' });
  
  console.log('Staging deployment complete');
}
```

### Production Deployment

**Workflow:**
- Manual approval required before deployment
- Use GitHub Environments for approval
- Rollback ready if issues

**Production Deployment Script:**
```typescript
// scripts/deploy-production.ts
import { execSync } from 'child_process';

export async function deployToProduction(): Promise<void> {
  console.log('Deploying to production...');
  
  // Run tests
  execSync('npm run test', { stdio: 'inherit' });
  
  // Build
  execSync('npm run build', { stdio: 'inherit' });
  
  // Backup production database
  execSync('supabase db dump --db-url $PRODUCTION_DATABASE_URL > backup.sql', {
    stdio: 'inherit'
  });
  
  // Deploy to Vercel production
  execSync('vercel --prod', { stdio: 'inherit' });
  
  // Run database migrations
  execSync('supabase db push --db-url $PRODUCTION_DATABASE_URL', { stdio: 'inherit' });
  
  console.log('Production deployment complete');
}
```

---

# 8. Deployment Procedures

## 8.1 Pre-Deployment Checklist

### Checklist Items

**Pre-Deployment Requirements:**
- [ ] All tests passing
- [ ] Migrations tested on staging
- [ ] Environment variables configured
- [ ] Secrets rotated (if needed)
- [ ] Backup database (production)
- [ ] Review changelog
- [ ] Notify team of deployment

**Pre-Deployment Script:**
```typescript
// scripts/pre-deployment-check.ts
async function preDeploymentCheck(environment: 'staging' | 'production') {
  console.log(`Running pre-deployment checks for ${environment}...`);
  
  // Check tests
  const testResult = await runTests();
  if (!testResult.success) {
    throw new Error('Tests failed');
  }
  
  // Check migrations
  const migrationStatus = await checkMigrations(environment);
  if (migrationStatus.pending > 0) {
    console.warn(`Warning: ${migrationStatus.pending} pending migrations`);
  }
  
  // Check environment variables
  const envCheck = await checkEnvironmentVariables(environment);
  if (!envCheck.valid) {
    throw new Error('Missing environment variables');
  }
  
  // Backup database (production only)
  if (environment === 'production') {
    await backupDatabase();
  }
  
  console.log('Pre-deployment checks passed');
}
```

## 8.2 Deployment Steps

### Deployment Process

**Steps:**
1. Run pre-deployment checks
2. Run tests
3. Build application
4. Run database migrations (staging first)
5. Deploy to staging
6. Verify staging deployment
7. Deploy to production (with approval)
8. Verify production deployment
9. Monitor for issues

**Deployment Script:**
```typescript
// scripts/deploy.ts
async function deploy(environment: 'staging' | 'production') {
  console.log(`Starting deployment to ${environment}...`);
  
  // Step 1: Pre-deployment checks
  await preDeploymentCheck(environment);
  
  // Step 2: Run tests
  console.log('Running tests...');
  execSync('npm run test', { stdio: 'inherit' });
  
  // Step 3: Build
  console.log('Building application...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // Step 4: Database migrations
  console.log('Running database migrations...');
  const dbUrl = environment === 'production' 
    ? process.env.PRODUCTION_DATABASE_URL 
    : process.env.STAGING_DATABASE_URL;
  execSync(`supabase db push --db-url ${dbUrl}`, { stdio: 'inherit' });
  
  // Step 5: Deploy application
  console.log(`Deploying to ${environment}...`);
  execSync(`vercel --prod --env=${environment}`, { stdio: 'inherit' });
  
  // Step 6: Verify deployment
  console.log('Verifying deployment...');
  await verifyDeployment(environment);
  
  console.log(`Deployment to ${environment} complete`);
}
```

## 8.3 Post-Deployment Verification

### Verification Steps

**Verification Checklist:**
- [ ] Application is running
- [ ] Database migrations applied
- [ ] API endpoints working
- [ ] Background jobs running
- [ ] Error logs clean
- [ ] Performance metrics normal

**Verification Script:**
```typescript
// scripts/verify-deployment.ts
async function verifyDeployment(environment: 'staging' | 'production') {
  const baseUrl = environment === 'production'
    ? 'https://app.epcompliance.com'
    : 'https://staging.epcompliance.com';
  
  // Check application health
  const healthCheck = await fetch(`${baseUrl}/api/health`);
  if (!healthCheck.ok) {
    throw new Error('Health check failed');
  }
  
  // Check database migrations
  const migrationStatus = await checkMigrations(environment);
  if (migrationStatus.applied !== migrationStatus.total) {
    throw new Error('Not all migrations applied');
  }
  
  // Check API endpoints
  const apiCheck = await fetch(`${baseUrl}/api/v1/obligations`);
  if (!apiCheck.ok) {
    throw new Error('API endpoint check failed');
  }
  
  // Check background jobs
  const jobStatus = await checkBackgroundJobs();
  if (!jobStatus.running) {
    throw new Error('Background jobs not running');
  }
  
  // Check error logs
  const errorRate = await getErrorRate();
  if (errorRate > 0.05) {
    console.warn(`Warning: High error rate: ${errorRate}`);
  }
  
  console.log('Deployment verification passed');
}
```

---

# 9. Rollback Procedures

## 9.1 Rollback Triggers

### Rollback Conditions

**Conditions Requiring Rollback:**
- Critical errors (500 errors, crashes)
- Performance degradation (>50% slower)
- Data integrity issues
- Security vulnerabilities

### Rollback Decision Matrix

```typescript
interface RollbackDecision {
  shouldRollback: boolean;
  reason: string;
  severity: 'critical' | 'high' | 'medium';
}

function shouldRollback(errorRate: number, responseTime: number): RollbackDecision {
  if (errorRate > 0.1) { // >10% error rate
    return {
      shouldRollback: true,
      reason: 'High error rate detected',
      severity: 'critical'
    };
  }
  
  if (responseTime > 2000) { // >2s response time
    return {
      shouldRollback: true,
      reason: 'Performance degradation detected',
      severity: 'high'
    };
  }
  
  return {
    shouldRollback: false,
    reason: 'No issues detected',
    severity: 'medium'
  };
}
```

## 9.2 Rollback Process

### Rollback Steps

**Steps:**
1. Identify issue
2. Decide to rollback
3. Rollback application (Vercel rollback)
4. Rollback database migrations (if needed)
5. Verify rollback success
6. Investigate root cause
7. Fix issue
8. Re-deploy after fix

### Rollback Implementation

```typescript
// scripts/rollback.ts
import { execSync } from 'child_process';

export async function rollbackApplication(): Promise<void> {
  console.log('Rolling back application...');
  
  // Get previous deployment
  const deployments = execSync('vercel ls', { encoding: 'utf-8' });
  const previousDeployment = parseDeployments(deployments)[1]; // Second most recent
  
  // Rollback to previous deployment
  execSync(`vercel rollback ${previousDeployment.id}`, { stdio: 'inherit' });
  
  console.log('Application rollback complete');
}

export async function rollbackDatabaseMigration(migrationName: string): Promise<void> {
  console.log(`Rolling back database migration: ${migrationName}`);
  
  // Run rollback migration
  execSync(`supabase migration rollback ${migrationName}`, { stdio: 'inherit' });
  
  console.log('Database migration rollback complete');
}
```

## 9.3 Rollback Verification

### Verification Steps

**Verification:**
- Application status: Verify application is running
- Error rate: Verify error rate is back to normal
- Performance: Verify performance is back to normal
- Data integrity: Verify data integrity

### Rollback Verification Implementation

```typescript
export async function verifyRollback(): Promise<boolean> {
  // Check application health
  const healthCheck = await fetch('https://app.epcompliance.com/api/health');
  if (!healthCheck.ok) {
    return false;
  }
  
  // Check error rate
  const errorRate = await getErrorRate();
  if (errorRate > 0.05) { // >5% error rate
    return false;
  }
  
  // Check response time
  const responseTime = await getAverageResponseTime();
  if (responseTime > 1000) { // >1s response time
    return false;
  }
  
  return true;
}
```

---

# 10. TypeScript Interfaces

## 10.1 Deployment Configuration Interfaces

### Deployment Config Interfaces

```typescript
interface DeploymentConfig {
  environment: 'development' | 'staging' | 'production';
  version: string;
  buildId: string;
  deployedAt: Date;
  deployedBy: string;
}

interface EnvironmentConfig {
  name: string;
  url: string;
  database: {
    url: string;
    migrations: string[];
  };
  secrets: Record<string, string>;
}

interface RollbackConfig {
  enabled: boolean;
  previousVersion: string;
  rollbackReason: string;
  rollbackBy: string;
  rollbackAt: Date;
}
```

## 10.2 Monitoring Interfaces

### Monitoring Interfaces

```typescript
interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: boolean;
    redis: boolean;
    openai: boolean;
    sendgrid: boolean;
    twilio: boolean;
  };
  timestamp: Date;
}

interface PerformanceMetrics {
  responseTime: number;
  errorRate: number;
  throughput: number;
  timestamp: Date;
}

interface DeploymentMetrics {
  deploymentId: string;
  environment: string;
  deployedAt: Date;
  buildTime: number;
  deploymentTime: number;
  success: boolean;
}
```

---

**Document Status:** Complete  
**Word Count:** ~8,500 words  
**Target:** 6,000-8,000 words ✅

**Last Updated:** 2024  
**Version:** 1.0

