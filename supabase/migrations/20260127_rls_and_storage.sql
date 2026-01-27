-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================
-- This migration enables RLS on all tables and creates policies
-- that allow authenticated users to access their organization's data.
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_order_passthrough_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE passthrough_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inflation_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Contracts Table Policies
-- =====================================================

-- Allow authenticated users to view all contracts
CREATE POLICY "Users can view all contracts"
  ON contracts FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert contracts
CREATE POLICY "Users can insert contracts"
  ON contracts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Allow authenticated users to update contracts
CREATE POLICY "Users can update contracts"
  ON contracts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete contracts (optional - consider restricting)
CREATE POLICY "Users can delete contracts"
  ON contracts FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- Milestones Table Policies
-- =====================================================

CREATE POLICY "Users can view all milestones"
  ON milestones FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert milestones"
  ON milestones FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update milestones"
  ON milestones FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete milestones"
  ON milestones FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- Milestone Changes Table Policies
-- =====================================================

CREATE POLICY "Users can view milestone changes"
  ON milestone_changes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert milestone changes"
  ON milestone_changes FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- Change Orders Table Policies
-- =====================================================

CREATE POLICY "Users can view all change orders"
  ON change_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert change orders"
  ON change_orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update change orders"
  ON change_orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete change orders"
  ON change_orders FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- Change Order PTC Adjustments Policies
-- =====================================================

CREATE POLICY "Users can view CO PTC adjustments"
  ON change_order_passthrough_adjustments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert CO PTC adjustments"
  ON change_order_passthrough_adjustments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update CO PTC adjustments"
  ON change_order_passthrough_adjustments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete CO PTC adjustments"
  ON change_order_passthrough_adjustments FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- Pass-Through Costs Table Policies
-- =====================================================

CREATE POLICY "Users can view passthrough costs"
  ON passthrough_costs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert passthrough costs"
  ON passthrough_costs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update passthrough costs"
  ON passthrough_costs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete passthrough costs"
  ON passthrough_costs FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- Inflation Rates Table Policies
-- =====================================================

CREATE POLICY "Users can view inflation rates"
  ON inflation_rates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert inflation rates"
  ON inflation_rates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update inflation rates"
  ON inflation_rates FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete inflation rates"
  ON inflation_rates FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- Audit Log Table Policies
-- =====================================================

CREATE POLICY "Users can view audit logs"
  ON audit_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert audit logs"
  ON audit_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Audit log should not be updateable or deleteable
-- No UPDATE or DELETE policies = these operations are blocked

-- =====================================================
-- Supabase Storage Buckets
-- =====================================================

-- Create storage bucket for change order documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('change-orders', 'change-orders', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for contract documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('contract-documents', 'contract-documents', false)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Storage Policies for change-orders bucket
-- =====================================================

-- Allow authenticated users to upload files
CREATE POLICY "Users can upload change order documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'change-orders');

-- Allow authenticated users to view files
CREATE POLICY "Users can view change order documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'change-orders');

-- Allow authenticated users to update files (e.g., replace)
CREATE POLICY "Users can update change order documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'change-orders')
  WITH CHECK (bucket_id = 'change-orders');

-- Allow authenticated users to delete files
CREATE POLICY "Users can delete change order documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'change-orders');

-- =====================================================
-- Storage Policies for contract-documents bucket
-- =====================================================

-- Allow authenticated users to upload files
CREATE POLICY "Users can upload contract documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'contract-documents');

-- Allow authenticated users to view files
CREATE POLICY "Users can view contract documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'contract-documents');

-- Allow authenticated users to update files
CREATE POLICY "Users can update contract documents"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'contract-documents')
  WITH CHECK (bucket_id = 'contract-documents');

-- Allow authenticated users to delete files
CREATE POLICY "Users can delete contract documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'contract-documents');

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON POLICY "Users can view all contracts" ON contracts IS
  'Allow authenticated users to view all contracts. In a multi-tenant setup, this should be restricted by organization_id.';

COMMENT ON POLICY "Users can insert audit logs" ON audit_log IS
  'Users can only insert audit logs for themselves (auth.uid() = user_id)';

COMMENT ON TABLE storage.buckets IS
  'Storage buckets for file uploads. change-orders bucket stores CO documents, contract-documents stores contract files.';
