import { config } from 'dotenv';
import { resolve } from 'path';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

async function run() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  
  console.log('Checking audit_packs table structure...');
  
  // First check if table exists and what columns it has
  const { rows: columns } = await client.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'audit_packs' 
    ORDER BY ordinal_position
  `);
  
  console.log('Existing columns:', columns.map(c => c.column_name).join(', '));
  
  // Add columns if they don't exist
  const hasProgress = columns.some(c => c.column_name === 'generation_progress');
  const hasStage = columns.some(c => c.column_name === 'generation_stage');
  const hasStatus = columns.some(c => c.column_name === 'status');
  
  if (!hasProgress) {
    console.log('Adding generation_progress column...');
    await client.query(`
      ALTER TABLE audit_packs ADD COLUMN IF NOT EXISTS generation_progress INTEGER DEFAULT 0 
      CHECK (generation_progress >= 0 AND generation_progress <= 100)
    `);
  }
  
  if (!hasStage) {
    console.log('Adding generation_stage column...');
    await client.query(`
      ALTER TABLE audit_packs ADD COLUMN IF NOT EXISTS generation_stage TEXT 
      CHECK (generation_stage IN ('QUEUED', 'GATHERING_DATA', 'COLLECTING_EVIDENCE', 
             'RENDERING_PDF', 'UPLOADING', 'FINALIZING', 'COMPLETED', 'FAILED'))
    `);
  }
  
  // Add stage index
  console.log('Adding generation_stage index...');
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_audit_packs_generation_stage 
    ON audit_packs(generation_stage) 
    WHERE generation_stage IS NOT NULL
  `);
  
  // Only add status-based index if status column exists
  if (hasStatus) {
    console.log('Adding status-progress index...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_packs_generating 
      ON audit_packs(status, generation_progress) 
      WHERE status IN ('PENDING', 'GENERATING')
    `);
  } else {
    console.log('Skipping status-progress index (status column not present)');
  }
  
  console.log('✅ Migration completed!');
  await client.end();
}

run().catch(console.error);
