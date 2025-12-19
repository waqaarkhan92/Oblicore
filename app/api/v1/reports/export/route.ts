/**
 * Report Export Endpoint
 * POST /api/v1/reports/export - Export a report result to various formats
 */

import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { reportBuilderService } from '@/lib/services/report-builder-service';

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.result || !body.format) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid export request',
        422,
        {
          result: !body.result ? 'Required field' : undefined,
          format: !body.format ? 'Required field' : undefined
        },
        { request_id: requestId }
      );
    }

    // Validate format
    const validFormats = ['csv', 'xlsx', 'json'];
    if (!validFormats.includes(body.format)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid export format',
        422,
        { format: `Must be one of: ${validFormats.join(', ')}` },
        { request_id: requestId }
      );
    }

    // Export report
    const buffer = await reportBuilderService.exportReport(body.result, {
      format: body.format,
      fileName: body.fileName,
      includeHeaders: body.includeHeaders !== false,
    });

    // Determine content type and filename
    const contentTypes: Record<string, string> = {
      csv: 'text/csv',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      json: 'application/json',
    };

    const fileName = body.fileName || `report_${Date.now()}`;
    const extension = body.format;

    // Return file as response
    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': contentTypes[body.format] || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileName}.${extension}"`,
        'X-Request-Id': requestId,
      },
    });
  } catch (error: any) {
    console.error('Export report error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}
