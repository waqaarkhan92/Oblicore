/**
 * Rule Library Pattern Matcher
 * Matches document text against rule library patterns before LLM extraction
 * Reference: AI_Extraction_Rules_Library.md Section 3
 */

export interface RulePattern {
  pattern_id: string;
  pattern_version: string;
  priority: number;
  display_name: string;
  description: string;
  matching: {
    regex_primary: string;
    regex_variants?: string[];
    semantic_keywords?: string[];
    negative_patterns?: string[];
    min_text_length?: number;
    max_text_length?: number;
  };
  extraction_template: {
    category: 'MONITORING' | 'REPORTING' | 'RECORD_KEEPING' | 'OPERATIONAL' | 'MAINTENANCE';
    frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'ONE_TIME' | 'CONTINUOUS' | 'EVENT_TRIGGERED' | null;
    deadline_relative?: string | null;
    is_subjective: boolean;
    subjective_phrases?: string[];
    evidence_types?: string[];
    condition_type: 'STANDARD' | 'SITE_SPECIFIC' | 'IMPROVEMENT' | 'ELV' | 'PARAMETER_LIMIT' | 'RUN_HOUR_LIMIT' | 'REPORTING';
  };
  applicability: {
    module_types: string[];
    regulators?: string[];
    document_types?: string[];
    water_companies?: string[];
  };
  performance?: {
    usage_count?: number;
    success_count?: number;
    success_rate?: number;
  };
  status?: {
    is_active?: boolean;
  };
}

export interface RuleMatch {
  pattern_id: string;
  match_score: number; // 0-1.0
  match_type: 'regex' | 'semantic' | 'combined';
  matched_text: string;
  extracted_obligation: {
    category: string;
    frequency?: string | null;
    deadline_relative?: string | null;
    is_subjective: boolean;
    evidence_types?: string[];
    condition_type: string;
  };
  confidence_boost: number; // +15% for library matches
}

export class RuleLibraryMatcher {
  private patterns: RulePattern[] = [];

  /**
   * Load patterns from database or codebase
   * TODO: Load from database table `rule_library_patterns` when implemented
   * For now, we'll use a basic pattern structure
   */
  async loadPatterns(
    moduleTypes: string[],
    regulator?: string,
    documentType?: string
  ): Promise<void> {
    // TODO: Load from database
    // SELECT * FROM rule_library_patterns
    // WHERE is_active = true
    //   AND applicability->'module_types' @> ARRAY[moduleTypes]::JSONB
    //   AND (regulator IS NULL OR applicability->'regulators' @> ARRAY[regulator]::JSONB)
    //   AND (documentType IS NULL OR applicability->'document_types' @> ARRAY[documentType]::JSONB)
    // ORDER BY priority ASC, usage_count DESC;

    // For now, return empty array (patterns will be added later)
    this.patterns = [];
  }

  /**
   * Find matches in document text
   * Returns matches with score >= 0.9 (90% threshold)
   */
  async findMatches(
    documentText: string,
    moduleTypes: string[],
    regulator?: string,
    documentType?: string
  ): Promise<RuleMatch[]> {
    // Load applicable patterns
    await this.loadPatterns(moduleTypes, regulator, documentType);

    if (this.patterns.length === 0) {
      return []; // No patterns loaded, skip to LLM
    }

    const matches: RuleMatch[] = [];

    // Segment document into chunks (for large documents)
    const segments = this.segmentDocument(documentText);

    for (const segment of segments) {
      for (const pattern of this.patterns) {
        // Check applicability filters
        if (!this.isPatternApplicable(pattern, moduleTypes, regulator, documentType)) {
          continue;
        }

        // Check text length constraints
        if (pattern.matching.min_text_length && segment.length < pattern.matching.min_text_length) {
          continue;
        }
        if (pattern.matching.max_text_length && segment.length > pattern.matching.max_text_length) {
          continue;
        }

        // Try regex matching first
        const regexScore = this.calculateRegexMatchScore(segment, pattern);
        
        if (regexScore >= 0.9) {
          matches.push({
            pattern_id: pattern.pattern_id,
            match_score: regexScore,
            match_type: 'regex',
            matched_text: segment,
            extracted_obligation: {
              category: pattern.extraction_template.category,
              frequency: pattern.extraction_template.frequency || null,
              deadline_relative: pattern.extraction_template.deadline_relative || null,
              is_subjective: pattern.extraction_template.is_subjective,
              evidence_types: pattern.extraction_template.evidence_types || [],
              condition_type: pattern.extraction_template.condition_type,
            },
            confidence_boost: 0.15, // +15% confidence boost
          });
          continue; // Found high-confidence match, skip semantic matching
        }

        // If regex score is 70-89%, try semantic matching
        if (regexScore >= 0.7 && regexScore < 0.9) {
          const semanticScore = this.calculateSemanticMatchScore(segment, pattern);
          const combinedScore = (regexScore * 0.6) + (semanticScore * 0.4); // Weighted combination

          if (combinedScore >= 0.9) {
            matches.push({
              pattern_id: pattern.pattern_id,
              match_score: combinedScore,
              match_type: 'combined',
              matched_text: segment,
              extracted_obligation: {
                category: pattern.extraction_template.category,
                frequency: pattern.extraction_template.frequency || null,
                deadline_relative: pattern.extraction_template.deadline_relative || null,
                is_subjective: pattern.extraction_template.is_subjective,
                evidence_types: pattern.extraction_template.evidence_types || [],
                condition_type: pattern.extraction_template.condition_type,
              },
              confidence_boost: 0.15,
            });
          }
        }
      }
    }

    // Sort by match score (highest first)
    return matches.sort((a, b) => b.match_score - a.match_score);
  }

  /**
   * Calculate regex match score (0-1.0)
   */
  private calculateRegexMatchScore(
    segment: string,
    pattern: RulePattern
  ): number {
    // Try primary regex
    try {
      const primaryRegex = new RegExp(pattern.matching.regex_primary, 'gi');
      const primaryMatch = segment.match(primaryRegex);

      if (primaryMatch) {
        // Calculate coverage: how much of segment is matched
        const matchedLength = primaryMatch.reduce((sum, m) => sum + m.length, 0);
        const coverageScore = Math.min(matchedLength / segment.length, 1.0);

        // Check for negative patterns (reduce score if found)
        let negativePenalty = 0;
        if (pattern.matching.negative_patterns) {
          for (const negPattern of pattern.matching.negative_patterns) {
            if (new RegExp(negPattern, 'i').test(segment)) {
              negativePenalty += 0.15; // 15% penalty per negative pattern
            }
          }
        }

        // Calculate final score
        const baseScore = 0.85 + (coverageScore * 0.15); // 85-100% range
        const finalScore = Math.max(baseScore - negativePenalty, 0);

        return finalScore;
      }
    } catch (error) {
      console.error(`Invalid regex pattern: ${pattern.pattern_id}`, error);
      return 0;
    }

    // Try variant patterns with lower base score
    if (pattern.matching.regex_variants) {
      for (const variant of pattern.matching.regex_variants) {
        try {
          const variantRegex = new RegExp(variant, 'gi');
          const variantMatch = segment.match(variantRegex);
          
          if (variantMatch) {
            const matchedLength = variantMatch.reduce((sum, m) => sum + m.length, 0);
            const coverageScore = Math.min(matchedLength / segment.length, 1.0);
            return 0.75 + (coverageScore * 0.15); // 75-90% range for variants
          }
        } catch (error) {
          console.error(`Invalid regex variant: ${pattern.pattern_id}`, error);
          continue;
        }
      }
    }

    return 0; // No match
  }

  /**
   * Calculate semantic match score (0-1.0)
   */
  private calculateSemanticMatchScore(
    segment: string,
    pattern: RulePattern
  ): number {
    if (!pattern.matching.semantic_keywords || pattern.matching.semantic_keywords.length === 0) {
      return 0;
    }

    const segmentLower = segment.toLowerCase();
    let matchedKeywords = 0;

    for (const keyword of pattern.matching.semantic_keywords) {
      if (segmentLower.includes(keyword.toLowerCase())) {
        matchedKeywords++;
      }
    }

    // Score based on keyword match ratio
    const keywordRatio = matchedKeywords / pattern.matching.semantic_keywords.length;
    
    // Base score: 0.5-0.85 range
    return 0.5 + (keywordRatio * 0.35);
  }

  /**
   * Segment document into chunks for pattern matching
   */
  private segmentDocument(text: string, maxChunkSize: number = 1000): string[] {
    // Simple segmentation: split by sentences, then group into chunks
    const sentences = text.split(/[.!?]\s+/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [text];
  }

  /**
   * Check if pattern is applicable to current document
   */
  private isPatternApplicable(
    pattern: RulePattern,
    moduleTypes: string[],
    regulator?: string,
    documentType?: string
  ): boolean {
    // Check module types
    const hasModuleMatch = pattern.applicability.module_types.some(
      (mt) => moduleTypes.includes(mt)
    );
    if (!hasModuleMatch) {
      return false;
    }

    // Check regulator (if specified)
    if (regulator && pattern.applicability.regulators) {
      if (!pattern.applicability.regulators.includes(regulator)) {
        return false;
      }
    }

    // Check document type (if specified)
    if (documentType && pattern.applicability.document_types) {
      if (!pattern.applicability.document_types.includes(documentType)) {
        return false;
      }
    }

    // Check if pattern is active
    if (pattern.status && pattern.status.is_active === false) {
      return false;
    }

    return true;
  }
}

// Singleton instance
let ruleLibraryMatcher: RuleLibraryMatcher | null = null;

export function getRuleLibraryMatcher(): RuleLibraryMatcher {
  if (!ruleLibraryMatcher) {
    ruleLibraryMatcher = new RuleLibraryMatcher();
  }
  return ruleLibraryMatcher;
}

