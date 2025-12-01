/**
 * Run SQL migration directly using database connection
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

// Load .env.local explicitly
config({ path: resolve(process.cwd(), '.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

async function runMigration(migrationFile: string) {
  console.log(`🚀 Running migration: ${migrationFile}\n`);

  const migrationPath = join(process.cwd(), 'supabase', 'migrations', migrationFile);
  const sql = readFileSync(migrationPath, 'utf-8');

  const client = new Client({
    connectionString: DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Execute the entire migration file
    await client.query(sql);
    console.log('✅ Migration executed successfully!\n');

    // Verify tables were created
    const tables = [
      'rule_library_patterns',
      'pattern_candidates',
      'pattern_events',
      'correction_records',
    ];

    console.log('🔍 Verifying tables were created:');
    for (const table of tables) {
      const result = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [table]
      );
      const exists = result.rows[0].exists;
      console.log(`  ${exists ? '✅' : '❌'} ${table}`);
    }
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    if (error.position) {
      console.error(`   Error at position: ${error.position}`);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Get migration file from command line args
const migrationFile = process.argv[2] || '20250128000024_create_rule_library_tables.sql';

runMigration(migrationFile).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

