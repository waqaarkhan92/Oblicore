/**
 * Check all obligations breakdown
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

  // Get ALL obligations
  const { data: allObls, count: totalCount } = await supabase
    .from('obligations')
    .select('id, document_id, obligation_title, deleted_at', { count: 'exact' });

  console.log('📋 Total obligations in database:', totalCount);
  console.log('   Active (not deleted):', allObls?.filter(o => !o.deleted_at).length || 0);

  // Group by document
  const byDoc: Record<string, number> = {};
  allObls?.filter(o => !o.deleted_at).forEach(o => {
    if (!byDoc[o.document_id]) byDoc[o.document_id] = 0;
    byDoc[o.document_id]++;
  });

  console.log('\nActive obligations by document:');
  Object.entries(byDoc).forEach(([docId, count]) => {
    console.log('   ', docId.substring(0, 8), '...:', count);
  });

  // Check the specific new document
  const docId = '286f968f-7dfa-4c34-9d54-c648b2ebd290';
  console.log('\n📄 Document 286f968f... obligations:', byDoc[docId] || 0);

  // Get document details
  const { data: doc } = await supabase
    .from('documents')
    .select('title, extraction_status, site_id, uploaded_by')
    .eq('id', docId)
    .single();

  if (doc) {
    console.log('   Title:', doc.title);
    console.log('   Status:', doc.extraction_status);
    console.log('   Site:', doc.site_id);
    console.log('   Uploader:', doc.uploaded_by);
  }
}

main();
