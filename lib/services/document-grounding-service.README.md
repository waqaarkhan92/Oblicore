# Document Grounding Service

## Overview

The Document Grounding Service validates AI-extracted obligations against source documents to detect hallucinations and provide reviewers with verification tools. This ensures that extracted obligations are actually present in the source documents and haven't been fabricated by the AI.

## Purpose

- **Validation**: Verify that AI extractions match the original document text
- **Hallucination Detection**: Identify when AI may have generated text not present in the source
- **Review Support**: Provide reviewers with highlighted matches for quick verification
- **Confidence Scoring**: Quantify how well extractions match source documents

## Key Features

### 1. Document Text Retrieval
- Fetch full document or specific page text
- Support for page-based extraction
- Automatic page count estimation

### 2. Fuzzy Text Matching
- Find exact and approximate matches
- Handle OCR errors and typos
- Levenshtein distance-based similarity scoring

### 3. Validation & Scoring
- 0-100 match score (100 = exact match)
- Hallucination risk classification (LOW/MEDIUM/HIGH)
- Highlight ranges for UI rendering

### 4. Review Queue Integration
- Side-by-side document comparison
- Visual highlighting of matches
- Confidence indicators for reviewers

## API Reference

### Main Methods

#### `getDocumentSegment(documentId: string, pageNumber?: number)`
Fetch stored document text from the database.

**Returns:** `DocumentSegment`
```typescript
{
  text: string;      // Document text
  pageCount: number; // Total pages
}
```

#### `findMatchingText(extractedText: string, documentText: string)`
Find where extracted text appears in the document using fuzzy matching.

**Returns:** `TextMatch[]`
```typescript
{
  startIndex: number;    // Start position in document
  endIndex: number;      // End position in document
  matchScore: number;    // 0-100 similarity score
  matchedText: string;   // Actual text from document
}
```

#### `calculateFuzzyMatchScore(text1: string, text2: string)`
Calculate similarity score between two texts.

**Returns:** `number` (0-100 scale)

#### `highlightMatches(documentText: string, matches: TextMatch[])`
Generate highlight ranges for UI rendering.

**Returns:** `HighlightRange[]`
```typescript
{
  start: number;           // Highlight start position
  end: number;             // Highlight end position
  type: 'exact' | 'fuzzy'; // Match type
  score: number;           // Match score
}
```

#### `validateExtraction(obligationId: string)`
Comprehensive validation of an obligation against its source document.

**Returns:** `ValidationResult`
```typescript
{
  isGrounded: boolean;                        // True if match score >= 50
  matchScore: number;                         // 0-100 similarity score
  matchedPage?: number;                       // Page where match was found
  matchedSegment?: string;                    // Matched text segment
  highlightRanges: HighlightRange[];          // Ranges to highlight
  hallucinationRisk: 'LOW' | 'MEDIUM' | 'HIGH'; // Risk classification
}
```

## Hallucination Risk Classification

| Match Score | Risk Level | Meaning |
|------------|-----------|---------|
| 80-100 | LOW | High confidence - extraction matches document well |
| 50-79 | MEDIUM | Moderate confidence - review recommended |
| 0-49 | HIGH | Low confidence - likely hallucination |

## Usage Examples

### Basic Validation
```typescript
import { documentGroundingService } from '@/lib/services/document-grounding-service';

const result = await documentGroundingService.validateExtraction('obligation-id');

if (result.hallucinationRisk === 'HIGH') {
  console.warn('Extraction may be hallucinated!');
  console.log('Match score:', result.matchScore);
}
```

### Review UI Integration
```typescript
// Get validation data for review panel
const validation = await documentGroundingService.validateExtraction('obligation-id');

// Apply highlights in the UI
validation.highlightRanges.forEach(range => {
  const className = range.type === 'exact' ? 'bg-green-200' : 'bg-yellow-200';
  // Apply highlight to document text from range.start to range.end
});
```

### Batch Validation
```typescript
const obligationIds = ['id1', 'id2', 'id3'];
const results = await Promise.all(
  obligationIds.map(id => documentGroundingService.validateExtraction(id))
);

const highRiskCount = results.filter(r => r.hallucinationRisk === 'HIGH').length;
console.log(`${highRiskCount} obligations flagged as high risk`);
```

### Manual Text Comparison
```typescript
const score = documentGroundingService.calculateFuzzyMatchScore(
  'monitor emissions to air',
  'monitor emisions to air' // typo
);
// Returns ~95 (high similarity despite typo)
```

## Algorithm Details

### Fuzzy Matching

The service uses Levenshtein distance to calculate text similarity:

1. **Normalization**: Convert to lowercase, remove punctuation, normalize whitespace
2. **Distance Calculation**: Compute edit distance between texts
3. **Scoring**: `score = ((maxLength - distance) / maxLength) * 100`

### Sliding Window Search

For finding matches in long documents:

1. Split document into overlapping windows
2. Compare each window with extracted text
3. Calculate similarity scores
4. Return top 5 matches sorted by score

## Database Schema

### Required Tables

**documents**
- `id` (UUID)
- `extracted_text` (TEXT) - OCR'd or parsed document text
- `metadata` (JSONB) - Optional page count and markers

**obligations**
- `id` (UUID)
- `document_id` (UUID) - Reference to source document
- `original_text` (TEXT) - Extracted obligation text
- `page_reference` (INTEGER) - Optional page number

## Performance Considerations

- **Long Documents**: Sliding window limited to 50 words to prevent performance issues
- **Match Limit**: Returns maximum 5 matches per query
- **Page Extraction**: Fetching specific pages is more efficient than full document

## Error Handling

The service throws errors for:
- Document not found
- Document has no extracted text
- Obligation not found
- Obligation has no original text
- Database query failures

All errors include descriptive messages for debugging.

## Testing

Comprehensive test suite available at:
`tests/unit/lib/services/document-grounding-service.test.ts`

Coverage includes:
- All public methods
- Edge cases (empty strings, long texts, special characters)
- Error scenarios
- Fuzzy matching accuracy

## Future Enhancements

Potential improvements:
- Support for semantic similarity (embeddings)
- Multi-language support
- PDF annotation export
- Integration with confidence scoring service
- Caching for frequently accessed documents

## See Also

- Usage examples: `lib/services/document-grounding-service.example.ts`
- Related services:
  - `risk-score-service.ts` - Risk assessment
  - `extraction-progress-service.ts` - Extraction tracking
  - `diff-service.ts` - Text comparison

## License

Internal use only - EcoComply platform
