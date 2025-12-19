-- Add Missing RLS Policies for pack_sharing table
-- Audit identified that pack_sharing only had SELECT policy
-- Using has_company_access helper function for simpler policies

-- Ensure RLS is enabled
ALTER TABLE pack_sharing ENABLE ROW LEVEL SECURITY;

-- Add INSERT policy - Only users with company access can create shares
DROP POLICY IF EXISTS pack_sharing_insert_site_access ON pack_sharing;
CREATE POLICY pack_sharing_insert_site_access ON pack_sharing
    FOR INSERT WITH CHECK (has_company_access(auth.uid(), company_id));

-- Add UPDATE policy - Only users with company access can update shares
DROP POLICY IF EXISTS pack_sharing_update_site_access ON pack_sharing;
CREATE POLICY pack_sharing_update_site_access ON pack_sharing
    FOR UPDATE USING (has_company_access(auth.uid(), company_id));

-- Add DELETE policy - Only users with company access can delete pack shares
DROP POLICY IF EXISTS pack_sharing_delete_owner_admin_access ON pack_sharing;
CREATE POLICY pack_sharing_delete_owner_admin_access ON pack_sharing
    FOR DELETE USING (has_company_access(auth.uid(), company_id));
