/**
 * Report Generation Endpoint
 * POST /api/v1/reports/generate - Generate a report based on configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { reportBuilderService } from '@/lib/services/report-builder-service';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Get user's company_id
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.company_id) {
      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to get user company',
        500,
        { error: userError?.message },
        { request_id: requestId }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.dataType || !body.columns || !Array.isArray(body.columns)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid report configuration',
        422,
        {
          dataType: !body.dataType ? 'Required field' : undefined,
          columns: !body.columns || !Array.isArray(body.columns) ? 'Must be an array' : undefined
        },
        { request_id: requestId }
      );
    }

    // Add company filter
    const config = {
      ...body,
      companyId: userData.company_id,
    };

    // Generate report
    const result = await reportBuilderService.generateReport(config);

    const response = successResponse(
      result,
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Generate report error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}
