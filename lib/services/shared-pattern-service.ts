/**
 * Shared Pattern Service
 * Manages cross-customer pattern sharing for AI cost reduction
 *
 * Key concepts:
 * - Patterns are initially customer-specific in `pattern_candidates` table
 * - When a pattern reaches threshold criteria, it becomes a global shared pattern
 * - Shared patterns are used first (0 LLM cost) before falling back to LLM
 *
 * Reference: AI Extraction Rules Library - Cross-Customer Pattern Sharing
 */

import { supabaseAdmin } from '@/lib/supabase/server';

export interface SharedPattern {
  id: string;
  regulator: string;
  documentType: string;
  patternTemplate: string; // Anonymized pattern without company/site specifics
  crossCustomerUsageCount: number;
  successRate: number;
  isGlobal: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PatternPromotionCriteria {
  minCrossCustomerUses: number; // Default: 10
  minSuccessRate: number; // Default: 0.92 (92%)
  excludeCompanySpecificTerms: boolean; // Default: true
}

export interface PatternCandidate {
  id: string;
  suggested_pattern: any;
  source_extractions: string[];
  sample_count: number;
  match_rate: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface GetSharedPatternsOptions {
  regulator?: string;
  documentType?: string;
}

export interface MatchSharedPatternOptions {
  regulator?: string;
  documentType?: string;
}

export interface PromotionEligibility {
  eligible: boolean;
  reason?: string;
}

// Default promotion criteria
const DEFAULT_CRITERIA: PatternPromotionCriteria = {
  minCrossCustomerUses: 10,
  minSuccessRate: 0.92,
  excludeCompanySpecificTerms: true,
};

/**
 * Shared Pattern Service Class
 */
export class SharedPatternService {
  /**
   * Get all global shared patterns
   * Optionally filter by regulator and/or document type
   */
  async getSharedPatterns(
    options?: GetSharedPatternsOptions
  ): Promise<SharedPattern[]> {
    const supabase = supabaseAdmin;

    try {
      // Query rule_library_patterns for global patterns
      let query = supabase
        .from('rule_library_patterns')
        .select('*')
        .eq('is_active', true)
        .is('deprecated_at', null)
        .order('priority', { ascending: true });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching shared patterns:', error);
        throw new Error(`Failed to fetch shared patterns: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Filter and transform to SharedPattern format
      const patterns = data
        .filter((pattern) => {
          // Check if pattern is global (cross-customer)
          const applicability = pattern.applicability || {};
          const performance = pattern.performance || {};

          // A pattern is "global" if it has high usage count across multiple contexts
          const isGlobal = (performance.usage_count || 0) >= DEFAULT_CRITERIA.minCrossCustomerUses;
          if (!isGlobal) return false;

          // Filter by regulator if specified
          if (options?.regulator && applicability.regulators) {
            if (!applicability.regulators.includes(options.regulator)) {
              return false;
            }
          }

          // Filter by document type if specified
          if (options?.documentType && applicability.document_types) {
            if (!applicability.document_types.includes(options.documentType)) {
              return false;
            }
          }

          return true;
        })
        .map((pattern) => this.transformToSharedPattern(pattern));

      return patterns;
    } catch (error) {
      console.error('Error in getSharedPatterns:', error);
      throw error;
    }
  }

  /**
   * Check if a pattern candidate meets promotion criteria
   */
  async checkPatternForPromotion(
    patternId: string,
    criteria: PatternPromotionCriteria = DEFAULT_CRITERIA
  ): Promise<PromotionEligibility> {
    const supabase = supabaseAdmin;

    try {
      // Fetch the pattern candidate
      const { data: candidate, error } = await supabase
        .from('pattern_candidates')
        .select('*')
        .eq('id', patternId)
        .single();

      if (error || !candidate) {
        return {
          eligible: false,
          reason: 'Pattern candidate not found',
        };
      }

      // Check if already promoted
      if (candidate.status === 'APPROVED' || candidate.status === 'MERGED') {
        return {
          eligible: false,
          reason: 'Pattern already promoted',
        };
      }

      const suggestedPattern = candidate.suggested_pattern || {};
      const performance = suggestedPattern.performance || {};

      // Check minimum cross-customer uses
      const usageCount = performance.usage_count || 0;
      if (usageCount < criteria.minCrossCustomerUses) {
        return {
          eligible: false,
          reason: `Insufficient cross-customer usage: ${usageCount} < ${criteria.minCrossCustomerUses}`,
        };
      }

      // Check minimum success rate
      const successRate = performance.success_rate || 0;
      if (successRate < criteria.minSuccessRate) {
        return {
          eligible: false,
          reason: `Success rate too low: ${(successRate * 100).toFixed(1)}% < ${(criteria.minSuccessRate * 100).toFixed(1)}%`,
        };
      }

      // Check for company-specific terms if required
      if (criteria.excludeCompanySpecificTerms) {
        const hasCompanySpecificTerms = this.detectCompanySpecificTerms(
          suggestedPattern
        );
        if (hasCompanySpecificTerms) {
          return {
            eligible: false,
            reason: 'Pattern contains company-specific terms that must be anonymized',
          };
        }
      }

      // Check match rate from candidate
      const matchRate = candidate.match_rate || 0;
      if (matchRate < 0.90) {
        return {
          eligible: false,
          reason: `Match rate too low: ${(matchRate * 100).toFixed(1)}% < 90%`,
        };
      }

      return {
        eligible: true,
      };
    } catch (error) {
      console.error('Error checking pattern for promotion:', error);
      return {
        eligible: false,
        reason: 'Error checking promotion eligibility',
      };
    }
  }

  /**
   * Promote a pattern candidate to a shared global pattern
   */
  async promoteToSharedPattern(patternId: string): Promise<SharedPattern> {
    const supabase = supabaseAdmin;

    try {
      // First check eligibility
      const eligibility = await this.checkPatternForPromotion(patternId);
      if (!eligibility.eligible) {
        throw new Error(
          `Pattern not eligible for promotion: ${eligibility.reason}`
        );
      }

      // Fetch the pattern candidate
      const { data: candidate, error: fetchError } = await supabase
        .from('pattern_candidates')
        .select('*')
        .eq('id', patternId)
        .single();

      if (fetchError || !candidate) {
        throw new Error('Pattern candidate not found');
      }

      const suggestedPattern = candidate.suggested_pattern;

      // Anonymize the pattern
      const anonymizedPattern = this.anonymizePatternObject(suggestedPattern);

      // Create the shared pattern in rule_library_patterns
      const { data: createdPattern, error: createError } = await supabase
        .from('rule_library_patterns')
        .insert({
          pattern_id: anonymizedPattern.pattern_id,
          pattern_version: anonymizedPattern.pattern_version || '1.0.0',
          priority: anonymizedPattern.priority || 500,
          display_name: `[SHARED] ${anonymizedPattern.display_name}`,
          description: `${anonymizedPattern.description || ''}\n\nPromoted from cross-customer pattern analysis.`,
          matching: anonymizedPattern.matching,
          extraction_template: anonymizedPattern.extraction_template,
          applicability: anonymizedPattern.applicability,
          performance: {
            usage_count: 0,
            success_count: 0,
            false_positive_count: 0,
            false_negative_count: 0,
            user_override_count: 0,
            success_rate: 1.0,
            last_used_at: null,
          },
          is_active: true,
          source_documents: candidate.source_extractions || [],
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating shared pattern:', createError);
        throw new Error(`Failed to create shared pattern: ${createError.message}`);
      }

      // Update candidate status to APPROVED and link to created pattern
      await supabase
        .from('pattern_candidates')
        .update({
          status: 'APPROVED',
          reviewed_at: new Date().toISOString(),
          created_pattern_id: createdPattern.pattern_id,
        })
        .eq('id', patternId);

      // Create pattern event
      await supabase.from('pattern_events').insert({
        pattern_id: createdPattern.pattern_id,
        event_type: 'CREATED',
        from_version: null,
        to_version: createdPattern.pattern_version,
        event_data: {
          source: 'promotion',
          candidate_id: patternId,
          original_usage_count: suggestedPattern.performance?.usage_count || 0,
          original_success_rate: suggestedPattern.performance?.success_rate || 0,
        },
        reason: 'Promoted from pattern candidate to shared global pattern',
      });

      return this.transformToSharedPattern(createdPattern);
    } catch (error) {
      console.error('Error promoting pattern to shared:', error);
      throw error;
    }
  }

  /**
   * Anonymize pattern text by removing company/site-specific information
   * Replace with placeholders like [COMPANY], [SITE], [DATE]
   */
  anonymizePattern(patternText: string): string {
    if (!patternText) return patternText;

    let anonymized = patternText;

    // Replace common company name patterns
    // Look for capitalized company names (2-4 words)
    anonymized = anonymized.replace(
      /\b([A-Z][a-z]+\s){1,3}(Ltd|Limited|plc|PLC|Inc|Corporation|Corp)\b/g,
      '[COMPANY]'
    );

    // Replace specific site references
    anonymized = anonymized.replace(
      /\b([A-Z][a-z]+\s){1,2}(Site|Plant|Facility|Works|Treatment Works)\b/gi,
      '[SITE]'
    );

    // Replace specific dates (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)
    anonymized = anonymized.replace(
      /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g,
      '[DATE]'
    );
    anonymized = anonymized.replace(
      /\b\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/g,
      '[DATE]'
    );

    // Replace specific addresses
    anonymized = anonymized.replace(
      /\b\d+\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)*\s+(Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Lane|Ln)\b/gi,
      '[ADDRESS]'
    );

    // Replace postcodes (UK format)
    anonymized = anonymized.replace(
      /\b[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2}\b/g,
      '[POSTCODE]'
    );

    // Replace email addresses
    anonymized = anonymized.replace(
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      '[EMAIL]'
    );

    // Replace phone numbers (UK and international)
    anonymized = anonymized.replace(
      /\b(\+44|0)[\s-]?\d{3,4}[\s-]?\d{3,4}[\s-]?\d{3,4}\b/g,
      '[PHONE]'
    );

    // Replace specific permit/license numbers (alphanumeric patterns)
    anonymized = anonymized.replace(
      /\b[A-Z]{2,4}[\/-]?\d{4,8}[\/-]?[A-Z\d]{0,4}\b/g,
      '[PERMIT_NUMBER]'
    );

    // Replace specific names (Title + First + Last name patterns)
    anonymized = anonymized.replace(
      /\b(Mr|Mrs|Ms|Dr|Professor|Prof)\s+[A-Z][a-z]+\s+[A-Z][a-z]+\b/g,
      '[PERSON_NAME]'
    );

    // Replace specific monetary amounts with currency symbols
    anonymized = anonymized.replace(/£\s*\d+(?:,\d{3})*(?:\.\d{2})?/g, '[AMOUNT]');
    anonymized = anonymized.replace(/\$\s*\d+(?:,\d{3})*(?:\.\d{2})?/g, '[AMOUNT]');
    anonymized = anonymized.replace(/€\s*\d+(?:,\d{3})*(?:\.\d{2})?/g, '[AMOUNT]');

    return anonymized;
  }

  /**
   * Try to match document text against shared patterns
   * Returns the best matching pattern or null
   */
  async matchSharedPattern(
    documentText: string,
    options?: MatchSharedPatternOptions
  ): Promise<SharedPattern | null> {
    try {
      // Get applicable shared patterns
      const patterns = await this.getSharedPatterns({
        regulator: options?.regulator,
        documentType: options?.documentType,
      });

      if (patterns.length === 0) {
        return null;
      }

      // Try to match each pattern against the document text
      let bestMatch: { pattern: SharedPattern; score: number } | null = null;

      for (const pattern of patterns) {
        const score = await this.calculatePatternMatchScore(
          documentText,
          pattern
        );

        if (score >= 0.90) {
          // High confidence match
          if (!bestMatch || score > bestMatch.score) {
            bestMatch = { pattern, score };
          }
        }
      }

      // Record pattern usage if we found a match
      if (bestMatch) {
        await this.recordPatternMatch(bestMatch.pattern.id, true);
        return bestMatch.pattern;
      }

      return null;
    } catch (error) {
      console.error('Error matching shared pattern:', error);
      return null;
    }
  }

  /**
   * Get patterns that are close to meeting promotion criteria
   */
  async getPromotionCandidates(
    limit: number = 20,
    criteria: PatternPromotionCriteria = DEFAULT_CRITERIA
  ): Promise<PatternCandidate[]> {
    const supabase = supabaseAdmin;

    try {
      // Fetch pending pattern candidates
      const { data, error } = await supabase
        .from('pattern_candidates')
        .select('*')
        .eq('status', 'PENDING_REVIEW')
        .order('sample_count', { ascending: false })
        .limit(limit * 2); // Fetch more than limit since we'll filter

      if (error) {
        console.error('Error fetching promotion candidates:', error);
        throw new Error(`Failed to fetch promotion candidates: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Filter and rank candidates by how close they are to meeting criteria
      const rankedCandidates = data
        .map((candidate) => {
          const suggestedPattern = candidate.suggested_pattern || {};
          const performance = suggestedPattern.performance || {};
          const usageCount = performance.usage_count || 0;
          const successRate = performance.success_rate || 0;
          const matchRate = candidate.match_rate || 0;

          // Calculate "closeness" score (0-1.0)
          const usageScore = Math.min(
            usageCount / criteria.minCrossCustomerUses,
            1.0
          );
          const successScore = Math.min(
            successRate / criteria.minSuccessRate,
            1.0
          );
          const matchScore = matchRate / 0.90; // 90% is threshold

          const closenessScore = (usageScore + successScore + matchScore) / 3;

          return {
            candidate,
            closenessScore,
            usageCount,
            successRate,
            matchRate,
          };
        })
        .filter((item) => item.closenessScore >= 0.5) // At least 50% of the way there
        .sort((a, b) => b.closenessScore - a.closenessScore)
        .slice(0, limit);

      return rankedCandidates.map((item) => ({
        id: item.candidate.id,
        suggested_pattern: item.candidate.suggested_pattern,
        source_extractions: item.candidate.source_extractions || [],
        sample_count: item.candidate.sample_count,
        match_rate: item.candidate.match_rate,
        status: item.candidate.status,
        created_at: item.candidate.created_at,
        updated_at: item.candidate.updated_at,
      }));
    } catch (error) {
      console.error('Error getting promotion candidates:', error);
      throw error;
    }
  }

  // ========== Private Helper Methods ==========

  /**
   * Transform database pattern to SharedPattern format
   */
  private transformToSharedPattern(pattern: any): SharedPattern {
    const applicability = pattern.applicability || {};
    const performance = pattern.performance || {};
    const matching = pattern.matching || {};

    // Extract regulator and document type
    const regulator = (applicability.regulators?.[0] || 'GENERIC').toString();
    const documentType = (
      applicability.document_types?.[0] || 'GENERIC'
    ).toString();

    // Create anonymized pattern template
    const patternTemplate = this.anonymizePattern(
      matching.regex_primary || pattern.display_name
    );

    return {
      id: pattern.id,
      regulator,
      documentType,
      patternTemplate,
      crossCustomerUsageCount: performance.usage_count || 0,
      successRate: performance.success_rate || 1.0,
      isGlobal: (performance.usage_count || 0) >= DEFAULT_CRITERIA.minCrossCustomerUses,
      createdAt: pattern.created_at,
      updatedAt: pattern.updated_at,
    };
  }

  /**
   * Anonymize a full pattern object (for promotion)
   */
  private anonymizePatternObject(pattern: any): any {
    if (!pattern) return pattern;

    const anonymized = { ...pattern };

    // Anonymize display name
    if (anonymized.display_name) {
      anonymized.display_name = this.anonymizePattern(anonymized.display_name);
    }

    // Anonymize description
    if (anonymized.description) {
      anonymized.description = this.anonymizePattern(anonymized.description);
    }

    // Anonymize matching patterns
    if (anonymized.matching) {
      if (anonymized.matching.regex_primary) {
        anonymized.matching.regex_primary = this.anonymizePattern(
          anonymized.matching.regex_primary
        );
      }
      if (anonymized.matching.regex_variants) {
        anonymized.matching.regex_variants =
          anonymized.matching.regex_variants.map((v: string) =>
            this.anonymizePattern(v)
          );
      }
      if (anonymized.matching.semantic_keywords) {
        anonymized.matching.semantic_keywords =
          anonymized.matching.semantic_keywords.map((k: string) =>
            this.anonymizePattern(k)
          );
      }
    }

    // Remove company-specific applicability filters
    if (anonymized.applicability) {
      // Keep regulators and document types, but remove specific companies
      anonymized.applicability.water_companies = [];
    }

    return anonymized;
  }

  /**
   * Detect if pattern contains company-specific terms
   */
  private detectCompanySpecificTerms(pattern: any): boolean {
    if (!pattern) return false;

    // Company-specific indicators
    const companyIndicators = [
      /\b(Ltd|Limited|plc|PLC|Inc|Corporation|Corp)\b/,
      /\b[A-Z][a-z]+\s+(Water|Utilities|Treatment|Services)\b/,
      /\b(Thames|Severn|Anglian|United|Yorkshire|Southern|Northumbrian|Wessex|South West)\s+Water\b/i,
    ];

    // Check display name
    const displayName = pattern.display_name || '';
    if (companyIndicators.some((regex) => regex.test(displayName))) {
      return true;
    }

    // Check description
    const description = pattern.description || '';
    if (companyIndicators.some((regex) => regex.test(description))) {
      return true;
    }

    // Check matching patterns
    const matching = pattern.matching || {};
    const regexPrimary = matching.regex_primary || '';
    if (companyIndicators.some((regex) => regex.test(regexPrimary))) {
      return true;
    }

    return false;
  }

  /**
   * Calculate match score between document text and pattern
   */
  private async calculatePatternMatchScore(
    documentText: string,
    pattern: SharedPattern
  ): Promise<number> {
    // Fetch the full pattern from database to get matching rules
    const supabase = supabaseAdmin;
    const { data: fullPattern } = await supabase
      .from('rule_library_patterns')
      .select('matching')
      .eq('id', pattern.id)
      .single();

    if (!fullPattern || !fullPattern.matching) {
      return 0;
    }

    const matching = fullPattern.matching;
    let score = 0;

    // Try regex matching
    try {
      if (matching.regex_primary) {
        const regex = new RegExp(matching.regex_primary, 'gi');
        const matches = documentText.match(regex);
        if (matches) {
          const matchedLength = matches.reduce((sum, m) => sum + m.length, 0);
          const coverageScore = Math.min(matchedLength / documentText.length, 1.0);
          score = 0.85 + coverageScore * 0.15;
        }
      }
    } catch (error) {
      console.error('Error in regex matching:', error);
    }

    // Try semantic keyword matching if regex score is low
    if (score < 0.9 && matching.semantic_keywords) {
      const textLower = documentText.toLowerCase();
      let matchedKeywords = 0;
      for (const keyword of matching.semantic_keywords) {
        if (textLower.includes(keyword.toLowerCase())) {
          matchedKeywords++;
        }
      }
      const keywordScore =
        0.5 + (matchedKeywords / matching.semantic_keywords.length) * 0.4;
      score = Math.max(score, keywordScore);
    }

    return score;
  }

  /**
   * Record pattern match usage
   */
  private async recordPatternMatch(
    patternId: string,
    success: boolean
  ): Promise<void> {
    try {
      const supabase = supabaseAdmin;

      // Fetch current performance
      const { data: pattern } = await supabase
        .from('rule_library_patterns')
        .select('performance')
        .eq('id', patternId)
        .single();

      if (!pattern) return;

      const performance = pattern.performance || {
        usage_count: 0,
        success_count: 0,
        false_positive_count: 0,
        false_negative_count: 0,
        user_override_count: 0,
        success_rate: 1.0,
        last_used_at: null,
      };

      const newUsageCount = (performance.usage_count || 0) + 1;
      const newSuccessCount = success
        ? (performance.success_count || 0) + 1
        : performance.success_count || 0;
      const newSuccessRate = newSuccessCount / newUsageCount;

      // Update pattern performance
      await supabase
        .from('rule_library_patterns')
        .update({
          performance: {
            ...performance,
            usage_count: newUsageCount,
            success_count: newSuccessCount,
            success_rate: newSuccessRate,
            last_used_at: new Date().toISOString(),
          },
        })
        .eq('id', patternId);
    } catch (error) {
      console.error('Error recording pattern match:', error);
      // Don't throw - this is non-critical tracking
    }
  }
}

// Singleton instance
let sharedPatternService: SharedPatternService | null = null;

export function getSharedPatternService(): SharedPatternService {
  if (!sharedPatternService) {
    sharedPatternService = new SharedPatternService();
  }
  return sharedPatternService;
}

// Export both class and singleton
export const sharedPatternServiceInstance = getSharedPatternService();
