/**
 * Evidence Service
 * Centralized service for evidence-related database operations
 * Reference: Phase 4.1 - Service Layer Abstraction
 */

import { supabaseAdmin } from '@/lib/supabase/server';

export type ValidationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REQUIRES_REVIEW';

export interface EvidenceItem {
  id: string;
  company_id: string;
  site_id?: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  storage_provider: string;
  category?: string;
  description?: string;
  validation_status: ValidationStatus;
  validated_by?: string;
  validated_at?: string;
  expiry_date?: string;
  is_archived: boolean;
  metadata?: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface EvidenceWithRelations extends EvidenceItem {
  sites?: {
    id: string;
    name?: string;
    site_name?: string;
  };
  users?: {
    id: string;
    full_name?: string;
    email: string;
  };
  obligation_links?: Array<{
    obligation_id: string;
    obligations: {
      id: string;
      obligation_title?: string;
      summary?: string;
    };
  }>;
}

export interface GetEvidenceOptions {
  companyId?: string;
  siteId?: string;
  obligationId?: string;
  validationStatus?: ValidationStatus | ValidationStatus[];
  isArchived?: boolean;
  category?: string;
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface EvidenceStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  archived: number;
  expiringSoon: number;
  byCategory: Record<string, number>;
}

export class EvidenceService {
  /**
   * Get a single evidence item by ID
   */
  async getById(id: string, includeRelations = false): Promise<EvidenceWithRelations | null> {
    const selectQuery = includeRelations
      ? `
        *,
        sites(id, name, site_name),
        users:created_by(id, full_name, email),
        obligation_links:obligation_evidence_links(
          obligation_id,
          obligations(id, obligation_title, summary)
        )
      `
      : '*';

    const { data, error } = await supabaseAdmin
      .from('evidence_items')
      .select(selectQuery)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch evidence: ${error.message}`);
    }

    return data as unknown as EvidenceWithRelations;
  }

  /**
   * Get multiple evidence items by IDs
   */
  async getByIds(ids: string[]): Promise<EvidenceWithRelations[]> {
    if (ids.length === 0) return [];

    const { data, error } = await supabaseAdmin
      .from('evidence_items')
      .select(`
        *,
        sites(id, name, site_name),
        users:created_by(id, full_name, email)
      `)
      .in('id', ids);

    if (error) {
      throw new Error(`Failed to fetch evidence items: ${error.message}`);
    }

    return (data || []) as unknown as EvidenceWithRelations[];
  }

  /**
   * Get evidence items with filtering and pagination
   */
  async getMany(options: GetEvidenceOptions = {}): Promise<{
    data: EvidenceWithRelations[];
    total: number;
  }> {
    const {
      companyId,
      siteId,
      obligationId,
      validationStatus,
      isArchived,
      category,
      includeDeleted = false,
      limit = 50,
      offset = 0,
      orderBy = 'created_at',
      orderDirection = 'desc',
    } = options;

    let query = supabaseAdmin
      .from('evidence_items')
      .select(`
        *,
        sites(id, name, site_name),
        users:created_by(id, full_name, email)
      `, { count: 'exact' });

    // Apply filters
    if (companyId) {
      query = query.eq('company_id', companyId);
    }
    if (siteId) {
      query = query.eq('site_id', siteId);
    }
    if (validationStatus) {
      if (Array.isArray(validationStatus)) {
        query = query.in('validation_status', validationStatus);
      } else {
        query = query.eq('validation_status', validationStatus);
      }
    }
    if (typeof isArchived === 'boolean') {
      query = query.eq('is_archived', isArchived);
    }
    if (category) {
      query = query.eq('category', category);
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
      throw new Error(`Failed to fetch evidence: ${error.message}`);
    }

    // If filtering by obligationId, get the linked evidence
    if (obligationId) {
      const { data: links } = await supabaseAdmin
        .from('obligation_evidence_links')
        .select('evidence_id')
        .eq('obligation_id', obligationId)
        .is('deleted_at', null);

      const linkedIds = new Set((links || []).map(l => l.evidence_id));
      const filteredData = (data || []).filter(e => linkedIds.has(e.id));

      return {
        data: filteredData as unknown as EvidenceWithRelations[],
        total: filteredData.length,
      };
    }

    return {
      data: (data || []) as unknown as EvidenceWithRelations[],
      total: count || 0,
    };
  }

  /**
   * Get evidence linked to an obligation
   */
  async getByObligationId(obligationId: string): Promise<EvidenceWithRelations[]> {
    const { data: links, error: linksError } = await supabaseAdmin
      .from('obligation_evidence_links')
      .select('evidence_id')
      .eq('obligation_id', obligationId)
      .is('deleted_at', null);

    if (linksError) {
      throw new Error(`Failed to fetch evidence links: ${linksError.message}`);
    }

    if (!links || links.length === 0) {
      return [];
    }

    const evidenceIds = links.map(l => l.evidence_id);
    return this.getByIds(evidenceIds);
  }

  /**
   * Check if an obligation has any approved evidence
   */
  async hasApprovedEvidence(obligationId: string): Promise<boolean> {
    const { data: links } = await supabaseAdmin
      .from('obligation_evidence_links')
      .select('evidence_id')
      .eq('obligation_id', obligationId)
      .is('deleted_at', null);

    if (!links || links.length === 0) {
      return false;
    }

    const { data: approved } = await supabaseAdmin
      .from('evidence_items')
      .select('id')
      .in('id', links.map(l => l.evidence_id))
      .eq('validation_status', 'APPROVED')
      .eq('is_archived', false)
      .limit(1);

    return (approved?.length || 0) > 0;
  }

  /**
   * Get expiring evidence items
   */
  async getExpiring(
    daysAhead: number,
    options: { companyId?: string; siteId?: string } = {}
  ): Promise<EvidenceWithRelations[]> {
    const now = new Date();
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + daysAhead);

    let query = supabaseAdmin
      .from('evidence_items')
      .select(`
        *,
        sites(id, name, site_name),
        users:created_by(id, full_name, email)
      `)
      .eq('is_archived', false)
      .is('deleted_at', null)
      .not('expiry_date', 'is', null)
      .gte('expiry_date', now.toISOString().split('T')[0])
      .lte('expiry_date', futureDate.toISOString().split('T')[0]);

    if (options.companyId) {
      query = query.eq('company_id', options.companyId);
    }
    if (options.siteId) {
      query = query.eq('site_id', options.siteId);
    }

    const { data, error } = await query.order('expiry_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch expiring evidence: ${error.message}`);
    }

    return (data || []) as unknown as EvidenceWithRelations[];
  }

  /**
   * Get expired evidence items
   */
  async getExpired(options: { companyId?: string; siteId?: string } = {}): Promise<EvidenceWithRelations[]> {
    const now = new Date().toISOString().split('T')[0];

    let query = supabaseAdmin
      .from('evidence_items')
      .select(`
        *,
        sites(id, name, site_name),
        users:created_by(id, full_name, email)
      `)
      .eq('is_archived', false)
      .is('deleted_at', null)
      .not('expiry_date', 'is', null)
      .lt('expiry_date', now);

    if (options.companyId) {
      query = query.eq('company_id', options.companyId);
    }
    if (options.siteId) {
      query = query.eq('site_id', options.siteId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch expired evidence: ${error.message}`);
    }

    return (data || []) as unknown as EvidenceWithRelations[];
  }

  /**
   * Update validation status
   */
  async updateValidationStatus(
    id: string,
    status: ValidationStatus,
    validatedBy: string
  ): Promise<void> {
    const { error } = await supabaseAdmin
      .from('evidence_items')
      .update({
        validation_status: status,
        validated_by: validatedBy,
        validated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update evidence validation status: ${error.message}`);
    }
  }

  /**
   * Archive evidence item
   */
  async archive(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('evidence_items')
      .update({
        is_archived: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to archive evidence: ${error.message}`);
    }
  }

  /**
   * Link evidence to an obligation
   */
  async linkToObligation(evidenceId: string, obligationId: string, linkedBy: string): Promise<void> {
    // Check if link already exists
    const { data: existing } = await supabaseAdmin
      .from('obligation_evidence_links')
      .select('id')
      .eq('evidence_id', evidenceId)
      .eq('obligation_id', obligationId)
      .is('deleted_at', null)
      .single();

    if (existing) {
      return; // Already linked
    }

    const { error } = await supabaseAdmin
      .from('obligation_evidence_links')
      .insert({
        evidence_id: evidenceId,
        obligation_id: obligationId,
        linked_by: linkedBy,
        created_at: new Date().toISOString(),
      });

    if (error) {
      throw new Error(`Failed to link evidence to obligation: ${error.message}`);
    }
  }

  /**
   * Unlink evidence from an obligation
   */
  async unlinkFromObligation(evidenceId: string, obligationId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('obligation_evidence_links')
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq('evidence_id', evidenceId)
      .eq('obligation_id', obligationId);

    if (error) {
      throw new Error(`Failed to unlink evidence from obligation: ${error.message}`);
    }
  }

  /**
   * Get evidence statistics
   */
  async getStats(options: { companyId?: string; siteId?: string } = {}): Promise<EvidenceStats> {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    let baseQuery = supabaseAdmin
      .from('evidence_items')
      .select('id, validation_status, is_archived, category, expiry_date')
      .is('deleted_at', null);

    if (options.companyId) {
      baseQuery = baseQuery.eq('company_id', options.companyId);
    }
    if (options.siteId) {
      baseQuery = baseQuery.eq('site_id', options.siteId);
    }

    const { data, error } = await baseQuery;

    if (error) {
      throw new Error(`Failed to fetch evidence stats: ${error.message}`);
    }

    const evidence = data || [];
    const nowDate = now.toISOString().split('T')[0];
    const futureDateStr = thirtyDaysFromNow.toISOString().split('T')[0];

    const stats: EvidenceStats = {
      total: evidence.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      archived: 0,
      expiringSoon: 0,
      byCategory: {},
    };

    for (const ev of evidence) {
      // Count by status
      if (ev.is_archived) {
        stats.archived++;
      } else {
        if (ev.validation_status === 'PENDING') stats.pending++;
        if (ev.validation_status === 'APPROVED') stats.approved++;
        if (ev.validation_status === 'REJECTED') stats.rejected++;
      }

      // Count expiring soon
      if (!ev.is_archived && ev.expiry_date && ev.expiry_date >= nowDate && ev.expiry_date <= futureDateStr) {
        stats.expiringSoon++;
      }

      // Count by category
      const cat = ev.category || 'OTHER';
      stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;
    }

    return stats;
  }

  /**
   * Soft delete evidence
   */
  async softDelete(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('evidence_items')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete evidence: ${error.message}`);
    }
  }

  /**
   * Get unlinked evidence (evidence not linked to any obligation)
   */
  async getUnlinked(options: { companyId?: string; siteId?: string } = {}): Promise<EvidenceWithRelations[]> {
    // Get all evidence
    let query = supabaseAdmin
      .from('evidence_items')
      .select(`
        *,
        sites(id, name, site_name),
        users:created_by(id, full_name, email)
      `)
      .eq('is_archived', false)
      .is('deleted_at', null);

    if (options.companyId) {
      query = query.eq('company_id', options.companyId);
    }
    if (options.siteId) {
      query = query.eq('site_id', options.siteId);
    }

    const { data: evidence, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch evidence: ${error.message}`);
    }

    if (!evidence || evidence.length === 0) {
      return [];
    }

    // Get all linked evidence IDs
    const { data: links } = await supabaseAdmin
      .from('obligation_evidence_links')
      .select('evidence_id')
      .in('evidence_id', evidence.map(e => e.id))
      .is('deleted_at', null);

    const linkedIds = new Set((links || []).map(l => l.evidence_id));

    // Filter to only unlinked evidence
    return evidence.filter(e => !linkedIds.has(e.id)) as unknown as EvidenceWithRelations[];
  }
}

export const evidenceService = new EvidenceService();
