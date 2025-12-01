/**
 * Clean up all documents and obligations
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

  console.log('🗑️  Cleaning up all documents and obligations...\n');

  // Count before deletion
  const { count: docsCount } = await supabase
    .from('documents')
    .select('id', { count: 'exact', head: true });

  const { count: oblsCount } = await supabase
    .from('obligations')
    .select('id', { count: 'exact', head: true });

  console.log('📊 Current counts:');
  console.log('   Documents:', docsCount);
  console.log('   Obligations:', oblsCount);

  if (docsCount === 0 && oblsCount === 0) {
    console.log('\n✅ Already clean!');
    return;
  }

  // Confirm deletion
  console.log('\n⚠️  This will DELETE all documents and obligations!');
  console.log('   Proceeding in 2 seconds...\n');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Delete obligations first (they reference documents)
  console.log('🗑️  Deleting obligations...');
  const { error: oblError } = await supabase
    .from('obligations')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (oblError) {
    console.error('❌ Error deleting obligations:', oblError);
  } else {
    console.log('✅ Obligations deleted');
  }

  // Delete background jobs
  console.log('🗑️  Deleting background jobs...');
  const { error: jobError } = await supabase
    .from('background_jobs')
    .delete()
    .eq('job_type', 'DOCUMENT_EXTRACTION');

  if (jobError) {
    console.error('❌ Error deleting jobs:', jobError);
  } else {
    console.log('✅ Background jobs deleted');
  }

  // Get all document storage paths
  const { data: docs } = await supabase
    .from('documents')
    .select('id, storage_path');

  // Delete documents
  console.log('🗑️  Deleting documents...');
  const { error: docError } = await supabase
    .from('documents')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (docError) {
    console.error('❌ Error deleting documents:', docError);
  } else {
    console.log('✅ Documents deleted');
  }

  // Delete files from storage
  if (docs && docs.length > 0) {
    console.log('🗑️  Deleting files from storage...');
    const filePaths = docs.map(d => d.storage_path).filter(Boolean);

    if (filePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove(filePaths);

      if (storageError) {
        console.error('❌ Error deleting files:', storageError);
      } else {
        console.log('✅ Files deleted from storage');
      }
    }
  }

  // Verify cleanup
  const { count: finalDocsCount } = await supabase
    .from('documents')
    .select('id', { count: 'exact', head: true });

  const { count: finalOblsCount } = await supabase
    .from('obligations')
    .select('id', { count: 'exact', head: true });

  console.log('\n📊 Final counts:');
  console.log('   Documents:', finalDocsCount);
  console.log('   Obligations:', finalOblsCount);

  console.log('\n✅ Cleanup complete! Ready for fresh testing.');
}

main();
