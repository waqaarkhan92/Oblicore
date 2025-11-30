/**
 * Onboarding Analytics API Endpoint
 * Returns onboarding metrics and analytics
 * Reference: docs/specs/63_Frontend_Onboarding_Flow.md Section 15
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOnboardingMetrics, getStepMetrics, getOnboardingFunnel } from '@/lib/analytics/onboarding-analytics';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date') 
      ? new Date(searchParams.get('start_date')!)
      : undefined;
    const endDate = searchParams.get('end_date')
      ? new Date(searchParams.get('end_date')!)
      : undefined;
    const step = searchParams.get('step');
    const type = searchParams.get('type') || 'overall'; // overall, step, funnel

    let data;

    switch (type) {
      case 'overall':
        data = await getOnboardingMetrics(startDate, endDate);
        break;
      case 'step':
        if (!step) {
          return NextResponse.json({ error: 'Step parameter required for step metrics' }, { status: 400 });
        }
        data = await getStepMetrics(step, startDate, endDate);
        break;
      case 'funnel':
        data = await getOnboardingFunnel(startDate, endDate);
        break;
      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching onboarding analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch onboarding analytics', details: (error as Error).message },
      { status: 500 }
    );
  }
}

