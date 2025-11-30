/**
 * Apply Single Migration File
 * Uses pg library to execute SQL directly via database connection
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';
import pg from 'pg';

// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env.local') });

async function applyMigration() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ Missing DATABASE_URL in environment');
    console.error('   Please set DATABASE_URL in .env.local');
    process.exit(1);
  }

  console.log('📦 Reading migration file...');
  const migrationPath = join(process.cwd(), 'supabase/migrations/20250130000001_add_database_helper_functions.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf-8');

  console.log('🔌 Connecting to database...');
  const client = new pg.Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Execute the entire migration SQL
    console.log('📝 Executing migration SQL...');
    const result = await client.query(migrationSQL);

    console.log('✅ Migration applied successfully!');
    console.log(`   Functions created: pg_indexes, get_foreign_keys, check_rls_enabled`);
    console.log(`   Permissions granted to: authenticated, service_role\n`);

    // Verify functions were created
    console.log('🔍 Verifying functions...');
    const { rows } = await client.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
        AND routine_name IN ('pg_indexes', 'get_foreign_keys', 'check_rls_enabled', 'has_company_access')
      ORDER BY routine_name;
    `);

    const functionNames = rows.map(r => r.routine_name);
    console.log(`✅ Found ${functionNames.length} functions: ${functionNames.join(', ')}`);

    if (functionNames.length === 4) {
      console.log('\n🎉 All database helper functions are now available!');
    } else {
      console.log(`\n⚠️  Expected 4 functions, found ${functionNames.length}`);
    }

  } catch (error: any) {
    console.error('❌ Error applying migration:', error.message);
    if (error.code === '42P07') {
      console.error('   (Some objects may already exist - this is OK)');
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration().catch(console.error);

