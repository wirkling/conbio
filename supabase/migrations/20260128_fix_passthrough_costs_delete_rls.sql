-- =====================================================
-- Fix Pass-Through Costs DELETE RLS Policy
-- =====================================================
-- This migration ensures the passthrough_costs DELETE policy exists
-- and is properly configured to allow authenticated users
-- to delete pass-through costs.
-- =====================================================

-- Drop existing delete policy if it exists (to recreate cleanly)
DROP POLICY IF EXISTS "Users can delete passthrough costs" ON passthrough_costs;

-- Recreate the delete policy with explicit permissions
CREATE POLICY "Users can delete passthrough costs"
  ON passthrough_costs FOR DELETE
  TO authenticated
  USING (true);

-- Verify RLS is enabled on passthrough_costs table
ALTER TABLE passthrough_costs ENABLE ROW LEVEL SECURITY;

-- Add comment for documentation
COMMENT ON POLICY "Users can delete passthrough costs" ON passthrough_costs IS
  'Allows authenticated users to delete pass-through costs. In production, this should be restricted by organization/role.';
