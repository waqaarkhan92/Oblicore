/**
 * Mock Data Generators
 * Generate realistic test data for all entities
 */

export const mockDocument = {
  simple: `
ENVIRONMENTAL PERMIT

Permit Number: EPR/AB1234CD/A001
Issue Date: 2024-01-15
Regulator: Environment Agency

CONDITION 1: MONITORING
The operator shall monitor stack emissions quarterly.

CONDITION 2: REPORTING
The operator shall submit monitoring reports within 28 days.

CONDITION 3: WASTE STORAGE
Waste shall be stored in designated areas only.
  `.trim(),

  complex: `
ENVIRONMENTAL PERMIT

Permit Number: EPR/XY9876ZW/V003
Multiple Regulators: Environment Agency, HSE
Issue Date: 2023-06-01

This permit supersedes EPR/XY9876ZW/V002 dated 2020-03-15.

CONDITION 1.1: EMISSIONS MONITORING
The operator shall continuously monitor emissions using CEMS.
Breakthrough detection required with 95% confidence interval.
Formula: Concentration (mg/m³) = (Mass × 1000) / (Volume × Time)

CONDITION 1.2: COMPLEX CALCULATION
Maximum hourly emission rate = (BAT-AEL × production rate) / efficiency factor
Where BAT-AEL varies by temperature and pressure conditions.

[... 100 more complex conditions ...]
  `.trim(),

  multiRegulator: `
COMBINED PERMIT

Environment Agency Permit: EPR/AB1234CD
HSE Registration: HSE/REG/5678
Local Authority Approval: LA/2024/001

Multiple regulators require different reporting schedules.
  `.trim(),
};

export const mockObligation = {
  valid: {
    obligation_title: 'Monitor stack emissions quarterly',
    obligation_description: 'The operator shall monitor stack emissions on a quarterly basis using approved methods.',
    category: 'MONITORING',
    frequency: 'QUARTERLY',
    status: 'PENDING',
    deadline_date: '2025-03-31',
    is_subjective: false,
    confidence_score: 0.92,
  },

  withEvidence: {
    obligation_title: 'Submit annual environmental report',
    obligation_description: 'Annual environmental report must be submitted by March 31st.',
    category: 'REPORTING',
    frequency: 'ANNUALLY',
    status: 'COMPLETED',
    evidence_suggestions: ['Monitoring data', 'Lab reports', 'Incident logs'],
  },

  subjective: {
    obligation_title: 'Maintain adequate waste storage',
    obligation_description: 'Waste storage areas shall be maintained in good condition.',
    category: 'OPERATIONAL',
    is_subjective: true,
    confidence_score: 0.68,
  },
};

export const mockCompany = {
  name: 'Acme Environmental Ltd',
  registration_number: '12345678',
  address_line1: '123 Business Park',
  city: 'Manchester',
  postcode: 'M1 1AA',
  country: 'UK',
};

export const mockSite = {
  site_name: 'Manchester Production Facility',
  address_line1: '456 Industrial Estate',
  city: 'Manchester',
  postcode: 'M2 2BB',
  country: 'UK',
  site_type: 'MANUFACTURING',
};

export const mockUser = {
  email: 'test@example.com',
  password: 'SecurePassword123!',
  first_name: 'Test',
  last_name: 'User',
  role: 'MANAGER',
};

/**
 * Generate mock extraction result
 */
export function mockExtractionResult(obligationCount: number = 5) {
  return {
    obligations: Array.from({ length: obligationCount }, (_, i) => ({
      condition_reference: `CONDITION ${i + 1}`,
      title: `Test Obligation ${i + 1}`,
      description: `Description for obligation ${i + 1}`,
      category: ['MONITORING', 'REPORTING', 'OPERATIONAL'][i % 3],
      frequency: ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY'][i % 5],
      confidence_score: 0.85 + (i * 0.02),
    })),
    metadata: {
      permit_reference: 'EPR/AB1234CD/A001',
      regulator: 'Environment Agency',
      extraction_confidence: 0.9,
    },
    ruleLibraryMatches: [],
    usedLLM: true,
    extractionTimeMs: 3500,
    tokenUsage: {
      inputTokens: 8000,
      outputTokens: 1500,
      totalTokens: 9500,
      model: 'gpt-4o-mini',
      estimatedCost: 0.0142,
    },
    complexity: 'simple' as const,
  };
}

/**
 * Generate mock OpenAI response
 */
export function mockOpenAIResponse(obligationCount: number = 5) {
  return {
    content: JSON.stringify({
      obligations: Array.from({ length: obligationCount }, (_, i) => ({
        condition_reference: `CONDITION ${i + 1}`,
        title: `Obligation ${i + 1}`,
        description: `Description ${i + 1}`,
        category: 'MONITORING',
        frequency: 'QUARTERLY',
      })),
      extraction_metadata: {
        extraction_confidence: 0.9,
      },
      document_metadata: {
        permit_reference: 'EPR/TEST/001',
      },
    }),
    model: 'gpt-4o-mini',
    usage: {
      prompt_tokens: 8000,
      completion_tokens: 1500,
      total_tokens: 9500,
    },
    finish_reason: 'stop',
    complexity: 'simple' as const,
  };
}

/**
 * Create mock PDF buffer
 */
export function mockPDFBuffer(): Buffer {
  // Minimal valid PDF structure
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test Document) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000214 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
307
%%EOF`;

  return Buffer.from(pdfContent);
}

/**
 * Create mock PNG image buffer
 */
export function mockPNGBuffer(): Buffer {
  // Minimal valid PNG structure (1x1 pixel transparent PNG)
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, // IDAT chunk
    0x54, 0x78, 0x9c, 0x62, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, // IEND chunk
    0x42, 0x60, 0x82,
  ]);
}

/**
 * Create mock JPEG image buffer
 */
export function mockJPEGBuffer(): Buffer {
  // Minimal valid JPEG structure
  return Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, // JPEG header
    0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
    0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
    0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c,
    0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d,
    0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
    0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
    0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
    0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34,
    0x32, 0xff, 0xd9, // End of image
  ]);
}

/**
 * Create mock CSV buffer
 */
export function mockCSVBuffer(): Buffer {
  const csvContent = `Date,Parameter,Value,Unit
2025-01-01,Temperature,25.5,°C
2025-01-02,pH,7.2,pH
2025-01-03,Turbidity,3.4,NTU`;
  return Buffer.from(csvContent);
}

/**
 * Mock evidence item data
 */
export const mockEvidence = {
  pdf: {
    file_name: 'monitoring-report.pdf',
    file_type: 'PDF',
    mime_type: 'application/pdf',
    description: 'Quarterly monitoring report',
    compliance_period: 'Q1-2025',
  },
  image: {
    file_name: 'site-inspection.jpg',
    file_type: 'IMAGE',
    mime_type: 'image/jpeg',
    description: 'Site inspection photograph',
    gps_latitude: 51.5074,
    gps_longitude: -0.1278,
  },
  csv: {
    file_name: 'emissions-data.csv',
    file_type: 'CSV',
    mime_type: 'text/csv',
    description: 'Monthly emissions monitoring data',
    compliance_period: 'January 2025',
  },
};
