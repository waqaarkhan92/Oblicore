/**
 * Onboarding Analytics Service
 * Tracks onboarding metrics and provides analytics queries
 * Reference: docs/specs/63_Frontend_Onboarding_Flow.md Section 15
 */

import { supabaseAdmin } from '@/lib/supabase/server';

export interface OnboardingMetrics {
  total_users: number;
  completed_onboarding: number;
  completion_rate: number;
  average_completion_time_minutes: number;
  drop_off_by_step: Array<{
    step: string;
    drop_off_count: number;
    drop_off_rate: number;
  }>;
  time_to_value_minutes: number;
  quick_start_usage: number;
  full_tutorial_usage: number;
}

export interface OnboardingStepMetrics {
  step: string;
  started_count: number;
  completed_count: number;
  completion_rate: number;
  average_time_minutes: number;
  skip_count: number;
  skip_rate: number;
}

/**
 * Get overall onboarding metrics
 */
export async function getOnboardingMetrics(
  startDate?: Date,
  endDate?: Date
): Promise<OnboardingMetrics> {
  let query = supabaseAdmin
    .from('user_onboarding_progress')
    .select('*');

  if (startDate) {
    query = query.gte('created_at', startDate.toISOString());
  }
  if (endDate) {
    query = query.lte('created_at', endDate.toISOString());
  }

  const { data: progressRecords, error } = await query;

  if (error || !progressRecords) {
    throw new Error('Failed to fetch onboarding metrics');
  }

  // Get unique users
  const uniqueUsers = new Set(progressRecords.map((r) => r.user_id));
  const totalUsers = uniqueUsers.size;

  // Get completed users
  const { data: completedUsers } = await supabaseAdmin
    .from('users')
    .select('id')
    .not('onboarding_completed_at', 'is', null);

  const completedCount = completedUsers?.length || 0;
  const completionRate = totalUsers > 0 ? completedCount / totalUsers : 0;

  // Calculate average completion time
  const completionTimes: number[] = [];
  for (const userId of uniqueUsers) {
    const userRecords = progressRecords.filter((r) => r.user_id === userId);
    const firstStep = userRecords.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )[0];
    
    const completedUser = completedUsers?.find((u) => u.id === userId);
    if (completedUser && firstStep) {
      // This would need onboarding_completed_at from users table
      // For now, calculate from last step completion
      const lastStep = userRecords
        .filter((r) => r.completed)
        .sort((a, b) => 
          new Date(b.updated_at || b.created_at).getTime() - 
          new Date(a.updated_at || a.created_at).getTime()
        )[0];
      
      if (lastStep && firstStep) {
        const timeMs = new Date(lastStep.updated_at || lastStep.created_at).getTime() - 
                      new Date(firstStep.created_at).getTime();
        completionTimes.push(timeMs / 1000 / 60); // Convert to minutes
      }
    }
  }

  const averageCompletionTime = completionTimes.length > 0
    ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
    : 0;

  // Calculate drop-off by step
  const stepCounts: Record<string, { started: number; completed: number }> = {};
  for (const record of progressRecords) {
    if (!stepCounts[record.step]) {
      stepCounts[record.step] = { started: 0, completed: 0 };
    }
    stepCounts[record.step].started++;
    if (record.completed) {
      stepCounts[record.step].completed++;
    }
  }

  const dropOffByStep = Object.entries(stepCounts).map(([step, counts]) => ({
    step,
    drop_off_count: counts.started - counts.completed,
    drop_off_rate: counts.started > 0 ? (counts.started - counts.completed) / counts.started : 0,
  }));

  return {
    total_users: totalUsers,
    completed_onboarding: completedCount,
    completion_rate: completionRate,
    average_completion_time_minutes: Math.round(averageCompletionTime),
    drop_off_by_step: dropOffByStep,
    time_to_value_minutes: Math.round(averageCompletionTime * 0.7), // Assume 70% of time is to first value
    quick_start_usage: 0, // TODO: Track quick start vs full tutorial
    full_tutorial_usage: 0,
  };
}

/**
 * Get step-by-step metrics
 */
export async function getStepMetrics(
  step: string,
  startDate?: Date,
  endDate?: Date
): Promise<OnboardingStepMetrics> {
  let query = supabaseAdmin
    .from('user_onboarding_progress')
    .select('*')
    .eq('step', step);

  if (startDate) {
    query = query.gte('created_at', startDate.toISOString());
  }
  if (endDate) {
    query = query.lte('created_at', endDate.toISOString());
  }

  const { data: records, error } = await query;

  if (error || !records) {
    throw new Error('Failed to fetch step metrics');
  }

  const startedCount = records.length;
  const completedCount = records.filter((r) => r.completed).length;
  const skipCount = records.filter((r) => r.data?.skipped === true).length;

  // Calculate average time (would need step_started_at and step_completed_at)
  const averageTime = 0; // TODO: Calculate from timestamps

  return {
    step,
    started_count: startedCount,
    completed_count: completedCount,
    completion_rate: startedCount > 0 ? completedCount / startedCount : 0,
    average_time_minutes: averageTime,
    skip_count: skipCount,
    skip_rate: startedCount > 0 ? skipCount / startedCount : 0,
  };
}

/**
 * Get onboarding funnel analysis
 */
export async function getOnboardingFunnel(
  startDate?: Date,
  endDate?: Date
): Promise<Array<{ step: string; users: number; conversion_rate: number }>> {
  const { data: allSteps } = await supabaseAdmin
    .from('user_onboarding_progress')
    .select('step, user_id, created_at')
    .order('created_at', { ascending: true });

  if (!allSteps) {
    return [];
  }

  // Group by step and count unique users
  const stepUsers: Record<string, Set<string>> = {};
  for (const record of allSteps) {
    if (!stepUsers[record.step]) {
      stepUsers[record.step] = new Set();
    }
    stepUsers[record.step].add(record.user_id);
  }

  // Calculate conversion rates
  const steps = Object.keys(stepUsers).sort();
  const funnel = steps.map((step, idx) => {
    const users = stepUsers[step].size;
    const previousUsers = idx > 0 ? stepUsers[steps[idx - 1]].size : users;
    const conversionRate = previousUsers > 0 ? users / previousUsers : 1;

    return {
      step,
      users,
      conversion_rate: conversionRate,
    };
  });

  return funnel;
}

