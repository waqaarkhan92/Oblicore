/**
 * Fix existing obligations with "Untitled Obligation" titles
 */

import { createClient } from '@supabase/supabase-js';

// Helper function to generate a concise, meaningful title
const generateTitle = (text: string, category: string, conditionRef: string | null): string => {
  if (!text) return 'Untitled Obligation';

  // Remove common legal prefixes to get to the action
  let cleanText = text
    .replace(/^The operator shall\s+/i, '')
    .replace(/^The site operator shall\s+/i, '')
    .replace(/^The permit holder shall\s+/i, '')
    .replace(/^The licensee shall\s+/i, '')
    .replace(/^The operator is only authorised to\s+/i, '')
    .replace(/^The activities shall\s+/i, '')
    .replace(/^Activities shall\s+/i, '')
    .replace(/^Waste shall\s+/i, '')
    .replace(/^Emissions shall\s+/i, '')
    .replace(/^Records shall\s+/i, '')
    .replace(/^Monitoring shall\s+/i, '')
    .replace(/^For the following activities.*?\.\s*/i, '')
    .trim();

  // Extract key action (max 50 chars)
  let title = cleanText;

  // Take up to first period, semicolon, or comma
  const sentences = cleanText.split(/[.;,]/);
  if (sentences[0] && sentences[0].length > 0) {
    title = sentences[0].trim();
  }

  // If still too long, intelligently truncate
  if (title.length > 50) {
    const words = title.substring(0, 47).split(' ');
    words.pop(); // Remove last potentially partial word
    title = words.join(' ') + '...';
  }

  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1);

  return title;
};

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase environment variables not set');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔧 Regenerating ALL Obligation Titles with Better Algorithm\n');

  // Get all obligations to regenerate titles
  const { data: obligations, error } = await supabase
    .from('obligations')
    .select('id, obligation_title, original_text, category');

  if (error) {
    console.error('❌ Error fetching obligations:', error);
    return;
  }

  console.log(`Found ${obligations?.length || 0} obligations to fix\n`);

  let updated = 0;
  let failed = 0;

  for (const obl of obligations || []) {
    const newTitle = generateTitle(obl.original_text, obl.category, null);

    if (newTitle === 'Untitled Obligation') {
      console.log(`⚠️  Skipping ${obl.id.substring(0, 8)}... (no text available)`);
      failed++;
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
      console.log(`✅ ${obl.id.substring(0, 8)}...: "${newTitle.substring(0, 60)}..."`);
      updated++;
    }
  }

  console.log(`\n📊 Results:`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total: ${obligations?.length || 0}`);
}

main();
