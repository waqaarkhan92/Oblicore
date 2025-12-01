/**
 * Check for pattern candidates that need review
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkPatternCandidates() {
  console.log('🔍 Checking for Pattern Candidates...\n');

  // Get pending candidates
  const { data: candidates, error } = await supabase
    .from('pattern_candidates')
    .select('*')
    .eq('status', 'PENDING_REVIEW')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  if (!candidates || candidates.length === 0) {
    console.log('✅ No pattern candidates pending review\n');
    console.log('💡 Pattern candidates are created when:');
    console.log('   - 3+ similar obligations are extracted');
    console.log('   - User confirmed them without edits');
    console.log('   - System detects common patterns\n');
    return;
  }

  console.log(`📋 Found ${candidates.length} pattern candidate(s) pending review:\n`);

  candidates.forEach((candidate, i) => {
    const pattern = candidate.suggested_pattern;
    console.log(`${i + 1}. Pattern Candidate ID: ${candidate.id}`);
    console.log(`   Pattern ID: ${pattern.pattern_id || 'N/A'}`);
    console.log(`   Display Name: ${pattern.display_name || 'N/A'}`);
    console.log(`   Description: ${pattern.description || 'N/A'}`);
    console.log(`   Sample Count: ${candidate.sample_count}`);
    console.log(`   Match Rate: ${(candidate.match_rate * 100).toFixed(1)}%`);
    console.log(`   Category: ${pattern.extraction_template?.category || 'N/A'}`);
    console.log(`   Created: ${new Date(candidate.created_at).toLocaleString()}`);
    console.log(`   Source Extractions: ${candidate.source_extractions?.length || 0}`);
    console.log('');
  });

  // Get all candidates (including approved/rejected)
  const { data: allCandidates } = await supabase
    .from('pattern_candidates')
    .select('status')
    .order('created_at', { ascending: false });

  const statusCounts = allCandidates?.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  console.log('📊 Pattern Candidates Summary:');
  console.log(`   Pending Review: ${statusCounts['PENDING_REVIEW'] || 0}`);
  console.log(`   Approved: ${statusCounts['APPROVED'] || 0}`);
  console.log(`   Rejected: ${statusCounts['REJECTED'] || 0}`);
  console.log(`   Merged: ${statusCounts['MERGED'] || 0}`);
}

checkPatternCandidates().catch(console.error);

