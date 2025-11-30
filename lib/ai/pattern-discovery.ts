/**
 * Pattern Discovery Service
 * Automatically generates new patterns from successful LLM extractions
 * Reference: docs/specs/80_AI_Extraction_Rules_Library.md Section 5.1
 */

import { supabaseAdmin } from '@/lib/supabase/server';

export interface PatternCandidate {
  suggested_regex: string;
  match_rate: number;
  sample_count: number;
  extraction_template: any;
  source_extractions: string[];
}

export interface SuccessfulExtraction {
  id: string;
  original_text: string;
  extracted_obligation: {
    category: string;
    frequency?: string | null;
    deadline_relative?: string | null;
    is_subjective: boolean;
    evidence_types?: string[];
    condition_type: string;
  };
  document_type?: string;
  regulator?: string;
  module_types?: string[];
}

/**
 * Generate pattern candidate from successful extractions
 * Requires minimum 3 similar successful extractions
 */
export async function generatePatternCandidate(
  successfulExtractions: SuccessfulExtraction[]
): Promise<PatternCandidate | null> {
  // Require minimum 3 similar successful extractions
  if (successfulExtractions.length < 3) return null;

  // Extract common text patterns
  const texts = successfulExtractions.map((e) => e.original_text);
  const commonPatterns = findCommonPatterns(texts);

  if (commonPatterns.length === 0) return null;

  // Generate regex from patterns
  const regexPattern = generateRegexFromPatterns(commonPatterns, texts);

  // Verify regex matches all input texts
  const matchRate = calculateMatchRate(regexPattern, texts);
  if (matchRate < 0.90) return null;

  // Extract common extraction template
  const template = extractCommonTemplate(successfulExtractions);

  return {
    suggested_regex: regexPattern,
    match_rate: matchRate,
    sample_count: successfulExtractions.length,
    extraction_template: template,
    source_extractions: successfulExtractions.map((e) => e.id),
  };
}

/**
 * Find common patterns in multiple texts
 */
function findCommonPatterns(texts: string[]): string[] {
  if (texts.length === 0) return [];

  // For now, return common phrases (words that appear in all texts)
  // This is a simplified version - can be enhanced with more sophisticated pattern matching
  const words = texts.map((text) => text.toLowerCase().split(/\s+/));
  const commonWords = words.reduce((acc, curr) => {
    if (acc.length === 0) return curr;
    return acc.filter((word) => curr.includes(word));
  }, [] as string[]);

  // Extract common phrases (2-4 word sequences)
  const phrases: string[] = [];
  for (let i = 0; i < texts.length; i++) {
    const words = texts[i].toLowerCase().split(/\s+/);
    for (let j = 0; j < words.length - 1; j++) {
      for (let k = 2; k <= 4 && j + k <= words.length; k++) {
        const phrase = words.slice(j, j + k).join(' ');
        if (texts.every((t) => t.toLowerCase().includes(phrase))) {
          if (!phrases.includes(phrase)) {
            phrases.push(phrase);
          }
        }
      }
    }
  }

  return phrases.slice(0, 10); // Return top 10 common phrases
}

/**
 * Generate regex pattern from common patterns
 */
function generateRegexFromPatterns(
  commonPatterns: string[],
  texts: string[]
): string {
  if (commonPatterns.length === 0) {
    // Fallback: create a simple regex that matches common words
    return '.*';
  }

  // Find the longest common phrase
  const longestPattern = commonPatterns.sort((a, b) => b.length - a.length)[0];

  // Escape special regex characters
  const escaped = longestPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Create a flexible regex that allows variations
  // Replace word boundaries with optional word patterns
  const words = escaped.split('\\s+');
  const flexibleRegex = words
    .map((word) => {
      // Make word boundary flexible
      return `\\b${word}\\b`;
    })
    .join('\\s+');

  return `(?i)${flexibleRegex}.*`;
}

/**
 * Calculate match rate of regex against texts
 */
function calculateMatchRate(regexPattern: string, texts: string[]): number {
  try {
    const regex = new RegExp(regexPattern, 'i');
    const matches = texts.filter((text) => regex.test(text)).length;
    return matches / texts.length;
  } catch (error) {
    console.error('Invalid regex pattern:', regexPattern);
    return 0;
  }
}

/**
 * Extract common template from successful extractions
 */
function extractCommonTemplate(
  extractions: SuccessfulExtraction[]
): any {
  if (extractions.length === 0) return {};

  const first = extractions[0].extracted_obligation;

  // Check if all extractions have the same category
  const allSameCategory = extractions.every(
    (e) => e.extracted_obligation.category === first.category
  );

  // Check if all extractions have the same frequency
  const allSameFrequency = extractions.every(
    (e) => e.extracted_obligation.frequency === first.frequency
  );

  // Check if all extractions have the same is_subjective
  const allSameSubjective = extractions.every(
    (e) => e.extracted_obligation.is_subjective === first.is_subjective
  );

  return {
    category: allSameCategory ? first.category : null,
    frequency: allSameFrequency ? first.frequency : null,
    deadline_relative: null,
    is_subjective: allSameSubjective ? first.is_subjective : false,
    subjective_phrases: [],
    evidence_types: first.evidence_types || [],
    condition_type: first.condition_type || 'STANDARD',
  };
}

/**
 * Queue pattern candidate for admin review
 */
export async function queuePatternCandidate(
  candidate: PatternCandidate,
  documentType?: string,
  regulator?: string,
  moduleTypes?: string[]
): Promise<string | null> {
  try {
    // Generate pattern ID
    const regulatorCode = regulator || 'GENERIC';
    const moduleCode = moduleTypes?.[0] || 'M1';
    const category = candidate.extraction_template.category || 'GENERAL';
    const timestamp = Date.now().toString().slice(-3);
    const patternId = `${regulatorCode}_${moduleCode}_${category}_${timestamp}`;

    const suggestedPattern = {
      pattern_id: patternId,
      pattern_version: '1.0.0',
      priority: 500,
      display_name: `Auto-generated: ${category}`,
      description: `Pattern discovered from ${candidate.sample_count} successful extractions`,
      matching: {
        regex_primary: candidate.suggested_regex,
        regex_variants: [],
        semantic_keywords: [],
        negative_patterns: [],
      },
      extraction_template: candidate.extraction_template,
      applicability: {
        module_types: moduleTypes || [],
        regulators: regulator ? [regulator] : [],
        document_types: documentType ? [documentType] : [],
        water_companies: [],
      },
      performance: {
        usage_count: 0,
        success_count: 0,
        false_positive_count: 0,
        false_negative_count: 0,
        user_override_count: 0,
        success_rate: 1.0,
        last_used_at: null,
      },
    };

    const { data, error } = await supabaseAdmin
      .from('pattern_candidates')
      .insert({
        suggested_pattern: suggestedPattern,
        source_extractions: candidate.source_extractions,
        sample_count: candidate.sample_count,
        match_rate: candidate.match_rate,
        status: 'PENDING_REVIEW',
      })
      .select()
      .single();

    if (error) {
      console.error('Error queueing pattern candidate:', error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('Error queueing pattern candidate:', error);
    return null;
  }
}

/**
 * Check for potential new patterns from extraction logs
 * Called after successful extractions that weren't matched by library
 */
export async function checkForPatternDiscovery(
  extractionLogId: string,
  obligationIds: string[]
): Promise<void> {
  try {
    // Get extraction details
    const { data: extractionLog } = await supabaseAdmin
      .from('extraction_logs')
      .select('*, documents(document_type, regulator)')
      .eq('id', extractionLogId)
      .single();

    if (!extractionLog) return;

    // Get obligations that were successfully extracted (not rejected)
    const { data: obligations } = await supabaseAdmin
      .from('obligations')
      .select('id, text, category, frequency, is_subjective, evidence_types, condition_type')
      .in('id', obligationIds)
      .is('status', null) // Not rejected
      .eq('original_extraction->>confirmed', 'true') // User confirmed without edits
      .limit(10);

    if (!obligations || obligations.length < 3) return;

    // Group similar obligations by text similarity
    const similarGroups = groupSimilarObligations(obligations);

    // For each group with 3+ similar obligations, try to generate pattern
    for (const group of similarGroups) {
      if (group.length >= 3) {
        const candidate = await generatePatternCandidate(
          group.map((o) => ({
            id: o.id,
            original_text: o.text,
            extracted_obligation: {
              category: o.category,
              frequency: o.frequency,
              deadline_relative: null,
              is_subjective: o.is_subjective,
              evidence_types: o.evidence_types || [],
              condition_type: o.condition_type || 'STANDARD',
            },
            document_type: extractionLog.documents?.document_type,
            regulator: extractionLog.documents?.regulator,
          }))
        );

        if (candidate) {
          await queuePatternCandidate(
            candidate,
            extractionLog.documents?.document_type,
            extractionLog.documents?.regulator
          );
        }
      }
    }
  } catch (error) {
    console.error('Error checking for pattern discovery:', error);
    // Don't throw - pattern discovery is non-critical
  }
}

/**
 * Group obligations by text similarity (simplified version)
 */
function groupSimilarObligations(obligations: any[]): any[][] {
  // Simplified: group by category and similar length
  // Can be enhanced with more sophisticated similarity matching
  const groups: any[][] = [];
  const used = new Set<string>();

  for (const obligation of obligations) {
    if (used.has(obligation.id)) continue;

    const group = [obligation];
    used.add(obligation.id);

    // Find similar obligations
    for (const other of obligations) {
      if (used.has(other.id)) continue;

      // Check if similar (same category and similar text length)
      if (
        other.category === obligation.category &&
        Math.abs(other.text.length - obligation.text.length) < obligation.text.length * 0.3
      ) {
        group.push(other);
        used.add(other.id);
      }
    }

    if (group.length > 0) {
      groups.push(group);
    }
  }

  return groups;
}

