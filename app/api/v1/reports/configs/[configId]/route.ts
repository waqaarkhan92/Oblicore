/**
 * Report Config Detail Endpoint
 * DELETE /api/v1/reports/configs/[configId] - Delete a report configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { reportBuilderService } from '@/lib/services/report-builder-service';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { configId: string } }
) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { configId } = params;

    if (!configId) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Config ID is required',
        422,
        { configId: 'Required parameter' },
        { request_id: requestId }
      );
    }

    // Delete config
    await reportBuilderService.deleteReportConfig(configId);

    const response = successResponse(
      { message: 'Report configuration deleted successfully' },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Delete report config error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}
