/**
 * Document Processing Pipeline
 * Handles OCR, text extraction, and document processing
 * Reference: EP_Compliance_Background_Jobs_Specification.md Section 3.1
 */

// @ts-ignore - pdf-parse has inconsistent exports
const pdfParse = require('pdf-parse');
import { createWorker } from 'tesseract.js';
import { getOpenAIClient } from './openai-client';
import { getRuleLibraryMatcher, RuleMatch } from './rule-library-matcher';

export interface DocumentProcessingResult {
  extractedText: string;
  ocrText?: string;
  pageCount: number;
  fileSizeBytes: number;
  isLargeDocument: boolean;
  needsOCR: boolean;
  processingTimeMs: number;
}

export interface ExtractionResult {
  obligations: any[];
  metadata: {
    permit_reference?: string;
    regulator?: string;
    extraction_confidence: number;
  };
  ruleLibraryMatches: RuleMatch[];
  usedLLM: boolean;
  extractionTimeMs: number;
}

export class DocumentProcessor {
  private openAIClient = getOpenAIClient();
  private ruleLibraryMatcher = getRuleLibraryMatcher();

  /**
   * Process document: Extract text, determine if OCR needed, process
   */
  async processDocument(
    fileBuffer: Buffer,
    filename: string,
    options?: {
      moduleTypes?: string[];
      regulator?: string;
      documentType?: string;
    }
  ): Promise<DocumentProcessingResult> {
    const startTime = Date.now();

    // Determine file type
    const isPDF = filename.toLowerCase().endsWith('.pdf');
    if (!isPDF) {
      throw new Error('Only PDF files are supported');
    }

    // Extract text from PDF
    let extractedText: string;
    let needsOCR = false;
    let ocrText: string | undefined;

    try {
      const pdfData = await pdfParse(fileBuffer);
      extractedText = pdfData.text;
      const pageCount = pdfData.numpages;
      const fileSizeBytes = fileBuffer.length;

      // Check if text extraction was successful (has meaningful content)
      if (extractedText.trim().length < 100) {
        // Likely scanned document, needs OCR
        needsOCR = true;
        ocrText = await this.performOCR(fileBuffer);
        extractedText = ocrText;
      }

      const isLargeDocument = pageCount >= 50 && fileSizeBytes >= 10_000_000;

      return {
        extractedText,
        ocrText: needsOCR ? ocrText : undefined,
        pageCount,
        fileSizeBytes,
        isLargeDocument,
        needsOCR,
        processingTimeMs: Date.now() - startTime,
      };
    } catch (error: any) {
      throw new Error(`Failed to process document: ${error.message}`);
    }
  }

  /**
   * Perform OCR on scanned document
   */
  private async performOCR(fileBuffer: Buffer): Promise<string> {
    const worker = await createWorker('eng');
    
    try {
      // Set timeout: 60 seconds
      const timeoutPromise = new Promise<string>((_, reject) => {
        setTimeout(() => reject(new Error('OCR timeout after 60 seconds')), 60000);
      });

      const ocrPromise = (async () => {
        const { data } = await worker.recognize(fileBuffer);
        return data.text;
      })();

      const ocrText = await Promise.race([ocrPromise, timeoutPromise]);
      return ocrText;
    } finally {
      await worker.terminate();
    }
  }

  /**
   * Extract obligations from document text
   * Uses rule library first, then LLM if needed
   */
  async extractObligations(
    documentText: string,
    options: {
      moduleTypes: string[];
      regulator?: string;
      documentType?: string;
      pageCount?: number;
      fileSizeBytes?: number;
      permitReference?: string;
    }
  ): Promise<ExtractionResult> {
    const startTime = Date.now();

    // Step 1: Try rule library matching first (cost optimization)
    const ruleLibraryMatches = await this.ruleLibraryMatcher.findMatches(
      documentText,
      options.moduleTypes,
      options.regulator,
      options.documentType
    );

    // If we have high-confidence matches (≥90%), use them
    if (ruleLibraryMatches.length > 0 && ruleLibraryMatches[0].match_score >= 0.9) {
      // Convert rule library matches to obligations
      const obligations = ruleLibraryMatches.map((match) => ({
        condition_reference: match.pattern_id,
        title: match.extracted_obligation.category,
        description: match.matched_text,
        category: match.extracted_obligation.category,
        frequency: match.extracted_obligation.frequency,
        deadline_relative: match.extracted_obligation.deadline_relative,
        is_subjective: match.extracted_obligation.is_subjective,
        confidence_score: Math.min(0.85 + match.confidence_boost, 1.0), // Base 85% + 15% boost
        evidence_suggestions: match.extracted_obligation.evidence_types || [],
        condition_type: match.extracted_obligation.condition_type,
      }));

      return {
        obligations,
        metadata: {
          regulator: options.regulator,
          extraction_confidence: 0.9, // High confidence for rule library matches
        },
        ruleLibraryMatches,
        usedLLM: false,
        extractionTimeMs: Date.now() - startTime,
      };
    }

    // Step 2: Use LLM extraction (fallback when rule library doesn't match)
    const llmResponse = await this.openAIClient.extractObligations(
      documentText,
      (options.documentType as any) || 'ENVIRONMENTAL_PERMIT',
      {
        pageCount: options.pageCount,
        fileSizeBytes: options.fileSizeBytes,
        regulator: options.regulator,
        permitReference: options.permitReference,
      }
    );

    // Parse JSON response
    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(llmResponse.content);
    } catch (error) {
      throw new Error(`Failed to parse LLM response: ${error}`);
    }

    // Validate response structure
    if (!parsedResponse.obligations || !Array.isArray(parsedResponse.obligations)) {
      throw new Error('Invalid LLM response: missing obligations array');
    }

    // Transform LLM obligations to our format
    const obligations = parsedResponse.obligations.map((obl: any) => ({
      condition_reference: obl.condition_reference || null,
      title: obl.summary || obl.text?.substring(0, 100) || 'Untitled Obligation',
      description: obl.text || obl.description || '',
      category: obl.category || 'OPERATIONAL',
      frequency: obl.frequency || null,
      deadline_date: obl.deadline_date || null,
      deadline_relative: obl.deadline_relative || null,
      is_subjective: obl.is_subjective || false,
      is_improvement: obl.is_improvement || false,
      confidence_score: obl.confidence_score || obl.confidence || 0.7,
      evidence_suggestions: obl.evidence_suggestions || obl.suggested_evidence_types || [],
      condition_type: obl.condition_type || 'STANDARD',
      page_reference: obl.page_reference || obl.page_number || null,
    }));

    return {
      obligations,
      metadata: {
        permit_reference: parsedResponse.document_metadata?.permit_reference || options.permitReference,
        regulator: parsedResponse.document_metadata?.regulator || options.regulator,
        extraction_confidence: parsedResponse.extraction_metadata?.extraction_confidence || 0.7,
      },
      ruleLibraryMatches: [],
      usedLLM: true,
      extractionTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Segment large documents (>800k tokens) for processing
   */
  segmentDocument(text: string, maxTokens: number = 800000): string[] {
    // Approximate: 1 token ≈ 4 characters
    const maxChars = maxTokens * 4;

    if (text.length <= maxChars) {
      return [text];
    }

    // Segment by paragraphs, then by sentences
    const paragraphs = text.split(/\n\s*\n/);
    const segments: string[] = [];
    let currentSegment = '';

    for (const paragraph of paragraphs) {
      if (currentSegment.length + paragraph.length > maxChars && currentSegment.length > 0) {
        segments.push(currentSegment);
        currentSegment = paragraph;
      } else {
        currentSegment += (currentSegment ? '\n\n' : '') + paragraph;
      }
    }

    if (currentSegment.length > 0) {
      segments.push(currentSegment);
    }

    return segments.length > 0 ? segments : [text];
  }
}

// Singleton instance
let documentProcessor: DocumentProcessor | null = null;

export function getDocumentProcessor(): DocumentProcessor {
  if (!documentProcessor) {
    documentProcessor = new DocumentProcessor();
  }
  return documentProcessor;
}

