/**
 * Test Cleanup Helper
 * Cleans up test data to avoid rate limiting and conflicts
 */

import { supabaseAdmin } from '../../lib/supabase/server';

export class TestCleanup {
  /**
   * Clean up test users and companies
   * Removes test data created during test runs
   */
  static async cleanupTestData(prefix: string = 'test_') {
    try {
      // Find test companies
      const { data: testCompanies } = await supabaseAdmin
        .from('companies')
        .select('id')
        .ilike('name', `${prefix}%`);

      if (testCompanies && testCompanies.length > 0) {
        const companyIds = testCompanies.map(c => c.id);

        // Delete test users (cascade will handle related data)
        await supabaseAdmin
          .from('users')
          .delete()
          .in('company_id', companyIds);

        // Delete test companies
        await supabaseAdmin
          .from('companies')
          .delete()
          .in('id', companyIds);
      }
    } catch (error) {
      console.warn('Test cleanup error (non-critical):', error);
    }
  }

  /**
   * Clean up test users by email pattern
   */
  static async cleanupTestUsers(emailPattern: string = 'test_') {
    try {
      const { data: testUsers } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .ilike('email', `${emailPattern}%`);

      if (testUsers && testUsers.length > 0) {
        const userIds = testUsers.map(u => u.id);

        // Delete from Supabase Auth
        for (const userId of userIds) {
          try {
            await supabaseAdmin.auth.admin.deleteUser(userId);
          } catch (error) {
            // Ignore errors (user might not exist in Auth)
          }
        }

        // Delete from users table (cascade will handle related data)
        await supabaseAdmin
          .from('users')
          .delete()
          .in('id', userIds);
      }
    } catch (error) {
      console.warn('Test user cleanup error (non-critical):', error);
    }
  }

  /**
   * Clean up old test data (older than 1 hour)
   */
  static async cleanupOldTestData() {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      // Find old test companies
      const { data: oldCompanies } = await supabaseAdmin
        .from('companies')
        .select('id')
        .ilike('name', 'test_%')
        .lt('created_at', oneHourAgo);

      if (oldCompanies && oldCompanies.length > 0) {
        const companyIds = oldCompanies.map(c => c.id);

        // Delete old test data
        await supabaseAdmin
          .from('users')
          .delete()
          .in('company_id', companyIds);

        await supabaseAdmin
          .from('companies')
          .delete()
          .in('id', companyIds);
      }
    } catch (error) {
      console.warn('Old test data cleanup error (non-critical):', error);
    }
  }
}

