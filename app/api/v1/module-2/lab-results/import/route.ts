/**
 * Module 2: Lab Results CSV/Excel Import Endpoint
 * POST /api/v1/module-2/lab-results/import - Bulk import lab results from CSV/Excel
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { requireModule } from '@/lib/api/module-check';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import * as XLSX from 'xlsx';

interface LabResultRow {
  parameter_name?: string;
  parameter_id?: string;
  sample_date: string;
  sample_id?: string;
  recorded_value: number;
  unit?: string;
  lab_reference?: string;
  notes?: string;
}

interface ImportResult {
  success: boolean;
  row_number: number;
  parameter_id?: string;
  lab_result_id?: string;
  error?: string;
  warning?: string;
  is_exceedance?: boolean;
  percentage_of_limit?: number;
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require authentication and appropriate role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Check Module 2 is activated
    const moduleCheck = await requireModule(user.company_id, 'MODULE_2');
    if (moduleCheck) {
      return moduleCheck;
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const siteId = formData.get('site_id') as string | null;
    const skipValidation = formData.get('skip_validation') === 'true';

    if (!file) {
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        'No file provided. Please upload a CSV or Excel file.',
        400,
        {},
        { request_id: requestId }
      );
    }

    if (!siteId) {
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        'site_id is required',
        400,
        {},
        { request_id: requestId }
      );
    }

    // Validate file type
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(csv|xlsx|xls)$/i)) {
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        'Invalid file type. Please upload a CSV or Excel file.',
        400,
        {},
        { request_id: requestId }
      );
    }

    // Verify site access
    const { data: site, error: siteError } = await supabaseAdmin
      .from('sites')
      .select('id, company_id, name')
      .eq('id', siteId)
      .eq('company_id', user.company_id)
      .single();

    if (siteError || !site) {
      return errorResponse(
        ErrorCodes.FORBIDDEN,
        'Access denied to this site',
        403,
        {},
        { request_id: requestId }
      );
    }

    // Get parameters for this site to validate against
    const { data: parameters, error: paramError } = await supabaseAdmin
      .from('parameters')
      .select('id, parameter_type, limit_value, unit, warning_threshold_percent')
      .eq('site_id', siteId)
      .eq('company_id', user.company_id)
      .eq('is_active', true);

    if (paramError) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch parameters',
        500,
        { error: paramError.message },
        { request_id: requestId }
      );
    }

    // Create a lookup map for parameters
    const parameterMap = new Map<string, any>();
    const parameterByName = new Map<string, any>();
    for (const param of parameters || []) {
      parameterMap.set(param.id, param);
      parameterByName.set(param.parameter_type.toLowerCase(), param);
    }

    // Parse the file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<any>(worksheet, { raw: false, dateNF: 'YYYY-MM-DD' });

    if (rows.length === 0) {
      return errorResponse(
        ErrorCodes.BAD_REQUEST,
        'File contains no data rows',
        400,
        {},
        { request_id: requestId }
      );
    }

    // Detect column mapping
    const columnMapping = detectLabResultColumns(Object.keys(rows[0]));

    // Validate and process rows
    const results: ImportResult[] = [];
    const labResultsToInsert: any[] = [];
    const exceedancesToInsert: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 for header row and 1-indexing

      try {
        // Extract values using column mapping
        const parameterName = row[columnMapping.parameter_name] || row[columnMapping.parameter_id];
        const sampleDate = row[columnMapping.sample_date];
        const recordedValue = parseFloat(row[columnMapping.recorded_value]);
        const sampleId = row[columnMapping.sample_id] || null;
        const unit = row[columnMapping.unit] || null;
        const labReference = row[columnMapping.lab_reference] || null;
        const notes = row[columnMapping.notes] || null;

        // Validate required fields
        if (!parameterName && !row[columnMapping.parameter_id]) {
          results.push({
            success: false,
            row_number: rowNumber,
            error: 'Missing parameter_name or parameter_id',
          });
          continue;
        }

        if (!sampleDate) {
          results.push({
            success: false,
            row_number: rowNumber,
            error: 'Missing sample_date',
          });
          continue;
        }

        if (isNaN(recordedValue)) {
          results.push({
            success: false,
            row_number: rowNumber,
            error: 'Invalid or missing recorded_value',
          });
          continue;
        }

        // Find the parameter
        let parameter = parameterMap.get(row[columnMapping.parameter_id]);
        if (!parameter && parameterName) {
          parameter = parameterByName.get(parameterName.toLowerCase());
        }

        if (!parameter) {
          results.push({
            success: false,
            row_number: rowNumber,
            error: `Parameter not found: ${parameterName || row[columnMapping.parameter_id]}`,
          });
          continue;
        }

        // Parse date
        const parsedDate = parseDate(sampleDate);
        if (!parsedDate) {
          results.push({
            success: false,
            row_number: rowNumber,
            error: `Invalid date format: ${sampleDate}`,
          });
          continue;
        }

        // Calculate percentage and exceedance
        const percentageOfLimit = (recordedValue / parameter.limit_value) * 100;
        const isExceedance = recordedValue > parameter.limit_value;

        // Prepare lab result record
        const labResult = {
          parameter_id: parameter.id,
          company_id: user.company_id,
          site_id: siteId,
          sample_date: parsedDate,
          sample_id: sampleId,
          recorded_value: recordedValue,
          unit: unit || parameter.unit,
          percentage_of_limit: percentageOfLimit,
          lab_reference: labReference,
          entry_method: 'CSV',
          is_exceedance: isExceedance,
          entered_by: user.id,
          notes: notes,
          _row_number: rowNumber, // Temp field for tracking
        };

        labResultsToInsert.push(labResult);

        // Prepare exceedance record if needed
        if (isExceedance) {
          exceedancesToInsert.push({
            parameter_id: parameter.id,
            company_id: user.company_id,
            site_id: siteId,
            recorded_value: recordedValue,
            limit_value: parameter.limit_value,
            percentage_of_limit: percentageOfLimit,
            recorded_date: parsedDate,
            status: 'OPEN',
            _row_number: rowNumber,
          });
        }

        results.push({
          success: true,
          row_number: rowNumber,
          parameter_id: parameter.id,
          is_exceedance: isExceedance,
          percentage_of_limit: Math.round(percentageOfLimit * 100) / 100,
          warning: isExceedance ? 'Exceedance detected - value exceeds limit' : undefined,
        });
      } catch (rowError: any) {
        results.push({
          success: false,
          row_number: rowNumber,
          error: rowError.message || 'Unknown error processing row',
        });
      }
    }

    // Batch insert lab results
    const successCount = labResultsToInsert.length;
    const errorCount = results.filter(r => !r.success).length;

    if (successCount > 0 && !skipValidation) {
      // Remove temp fields before insert
      const cleanLabResults = labResultsToInsert.map(({ _row_number, ...rest }) => rest);

      const { data: insertedResults, error: insertError } = await supabaseAdmin
        .from('lab_results')
        .insert(cleanLabResults)
        .select('id');

      if (insertError) {
        return errorResponse(
          ErrorCodes.INTERNAL_ERROR,
          'Failed to insert lab results',
          500,
          { error: insertError.message },
          { request_id: requestId }
        );
      }

      // Update results with inserted IDs
      if (insertedResults) {
        let insertIndex = 0;
        for (const result of results) {
          if (result.success && insertIndex < insertedResults.length) {
            result.lab_result_id = insertedResults[insertIndex].id;
            insertIndex++;
          }
        }
      }

      // Insert exceedances
      if (exceedancesToInsert.length > 0) {
        const cleanExceedances = exceedancesToInsert.map(({ _row_number, ...rest }) => ({
          ...rest,
          lab_result_id: results.find(r => r.row_number === _row_number)?.lab_result_id,
        })).filter(e => e.lab_result_id);

        const { error: exceedanceError } = await supabaseAdmin
          .from('exceedances')
          .insert(cleanExceedances);

        if (exceedanceError) {
          console.error('Failed to insert exceedances:', exceedanceError);
        }
      }
    }

    const response = successResponse(
      {
        imported: successCount,
        errors: errorCount,
        total_rows: rows.length,
        exceedances_detected: exceedancesToInsert.length,
        results: results,
        column_mapping: columnMapping,
        validation_only: skipValidation,
      },
      successCount > 0 ? 201 : 200,
      { request_id: requestId }
    );

    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Error in POST /api/v1/module-2/lab-results/import:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error',
      500,
      { error: error.message },
      { request_id: requestId }
    );
  }
}

/**
 * Detect column mapping from header row
 */
function detectLabResultColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {
    parameter_name: '',
    parameter_id: '',
    sample_date: '',
    sample_id: '',
    recorded_value: '',
    unit: '',
    lab_reference: '',
    notes: '',
  };

  const columnVariations: Record<string, string[]> = {
    parameter_name: ['parameter_name', 'parameter', 'param', 'parameter_type', 'type', 'analyte', 'determinand'],
    parameter_id: ['parameter_id', 'param_id', 'id'],
    sample_date: ['sample_date', 'date', 'sampling_date', 'collection_date', 'test_date', 'analysis_date'],
    sample_id: ['sample_id', 'sample', 'sample_ref', 'sample_reference', 'lab_sample_id'],
    recorded_value: ['recorded_value', 'value', 'result', 'concentration', 'measurement', 'reading'],
    unit: ['unit', 'units', 'uom'],
    lab_reference: ['lab_reference', 'lab_ref', 'certificate', 'cert_number', 'report_number'],
    notes: ['notes', 'comments', 'remarks', 'observations'],
  };

  for (const header of headers) {
    const normalizedHeader = header.toLowerCase().replace(/[_\s-]/g, '');

    for (const [field, variations] of Object.entries(columnVariations)) {
      if (mapping[field]) continue; // Already mapped

      for (const variation of variations) {
        const normalizedVariation = variation.toLowerCase().replace(/[_\s-]/g, '');
        if (normalizedHeader === normalizedVariation || normalizedHeader.includes(normalizedVariation)) {
          mapping[field] = header;
          break;
        }
      }
    }
  }

  return mapping;
}

/**
 * Parse date from various formats
 */
function parseDate(dateStr: string | Date): string | null {
  if (dateStr instanceof Date) {
    if (!isNaN(dateStr.getTime())) {
      return dateStr.toISOString().split('T')[0];
    }
    return null;
  }

  // Handle Excel serial date numbers
  if (!isNaN(Number(dateStr))) {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + Number(dateStr) * 86400000);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }

  // Try various date formats
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
    /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      let year, month, day;
      if (format === formats[0]) {
        [, year, month, day] = match;
      } else {
        [, day, month, year] = match;
      }
      const date = new Date(`${year}-${month}-${day}`);
      if (!isNaN(date.getTime())) {
        return `${year}-${month}-${day}`;
      }
    }
  }

  // Try native Date parsing as fallback
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch {
    // Ignore
  }

  return null;
}
