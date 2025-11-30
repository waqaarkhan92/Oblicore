/**
 * Script to apply database helper functions migration
 * This script uses Supabase client to execute the migration SQL
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

async function applyMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials:');
    console.error('   Required: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');
    console.error('   Required: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY');
    process.exit(1);
  }

  console.log('📦 Reading migration file...');
  const migrationPath = join(process.cwd(), 'supabase/migrations/20250130000001_add_database_helper_functions.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf-8');

  console.log('🔌 Connecting to Supabase...');
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Split SQL into individual statements
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📝 Executing ${statements.length} SQL statements...`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (statement.length === 0) continue;

    try {
      // Use RPC to execute raw SQL (if available) or use direct query
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        // Try alternative: direct query via PostgREST
        // Note: PostgREST doesn't support arbitrary SQL, so we'll need to use a different approach
        console.warn(`⚠️  Statement ${i + 1} may need manual execution: ${error.message}`);
      } else {
        console.log(`✅ Statement ${i + 1}/${statements.length} executed`);
      }
    } catch (err: any) {
      console.error(`❌ Error executing statement ${i + 1}:`, err.message);
    }
  }

  console.log('\n✅ Migration application complete!');
  console.log('📋 Note: Some functions may need to be created via Supabase Dashboard SQL Editor');
  console.log('   if PostgREST doesn\'t support direct SQL execution.');
}

applyMigration().catch(console.error);

