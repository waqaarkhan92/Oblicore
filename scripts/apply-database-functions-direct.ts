/**
 * Apply Database Helper Functions Migration
 * Uses Supabase client to execute SQL directly
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env.local') });

async function applyMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials:');
    console.error('   Required: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');
    console.error('   Required: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY');
    console.error('\n💡 Check your .env.local file');
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

  // Split SQL into statements (handle multi-line statements)
  const statements = migrationSQL
    .split(/;\s*(?=\n|$)/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^\s*$/));

  console.log(`📝 Executing ${statements.length} SQL statements...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';'; // Add semicolon back
    if (statement.trim().length <= 1) continue;

    try {
      // Use Supabase's REST API to execute SQL via RPC
      // Note: This requires a custom function or direct database access
      // For now, we'll use a workaround: execute via PostgREST if possible
      
      // Try to execute via a helper RPC function (if it exists)
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql_query: statement 
      });

      if (error) {
        // If exec_sql doesn't exist, we need to use direct database connection
        console.warn(`⚠️  Statement ${i + 1} needs direct SQL execution: ${error.message.substring(0, 100)}`);
        errorCount++;
      } else {
        console.log(`✅ Statement ${i + 1}/${statements.length} executed`);
        successCount++;
      }
    } catch (err: any) {
      console.error(`❌ Error executing statement ${i + 1}:`, err.message.substring(0, 100));
      errorCount++;
    }
  }

  console.log(`\n📊 Results: ${successCount} succeeded, ${errorCount} failed`);
  
  if (errorCount > 0) {
    console.log('\n💡 Some statements may need to be executed directly via:');
    console.log('   1. Supabase Dashboard → SQL Editor');
    console.log('   2. Copy the SQL from: supabase/migrations/20250130000001_add_database_helper_functions.sql');
    console.log('   3. Paste and run');
  } else {
    console.log('\n✅ Migration applied successfully!');
  }
}

applyMigration().catch(console.error);

