/**
 * Check RLS policies on obligations table
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

  console.log('🔒 Checking RLS policies on obligations table\n');

  // Query the pg_policies table to see RLS policies
  const { data: policies, error } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT
          schemaname,
          tablename,
          policyname,
          permissive,
          roles,
          cmd,
          qual,
          with_check
        FROM pg_policies
        WHERE tablename = 'obligations'
        ORDER BY policyname;
      `
    });

  if (error) {
    console.error('❌ Error fetching policies:', error);

    // Try alternative method - query information_schema
    console.log('\nTrying alternative method...');
    const { data: altData, error: altError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'obligations');

    if (altError) {
      console.error('❌ Alternative method also failed:', altError);
      console.log('\n⚠️  Cannot query RLS policies programmatically.');
      console.log('   Please check the Supabase dashboard or run this SQL in the SQL editor:');
      console.log(`
        SELECT
          policyname,
          permissive,
          roles,
          cmd,
          qual,
          with_check
        FROM pg_policies
        WHERE tablename = 'obligations';
      `);
    } else {
      console.log('Policies:', altData);
    }
  } else {
    console.log('Policies found:', policies?.length || 0);
    console.log(JSON.stringify(policies, null, 2));
  }
}

main();
