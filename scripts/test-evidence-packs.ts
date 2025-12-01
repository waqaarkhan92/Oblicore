/**
 * Test evidence and packs endpoints to diagnose errors
 */

import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase environment variables not set');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 Testing Evidence and Packs Tables\n');
  console.log('=' + '='.repeat(79));

  // Test evidence_items table
  console.log('\n📦 Testing evidence_items table:');
  const { data: evidence, error: evidenceError, count: evidenceCount } = await supabase
    .from('evidence_items')
    .select('*', { count: 'exact' })
    .limit(5);

  if (evidenceError) {
    console.log('   ❌ Error:', evidenceError.message);
    console.log('   Code:', evidenceError.code);
    console.log('   Details:', evidenceError.details);
    console.log('   Hint:', evidenceError.hint);
  } else {
    console.log('   ✅ Success!');
    console.log('   Count:', evidenceCount);
    console.log('   Sample:', evidence?.length || 0, 'items');
  }

  // Test audit_packs table
  console.log('\n📋 Testing audit_packs table:');
  const { data: packs, error: packsError, count: packsCount } = await supabase
    .from('audit_packs')
    .select('*', { count: 'exact' })
    .limit(5);

  if (packsError) {
    console.log('   ❌ Error:', packsError.message);
    console.log('   Code:', packsError.code);
    console.log('   Details:', packsError.details);
    console.log('   Hint:', packsError.hint);
  } else {
    console.log('   ✅ Success!');
    console.log('   Count:', packsCount);
    console.log('   Sample:', packs?.length || 0, 'items');
  }

  // Test if tables exist
  console.log('\n🔍 Checking if tables exist in schema:');
  const { data: tables, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .in('table_name', ['evidence_items', 'audit_packs']);

  if (tablesError) {
    console.log('   ❌ Error checking schema:', tablesError.message);
  } else {
    console.log('   Tables found:', tables?.map(t => t.table_name).join(', ') || 'none');
  }

  console.log('\n' + '='.repeat(80));
}

main();
