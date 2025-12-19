/**
 * Document Grounding Service
 * Validates AI extractions against source documents to detect hallucinations
 * and provide reviewers with verification tools
 */

import { supabaseAdmin } from '@/lib/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

export interface TextMatch {
  startIndex: number;
  endIndex: number;
  matchScore: number; // 0-100, 100 = exact match
  matchedText: string;
}

export interface HighlightRange {
  start: number;
  end: number;
  type: 'exact' | 'fuzzy';
  score: number;
}

export interface ValidationResult {
  isGrounded: boolean;
  matchScore: number;
  matchedPage?: number;
  matchedSegment?: string;
  highlightRanges: HighlightRange[];
  hallucinationRisk: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface DocumentSegment {
  text: string;
  pageCount: number;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class DocumentGroundingService {
  /**
   * Fetch stored document text from documents table
   * @param documentId - UUID of the document
   * @param pageNumber - Optional page number to fetch specific page
   * @returns Document text and page count
   */
  async getDocumentSegment(
    documentId: string,
    pageNumber?: number
  ): Promise<DocumentSegment> {
    // Fetch the document from the database
    const { data: document, error } = await supabaseAdmin
      .from('documents')
      .select('extracted_text, metadata')
      .eq('id', documentId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch document: ${error.message}`);
    }

    if (!document || !document.extracted_text) {
      throw new Error('Document text not available');
    }

    const fullText = document.extracted_text;

    // If no page number specified, return full text
    if (pageNumber === undefined) {
      // Try to determine page count from metadata or estimate
      const pageCount = this.estimatePageCount(fullText, document.metadata);
      return {
        text: fullText,
        pageCount,
      };
    }

    // Extract specific page text
    // Attempt to split by page markers (common OCR patterns)
    const pageText = this.extractPageText(fullText, pageNumber, document.metadata);

    return {
      text: pageText,
      pageCount: this.estimatePageCount(fullText, document.metadata),
    };
  }

  /**
   * Find where the extracted text appears in the document
   * Uses fuzzy matching to handle OCR errors
   * @param extractedText - Text extracted by AI
   * @param documentText - Full document text
   * @returns Array of text matches with scores
   */
  findMatchingText(extractedText: string, documentText: string): TextMatch[] {
    const matches: TextMatch[] = [];

    // Normalize both texts for comparison
    const normalizedExtracted = this.normalizeText(extractedText);
    const normalizedDocument = this.normalizeText(documentText);

    // First, try exact match
    const exactIndex = normalizedDocument.indexOf(normalizedExtracted);
    if (exactIndex !== -1) {
      matches.push({
        startIndex: exactIndex,
        endIndex: exactIndex + normalizedExtracted.length,
        matchScore: 100,
        matchedText: documentText.substring(
          exactIndex,
          exactIndex + normalizedExtracted.length
        ),
      });
      return matches;
    }

    // If no exact match, try sliding window fuzzy matching
    const extractedWords = normalizedExtracted.split(/\s+/);
    const minWordsToMatch = Math.max(3, Math.floor(extractedWords.length * 0.5));

    // Create overlapping windows
    const windowSize = Math.min(extractedWords.length, 50); // Limit window size
    const documentWords = normalizedDocument.split(/\s+/);

    for (let i = 0; i <= documentWords.length - minWordsToMatch; i++) {
      const windowEnd = Math.min(i + windowSize, documentWords.length);
      const windowText = documentWords.slice(i, windowEnd).join(' ');

      // Calculate similarity
      const score = this.calculateFuzzyMatchScore(normalizedExtracted, windowText);

      // If similarity is high enough, consider it a match
      if (score >= 50) {
        // Find the actual position in the original text
        const approximateStart = this.findApproximatePosition(
          documentText,
          normalizedDocument,
          documentWords.slice(0, i).join(' ').length
        );

        const approximateEnd = this.findApproximatePosition(
          documentText,
          normalizedDocument,
          documentWords.slice(0, windowEnd).join(' ').length
        );

        matches.push({
          startIndex: approximateStart,
          endIndex: approximateEnd,
          matchScore: score,
          matchedText: documentText.substring(approximateStart, approximateEnd),
        });
      }
    }

    // Sort by score (best matches first)
    matches.sort((a, b) => b.matchScore - a.matchScore);

    // Return top 5 matches
    return matches.slice(0, 5);
  }

  /**
   * Calculate fuzzy match score using Levenshtein distance
   * Normalized to 0-100 scale
   * @param text1 - First text to compare
   * @param text2 - Second text to compare
   * @returns Similarity score 0-100
   */
  calculateFuzzyMatchScore(text1: string, text2: string): number {
    // Normalize texts
    const normalized1 = this.normalizeText(text1);
    const normalized2 = this.normalizeText(text2);

    // Calculate Levenshtein distance
    const distance = this.levenshteinDistance(normalized1, normalized2);

    // Normalize to 0-100 scale
    const maxLength = Math.max(normalized1.length, normalized2.length);
    if (maxLength === 0) return 100;

    const similarity = ((maxLength - distance) / maxLength) * 100;
    return Math.max(0, Math.min(100, similarity));
  }

  /**
   * Return ranges that should be highlighted in the UI
   * @param documentText - Full document text
   * @param matches - Array of text matches
   * @returns Array of highlight ranges
   */
  highlightMatches(documentText: string, matches: TextMatch[]): HighlightRange[] {
    return matches.map((match) => ({
      start: match.startIndex,
      end: match.endIndex,
      type: match.matchScore === 100 ? 'exact' : 'fuzzy',
      score: match.matchScore,
    }));
  }

  /**
   * Validate an obligation's extraction against source document
   * @param obligationId - UUID of the obligation
   * @returns Validation result with grounding information
   */
  async validateExtraction(obligationId: string): Promise<ValidationResult> {
    // Fetch the obligation
    const { data: obligation, error: obligationError } = await supabaseAdmin
      .from('obligations')
      .select('id, original_text, page_reference, document_id')
      .eq('id', obligationId)
      .single();

    if (obligationError || !obligation) {
      throw new Error(
        `Failed to fetch obligation: ${obligationError?.message || 'Not found'}`
      );
    }

    if (!obligation.original_text) {
      throw new Error('Obligation has no original text to validate');
    }

    // Fetch the document
    let documentSegment: DocumentSegment;
    try {
      // If page reference exists, try to get just that page
      if (obligation.page_reference) {
        documentSegment = await this.getDocumentSegment(
          obligation.document_id,
          obligation.page_reference
        );
      } else {
        // Otherwise get full document
        documentSegment = await this.getDocumentSegment(obligation.document_id);
      }
    } catch (error) {
      throw new Error(
        `Failed to fetch document text: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Find matches
    const matches = this.findMatchingText(
      obligation.original_text,
      documentSegment.text
    );

    // Determine best match
    const bestMatch = matches.length > 0 ? matches[0] : null;
    const matchScore = bestMatch ? bestMatch.matchScore : 0;

    // Generate highlight ranges
    const highlightRanges = this.highlightMatches(documentSegment.text, matches);

    // Determine hallucination risk
    let hallucinationRisk: 'LOW' | 'MEDIUM' | 'HIGH';
    if (matchScore >= 80) {
      hallucinationRisk = 'LOW';
    } else if (matchScore >= 50) {
      hallucinationRisk = 'MEDIUM';
    } else {
      hallucinationRisk = 'HIGH';
    }

    // Extract matched segment (best match or first 200 chars)
    let matchedSegment: string | undefined;
    if (bestMatch) {
      matchedSegment = bestMatch.matchedText;
    }

    return {
      isGrounded: matchScore >= 50,
      matchScore,
      matchedPage: obligation.page_reference || undefined,
      matchedSegment,
      highlightRanges,
      hallucinationRisk,
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Normalize text for comparison (lowercase, trim, normalize whitespace)
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .trim();
  }

  /**
   * Calculate Levenshtein distance between two strings
   * Classic dynamic programming algorithm
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;

    // Create 2D array for dynamic programming
    const dp: number[][] = Array(len1 + 1)
      .fill(null)
      .map(() => Array(len2 + 1).fill(0));

    // Initialize base cases
    for (let i = 0; i <= len1; i++) {
      dp[i][0] = i;
    }
    for (let j = 0; j <= len2; j++) {
      dp[0][j] = j;
    }

    // Fill the matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1, // deletion
            dp[i][j - 1] + 1, // insertion
            dp[i - 1][j - 1] + 1 // substitution
          );
        }
      }
    }

    return dp[len1][len2];
  }

  /**
   * Estimate page count from document text and metadata
   */
  private estimatePageCount(text: string, metadata: any): number {
    // Check if metadata contains page count
    if (metadata && typeof metadata === 'object') {
      if (metadata.pageCount) return metadata.pageCount;
      if (metadata.page_count) return metadata.page_count;
      if (metadata.pages) return metadata.pages;
    }

    // Look for page markers in text
    const pageMarkers = text.match(/\[PAGE\s+\d+\]/gi) || [];
    if (pageMarkers.length > 0) {
      return pageMarkers.length;
    }

    // Estimate based on character count (rough approximation)
    // Assuming ~3000 characters per page average
    const estimatedPages = Math.max(1, Math.ceil(text.length / 3000));
    return estimatedPages;
  }

  /**
   * Extract text for a specific page number
   */
  private extractPageText(
    fullText: string,
    pageNumber: number,
    metadata: any
  ): string {
    // Try to find page markers in the text
    const pageMarkerRegex = new RegExp(
      `\\[PAGE\\s+${pageNumber}\\]([\\s\\S]*?)(?:\\[PAGE\\s+\\d+\\]|$)`,
      'i'
    );
    const match = fullText.match(pageMarkerRegex);

    if (match && match[1]) {
      return match[1].trim();
    }

    // If no markers, try to estimate page boundaries
    // This is a rough approximation
    const estimatedPageCount = this.estimatePageCount(fullText, metadata);
    const charsPerPage = Math.ceil(fullText.length / estimatedPageCount);
    const startIndex = (pageNumber - 1) * charsPerPage;
    const endIndex = Math.min(pageNumber * charsPerPage, fullText.length);

    if (startIndex >= fullText.length) {
      return '';
    }

    return fullText.substring(startIndex, endIndex);
  }

  /**
   * Find approximate position in original text given position in normalized text
   */
  private findApproximatePosition(
    originalText: string,
    normalizedText: string,
    normalizedPosition: number
  ): number {
    // Simple approach: use ratio of position to length
    const ratio = normalizedPosition / normalizedText.length;
    return Math.floor(originalText.length * ratio);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const documentGroundingService = new DocumentGroundingService();
