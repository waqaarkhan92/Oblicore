/**
 * Report Configs Endpoint
 * GET /api/v1/reports/configs - List saved report configurations
 * POST /api/v1/reports/configs - Save a report configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';
import { reportBuilderService } from '@/lib/services/report-builder-service';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
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

    // Get report configs
    const configs = await reportBuilderService.getReportConfigs(userData.company_id);

    const response = successResponse(
      { configs },
      200,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Get report configs error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

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
    if (!body.name || !body.dataType || !body.columns || !Array.isArray(body.columns)) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid report configuration',
        422,
        {
          name: !body.name ? 'Required field' : undefined,
          dataType: !body.dataType ? 'Required field' : undefined,
          columns: !body.columns || !Array.isArray(body.columns) ? 'Must be an array' : undefined
        },
        { request_id: requestId }
      );
    }

    // Add user and company context
    const config = {
      ...body,
      createdBy: user.id,
      companyId: userData.company_id,
    };

    // Save config
    const configId = await reportBuilderService.saveReportConfig(config);

    const response = successResponse(
      { id: configId, message: 'Report configuration saved successfully' },
      201,
      { request_id: requestId }
    );
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Save report config error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}
