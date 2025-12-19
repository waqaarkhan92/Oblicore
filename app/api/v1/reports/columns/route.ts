/**
 * Report Columns Endpoint
 * GET /api/v1/reports/columns?dataType=obligations - Get available columns for a data type
 */

import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { reportBuilderService } from '@/lib/services/report-builder-service';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Get data type from query params
    const { searchParams } = new URL(request.url);
    const dataType = searchParams.get('dataType');

    if (!dataType) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'dataType parameter is required',
        422,
        { dataType: 'Required parameter' },
        { request_id: requestId }
      );
    }

    // Get available columns
    const columns = reportBuilderService.getAvailableColumns(dataType);

    const response = successResponse(
      { columns },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Get report columns error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}
