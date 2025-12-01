import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
  const { data } = await supabase.from('obligations').select('*').limit(1).single();
  console.log('Obligation columns:', Object.keys(data || {}).sort());
}

main();
