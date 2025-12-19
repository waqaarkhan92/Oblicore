# AI Components

This directory contains AI-related components for the EcoComply application.

## ExtractionExplanation Component

The `ExtractionExplanation` component provides transparency into how obligations were extracted from documents.

### Usage

```tsx
import { ExtractionExplanation } from '@/components/ai';

function ObligationDetails() {
  const explanation = {
    source: 'HYBRID',
    ruleLibraryMatch: {
      patternId: 'ENV-001',
      version: 2,
      matchScore: 0.95,
    },
    llmExtraction: {
      model: 'gpt-4-turbo',
      pass: 2,
      tokensUsed: 1250,
    },
    groundingValidation: {
      textFound: true,
      pageNumber: 5,
      hallucinationRisk: 'LOW',
    },
    confidence: 0.92,
    extractedAt: new Date().toISOString(),
  };

  return (
    <ExtractionExplanation
      explanation={explanation}
      isLoading={false}
    />
  );
}
```

### Props

- `explanation`: The extraction explanation data (see interface below)
- `isLoading`: Optional loading state
- `className`: Optional CSS classes for styling

### Extraction Sources

- **RULE_LIBRARY**: Matched using curated rule patterns
- **LLM_EXTRACTION**: Extracted using AI language model
- **HYBRID**: Combined rule matching and AI extraction

### Features

- Expandable/collapsible UI
- Visual confidence indicators
- Source-specific badges and icons
- Grounding validation details
- Hallucination risk assessment
- Loading skeleton state
