/**
 * Comprehensive Diagnostic Script for PDF Extraction Issues
 * This script checks:
 * - Environment variables
 * - Redis connection
 * - Database connection
 * - Recent documents and their status
 * - Background jobs status
 * - Obligations data
 */

// Load environment variables FIRST
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import { env } from '../lib/env';

async function diagnose() {
  console.log('🔍 COMPREHENSIVE EXTRACTION DIAGNOSTICS\n');
  console.log('='.repeat(60));

  // 1. Check Environment Variables
  console.log('\n📋 1. ENVIRONMENT VARIABLES');
  console.log('-'.repeat(60));

  const envChecks = {
    'SUPABASE_URL': !!env.SUPABASE_URL,
    'SUPABASE_SERVICE_ROLE_KEY': !!env.SUPABASE_SERVICE_ROLE_KEY,
    'OPENAI_API_KEY': !!env.OPENAI_API_KEY,
    'REDIS_URL': !!process.env.REDIS_URL,
    'DATABASE_URL': !!process.env.DATABASE_URL,
  };

  for (const [key, value] of Object.entries(envChecks)) {
    console.log(`  ${value ? '✅' : '❌'} ${key}: ${value ? 'SET' : 'MISSING'}`);
  }

  // 2. Check Redis Connection
  console.log('\n🔴 2. REDIS CONNECTION');
  console.log('-'.repeat(60));

  if (process.env.REDIS_URL) {
    try {
      const { getRedisConnection } = await import('../lib/queue/queue-manager');
      const redis = getRedisConnection();
      await redis.ping();
      console.log('  ✅ Redis connection: OK');
    } catch (error: any) {
      console.log('  ❌ Redis connection: FAILED');
      console.log(`     Error: ${error.message}`);
    }
  } else {
    console.log('  ❌ Redis not configured (REDIS_URL missing)');
  }

  // 3. Check Database Connection
  console.log('\n💾 3. DATABASE CONNECTION');
  console.log('-'.repeat(60));

  try {
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase.from('documents').select('id').limit(1);

    if (error) {
      console.log('  ❌ Database connection: FAILED');
      console.log(`     Error: ${error.message}`);
    } else {
      console.log('  ✅ Database connection: OK');
    }
  } catch (error: any) {
    console.log('  ❌ Database connection: FAILED');
    console.log(`     Error: ${error.message}`);
  }

  // 4. Check Recent Documents
  console.log('\n📄 4. RECENT DOCUMENTS (Last 5)');
  console.log('-'.repeat(60));

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: recentDocs, error: docsError } = await supabase
    .from('documents')
    .select('id, title, extraction_status, created_at, updated_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(5);

  if (docsError) {
    console.log(`  ❌ Error: ${docsError.message}`);
  } else if (!recentDocs || recentDocs.length === 0) {
    console.log('  ℹ️  No documents found');
  } else {
    for (const doc of recentDocs) {
      const createdAt = new Date(doc.created_at);
      const now = new Date();
      const minutesAgo = Math.floor((now.getTime() - createdAt.getTime()) / 1000 / 60);

      console.log(`\n  📄 ${doc.title}`);
      console.log(`     ID: ${doc.id}`);
      console.log(`     Status: ${doc.extraction_status}`);
      console.log(`     Created: ${minutesAgo} minutes ago`);

      // Check obligations for this document
      const { data: obligations } = await supabase
        .from('obligations')
        .select('id')
        .eq('document_id', doc.id)
        .is('deleted_at', null);

      console.log(`     Obligations: ${obligations?.length || 0}`);

      // Check background job for this document (using payload->document_id)
      const { data: jobs } = await supabase
        .from('background_jobs')
        .select('id, status, created_at, result')
        .eq('job_type', 'DOCUMENT_EXTRACTION')
        .filter('payload->>document_id', 'eq', doc.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (jobs && jobs.length > 0) {
        const job = jobs[0];
        console.log(`     Job Status: ${job.status}`);
        if (job.status === 'FAILED') {
          console.log(`     Job Error: ${job.result}`);
        }
      } else {
        console.log(`     Job Status: ⚠️  NO JOB FOUND (job not queued)`);
      }
    }
  }

  // 5. Check Stuck Documents
  console.log('\n\n⏱️  5. DOCUMENTS STUCK IN PROCESSING');
  console.log('-'.repeat(60));

  const { data: stuckDocs } = await supabase
    .from('documents')
    .select('id, title, extraction_status, created_at')
    .is('deleted_at', null)
    .eq('extraction_status', 'PROCESSING')
    .order('created_at', { ascending: false })
    .limit(10);

  if (!stuckDocs || stuckDocs.length === 0) {
    console.log('  ✅ No documents stuck in processing');
  } else {
    console.log(`  ⚠️  Found ${stuckDocs.length} documents stuck in PROCESSING:\n`);
    for (const doc of stuckDocs) {
      const createdAt = new Date(doc.created_at);
      const now = new Date();
      const minutesAgo = Math.floor((now.getTime() - createdAt.getTime()) / 1000 / 60);
      console.log(`     ${doc.title} - stuck for ${minutesAgo} minutes`);
    }
  }

  // 6. Check Background Jobs
  console.log('\n\n🔧 6. RECENT BACKGROUND JOBS');
  console.log('-'.repeat(60));

  const { data: recentJobs } = await supabase
    .from('background_jobs')
    .select('id, status, job_type, created_at, updated_at, payload')
    .eq('job_type', 'DOCUMENT_EXTRACTION')
    .order('created_at', { ascending: false })
    .limit(5);

  if (!recentJobs || recentJobs.length === 0) {
    console.log('  ⚠️  No extraction jobs found (jobs are not being queued)');
  } else {
    for (const job of recentJobs) {
      const createdAt = new Date(job.created_at);
      const minutesAgo = Math.floor((new Date().getTime() - createdAt.getTime()) / 1000 / 60);

      console.log(`\n  🔧 Job ${job.id.substring(0, 8)}...`);
      console.log(`     Status: ${job.status}`);
      console.log(`     Document: ${(job.payload as any)?.document_id || 'unknown'}`);
      console.log(`     Created: ${minutesAgo} minutes ago`);
    }
  }

  // 7. Check Job Queue (if Redis is available)
  console.log('\n\n📊 7. JOB QUEUE STATUS');
  console.log('-'.repeat(60));

  if (process.env.REDIS_URL) {
    try {
      const { getQueue, QUEUE_NAMES } = await import('../lib/queue/queue-manager');
      const docQueue = getQueue(QUEUE_NAMES.DOCUMENT_PROCESSING);

      const waitingCount = await docQueue.getWaitingCount();
      const activeCount = await docQueue.getActiveCount();
      const failedCount = await docQueue.getFailedCount();
      const completedCount = await docQueue.getCompletedCount();

      console.log(`  📥 Waiting: ${waitingCount}`);
      console.log(`  🔄 Active: ${activeCount}`);
      console.log(`  ❌ Failed: ${failedCount}`);
      console.log(`  ✅ Completed: ${completedCount}`);

      if (waitingCount > 0) {
        console.log(`\n  ⚠️  ${waitingCount} jobs waiting to be processed!`);
        console.log('     → Worker may not be running');
      }

      if (failedCount > 0) {
        console.log(`\n  ⚠️  ${failedCount} jobs failed!`);
        const failedJobs = await docQueue.getFailed(0, 3);
        for (const job of failedJobs) {
          console.log(`     - Job ${job.id}: ${job.failedReason}`);
        }
      }
    } catch (error: any) {
      console.log(`  ❌ Error checking queue: ${error.message}`);
    }
  } else {
    console.log('  ⚠️  Cannot check queue (Redis not configured)');
  }

  // 8. Summary and Recommendations
  console.log('\n\n🎯 8. DIAGNOSIS SUMMARY');
  console.log('='.repeat(60));

  const issues: string[] = [];
  const recommendations: string[] = [];

  if (!envChecks.REDIS_URL) {
    issues.push('Redis not configured');
    recommendations.push('Set REDIS_URL in .env.local');
  }

  if (!envChecks.OPENAI_API_KEY) {
    issues.push('OpenAI API key not configured');
    recommendations.push('Set OPENAI_API_KEY in .env.local');
  }

  if (stuckDocs && stuckDocs.length > 0) {
    issues.push(`${stuckDocs.length} documents stuck in PROCESSING`);
    recommendations.push('Start the worker: npm run worker');
  }

  if (issues.length === 0) {
    console.log('\n✅ No obvious issues detected!');
    console.log('\nIf extraction still not working:');
    console.log('  1. Make sure worker is running: npm run worker');
    console.log('  2. Check worker logs for errors');
    console.log('  3. Upload a test PDF and check logs');
  } else {
    console.log('\n⚠️  ISSUES FOUND:');
    issues.forEach((issue, i) => console.log(`  ${i + 1}. ${issue}`));

    console.log('\n💡 RECOMMENDATIONS:');
    recommendations.forEach((rec, i) => console.log(`  ${i + 1}. ${rec}`));
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Diagnostic complete!\n');
}

diagnose().catch((error) => {
  console.error('\n❌ Diagnostic failed:', error);
  process.exit(1);
});
