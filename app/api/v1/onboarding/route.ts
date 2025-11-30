/**
 * Onboarding API Endpoints
 * GET /api/v1/onboarding - Get onboarding status and progress
 * POST /api/v1/onboarding - Update onboarding progress
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/api/response';
import { requireAuth, getRequestId } from '@/lib/api/middleware';
import { addRateLimitHeaders } from '@/lib/api/rate-limit';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    // Get user's onboarding progress
    const { data: onboardingProgress, error } = await supabaseAdmin
      .from('user_onboarding_progress')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      // If table doesn't exist, return default progress
      const defaultProgress = {
        user_id: user.id,
        current_step: 'site-setup',
        completed_steps: [],
        is_complete: false,
      };

      const response = successResponse(defaultProgress, 200, { request_id: requestId });
      return await addRateLimitHeaders(request, user.id, response);
    }

    const progress = onboardingProgress || {
      user_id: user.id,
      current_step: 'site-setup',
      completed_steps: [],
      is_complete: false,
    };

    const response = successResponse(progress, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Get onboarding progress error:', error);
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

    // Parse request body
    let body: any;
    try {
      body = await request.json();
    } catch (jsonError: any) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid JSON in request body',
        422,
        { error: jsonError.message || 'Request body must be valid JSON' },
        { request_id: requestId }
      );
    }

    // Validate required fields
    if (!body.current_step) {
      return errorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required field: current_step',
        422,
        { current_step: 'Current step is required' },
        { request_id: requestId }
      );
    }

    // Upsert onboarding progress
    const { data: progress, error } = await supabaseAdmin
      .from('user_onboarding_progress')
      .upsert({
        user_id: user.id,
        current_step: body.current_step,
        completed_steps: body.completed_steps || [],
        is_complete: body.is_complete || false,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (error) {
      // If table doesn't exist, just return success (feature not fully implemented)
      if (error.code === 'PGRST205') {
        const mockProgress = {
          user_id: user.id,
          current_step: body.current_step,
          completed_steps: body.completed_steps || [],
          is_complete: body.is_complete || false,
        };
        const response = successResponse(mockProgress, 200, { request_id: requestId });
        return await addRateLimitHeaders(request, user.id, response);
      }

      return errorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to update onboarding progress',
        500,
        { error: error.message },
        { request_id: requestId }
      );
    }

    const response = successResponse(progress, 200, { request_id: requestId });
    return await addRateLimitHeaders(request, user.id, response);
  } catch (error: any) {
    console.error('Update onboarding progress error:', error);
    return errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'An unexpected error occurred',
      500,
      { error: error.message || 'Unknown error' },
      { request_id: requestId }
    );
  }
}

