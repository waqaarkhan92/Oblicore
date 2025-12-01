/**
 * Verify document and obligations status comprehensively
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

  console.log('🔍 Comprehensive Status Check\n');
  console.log('=' + '='.repeat(79));

  // Get all documents
  const { data: docs } = await supabase
    .from('documents')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  for (const doc of docs || []) {
    console.log(`\n📄 Document: ${doc.title || 'Untitled'}`);
    console.log(`   ID: ${doc.id}`);
    console.log(`   Status: ${doc.extraction_status}`);
    console.log(`   Site: ${doc.site_id}`);
    console.log(`   Uploader: ${doc.uploaded_by}`);
    console.log(`   Created: ${doc.created_at}`);
    console.log(`   Updated: ${doc.updated_at}`);
    console.log(`   Has extracted_text: ${doc.extracted_text ? 'yes (' + doc.extracted_text.length + ' chars)' : 'no'}`);

    // Get obligations count
    const { data: obls, count } = await supabase
      .from('obligations')
      .select('id, obligation_title, deleted_at', { count: 'exact' })
      .eq('document_id', doc.id);

    const activeCount = obls?.filter(o => !o.deleted_at).length || 0;
    console.log(`   📋 Obligations: ${activeCount} active, ${(count || 0) - activeCount} deleted`);

    if (activeCount > 0) {
      console.log(`      Sample: ${obls?.[0].obligation_title?.substring(0, 60) || 'N/A'}...`);
    }

    // Get background job
    const { data: job } = await supabase
      .from('background_jobs')
      .select('*')
      .eq('job_type', 'DOCUMENT_EXTRACTION')
      .eq('payload->>document_id', doc.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (job) {
      console.log(`   🔧 Background Job:`);
      console.log(`      Status: ${job.status}`);
      console.log(`      Started: ${job.started_at || 'not started'}`);
      console.log(`      Completed: ${job.completed_at || 'not completed'}`);
      console.log(`      Updated: ${job.updated_at || 'never'}`);

      if (job.started_at && job.completed_at) {
        const duration = new Date(job.completed_at).getTime() - new Date(job.started_at).getTime();
        console.log(`      Duration: ${Math.floor(duration / 1000)} seconds`);
      }

      if (job.error) {
        console.log(`      Error: ${JSON.stringify(job.error).substring(0, 100)}`);
      }
    } else {
      console.log(`   ⚠️  No background job found!`);
    }

    // Check site access for uploader
    const { data: siteAccess } = await supabase
      .from('user_site_assignments')
      .select('id')
      .eq('user_id', doc.uploaded_by)
      .eq('site_id', doc.site_id)
      .maybeSingle();

    console.log(`   👤 Uploader has site access: ${siteAccess ? 'YES' : 'NO'}`);

    // Check what the extraction-status endpoint would return
    if (doc.extraction_status === 'COMPLETED') {
      console.log(`   ✅ Expected progress: 100%`);
    } else if (doc.extraction_status === 'PROCESSING') {
      console.log(`   ⚠️  Still PROCESSING (should be COMPLETED if obligations exist)`);
    }

    console.log('   ' + '-'.repeat(77));
  }

  console.log('\n' + '='.repeat(79));
  console.log('\n📊 Summary:');
  console.log(`   Total documents: ${docs?.length || 0}`);
  console.log(`   COMPLETED: ${docs?.filter(d => d.extraction_status === 'COMPLETED').length || 0}`);
  console.log(`   PROCESSING: ${docs?.filter(d => d.extraction_status === 'PROCESSING').length || 0}`);
  console.log(`   FAILED: ${docs?.filter(d => d.extraction_status === 'FAILED' || d.extraction_status === 'PROCESSING_FAILED').length || 0}`);
}

main();
