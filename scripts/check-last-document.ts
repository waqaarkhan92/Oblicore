import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load env vars from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function checkLastDocument() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return;
  }
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  console.log('🔍 CHECKING LAST DOCUMENT STATUS...\n');
  
  // Get the most recent document
  // Note: extraction_error column doesn't exist in documents table
  const { data: documents, error: docsError } = await supabase
    .from('documents')
    .select('id, title, extraction_status, created_at, updated_at, extracted_text')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (docsError || !documents) {
    console.error('❌ Error fetching document:', docsError);
    return;
  }
  
  const doc = documents;
  console.log('📄 LAST DOCUMENT:');
  console.log(`   ID: ${doc.id}`);
  console.log(`   Title: ${doc.title || 'Untitled'}`);
  console.log(`   Status: ${doc.extraction_status}`);
  console.log(`   Created: ${doc.created_at}`);
  console.log(`   Updated: ${doc.updated_at}`);
  console.log(`   Has extracted text: ${doc.extracted_text ? `${doc.extracted_text.length} chars` : 'NO'}`);
  
  // Calculate time elapsed
  const createdAt = new Date(doc.created_at);
  const updatedAt = doc.updated_at ? new Date(doc.updated_at) : new Date();
  const elapsedMinutes = Math.floor((updatedAt.getTime() - createdAt.getTime()) / 1000 / 60);
  console.log(`   Time elapsed: ${elapsedMinutes} minutes`);
  
  // Check obligations
  console.log('\n📋 OBLIGATIONS:');
  const { data: obligations, error: oblError } = await supabase
    .from('obligations')
    .select('id, obligation_title, obligation_description, status, created_at')
    .eq('document_id', doc.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
  
  if (oblError) {
    console.error('   ❌ Error fetching obligations:', oblError.message);
  } else {
    console.log(`   Count: ${obligations?.length || 0}`);
    if (obligations && obligations.length > 0) {
      console.log('   First 3 obligations:');
      obligations.slice(0, 3).forEach((obl, i) => {
        console.log(`     ${i + 1}. Created: ${obl.created_at}`);
        console.log(`        Title: ${obl.obligation_title || 'Untitled'}`);
        console.log(`        Description: ${obl.obligation_description ? obl.obligation_description.substring(0, 50) + '...' : 'None'}`);
        console.log(`        Status: ${obl.status}`);
      });
      
      // Check timing
      const docCreated = new Date(doc.created_at);
      const firstOblCreated = new Date(obligations[0].created_at);
      const timeDiff = (firstOblCreated.getTime() - docCreated.getTime()) / 1000;
      console.log(`\n   ⏱️  Timing Analysis:`);
      console.log(`      Document created: ${doc.created_at}`);
      console.log(`      First obligation created: ${obligations[0].created_at}`);
      console.log(`      Time difference: ${timeDiff} seconds`);
      
      if (timeDiff < 1) {
        console.log(`      ⚠️  Obligations created IMMEDIATELY (suspicious - extraction takes time)`);
      } else if (timeDiff > 300) {
        console.log(`      ⚠️  Obligations created ${Math.floor(timeDiff / 60)} minutes later`);
      }
    } else {
      console.log('   ⚠️ NO OBLIGATIONS FOUND');
    }
  }
  
  // Check background job - try both query methods
  console.log('\n🔧 BACKGROUND JOB:');
  
  // Method 1: Query by payload->>document_id (what updateJobStatus uses)
  const { data: jobs1, error: jobsError1 } = await supabase
    .from('background_jobs')
    .select('id, status, payload, created_at, updated_at, started_at, completed_at, error_message, result')
    .eq('job_type', 'DOCUMENT_EXTRACTION')
    .eq('payload->>document_id', doc.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  console.log(`   Query method 1 (payload->>document_id):`);
  console.log(`     Found: ${jobs1 ? 'YES' : 'NO'}`);
  console.log(`     Error: ${jobsError1 ? jobsError1.message : 'none'}`);
  
  // Method 2: Get all jobs and filter manually
  const { data: allJobs, error: allJobsError } = await supabase
    .from('background_jobs')
    .select('id, status, payload, created_at, updated_at, started_at, completed_at, error_message, result')
    .eq('job_type', 'DOCUMENT_EXTRACTION')
    .order('created_at', { ascending: false })
    .limit(10);
  
  const jobs = jobs1 || (allJobs?.find(j => j.payload?.document_id === doc.id) || null);
  const jobsError = jobsError1 || allJobsError;
  
  if (jobsError) {
    console.error('   ❌ Error fetching job:', jobsError.message);
  } else if (!jobs) {
    console.log('   ⚠️ NO BACKGROUND JOB FOUND');
  } else {
    const job = jobs as any;
    console.log(`   Job ID: ${job.id}`);
    console.log(`   Status: ${job.status}`);
    console.log(`   Created: ${job.created_at}`);
    console.log(`   Updated: ${job.updated_at}`);
    console.log(`   Payload:`, JSON.stringify(job.payload, null, 2));
    if (job.started_at) {
      console.log(`   Started: ${job.started_at}`);
    }
    if (job.completed_at) {
      console.log(`   Completed: ${job.completed_at}`);
    }
    if (job.error_message) {
      console.log(`   ❌ Error: ${job.error_message}`);
    }
    if (job.result) {
      try {
        const result = typeof job.result === 'string' ? JSON.parse(job.result) : job.result;
        console.log(`   Result:`, JSON.stringify(result, null, 2));
      } catch (e) {
        console.log(`   Result: ${job.result}`);
      }
    }
    
    // Check if job is stuck
    if (job.status === 'RUNNING' && job.updated_at) {
      const lastUpdate = new Date(job.updated_at);
      const minutesSinceUpdate = Math.floor((Date.now() - lastUpdate.getTime()) / 1000 / 60);
      if (minutesSinceUpdate > 5) {
        console.log(`   ⚠️ JOB APPEARS STUCK - Last update ${minutesSinceUpdate} minutes ago`);
      }
    }
    
    // CRITICAL: Check if job status matches document status
    if (job.status === 'PENDING' && doc.extraction_status === 'COMPLETED') {
      console.log(`\n   🚨 CRITICAL MISMATCH:`);
      console.log(`      Job status: ${job.status} (never ran)`);
      console.log(`      Document status: ${doc.extraction_status} (completed)`);
      console.log(`      This means:`);
      console.log(`        1. Job was never processed by worker, OR`);
      console.log(`        2. Job ran but failed to update its status, OR`);
      console.log(`        3. Obligations were created some other way`);
      console.log(`      Check worker logs to see if job actually ran!`);
    }
  }
  
  // Check extraction logs
  console.log('\n📊 EXTRACTION LOGS:');
  const { data: logs, error: logsError } = await supabase
    .from('extraction_logs')
    .select('id, extraction_timestamp, obligations_extracted, model_identifier, errors')
    .eq('document_id', doc.id)
    .order('extraction_timestamp', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (logsError) {
    console.error('   ❌ Error fetching logs:', logsError.message);
  } else if (!logs) {
    console.log('   ⚠️ NO EXTRACTION LOGS FOUND');
  } else {
    console.log(`   Log ID: ${logs.id}`);
    console.log(`   Timestamp: ${logs.extraction_timestamp}`);
    console.log(`   Obligations extracted: ${logs.obligations_extracted}`);
    console.log(`   Model: ${logs.model_identifier}`);
    if (logs.errors && logs.errors.length > 0) {
      console.log(`   ❌ Errors:`, logs.errors);
    }
  }
  
  // Summary
  console.log('\n📊 SUMMARY:');
  const isCompleted = doc.extraction_status === 'COMPLETED';
  const hasObligations = (obligations?.length || 0) > 0;
  const jobCompleted = jobs?.status === 'COMPLETED';
  const isStuck = doc.extraction_status === 'PROCESSING' && elapsedMinutes > 5;
  
  console.log(`   Extraction Status: ${doc.extraction_status}`);
  console.log(`   Has Obligations: ${hasObligations ? 'YES' : 'NO'} (${obligations?.length || 0})`);
  console.log(`   Job Status: ${jobs?.status || 'NOT FOUND'}`);
  console.log(`   Is Completed: ${isCompleted ? 'YES' : 'NO'}`);
  console.log(`   Is Stuck: ${isStuck ? 'YES ⚠️' : 'NO'}`);
  
  if (isCompleted && !hasObligations) {
    console.log('\n   ⚠️ WARNING: Extraction marked as COMPLETED but no obligations found!');
  }
  
  if (isStuck) {
    console.log('\n   ⚠️ WARNING: Document appears to be STUCK in PROCESSING status!');
    console.log('   → Check if worker is running: npm run worker');
    console.log('   → Check worker logs for errors');
  }
  
  if (!jobs) {
    console.log('\n   ⚠️ WARNING: No background job found!');
    console.log('   → Job may not have been queued properly');
  }
}

checkLastDocument().catch(console.error);

