import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load .env.local explicitly
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('Checking if generation_progress columns exist in audit_packs...');
  
  // Test by querying with the new columns
  const { data, error } = await supabase
    .from('audit_packs')
    .select('id, generation_progress, generation_stage')
    .limit(1);

  if (error) {
    if (error.message.includes('column') && error.message.includes('does not exist')) {
      console.log('\n⚠️  Columns do not exist yet - migration needed');
      console.log('\nPlease run this SQL in Supabase dashboard SQL Editor:\n');
      console.log(`
-- Add generation_progress columns to audit_packs
ALTER TABLE audit_packs ADD COLUMN IF NOT EXISTS generation_progress INTEGER DEFAULT 0 
    CHECK (generation_progress >= 0 AND generation_progress <= 100);
    
ALTER TABLE audit_packs ADD COLUMN IF NOT EXISTS generation_stage TEXT 
    CHECK (generation_stage IN ('QUEUED', 'GATHERING_DATA', 'COLLECTING_EVIDENCE', 
           'RENDERING_PDF', 'UPLOADING', 'FINALIZING', 'COMPLETED', 'FAILED'));

CREATE INDEX IF NOT EXISTS idx_audit_packs_generation_stage 
    ON audit_packs(generation_stage) 
    WHERE generation_stage IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_packs_generating 
    ON audit_packs(status, generation_progress) 
    WHERE status IN ('PENDING', 'GENERATING');
      `);
    } else {
      console.error('Query error:', error.message);
    }
  } else {
    console.log('✅ Columns already exist!');
    if (data && data.length > 0) {
      console.log('Sample pack:', data[0]);
    } else {
      console.log('No packs in database yet.');
    }
  }
}

applyMigration().catch(console.error);
