import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const docId = 'b7a028a4-301d-43e9-a1b0-4a522d6f9f26';

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Direct query
  const { data: obls, error } = await supabase
    .from('obligations')
    .select('id, obligation_title, document_id, site_id, deleted_at')
    .eq('document_id', docId);

  console.log('Direct query result:');
  console.log('  Count:', obls?.length || 0);
  console.log('  Error:', error);

  if (obls && obls.length > 0) {
    console.log('  First 3:');
    obls.slice(0, 3).forEach(o => {
      console.log('    -', o.id, '| Site:', o.site_id, '| Deleted:', o.deleted_at);
    });
  }

  // Check document
  const { data: doc } = await supabase
    .from('documents')
    .select('site_id, uploaded_by')
    .eq('id', docId)
    .single();

  console.log('\nDocument:');
  console.log('  Site:', doc?.site_id);
  console.log('  Uploader:', doc?.uploaded_by);

  // Check user assignment
  if (doc) {
    const { data: assignment } = await supabase
      .from('user_site_assignments')
      .select('*')
      .eq('user_id', doc.uploaded_by)
      .eq('site_id', doc.site_id)
      .maybeSingle();

    console.log('  User assigned:', !!assignment);
  }
}

main();
