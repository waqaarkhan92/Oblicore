/**
 * Obligation Service
 * Centralized service for obligation-related database operations
 * Reference: Phase 4.1 - Service Layer Abstraction
 */

import { supabaseAdmin } from '@/lib/supabase/server';

export type ObligationStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED' | 'SUSPENDED';
export type ObligationCategory =
  | 'MONITORING'
  | 'REPORTING'
  | 'RECORD_KEEPING'
  | 'OPERATIONAL'
  | 'TRAINING'
  | 'MAINTENANCE'
  | 'OTHER';

export interface Obligation {
  id: string;
  company_id: string;
  site_id: string;
  document_id?: string;
  original_text?: string;
  obligation_title?: string;
  obligation_description?: string;
  summary?: string;
  category?: ObligationCategory;
  status: ObligationStatus;
  deadline_date?: string;
  frequency?: string;
  assigned_to?: string;
  confidence_score?: number;
  extraction_explanation?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface ObligationWithRelations extends Obligation {
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

export interface GetObligationsOptions {
  companyId?: string;
  siteId?: string;
  status?: ObligationStatus | ObligationStatus[];
  category?: ObligationCategory | ObligationCategory[];
  assignedTo?: string;
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface ObligationStats {
  total: number;
  active: number;
  completed: number;
  overdue: number;
  dueSoon: number;
  byCategory: Record<string, number>;
}

export class ObligationService {
  /**
   * Get a single obligation by ID
   */
  async getById(id: string, includeRelations = false): Promise<ObligationWithRelations | null> {
    const selectQuery = includeRelations
      ? `
        *,
        sites!inner(id, name, site_name, company_id),
        companies:company_id(id, name),
        users:assigned_to(id, full_name, email)
      `
      : '*';

    const { data, error } = await supabaseAdmin
      .from('obligations')
      .select(selectQuery)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch obligation: ${error.message}`);
    }

    return data as unknown as ObligationWithRelations;
  }

  /**
   * Get multiple obligations by IDs
   */
  async getByIds(ids: string[], includeRelations = false): Promise<ObligationWithRelations[]> {
    if (ids.length === 0) return [];

    const selectQuery = includeRelations
      ? `
        *,
        sites!inner(id, name, site_name, company_id),
        companies:company_id(id, name),
        users:assigned_to(id, full_name, email)
      `
      : '*';

    const { data, error } = await supabaseAdmin
      .from('obligations')
      .select(selectQuery)
      .in('id', ids);

    if (error) {
      throw new Error(`Failed to fetch obligations: ${error.message}`);
    }

    return (data || []) as unknown as ObligationWithRelations[];
  }

  /**
   * Get obligations with filtering and pagination
   */
  async getMany(options: GetObligationsOptions = {}): Promise<{
    data: ObligationWithRelations[];
    total: number;
  }> {
    const {
      companyId,
      siteId,
      status,
      category,
      assignedTo,
      includeDeleted = false,
      limit = 50,
      offset = 0,
      orderBy = 'created_at',
      orderDirection = 'desc',
    } = options;

    let query = supabaseAdmin
      .from('obligations')
      .select(`
        *,
        sites!inner(id, name, site_name, company_id),
        companies:company_id(id, name),
        users:assigned_to(id, full_name, email)
      `, { count: 'exact' });

    // Apply filters
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    if (siteId) {
      query = query.eq('site_id', siteId);
    }
    if (status) {
      if (Array.isArray(status)) {
        query = query.in('status', status);
      } else {
        query = query.eq('status', status);
      }
    }
    if (category) {
      if (Array.isArray(category)) {
        query = query.in('category', category);
      } else {
        query = query.eq('category', category);
      }
    }
    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo);
    }
    if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }

    // Apply ordering and pagination
    query = query
      .order(orderBy, { ascending: orderDirection === 'asc' })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch obligations: ${error.message}`);
    }

    return {
      data: (data || []) as unknown as ObligationWithRelations[],
      total: count || 0,
    };
  }

  /**
   * Get overdue obligations
   */
  async getOverdue(options: { companyId?: string; siteId?: string } = {}): Promise<ObligationWithRelations[]> {
    const now = new Date().toISOString().split('T')[0];

    let query = supabaseAdmin
      .from('obligations')
      .select(`
        *,
        sites!inner(id, name, site_name, company_id),
        companies:company_id(id, name),
        users:assigned_to(id, full_name, email)
      `)
      .eq('status', 'ACTIVE')
      .is('deleted_at', null)
      .not('deadline_date', 'is', null)
      .lt('deadline_date', now);

    if (options.companyId) {
      query = query.eq('company_id', options.companyId);
    }
    if (options.siteId) {
      query = query.eq('site_id', options.siteId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch overdue obligations: ${error.message}`);
    }

    return (data || []) as unknown as ObligationWithRelations[];
  }

  /**
   * Get obligations due within specified days
   */
  async getDueSoon(
    daysAhead: number,
    options: { companyId?: string; siteId?: string } = {}
  ): Promise<ObligationWithRelations[]> {
    const now = new Date();
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const nowDate = now.toISOString().split('T')[0];
    const futureDateStr = futureDate.toISOString().split('T')[0];

    let query = supabaseAdmin
      .from('obligations')
      .select(`
        *,
        sites!inner(id, name, site_name, company_id),
        companies:company_id(id, name),
        users:assigned_to(id, full_name, email)
      `)
      .eq('status', 'ACTIVE')
      .is('deleted_at', null)
      .not('deadline_date', 'is', null)
      .gte('deadline_date', nowDate)
      .lte('deadline_date', futureDateStr);

    if (options.companyId) {
      query = query.eq('company_id', options.companyId);
    }
    if (options.siteId) {
      query = query.eq('site_id', options.siteId);
    }

    const { data, error } = await query.order('deadline_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch due soon obligations: ${error.message}`);
    }

    return (data || []) as unknown as ObligationWithRelations[];
  }

  /**
   * Update obligation status
   */
  async updateStatus(id: string, status: ObligationStatus): Promise<void> {
    const { error } = await supabaseAdmin
      .from('obligations')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update obligation status: ${error.message}`);
    }
  }

  /**
   * Update obligation fields
   */
  async update(id: string, updates: Partial<Obligation>): Promise<ObligationWithRelations> {
    const { data, error } = await supabaseAdmin
      .from('obligations')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        sites!inner(id, name, site_name, company_id),
        companies:company_id(id, name),
        users:assigned_to(id, full_name, email)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to update obligation: ${error.message}`);
    }

    return data as unknown as ObligationWithRelations;
  }

  /**
   * Soft delete an obligation
   */
  async softDelete(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('obligations')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete obligation: ${error.message}`);
    }
  }

  /**
   * Get obligation statistics
   */
  async getStats(options: { companyId?: string; siteId?: string } = {}): Promise<ObligationStats> {
    const now = new Date();
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const nowDate = now.toISOString().split('T')[0];
    const futureDateStr = sevenDaysFromNow.toISOString().split('T')[0];

    let baseQuery = supabaseAdmin
      .from('obligations')
      .select('id, status, category, deadline_date')
      .is('deleted_at', null);

    if (options.companyId) {
      baseQuery = baseQuery.eq('company_id', options.companyId);
    }
    if (options.siteId) {
      baseQuery = baseQuery.eq('site_id', options.siteId);
    }

    const { data, error } = await baseQuery;

    if (error) {
      throw new Error(`Failed to fetch obligation stats: ${error.message}`);
    }

    const obligations = data || [];
    const stats: ObligationStats = {
      total: obligations.length,
      active: 0,
      completed: 0,
      overdue: 0,
      dueSoon: 0,
      byCategory: {},
    };

    for (const ob of obligations) {
      // Count by status
      if (ob.status === 'ACTIVE') stats.active++;
      if (ob.status === 'COMPLETED') stats.completed++;

      // Count overdue and due soon
      if (ob.status === 'ACTIVE' && ob.deadline_date) {
        if (ob.deadline_date < nowDate) {
          stats.overdue++;
        } else if (ob.deadline_date >= nowDate && ob.deadline_date <= futureDateStr) {
          stats.dueSoon++;
        }
      }

      // Count by category
      const cat = ob.category || 'OTHER';
      stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;
    }

    return stats;
  }

  /**
   * Search obligations by text
   */
  async search(
    query: string,
    options: { companyId?: string; siteId?: string; limit?: number } = {}
  ): Promise<ObligationWithRelations[]> {
    const { companyId, siteId, limit = 20 } = options;
    const searchTerm = `%${query}%`;

    let dbQuery = supabaseAdmin
      .from('obligations')
      .select(`
        *,
        sites!inner(id, name, site_name, company_id),
        companies:company_id(id, name),
        users:assigned_to(id, full_name, email)
      `)
      .is('deleted_at', null)
      .or(`obligation_title.ilike.${searchTerm},obligation_description.ilike.${searchTerm},summary.ilike.${searchTerm},original_text.ilike.${searchTerm}`);

    if (companyId) {
      dbQuery = dbQuery.eq('company_id', companyId);
    }
    if (siteId) {
      dbQuery = dbQuery.eq('site_id', siteId);
    }

    const { data, error } = await dbQuery.limit(limit);

    if (error) {
      throw new Error(`Failed to search obligations: ${error.message}`);
    }

    return (data || []) as unknown as ObligationWithRelations[];
  }

  /**
   * Get obligations without evidence
   */
  async getWithoutEvidence(options: { companyId?: string; siteId?: string } = {}): Promise<ObligationWithRelations[]> {
    // First, get all active obligations
    let query = supabaseAdmin
      .from('obligations')
      .select(`
        id,
        company_id,
        site_id,
        original_text,
        obligation_title,
        obligation_description,
        deadline_date,
        status,
        sites!inner(id, name, site_name, company_id)
      `)
      .eq('status', 'ACTIVE')
      .is('deleted_at', null);

    if (options.companyId) {
      query = query.eq('company_id', options.companyId);
    }
    if (options.siteId) {
      query = query.eq('site_id', options.siteId);
    }

    const { data: obligations, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch obligations: ${error.message}`);
    }

    if (!obligations || obligations.length === 0) {
      return [];
    }

    // Get obligations that have evidence links
    const { data: evidenceLinks } = await supabaseAdmin
      .from('obligation_evidence_links')
      .select('obligation_id')
      .in('obligation_id', obligations.map(o => o.id))
      .is('deleted_at', null);

    const obligationsWithEvidence = new Set(
      (evidenceLinks || []).map(link => link.obligation_id)
    );

    // Filter to only obligations without evidence
    return obligations.filter(
      ob => !obligationsWithEvidence.has(ob.id)
    ) as unknown as ObligationWithRelations[];
  }
}

export const obligationService = new ObligationService();
