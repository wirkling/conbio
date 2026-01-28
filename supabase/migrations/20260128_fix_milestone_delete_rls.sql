-- =====================================================
-- Fix Milestone DELETE RLS Policy
-- =====================================================
-- This migration ensures the milestone DELETE policy exists
-- and is properly configured to allow authenticated users
-- to delete milestones.
-- =====================================================

-- Drop existing delete policy if it exists (to recreate cleanly)
DROP POLICY IF EXISTS "Users can delete milestones" ON milestones;

-- Recreate the delete policy with explicit permissions
CREATE POLICY "Users can delete milestones"
  ON milestones FOR DELETE
  TO authenticated
  USING (true);

-- Verify RLS is enabled on milestones table
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

-- Add comment for documentation
COMMENT ON POLICY "Users can delete milestones" ON milestones IS
  'Allows authenticated users to delete milestones. In production, this should be restricted by organization/role.';
