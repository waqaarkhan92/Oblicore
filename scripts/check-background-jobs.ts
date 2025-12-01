/**
 * Check background jobs status for all documents
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

  console.log('📊 Background Jobs Status\n');

  // Get all extraction jobs
  const { data: jobs } = await supabase
    .from('background_jobs')
    .select('id, job_type, status, payload, started_at, updated_at, created_at, completed_at')
    .eq('job_type', 'DOCUMENT_EXTRACTION')
    .order('created_at', { ascending: false });

  console.log(`Total extraction jobs: ${jobs?.length || 0}\n`);

  // Group by status
  const byStatus: Record<string, number> = {};
  jobs?.forEach(job => {
    byStatus[job.status] = (byStatus[job.status] || 0) + 1;
  });

  console.log('Jobs by status:');
  Object.entries(byStatus).forEach(([status, count]) => {
    console.log(`   ${status}: ${count}`);
  });

  console.log('\n📄 Recent jobs:');
  jobs?.slice(0, 10).forEach(job => {
    const docId = (job.payload as any)?.document_id || 'unknown';
    const createdAt = new Date(job.created_at);
    const now = new Date();
    const minutesAgo = Math.floor((now.getTime() - createdAt.getTime()) / 60000);

    console.log(`\n   Job ID: ${job.id.substring(0, 8)}...`);
    console.log(`   Document: ${docId.substring(0, 8)}...`);
    console.log(`   Status: ${job.status}`);
    console.log(`   Created: ${minutesAgo} minutes ago`);
    console.log(`   Started: ${job.started_at ? 'yes' : 'no'}`);
    console.log(`   Completed: ${job.completed_at ? 'yes' : 'no'}`);

    if (job.status === 'RUNNING' && job.updated_at) {
      const lastUpdate = new Date(job.updated_at);
      const stuckMinutes = Math.floor((now.getTime() - lastUpdate.getTime()) / 60000);
      if (stuckMinutes > 5) {
        console.log(`   ⚠️  STUCK for ${stuckMinutes} minutes!`);
      }
    }
  });

  // Check for COMPLETED documents with RUNNING jobs
  console.log('\n🔍 Checking for mismatched states...');

  const { data: docs } = await supabase
    .from('documents')
    .select('id, extraction_status')
    .eq('extraction_status', 'COMPLETED')
    .is('deleted_at', null);

  for (const doc of docs || []) {
    const docJobs = jobs?.filter(j => (j.payload as any)?.document_id === doc.id);
    const runningJobs = docJobs?.filter(j => j.status === 'RUNNING' || j.status === 'PENDING');

    if (runningJobs && runningJobs.length > 0) {
      console.log(`\n   ⚠️  Document ${doc.id.substring(0, 8)}... is COMPLETED but has ${runningJobs.length} RUNNING/PENDING jobs`);
      runningJobs.forEach(job => {
        console.log(`      - Job ${job.id.substring(0, 8)}... status: ${job.status}`);
      });
    }
  }
}

main();
