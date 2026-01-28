-- =====================================================
-- Fix Change Orders DELETE RLS Policy
-- =====================================================
-- This migration ensures the change_orders DELETE policy exists
-- and is properly configured to allow authenticated users
-- to delete change orders.
-- =====================================================

-- Drop existing delete policy if it exists (to recreate cleanly)
DROP POLICY IF EXISTS "Users can delete change orders" ON change_orders;

-- Recreate the delete policy with explicit permissions
CREATE POLICY "Users can delete change orders"
  ON change_orders FOR DELETE
  TO authenticated
  USING (true);

-- Verify RLS is enabled on change_orders table
ALTER TABLE change_orders ENABLE ROW LEVEL SECURITY;

-- Add comment for documentation
COMMENT ON POLICY "Users can delete change orders" ON change_orders IS
  'Allows authenticated users to delete change orders. In production, this should be restricted by organization/role.';
