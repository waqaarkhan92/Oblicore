/**
 * Document Grounding Service - Usage Examples
 *
 * This file demonstrates how to use the document grounding service
 * to validate AI extractions against source documents.
 */

import { documentGroundingService } from './document-grounding-service';

// ============================================================================
// EXAMPLE 1: Validate a single obligation
// ============================================================================

async function validateSingleObligation(obligationId: string) {
  try {
    const result = await documentGroundingService.validateExtraction(obligationId);

    console.log('Validation Result:', {
      isGrounded: result.isGrounded,
      matchScore: result.matchScore,
      hallucinationRisk: result.hallucinationRisk,
      matchedPage: result.matchedPage,
      highlightCount: result.highlightRanges.length,
    });

    // Check for high risk
    if (result.hallucinationRisk === 'HIGH') {
      console.warn('⚠️ High hallucination risk detected!');
      console.log('Match score:', result.matchScore);
      console.log('Matched segment:', result.matchedSegment?.substring(0, 100));
    }

    return result;
  } catch (error) {
    console.error('Validation failed:', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 2: Get document text for manual review
// ============================================================================

async function getDocumentForReview(documentId: string, pageNumber?: number) {
  try {
    const segment = await documentGroundingService.getDocumentSegment(
      documentId,
      pageNumber
    );

    console.log('Document info:', {
      pageCount: segment.pageCount,
      textLength: segment.text.length,
      preview: segment.text.substring(0, 200) + '...',
    });

    return segment;
  } catch (error) {
    console.error('Failed to fetch document:', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 3: Find matching text manually
// ============================================================================

async function findObligationInDocument(
  extractedText: string,
  documentId: string
) {
  try {
    // Get full document text
    const segment = await documentGroundingService.getDocumentSegment(documentId);

    // Find matches
    const matches = documentGroundingService.findMatchingText(
      extractedText,
      segment.text
    );

    console.log(`Found ${matches.length} matches:`);
    matches.forEach((match, index) => {
      console.log(`Match ${index + 1}:`, {
        score: match.matchScore,
        position: `${match.startIndex}-${match.endIndex}`,
        preview: match.matchedText.substring(0, 100) + '...',
      });
    });

    return matches;
  } catch (error) {
    console.error('Failed to find matches:', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 4: Calculate similarity between two texts
// ============================================================================

function compareTwoTexts(text1: string, text2: string) {
  const score = documentGroundingService.calculateFuzzyMatchScore(text1, text2);

  console.log('Similarity Analysis:', {
    text1Preview: text1.substring(0, 50) + '...',
    text2Preview: text2.substring(0, 50) + '...',
    similarityScore: score,
    isHighSimilarity: score >= 80,
    isModerateSimilarity: score >= 50 && score < 80,
    isLowSimilarity: score < 50,
  });

  return score;
}

// ============================================================================
// EXAMPLE 5: Batch validate multiple obligations
// ============================================================================

async function batchValidateObligations(obligationIds: string[]) {
  const results = [];

  for (const id of obligationIds) {
    try {
      const result = await documentGroundingService.validateExtraction(id);
      results.push({
        obligationId: id,
        ...result,
      });
    } catch (error) {
      console.error(`Failed to validate ${id}:`, error);
      results.push({
        obligationId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Generate summary
  const summary = {
    total: results.length,
    grounded: results.filter((r) => 'isGrounded' in r && r.isGrounded).length,
    highRisk: results.filter((r) => 'hallucinationRisk' in r && r.hallucinationRisk === 'HIGH').length,
    mediumRisk: results.filter((r) => 'hallucinationRisk' in r && r.hallucinationRisk === 'MEDIUM').length,
    lowRisk: results.filter((r) => 'hallucinationRisk' in r && r.hallucinationRisk === 'LOW').length,
    errors: results.filter((r) => 'error' in r).length,
  };

  console.log('Batch Validation Summary:', summary);
  return { results, summary };
}

// ============================================================================
// EXAMPLE 6: Review queue integration - highlight text for UI
// ============================================================================

async function prepareForReviewUI(obligationId: string) {
  try {
    const validation = await documentGroundingService.validateExtraction(obligationId);

    // Get the document text to show in UI
    const { data: obligation } = await import('@/lib/supabase/server').then(
      async (module) => {
        const { supabaseAdmin } = module;
        return supabaseAdmin
          .from('obligations')
          .select('document_id, page_reference')
          .eq('id', obligationId)
          .single();
      }
    );

    if (!obligation) {
      throw new Error('Obligation not found');
    }

    const segment = await documentGroundingService.getDocumentSegment(
      obligation.document_id,
      obligation.page_reference || undefined
    );

    // Prepare data for UI
    const reviewData = {
      // Original document text with highlight positions
      documentText: segment.text,

      // Highlight ranges for the UI to apply CSS classes
      highlights: validation.highlightRanges.map((range) => ({
        start: range.start,
        end: range.end,
        className: range.type === 'exact' ? 'bg-green-200' : 'bg-yellow-200',
        tooltip: `Match: ${range.score}% (${range.type})`,
      })),

      // Metadata for the review panel
      metadata: {
        isGrounded: validation.isGrounded,
        matchScore: validation.matchScore,
        hallucinationRisk: validation.hallucinationRisk,
        pageNumber: validation.matchedPage,
      },

      // Alert messages for reviewer
      alerts: [
        validation.hallucinationRisk === 'HIGH' && {
          type: 'error',
          message: 'High hallucination risk - extracted text may not match document',
        },
        validation.hallucinationRisk === 'MEDIUM' && {
          type: 'warning',
          message: 'Medium hallucination risk - please verify extraction carefully',
        },
        validation.matchScore === 100 && {
          type: 'success',
          message: 'Exact match found in document',
        },
      ].filter(Boolean),
    };

    return reviewData;
  } catch (error) {
    console.error('Failed to prepare review data:', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 7: Export validation report
// ============================================================================

async function generateValidationReport(obligationIds: string[]) {
  const { results, summary } = await batchValidateObligations(obligationIds);

  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    details: results.map((result) => {
      if ('error' in result) {
        return {
          obligationId: result.obligationId,
          status: 'ERROR',
          error: result.error,
        };
      }

      return {
        obligationId: result.obligationId,
        status: result.isGrounded ? 'GROUNDED' : 'NOT_GROUNDED',
        matchScore: result.matchScore,
        hallucinationRisk: result.hallucinationRisk,
        matchedPage: result.matchedPage,
        matchPreview: result.matchedSegment?.substring(0, 100),
      };
    }),
  };

  console.log('Validation Report:', JSON.stringify(report, null, 2));
  return report;
}

// ============================================================================
// EXAMPLE 8: Real-time validation during extraction
// ============================================================================

async function validateDuringExtraction(
  extractedObligation: {
    text: string;
    documentId: string;
    pageReference?: number;
  }
) {
  try {
    // Get document segment
    const segment = await documentGroundingService.getDocumentSegment(
      extractedObligation.documentId,
      extractedObligation.pageReference
    );

    // Find matches
    const matches = documentGroundingService.findMatchingText(
      extractedObligation.text,
      segment.text
    );

    const bestMatch = matches[0];

    // Determine if extraction should be auto-approved or flagged for review
    if (!bestMatch || bestMatch.matchScore < 50) {
      return {
        action: 'FLAG_FOR_REVIEW',
        reason: 'Low match score - possible hallucination',
        matchScore: bestMatch?.matchScore || 0,
        confidence: 'LOW',
      };
    } else if (bestMatch.matchScore >= 95) {
      return {
        action: 'AUTO_APPROVE',
        reason: 'High match score - extraction verified',
        matchScore: bestMatch.matchScore,
        confidence: 'HIGH',
      };
    } else {
      return {
        action: 'REVIEW_RECOMMENDED',
        reason: 'Moderate match score - review suggested',
        matchScore: bestMatch.matchScore,
        confidence: 'MEDIUM',
      };
    }
  } catch (error) {
    console.error('Validation during extraction failed:', error);
    return {
      action: 'FLAG_FOR_REVIEW',
      reason: 'Validation error occurred',
      matchScore: 0,
      confidence: 'LOW',
    };
  }
}

// ============================================================================
// Export examples for use in other files
// ============================================================================

export const examples = {
  validateSingleObligation,
  getDocumentForReview,
  findObligationInDocument,
  compareTwoTexts,
  batchValidateObligations,
  prepareForReviewUI,
  generateValidationReport,
  validateDuringExtraction,
};
