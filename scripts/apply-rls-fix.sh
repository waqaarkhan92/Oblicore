#!/bin/bash

# Apply RLS Fix Migration
# This fixes the infinite recursion in users table RLS policies

set -e

echo "Applying RLS fix migration..."

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "Supabase CLI not found. Applying migration manually via SQL..."
    echo "Please run this SQL in your Supabase SQL Editor:"
    echo ""
    cat supabase/migrations/20250129000003_fix_users_rls_recursion.sql
    echo ""
    exit 1
fi

# Apply migration
supabase db push --db-url "$DATABASE_URL" || {
    echo "Failed to apply migration via CLI. Please apply manually:"
    echo "supabase/migrations/20250129000003_fix_users_rls_recursion.sql"
    exit 1
}

echo "✅ RLS fix migration applied successfully"

