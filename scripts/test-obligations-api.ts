/**
 * Test script to check obligations API directly
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load .env.local explicitly
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('  SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('  NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓' : '✗');
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  console.error('\nAvailable env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')).join(', '));
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function testObligationsAPI() {
  console.log('🔍 Testing Obligations API...\n');

  // Get the last document
  const { data: documents, error: docError } = await supabaseAdmin
    .from('documents')
    .select('id, extraction_status, created_at')
    .order('created_at', { ascending: false })
    .limit(1);

  if (docError || !documents || documents.length === 0) {
    console.error('❌ Failed to get documents:', docError);
    return;
  }

  const document = documents[0];
  console.log('📄 Last document:', {
    id: document.id,
    status: document.extraction_status,
    created_at: document.created_at,
  });

  // Check obligations directly from DB
  const { data: obligations, error: obligationsError } = await supabaseAdmin
    .from('obligations')
    .select('id, obligation_title, document_id, deleted_at, created_at')
    .eq('document_id', document.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(21);

  console.log('\n📊 Direct DB Query Result:');
  console.log('  Count:', obligations?.length || 0);
  console.log('  Error:', obligationsError ? JSON.stringify(obligationsError, null, 2) : 'none');
  
  if (obligations && obligations.length > 0) {
    console.log('  Sample obligations:');
    obligations.slice(0, 3).forEach((o, i) => {
      console.log(`    ${i + 1}. ${o.id} - ${o.obligation_title?.substring(0, 50) || 'No title'}`);
    });
  }

  // Now simulate what the API does
  console.log('\n🔧 Simulating API Query:');
  const apiQuery = supabaseAdmin
    .from('obligations')
    .select('id, obligation_title, obligation_description, category, status, review_status, confidence_score, is_subjective, deadline_date, frequency, created_at, updated_at, original_text')
    .eq('document_id', document.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(21);

  const { data: apiObligations, error: apiError } = await apiQuery;

  console.log('  API Query Count:', apiObligations?.length || 0);
  console.log('  API Query Error:', apiError ? JSON.stringify(apiError, null, 2) : 'none');
  
  if (apiObligations && apiObligations.length > 0) {
    console.log('  API Query Sample:');
    console.log('    First obligation:', JSON.stringify(apiObligations[0], null, 2));
  }

  // Check if there's a difference
  console.log('\n📈 Comparison:');
  console.log('  Direct query count:', obligations?.length || 0);
  console.log('  API query count:', apiObligations?.length || 0);
  console.log('  Match:', (obligations?.length || 0) === (apiObligations?.length || 0));

  // Check for any obligations with this document_id (including deleted)
  const { data: allObligations, error: allError } = await supabaseAdmin
    .from('obligations')
    .select('id, document_id, deleted_at')
    .eq('document_id', document.id);

  console.log('\n🗑️  Including deleted:');
  console.log('  Total count:', allObligations?.length || 0);
  console.log('  Not deleted:', allObligations?.filter(o => !o.deleted_at).length || 0);
  console.log('  Deleted:', allObligations?.filter(o => o.deleted_at).length || 0);
}

testObligationsAPI().catch(console.error);
