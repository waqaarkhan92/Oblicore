#!/bin/bash

# Apply All Fixes
# Applies RLS fixes and other migrations

set -e

echo "=========================================="
echo "Applying All Fixes"
echo "=========================================="
echo ""

# Try to load DATABASE_URL from .env.local if not set
if [ -z "$DATABASE_URL" ] && [ -f .env.local ]; then
    export DATABASE_URL=$(grep "^DATABASE_URL=" .env.local | cut -d '=' -f2- | tr -d '"' | tr -d "'" | head -1)
    if [ -n "$DATABASE_URL" ]; then
        echo "✅ Loaded DATABASE_URL from .env.local"
    fi
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ] && [ -z "$SUPABASE_DB_URL" ]; then
    echo "⚠️  DATABASE_URL not set and not found in .env.local"
    echo ""
    echo "Please choose one of the following options:"
    echo ""
    echo "Option 1: Set DATABASE_URL environment variable"
    echo "  export DATABASE_URL='postgresql://...'"
    echo "  ./scripts/apply-all-fixes.sh"
    echo ""
    echo "Option 2: Apply migrations manually in Supabase Dashboard"
    echo "  1. Open Supabase Dashboard → SQL Editor"
    echo "  2. Copy and paste SQL from: supabase/migrations/20250129000003_fix_users_rls_recursion.sql"
    echo "  3. Run the SQL"
    echo "  4. Copy and paste SQL from: supabase/migrations/20250129000004_fix_companies_rls_signup.sql"
    echo "  5. Run the SQL"
    echo ""
    echo "Option 3: Use Supabase CLI (if linked)"
    echo "  supabase db push"
    echo ""
    exit 1
fi

echo "Applying migrations..."
echo ""

# Apply migration 1: Fix users RLS recursion
echo "1. Applying users RLS recursion fix..."
echo "   File: supabase/migrations/20250129000003_fix_users_rls_recursion.sql"
if [ -n "$DATABASE_URL" ]; then
    psql "$DATABASE_URL" -f supabase/migrations/20250129000003_fix_users_rls_recursion.sql 2>&1 || {
        echo "❌ Failed to apply migration 1 via psql"
        echo "   Please apply manually in Supabase Dashboard → SQL Editor"
        exit 1
    }
elif [ -n "$SUPABASE_DB_URL" ]; then
    psql "$SUPABASE_DB_URL" -f supabase/migrations/20250129000003_fix_users_rls_recursion.sql 2>&1 || {
        echo "❌ Failed to apply migration 1 via psql"
        echo "   Please apply manually in Supabase Dashboard → SQL Editor"
        exit 1
    }
fi

echo "✅ Migration 1 applied successfully"
echo ""

# Apply migration 2: Fix companies RLS signup
echo "2. Applying companies RLS signup fix..."
echo "   File: supabase/migrations/20250129000004_fix_companies_rls_signup.sql"
if [ -n "$DATABASE_URL" ]; then
    psql "$DATABASE_URL" -f supabase/migrations/20250129000004_fix_companies_rls_signup.sql 2>&1 || {
        echo "❌ Failed to apply migration 2 via psql"
        echo "   Please apply manually in Supabase Dashboard → SQL Editor"
        exit 1
    }
elif [ -n "$SUPABASE_DB_URL" ]; then
    psql "$SUPABASE_DB_URL" -f supabase/migrations/20250129000004_fix_companies_rls_signup.sql 2>&1 || {
        echo "❌ Failed to apply migration 2 via psql"
        echo "   Please apply manually in Supabase Dashboard → SQL Editor"
        exit 1
    }
fi

echo "✅ Migration 2 applied successfully"
echo ""
echo "=========================================="
echo "✅ All fixes applied successfully!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Run tests: npm test"
echo "2. Verify signup works"
echo "3. Check test pass rate improved"
