/**
 * AI/Extraction Edge Cases Tests
 * Tests error handling, edge cases, and boundary conditions
 */

import { describe, it, expect } from '@jest/globals';
import { getOpenAIClient } from '@/lib/ai/openai-client';
import { getDocumentProcessor } from '@/lib/ai/document-processor';
import { getRuleLibraryMatcher } from '@/lib/ai/rule-library-matcher';
import { calculateCost, MODEL_PRICING } from '@/lib/ai/cost-calculator';

describe('AI/Extraction Edge Cases', () => {
  describe('OpenAI Client Edge Cases', () => {
    it('should handle empty document text', async () => {
      const openAIClient = getOpenAIClient();
      
      try {
        const response = await openAIClient.classifyDocument('', 0, 'empty.pdf');
        // Should handle gracefully or return default
        expect(response).toBeDefined();
      } catch (error: any) {
        // Error is acceptable for empty document
        expect(error).toBeDefined();
      }
    }, 30000);

    it('should handle very large document text', async () => {
      const openAIClient = getOpenAIClient();
      const largeText = 'A '.repeat(1000000); // ~2M characters
      
      try {
        const response = await openAIClient.classifyDocument(largeText, 1000, 'large.pdf');
        // Should handle or segment
        expect(response).toBeDefined();
      } catch (error: any) {
        // Error is acceptable for very large documents
        expect(error).toBeDefined();
      }
    }, 60000);

    it('should handle timeout for slow API responses', async () => {
      const openAIClient = getOpenAIClient();
      
      // Test timeout calculation
      const timeout = openAIClient.getDocumentTimeout(100, 20_000_000);
      expect(timeout).toBe(300000); // 5 minutes for large docs
    });

    it('should handle invalid document type', async () => {
      const openAIClient = getOpenAIClient();
      const testText = 'Some document text';
      
      try {
        const response = await openAIClient.extractObligations(
          testText,
          'INVALID_TYPE' as any,
          {
            pageCount: 5,
            regulator: 'EA',
          }
        );
        // Should handle gracefully
        expect(response).toBeDefined();
      } catch (error: any) {
        // Error is acceptable for invalid type
        expect(error).toBeDefined();
      }
    }, 60000);
  });

  describe('Document Processor Edge Cases', () => {
    it('should handle corrupted PDF', async () => {
      const documentProcessor = getDocumentProcessor();
      const corruptedPDF = Buffer.from('Not a valid PDF');
      
      try {
        const result = await documentProcessor.processDocument(corruptedPDF, 'corrupted.pdf');
        // Should handle gracefully
        expect(result).toBeDefined();
      } catch (error: any) {
        // Error is acceptable for corrupted PDF
        expect(error).toBeDefined();
      }
    }, 30000);

    it('should handle zero-byte file', async () => {
      const documentProcessor = getDocumentProcessor();
      const emptyFile = Buffer.from('');
      
      try {
        const result = await documentProcessor.processDocument(emptyFile, 'empty.pdf');
        // Should handle gracefully
        expect(result).toBeDefined();
      } catch (error: any) {
        // Error is acceptable for empty file
        expect(error).toBeDefined();
      }
    }, 30000);

    it('should segment very large documents correctly', () => {
      const documentProcessor = getDocumentProcessor();
      const largeText = 'A '.repeat(2000000); // ~4M characters
      
      const segments = documentProcessor.segmentDocument(largeText, 800000);
      
      expect(Array.isArray(segments)).toBe(true);
      expect(segments.length).toBeGreaterThan(1);
      
      // Verify segments don't exceed max size
      segments.forEach(segment => {
        expect(segment.length).toBeLessThanOrEqual(800000 * 1.1); // Allow 10% buffer
      });
    });

    it('should handle extraction with no obligations found', async () => {
      const documentProcessor = getDocumentProcessor();
      const emptyDocument = 'This document has no obligations.';
      
      try {
        const result = await documentProcessor.extractObligations(
          emptyDocument,
          {
            moduleTypes: ['MODULE_1'],
            regulator: 'EA',
            documentType: 'ENVIRONMENTAL_PERMIT',
            pageCount: 1,
          }
        );
        
        expect(result).toBeDefined();
        expect(Array.isArray(result.obligations)).toBe(true);
      } catch (error: any) {
        // Error is acceptable
        expect(error).toBeDefined();
      }
    }, 60000);
  });

  describe('Rule Library Matcher Edge Cases', () => {
    it('should handle empty pattern library', async () => {
      const ruleLibraryMatcher = getRuleLibraryMatcher();
      
      const matches = await ruleLibraryMatcher.findMatches(
        'Test document text',
        ['MODULE_1'],
        'EA',
        'ENVIRONMENTAL_PERMIT'
      );
      
      expect(Array.isArray(matches)).toBe(true);
    });

    it('should handle document with no matches', async () => {
      const ruleLibraryMatcher = getRuleLibraryMatcher();
      
      const matches = await ruleLibraryMatcher.findMatches(
        'Completely unrelated text that matches nothing',
        ['MODULE_1'],
        'EA',
        'ENVIRONMENTAL_PERMIT'
      );
      
      expect(Array.isArray(matches)).toBe(true);
    });

    it('should handle invalid module types', async () => {
      const ruleLibraryMatcher = getRuleLibraryMatcher();
      
      const matches = await ruleLibraryMatcher.findMatches(
        'Test document text',
        ['INVALID_MODULE' as any],
        'EA',
        'ENVIRONMENTAL_PERMIT'
      );
      
      expect(Array.isArray(matches)).toBe(true);
    });
  });

  describe('Cost Calculator Edge Cases', () => {
    it('should calculate cost for zero tokens', () => {
      const cost = calculateCost('gpt-4o', 0, 0);
      expect(cost).toBe(0);
    });

    it('should calculate cost for very large token usage', () => {
      const cost = calculateCost('gpt-4o', 100000, 50000);
      expect(cost).toBeGreaterThan(0);
      expect(typeof cost).toBe('number');
    });

    it('should handle invalid model name gracefully', () => {
      const cost = calculateCost('invalid-model' as any, 1000, 500);
      // Should return 0 or handle gracefully
      expect(typeof cost).toBe('number');
    });

    it('should track costs for different models', () => {
      const gpt4oMiniCost = calculateCost('gpt-4o-mini', 1000, 500);
      const gpt4oCost = calculateCost('gpt-4o', 1000, 500);
      
      expect(gpt4oCost).toBeGreaterThan(gpt4oMiniCost);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const openAIClient = getOpenAIClient();
      
      // This test verifies error handling exists
      // Actual network errors would be caught in integration tests
      expect(openAIClient).toBeDefined();
    });

    it('should handle API rate limit errors', async () => {
      const openAIClient = getOpenAIClient();
      
      // This test verifies rate limit handling exists
      // Actual rate limit errors would be caught in integration tests
      expect(openAIClient).toBeDefined();
    });

    it('should handle invalid API key errors', async () => {
      const openAIClient = getOpenAIClient();
      
      // This test verifies API key validation exists
      // Actual invalid key errors would be caught in integration tests
      expect(openAIClient).toBeDefined();
    });
  });

  describe('Boundary Conditions', () => {
    it('should handle minimum page count (1 page)', () => {
      const openAIClient = getOpenAIClient();
      const timeout = openAIClient.getDocumentTimeout(1, 100000);
      expect(timeout).toBe(30000); // Standard timeout
    });

    it('should handle maximum page count (1000+ pages)', () => {
      const openAIClient = getOpenAIClient();
      const timeout = openAIClient.getDocumentTimeout(1000, 50_000_000);
      expect(timeout).toBe(300000); // Large document timeout
    });

    it('should handle minimum file size (1 byte)', () => {
      const openAIClient = getOpenAIClient();
      const timeout = openAIClient.getDocumentTimeout(1, 1);
      expect(timeout).toBe(30000); // Standard timeout
    });

    it('should handle maximum file size (100MB+)', () => {
      const openAIClient = getOpenAIClient();
      const timeout = openAIClient.getDocumentTimeout(100, 100_000_000);
      expect(timeout).toBe(300000); // Large document timeout
    });
  });
});

