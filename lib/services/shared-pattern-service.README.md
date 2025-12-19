# Shared Pattern Service

## Overview

The Shared Pattern Service manages cross-customer pattern sharing for AI cost reduction in the EcoComply platform. It enables patterns that are successfully used across multiple customers to be "promoted" to shared global patterns, reducing LLM usage costs.

## Key Concepts

1. **Pattern Lifecycle**:
   - Patterns start as customer-specific entries in the `pattern_candidates` table
   - When a pattern meets threshold criteria, it becomes eligible for promotion
   - Promoted patterns are stored as global shared patterns in `rule_library_patterns`
   - Shared patterns are checked first (0 LLM cost) before falling back to LLM extraction

2. **Anonymization**:
   - Company names, site names, addresses, dates, and other specific information are replaced with placeholders
   - Examples: `[COMPANY]`, `[SITE]`, `[DATE]`, `[ADDRESS]`, `[EMAIL]`, `[PHONE]`
   - This ensures patterns are generic and applicable across customers

3. **Promotion Criteria** (defaults):
   - Minimum cross-customer uses: 10
   - Minimum success rate: 92%
   - Company-specific terms must be excluded

## Usage Examples

### 1. Get All Shared Patterns

```typescript
import { getSharedPatternService } from '@/lib/services/shared-pattern-service';

const service = getSharedPatternService();

// Get all global shared patterns
const allPatterns = await service.getSharedPatterns();

// Filter by regulator
const eaPatterns = await service.getSharedPatterns({
  regulator: 'EA',
});

// Filter by document type
const permitPatterns = await service.getSharedPatterns({
  documentType: 'PERMIT',
});

// Filter by both
const eaPermitPatterns = await service.getSharedPatterns({
  regulator: 'EA',
  documentType: 'PERMIT',
});
```

### 2. Check Pattern Eligibility for Promotion

```typescript
import { getSharedPatternService } from '@/lib/services/shared-pattern-service';

const service = getSharedPatternService();

// Check if pattern meets default criteria
const result = await service.checkPatternForPromotion('candidate-uuid');

if (result.eligible) {
  console.log('Pattern is eligible for promotion!');
} else {
  console.log(`Not eligible: ${result.reason}`);
}

// Check with custom criteria
const customCriteria = {
  minCrossCustomerUses: 15,
  minSuccessRate: 0.95,
  excludeCompanySpecificTerms: true,
};

const customResult = await service.checkPatternForPromotion(
  'candidate-uuid',
  customCriteria
);
```

### 3. Promote Pattern to Shared Global

```typescript
import { getSharedPatternService } from '@/lib/services/shared-pattern-service';

const service = getSharedPatternService();

try {
  const sharedPattern = await service.promoteToSharedPattern('candidate-uuid');

  console.log('Pattern promoted successfully!');
  console.log(`Pattern ID: ${sharedPattern.id}`);
  console.log(`Regulator: ${sharedPattern.regulator}`);
  console.log(`Success Rate: ${(sharedPattern.successRate * 100).toFixed(1)}%`);
} catch (error) {
  console.error('Failed to promote pattern:', error.message);
}
```

### 4. Anonymize Pattern Text

```typescript
import { getSharedPatternService } from '@/lib/services/shared-pattern-service';

const service = getSharedPatternService();

const originalText = 'Thames Water Ltd at Mogden Treatment Works, SW1A 1AA, must monitor effluent daily.';

const anonymizedText = service.anonymizePattern(originalText);
// Result: "[COMPANY] at [SITE], [POSTCODE], must monitor effluent daily."
```

### 5. Match Document Against Shared Patterns

```typescript
import { getSharedPatternService } from '@/lib/services/shared-pattern-service';

const service = getSharedPatternService();

const documentText = 'The facility must conduct effluent monitoring on a daily basis.';

// Try to match against shared patterns
const matchedPattern = await service.matchSharedPattern(documentText, {
  regulator: 'EA',
  documentType: 'PERMIT',
});

if (matchedPattern) {
  console.log('Matched shared pattern! Zero LLM cost.');
  console.log(`Pattern: ${matchedPattern.patternTemplate}`);
  console.log(`Success Rate: ${(matchedPattern.successRate * 100).toFixed(1)}%`);
} else {
  console.log('No match found. Will use LLM extraction.');
}
```

### 6. Get Promotion Candidates

```typescript
import { getSharedPatternService } from '@/lib/services/shared-pattern-service';

const service = getSharedPatternService();

// Get top 20 candidates close to meeting promotion criteria
const candidates = await service.getPromotionCandidates(20);

for (const candidate of candidates) {
  console.log(`Candidate: ${candidate.id}`);
  console.log(`  Sample Count: ${candidate.sample_count}`);
  console.log(`  Match Rate: ${(candidate.match_rate * 100).toFixed(1)}%`);
  console.log(`  Status: ${candidate.status}`);
}

// Get with custom criteria
const customCriteria = {
  minCrossCustomerUses: 15,
  minSuccessRate: 0.95,
  excludeCompanySpecificTerms: true,
};

const customCandidates = await service.getPromotionCandidates(10, customCriteria);
```

## Integration with Extraction Pipeline

### Step 1: Check Shared Patterns First

```typescript
import { getSharedPatternService } from '@/lib/services/shared-pattern-service';
import { getRuleLibraryMatcher } from '@/lib/ai/rule-library-matcher';

const sharedPatternService = getSharedPatternService();
const ruleLibraryMatcher = getRuleLibraryMatcher();

async function extractObligations(documentText: string, metadata: any) {
  // 1. Try shared patterns first (zero LLM cost)
  const sharedMatch = await sharedPatternService.matchSharedPattern(
    documentText,
    {
      regulator: metadata.regulator,
      documentType: metadata.documentType,
    }
  );

  if (sharedMatch) {
    console.log('Using shared pattern - no LLM cost!');
    return {
      source: 'shared_pattern',
      pattern_id: sharedMatch.id,
      llm_cost: 0,
      // Use pattern template for extraction
    };
  }

  // 2. Try customer-specific rule library patterns
  const ruleMatches = await ruleLibraryMatcher.findMatches(
    documentText,
    metadata.moduleTypes,
    metadata.regulator,
    metadata.documentType
  );

  if (ruleMatches.length > 0) {
    console.log('Using rule library pattern - no LLM cost!');
    return {
      source: 'rule_library',
      pattern_id: ruleMatches[0].pattern_id,
      llm_cost: 0,
    };
  }

  // 3. Fall back to LLM extraction
  console.log('Using LLM extraction - incurs cost');
  // Perform LLM extraction...
}
```

### Step 2: Track Pattern Performance

```typescript
// After successful extraction, track pattern usage
if (extractionResult.source === 'shared_pattern') {
  await sharedPatternService.recordPatternMatch(
    extractionResult.pattern_id,
    true // success
  );
}

// If user corrects or rejects extraction
if (userCorrected) {
  await sharedPatternService.recordPatternMatch(
    extractionResult.pattern_id,
    false // not successful
  );
}
```

## Data Flow

```
┌─────────────────────┐
│ Customer-Specific   │
│ Pattern Candidate   │
│ (pattern_candidates)│
└──────────┬──────────┘
           │
           │ Meets criteria:
           │ - Usage count ≥ 10
           │ - Success rate ≥ 92%
           │ - Match rate ≥ 90%
           │
           ▼
    ┌──────────────┐
    │ Anonymize    │
    │ Pattern      │
    └──────┬───────┘
           │
           ▼
┌─────────────────────┐
│ Shared Global       │
│ Pattern             │
│ (rule_library_      │
│  patterns)          │
└──────────┬──────────┘
           │
           │ Used by extraction
           │ pipeline (0 LLM cost)
           │
           ▼
    ┌──────────────┐
    │ Track Usage  │
    │ & Success    │
    └──────────────┘
```

## Database Schema

### pattern_candidates Table

Stores candidate patterns before promotion:

```sql
CREATE TABLE pattern_candidates (
  id UUID PRIMARY KEY,
  suggested_pattern JSONB NOT NULL,
  source_extractions UUID[] NOT NULL,
  sample_count INTEGER NOT NULL,
  match_rate DECIMAL(5, 4) NOT NULL,
  status TEXT NOT NULL, -- PENDING_REVIEW, APPROVED, REJECTED
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  created_pattern_id TEXT REFERENCES rule_library_patterns(pattern_id),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### rule_library_patterns Table

Stores shared global patterns:

```sql
CREATE TABLE rule_library_patterns (
  id UUID PRIMARY KEY,
  pattern_id TEXT UNIQUE NOT NULL,
  pattern_version TEXT NOT NULL,
  priority INTEGER NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  matching JSONB NOT NULL,
  extraction_template JSONB NOT NULL,
  applicability JSONB NOT NULL,
  performance JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deprecated_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## Performance Metrics

Track these metrics to measure the impact of shared patterns:

1. **Pattern Hit Rate**: Percentage of extractions using shared patterns vs LLM
2. **Cost Savings**: Total LLM cost avoided by using shared patterns
3. **Pattern Quality**: Success rate of shared patterns over time
4. **Coverage**: Percentage of document types covered by shared patterns

### Example Dashboard Query

```typescript
import { getSharedPatternService } from '@/lib/services/shared-pattern-service';
import { aiAnalyticsService } from '@/lib/services/ai-analytics-service';

async function getSharedPatternMetrics() {
  const service = getSharedPatternService();

  // Get all shared patterns
  const sharedPatterns = await service.getSharedPatterns();

  // Calculate total usage
  const totalUsage = sharedPatterns.reduce(
    (sum, p) => sum + p.crossCustomerUsageCount,
    0
  );

  // Calculate average success rate
  const avgSuccessRate =
    sharedPatterns.reduce((sum, p) => sum + p.successRate, 0) /
    sharedPatterns.length;

  // Get cost metrics
  const costMetrics = await aiAnalyticsService.getCostMetrics();

  return {
    totalSharedPatterns: sharedPatterns.length,
    totalUsage,
    avgSuccessRate: (avgSuccessRate * 100).toFixed(1) + '%',
    estimatedCostSavings: totalUsage * 0.005, // Assume $0.005 per LLM call
  };
}
```

## Best Practices

### 1. Promotion Workflow

- **Review candidates weekly**: Check `getPromotionCandidates()` regularly
- **Validate anonymization**: Ensure no company-specific data leaks
- **Test before promotion**: Validate pattern works across contexts
- **Monitor performance**: Track promoted pattern success rates

### 2. Anonymization

- **Review anonymized patterns**: Check output of `anonymizePattern()`
- **Custom placeholders**: Consider domain-specific placeholders
- **Preserve meaning**: Ensure anonymization doesn't break pattern logic

### 3. Pattern Matching

- **Try shared patterns first**: Always check before LLM
- **Use appropriate filters**: Apply regulator/document type filters
- **Track failures**: Record when patterns fail to match

### 4. Performance Optimization

- **Cache shared patterns**: Load patterns once, reuse across extractions
- **Batch processing**: Process multiple documents with same pattern set
- **Monitor hit rates**: Track pattern usage to identify gaps

## Error Handling

All methods include comprehensive error handling:

```typescript
try {
  const patterns = await service.getSharedPatterns();
} catch (error) {
  console.error('Failed to fetch shared patterns:', error);
  // Fall back to LLM extraction
}

try {
  const promoted = await service.promoteToSharedPattern('id');
} catch (error) {
  console.error('Promotion failed:', error);
  // Pattern may not be eligible or database error
}
```

## Testing

Comprehensive unit tests are available in:
```
tests/unit/lib/services/shared-pattern-service.test.ts
```

Run tests:
```bash
npm test shared-pattern-service
```

## Future Enhancements

1. **Machine Learning**: Use ML to predict pattern promotion eligibility
2. **Pattern Versioning**: Track pattern evolution over time
3. **Cross-Regulator Patterns**: Identify patterns that work across regulators
4. **Automatic Anonymization**: Use NLP to detect and anonymize sensitive data
5. **Pattern Clustering**: Group similar patterns for better organization

## References

- AI Extraction Rules Library: `docs/specs/80_AI_Extraction_Rules_Library.md`
- Pattern Discovery Service: `lib/ai/pattern-discovery.ts`
- Rule Library Matcher: `lib/ai/rule-library-matcher.ts`
- AI Analytics Service: `lib/services/ai-analytics-service.ts`
