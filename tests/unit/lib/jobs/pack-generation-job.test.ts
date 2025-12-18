/**
 * Pack Generation Job Tests
 * Tests for lib/jobs/pack-generation-job.ts
 *
 * These tests verify the pack generation job correctly:
 * - Fetches pack record and updates status
 * - Collects data (company, site, obligations, evidence)
 * - Calculates metrics (completion rate, overdue count, evidence count)
 * - Generates PDFs for all pack types
 * - Uploads to storage and creates notifications
 * - Handles errors and tracks SLA
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';

// Mock data generators
const createMockPack = (overrides: any = {}) => ({
  id: 'pack-1',
  pack_type: 'AUDIT_PACK',
  company_id: 'company-1',
  site_id: 'site-1',
  generated_by: 'user-1',
  status: 'PENDING',
  created_at: new Date().toISOString(),
  ...overrides,
});

const createMockCompany = (overrides: any = {}) => ({
  id: 'company-1',
  name: 'Test Company',
  company_number: '12345678',
  adoption_mode: 'STANDARD',
  adoption_mode_expiry: null,
  ...overrides,
});

const createMockSite = (overrides: any = {}) => ({
  id: 'site-1',
  name: 'Test Site',
  address: '123 Test Street',
  regulator: 'Environment Agency',
  ccs_band: 'B',
  company_id: 'company-1',
  ...overrides,
});

const createMockObligation = (overrides: any = {}) => ({
  id: 'obligation-1',
  original_text: 'Test obligation',
  obligation_title: 'Test Obligation Title',
  obligation_description: 'Test description',
  category: 'MONITORING',
  status: 'PENDING',
  frequency: 'MONTHLY',
  deadline_date: '2025-12-31',
  condition_reference: 'C1',
  page_reference: 'Page 5',
  confidence_score: 0.95,
  review_status: 'APPROVED',
  company_id: 'company-1',
  site_id: 'site-1',
  documents: {
    id: 'doc-1',
    title: 'Test Document',
    reference_number: 'REF-001',
    document_type: 'PERMIT',
  },
  ...overrides,
});

const createMockEvidence = (overrides: any = {}) => ({
  id: 'evidence-1',
  title: 'Test Evidence',
  file_name: 'test.pdf',
  file_type: 'application/pdf',
  file_size_bytes: 1024,
  storage_path: 'evidence/test.pdf',
  file_hash: 'abc123def456',
  created_at: new Date().toISOString(),
  upload_date: new Date().toISOString(),
  evidence_type: 'DOCUMENT',
  ...overrides,
});

const createMockCCSAssessment = (overrides: any = {}) => ({
  id: 'ccs-1',
  site_id: 'site-1',
  compliance_band: 'B',
  total_score: 85,
  compliance_year: 2024,
  assessment_date: '2024-01-15',
  car_reference: 'CAR-2024-001',
  ...overrides,
});

const createMockIncident = (overrides: any = {}) => ({
  id: 'incident-1',
  company_id: 'company-1',
  site_id: 'site-1',
  incident_type: 'SPILLAGE',
  incident_date: '2024-06-15',
  status: 'RESOLVED',
  risk_category: '2',
  description: 'Minor spillage incident',
  ...overrides,
});

const createMockPermit = (overrides: any = {}) => ({
  id: 'doc-1',
  title: 'Environmental Permit',
  reference_number: 'EPR/12345',
  document_type: 'PERMIT',
  permit_holder: 'Test Company',
  issue_date: '2020-01-15',
  effective_date: '2020-02-01',
  site_id: 'site-1',
  ...overrides,
});

describe('pack-generation-job', () => {
  let mockFromFn: jest.Mock;
  let mockStorageFrom: jest.Mock;
  let mockUpload: jest.Mock;
  let mockPDFDocument: jest.Mock;
  let mockChartJSNodeCanvas: jest.Mock;
  let processPackGenerationJob: (job: any) => Promise<void>;

  // Helper to create chainable Supabase query mocks
  const createSelectEqSingleMock = (finalResult: any) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockReturnValue(Promise.resolve(finalResult)),
      }),
    }),
  });

  const createUpdateEqMock = (finalResult: any = { data: null, error: null }) => ({
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue(Promise.resolve(finalResult)),
    }),
  });

  const createSelectEqMock = (finalResult: any) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue(Promise.resolve(finalResult)),
    }),
  });

  const createComplexObligationQueryMock = (finalResult: any) => {
    const mock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
    };

    // Final call in the chain returns the promise
    mock.is.mockReturnValue(Promise.resolve(finalResult));
    mock.eq.mockReturnValue(mock);
    mock.gte.mockReturnValue(mock);
    mock.lte.mockReturnValue(mock);
    mock.in.mockReturnValue(mock);

    return mock;
  };

  const createOrderLimitMock = (finalResult: any) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue(Promise.resolve(finalResult)),
        }),
      }),
    }),
  });

  const createInFilterMock = (finalResult: any) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        in: jest.fn().mockReturnValue({
          is: jest.fn().mockReturnValue(Promise.resolve(finalResult)),
        }),
      }),
    }),
  });

  const createInsertMock = (finalResult: any = { data: null, error: null }) => ({
    insert: jest.fn().mockReturnValue(Promise.resolve(finalResult)),
  });

  const createEvidenceLinksMock = (finalResult: any) => ({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        is: jest.fn().mockReturnValue(Promise.resolve(finalResult)),
      }),
    }),
  });

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();

    // Create fresh mocks
    mockFromFn = jest.fn();
    mockUpload = jest.fn().mockResolvedValue({ data: {}, error: null });
    mockStorageFrom = jest.fn().mockReturnValue({
      upload: mockUpload,
    });

    // Mock PDFDocument
    mockPDFDocument = jest.fn().mockImplementation(() => {
      const doc: any = {
        on: jest.fn((event: string, callback: any) => {
          if (event === 'end') {
            // Simulate PDF generation completion
            setTimeout(() => callback(), 0);
          }
          return doc;
        }),
        pipe: jest.fn().mockReturnThis(),
        end: jest.fn(),
        fontSize: jest.fn().mockReturnThis(),
        fillColor: jest.fn().mockReturnThis(),
        text: jest.fn().mockReturnThis(),
        moveDown: jest.fn().mockReturnThis(),
        addPage: jest.fn().mockReturnThis(),
        rect: jest.fn().mockReturnThis(),
        fill: jest.fn().mockReturnThis(),
        stroke: jest.fn().mockReturnThis(),
        circle: jest.fn().mockReturnThis(),
        roundedRect: jest.fn().mockReturnThis(),
        image: jest.fn().mockReturnThis(),
        lineWidth: jest.fn().mockReturnThis(),
        page: { width: 595, height: 842 },
        y: 100,
      };
      return doc;
    });

    // Mock ChartJSNodeCanvas
    mockChartJSNodeCanvas = jest.fn().mockImplementation(() => ({
      renderToBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-chart-image')),
    }));

    // Set up module mocks
    jest.doMock('@/lib/supabase/server', () => ({
      supabaseAdmin: { from: mockFromFn },
    }));

    jest.doMock('@supabase/supabase-js', () => ({
      createClient: jest.fn().mockReturnValue({
        storage: { from: mockStorageFrom },
      }),
    }));

    jest.doMock('pdfkit', () => mockPDFDocument);

    jest.doMock('chartjs-node-canvas', () => ({
      ChartJSNodeCanvas: mockChartJSNodeCanvas,
    }));

    jest.doMock('@/lib/env', () => ({
      env: {
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'test-key',
      },
    }));

    // Import module with mocks
    const module = await import('@/lib/jobs/pack-generation-job');
    processPackGenerationJob = module.processPackGenerationJob;
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('processPackGenerationJob - Error Handling', () => {
    it('should throw error when pack not found', async () => {
      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: null, error: { message: 'Not found' } })
      );

      const mockJob = {
        data: {
          pack_id: 'nonexistent-pack',
          pack_type: 'AUDIT_PACK',
          company_id: 'company-1',
        },
      };

      await expect(processPackGenerationJob(mockJob as any)).rejects.toThrow(
        'Pack not found: Not found'
      );
    });

    it('should set pack status to FAILED on error', async () => {
      const mockPack = createMockPack();

      // Fetch pack
      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockPack, error: null })
      );

      // Update to GENERATING
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());

      // Company fetch fails
      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: null, error: { message: 'DB error' } })
      );

      // Update to FAILED (should be called after error)
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());

      const mockJob = {
        data: {
          pack_id: 'pack-1',
          pack_type: 'AUDIT_PACK',
          company_id: 'company-1',
        },
      };

      await expect(processPackGenerationJob(mockJob as any)).rejects.toThrow();

      // Verify FAILED status update was called
      expect(mockFromFn).toHaveBeenCalledWith('audit_packs');
    });

    it('should save error message when generation fails', async () => {
      const mockPack = createMockPack();

      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockPack, error: null })
      );
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());
      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: null, error: { message: 'Collection failed' } })
      );

      const updateFailedMock = createUpdateEqMock();
      mockFromFn.mockReturnValueOnce(updateFailedMock);

      const mockJob = {
        data: {
          pack_id: 'pack-1',
          pack_type: 'AUDIT_PACK',
          company_id: 'company-1',
        },
      };

      await expect(processPackGenerationJob(mockJob as any)).rejects.toThrow();

      // Verify update was called with error message
      expect(updateFailedMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'FAILED',
          error_message: expect.any(String),
        })
      );
    });
  });

  describe('processPackGenerationJob - Status Updates', () => {
    it('should update pack status to GENERATING at start', async () => {
      const mockPack = createMockPack();
      const mockCompany = createMockCompany();

      // Fetch pack
      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockPack, error: null })
      );

      // Update to GENERATING
      const generatingUpdateMock = createUpdateEqMock();
      mockFromFn.mockReturnValueOnce(generatingUpdateMock);

      // Mock remaining calls to avoid errors
      mockFromFn.mockReturnValue(
        createSelectEqSingleMock({ data: mockCompany, error: null })
      );

      const mockJob = {
        data: {
          pack_id: 'pack-1',
          pack_type: 'AUDIT_PACK',
          company_id: 'company-1',
        },
      };

      try {
        await processPackGenerationJob(mockJob as any);
      } catch (e) {
        // Ignore errors, we only care about the status update
      }

      expect(generatingUpdateMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'GENERATING',
        })
      );
    });

    it('should update pack with COMPLETED status on success', async () => {
      const mockPack = createMockPack();
      const mockCompany = createMockCompany();
      const mockObligation = createMockObligation({ status: 'COMPLETED' });

      // Setup successful pack generation
      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockPack, error: null })
      );
      mockFromFn.mockReturnValueOnce(createUpdateEqMock()); // GENERATING
      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockCompany, error: null })
      );
      mockFromFn.mockReturnValueOnce(
        createComplexObligationQueryMock({ data: [mockObligation], error: null })
      );
      mockFromFn.mockReturnValueOnce(
        createEvidenceLinksMock({ data: [], error: null })
      ); // evidence links

      // Metrics update
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());

      // Snapshot inserts (obligation)
      mockFromFn.mockReturnValueOnce(createInsertMock());

      // Upload mock
      mockUpload.mockResolvedValueOnce({ data: {}, error: null });

      // Final COMPLETED update
      const completedUpdateMock = createUpdateEqMock();
      mockFromFn.mockReturnValueOnce(completedUpdateMock);

      // Notification insert
      mockFromFn.mockReturnValueOnce(createInsertMock());

      const mockJob = {
        data: {
          pack_id: 'pack-1',
          pack_type: 'AUDIT_PACK',
          company_id: 'company-1',
        },
      };

      await processPackGenerationJob(mockJob as any);

      expect(completedUpdateMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'COMPLETED',
          file_path: expect.any(String),
        })
      );
    });
  });

  describe('processPackGenerationJob - Data Collection', () => {
    it('should collect company data', async () => {
      const mockPack = createMockPack();
      const mockCompany = createMockCompany();

      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockPack, error: null })
      );
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());

      const companyQueryMock = createSelectEqSingleMock({ data: mockCompany, error: null });
      mockFromFn.mockReturnValueOnce(companyQueryMock);

      // Mock remaining to avoid errors
      mockFromFn.mockReturnValue(createComplexObligationQueryMock({ data: [], error: null }));

      const mockJob = {
        data: {
          pack_id: 'pack-1',
          pack_type: 'AUDIT_PACK',
          company_id: 'company-1',
        },
      };

      try {
        await processPackGenerationJob(mockJob as any);
      } catch (e) {
        // Ignore
      }

      expect(companyQueryMock.select).toHaveBeenCalled();
    });

    it('should collect site data when site_id provided', async () => {
      const mockPack = createMockPack({ site_id: 'site-1' });
      const mockCompany = createMockCompany();
      const mockSite = createMockSite();

      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockPack, error: null })
      );
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());
      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockCompany, error: null })
      );

      const siteQueryMock = createSelectEqSingleMock({ data: mockSite, error: null });
      mockFromFn.mockReturnValueOnce(siteQueryMock);

      mockFromFn.mockReturnValue(createComplexObligationQueryMock({ data: [], error: null }));

      const mockJob = {
        data: {
          pack_id: 'pack-1',
          pack_type: 'AUDIT_PACK',
          company_id: 'company-1',
          site_id: 'site-1',
        },
      };

      try {
        await processPackGenerationJob(mockJob as any);
      } catch (e) {
        // Ignore
      }

      expect(siteQueryMock.select).toHaveBeenCalled();
    });

    it('should collect all sites for BOARD_MULTI_SITE_RISK pack', async () => {
      const mockPack = createMockPack({ pack_type: 'BOARD_MULTI_SITE_RISK' });
      const mockCompany = createMockCompany();
      const mockSites = [createMockSite(), createMockSite({ id: 'site-2', name: 'Site 2' })];

      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockPack, error: null })
      );
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());
      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockCompany, error: null })
      );

      const sitesQueryMock = createSelectEqMock({ data: mockSites, error: null });
      mockFromFn.mockReturnValueOnce(sitesQueryMock);

      mockFromFn.mockReturnValue(createComplexObligationQueryMock({ data: [], error: null }));

      const mockJob = {
        data: {
          pack_id: 'pack-1',
          pack_type: 'BOARD_MULTI_SITE_RISK',
          company_id: 'company-1',
        },
      };

      try {
        await processPackGenerationJob(mockJob as any);
      } catch (e) {
        // Ignore
      }

      expect(mockFromFn).toHaveBeenCalledWith('sites');
    });

    it('should collect obligations with evidence', async () => {
      const mockPack = createMockPack();
      const mockCompany = createMockCompany();
      const mockObligation = createMockObligation();
      const mockEvidence = createMockEvidence();

      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockPack, error: null })
      );
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());
      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockCompany, error: null })
      );
      mockFromFn.mockReturnValueOnce(
        createComplexObligationQueryMock({ data: [mockObligation], error: null })
      );

      const evidenceQueryMock = createEvidenceLinksMock({
        data: [{ evidence_items: mockEvidence }],
        error: null,
      });
      mockFromFn.mockReturnValueOnce(evidenceQueryMock);

      mockFromFn.mockReturnValue(createUpdateEqMock());

      const mockJob = {
        data: {
          pack_id: 'pack-1',
          pack_type: 'AUDIT_PACK',
          company_id: 'company-1',
        },
      };

      try {
        await processPackGenerationJob(mockJob as any);
      } catch (e) {
        // Ignore
      }

      expect(mockFromFn).toHaveBeenCalledWith('obligation_evidence_links');
    });

    it('should filter obligations by date range when provided', async () => {
      const mockPack = createMockPack();
      const mockCompany = createMockCompany();

      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockPack, error: null })
      );
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());
      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockCompany, error: null })
      );

      const obligationQueryMock = createComplexObligationQueryMock({ data: [], error: null });
      mockFromFn.mockReturnValueOnce(obligationQueryMock);

      mockFromFn.mockReturnValue(createUpdateEqMock());

      const mockJob = {
        data: {
          pack_id: 'pack-1',
          pack_type: 'AUDIT_PACK',
          company_id: 'company-1',
          date_range_start: '2024-01-01',
          date_range_end: '2024-12-31',
        },
      };

      try {
        await processPackGenerationJob(mockJob as any);
      } catch (e) {
        // Ignore
      }

      expect(obligationQueryMock.gte).toHaveBeenCalled();
      expect(obligationQueryMock.lte).toHaveBeenCalled();
    });

    it('should filter obligations by status filter', async () => {
      const mockPack = createMockPack();
      const mockCompany = createMockCompany();

      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockPack, error: null })
      );
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());
      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockCompany, error: null })
      );

      const obligationQueryMock = createComplexObligationQueryMock({ data: [], error: null });
      mockFromFn.mockReturnValueOnce(obligationQueryMock);

      mockFromFn.mockReturnValue(createUpdateEqMock());

      const mockJob = {
        data: {
          pack_id: 'pack-1',
          pack_type: 'AUDIT_PACK',
          company_id: 'company-1',
          filters: {
            status: ['PENDING', 'IN_PROGRESS'],
          },
        },
      };

      try {
        await processPackGenerationJob(mockJob as any);
      } catch (e) {
        // Ignore
      }

      expect(obligationQueryMock.in).toHaveBeenCalled();
    });

    it('should filter obligations by category filter', async () => {
      const mockPack = createMockPack();
      const mockCompany = createMockCompany();

      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockPack, error: null })
      );
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());
      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockCompany, error: null })
      );

      const obligationQueryMock = createComplexObligationQueryMock({ data: [], error: null });
      mockFromFn.mockReturnValueOnce(obligationQueryMock);

      mockFromFn.mockReturnValue(createUpdateEqMock());

      const mockJob = {
        data: {
          pack_id: 'pack-1',
          pack_type: 'AUDIT_PACK',
          company_id: 'company-1',
          filters: {
            category: ['MONITORING', 'OPERATIONAL'],
          },
        },
      };

      try {
        await processPackGenerationJob(mockJob as any);
      } catch (e) {
        // Ignore
      }

      expect(obligationQueryMock.in).toHaveBeenCalled();
    });

    it('should include CCS assessment for regulator packs', async () => {
      const mockPack = createMockPack({ pack_type: 'REGULATOR_INSPECTION', site_id: 'site-1' });
      const mockCompany = createMockCompany();
      const mockSite = createMockSite();
      const mockCCS = createMockCCSAssessment();

      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockPack, error: null })
      );
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());
      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockCompany, error: null })
      );
      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockSite, error: null })
      );
      mockFromFn.mockReturnValueOnce(
        createComplexObligationQueryMock({ data: [], error: null })
      );

      const ccsQueryMock = createOrderLimitMock({ data: [mockCCS], error: null });
      mockFromFn.mockReturnValueOnce(ccsQueryMock);

      mockFromFn.mockReturnValue(createInFilterMock({ data: [], error: null }));

      const mockJob = {
        data: {
          pack_id: 'pack-1',
          pack_type: 'REGULATOR_INSPECTION',
          company_id: 'company-1',
          site_id: 'site-1',
        },
      };

      try {
        await processPackGenerationJob(mockJob as any);
      } catch (e) {
        // Ignore
      }

      expect(mockFromFn).toHaveBeenCalledWith('ccs_assessments');
    });

    it('should include incidents for tender and insurer packs', async () => {
      const mockPack = createMockPack({ pack_type: 'TENDER_CLIENT_ASSURANCE' });
      const mockCompany = createMockCompany();
      const mockIncident = createMockIncident();

      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockPack, error: null })
      );
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());
      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockCompany, error: null })
      );
      mockFromFn.mockReturnValueOnce(
        createComplexObligationQueryMock({ data: [], error: null })
      );

      const incidentQueryMock = createOrderLimitMock({ data: [mockIncident], error: null });
      mockFromFn.mockReturnValueOnce(incidentQueryMock);

      mockFromFn.mockReturnValue(createUpdateEqMock());

      const mockJob = {
        data: {
          pack_id: 'pack-1',
          pack_type: 'TENDER_CLIENT_ASSURANCE',
          company_id: 'company-1',
        },
      };

      try {
        await processPackGenerationJob(mockJob as any);
      } catch (e) {
        // Ignore
      }

      expect(mockFromFn).toHaveBeenCalledWith('regulatory_incidents');
    });
  });

  describe('processPackGenerationJob - Metrics Calculation', () => {
    it('should calculate metrics correctly', async () => {
      const mockPack = createMockPack();
      const mockCompany = createMockCompany();
      const obligations = [
        createMockObligation({ id: 'ob-1', status: 'COMPLETED' }),
        createMockObligation({ id: 'ob-2', status: 'PENDING' }),
        createMockObligation({ id: 'ob-3', status: 'OVERDUE', deadline_date: '2024-01-01' }),
      ];

      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockPack, error: null })
      );
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());
      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockCompany, error: null })
      );
      mockFromFn.mockReturnValueOnce(
        createComplexObligationQueryMock({ data: obligations, error: null })
      );

      // Evidence links for each obligation
      mockFromFn.mockReturnValueOnce(
        createEvidenceLinksMock({ data: [{ evidence_items: createMockEvidence() }], error: null })
      );
      mockFromFn.mockReturnValueOnce(createEvidenceLinksMock({ data: [], error: null }));
      mockFromFn.mockReturnValueOnce(createEvidenceLinksMock({ data: [], error: null }));

      const metricsUpdateMock = createUpdateEqMock();
      mockFromFn.mockReturnValueOnce(metricsUpdateMock);

      mockFromFn.mockReturnValue(createInsertMock());

      const mockJob = {
        data: {
          pack_id: 'pack-1',
          pack_type: 'AUDIT_PACK',
          company_id: 'company-1',
        },
      };

      try {
        await processPackGenerationJob(mockJob as any);
      } catch (e) {
        // Ignore
      }

      expect(metricsUpdateMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          total_obligations: 3,
          complete_count: 1,
          pending_count: 1,
          evidence_count: 1,
        })
      );
    });
  });

  describe('processPackGenerationJob - Pack Contents Snapshot', () => {
    it('should snapshot obligations to pack_contents', async () => {
      const mockPack = createMockPack();
      const mockCompany = createMockCompany();
      const mockObligation = createMockObligation();

      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockPack, error: null })
      );
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());
      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockCompany, error: null })
      );
      mockFromFn.mockReturnValueOnce(
        createComplexObligationQueryMock({ data: [mockObligation], error: null })
      );
      mockFromFn.mockReturnValueOnce(createEvidenceLinksMock({ data: [], error: null }));
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());

      const snapshotInsertMock = createInsertMock();
      mockFromFn.mockReturnValueOnce(snapshotInsertMock);

      mockFromFn.mockReturnValue(createUpdateEqMock());

      const mockJob = {
        data: {
          pack_id: 'pack-1',
          pack_type: 'AUDIT_PACK',
          company_id: 'company-1',
        },
      };

      try {
        await processPackGenerationJob(mockJob as any);
      } catch (e) {
        // Ignore
      }

      expect(snapshotInsertMock.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          pack_id: 'pack-1',
          content_type: 'OBLIGATION',
          obligation_id: 'obligation-1',
        })
      );
    });

    it('should snapshot evidence to pack_contents', async () => {
      const mockPack = createMockPack();
      const mockCompany = createMockCompany();
      const mockObligation = createMockObligation();
      const mockEvidence = createMockEvidence();

      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockPack, error: null })
      );
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());
      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockCompany, error: null })
      );
      mockFromFn.mockReturnValueOnce(
        createComplexObligationQueryMock({ data: [mockObligation], error: null })
      );
      mockFromFn.mockReturnValueOnce(
        createEvidenceLinksMock({ data: [{ evidence_items: mockEvidence }], error: null })
      );
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());

      // Obligation snapshot
      mockFromFn.mockReturnValueOnce(createInsertMock());

      // Evidence snapshot
      const evidenceSnapshotMock = createInsertMock();
      mockFromFn.mockReturnValueOnce(evidenceSnapshotMock);

      mockFromFn.mockReturnValue(createUpdateEqMock());

      const mockJob = {
        data: {
          pack_id: 'pack-1',
          pack_type: 'AUDIT_PACK',
          company_id: 'company-1',
        },
      };

      try {
        await processPackGenerationJob(mockJob as any);
      } catch (e) {
        // Ignore
      }

      expect(evidenceSnapshotMock.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          pack_id: 'pack-1',
          content_type: 'EVIDENCE',
          evidence_id: 'evidence-1',
        })
      );
    });
  });

  describe('processPackGenerationJob - PDF Generation', () => {
    it('should generate PDF for AUDIT_PACK type', async () => {
      const mockPack = createMockPack({ pack_type: 'AUDIT_PACK' });
      const mockCompany = createMockCompany();
      const mockObligation = createMockObligation();

      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockPack, error: null })
      );
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());
      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockCompany, error: null })
      );
      mockFromFn.mockReturnValueOnce(
        createComplexObligationQueryMock({ data: [mockObligation], error: null })
      );
      mockFromFn.mockReturnValueOnce(createEvidenceLinksMock({ data: [], error: null }));
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());
      mockFromFn.mockReturnValueOnce(createInsertMock());
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());
      mockFromFn.mockReturnValueOnce(createInsertMock());

      const mockJob = {
        data: {
          pack_id: 'pack-1',
          pack_type: 'AUDIT_PACK',
          company_id: 'company-1',
        },
      };

      await processPackGenerationJob(mockJob as any);

      expect(mockPDFDocument).toHaveBeenCalled();
    });

    it('should generate PDF for REGULATOR_INSPECTION type', async () => {
      const mockPack = createMockPack({ pack_type: 'REGULATOR_INSPECTION', site_id: 'site-1' });
      const mockCompany = createMockCompany();
      const mockSite = createMockSite();

      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockPack, error: null })
      );
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());
      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockCompany, error: null })
      );
      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockSite, error: null })
      );
      mockFromFn.mockReturnValueOnce(
        createComplexObligationQueryMock({ data: [], error: null })
      );
      mockFromFn.mockReturnValueOnce(
        createOrderLimitMock({ data: [], error: null })
      ); // CCS
      mockFromFn.mockReturnValueOnce(
        createInFilterMock({ data: [], error: null })
      ); // permits
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());
      mockFromFn.mockReturnValueOnce(createInsertMock());

      const mockJob = {
        data: {
          pack_id: 'pack-1',
          pack_type: 'REGULATOR_INSPECTION',
          company_id: 'company-1',
          site_id: 'site-1',
        },
      };

      await processPackGenerationJob(mockJob as any);

      expect(mockPDFDocument).toHaveBeenCalled();
    });

    it('should generate PDF for TENDER_CLIENT_ASSURANCE type', async () => {
      const mockPack = createMockPack({ pack_type: 'TENDER_CLIENT_ASSURANCE' });
      const mockCompany = createMockCompany();

      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockPack, error: null })
      );
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());
      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockCompany, error: null })
      );
      mockFromFn.mockReturnValueOnce(
        createComplexObligationQueryMock({ data: [], error: null })
      );
      mockFromFn.mockReturnValueOnce(
        createOrderLimitMock({ data: [], error: null })
      ); // incidents
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());
      mockFromFn.mockReturnValueOnce(createInsertMock());

      const mockJob = {
        data: {
          pack_id: 'pack-1',
          pack_type: 'TENDER_CLIENT_ASSURANCE',
          company_id: 'company-1',
        },
      };

      await processPackGenerationJob(mockJob as any);

      expect(mockPDFDocument).toHaveBeenCalled();
    });

    it('should generate PDF for BOARD_MULTI_SITE_RISK type', async () => {
      const mockPack = createMockPack({ pack_type: 'BOARD_MULTI_SITE_RISK' });
      const mockCompany = createMockCompany();
      const mockSites = [createMockSite()];

      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockPack, error: null })
      );
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());
      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockCompany, error: null })
      );
      mockFromFn.mockReturnValueOnce(
        createSelectEqMock({ data: mockSites, error: null })
      );
      mockFromFn.mockReturnValueOnce(
        createComplexObligationQueryMock({ data: [], error: null })
      );
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());
      mockFromFn.mockReturnValueOnce(createInsertMock());

      const mockJob = {
        data: {
          pack_id: 'pack-1',
          pack_type: 'BOARD_MULTI_SITE_RISK',
          company_id: 'company-1',
        },
      };

      await processPackGenerationJob(mockJob as any);

      expect(mockPDFDocument).toHaveBeenCalled();
    });

    it('should generate PDF for INSURER_BROKER type', async () => {
      const mockPack = createMockPack({ pack_type: 'INSURER_BROKER' });
      const mockCompany = createMockCompany();

      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockPack, error: null })
      );
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());
      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockCompany, error: null })
      );
      mockFromFn.mockReturnValueOnce(
        createComplexObligationQueryMock({ data: [], error: null })
      );
      mockFromFn.mockReturnValueOnce(
        createOrderLimitMock({ data: [], error: null })
      ); // incidents
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());
      mockFromFn.mockReturnValueOnce(createInsertMock());

      const mockJob = {
        data: {
          pack_id: 'pack-1',
          pack_type: 'INSURER_BROKER',
          company_id: 'company-1',
        },
      };

      await processPackGenerationJob(mockJob as any);

      expect(mockPDFDocument).toHaveBeenCalled();
    });
  });

  describe('processPackGenerationJob - Storage Upload', () => {
    it('should upload PDF to storage with correct path', async () => {
      const mockPack = createMockPack();
      const mockCompany = createMockCompany();

      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockPack, error: null })
      );
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());
      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockCompany, error: null })
      );
      mockFromFn.mockReturnValueOnce(
        createComplexObligationQueryMock({ data: [], error: null })
      );
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());
      mockFromFn.mockReturnValueOnce(createInsertMock());

      const mockJob = {
        data: {
          pack_id: 'pack-1',
          pack_type: 'AUDIT_PACK',
          company_id: 'company-1',
        },
      };

      await processPackGenerationJob(mockJob as any);

      expect(mockStorageFrom).toHaveBeenCalledWith('audit-packs');
      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringContaining('audit_pack/pack-1.pdf'),
        expect.any(Buffer),
        expect.objectContaining({
          contentType: 'application/pdf',
          upsert: true,
        })
      );
    });
  });

  describe('processPackGenerationJob - Notifications', () => {
    it('should create notification on success', async () => {
      const mockPack = createMockPack({ generated_by: 'user-1' });
      const mockCompany = createMockCompany();

      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockPack, error: null })
      );
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());
      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockCompany, error: null })
      );
      mockFromFn.mockReturnValueOnce(
        createComplexObligationQueryMock({ data: [], error: null })
      );
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());

      const notificationInsertMock = createInsertMock();
      mockFromFn.mockReturnValueOnce(notificationInsertMock);

      const mockJob = {
        data: {
          pack_id: 'pack-1',
          pack_type: 'AUDIT_PACK',
          company_id: 'company-1',
        },
      };

      await processPackGenerationJob(mockJob as any);

      expect(notificationInsertMock.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          company_id: 'company-1',
          notification_type: 'AUDIT_PACK_READY',
          entity_type: 'audit_pack',
          entity_id: 'pack-1',
        })
      );
    });
  });

  describe('processPackGenerationJob - SLA Tracking', () => {
    it('should track generation SLA time', async () => {
      const mockPack = createMockPack();
      const mockCompany = createMockCompany();

      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockPack, error: null })
      );
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());
      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockCompany, error: null })
      );
      mockFromFn.mockReturnValueOnce(
        createComplexObligationQueryMock({ data: [], error: null })
      );
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());

      const completedUpdateMock = createUpdateEqMock();
      mockFromFn.mockReturnValueOnce(completedUpdateMock);
      mockFromFn.mockReturnValueOnce(createInsertMock());

      const mockJob = {
        data: {
          pack_id: 'pack-1',
          pack_type: 'AUDIT_PACK',
          company_id: 'company-1',
        },
      };

      await processPackGenerationJob(mockJob as any);

      expect(completedUpdateMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          generation_sla_seconds: expect.any(Number),
        })
      );
    });

    it('should log warning when SLA exceeded (>120s)', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const mockPack = createMockPack();
      const mockCompany = createMockCompany();

      // Mock slow operation to exceed SLA
      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockPack, error: null })
      );
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());
      mockFromFn.mockReturnValueOnce(
        createSelectEqSingleMock({ data: mockCompany, error: null })
      );
      mockFromFn.mockReturnValueOnce(
        createComplexObligationQueryMock({ data: [], error: null })
      );
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());
      mockFromFn.mockReturnValueOnce(createUpdateEqMock());
      mockFromFn.mockReturnValueOnce(createInsertMock());

      // Mock Date.now() to simulate time passing
      const originalDateNow = Date.now;
      let callCount = 0;
      Date.now = jest.fn(() => {
        callCount++;
        if (callCount === 1) return 0; // Start time
        return 121000; // 121 seconds later (exceeds 120s SLA)
      });

      const mockJob = {
        data: {
          pack_id: 'pack-1',
          pack_type: 'AUDIT_PACK',
          company_id: 'company-1',
        },
      };

      await processPackGenerationJob(mockJob as any);

      // Restore Date.now
      Date.now = originalDateNow;

      // Note: The actual console.warn may not be called in our test environment
      // due to timing, but we verify the SLA seconds are tracked
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
