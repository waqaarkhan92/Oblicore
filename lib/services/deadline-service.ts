/**
 * Deadline Service
 * Centralized service for deadline-related database operations
 * Reference: Phase 4.1 - Service Layer Abstraction
 */

import { supabaseAdmin } from '@/lib/supabase/server';

export type DeadlineStatus =
  | 'PENDING'
  | 'DUE_SOON'
  | 'OVERDUE'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Deadline {
  id: string;
  schedule_id?: string;
  obligation_id: string;
  company_id: string;
  site_id: string;
  due_date: string;
  compliance_period?: string;
  status: DeadlineStatus;
  completed_at?: string;
  completed_by?: string;
  completion_notes?: string;
  is_late?: boolean;
  sla_target_date?: string;
  sla_breached_at?: string;
  sla_breach_duration_hours?: number;
  breach_notification_sent?: boolean;
  breach_detected_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DeadlineWithRelations extends Deadline {
  obligations?: {
    id: string;
    company_id: string;
    site_id: string;
    document_id?: string;
    obligation_title?: string;
    obligation_description?: string;
    summary?: string;
    original_text?: string;
    category?: string;
    status?: string;
    assigned_to?: string;
    sites?: {
      id: string;
      name?: string;
      site_name?: string;
      company_id: string;
    };
    companies?: {
      id: string;
      name: string;
    };
  };
  sites?: {
    id: string;
    name?: string;
    site_name?: string;
    company_id: string;
  };
  companies?: {
    id: string;
    name: string;
  };
  users?: {
    id: string;
    full_name?: string;
    email: string;
  };
}

export interface GetDeadlinesOptions {
  company_id?: string;
  site_id?: string;
  obligation_id?: string;
  status?: DeadlineStatus | DeadlineStatus[];
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface DeadlineStats {
  total: number;
  pending: number;
  due_soon: number;
  overdue: number;
  completed: number;
  cancelled: number;
  sla_breached: number;
  breach_notifications_pending: number;
}

export class DeadlineService {
  /**
   * Get a single deadline by ID
   */
  async getById(id: string, includeRelations = false): Promise<DeadlineWithRelations | null> {
    const selectQuery = includeRelations
      ? `
        *,
        obligations!inner(
          id,
          company_id,
          site_id,
          document_id,
          obligation_title,
          obligation_description,
          summary,
          original_text,
          category,
          status,
          assigned_to
        ),
        sites!inner(id, name, site_name, company_id),
        companies:company_id(id, name),
        users:completed_by(id, full_name, email)
      `
      : '*';

    const { data, error } = await supabaseAdmin
      .from('deadlines')
      .select(selectQuery)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch deadline: ${error.message}`);
    }

    return data as any as DeadlineWithRelations;
  }

  /**
   * Get deadline for a specific obligation
   */
  async getByObligationId(
    obligationId: string,
    options: { status?: DeadlineStatus | DeadlineStatus[] } = {}
  ): Promise<DeadlineWithRelations[]> {
    let query = supabaseAdmin
      .from('deadlines')
      .select(`
        *,
        obligations!inner(
          id,
          company_id,
          site_id,
          obligation_title,
          obligation_description,
          summary,
          category,
          status
        ),
        sites!inner(id, name, site_name, company_id)
      `)
      .eq('obligation_id', obligationId);

    if (options.status) {
      if (Array.isArray(options.status)) {
        query = query.in('status', options.status);
      } else {
        query = query.eq('status', options.status);
      }
    }

    const { data, error } = await query.order('due_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch deadlines by obligation: ${error.message}`);
    }

    return (data || []) as any as DeadlineWithRelations[];
  }

  /**
   * Get deadlines due within specified days
   */
  async getUpcoming(
    daysAhead: number,
    options: GetDeadlinesOptions = {}
  ): Promise<DeadlineWithRelations[]> {
    const now = new Date();
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const nowDate = now.toISOString().split('T')[0];
    const futureDateStr = futureDate.toISOString().split('T')[0];

    let query = supabaseAdmin
      .from('deadlines')
      .select(`
        *,
        obligations!inner(
          id,
          company_id,
          site_id,
          obligation_title,
          obligation_description,
          summary,
          original_text,
          category,
          status,
          assigned_to
        ),
        sites!inner(id, name, site_name, company_id)
      `)
      .eq('status', 'PENDING')
      .gte('due_date', nowDate)
      .lte('due_date', futureDateStr);

    if (options.company_id) {
      query = query.eq('obligations.company_id', options.company_id);
    }
    if (options.site_id) {
      query = query.eq('obligations.site_id', options.site_id);
    }

    const { data, error } = await query.order('due_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch upcoming deadlines: ${error.message}`);
    }

    return (data || []) as any as DeadlineWithRelations[];
  }

  /**
   * Get overdue deadlines (status PENDING, due_date < now)
   */
  async getOverdue(options: GetDeadlinesOptions = {}): Promise<DeadlineWithRelations[]> {
    const now = new Date().toISOString().split('T')[0];

    let query = supabaseAdmin
      .from('deadlines')
      .select(`
        *,
        obligations!inner(
          id,
          company_id,
          site_id,
          obligation_title,
          obligation_description,
          summary,
          original_text,
          category,
          status,
          assigned_to
        ),
        sites!inner(id, name, site_name, company_id)
      `)
      .eq('status', 'PENDING')
      .lt('due_date', now);

    if (options.company_id) {
      query = query.eq('obligations.company_id', options.company_id);
    }
    if (options.site_id) {
      query = query.eq('obligations.site_id', options.site_id);
    }

    const { data, error } = await query.order('due_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch overdue deadlines: ${error.message}`);
    }

    return (data || []) as any as DeadlineWithRelations[];
  }

  /**
   * Get deadlines due on specific dates
   */
  async getDueOnDate(
    date: string,
    options: GetDeadlinesOptions = {}
  ): Promise<DeadlineWithRelations[]> {
    let query = supabaseAdmin
      .from('deadlines')
      .select(`
        *,
        obligations!inner(
          id,
          company_id,
          site_id,
          obligation_title,
          obligation_description,
          summary,
          original_text,
          category,
          status,
          assigned_to
        ),
        sites!inner(id, name, site_name, company_id)
      `)
      .eq('due_date', date)
      .eq('status', 'PENDING');

    if (options.company_id) {
      query = query.eq('obligations.company_id', options.company_id);
    }
    if (options.site_id) {
      query = query.eq('obligations.site_id', options.site_id);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch deadlines due on date: ${error.message}`);
    }

    return (data || []) as any as DeadlineWithRelations[];
  }

  /**
   * Get deadlines for alert notifications (7/3/1 day warnings)
   */
  async getForAlerts(
    alertDays: number[],
    options: GetDeadlinesOptions = {}
  ): Promise<DeadlineWithRelations[]> {
    const now = new Date();
    const alertDates: string[] = [];

    for (const days of alertDays) {
      const alertDate = new Date(now);
      alertDate.setDate(alertDate.getDate() + days);
      alertDates.push(alertDate.toISOString().split('T')[0]);
    }

    let query = supabaseAdmin
      .from('deadlines')
      .select(`
        *,
        obligations!inner(
          id,
          company_id,
          site_id,
          obligation_title,
          obligation_description,
          summary,
          original_text,
          category,
          status,
          assigned_to,
          sites!inner(id, name, site_name, company_id)
        )
      `)
      .eq('status', 'PENDING')
      .in('due_date', alertDates);

    if (options.company_id) {
      query = query.eq('obligations.company_id', options.company_id);
    }
    if (options.site_id) {
      query = query.eq('obligations.site_id', options.site_id);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch deadlines for alerts: ${error.message}`);
    }

    return (data || []) as any as DeadlineWithRelations[];
  }

  /**
   * Get breached deadlines (OVERDUE status, not notified)
   */
  async getBreached(options: GetDeadlinesOptions = {}): Promise<DeadlineWithRelations[]> {
    const now = new Date().toISOString();

    let query = supabaseAdmin
      .from('deadlines')
      .select(`
        *,
        obligations!inner(
          id,
          company_id,
          site_id,
          obligation_title,
          obligation_description,
          summary,
          original_text,
          category,
          status,
          assigned_to,
          sites!inner(id, name, site_name, company_id),
          companies!inner(id, name)
        )
      `)
      .eq('status', 'OVERDUE')
      .lt('due_date', now.split('T')[0])
      .eq('breach_notification_sent', false);

    if (options.company_id) {
      query = query.eq('obligations.company_id', options.company_id);
    }
    if (options.site_id) {
      query = query.eq('obligations.site_id', options.site_id);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query.order('due_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch breached deadlines: ${error.message}`);
    }

    return (data || []) as any as DeadlineWithRelations[];
  }

  /**
   * Get SLA breached deadlines
   */
  async getSLABreached(options: GetDeadlinesOptions = {}): Promise<DeadlineWithRelations[]> {
    const now = new Date().toISOString();

    let query = supabaseAdmin
      .from('deadlines')
      .select(`
        *,
        obligations!inner(
          id,
          company_id,
          site_id,
          obligation_title,
          obligation_description,
          summary,
          original_text,
          category,
          status,
          assigned_to,
          sites!inner(id, name, site_name, company_id),
          companies!inner(id, name)
        )
      `)
      .not('sla_target_date', 'is', null)
      .lt('sla_target_date', now)
      .is('sla_breached_at', null)
      .neq('status', 'COMPLETED');

    if (options.company_id) {
      query = query.eq('obligations.company_id', options.company_id);
    }
    if (options.site_id) {
      query = query.eq('obligations.site_id', options.site_id);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query.order('sla_target_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch SLA breached deadlines: ${error.message}`);
    }

    return (data || []) as any as DeadlineWithRelations[];
  }

  /**
   * Get active SLA breaches (already marked as breached)
   */
  async getActiveSLABreaches(options: GetDeadlinesOptions = {}): Promise<DeadlineWithRelations[]> {
    let query = supabaseAdmin
      .from('deadlines')
      .select(`
        *,
        obligations!inner(
          id,
          company_id,
          site_id,
          obligation_title,
          obligation_description,
          summary,
          category,
          status
        ),
        sites!inner(id, name, site_name, company_id)
      `)
      .not('sla_breached_at', 'is', null)
      .neq('status', 'COMPLETED');

    if (options.company_id) {
      query = query.eq('obligations.company_id', options.company_id);
    }
    if (options.site_id) {
      query = query.eq('obligations.site_id', options.site_id);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query.order('sla_breached_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch active SLA breaches: ${error.message}`);
    }

    return (data || []) as any as DeadlineWithRelations[];
  }

  /**
   * Update deadline status
   */
  async updateStatus(id: string, status: DeadlineStatus): Promise<void> {
    const updates: Partial<Deadline> = {
      status,
      updated_at: new Date().toISOString(),
    };

    // If completing, set completion timestamp
    if (status === 'COMPLETED') {
      updates.completed_at = new Date().toISOString();
    }

    const { error } = await supabaseAdmin
      .from('deadlines')
      .update(updates)
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update deadline status: ${error.message}`);
    }
  }

  /**
   * Mark breach notification as sent
   */
  async markBreachNotified(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('deadlines')
      .update({
        breach_notification_sent: true,
        breach_detected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to mark breach notified: ${error.message}`);
    }
  }

  /**
   * Mark SLA as breached
   */
  async markSLABreached(id: string, breachDurationHours: number = 0): Promise<void> {
    const { error } = await supabaseAdmin
      .from('deadlines')
      .update({
        sla_breached_at: new Date().toISOString(),
        sla_breach_duration_hours: breachDurationHours,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to mark SLA breached: ${error.message}`);
    }
  }

  /**
   * Update SLA breach duration
   */
  async updateSLABreachDuration(id: string, durationHours: number): Promise<void> {
    const { error } = await supabaseAdmin
      .from('deadlines')
      .update({
        sla_breach_duration_hours: durationHours,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update SLA breach duration: ${error.message}`);
    }
  }

  /**
   * Complete a deadline
   */
  async complete(id: string, completedBy: string, notes?: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('deadlines')
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        completed_by: completedBy,
        completion_notes: notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to complete deadline: ${error.message}`);
    }
  }

  /**
   * Get deadline statistics
   */
  async getStats(options: GetDeadlinesOptions = {}): Promise<DeadlineStats> {
    let query = supabaseAdmin
      .from('deadlines')
      .select('id, status, sla_breached_at, breach_notification_sent');

    if (options.company_id) {
      query = query.eq('company_id', options.company_id);
    }
    if (options.site_id) {
      query = query.eq('site_id', options.site_id);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch deadline stats: ${error.message}`);
    }

    const deadlines = data || [];
    const stats: DeadlineStats = {
      total: deadlines.length,
      pending: 0,
      due_soon: 0,
      overdue: 0,
      completed: 0,
      cancelled: 0,
      sla_breached: 0,
      breach_notifications_pending: 0,
    };

    for (const deadline of deadlines) {
      // Count by status
      if (deadline.status === 'PENDING') stats.pending++;
      if (deadline.status === 'DUE_SOON') stats.due_soon++;
      if (deadline.status === 'OVERDUE') stats.overdue++;
      if (deadline.status === 'COMPLETED') stats.completed++;
      if (deadline.status === 'CANCELLED') stats.cancelled++;

      // Count SLA breaches
      if (deadline.sla_breached_at) {
        stats.sla_breached++;
      }

      // Count breach notifications pending
      if (deadline.status === 'OVERDUE' && !deadline.breach_notification_sent) {
        stats.breach_notifications_pending++;
      }
    }

    return stats;
  }

  /**
   * Get all deadlines with filtering and pagination
   */
  async getMany(options: GetDeadlinesOptions = {}): Promise<{
    data: DeadlineWithRelations[];
    total: number;
  }> {
    const {
      company_id,
      site_id,
      obligation_id,
      status,
      limit = 50,
      offset = 0,
      orderBy = 'due_date',
      orderDirection = 'asc',
    } = options;

    let query = supabaseAdmin
      .from('deadlines')
      .select(`
        *,
        obligations!inner(
          id,
          company_id,
          site_id,
          obligation_title,
          obligation_description,
          summary,
          category,
          status
        ),
        sites!inner(id, name, site_name, company_id)
      `, { count: 'exact' });

    // Apply filters
    if (company_id) {
      query = query.eq('obligations.company_id', company_id);
    }
    if (site_id) {
      query = query.eq('obligations.site_id', site_id);
    }
    if (obligation_id) {
      query = query.eq('obligation_id', obligation_id);
    }
    if (status) {
      if (Array.isArray(status)) {
        query = query.in('status', status);
      } else {
        query = query.eq('status', status);
      }
    }

    // Apply ordering and pagination
    query = query
      .order(orderBy, { ascending: orderDirection === 'asc' })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch deadlines: ${error.message}`);
    }

    return {
      data: (data || []) as any as DeadlineWithRelations[],
      total: count || 0,
    };
  }

  /**
   * Update deadline fields
   */
  async update(id: string, updates: Partial<Deadline>): Promise<DeadlineWithRelations> {
    const { data, error } = await supabaseAdmin
      .from('deadlines')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        obligations!inner(
          id,
          company_id,
          site_id,
          obligation_title,
          obligation_description,
          summary,
          category,
          status
        ),
        sites!inner(id, name, site_name, company_id)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to update deadline: ${error.message}`);
    }

    return data as any as DeadlineWithRelations;
  }

  /**
   * Delete deadline (if supported)
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('deadlines')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete deadline: ${error.message}`);
    }
  }

  /**
   * Get deadlines with missing evidence
   */
  async getWithMissingEvidence(options: GetDeadlinesOptions = {}): Promise<DeadlineWithRelations[]> {
    const now = new Date().toISOString().split('T')[0];

    let query = supabaseAdmin
      .from('deadlines')
      .select(`
        *,
        obligations!inner(
          id,
          company_id,
          site_id,
          obligation_title,
          obligation_description,
          summary,
          category,
          status
        ),
        sites!inner(id, name, site_name, company_id)
      `)
      .in('status', ['PENDING', 'OVERDUE'])
      .lt('due_date', now);

    if (options.company_id) {
      query = query.eq('obligations.company_id', options.company_id);
    }
    if (options.site_id) {
      query = query.eq('obligations.site_id', options.site_id);
    }

    const { data: deadlines, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch deadlines: ${error.message}`);
    }

    if (!deadlines || deadlines.length === 0) {
      return [];
    }

    // Check which obligations have evidence
    const obligationIds = deadlines.map((d: any) => d.obligation_id);
    const { data: evidenceLinks } = await supabaseAdmin
      .from('obligation_evidence_links')
      .select('obligation_id, evidence_id')
      .in('obligation_id', obligationIds)
      .is('deleted_at', null);

    if (!evidenceLinks || evidenceLinks.length === 0) {
      return deadlines as DeadlineWithRelations[];
    }

    // Get evidence IDs that are approved
    const evidenceIds = evidenceLinks.map((l: any) => l.evidence_id);
    const { data: approvedEvidence } = await supabaseAdmin
      .from('evidence_items')
      .select('id')
      .in('id', evidenceIds)
      .eq('validation_status', 'APPROVED')
      .eq('is_archived', false);

    const approvedEvidenceIds = new Set((approvedEvidence || []).map((e: any) => e.id));

    // Map obligations that have approved evidence
    const obligationsWithEvidence = new Set(
      evidenceLinks
        .filter((l: any) => approvedEvidenceIds.has(l.evidence_id))
        .map((l: any) => l.obligation_id)
    );

    // Filter deadlines for obligations without approved evidence
    return deadlines.filter(
      (d: any) => !obligationsWithEvidence.has(d.obligation_id)
    ) as any as DeadlineWithRelations[];
  }

  /**
   * Get deadlines requiring action (overdue or due soon without evidence)
   */
  async getRequiringAction(
    daysAhead: number = 7,
    options: GetDeadlinesOptions = {}
  ): Promise<DeadlineWithRelations[]> {
    const now = new Date();
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const futureDateStr = futureDate.toISOString().split('T')[0];

    let query = supabaseAdmin
      .from('deadlines')
      .select(`
        *,
        obligations!inner(
          id,
          company_id,
          site_id,
          obligation_title,
          obligation_description,
          summary,
          category,
          status,
          assigned_to
        ),
        sites!inner(id, name, site_name, company_id)
      `)
      .in('status', ['PENDING', 'OVERDUE', 'DUE_SOON'])
      .lte('due_date', futureDateStr);

    if (options.company_id) {
      query = query.eq('obligations.company_id', options.company_id);
    }
    if (options.site_id) {
      query = query.eq('obligations.site_id', options.site_id);
    }

    const { data, error } = await query.order('due_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch deadlines requiring action: ${error.message}`);
    }

    return (data || []) as any as DeadlineWithRelations[];
  }

  /**
   * Legacy method aliases for backward compatibility
   */
  async markAsBreached(deadlineId: string): Promise<void> {
    return this.markBreachNotified(deadlineId);
  }

  async markSLAAsBreached(deadlineId: string): Promise<void> {
    return this.markSLABreached(deadlineId);
  }
}

// Export singleton instance
export const deadlineService = new DeadlineService();
