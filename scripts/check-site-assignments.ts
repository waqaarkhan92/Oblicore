/**
 * Check user site assignments for all documents
 */

import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const userId = '5bdd6097-c197-4826-a93f-c845a64c6bfe';

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase environment variables not set');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log(`👤 Checking site assignments for user: ${userId}\n`);

  // Get all documents and their sites
  const { data: docs } = await supabase
    .from('documents')
    .select('id, title, site_id, uploaded_by, extraction_status')
    .is('deleted_at', null);

  console.log(`📄 Total documents: ${docs?.length || 0}\n`);

  // Get user's site assignments
  const { data: assignments } = await supabase
    .from('user_site_assignments')
    .select('site_id')
    .eq('user_id', userId);

  const assignedSites = new Set(assignments?.map(a => a.site_id) || []);

  console.log(`✅ User is assigned to ${assignedSites.size} sites:`);
  assignedSites.forEach(siteId => {
    console.log(`   - ${siteId.substring(0, 8)}...`);
  });

  console.log('\n📋 Document access check:');

  for (const doc of docs || []) {
    const hasAccess = assignedSites.has(doc.site_id);
    const accessSymbol = hasAccess ? '✅' : '❌';

    // Get obligation count for this document
    const { count } = await supabase
      .from('obligations')
      .select('id', { count: 'exact', head: true })
      .eq('document_id', doc.id)
      .is('deleted_at', null);

    console.log(`   ${accessSymbol} ${doc.id.substring(0, 8)}... (${doc.extraction_status}) - ${count || 0} obligations`);
    console.log(`      Site: ${doc.site_id.substring(0, 8)}... | Title: ${doc.title?.substring(0, 40) || 'N/A'}`);
    console.log(`      Uploader: ${doc.uploaded_by?.substring(0, 8)}... | Has Access: ${hasAccess}`);
  }

  // Check if we need to create assignments
  console.log('\n🔧 Missing assignments:');
  let needsAssignment = false;
  for (const doc of docs || []) {
    if (!assignedSites.has(doc.site_id)) {
      needsAssignment = true;
      console.log(`   ❌ Site ${doc.site_id.substring(0, 8)}... for document ${doc.id.substring(0, 8)}...`);
    }
  }

  if (!needsAssignment) {
    console.log('   ✅ All sites are assigned!');
  }
}

main();
