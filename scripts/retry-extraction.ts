/**
 * Manually retry extraction for a document
 */

import { createClient } from '@supabase/supabase-js';
import { env } from '../lib/env';
import { getQueue, QUEUE_NAMES } from '../lib/queue/queue-manager';

async function retryExtraction() {
  const documentId = '90dc188b-fbbd-45fb-8839-8b43348219ec';
  
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  
  // Get document
  const { data: doc } = await supabase
    .from('documents')
    .select('id, site_id, storage_path, document_type, module_id')
    .eq('id', documentId)
    .single();
  
  if (!doc) {
    console.error('Document not found');
    process.exit(1);
  }
  
  // Get site
  const { data: site } = await supabase
    .from('sites')
    .select('id, company_id')
    .eq('id', doc.site_id)
    .single();
  
  if (!site) {
    console.error('Site not found');
    process.exit(1);
  }
  
  // Enqueue job
  const queue = getQueue(QUEUE_NAMES.DOCUMENT_PROCESSING);
  const job = await queue.add(
    'DOCUMENT_EXTRACTION',
    {
      document_id: documentId,
      company_id: site.company_id,
      site_id: doc.site_id,
      module_id: doc.module_id,
      file_path: doc.storage_path,
      document_type: doc.document_type,
    },
    { jobId: `retry-${documentId}-${Date.now()}` }
  );
  
  console.log(`✅ Job enqueued: ${job.id}`);
  console.log(`📋 Document: ${documentId}`);
  
  // Update status
  await supabase
    .from('documents')
    .update({ extraction_status: 'PENDING' })
    .eq('id', documentId);
  
  console.log('✅ Document status reset to PENDING');
}

retryExtraction().catch(console.error);

