# Phase 1.1: Supabase Project Setup

## ✅ What's Already Done
- ✅ Supabase project created (West London region)
- ✅ Connection configured (Transaction Pooler)
- ✅ Environment variables set up

## 📋 What Needs to Be Done

### 1. Enable Database Extensions

**Run this SQL in Supabase Dashboard → SQL Editor:**

```sql
-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable trigram similarity extension (for fuzzy text search)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

**Or use the migration file:**
- File: `supabase/migrations/20250128000000_enable_extensions.sql`
- Run in Supabase SQL Editor

**Verify extensions:**
```sql
SELECT extname, extversion FROM pg_extension 
WHERE extname IN ('uuid-ossp', 'pg_trgm');
```

Expected output:
- `uuid-ossp` with version
- `pg_trgm` with version

### 2. Create Storage Buckets

**Go to Supabase Dashboard → Storage → Create Bucket**

Create these 4 buckets:

#### Bucket 1: `documents`
- **Name:** `documents`
- **Public:** No (private)
- **File size limit:** 50 MB
- **Purpose:** Store permit PDFs and other documents

#### Bucket 2: `evidence`
- **Name:** `evidence`
- **Public:** No (private)
- **File size limit:** 20 MB
- **Purpose:** Store evidence files (PDFs, images, documents)

#### Bucket 3: `audit-packs`
- **Name:** `audit-packs`
- **Public:** No (private)
- **File size limit:** 50 MB
- **Purpose:** Store generated audit pack PDFs

#### Bucket 4: `aer-documents`
- **Name:** `aer-documents`
- **Public:** No (private)
- **File size limit:** 50 MB
- **Purpose:** Store Module 3 AER (Annual Emission Report) documents

**Storage Policies:**
- All buckets should be private (not public)
- RLS policies will be added in Phase 1.4 to control access

### 3. Configure CORS (for frontend)

**Go to Supabase Dashboard → Settings → API → CORS**

Add your frontend domain:
- For development: `http://localhost:3000`
- For production: Your production domain (e.g., `https://app.oblicore.com`)

**CORS Settings:**
- Allow credentials: Yes
- Allowed origins: Add localhost:3000 and your production domain

### 4. Enable Database Backups

**Go to Supabase Dashboard → Settings → Database → Backups**

1. **Enable Point-in-Time Recovery (PITR):**
   - If on paid plan: Enable PITR
   - Retention: 7 days (free tier) or 30 days (paid)
   - Automatic backups run daily

2. **Create Manual Backup (Before Schema Creation):**
   - Go to Database → Backups
   - Click "Create Backup"
   - Name: `pre-phase-1-schema-backup`
   - This creates a snapshot before we create tables

### 5. Verify Project Settings

**Check these in Supabase Dashboard:**

- ✅ **Region:** West London (EU)
- ✅ **Row Level Security:** Enabled (default)
- ✅ **Connection Pooling:** Enabled (Transaction mode - port 6543)
- ✅ **Database Password:** Set (you have this in DATABASE_URL)

## ✅ Verification Checklist

After completing all steps, verify:

- [ ] Extensions enabled: `uuid-ossp` and `pg_trgm`
- [ ] 4 storage buckets created: `documents`, `evidence`, `audit-packs`, `aer-documents`
- [ ] CORS configured for `localhost:3000`
- [ ] Database backup enabled (PITR if on paid plan)
- [ ] Manual backup created before schema creation

## 🎯 Next Step

Once verified, proceed to **Phase 1.2: Database Schema Creation**

