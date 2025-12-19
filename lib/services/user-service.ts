/**
 * User Service
 * Centralized service for user-related database operations
 * Consolidates user query patterns from background jobs
 * Reference: Phase 4.1 - Service Layer Abstraction
 */

import { supabaseAdmin } from '@/lib/supabase/server';

export type UserRole = 'OWNER' | 'ADMIN' | 'STAFF' | 'CONSULTANT' | 'VIEWER';

export interface User {
  id: string;
  company_id: string;
  email: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  auth_provider: string;
  auth_provider_id?: string;
  email_verified: boolean;
  last_login_at?: string;
  notification_preferences: {
    email: boolean;
    sms: boolean;
    in_app: boolean;
  };
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface UserWithRoles extends User {
  user_roles?: Array<{
    id: string;
    role: UserRole;
    assigned_by?: string;
    assigned_at: string;
  }>;
  roles?: UserRole[];
}

export interface UserWithSites extends User {
  user_site_assignments?: Array<{
    id: string;
    site_id: string;
    assigned_by?: string;
    created_at: string;
  }>;
  site_ids?: string[];
}

export interface GetUsersOptions {
  companyId?: string;
  siteId?: string;
  roles?: UserRole | UserRole[];
  isActive?: boolean;
  includeDeleted?: boolean;
  includeRoles?: boolean;
  includeSites?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface NotificationRecipientOptions {
  companyId: string;
  siteId?: string;
  roles?: UserRole[];
  includeInactive?: boolean;
}

export class UserService {
  /**
   * Get a single user by ID
   */
  async getById(id: string, options: { includeRoles?: boolean; includeSites?: boolean } = {}): Promise<UserWithRoles | null> {
    const { includeRoles = false, includeSites = false } = options;

    let selectQuery = '*';

    if (includeRoles) {
      selectQuery = `
        *,
        user_roles(id, role, assigned_by, assigned_at)
      `;
    }

    if (includeSites) {
      selectQuery = `
        *,
        user_site_assignments(id, site_id, assigned_by, created_at)
      `;
    }

    if (includeRoles && includeSites) {
      selectQuery = `
        *,
        user_roles(id, role, assigned_by, assigned_at),
        user_site_assignments(id, site_id, assigned_by, created_at)
      `;
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select(selectQuery)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch user: ${error.message}`);
    }

    return this.transformUser(data);
  }

  /**
   * Get multiple users by IDs
   */
  async getByIds(ids: string[], options: { includeRoles?: boolean; includeSites?: boolean } = {}): Promise<UserWithRoles[]> {
    if (ids.length === 0) return [];

    const { includeRoles = false, includeSites = false } = options;

    let selectQuery = '*';

    if (includeRoles) {
      selectQuery = `
        *,
        user_roles(id, role, assigned_by, assigned_at)
      `;
    }

    if (includeSites) {
      selectQuery = `
        *,
        user_site_assignments(id, site_id, assigned_by, created_at)
      `;
    }

    if (includeRoles && includeSites) {
      selectQuery = `
        *,
        user_roles(id, role, assigned_by, assigned_at),
        user_site_assignments(id, site_id, assigned_by, created_at)
      `;
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select(selectQuery)
      .in('id', ids);

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    return (data || []).map(user => this.transformUser(user));
  }

  /**
   * Get users for a company with filtering and pagination
   */
  async getByCompany(
    companyId: string,
    options: GetUsersOptions = {}
  ): Promise<{
    data: UserWithRoles[];
    total: number;
  }> {
    const {
      siteId,
      roles,
      isActive = true,
      includeDeleted = false,
      includeRoles = false,
      includeSites = false,
      limit = 50,
      offset = 0,
      orderBy = 'created_at',
      orderDirection = 'desc',
    } = options;

    let selectQuery = '*';

    if (includeRoles && includeSites) {
      selectQuery = `
        *,
        user_roles(id, role, assigned_by, assigned_at),
        user_site_assignments(id, site_id, assigned_by, created_at)
      `;
    } else if (includeRoles) {
      selectQuery = `
        *,
        user_roles(id, role, assigned_by, assigned_at)
      `;
    } else if (includeSites) {
      selectQuery = `
        *,
        user_site_assignments(id, site_id, assigned_by, created_at)
      `;
    }

    let query = supabaseAdmin
      .from('users')
      .select(selectQuery, { count: 'exact' })
      .eq('company_id', companyId);

    // Filter by active status
    if (isActive !== undefined) {
      query = query.eq('is_active', isActive);
    }

    // Filter by deleted status
    if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }

    // Filter by site (requires join through user_site_assignments)
    if (siteId) {
      const { data: siteAssignments } = await supabaseAdmin
        .from('user_site_assignments')
        .select('user_id')
        .eq('site_id', siteId);

      if (siteAssignments && siteAssignments.length > 0) {
        const userIds = siteAssignments.map(sa => sa.user_id);
        query = query.in('id', userIds);
      } else {
        // No users assigned to this site
        return { data: [], total: 0 };
      }
    }

    // Filter by roles (requires join through user_roles)
    if (roles) {
      const roleList = Array.isArray(roles) ? roles : [roles];
      const { data: userRolesData } = await supabaseAdmin
        .from('user_roles')
        .select('user_id')
        .in('role', roleList);

      if (userRolesData && userRolesData.length > 0) {
        const userIds = [...new Set(userRolesData.map(ur => ur.user_id))];
        query = query.in('id', userIds);
      } else {
        // No users with these roles
        return { data: [], total: 0 };
      }
    }

    // Apply ordering and pagination
    query = query
      .order(orderBy, { ascending: orderDirection === 'asc' })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    return {
      data: (data || []).map(user => this.transformUser(user)),
      total: count || 0,
    };
  }

  /**
   * Get users with specific roles
   * This consolidates the getRoleUserIds pattern from jobs
   */
  async getByRole(
    companyId: string,
    roles: UserRole | UserRole[]
  ): Promise<UserWithRoles[]> {
    const roleList = Array.isArray(roles) ? roles : [roles];

    // First get user IDs with the specified roles
    const { data: userRoles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .in('role', roleList);

    if (rolesError) {
      throw new Error(`Failed to fetch user roles: ${rolesError.message}`);
    }

    if (!userRoles || userRoles.length === 0) {
      return [];
    }

    const userIds = [...new Set(userRoles.map(ur => ur.user_id))];

    // Then get the users filtered by company
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select(`
        *,
        user_roles(id, role, assigned_by, assigned_at)
      `)
      .eq('company_id', companyId)
      .in('id', userIds)
      .eq('is_active', true)
      .is('deleted_at', null);

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    return (users || []).map(user => this.transformUser(user));
  }

  /**
   * Get active users for a company
   */
  async getActiveUsers(companyId: string): Promise<UserWithRoles[]> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select(`
        *,
        user_roles(id, role, assigned_by, assigned_at)
      `)
      .eq('company_id', companyId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('full_name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch active users: ${error.message}`);
    }

    return (data || []).map(user => this.transformUser(user));
  }

  /**
   * Get users who should receive notifications
   * Common pattern: active users with specific roles for a company/site
   */
  async getNotificationRecipients(options: NotificationRecipientOptions): Promise<UserWithRoles[]> {
    const {
      companyId,
      siteId,
      roles = ['OWNER', 'ADMIN', 'STAFF'],
      includeInactive = false,
    } = options;

    let query = supabaseAdmin
      .from('users')
      .select(`
        id,
        email,
        full_name,
        company_id,
        is_active,
        notification_preferences,
        user_roles!inner(role)
      `)
      .eq('company_id', companyId)
      .in('user_roles.role', roles);

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    query = query.is('deleted_at', null);

    // If site_id is provided, filter by site assignments
    if (siteId) {
      const { data: siteAssignments } = await supabaseAdmin
        .from('user_site_assignments')
        .select('user_id')
        .eq('site_id', siteId);

      if (siteAssignments && siteAssignments.length > 0) {
        const userIds = siteAssignments.map(sa => sa.user_id);
        query = query.in('id', userIds);
      } else {
        // No users assigned to this site, fallback to all company users with roles
        // This allows company-wide notifications even if no site-specific assignments
      }
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch notification recipients: ${error.message}`);
    }

    return (data || []).map(user => this.transformUser(user));
  }

  /**
   * Get admin and owner users for a company
   * Common pattern for escalations and critical notifications
   */
  async getAdminsAndOwners(companyId: string): Promise<UserWithRoles[]> {
    return this.getByRole(companyId, ['ADMIN', 'OWNER']);
  }

  /**
   * Search users by name or email
   */
  async searchUsers(
    query: string,
    companyId?: string,
    options: { limit?: number; includeRoles?: boolean } = {}
  ): Promise<UserWithRoles[]> {
    const { limit = 20, includeRoles = false } = options;
    const searchTerm = `%${query}%`;

    let selectQuery = '*';
    if (includeRoles) {
      selectQuery = `
        *,
        user_roles(id, role, assigned_by, assigned_at)
      `;
    }

    let dbQuery = supabaseAdmin
      .from('users')
      .select(selectQuery)
      .is('deleted_at', null)
      .or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm}`);

    if (companyId) {
      dbQuery = dbQuery.eq('company_id', companyId);
    }

    const { data, error } = await dbQuery
      .limit(limit)
      .order('full_name', { ascending: true });

    if (error) {
      throw new Error(`Failed to search users: ${error.message}`);
    }

    return (data || []).map(user => this.transformUser(user));
  }

  /**
   * Get user with their roles
   * Common pattern for authorization checks
   */
  async getUserWithRoles(userId: string): Promise<UserWithRoles | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select(`
        *,
        user_roles(id, role, assigned_by, assigned_at)
      `)
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch user with roles: ${error.message}`);
    }

    return this.transformUser(data);
  }

  /**
   * Get user IDs by role (lightweight version for filtering)
   * Replicates the getRoleUserIds pattern from jobs
   */
  async getUserIdsByRole(companyId: string, roles: UserRole[]): Promise<string[]> {
    // Get user IDs with the specified roles
    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .in('role', roles);

    if (!userRoles) return [];

    const userIds = [...new Set(userRoles.map(ur => ur.user_id))];

    // Filter by company and active status
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('company_id', companyId)
      .in('id', userIds)
      .eq('is_active', true)
      .is('deleted_at', null);

    return users?.map(u => u.id) || [];
  }

  /**
   * Get users by site assignment
   */
  async getUsersBySite(siteId: string, options: { includeRoles?: boolean } = {}): Promise<UserWithRoles[]> {
    const { includeRoles = false } = options;

    // Get user IDs assigned to this site
    const { data: assignments } = await supabaseAdmin
      .from('user_site_assignments')
      .select('user_id')
      .eq('site_id', siteId);

    if (!assignments || assignments.length === 0) {
      return [];
    }

    const userIds = [...new Set(assignments.map(a => a.user_id))];

    let selectQuery = '*';
    if (includeRoles) {
      selectQuery = `
        *,
        user_roles(id, role, assigned_by, assigned_at)
      `;
    }

    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select(selectQuery)
      .in('id', userIds)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('full_name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch users by site: ${error.message}`);
    }

    return (users || []).map(user => this.transformUser(user));
  }

  /**
   * Update user
   */
  async update(id: string, updates: Partial<User>): Promise<UserWithRoles> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        user_roles(id, role, assigned_by, assigned_at)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }

    return this.transformUser(data);
  }

  /**
   * Soft delete a user
   */
  async softDelete(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('users')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: false,
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  /**
   * Assign role to user
   */
  async assignRole(userId: string, role: UserRole, assignedBy?: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userId,
        role,
        assigned_by: assignedBy,
      });

    if (error) {
      // Check if it's a duplicate error
      if (error.code === '23505') {
        // User already has this role, not an error
        return;
      }
      throw new Error(`Failed to assign role: ${error.message}`);
    }
  }

  /**
   * Remove role from user
   */
  async removeRole(userId: string, role: UserRole): Promise<void> {
    const { error } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', role);

    if (error) {
      throw new Error(`Failed to remove role: ${error.message}`);
    }
  }

  /**
   * Assign user to site
   */
  async assignToSite(userId: string, siteId: string, assignedBy?: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('user_site_assignments')
      .insert({
        user_id: userId,
        site_id: siteId,
        assigned_by: assignedBy,
      });

    if (error) {
      // Check if it's a duplicate error
      if (error.code === '23505') {
        // User already assigned to this site, not an error
        return;
      }
      throw new Error(`Failed to assign user to site: ${error.message}`);
    }
  }

  /**
   * Remove user from site
   */
  async removeFromSite(userId: string, siteId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('user_site_assignments')
      .delete()
      .eq('user_id', userId)
      .eq('site_id', siteId);

    if (error) {
      throw new Error(`Failed to remove user from site: ${error.message}`);
    }
  }

  /**
   * Transform user data to add computed fields
   * Extracts roles array from user_roles relation
   */
  private transformUser(user: any): UserWithRoles {
    const transformed = { ...user };

    // Extract roles array from user_roles relation
    if (user.user_roles && Array.isArray(user.user_roles)) {
      transformed.roles = user.user_roles.map((ur: any) => ur.role);
    }

    // Extract site IDs from user_site_assignments relation
    if (user.user_site_assignments && Array.isArray(user.user_site_assignments)) {
      transformed.site_ids = user.user_site_assignments.map((usa: any) => usa.site_id);
    }

    return transformed;
  }
}

// Export singleton instance
export const userService = new UserService();
