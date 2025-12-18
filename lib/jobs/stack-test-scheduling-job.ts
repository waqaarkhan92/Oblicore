/**
 * Stack Test Scheduling & Reminder Job
 * Monitors generators for upcoming stack test deadlines
 * Creates reminders and alerts for overdue tests
 */

import { Job } from 'bullmq';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getAppUrl } from '@/lib/env';

export interface StackTestSchedulingJobData {
  company_id?: string; // Optional: process specific company only
}

interface GeneratorStackTestStatus {
  generator_id: string;
  generator_identifier: string;
  site_name: string;
  site_id: string;
  company_id: string;
  next_stack_test_due: string;
  days_until_due: number;
  status: 'OVERDUE' | 'DUE_SOON' | 'WARNING' | 'OK';
}

export async function processStackTestSchedulingJob(job: Job<StackTestSchedulingJobData>): Promise<void> {
  const { company_id } = job.data;

  console.log(`Starting stack test scheduling job${company_id ? ` for company ${company_id}` : ''}`);

  try {
    // Get all generators with stack test due dates
    let query = supabaseAdmin
      .from('generators')
      .select(`
        id,
        generator_identifier,
        generator_type,
        next_stack_test_due,
        company_id,
        document_id,
        documents!inner(
          site_id,
          sites!inner(
            id,
            name
          )
        )
      `)
      .not('next_stack_test_due', 'is', null);

    if (company_id) {
      query = query.eq('company_id', company_id);
    }

    const { data: generators, error: generatorsError } = await query;

    if (generatorsError) {
      throw new Error(`Failed to fetch generators: ${generatorsError.message}`);
    }

    if (!generators || generators.length === 0) {
      console.log('No generators with stack test due dates found');
      return;
    }

    const now = new Date();
    const overdueGenerators: GeneratorStackTestStatus[] = [];
    const dueSoonGenerators: GeneratorStackTestStatus[] = [];
    const warningGenerators: GeneratorStackTestStatus[] = [];

    // Process each generator
    for (const generator of generators) {
      const dueDate = new Date(generator.next_stack_test_due);
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      const docData = generator.documents as any;
      const siteData = docData?.sites as any;

      const status: GeneratorStackTestStatus = {
        generator_id: generator.id,
        generator_identifier: generator.generator_identifier,
        site_name: siteData?.name || 'Unknown Site',
        site_id: siteData?.id || '',
        company_id: generator.company_id,
        next_stack_test_due: generator.next_stack_test_due,
        days_until_due: daysUntilDue,
        status: daysUntilDue < 0 ? 'OVERDUE' : daysUntilDue <= 14 ? 'DUE_SOON' : daysUntilDue <= 30 ? 'WARNING' : 'OK',
      };

      if (daysUntilDue < 0) {
        overdueGenerators.push(status);
      } else if (daysUntilDue <= 14) {
        dueSoonGenerators.push(status);
      } else if (daysUntilDue <= 30) {
        warningGenerators.push(status);
      }
    }

    await job.updateProgress(30);

    // Create notifications for overdue generators
    if (overdueGenerators.length > 0) {
      await createStackTestNotifications(overdueGenerators, 'OVERDUE', 'HIGH');
    }

    await job.updateProgress(50);

    // Create notifications for due soon generators
    if (dueSoonGenerators.length > 0) {
      await createStackTestNotifications(dueSoonGenerators, 'DUE_SOON', 'NORMAL');
    }

    await job.updateProgress(70);

    // Create notifications for warning generators (only if not already notified recently)
    if (warningGenerators.length > 0) {
      await createStackTestNotifications(warningGenerators, 'WARNING', 'LOW');
    }

    await job.updateProgress(100);

    console.log(`Stack test scheduling job completed:
      - Overdue: ${overdueGenerators.length}
      - Due Soon (≤14 days): ${dueSoonGenerators.length}
      - Warning (≤30 days): ${warningGenerators.length}
      - OK: ${generators.length - overdueGenerators.length - dueSoonGenerators.length - warningGenerators.length}`);

  } catch (error: any) {
    console.error('Stack test scheduling job failed:', error);
    throw error;
  }
}

async function createStackTestNotifications(
  generators: GeneratorStackTestStatus[],
  alertType: 'OVERDUE' | 'DUE_SOON' | 'WARNING',
  priority: 'HIGH' | 'NORMAL' | 'LOW'
): Promise<void> {
  const baseUrl = getAppUrl();

  // Group generators by company for batch notification
  const byCompany = new Map<string, GeneratorStackTestStatus[]>();
  for (const gen of generators) {
    const existing = byCompany.get(gen.company_id) || [];
    existing.push(gen);
    byCompany.set(gen.company_id, existing);
  }

  for (const [companyId, companyGenerators] of byCompany) {
    // Get admin users for this company
    const { data: adminUserRoles } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('company_id', companyId)
      .in('role', ['OWNER', 'ADMIN']);

    const adminUserIds = adminUserRoles?.map(r => r.user_id) || [];
    if (adminUserIds.length === 0) continue;

    // Get user details
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name')
      .in('id', adminUserIds)
      .eq('is_active', true)
      .is('deleted_at', null);

    if (!users || users.length === 0) continue;

    // Create notifications
    const notifications = [];
    for (const user of users) {
      for (const gen of companyGenerators) {
        const subject = alertType === 'OVERDUE'
          ? `OVERDUE: Stack Test Required for ${gen.generator_identifier}`
          : alertType === 'DUE_SOON'
          ? `Stack Test Due Soon: ${gen.generator_identifier}`
          : `Stack Test Reminder: ${gen.generator_identifier}`;

        const bodyText = alertType === 'OVERDUE'
          ? `Stack test for generator ${gen.generator_identifier} at ${gen.site_name} is ${Math.abs(gen.days_until_due)} days overdue. Immediate action required.`
          : `Stack test for generator ${gen.generator_identifier} at ${gen.site_name} is due in ${gen.days_until_due} days (${new Date(gen.next_stack_test_due).toLocaleDateString('en-GB')}).`;

        notifications.push({
          user_id: user.id,
          company_id: companyId,
          site_id: gen.site_id || null,
          recipient_email: user.email,
          notification_type: 'DEADLINE_REMINDER',
          channel: 'EMAIL',
          priority,
          subject,
          body_text: bodyText,
          action_url: `${baseUrl}/dashboard/module-3/stack-tests?generator_id=${gen.generator_id}`,
          entity_type: 'generator',
          entity_id: gen.generator_id,
          status: 'PENDING',
          scheduled_for: new Date().toISOString(),
          metadata: {
            alert_type: alertType,
            generator_identifier: gen.generator_identifier,
            days_until_due: gen.days_until_due,
          },
        });
      }
    }

    // Batch insert notifications
    if (notifications.length > 0) {
      const { error: notifyError } = await supabaseAdmin.from('notifications').insert(notifications);
      if (notifyError) {
        console.error(`Failed to create stack test notifications for company ${companyId}:`, notifyError);
      }
    }
  }
}
