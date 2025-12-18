/**
 * Document Processing Job Tests
 * Tests for lib/jobs/document-processing-job.ts
 *
 * These tests verify the document processing job correctly:
 * - Downloads files from Supabase storage
 * - Extracts text from documents (PDF/OCR)
 * - Updates document status through processing stages
 * - Extracts obligations using rule library and LLM
 * - Creates obligations in database
 * - Logs extraction metrics and costs
 * - Updates real-time progress tracking
 * - Handles errors gracefully
 * - Triggers pattern discovery for LLM extractions
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import type { DocumentProcessingJobData } from '@/lib/jobs/document-processing-job';

// Mock data for tests
const createMockJob = (overrides: Partial<DocumentProcessingJobData> = {}): any => ({
  data: {
    document_id: 'doc-123',
    company_id: 'company-1',
    site_id: 'site-1',
    module_id: 'waste',
    file_path: 'documents/company-1/test.pdf',
    document_type: 'PERMIT',
    regulator: 'EPA',
    permit_reference: 'EPA-2024-001',
    ...overrides,
  },
});

const createMockBuffer = (): Buffer => {
  return Buffer.from('mock-pdf-content');
};

const createMockProcessingResult = (overrides: any = {}) => ({
  extractedText: 'This is extracted text from the document with obligations.',
  pageCount: 10,
  fileSizeBytes: 1024000,
  processingTimeMs: 500,
  needsOCR: false,
  ...overrides,
});

const createMockExtractionResult = (overrides: any = {}) => ({
  obligations: [
    {
      obligation_title: 'Submit Annual Report',
      obligation_description: 'Must submit annual environmental report',
      confidence_score: 0.9,
      category: 'REPORTING',
    },
  ],
  usedLLM: false,
  ruleLibraryMatches: [{ pattern_id: 'pattern-1' }],
  tokenUsage: null,
  complexity: 'LOW',
  extractionTimeMs: 200,
  metadata: {
    extraction_confidence: 0.85,
  },
  errors: [],
  ...overrides,
});

const createMockCreationResult = (overrides: any = {}) => ({
  obligationsCreated: 1,
  schedulesCreated: 0,
  deadlinesCreated: 0,
  reviewQueueItemsCreated: 0,
  duplicatesSkipped: 0,
  errors: [],
  ...overrides,
});

describe('document-processing-job', () => {
  let mockFromFn: jest.Mock;
  let mockStorageFrom: jest.Mock;
  let mockDocumentProcessor: any;
  let mockObligationCreator: any;
  let mockUpdateExtractionProgress: jest.Mock;
  let mockClearExtractionProgress: jest.Mock;
  let mockCheckForPatternDiscovery: jest.Mock;
  let processDocumentJob: (job: any) => Promise<void>;

  // Helper to create chainable mock for simple queries
  const createChainableMock = (finalResult: any) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockReturnValue(Promise.resolve(finalResult)),
      }),
    }),
  });

  // Helper for update queries
  const createUpdateMock = (result: any) => ({
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue(Promise.resolve(result)),
    }),
  });

  // Helper for update with select
  const createUpdateSelectMock = (result: any) => ({
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockReturnValue(Promise.resolve(result)),
        }),
      }),
    }),
  });

  // Helper for background jobs query
  const createJobQueryMock = (jobs: any[]) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue(Promise.resolve({ data: jobs, error: null })),
          }),
        }),
      }),
    }),
  });

  // Helper for obligations query
  const createObligationsQueryMock = (obligations: any[]) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        is: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue(Promise.resolve({ data: obligations, error: null })),
        }),
      }),
    }),
  });

  // Helper for insert mock
  const createInsertMock = (result: any) => ({
    insert: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockReturnValue(Promise.resolve(result)),
      }),
    }),
  });

  // Helper for storage download mock
  const createStorageMock = (data: any, error: any = null) => ({
    from: jest.fn().mockReturnValue({
      download: jest.fn().mockReturnValue(Promise.resolve({ data, error })),
    }),
  });

  beforeEach(async () => {
    jest.resetModules();

    // Create fresh mocks
    mockFromFn = jest.fn();
    mockStorageFrom = jest.fn();
    mockUpdateExtractionProgress = jest.fn().mockResolvedValue(undefined);
    mockClearExtractionProgress = jest.fn().mockResolvedValue(undefined);
    mockCheckForPatternDiscovery = jest.fn().mockResolvedValue(undefined);

    // Mock document processor
    mockDocumentProcessor = {
      processDocument: jest.fn().mockResolvedValue(createMockProcessingResult()),
      extractObligations: jest.fn().mockResolvedValue(createMockExtractionResult()),
    };

    // Mock obligation creator
    mockObligationCreator = {
      createObligations: jest.fn().mockResolvedValue(createMockCreationResult()),
    };

    // Set up mocks before importing
    jest.doMock('@/lib/supabase/server', () => ({
      supabaseAdmin: {
        from: mockFromFn,
      },
    }));

    jest.doMock('@supabase/supabase-js', () => ({
      createClient: jest.fn().mockReturnValue({
        storage: mockStorageFrom,
      }),
    }));

    jest.doMock('@/lib/ai/document-processor', () => ({
      getDocumentProcessor: jest.fn().mockReturnValue(mockDocumentProcessor),
    }));

    jest.doMock('@/lib/ai/obligation-creator', () => ({
      getObligationCreator: jest.fn().mockReturnValue(mockObligationCreator),
    }));

    jest.doMock('@/lib/services/extraction-progress-service', () => ({
      updateExtractionProgress: mockUpdateExtractionProgress,
      clearExtractionProgress: mockClearExtractionProgress,
    }));

    jest.doMock('@/lib/ai/pattern-discovery', () => ({
      checkForPatternDiscovery: mockCheckForPatternDiscovery,
    }));

    jest.doMock('@/lib/ai/cost-calculator', () => ({
      calculateCost: jest.fn().mockReturnValue({ totalCost: 0.05 }),
    }));

    jest.doMock('@/lib/env', () => ({
      env: {
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'test-key',
      },
    }));

    // Dynamic import
    const module = await import('@/lib/jobs/document-processing-job');
    processDocumentJob = module.processDocumentJob;
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('Full Document Processing Flow', () => {
    it('should successfully process document end-to-end', async () => {
      const mockJob = createMockJob();

      // Mock storage download
      const mockBlob = {
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      };
      mockStorageFrom.mockReturnValue(
        createStorageMock(mockBlob)
      );

      // Mock database calls
      mockFromFn
        // 1. Update document status to PROCESSING
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        // 2. Update document with extracted text
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        // 3. Query obligations for pattern discovery
        .mockReturnValueOnce(createObligationsQueryMock([
          { id: 'obl-1' },
          { id: 'obl-2' },
          { id: 'obl-3' },
        ]))
        // 4. Query obligations after status update (first check)
        .mockReturnValueOnce(createObligationsQueryMock([{ id: 'obl-1' }]))
        // 5. Update document status to COMPLETED
        .mockReturnValueOnce(createUpdateSelectMock({
          data: { id: 'doc-123', extraction_status: 'COMPLETED' },
          error: null,
        }))
        // 6. Final obligations check
        .mockReturnValueOnce(createObligationsQueryMock([
          { id: 'obl-1', obligation_title: 'Test Obligation' },
        ]))
        // 7. Query background_jobs for status update (PROCESSING)
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        // 8. Update job status to RUNNING
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        // 9. Insert extraction log
        .mockReturnValueOnce(createInsertMock({
          data: { id: 'log-1' },
          error: null,
        }))
        // 10. Query background_jobs for status update (COMPLETED)
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        // 11. Update job status to COMPLETED
        .mockReturnValueOnce(createUpdateMock({ error: null }));

      await processDocumentJob(mockJob);

      // Verify storage download
      expect(mockStorageFrom).toHaveBeenCalled();

      // Verify document processor calls
      expect(mockDocumentProcessor.processDocument).toHaveBeenCalledWith(
        expect.any(Buffer),
        'test.pdf',
        {
          moduleTypes: ['waste'],
          regulator: 'EPA',
          documentType: 'PERMIT',
        }
      );

      expect(mockDocumentProcessor.extractObligations).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          documentId: 'doc-123',
          moduleTypes: ['waste'],
          regulator: 'EPA',
          documentType: 'PERMIT',
          permitReference: 'EPA-2024-001',
        })
      );

      // Verify obligation creator
      expect(mockObligationCreator.createObligations).toHaveBeenCalledWith(
        expect.any(Object),
        'doc-123',
        'site-1',
        'company-1',
        'waste'
      );

      // Verify progress updates
      expect(mockUpdateExtractionProgress).toHaveBeenCalledWith('doc-123', expect.objectContaining({
        status: 'queued',
        progress: 0,
      }));

      expect(mockUpdateExtractionProgress).toHaveBeenCalledWith('doc-123', expect.objectContaining({
        status: 'completed',
        progress: 100,
      }));
    });

    it('should handle document with LLM extraction and trigger pattern discovery', async () => {
      const mockJob = createMockJob();

      // Mock LLM-based extraction result
      const llmExtractionResult = createMockExtractionResult({
        usedLLM: true,
        ruleLibraryMatches: [],
        tokenUsage: {
          inputTokens: 1000,
          outputTokens: 500,
          totalTokens: 1500,
          model: 'gpt-4o',
          estimatedCost: 0.05,
        },
        obligations: [
          { obligation_title: 'Obligation 1', confidence_score: 0.8 },
          { obligation_title: 'Obligation 2', confidence_score: 0.9 },
          { obligation_title: 'Obligation 3', confidence_score: 0.85 },
        ],
      });

      mockDocumentProcessor.extractObligations.mockResolvedValue(llmExtractionResult);

      const mockBlob = {
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      };
      mockStorageFrom.mockReturnValue(createStorageMock(mockBlob));

      mockFromFn
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createObligationsQueryMock([
          { id: 'obl-1' },
          { id: 'obl-2' },
          { id: 'obl-3' },
        ]))
        .mockReturnValueOnce(createObligationsQueryMock([{ id: 'obl-1' }]))
        .mockReturnValueOnce(createUpdateSelectMock({
          data: { id: 'doc-123', extraction_status: 'COMPLETED' },
          error: null,
        }))
        .mockReturnValueOnce(createObligationsQueryMock([{ id: 'obl-1', obligation_title: 'Test' }]))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createInsertMock({ data: { id: 'log-1' }, error: null }))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }));

      await processDocumentJob(mockJob);

      // Verify pattern discovery was triggered
      expect(mockCheckForPatternDiscovery).toHaveBeenCalledWith(
        'log-1',
        ['obl-1', 'obl-2', 'obl-3']
      );
    });

    it('should update document with token usage and cost when LLM is used', async () => {
      const mockJob = createMockJob();

      const llmExtractionResult = createMockExtractionResult({
        usedLLM: true,
        tokenUsage: {
          inputTokens: 2000,
          outputTokens: 800,
          totalTokens: 2800,
          model: 'gpt-4o-mini',
          estimatedCost: 0.02,
        },
        complexity: 'HIGH',
      });

      mockDocumentProcessor.extractObligations.mockResolvedValue(llmExtractionResult);

      const mockBlob = {
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      };
      mockStorageFrom.mockReturnValue(createStorageMock(mockBlob));

      let updateCallData: any;
      mockFromFn
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createObligationsQueryMock([{ id: 'obl-1' }]))
        .mockReturnValueOnce(createObligationsQueryMock([{ id: 'obl-1' }]))
        .mockReturnValueOnce({
          update: jest.fn((data) => {
            updateCallData = data;
            return {
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockReturnValue(Promise.resolve({
                    data: { id: 'doc-123', extraction_status: 'COMPLETED' },
                    error: null,
                  })),
                }),
              }),
            };
          }),
        })
        .mockReturnValueOnce(createObligationsQueryMock([{ id: 'obl-1', obligation_title: 'Test' }]))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createInsertMock({ data: { id: 'log-1' }, error: null }))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }));

      await processDocumentJob(mockJob);

      // Verify token usage was included in update
      expect(updateCallData).toMatchObject({
        extraction_status: 'COMPLETED',
        extraction_tokens_input: 2000,
        extraction_tokens_output: 800,
        extraction_tokens_total: 2800,
        extraction_model: 'gpt-4o-mini',
        extraction_cost_usd: 0.02,
        extraction_complexity: 'HIGH',
      });
    });
  });

  describe('File Download', () => {
    it('should successfully download file from storage', async () => {
      const mockJob = createMockJob();
      const mockBlob = {
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024)),
      };

      mockStorageFrom.mockReturnValue(createStorageMock(mockBlob));

      mockFromFn
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createUpdateSelectMock({
          data: { id: 'doc-123', extraction_status: 'COMPLETED' },
          error: null,
        }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createInsertMock({ data: { id: 'log-1' }, error: null }))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }));

      await processDocumentJob(mockJob);

      expect(mockStorageFrom).toHaveBeenCalled();
      expect(mockBlob.arrayBuffer).toHaveBeenCalled();
    });

    it('should handle storage download failure', async () => {
      const mockJob = createMockJob();

      mockStorageFrom.mockReturnValue(
        createStorageMock(null, { message: 'File not found' })
      );

      mockFromFn
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }));

      await expect(processDocumentJob(mockJob)).rejects.toThrow('Failed to download file: File not found');

      // Verify status was updated to PROCESSING_FAILED
      expect(mockUpdateExtractionProgress).toHaveBeenCalledWith('doc-123', expect.objectContaining({
        status: 'failed',
        error: 'Failed to download file: File not found',
      }));
    });

    it('should handle path with bucket prefix correctly', async () => {
      const mockJob = createMockJob({
        file_path: 'documents/company-1/nested/path/file.pdf',
      });

      const mockBlob = {
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      };

      const mockDownload = jest.fn().mockReturnValue(Promise.resolve({ data: mockBlob, error: null }));
      mockStorageFrom.mockReturnValue({
        from: jest.fn().mockReturnValue({
          download: mockDownload,
        }),
      });

      mockFromFn
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createUpdateSelectMock({
          data: { id: 'doc-123', extraction_status: 'COMPLETED' },
          error: null,
        }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createInsertMock({ data: { id: 'log-1' }, error: null }))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }));

      await processDocumentJob(mockJob);

      expect(mockStorageFrom).toHaveBeenCalled();
    });
  });

  describe('Text Extraction', () => {
    it('should extract text from document successfully', async () => {
      const mockJob = createMockJob();
      const mockBlob = {
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      };

      mockStorageFrom.mockReturnValue(createStorageMock(mockBlob));

      const processingResult = createMockProcessingResult({
        extractedText: 'Long extracted text with multiple obligations and requirements.',
        pageCount: 25,
        fileSizeBytes: 2048000,
      });

      mockDocumentProcessor.processDocument.mockResolvedValue(processingResult);

      mockFromFn
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createUpdateSelectMock({
          data: { id: 'doc-123', extraction_status: 'COMPLETED' },
          error: null,
        }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createInsertMock({ data: { id: 'log-1' }, error: null }))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }));

      await processDocumentJob(mockJob);

      expect(mockDocumentProcessor.processDocument).toHaveBeenCalled();
    });

    it('should handle document requiring OCR', async () => {
      const mockJob = createMockJob();
      const mockBlob = {
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      };

      mockStorageFrom.mockReturnValue(createStorageMock(mockBlob));

      const processingResult = createMockProcessingResult({
        needsOCR: true,
        extractedText: 'OCR extracted text from scanned document with obligations.',
      });

      mockDocumentProcessor.processDocument.mockResolvedValue(processingResult);

      mockFromFn
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createUpdateSelectMock({
          data: { id: 'doc-123', extraction_status: 'COMPLETED' },
          error: null,
        }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createInsertMock({ data: { id: 'log-1' }, error: null }))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }));

      await processDocumentJob(mockJob);

      expect(mockDocumentProcessor.processDocument).toHaveBeenCalled();
    });

    it('should reject document with extracted text too short', async () => {
      const mockJob = createMockJob();
      const mockBlob = {
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      };

      mockStorageFrom.mockReturnValue(createStorageMock(mockBlob));

      const processingResult = createMockProcessingResult({
        extractedText: 'Too short',
      });

      mockDocumentProcessor.processDocument.mockResolvedValue(processingResult);

      mockFromFn
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }));

      await expect(processDocumentJob(mockJob)).rejects.toThrow(
        'Extracted text is too short'
      );
    });

    it('should handle extraction with empty text', async () => {
      const mockJob = createMockJob();
      const mockBlob = {
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      };

      mockStorageFrom.mockReturnValue(createStorageMock(mockBlob));

      const processingResult = createMockProcessingResult({
        extractedText: '',
      });

      mockDocumentProcessor.processDocument.mockResolvedValue(processingResult);

      mockFromFn
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }));

      await expect(processDocumentJob(mockJob)).rejects.toThrow(
        'Extracted text is too short'
      );
    });
  });

  describe('Status Updates', () => {
    it('should update document status to PROCESSING at start', async () => {
      const mockJob = createMockJob();
      const mockBlob = {
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      };

      mockStorageFrom.mockReturnValue(createStorageMock(mockBlob));

      let updateCallData: any;
      mockFromFn
        .mockReturnValueOnce({
          update: jest.fn((data) => {
            updateCallData = data;
            return {
              eq: jest.fn().mockReturnValue(Promise.resolve({ error: null })),
            };
          }),
        })
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createUpdateSelectMock({
          data: { id: 'doc-123', extraction_status: 'COMPLETED' },
          error: null,
        }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createInsertMock({ data: { id: 'log-1' }, error: null }))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }));

      await processDocumentJob(mockJob);

      expect(updateCallData).toMatchObject({
        extraction_status: 'PROCESSING',
      });
    });

    it('should update document status to COMPLETED on success', async () => {
      const mockJob = createMockJob();
      const mockBlob = {
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      };

      mockStorageFrom.mockReturnValue(createStorageMock(mockBlob));

      mockFromFn
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createUpdateSelectMock({
          data: { id: 'doc-123', extraction_status: 'COMPLETED' },
          error: null,
        }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createInsertMock({ data: { id: 'log-1' }, error: null }))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }));

      await processDocumentJob(mockJob);

      // Verify final status update
      expect(mockFromFn).toHaveBeenCalledWith('documents');
    });

    it('should update document status to PROCESSING_FAILED on error', async () => {
      const mockJob = createMockJob();

      mockStorageFrom.mockReturnValue(
        createStorageMock(null, { message: 'Storage error' })
      );

      mockFromFn
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }));

      await expect(processDocumentJob(mockJob)).rejects.toThrow();

      // Verify failure status was set
      expect(mockFromFn).toHaveBeenCalledWith('documents');
    });

    it('should handle status update failure gracefully', async () => {
      const mockJob = createMockJob();
      const mockBlob = {
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      };

      mockStorageFrom.mockReturnValue(createStorageMock(mockBlob));

      mockFromFn
        .mockReturnValueOnce(createUpdateMock({ error: { message: 'Database error' } }))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }));

      await expect(processDocumentJob(mockJob)).rejects.toThrow('Failed to update document status');
    });
  });

  describe('Obligation Extraction', () => {
    it('should extract obligations using rule library', async () => {
      const mockJob = createMockJob();
      const mockBlob = {
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      };

      mockStorageFrom.mockReturnValue(createStorageMock(mockBlob));

      const ruleLibraryResult = createMockExtractionResult({
        usedLLM: false,
        ruleLibraryMatches: [
          { pattern_id: 'pattern-1' },
          { pattern_id: 'pattern-2' },
        ],
        obligations: [
          { obligation_title: 'Rule 1', confidence_score: 1.0 },
          { obligation_title: 'Rule 2', confidence_score: 1.0 },
        ],
      });

      mockDocumentProcessor.extractObligations.mockResolvedValue(ruleLibraryResult);

      mockFromFn
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createUpdateSelectMock({
          data: { id: 'doc-123', extraction_status: 'COMPLETED' },
          error: null,
        }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createInsertMock({ data: { id: 'log-1' }, error: null }))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }));

      await processDocumentJob(mockJob);

      // Verify pattern discovery NOT triggered for rule library
      expect(mockCheckForPatternDiscovery).not.toHaveBeenCalled();
    });

    it('should handle extraction returning zero obligations', async () => {
      const mockJob = createMockJob();
      const mockBlob = {
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      };

      mockStorageFrom.mockReturnValue(createStorageMock(mockBlob));

      const zeroObligationsResult = createMockExtractionResult({
        obligations: [],
      });

      mockDocumentProcessor.extractObligations.mockResolvedValue(zeroObligationsResult);

      const creationResult = createMockCreationResult({
        obligationsCreated: 0,
      });

      mockObligationCreator.createObligations.mockResolvedValue(creationResult);

      mockFromFn
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createUpdateSelectMock({
          data: { id: 'doc-123', extraction_status: 'COMPLETED' },
          error: null,
        }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createInsertMock({ data: { id: 'log-1' }, error: null }))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }));

      await processDocumentJob(mockJob);

      // Should still complete successfully
      expect(mockUpdateExtractionProgress).toHaveBeenCalledWith('doc-123', expect.objectContaining({
        status: 'completed',
      }));
    });

    it('should handle extraction failure with proper error handling', async () => {
      const mockJob = createMockJob();
      const mockBlob = {
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      };

      mockStorageFrom.mockReturnValue(createStorageMock(mockBlob));

      mockDocumentProcessor.extractObligations.mockRejectedValue(
        new Error('LLM extraction failed: rate limit')
      );

      mockFromFn
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }));

      await expect(processDocumentJob(mockJob)).rejects.toThrow('LLM extraction failed: rate limit');
    });

    it('should pass all context to obligation extractor', async () => {
      const mockJob = createMockJob({
        module_id: 'air-quality',
        regulator: 'NSW EPA',
        document_type: 'CONSENT',
        permit_reference: 'NSW-2024-456',
      });

      const mockBlob = {
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      };

      mockStorageFrom.mockReturnValue(createStorageMock(mockBlob));

      mockFromFn
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createUpdateSelectMock({
          data: { id: 'doc-123', extraction_status: 'COMPLETED' },
          error: null,
        }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createInsertMock({ data: { id: 'log-1' }, error: null }))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }));

      await processDocumentJob(mockJob);

      expect(mockDocumentProcessor.extractObligations).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          documentId: 'doc-123',
          moduleTypes: ['air-quality'],
          regulator: 'NSW EPA',
          documentType: 'CONSENT',
          permitReference: 'NSW-2024-456',
        })
      );
    });
  });

  describe('Obligation Creation', () => {
    it('should create obligations in database successfully', async () => {
      const mockJob = createMockJob();
      const mockBlob = {
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      };

      mockStorageFrom.mockReturnValue(createStorageMock(mockBlob));

      const creationResult = createMockCreationResult({
        obligationsCreated: 5,
        schedulesCreated: 3,
        deadlinesCreated: 10,
        reviewQueueItemsCreated: 2,
      });

      mockObligationCreator.createObligations.mockResolvedValue(creationResult);

      mockFromFn
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createUpdateSelectMock({
          data: { id: 'doc-123', extraction_status: 'COMPLETED' },
          error: null,
        }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createInsertMock({ data: { id: 'log-1' }, error: null }))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }));

      await processDocumentJob(mockJob);

      expect(mockObligationCreator.createObligations).toHaveBeenCalledWith(
        expect.any(Object),
        'doc-123',
        'site-1',
        'company-1',
        'waste'
      );
    });

    it('should handle duplicate obligations being skipped', async () => {
      const mockJob = createMockJob();
      const mockBlob = {
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      };

      mockStorageFrom.mockReturnValue(createStorageMock(mockBlob));

      const creationResult = createMockCreationResult({
        obligationsCreated: 3,
        duplicatesSkipped: 2,
      });

      mockObligationCreator.createObligations.mockResolvedValue(creationResult);

      mockFromFn
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createUpdateSelectMock({
          data: { id: 'doc-123', extraction_status: 'COMPLETED' },
          error: null,
        }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createInsertMock({ data: { id: 'log-1' }, error: null }))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }));

      await processDocumentJob(mockJob);

      expect(mockObligationCreator.createObligations).toHaveBeenCalled();
    });

    it('should handle obligation creation errors and fail job', async () => {
      const mockJob = createMockJob();
      const mockBlob = {
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      };

      mockStorageFrom.mockReturnValue(createStorageMock(mockBlob));

      mockObligationCreator.createObligations.mockRejectedValue(
        new Error('Database constraint violation')
      );

      mockFromFn
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }));

      await expect(processDocumentJob(mockJob)).rejects.toThrow('Obligation creation failed');
    });

    it('should handle partial creation with some errors', async () => {
      const mockJob = createMockJob();
      const mockBlob = {
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      };

      mockStorageFrom.mockReturnValue(createStorageMock(mockBlob));

      const creationResult = createMockCreationResult({
        obligationsCreated: 8,
        errors: [
          { obligation_title: 'Failed Obligation', error: 'Validation error' },
        ],
      });

      mockObligationCreator.createObligations.mockResolvedValue(creationResult);

      mockFromFn
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createUpdateSelectMock({
          data: { id: 'doc-123', extraction_status: 'COMPLETED' },
          error: null,
        }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createInsertMock({ data: { id: 'log-1' }, error: null }))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }));

      await processDocumentJob(mockJob);

      // Should complete successfully even with some errors
      expect(mockUpdateExtractionProgress).toHaveBeenCalledWith('doc-123', expect.objectContaining({
        status: 'completed',
      }));
    });
  });

  describe('Extraction Logging', () => {
    it('should log extraction with rule library metrics', async () => {
      const mockJob = createMockJob();
      const mockBlob = {
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      };

      mockStorageFrom.mockReturnValue(createStorageMock(mockBlob));

      const ruleLibraryResult = createMockExtractionResult({
        usedLLM: false,
        ruleLibraryMatches: [{ pattern_id: 'pattern-1' }],
      });

      mockDocumentProcessor.extractObligations.mockResolvedValue(ruleLibraryResult);

      let insertCallData: any;
      mockFromFn
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createUpdateSelectMock({
          data: { id: 'doc-123', extraction_status: 'COMPLETED' },
          error: null,
        }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce({
          insert: jest.fn((data) => {
            insertCallData = data;
            return {
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockReturnValue(Promise.resolve({
                  data: { id: 'log-1' },
                  error: null,
                })),
              }),
            };
          }),
        })
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }));

      await processDocumentJob(mockJob);

      expect(insertCallData).toMatchObject({
        document_id: 'doc-123',
        model_identifier: 'rule_library',
        rule_library_hits: 1,
        input_tokens: 0,
        output_tokens: 0,
        estimated_cost: 0,
      });
    });

    it('should log extraction with LLM metrics', async () => {
      const mockJob = createMockJob();
      const mockBlob = {
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      };

      mockStorageFrom.mockReturnValue(createStorageMock(mockBlob));

      const llmResult = createMockExtractionResult({
        usedLLM: true,
        ruleLibraryMatches: [],
        usage: {
          prompt_tokens: 1500,
          completion_tokens: 600,
        },
      });

      mockDocumentProcessor.extractObligations.mockResolvedValue(llmResult);

      let insertCallData: any;
      mockFromFn
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createObligationsQueryMock([{ id: 'obl-1' }]))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createUpdateSelectMock({
          data: { id: 'doc-123', extraction_status: 'COMPLETED' },
          error: null,
        }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce({
          insert: jest.fn((data) => {
            insertCallData = data;
            return {
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockReturnValue(Promise.resolve({
                  data: { id: 'log-1' },
                  error: null,
                })),
              }),
            };
          }),
        })
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }));

      await processDocumentJob(mockJob);

      expect(insertCallData).toMatchObject({
        document_id: 'doc-123',
        input_tokens: 1500,
        output_tokens: 600,
        estimated_cost: 0.05,
      });
    });

    it('should handle extraction log insertion failure gracefully', async () => {
      const mockJob = createMockJob();
      const mockBlob = {
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      };

      mockStorageFrom.mockReturnValue(createStorageMock(mockBlob));

      mockFromFn
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createUpdateSelectMock({
          data: { id: 'doc-123', extraction_status: 'COMPLETED' },
          error: null,
        }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createInsertMock({
          data: null,
          error: { message: 'Insert failed' },
        }))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }));

      // Should not throw - log insertion failure is non-critical
      await processDocumentJob(mockJob);

      expect(mockUpdateExtractionProgress).toHaveBeenCalledWith('doc-123', expect.objectContaining({
        status: 'completed',
      }));
    });
  });

  describe('Pattern Discovery', () => {
    it('should trigger pattern discovery only when LLM used with sufficient obligations', async () => {
      const mockJob = createMockJob();
      const mockBlob = {
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      };

      mockStorageFrom.mockReturnValue(createStorageMock(mockBlob));

      const llmResult = createMockExtractionResult({
        usedLLM: true,
        obligations: [
          { obligation_title: 'Obl 1' },
          { obligation_title: 'Obl 2' },
          { obligation_title: 'Obl 3' },
        ],
      });

      mockDocumentProcessor.extractObligations.mockResolvedValue(llmResult);

      mockFromFn
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createObligationsQueryMock([
          { id: 'obl-1' },
          { id: 'obl-2' },
          { id: 'obl-3' },
        ]))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createUpdateSelectMock({
          data: { id: 'doc-123', extraction_status: 'COMPLETED' },
          error: null,
        }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createInsertMock({ data: { id: 'log-1' }, error: null }))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }));

      await processDocumentJob(mockJob);

      expect(mockCheckForPatternDiscovery).toHaveBeenCalledWith('log-1', ['obl-1', 'obl-2', 'obl-3']);
    });

    it('should not trigger pattern discovery with fewer than 3 obligations', async () => {
      const mockJob = createMockJob();
      const mockBlob = {
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      };

      mockStorageFrom.mockReturnValue(createStorageMock(mockBlob));

      const llmResult = createMockExtractionResult({
        usedLLM: true,
      });

      mockDocumentProcessor.extractObligations.mockResolvedValue(llmResult);

      mockFromFn
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createObligationsQueryMock([{ id: 'obl-1' }, { id: 'obl-2' }]))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createUpdateSelectMock({
          data: { id: 'doc-123', extraction_status: 'COMPLETED' },
          error: null,
        }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createInsertMock({ data: { id: 'log-1' }, error: null }))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }));

      await processDocumentJob(mockJob);

      expect(mockCheckForPatternDiscovery).not.toHaveBeenCalled();
    });

    it('should not trigger pattern discovery when rule library used', async () => {
      const mockJob = createMockJob();
      const mockBlob = {
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      };

      mockStorageFrom.mockReturnValue(createStorageMock(mockBlob));

      const ruleResult = createMockExtractionResult({
        usedLLM: false,
        ruleLibraryMatches: [{ pattern_id: 'pattern-1' }],
        obligations: [
          { obligation_title: 'Obl 1' },
          { obligation_title: 'Obl 2' },
          { obligation_title: 'Obl 3' },
        ],
      });

      mockDocumentProcessor.extractObligations.mockResolvedValue(ruleResult);

      mockFromFn
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createUpdateSelectMock({
          data: { id: 'doc-123', extraction_status: 'COMPLETED' },
          error: null,
        }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createInsertMock({ data: { id: 'log-1' }, error: null }))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }));

      await processDocumentJob(mockJob);

      expect(mockCheckForPatternDiscovery).not.toHaveBeenCalled();
    });

    it('should handle pattern discovery errors gracefully', async () => {
      const mockJob = createMockJob();
      const mockBlob = {
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      };

      mockStorageFrom.mockReturnValue(createStorageMock(mockBlob));

      const llmResult = createMockExtractionResult({
        usedLLM: true,
        obligations: [
          { obligation_title: 'Obl 1' },
          { obligation_title: 'Obl 2' },
          { obligation_title: 'Obl 3' },
        ],
      });

      mockDocumentProcessor.extractObligations.mockResolvedValue(llmResult);
      mockCheckForPatternDiscovery.mockRejectedValue(new Error('Pattern discovery failed'));

      mockFromFn
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createObligationsQueryMock([
          { id: 'obl-1' },
          { id: 'obl-2' },
          { id: 'obl-3' },
        ]))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createUpdateSelectMock({
          data: { id: 'doc-123', extraction_status: 'COMPLETED' },
          error: null,
        }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createInsertMock({ data: { id: 'log-1' }, error: null }))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }));

      // Should not throw - pattern discovery is async and non-blocking
      await processDocumentJob(mockJob);

      expect(mockUpdateExtractionProgress).toHaveBeenCalledWith('doc-123', expect.objectContaining({
        status: 'completed',
      }));
    });
  });

  describe('Progress Tracking', () => {
    it('should update progress at key stages', async () => {
      const mockJob = createMockJob();
      const mockBlob = {
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      };

      mockStorageFrom.mockReturnValue(createStorageMock(mockBlob));

      mockFromFn
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createUpdateSelectMock({
          data: { id: 'doc-123', extraction_status: 'COMPLETED' },
          error: null,
        }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createInsertMock({ data: { id: 'log-1' }, error: null }))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }));

      await processDocumentJob(mockJob);

      // Verify progress updates
      expect(mockUpdateExtractionProgress).toHaveBeenCalledWith('doc-123', expect.objectContaining({
        status: 'queued',
        progress: 0,
      }));

      expect(mockUpdateExtractionProgress).toHaveBeenCalledWith('doc-123', expect.objectContaining({
        status: 'downloading',
        progress: 5,
      }));

      expect(mockUpdateExtractionProgress).toHaveBeenCalledWith('doc-123', expect.objectContaining({
        status: 'extracting_text',
        progress: 8,
      }));

      expect(mockUpdateExtractionProgress).toHaveBeenCalledWith('doc-123', expect.objectContaining({
        status: 'completed',
        progress: 100,
      }));
    });

    it('should handle progress update failures gracefully', async () => {
      const mockJob = createMockJob();
      const mockBlob = {
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      };

      mockStorageFrom.mockReturnValue(createStorageMock(mockBlob));
      mockUpdateExtractionProgress.mockRejectedValue(new Error('Progress update failed'));

      mockFromFn
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createUpdateSelectMock({
          data: { id: 'doc-123', extraction_status: 'COMPLETED' },
          error: null,
        }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createInsertMock({ data: { id: 'log-1' }, error: null }))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }));

      // Should not throw even if progress updates fail
      await processDocumentJob(mockJob);
    });
  });

  describe('Background Job Status', () => {
    it('should update background job status to RUNNING at start', async () => {
      const mockJob = createMockJob();
      const mockBlob = {
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      };

      mockStorageFrom.mockReturnValue(createStorageMock(mockBlob));

      let jobUpdateData: any;
      mockFromFn
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createUpdateSelectMock({
          data: { id: 'doc-123', extraction_status: 'COMPLETED' },
          error: null,
        }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce({
          update: jest.fn((data) => {
            jobUpdateData = data;
            return {
              eq: jest.fn().mockReturnValue(Promise.resolve({ error: null })),
            };
          }),
        })
        .mockReturnValueOnce(createInsertMock({ data: { id: 'log-1' }, error: null }))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }));

      await processDocumentJob(mockJob);

      expect(jobUpdateData.status).toBe('RUNNING');
    });

    it('should update background job status to COMPLETED on success', async () => {
      const mockJob = createMockJob();
      const mockBlob = {
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      };

      mockStorageFrom.mockReturnValue(createStorageMock(mockBlob));

      mockFromFn
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createUpdateSelectMock({
          data: { id: 'doc-123', extraction_status: 'COMPLETED' },
          error: null,
        }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createInsertMock({ data: { id: 'log-1' }, error: null }))
        .mockReturnValueOnce(createJobQueryMock([{ id: 'job-1', payload: {} }]))
        .mockReturnValueOnce(createUpdateMock({ error: null }));

      await processDocumentJob(mockJob);

      expect(mockFromFn).toHaveBeenCalledWith('background_jobs');
    });

    it('should handle missing background job gracefully', async () => {
      const mockJob = createMockJob();
      const mockBlob = {
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      };

      mockStorageFrom.mockReturnValue(createStorageMock(mockBlob));

      mockFromFn
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createUpdateMock({ error: null }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createUpdateSelectMock({
          data: { id: 'doc-123', extraction_status: 'COMPLETED' },
          error: null,
        }))
        .mockReturnValueOnce(createObligationsQueryMock([]))
        .mockReturnValueOnce(createJobQueryMock([]))
        .mockReturnValueOnce(createInsertMock({ data: { id: 'log-1' }, error: null }))
        .mockReturnValueOnce(createJobQueryMock([]))
        .mockReturnValueOnce(createJobQueryMock([]));

      // Should complete even if no background job found
      await processDocumentJob(mockJob);
    });
  });

  describe('DocumentProcessingJobData interface', () => {
    it('should accept valid job data', () => {
      const data: DocumentProcessingJobData = {
        document_id: 'doc-123',
        company_id: 'company-1',
        site_id: 'site-1',
        module_id: 'waste',
        file_path: 'documents/test.pdf',
      };

      expect(data.document_id).toBe('doc-123');
      expect(data.company_id).toBe('company-1');
      expect(data.site_id).toBe('site-1');
      expect(data.module_id).toBe('waste');
      expect(data.file_path).toBe('documents/test.pdf');
    });

    it('should accept optional fields', () => {
      const data: DocumentProcessingJobData = {
        document_id: 'doc-123',
        company_id: 'company-1',
        site_id: 'site-1',
        module_id: 'waste',
        file_path: 'documents/test.pdf',
        document_type: 'PERMIT',
        regulator: 'EPA',
        permit_reference: 'EPA-2024-001',
      };

      expect(data.document_type).toBe('PERMIT');
      expect(data.regulator).toBe('EPA');
      expect(data.permit_reference).toBe('EPA-2024-001');
    });
  });
});
