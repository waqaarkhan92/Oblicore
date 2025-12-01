/**
 * Check obligation titles and original text
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

  console.log('📋 Checking Obligation Titles\n');

  // Get sample obligations
  const { data: obligations, error } = await supabase
    .from('obligations')
    .select('id, obligation_title, original_text, category, document_id')
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${obligations?.length || 0} obligations\n`);

  obligations?.forEach((obl, i) => {
    console.log(`${i + 1}. Obligation ID: ${obl.id.substring(0, 8)}...`);
    console.log(`   Title: ${obl.obligation_title || 'NULL'}`);
    console.log(`   Original text: ${obl.original_text?.substring(0, 100) || 'NULL'}...`);
    console.log(`   Category: ${obl.category || 'NULL'}`);
    console.log('');
  });
}

main();
