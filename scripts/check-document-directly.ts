/**
 * Check the exact document status the API would return
 */

import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const documentId = '03d21171-8403-4368-8477-1cba28694b72';

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase environment variables not set');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Query exactly as the API does
  const { data: document, error } = await supabase
    .from('documents')
    .select('id, extraction_status, created_at, updated_at')
    .eq('id', documentId)
    .is('deleted_at', null)
    .maybeSingle();

  console.log('📄 Document Query Result (as API would see it):');
  console.log('   ID:', document?.id);
  console.log('   extraction_status:', document?.extraction_status);
  console.log('   created_at:', document?.created_at);
  console.log('   updated_at:', document?.updated_at);
  console.log('   error:', error);

  // Check if browser might be seeing cached/stale RLS data
  console.log('\n🔍 Checking if this is an RLS cache issue...');

  // Try with a slight delay to see if data is eventually consistent
  await new Promise(resolve => setTimeout(resolve, 1000));

  const { data: document2, error: error2 } = await supabase
    .from('documents')
    .select('id, extraction_status')
    .eq('id', documentId)
    .maybeSingle();

  console.log('   Second query (1s later):');
  console.log('   extraction_status:', document2?.extraction_status);
  console.log('   Same as first?', document2?.extraction_status === document?.extraction_status);
}

main();
