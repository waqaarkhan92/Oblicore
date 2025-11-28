/**
 * Excel Import Confirmation Endpoint
 * POST /api/v1/obligations/import/excel/{importId}/confirm - Confirm and execute import
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, requireRole, getRequestId } from '@/lib/api/middleware';
import { getQueue, QUEUE_NAMES } from '@/lib/queue/queue-manager';

export async function POST(
  request: NextRequest,
  { params }: { params: { importId: string } }
) {
  const requestId = getRequestId(request);

  try {
    // Require Owner, Admin, or Staff role
    const authResult = await requireRole(request, ['OWNER', 'ADMIN', 'STAFF']);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { importId } = params;

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const {
      skip_errors = false,
      create_missing_sites = false,
      create_missing_permits = true,
    } = body;

    // Get import - RLS will enforce access control
    const { data: excelImport, error } = await supabaseAdmin
      .from('excel_imports')
      .select('*')
      .eq('id', importId)
      .single();

    if (error || !excelImport) {
      if (error?.code === 'PGRST116') {
        return errorResponse(
          ErrorCodes.NOT_FOUND,
          'Import not found',
          404,
          null,
          { request_id: requestId }
        );
      }
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch import',
        500,
        { error: error?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    // Validate import status
    if (excelImport.status !== 'PENDING_REVIEW') {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        `Import cannot be confirmed. Current status: ${excelImport.status}`,
        422,
        { status: excelImport.status },
        { request_id: requestId }
      );
    }

    // Check if there are valid rows
    if (!excelImport.valid_rows || excelImport.valid_rows.length === 0) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'No valid rows to import',
        422,
        { valid_count: excelImport.valid_count },
        { request_id: requestId }
      );
    }

    // Update import options with confirmation options
    const updatedImportOptions = {
      ...excelImport.import_options,
      skip_errors,
      create_missing_sites,
      create_missing_permits,
    };

    // Update import status to PROCESSING (background job will create obligations)
    const { data: updatedImport, error: updateError } = await supabaseAdmin
      .from('excel_imports')
      .update({
        status: 'PROCESSING',
        import_options: updatedImportOptions,
        updated_at: new Date().toISOString(),
      })
      .eq('id', importId)
      .select('id, status, success_count, error_count, obligation_ids')
      .single();

    if (updateError || !updatedImport) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to confirm import',
        500,
        { error: updateError?.message || 'Unknown error' },
        { request_id: requestId }
      );
    }

    // Enqueue background job for bulk creation phase
    try {
      const documentQueue = getQueue(QUEUE_NAMES.DOCUMENT_PROCESSING);

      // Create background_jobs record
      const { data: jobRecord, error: jobError } = await supabaseAdmin
        .from('background_jobs')
        .insert({
          job_type: 'EXCEL_IMPORT_PROCESSING',
          status: 'PENDING',
          priority: 'NORMAL',
          entity_type: 'excel_imports',
          entity_id: updatedImport.id,
          company_id: excelImport.company_id,
          payload: JSON.stringify({
            import_id: updatedImport.id,
            phase: 'BULK_CREATION',
          }),
        })
        .select('id')
        .single();

      if (!jobError && jobRecord) {
        // Enqueue job in BullMQ
        await documentQueue.add(
          'EXCEL_IMPORT_PROCESSING',
          {
            import_id: updatedImport.id,
            phase: 'BULK_CREATION',
          },
          {
            jobId: jobRecord.id,
            priority: 5, // Normal priority
          }
        );
      } else {
        console.error('Failed to create background job record:', jobError);
      }
    } catch (error: any) {
      console.error('Failed to enqueue Excel import bulk creation job:', error);
      // Continue anyway - job can be retried manually
    }

    const estimatedCount = excelImport.valid_count || 0;

    return successResponse(
      {
        import_id: updatedImport.id,
        status: 'PROCESSING', // Background job will update to COMPLETED
        success_count: updatedImport.success_count || 0,
        error_count: updatedImport.error_count || 0,
        obligation_ids: updatedImport.obligation_ids || [],
        message: `Import confirmed. ${estimatedCount} obligations will be created.`,
      },
      200,
      { request_id: requestId }
    );
  } catch (error: any) {
    console.error('Confirm excel import error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

