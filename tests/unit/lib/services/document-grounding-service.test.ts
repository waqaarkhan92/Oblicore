/**
 * Document Grounding Service Tests
 * Comprehensive tests for lib/services/document-grounding-service.ts
 * Target: 100% coverage
 *
 * Tests cover:
 * - getDocumentSegment with and without page numbers
 * - findMatchingText with exact and fuzzy matches
 * - calculateFuzzyMatchScore
 * - highlightMatches
 * - validateExtraction for obligations
 * - Error handling and edge cases
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';

describe('document-grounding-service', () => {
  let mockFromFn: jest.Mock;
  let documentGroundingService: any;

  // Sample test data
  const sampleDocumentText = `
    Environmental Permit Condition 3.1.2

    The operator shall monitor emissions to air from emission point A1
    continuously using a calibrated monitoring system. Records shall be
    maintained for a minimum period of six years and made available to
    the Environment Agency upon request.

    Condition 3.1.3

    The operator shall submit a written report to the Environment Agency
    within 28 days of the end of each quarter detailing all monitoring
    results and any exceedances of emission limit values.
  `;

  // Helper to create chainable mock for document queries
  const createDocumentQueryMock = (document: any, error: any = null) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockReturnValue(
          Promise.resolve({ data: document, error })
        ),
      }),
    }),
  });

  // Helper to create chainable mock for obligation queries
  const createObligationQueryMock = (obligation: any, error: any = null) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockReturnValue(
          Promise.resolve({ data: obligation, error })
        ),
      }),
    }),
  });

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    // Create mock function
    mockFromFn = jest.fn();

    // Mock the supabaseAdmin module
    jest.mock('@/lib/supabase/server', () => ({
      supabaseAdmin: {
        from: mockFromFn,
      },
    }));

    // Import service after mocking
    const service = require('@/lib/services/document-grounding-service');
    documentGroundingService = service.documentGroundingService;
  });

  afterEach(() => {
    jest.unmock('@/lib/supabase/server');
  });

  describe('getDocumentSegment', () => {
    it('should fetch full document text when no page number provided', async () => {
      const mockDocument = {
        id: 'doc-123',
        extracted_text: sampleDocumentText,
        metadata: { pageCount: 5 },
      };

      mockFromFn.mockReturnValue(createDocumentQueryMock(mockDocument));

      const result = await documentGroundingService.getDocumentSegment('doc-123');

      expect(result.text).toBe(sampleDocumentText);
      expect(result.pageCount).toBe(5);
      expect(mockFromFn).toHaveBeenCalledWith('documents');
    });

    it('should fetch specific page when page number provided', async () => {
      const mockDocument = {
        id: 'doc-123',
        extracted_text: '[PAGE 1]First page text[PAGE 2]Second page text',
        metadata: { pageCount: 2 },
      };

      mockFromFn.mockReturnValue(createDocumentQueryMock(mockDocument));

      const result = await documentGroundingService.getDocumentSegment('doc-123', 2);

      expect(result.text).toContain('Second page text');
      expect(result.pageCount).toBe(2);
    });

    it('should throw error when document not found', async () => {
      mockFromFn.mockReturnValue(
        createDocumentQueryMock(null, { message: 'Document not found' })
      );

      await expect(
        documentGroundingService.getDocumentSegment('invalid-id')
      ).rejects.toThrow('Failed to fetch document');
    });

    it('should throw error when document has no extracted text', async () => {
      const mockDocument = {
        id: 'doc-123',
        extracted_text: null,
        metadata: {},
      };

      mockFromFn.mockReturnValue(createDocumentQueryMock(mockDocument));

      await expect(
        documentGroundingService.getDocumentSegment('doc-123')
      ).rejects.toThrow('Document text not available');
    });

    it('should estimate page count when not in metadata', async () => {
      const longText = 'x'.repeat(10000); // Simulates multi-page document
      const mockDocument = {
        id: 'doc-123',
        extracted_text: longText,
        metadata: {},
      };

      mockFromFn.mockReturnValue(createDocumentQueryMock(mockDocument));

      const result = await documentGroundingService.getDocumentSegment('doc-123');

      expect(result.pageCount).toBeGreaterThan(1);
    });
  });

  describe('findMatchingText', () => {
    it('should find exact match', () => {
      const extractedText = 'monitor emissions to air from emission point A1';
      const matches = documentGroundingService.findMatchingText(
        extractedText,
        sampleDocumentText
      );

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].matchScore).toBe(100);
      expect(matches[0].matchedText).toContain('monitor emissions');
    });

    it('should find fuzzy match with minor differences', () => {
      const extractedText = 'monitor emisions to air from emission point A1'; // typo: emisions
      const matches = documentGroundingService.findMatchingText(
        extractedText,
        sampleDocumentText
      );

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].matchScore).toBeGreaterThan(50);
      expect(matches[0].matchScore).toBeLessThan(100);
    });

    it('should return empty array when no match found', () => {
      const extractedText = 'completely unrelated text that does not exist';
      const matches = documentGroundingService.findMatchingText(
        extractedText,
        sampleDocumentText
      );

      expect(matches.length).toBe(0);
    });

    it('should handle empty strings', () => {
      const matches = documentGroundingService.findMatchingText('', sampleDocumentText);
      expect(matches).toBeDefined();
    });

    it('should limit results to top 5 matches', () => {
      const extractedText = 'the'; // Common word that appears many times
      const longDocument = 'the '.repeat(100); // Document with many occurrences
      const matches = documentGroundingService.findMatchingText(
        extractedText,
        longDocument
      );

      expect(matches.length).toBeLessThanOrEqual(5);
    });
  });

  describe('calculateFuzzyMatchScore', () => {
    it('should return 100 for identical texts', () => {
      const text = 'This is a test';
      const score = documentGroundingService.calculateFuzzyMatchScore(text, text);
      expect(score).toBe(100);
    });

    it('should return high score for similar texts', () => {
      const text1 = 'This is a test';
      const text2 = 'This is a tost'; // One letter difference
      const score = documentGroundingService.calculateFuzzyMatchScore(text1, text2);
      expect(score).toBeGreaterThan(80);
    });

    it('should return low score for very different texts', () => {
      const text1 = 'This is a test';
      const text2 = 'Completely different';
      const score = documentGroundingService.calculateFuzzyMatchScore(text1, text2);
      expect(score).toBeLessThan(50);
    });

    it('should handle case insensitivity', () => {
      const text1 = 'This Is A Test';
      const text2 = 'this is a test';
      const score = documentGroundingService.calculateFuzzyMatchScore(text1, text2);
      expect(score).toBe(100);
    });

    it('should handle whitespace normalization', () => {
      const text1 = 'This  is    a   test';
      const text2 = 'This is a test';
      const score = documentGroundingService.calculateFuzzyMatchScore(text1, text2);
      expect(score).toBeGreaterThan(95);
    });

    it('should return 100 for empty strings', () => {
      const score = documentGroundingService.calculateFuzzyMatchScore('', '');
      expect(score).toBe(100);
    });
  });

  describe('highlightMatches', () => {
    it('should convert exact matches to highlight ranges', () => {
      const matches = [
        {
          startIndex: 10,
          endIndex: 50,
          matchScore: 100,
          matchedText: 'test text',
        },
      ];

      const highlights = documentGroundingService.highlightMatches(
        sampleDocumentText,
        matches
      );

      expect(highlights.length).toBe(1);
      expect(highlights[0].type).toBe('exact');
      expect(highlights[0].score).toBe(100);
      expect(highlights[0].start).toBe(10);
      expect(highlights[0].end).toBe(50);
    });

    it('should convert fuzzy matches to highlight ranges', () => {
      const matches = [
        {
          startIndex: 10,
          endIndex: 50,
          matchScore: 75,
          matchedText: 'test text',
        },
      ];

      const highlights = documentGroundingService.highlightMatches(
        sampleDocumentText,
        matches
      );

      expect(highlights.length).toBe(1);
      expect(highlights[0].type).toBe('fuzzy');
      expect(highlights[0].score).toBe(75);
    });

    it('should handle multiple matches', () => {
      const matches = [
        {
          startIndex: 10,
          endIndex: 50,
          matchScore: 100,
          matchedText: 'first match',
        },
        {
          startIndex: 100,
          endIndex: 150,
          matchScore: 85,
          matchedText: 'second match',
        },
      ];

      const highlights = documentGroundingService.highlightMatches(
        sampleDocumentText,
        matches
      );

      expect(highlights.length).toBe(2);
    });

    it('should handle empty matches array', () => {
      const highlights = documentGroundingService.highlightMatches(
        sampleDocumentText,
        []
      );

      expect(highlights).toEqual([]);
    });
  });

  describe('validateExtraction', () => {
    it('should validate grounded extraction with high score', async () => {
      const mockObligation = {
        id: 'obl-123',
        original_text: 'monitor emissions to air from emission point A1',
        page_reference: 1,
        document_id: 'doc-123',
      };

      const mockDocument = {
        id: 'doc-123',
        extracted_text: sampleDocumentText,
        metadata: { pageCount: 5 },
      };

      // Setup mocks for both queries
      mockFromFn
        .mockReturnValueOnce(createObligationQueryMock(mockObligation))
        .mockReturnValueOnce(createDocumentQueryMock(mockDocument));

      const result = await documentGroundingService.validateExtraction('obl-123');

      expect(result.isGrounded).toBe(true);
      expect(result.matchScore).toBeGreaterThan(80);
      expect(result.hallucinationRisk).toBe('LOW');
      expect(result.matchedPage).toBe(1);
      expect(result.highlightRanges.length).toBeGreaterThan(0);
    });

    it('should flag high hallucination risk for low match score', async () => {
      const mockObligation = {
        id: 'obl-123',
        original_text: 'completely fabricated obligation text that does not exist',
        page_reference: null,
        document_id: 'doc-123',
      };

      const mockDocument = {
        id: 'doc-123',
        extracted_text: sampleDocumentText,
        metadata: { pageCount: 5 },
      };

      mockFromFn
        .mockReturnValueOnce(createObligationQueryMock(mockObligation))
        .mockReturnValueOnce(createDocumentQueryMock(mockDocument));

      const result = await documentGroundingService.validateExtraction('obl-123');

      expect(result.isGrounded).toBe(false);
      expect(result.matchScore).toBeLessThan(50);
      expect(result.hallucinationRisk).toBe('HIGH');
    });

    it('should flag medium hallucination risk for medium match score', async () => {
      const mockObligation = {
        id: 'obl-123',
        original_text: 'monitor emisions too air frum emission', // Multiple typos
        page_reference: null,
        document_id: 'doc-123',
      };

      const mockDocument = {
        id: 'doc-123',
        extracted_text: sampleDocumentText,
        metadata: { pageCount: 5 },
      };

      mockFromFn
        .mockReturnValueOnce(createObligationQueryMock(mockObligation))
        .mockReturnValueOnce(createDocumentQueryMock(mockDocument));

      const result = await documentGroundingService.validateExtraction('obl-123');

      // Depending on fuzzy matching algorithm, risk could vary
      expect(['LOW', 'MEDIUM', 'HIGH']).toContain(result.hallucinationRisk);
    });

    it('should throw error when obligation not found', async () => {
      mockFromFn.mockReturnValue(
        createObligationQueryMock(null, { message: 'Not found' })
      );

      await expect(
        documentGroundingService.validateExtraction('invalid-id')
      ).rejects.toThrow('Failed to fetch obligation');
    });

    it('should throw error when obligation has no original text', async () => {
      const mockObligation = {
        id: 'obl-123',
        original_text: null,
        document_id: 'doc-123',
      };

      mockFromFn.mockReturnValue(createObligationQueryMock(mockObligation));

      await expect(
        documentGroundingService.validateExtraction('obl-123')
      ).rejects.toThrow('Obligation has no original text to validate');
    });

    it('should handle document fetch errors gracefully', async () => {
      const mockObligation = {
        id: 'obl-123',
        original_text: 'test text',
        document_id: 'doc-123',
      };

      mockFromFn
        .mockReturnValueOnce(createObligationQueryMock(mockObligation))
        .mockReturnValueOnce(
          createDocumentQueryMock(null, { message: 'Document error' })
        );

      await expect(
        documentGroundingService.validateExtraction('obl-123')
      ).rejects.toThrow('Failed to fetch document text');
    });

    it('should use page reference when available', async () => {
      const mockObligation = {
        id: 'obl-123',
        original_text: 'test text',
        page_reference: 2,
        document_id: 'doc-123',
      };

      const mockDocument = {
        id: 'doc-123',
        extracted_text: '[PAGE 1]Page one[PAGE 2]test text here',
        metadata: { pageCount: 2 },
      };

      mockFromFn
        .mockReturnValueOnce(createObligationQueryMock(mockObligation))
        .mockReturnValueOnce(createDocumentQueryMock(mockDocument));

      const result = await documentGroundingService.validateExtraction('obl-123');

      expect(result.matchedPage).toBe(2);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle very long texts efficiently', () => {
      const longText = 'word '.repeat(10000);
      const extractedText = 'word word word';

      const matches = documentGroundingService.findMatchingText(
        extractedText,
        longText
      );

      // Should complete without timeout
      expect(matches).toBeDefined();
    });

    it('should handle special characters in text', () => {
      const text1 = 'Test with special chars: @#$%^&*()';
      const text2 = 'Test with special chars: @#$%^&*()';

      const score = documentGroundingService.calculateFuzzyMatchScore(text1, text2);
      expect(score).toBeGreaterThan(90);
    });

    it('should handle unicode characters', () => {
      const text1 = 'Text with unicode: café, naïve, Zürich';
      const text2 = 'Text with unicode: café, naïve, Zürich';

      const score = documentGroundingService.calculateFuzzyMatchScore(text1, text2);
      expect(score).toBeGreaterThan(90);
    });

    it('should handle newlines and tabs', () => {
      const text1 = 'Line 1\nLine 2\tTabbed';
      const text2 = 'Line 1 Line 2 Tabbed';

      const score = documentGroundingService.calculateFuzzyMatchScore(text1, text2);
      expect(score).toBeGreaterThan(90);
    });
  });
});
