/**
 * Test API endpoints with authentication token
 * This simulates what the browser does
 */

import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const email = process.env.TEST_USER_EMAIL || '';
  const password = process.env.TEST_USER_PASSWORD || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase environment variables not set');
    console.error('   Need: SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  if (!email || !password) {
    console.error('❌ Test user credentials not set');
    console.error('   Need: TEST_USER_EMAIL and TEST_USER_PASSWORD');
    console.error('   Or provide them as arguments');
    process.exit(1);
  }

  // Create a client like the browser does (using anon key)
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log('🔐 Signing in as:', email);

  // Sign in to get auth token
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.session) {
    console.error('❌ Auth error:', authError);
    process.exit(1);
  }

  console.log('✅ Signed in successfully');
  console.log('   User ID:', authData.user.id);
  console.log('   Token:', authData.session.access_token.substring(0, 20) + '...');

  // Get all documents for this user
  console.log('\n📄 Fetching documents...');
  const { data: docs, error: docsError } = await supabase
    .from('documents')
    .select('id, title, extraction_status')
    .is('deleted_at', null);

  if (docsError) {
    console.error('❌ Error fetching documents:', docsError);
  } else {
    console.log(`✅ Found ${docs?.length || 0} documents`);
    docs?.forEach(doc => {
      console.log(`   - ${doc.id.substring(0, 8)}... (${doc.extraction_status}): ${doc.title?.substring(0, 40) || 'N/A'}`);
    });
  }

  // Now test each document's obligations endpoint via HTTP
  console.log('\n📋 Testing obligations endpoint for each document via HTTP...');

  for (const doc of docs || []) {
    console.log(`\n   Document: ${doc.id.substring(0, 8)}...`);

    // Make HTTP request to the API (like the browser does)
    const url = `http://localhost:3000/api/v1/documents/${doc.id}/obligations`;
    console.log(`   URL: ${url}`);

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${authData.session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const text = await response.text();
      console.log(`   Status: ${response.status}`);

      if (response.ok) {
        const json = JSON.parse(text);
        console.log(`   ✅ Success! Obligations: ${Array.isArray(json.data) ? json.data.length : 'not an array'}`);
        if (json.data && json.data.length > 0) {
          console.log(`   First obligation: ${json.data[0].obligation_title?.substring(0, 50) || 'N/A'}`);
        }
      } else {
        console.log(`   ❌ Error: ${text.substring(0, 200)}`);
      }
    } catch (error: any) {
      console.error(`   ❌ Fetch error:`, error.message);
    }

    // Also test via Supabase client (using RLS)
    console.log(`   Testing via Supabase client (with RLS)...`);
    const { data: oblsRLS, error: oblsError } = await supabase
      .from('obligations')
      .select('id, obligation_title')
      .eq('document_id', doc.id)
      .is('deleted_at', null);

    if (oblsError) {
      console.log(`   ❌ RLS query error:`, oblsError.message);
    } else {
      console.log(`   📊 RLS query result: ${oblsRLS?.length || 0} obligations`);
    }
  }

  // Sign out
  await supabase.auth.signOut();
  console.log('\n✅ Done');
}

main();
