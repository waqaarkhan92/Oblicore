/**
 * Test the specific document the user is viewing
 */

import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const documentId = '03d21171-8403-4368-8477-1cba28694b72';

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase environment variables not set');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 Testing Document:', documentId);
  console.log('=' + '='.repeat(79), '\n');

  // Get document
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (docError || !doc) {
    console.error('❌ Document not found:', docError);
    return;
  }

  console.log('📄 Document Details:');
  console.log('   Title:', doc.title);
  console.log('   Status:', doc.extraction_status);
  console.log('   Site:', doc.site_id);
  console.log('   Uploader:', doc.uploaded_by);
  console.log('   Created:', doc.created_at);
  console.log('   Updated:', doc.updated_at);

  // Get obligations - exactly as the API does
  console.log('\n📋 Obligations Query (as API does):');
  console.log('   Query: obligations.select().eq(document_id, ...).is(deleted_at, null)');

  const { data: obls, error: oblsError } = await supabase
    .from('obligations')
    .select('id, obligation_title, obligation_description, category, status, review_status, confidence_score, is_subjective, deadline_date, frequency, created_at, updated_at, original_text')
    .eq('document_id', documentId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(21); // API uses limit + 1

  console.log('   Result:');
  console.log('   - Count:', obls?.length || 0);
  console.log('   - Error:', oblsError || 'none');

  if (obls && obls.length > 0) {
    console.log('   - First 3 titles:');
    obls.slice(0, 3).forEach((o, i) => {
      console.log(`     ${i + 1}. ${o.obligation_title || 'Untitled'}`);
    });
  } else {
    console.log('   ⚠️  NO OBLIGATIONS RETURNED');

    // Debug - try different queries
    console.log('\n🔍 Debug Queries:');

    // Try without any filters
    const { data: all } = await supabase
      .from('obligations')
      .select('id')
      .eq('document_id', documentId);
    console.log('   - Without deleted_at filter:', all?.length || 0);

    // Try with site_id
    const { data: withSite } = await supabase
      .from('obligations')
      .select('id')
      .eq('document_id', documentId)
      .eq('site_id', doc.site_id);
    console.log('   - With site_id filter:', withSite?.length || 0);
  }

  // Check site assignment
  console.log('\n👤 User Site Assignment:');
  const { data: assignment } = await supabase
    .from('user_site_assignments')
    .select('*')
    .eq('user_id', doc.uploaded_by)
    .eq('site_id', doc.site_id)
    .maybeSingle();

  console.log('   - User ID:', doc.uploaded_by);
  console.log('   - Site ID:', doc.site_id);
  console.log('   - Has Assignment:', assignment ? 'YES' : 'NO');
  if (assignment) {
    console.log('   - Assigned At:', assignment.created_at);
  }

  // Try to call the actual HTTP API endpoint (without auth - will fail but shows endpoint works)
  console.log('\n🌐 Testing HTTP API Endpoint:');
  const url = `http://localhost:3000/api/v1/documents/${documentId}/obligations`;
  console.log('   URL:', url);

  try {
    const response = await fetch(url);
    console.log('   Status:', response.status);
    const text = await response.text();

    if (response.status === 401) {
      console.log('   ✅ Endpoint exists (401 = needs auth, which is expected)');
    } else {
      console.log('   Response preview:', text.substring(0, 200));
    }
  } catch (error: any) {
    console.error('   ❌ Fetch error:', error.message);
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n🎯 Summary:');
  console.log(`   - Document exists: YES`);
  console.log(`   - Document status: ${doc.extraction_status}`);
  console.log(`   - Obligations found: ${obls?.length || 0}`);
  console.log(`   - User has site access: ${assignment ? 'YES' : 'NO'}`);

  if (obls && obls.length > 0 && doc.extraction_status === 'COMPLETED' && assignment) {
    console.log('\n✅ Everything looks correct! The API should return these obligations.');
    console.log('   If browser shows 0 obligations, it might be:');
    console.log('   1. Browser cache issue - try hard refresh (Cmd+Shift+R)');
    console.log('   2. React Query cache - try clearing browser cache');
    console.log('   3. Authentication issue - token might be for wrong user');
  } else {
    console.log('\n⚠️  Found issues:');
    if (!obls || obls.length === 0) console.log('   - No obligations found');
    if (doc.extraction_status !== 'COMPLETED') console.log('   - Document not completed');
    if (!assignment) console.log('   - User has no site access');
  }
}

main();
