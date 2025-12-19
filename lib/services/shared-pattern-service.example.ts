/**
 * Shared Pattern Service - Integration Example
 *
 * This file demonstrates how to integrate the Shared Pattern Service
 * into the document extraction pipeline for maximum cost savings.
 */

import { getSharedPatternService } from './shared-pattern-service';
import { getRuleLibraryMatcher } from '@/lib/ai/rule-library-matcher';

/**
 * Example 1: Basic Integration in Extraction Pipeline
 *
 * This shows the recommended order of pattern matching:
 * 1. Shared global patterns (0 cost)
 * 2. Customer-specific rule library patterns (0 cost)
 * 3. LLM extraction (has cost)
 */
export async function extractWithSharedPatterns(
  documentText: string,
  metadata: {
    regulator?: string;
    documentType?: string;
    moduleTypes: string[];
    companyId: string;
  }
) {
  const sharedPatternService = getSharedPatternService();
  const ruleLibraryMatcher = getRuleLibraryMatcher();

  console.log('Starting extraction with cost optimization...');

  // STEP 1: Try shared global patterns first (highest cost savings)
  console.log('Step 1: Checking shared global patterns...');
  const sharedMatch = await sharedPatternService.matchSharedPattern(
    documentText,
    {
      regulator: metadata.regulator,
      documentType: metadata.documentType,
    }
  );

  if (sharedMatch) {
    console.log('✓ Match found in shared patterns! Zero LLM cost.');
    console.log(`  Pattern: ${sharedMatch.patternTemplate}`);
    console.log(`  Success Rate: ${(sharedMatch.successRate * 100).toFixed(1)}%`);

    return {
      source: 'shared_pattern',
      pattern_id: sharedMatch.id,
      regulator: sharedMatch.regulator,
      documentType: sharedMatch.documentType,
      confidence: sharedMatch.successRate,
      cost_usd: 0,
      obligations: [
        // Extract using pattern template
      ],
    };
  }

  // STEP 2: Try customer-specific rule library patterns
  console.log('Step 2: Checking customer-specific rule library...');
  const ruleMatches = await ruleLibraryMatcher.findMatches(
    documentText,
    metadata.moduleTypes,
    metadata.regulator,
    metadata.documentType
  );

  if (ruleMatches.length > 0) {
    console.log('✓ Match found in rule library! Zero LLM cost.');
    console.log(`  Pattern: ${ruleMatches[0].pattern_id}`);
    console.log(`  Score: ${(ruleMatches[0].match_score * 100).toFixed(1)}%`);

    return {
      source: 'rule_library',
      pattern_id: ruleMatches[0].pattern_id,
      confidence: ruleMatches[0].match_score,
      cost_usd: 0,
      obligations: [ruleMatches[0].extracted_obligation],
    };
  }

  // STEP 3: Fall back to LLM extraction (incurs cost)
  console.log('Step 3: No patterns matched. Using LLM extraction...');
  const llmResult = await performLLMExtraction(documentText, metadata);

  console.log(`✗ LLM extraction cost: $${llmResult.cost_usd.toFixed(4)}`);

  return llmResult;
}

/**
 * Example 2: Admin Dashboard - Review Promotion Candidates
 *
 * This shows how an admin would review and promote patterns.
 */
export async function reviewPromotionCandidates() {
  const service = getSharedPatternService();

  console.log('=== Pattern Promotion Review ===\n');

  // Get candidates close to meeting criteria
  const candidates = await service.getPromotionCandidates(20);

  console.log(`Found ${candidates.length} candidates for review:\n`);

  for (const candidate of candidates) {
    const { suggested_pattern } = candidate;
    const performance = suggested_pattern.performance || {};

    console.log(`Candidate: ${candidate.id}`);
    console.log(`  Display Name: ${suggested_pattern.display_name}`);
    console.log(`  Sample Count: ${candidate.sample_count}`);
    console.log(`  Match Rate: ${(candidate.match_rate * 100).toFixed(1)}%`);
    console.log(`  Usage Count: ${performance.usage_count || 0}`);
    console.log(`  Success Rate: ${((performance.success_rate || 0) * 100).toFixed(1)}%`);

    // Check eligibility
    const eligibility = await service.checkPatternForPromotion(candidate.id);

    if (eligibility.eligible) {
      console.log('  ✓ ELIGIBLE for promotion');

      // Preview anonymized version
      const anonymized = service.anonymizePattern(
        suggested_pattern.display_name
      );
      console.log(`  Anonymized: ${anonymized}`);
    } else {
      console.log(`  ✗ Not eligible: ${eligibility.reason}`);
    }

    console.log('');
  }
}

/**
 * Example 3: Automated Pattern Promotion
 *
 * This could run as a scheduled job to automatically promote
 * eligible patterns that meet strict criteria.
 */
export async function autoPromoteEligiblePatterns() {
  const service = getSharedPatternService();

  console.log('=== Automated Pattern Promotion ===\n');

  // Use stricter criteria for auto-promotion
  const strictCriteria = {
    minCrossCustomerUses: 15, // Higher threshold
    minSuccessRate: 0.95, // 95% success rate
    excludeCompanySpecificTerms: true,
  };

  const candidates = await service.getPromotionCandidates(50, strictCriteria);

  console.log(`Reviewing ${candidates.length} candidates...\n`);

  const promoted: string[] = [];
  const skipped: Array<{ id: string; reason: string }> = [];

  for (const candidate of candidates) {
    const eligibility = await service.checkPatternForPromotion(
      candidate.id,
      strictCriteria
    );

    if (eligibility.eligible) {
      try {
        const sharedPattern = await service.promoteToSharedPattern(
          candidate.id
        );

        console.log(`✓ Promoted: ${candidate.id}`);
        console.log(`  → Shared Pattern ID: ${sharedPattern.id}`);
        console.log(`  → Regulator: ${sharedPattern.regulator}`);
        console.log(`  → Success Rate: ${(sharedPattern.successRate * 100).toFixed(1)}%`);

        promoted.push(candidate.id);
      } catch (error) {
        console.error(`✗ Failed to promote ${candidate.id}:`, error);
        skipped.push({
          id: candidate.id,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } else {
      skipped.push({ id: candidate.id, reason: eligibility.reason || 'Not eligible' });
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Promoted: ${promoted.length}`);
  console.log(`Skipped: ${skipped.length}`);

  return { promoted, skipped };
}

/**
 * Example 4: Cost Savings Report
 *
 * Calculate the cost savings from using shared patterns.
 */
export async function generateCostSavingsReport(dateRange: {
  startDate: string;
  endDate: string;
}) {
  const service = getSharedPatternService();

  console.log('=== Shared Pattern Cost Savings Report ===\n');

  const sharedPatterns = await service.getSharedPatterns();

  // Calculate total usage
  const totalUsage = sharedPatterns.reduce(
    (sum, p) => sum + p.crossCustomerUsageCount,
    0
  );

  // Estimate cost per LLM call (average)
  const avgCostPerLLMCall = 0.005; // $0.005

  // Calculate total savings
  const totalSavings = totalUsage * avgCostPerLLMCall;

  // Group by regulator
  const byRegulator: Record<
    string,
    { patterns: number; usage: number; savings: number }
  > = {};

  for (const pattern of sharedPatterns) {
    if (!byRegulator[pattern.regulator]) {
      byRegulator[pattern.regulator] = { patterns: 0, usage: 0, savings: 0 };
    }
    byRegulator[pattern.regulator].patterns++;
    byRegulator[pattern.regulator].usage += pattern.crossCustomerUsageCount;
    byRegulator[pattern.regulator].savings +=
      pattern.crossCustomerUsageCount * avgCostPerLLMCall;
  }

  // Group by document type
  const byDocType: Record<
    string,
    { patterns: number; usage: number; savings: number }
  > = {};

  for (const pattern of sharedPatterns) {
    if (!byDocType[pattern.documentType]) {
      byDocType[pattern.documentType] = { patterns: 0, usage: 0, savings: 0 };
    }
    byDocType[pattern.documentType].patterns++;
    byDocType[pattern.documentType].usage += pattern.crossCustomerUsageCount;
    byDocType[pattern.documentType].savings +=
      pattern.crossCustomerUsageCount * avgCostPerLLMCall;
  }

  // Calculate average success rate
  const avgSuccessRate =
    sharedPatterns.reduce((sum, p) => sum + p.successRate, 0) /
    sharedPatterns.length;

  console.log('Overall Metrics:');
  console.log(`  Total Shared Patterns: ${sharedPatterns.length}`);
  console.log(`  Total Usage Count: ${totalUsage.toLocaleString()}`);
  console.log(`  Average Success Rate: ${(avgSuccessRate * 100).toFixed(1)}%`);
  console.log(`  Estimated Cost Savings: $${totalSavings.toFixed(2)}`);
  console.log('');

  console.log('By Regulator:');
  for (const [regulator, stats] of Object.entries(byRegulator)) {
    console.log(`  ${regulator}:`);
    console.log(`    Patterns: ${stats.patterns}`);
    console.log(`    Usage: ${stats.usage.toLocaleString()}`);
    console.log(`    Savings: $${stats.savings.toFixed(2)}`);
  }
  console.log('');

  console.log('By Document Type:');
  for (const [docType, stats] of Object.entries(byDocType)) {
    console.log(`  ${docType}:`);
    console.log(`    Patterns: ${stats.patterns}`);
    console.log(`    Usage: ${stats.usage.toLocaleString()}`);
    console.log(`    Savings: $${stats.savings.toFixed(2)}`);
  }

  return {
    totalPatterns: sharedPatterns.length,
    totalUsage,
    avgSuccessRate,
    totalSavings,
    byRegulator,
    byDocType,
  };
}

/**
 * Example 5: Pattern Quality Monitoring
 *
 * Monitor shared pattern performance and identify patterns
 * that may need review or deprecation.
 */
export async function monitorPatternQuality() {
  const service = getSharedPatternService();

  console.log('=== Pattern Quality Monitoring ===\n');

  const patterns = await service.getSharedPatterns();

  // Identify high-performing patterns
  const highPerformers = patterns.filter((p) => p.successRate >= 0.95);

  // Identify declining patterns
  const decliningPatterns = patterns.filter((p) => p.successRate < 0.85);

  // Identify underutilized patterns
  const underutilized = patterns.filter((p) => p.crossCustomerUsageCount < 5);

  console.log('High Performers (≥95% success rate):');
  for (const pattern of highPerformers) {
    console.log(`  ${pattern.id}`);
    console.log(`    Success Rate: ${(pattern.successRate * 100).toFixed(1)}%`);
    console.log(`    Usage Count: ${pattern.crossCustomerUsageCount}`);
  }
  console.log('');

  console.log('Declining Patterns (<85% success rate):');
  for (const pattern of decliningPatterns) {
    console.log(`  ${pattern.id}`);
    console.log(`    Success Rate: ${(pattern.successRate * 100).toFixed(1)}%`);
    console.log(`    Usage Count: ${pattern.crossCustomerUsageCount}`);
    console.log('    ⚠️ Consider reviewing or deprecating');
  }
  console.log('');

  console.log('Underutilized Patterns (<5 uses):');
  for (const pattern of underutilized) {
    console.log(`  ${pattern.id}`);
    console.log(`    Usage Count: ${pattern.crossCustomerUsageCount}`);
    console.log(`    ⚠️ May need better applicability filters`);
  }

  return {
    totalPatterns: patterns.length,
    highPerformers: highPerformers.length,
    decliningPatterns: decliningPatterns.length,
    underutilized: underutilized.length,
  };
}

// Mock LLM extraction function for demonstration
async function performLLMExtraction(
  documentText: string,
  metadata: any
): Promise<any> {
  // This would call the actual LLM service
  return {
    source: 'llm',
    pattern_id: null,
    confidence: 0.85,
    cost_usd: 0.0123,
    obligations: [],
  };
}

// Example usage
if (require.main === module) {
  (async () => {
    console.log('Running Shared Pattern Service Examples...\n');

    // Example 1: Extract with cost optimization
    console.log('Example 1: Extraction with Cost Optimization');
    console.log('='.repeat(50));
    const result = await extractWithSharedPatterns(
      'The facility must monitor effluent discharge on a daily basis.',
      {
        regulator: 'EA',
        documentType: 'PERMIT',
        moduleTypes: ['MODULE_1'],
        companyId: 'company-123',
      }
    );
    console.log('Result:', result);
    console.log('\n');

    // Example 2: Review promotion candidates
    console.log('Example 2: Review Promotion Candidates');
    console.log('='.repeat(50));
    await reviewPromotionCandidates();
    console.log('\n');

    // Example 3: Cost savings report
    console.log('Example 3: Cost Savings Report');
    console.log('='.repeat(50));
    await generateCostSavingsReport({
      startDate: '2025-01-01',
      endDate: '2025-01-31',
    });
    console.log('\n');

    // Example 4: Quality monitoring
    console.log('Example 4: Pattern Quality Monitoring');
    console.log('='.repeat(50));
    await monitorPatternQuality();
  })();
}
