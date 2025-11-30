/**
 * Quality Assurance Service
 * Provides hallucination prevention and grounding validation
 * Reference: docs/specs/81_AI_Cost_Optimization.md Section 7.6
 */

export interface GroundingCheck {
  isGrounded: boolean;
  sourceText: string | null;
  matchScore: number;
  hallucinationRisk: boolean;
}

export interface HallucinationRiskAssessment {
  risk_level: 'low' | 'medium' | 'high';
  risk_factors: string[];
  recommendation: 'accept' | 'review' | 'reject';
}

export interface QualityMetrics {
  documentId: string;
  totalObligations: number;
  highConfidenceCount: number; // >=85%
  mediumConfidenceCount: number; // 70-84%
  lowConfidenceCount: number; // <70%
  hallucinationRiskCount: number;
  groundingScore: number; // Average grounding match
  libraryMatchRate: number;
}

/**
 * Validate grounding - check if extracted text appears in source document
 */
export function validateGrounding(
  obligationText: string,
  documentText: string,
  threshold: number = 0.85
): GroundingCheck {
  // Check exact match first
  if (documentText.includes(obligationText)) {
    return {
      isGrounded: true,
      sourceText: obligationText,
      matchScore: 1.0,
      hallucinationRisk: false,
    };
  }

  // Fuzzy match for OCR variations
  const fuzzyScore = calculateFuzzyMatch(obligationText, documentText);

  if (fuzzyScore >= threshold) {
    const closestMatch = findClosestMatch(obligationText, documentText);
    return {
      isGrounded: true,
      sourceText: closestMatch,
      matchScore: fuzzyScore,
      hallucinationRisk: false,
    };
  }

  // Potential hallucination
  return {
    isGrounded: false,
    sourceText: null,
    matchScore: fuzzyScore,
    hallucinationRisk: true,
  };
}

/**
 * Assess hallucination risk for an extraction
 */
export function assessHallucinationRisk(
  extraction: {
    text: string;
    category?: string;
    frequency?: string;
    deadline_date?: string;
    confidence_score?: number;
  },
  documentText: string,
  libraryMatch: boolean = false
): HallucinationRiskAssessment {
  const riskFactors: string[] = [];

  // Check 1: Is extracted text in document?
  const grounding = validateGrounding(extraction.text, documentText);
  if (!grounding.isGrounded) {
    riskFactors.push('extracted_text_not_found');
  }

  // Check 2: Does frequency match known patterns?
  if (!libraryMatch && extraction.frequency) {
    riskFactors.push('frequency_not_pattern_matched');
  }

  // Check 3: Is date extraction plausible?
  if (extraction.deadline_date) {
    try {
      const deadlineYear = new Date(extraction.deadline_date).getFullYear();
      const currentYear = new Date().getFullYear();
      if (deadlineYear < currentYear - 5 || deadlineYear > currentYear + 10) {
        riskFactors.push('implausible_deadline_date');
      }
    } catch {
      riskFactors.push('invalid_deadline_date');
    }
  }

  // Check 4: Is confidence score consistent with content?
  if ((extraction.confidence_score || 0) > 0.90 && riskFactors.length > 0) {
    riskFactors.push('high_confidence_with_risk_factors');
  }

  // Check 5: Does category match text patterns?
  const categoryPatterns: Record<string, string[]> = {
    MONITORING: ['monitor', 'sample', 'test', 'measure'],
    REPORTING: ['report', 'notify', 'submit', 'return'],
    RECORD_KEEPING: ['record', 'log', 'document', 'retain'],
    OPERATIONAL: ['operate', 'manage', 'maintain', 'ensure'],
    MAINTENANCE: ['service', 'calibrate', 'inspect', 'repair'],
  };

  if (extraction.category) {
    const textLower = extraction.text.toLowerCase();
    const expectedKeywords = categoryPatterns[extraction.category] || [];
    if (!expectedKeywords.some((kw) => textLower.includes(kw))) {
      riskFactors.push('category_keyword_mismatch');
    }
  }

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high';
  let recommendation: 'accept' | 'review' | 'reject';

  if (riskFactors.length === 0) {
    riskLevel = 'low';
    recommendation = 'accept';
  } else if (riskFactors.length <= 2) {
    riskLevel = 'medium';
    recommendation = 'review';
  } else {
    riskLevel = 'high';
    recommendation = 'reject';
  }

  return {
    risk_level: riskLevel,
    risk_factors: riskFactors,
    recommendation,
  };
}

/**
 * Calculate quality metrics for a document extraction
 */
export function calculateQualityMetrics(
  documentId: string,
  obligations: Array<{
    confidence_score?: number;
    hallucination_risk?: boolean;
    grounding_score?: number;
  }>,
  libraryMatchRate: number = 0
): QualityMetrics {
  const highConfidence = obligations.filter((o) => (o.confidence_score || 0) >= 0.85);
  const mediumConfidence = obligations.filter(
    (o) => (o.confidence_score || 0) >= 0.7 && (o.confidence_score || 0) < 0.85
  );
  const lowConfidence = obligations.filter((o) => (o.confidence_score || 0) < 0.7);
  const hallucinationRisks = obligations.filter((o) => o.hallucination_risk);

  const avgGrounding =
    obligations.reduce((sum, o) => sum + (o.grounding_score || 1), 0) / obligations.length;

  return {
    documentId,
    totalObligations: obligations.length,
    highConfidenceCount: highConfidence.length,
    mediumConfidenceCount: mediumConfidence.length,
    lowConfidenceCount: lowConfidence.length,
    hallucinationRiskCount: hallucinationRisks.length,
    groundingScore: avgGrounding,
    libraryMatchRate,
  };
}

/**
 * Simple fuzzy match calculation (Levenshtein-based similarity)
 */
function calculateFuzzyMatch(text1: string, text2: string): number {
  // Normalize texts
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const norm1 = normalize(text1);
  const norm2 = normalize(text2);

  // If one is substring of the other, high similarity
  if (norm2.includes(norm1) || norm1.includes(norm2)) {
    return 0.9;
  }

  // Calculate word overlap
  const words1 = new Set(norm1.split(/\s+/));
  const words2 = new Set(norm2.split(/\s+/));
  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Find closest match in document text
 */
function findClosestMatch(obligationText: string, documentText: string): string {
  // Split document into sentences
  const sentences = documentText.split(/[.!?]\s+/);
  let bestMatch = '';
  let bestScore = 0;

  for (const sentence of sentences) {
    const score = calculateFuzzyMatch(obligationText, sentence);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = sentence;
    }
  }

  return bestMatch || obligationText.substring(0, 100); // Fallback to first 100 chars
}

/**
 * Pre-extraction quality check
 */
export interface QualityCheckResult {
  passed: boolean;
  checks: Array<{
    name: string;
    passed: boolean;
    details: string;
  }>;
  recommendation: 'proceed' | 'proceed_with_caution' | 'reject';
}

export function preExtractionQualityCheck(
  documentText: string,
  pageCount: number,
  isScanned: boolean,
  ocrConfidence?: number
): QualityCheckResult {
  const checks: Array<{ name: string; passed: boolean; details: string }> = [];

  // Check 1: File integrity (has text)
  const hasText = documentText.length > 100;
  checks.push({
    name: 'file_integrity',
    passed: hasText,
    details: hasText ? `${documentText.length} characters` : 'No text found',
  });

  // Check 2: Page count reasonable
  checks.push({
    name: 'page_count',
    passed: pageCount > 0 && pageCount < 1000,
    details: `${pageCount} pages`,
  });

  // Check 3: OCR quality (if scanned)
  if (isScanned) {
    const ocrPassed = ocrConfidence !== undefined && ocrConfidence >= 0.80;
    checks.push({
      name: 'ocr_quality',
      passed: ocrPassed,
      details: ocrConfidence !== undefined
        ? `${Math.round(ocrConfidence * 100)}% confidence`
        : 'OCR confidence not available',
    });
  }

  const allPassed = checks.every((c) => c.passed);
  const criticalFailures = checks.filter((c) => !c.passed && c.name !== 'ocr_quality');

  let recommendation: 'proceed' | 'proceed_with_caution' | 'reject';
  if (allPassed) {
    recommendation = 'proceed';
  } else if (criticalFailures.length > 0) {
    recommendation = 'reject';
  } else {
    recommendation = 'proceed_with_caution';
  }

  return {
    passed: allPassed || criticalFailures.length === 0,
    checks,
    recommendation,
  };
}

