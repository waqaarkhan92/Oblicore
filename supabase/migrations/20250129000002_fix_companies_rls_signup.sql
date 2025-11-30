-- Migration: 20250129000002_fix_companies_rls_signup.sql
-- Description: Fix companies INSERT policy to allow signup
-- Issue: Companies INSERT policy requires user_roles, but signup creates company before user_roles
-- Solution: Allow INSERT if user doesn't exist yet (signup case) OR if user is OWNER
-- Author: Build System
-- Date: 2025-01-29

-- ============================================================================
-- FIX COMPANIES INSERT POLICY FOR SIGNUP
-- ============================================================================

-- Drop existing INSERT policy
DROP POLICY IF EXISTS companies_insert_owner_access ON companies;

-- Create new INSERT policy that allows signup
-- During signup: user doesn't exist in users table yet, so we allow INSERT
-- After signup: Only Owner can create companies
CREATE POLICY companies_insert_owner_access ON companies
FOR INSERT
WITH CHECK (
  -- Allow if user doesn't exist in users table yet (signup case)
  -- This happens when creating first company during signup
  NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
  )
  OR
  -- Allow if user is Owner (for creating additional companies later)
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'OWNER'
  )
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify policy was created
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'companies'
    AND policyname = 'companies_insert_owner_access';
  
  IF policy_count != 1 THEN
    RAISE EXCEPTION 'Companies INSERT policy not found or duplicate';
  END IF;
  
  RAISE NOTICE 'Companies INSERT policy fixed for signup';
END $$;

