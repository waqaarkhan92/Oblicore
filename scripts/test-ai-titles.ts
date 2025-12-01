/**
 * Test AI title generation on a few obligations
 */

import { createClient } from '@supabase/supabase-js';
import { getOpenAIClient } from '../lib/ai/openai-client';

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase environment variables not set');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const openAIClient = getOpenAIClient();

  console.log('🤖 Testing AI Title Generation on 5 obligations\n');

  // Get 5 obligations
  const { data: obligations, error } = await supabase
    .from('obligations')
    .select('id, obligation_title, original_text, category')
    .limit(5);

  if (error) {
    console.error('❌ Error fetching obligations:', error);
    return;
  }

  console.log(`Testing on ${obligations?.length || 0} obligations\n`);

  for (const obl of obligations || []) {
    const obligationText = obl.original_text || '';

    if (!obligationText || obligationText.length < 10) {
      console.log(`⚠️  Skipping ${obl.id.substring(0, 8)}... (no text available)\n`);
      continue;
    }

    try {
      console.log(`📝 Original title: "${obl.obligation_title}"`);
      console.log(`📄 Text preview: ${obligationText.substring(0, 150)}...`);

      // Generate AI-powered title
      console.log(`🤖 Generating AI title...`);
      const newTitle = await openAIClient.generateTitle(obligationText, obl.category || 'OPERATIONAL');

      console.log(`✅ AI-generated title: "${newTitle}"`);
      console.log('');
    } catch (error: any) {
      console.error(`❌ Error generating title:`, error.message);
      console.log('');
    }
  }
}

main();
