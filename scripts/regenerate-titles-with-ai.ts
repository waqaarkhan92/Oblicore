/**
 * Regenerate obligation titles using AI-powered title generation
 * This script uses GPT-4o-mini for cost-effective title generation
 */

// Load environment variables FIRST
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

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

  console.log('🤖 Regenerating Obligation Titles with AI\n');

  // Get all obligations to regenerate titles
  const { data: obligations, error } = await supabase
    .from('obligations')
    .select('id, obligation_title, original_text, category')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching obligations:', error);
    return;
  }

  console.log(`Found ${obligations?.length || 0} obligations to regenerate\n`);

  let updated = 0;
  let failed = 0;
  let skipped = 0;

  for (const obl of obligations || []) {
    const obligationText = obl.original_text || '';

    if (!obligationText || obligationText.length < 10) {
      console.log(`⚠️  Skipping ${obl.id.substring(0, 8)}... (no text available)`);
      skipped++;
      continue;
    }

    try {
      // Generate AI-powered title
      console.log(`🤖 Generating title for ${obl.id.substring(0, 8)}...`);
      const newTitle = await openAIClient.generateTitle(obligationText, obl.category || 'OPERATIONAL');

      if (newTitle === 'Untitled Obligation') {
        console.log(`⚠️  Skipping ${obl.id.substring(0, 8)}... (AI returned default title)`);
        skipped++;
        continue;
      }

      // Update the obligation
      const { error: updateError } = await supabase
        .from('obligations')
        .update({ obligation_title: newTitle })
        .eq('id', obl.id);

      if (updateError) {
        console.error(`❌ Failed to update ${obl.id.substring(0, 8)}...:`, updateError.message);
        failed++;
      } else {
        console.log(`✅ ${obl.id.substring(0, 8)}...: "${newTitle}"`);
        updated++;
      }

      // Add a small delay to avoid rate limiting (100ms)
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error: any) {
      console.error(`❌ Error generating title for ${obl.id.substring(0, 8)}...:`, error.message);
      failed++;
    }
  }

  console.log(`\n📊 Results:`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${obligations?.length || 0}`);
}

main();
