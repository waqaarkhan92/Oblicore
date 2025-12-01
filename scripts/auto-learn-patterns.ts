/**
 * Auto-Learn Patterns from Existing Obligations
 * Analyzes extracted obligations to discover common patterns
 * Creates new rule library entries automatically for cost savings
 */

// Load environment variables FIRST
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

interface ObligationGroup {
  category: string;
  frequency: string | null;
  is_subjective: boolean;
  condition_type: string;
  obligations: Array<{
    id: string;
    original_text: string;
    evidence_suggestions: string[];
  }>;
}

/**
 * Find common phrases in a set of texts
 * Returns phrases that appear in at least minOccurrence texts
 */
function findCommonPhrases(texts: string[], minOccurrence: number, minLength: number = 3): string[] {
  const phraseCounts = new Map<string, number>();

  // Extract all 3-6 word phrases from each text
  texts.forEach(text => {
    const words = text.toLowerCase().split(/\s+/);
    const seenPhrases = new Set<string>();

    for (let length = minLength; length <= 6; length++) {
      for (let i = 0; i <= words.length - length; i++) {
        const phrase = words.slice(i, i + length).join(' ');

        // Skip if phrase contains only common words
        if (/^(?:the|a|an|and|or|of|to|in|for|is|are|shall|will|may|must|be|by|with|at|from)(?:\s+(?:the|a|an|and|or|of|to|in|for|is|are|shall|will|may|must|be|by|with|at|from))*$/i.test(phrase)) {
          continue;
        }

        // Only count each phrase once per text
        if (!seenPhrases.has(phrase)) {
          seenPhrases.add(phrase);
          phraseCounts.set(phrase, (phraseCounts.get(phrase) || 0) + 1);
        }
      }
    }
  });

  // Return phrases that appear in at least minOccurrence texts
  return Array.from(phraseCounts.entries())
    .filter(([_, count]) => count >= minOccurrence)
    .sort((a, b) => b[1] - a[1]) // Sort by frequency
    .slice(0, 10) // Top 10
    .map(([phrase, _]) => phrase);
}

/**
 * Generate regex from common phrases
 */
function generateRegexFromPhrases(phrases: string[]): string {
  if (phrases.length === 0) return '';

  // Take the most common phrase and make it flexible
  const basePhrase = phrases[0];

  // Replace specific numbers/dates with wildcards
  let pattern = basePhrase
    .replace(/\d+/g, '\\d+')
    .replace(/\s+/g, '\\s+');

  // Make some common words optional
  pattern = pattern
    .replace(/\\s\+(?:the|a|an)\\s\+/gi, '\\s+(?:the|a|an)?\\s+')
    .replace(/\\s\+(?:shall|will|must)\\s\+/gi, '\\s+(?:shall|will|must)\\s+');

  return pattern;
}

/**
 * Calculate how many texts match the pattern
 */
function calculateMatchRate(pattern: string, texts: string[]): number {
  try {
    const regex = new RegExp(pattern, 'i');
    const matches = texts.filter(text => regex.test(text.toLowerCase())).length;
    return matches / texts.length;
  } catch (error) {
    return 0;
  }
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase environment variables not set');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🤖 Auto-Learning Patterns from Existing Obligations\n');

  // Fetch all obligations
  const { data: obligations, error } = await supabase
    .from('obligations')
    .select('id, original_text, category, frequency, is_subjective, evidence_suggestions')
    .not('original_text', 'is', null)
    .not('category', 'is', null);

  if (error) {
    console.error('❌ Error fetching obligations:', error);
    return;
  }

  console.log(`📊 Analyzing ${obligations?.length || 0} obligations...\n`);

  // Group obligations by category, frequency, and subjectivity
  const groups = new Map<string, ObligationGroup>();

  obligations?.forEach(obl => {
    const key = `${obl.category}_${obl.frequency || 'null'}_${obl.is_subjective}`;

    if (!groups.has(key)) {
      groups.set(key, {
        category: obl.category,
        frequency: obl.frequency,
        is_subjective: obl.is_subjective,
        condition_type: 'STANDARD',
        obligations: []
      });
    }

    groups.get(key)!.obligations.push({
      id: obl.id,
      original_text: obl.original_text,
      evidence_suggestions: obl.evidence_suggestions || []
    });
  });

  console.log(`📦 Found ${groups.size} distinct groups\n`);

  // Analyze each group for pattern candidates
  let patternsDiscovered = 0;
  let patternsCreated = 0;

  for (const [key, group] of groups) {
    // Need at least 3 similar obligations to create a pattern
    if (group.obligations.length < 3) {
      continue;
    }

    console.log(`\n🔍 Analyzing group: ${key} (${group.obligations.length} obligations)`);

    const texts = group.obligations.map(o => o.original_text);

    // Find common phrases (must appear in at least 70% of texts)
    const minOccurrence = Math.max(3, Math.ceil(texts.length * 0.7));
    const commonPhrases = findCommonPhrases(texts, minOccurrence);

    if (commonPhrases.length === 0) {
      console.log(`   ⚠️  No common phrases found`);
      continue;
    }

    console.log(`   📝 Common phrases: ${commonPhrases.slice(0, 3).join(', ')}`);

    // Generate regex pattern
    const regexPattern = generateRegexFromPhrases(commonPhrases);

    if (!regexPattern) {
      console.log(`   ⚠️  Could not generate regex pattern`);
      continue;
    }

    // Calculate match rate
    const matchRate = calculateMatchRate(regexPattern, texts);

    console.log(`   📊 Pattern match rate: ${(matchRate * 100).toFixed(1)}%`);

    // Only create pattern if match rate >= 70%
    if (matchRate < 0.7) {
      console.log(`   ⚠️  Match rate too low (need >= 70%)`);
      continue;
    }

    patternsDiscovered++;

    // Extract common evidence types
    const evidenceTypesSet = new Set<string>();
    group.obligations.forEach(obl => {
      obl.evidence_suggestions.forEach(ev => evidenceTypesSet.add(ev));
    });
    const evidenceTypes = Array.from(evidenceTypesSet).slice(0, 5);

    // Generate pattern ID
    const patternId = `AUTO_${group.category}_${Date.now()}_${patternsDiscovered}`.toUpperCase();

    // Create pattern object
    const pattern = {
      pattern_id: patternId,
      pattern_version: '1.0.0',
      priority: 300, // Lower priority than manual patterns
      display_name: `Auto: ${commonPhrases[0].substring(0, 50)}`,
      description: `Auto-generated from ${group.obligations.length} similar obligations. Match rate: ${(matchRate * 100).toFixed(1)}%`,
      matching: {
        regex_primary: regexPattern,
        regex_variants: commonPhrases.slice(1, 4).map(p => generateRegexFromPhrases([p])).filter(p => p),
        semantic_keywords: commonPhrases.map(p => p.split(/\s+/).slice(0, 3)).flat().filter((v, i, a) => a.indexOf(v) === i).slice(0, 10)
      },
      extraction_template: {
        category: group.category,
        frequency: group.frequency,
        deadline_relative: null,
        is_subjective: group.is_subjective,
        evidence_types: evidenceTypes,
        condition_type: 'STANDARD'
      },
      applicability: {
        module_types: ['MODULE_1', 'MODULE_2', 'MODULE_3']
      },
      performance: {
        usage_count: 0,
        success_count: 0,
        false_positive_count: 0,
        false_negative_count: 0,
        success_rate: matchRate,
        last_used_at: null,
        auto_generated: true,
        source_obligation_count: group.obligations.length
      },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      // Check if similar pattern already exists
      const { data: existingPatterns } = await supabase
        .from('rule_library_patterns')
        .select('pattern_id, display_name')
        .eq('matching->>regex_primary', regexPattern);

      if (existingPatterns && existingPatterns.length > 0) {
        console.log(`   ⏭️  Similar pattern already exists: ${existingPatterns[0].pattern_id}`);
        continue;
      }

      // Insert pattern
      const { error: insertError } = await supabase
        .from('rule_library_patterns')
        .insert(pattern);

      if (insertError) {
        console.error(`   ❌ Error creating pattern:`, insertError.message);
      } else {
        console.log(`   ✅ Created pattern: ${patternId}`);
        console.log(`      Display name: ${pattern.display_name}`);
        console.log(`      Category: ${pattern.extraction_template.category}`);
        console.log(`      Source obligations: ${group.obligations.length}`);
        patternsCreated++;
      }
    } catch (error: any) {
      console.error(`   ❌ Error inserting pattern:`, error.message);
    }
  }

  console.log(`\n\n📊 Auto-Learning Results:`);
  console.log(`   Total obligation groups: ${groups.size}`);
  console.log(`   Patterns discovered: ${patternsDiscovered}`);
  console.log(`   Patterns created: ${patternsCreated}`);
  console.log(`\n💰 Cost Savings Estimate:`);

  // Calculate potential cost savings
  const avgObligationsPerDoc = 50;
  const llmCostPerObligation = 0.002; // ~$0.002 per obligation with GPT-4o-mini
  const patternMatchRate = 0.4; // Assume patterns will match 40% of obligations
  const savingsPerDoc = avgObligationsPerDoc * patternMatchRate * llmCostPerObligation;

  console.log(`   With ${patternsCreated} patterns covering common obligations:`);
  console.log(`   - Estimated match rate: 40-60% of similar documents`);
  console.log(`   - Savings per document: ~$${savingsPerDoc.toFixed(2)}`);
  console.log(`   - Savings over 100 documents: ~$${(savingsPerDoc * 100).toFixed(2)}`);
}

main();
