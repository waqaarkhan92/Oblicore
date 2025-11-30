-- Migration: 20250129000001_fix_users_rls_recursion.sql
-- Description: Fix infinite recursion in users table RLS policies
-- Issue: Policies query users table causing recursion
-- Solution: Use helper function or allow service role to bypass during signup
-- Author: Build System
-- Date: 2025-01-29

-- ============================================================================
-- FIX USERS TABLE RLS POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS users_select_company_access ON users;
DROP POLICY IF EXISTS users_insert_owner_admin_access ON users;
DROP POLICY IF EXISTS users_update_owner_admin_access ON users;
DROP POLICY IF EXISTS users_delete_owner_access ON users;

-- Create helper function to get user's company_id (bypasses RLS with SECURITY DEFINER)
CREATE OR REPLACE FUNCTION get_user_company_id(user_id UUID)
RETURNS UUID AS $$
DECLARE
  result UUID;
BEGIN
  SELECT company_id INTO result
  FROM users
  WHERE id = get_user_company_id.user_id
  AND deleted_at IS NULL;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Policy 1: SELECT - Users can see users in their company
CREATE POLICY users_select_company_access ON users
FOR SELECT
USING (
  deleted_at IS NULL
  AND (
    -- Regular users: users in their own company
    company_id = get_user_company_id(auth.uid())
    OR
    -- Consultants: users in assigned client companies
    company_id IN (
      SELECT client_company_id FROM consultant_client_assignments
      WHERE consultant_id = auth.uid()
      AND status = 'ACTIVE'
    )
    OR
    -- Users can always see themselves
    id = auth.uid()
  )
);

-- Policy 2: INSERT - Allow during signup (service role bypasses RLS)
-- For regular operations, Owner/Admin can create users
CREATE POLICY users_insert_owner_admin_access ON users
FOR INSERT
WITH CHECK (
  -- Allow if user is creating their own record (signup case)
  -- This happens when id = auth.uid() and company_id is set
  id = auth.uid()
  OR
  -- Allow Owner/Admin to create users in their company
  (
    company_id = get_user_company_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('OWNER', 'ADMIN')
    )
  )
);

-- Policy 3: UPDATE - Owner/Admin can update users in their company, or users can update themselves
CREATE POLICY users_update_owner_admin_access ON users
FOR UPDATE
USING (
  (
    -- Owner/Admin of their own company can update users in their company
    company_id = get_user_company_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('OWNER', 'ADMIN')
    )
  )
  OR
  -- Users can update their own profile
  id = auth.uid()
)
WITH CHECK (
  -- Same condition as USING
  (
    company_id = get_user_company_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('OWNER', 'ADMIN')
    )
  )
  OR
  id = auth.uid()
);

-- Policy 4: DELETE - Only Owner can delete users
CREATE POLICY users_delete_owner_access ON users
FOR DELETE
USING (
  -- Only Owner of their own company can delete users
  company_id = get_user_company_id(auth.uid())
  AND EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'OWNER'
  )
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify policies were created
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'users';
  
  IF policy_count < 4 THEN
    RAISE EXCEPTION 'Expected 4 policies on users table, found %', policy_count;
  END IF;
  
  RAISE NOTICE 'Users table RLS policies fixed: % policies created', policy_count;
END $$;

