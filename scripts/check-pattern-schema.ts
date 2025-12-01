import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  const { data, error } = await supabase
    .from('rule_library_patterns')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    console.log('No patterns exist yet or error:', error.message);
    console.log('Details:', error.details);
    console.log('Hint:', error.hint);
  } else {
    console.log('Sample pattern:');
    console.log(JSON.stringify(data, null, 2));
  }
}

main();
