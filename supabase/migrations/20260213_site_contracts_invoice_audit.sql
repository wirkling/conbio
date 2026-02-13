-- =====================================================
-- Site Contracts & Invoice Audit
-- =====================================================
-- Adds 'site_contract' contract type for clinical trial
-- site agreements and an AI-powered invoice audit system
-- that compares invoices against contract fee schedules.
-- =====================================================

-- ============================================
-- 1. ENUMS
-- ============================================

ALTER TYPE contract_type ADD VALUE 'site_contract';

CREATE TYPE invoice_audit_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- ============================================
-- 2. INVOICE AUDITS TABLE
-- ============================================

CREATE TABLE invoice_audits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,

  -- Invoice file info
  invoice_file_name TEXT NOT NULL,
  invoice_file_path TEXT NOT NULL,
  invoice_file_size_bytes BIGINT,

  -- Contract document reference
  contract_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  contract_document_path TEXT,

  -- Status
  status invoice_audit_status NOT NULL DEFAULT 'pending',
  error_message TEXT,

  -- AI audit results (structured JSON)
  audit_result JSONB,

  -- Summary fields for quick display
  total_discrepancies INTEGER DEFAULT 0,
  invoice_total DECIMAL(15, 2),
  contract_expected_total DECIMAL(15, 2),
  currency TEXT DEFAULT 'EUR',

  -- Meta
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- 3. INDEXES
-- ============================================

CREATE INDEX idx_invoice_audits_contract ON invoice_audits(contract_id);
CREATE INDEX idx_invoice_audits_status ON invoice_audits(status);
CREATE INDEX idx_invoice_audits_created_at ON invoice_audits(created_at DESC);

-- ============================================
-- 4. TRIGGERS
-- ============================================

CREATE TRIGGER update_invoice_audits_updated_at
  BEFORE UPDATE ON invoice_audits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE invoice_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all invoice_audits"
  ON invoice_audits FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert invoice_audits"
  ON invoice_audits FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update invoice_audits"
  ON invoice_audits FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete invoice_audits"
  ON invoice_audits FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- 6. STORAGE BUCKET
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for invoices bucket
CREATE POLICY "Users can upload invoices"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'invoices');

CREATE POLICY "Users can view invoices"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'invoices');

CREATE POLICY "Users can update invoices"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'invoices')
  WITH CHECK (bucket_id = 'invoices');

CREATE POLICY "Users can delete invoices"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'invoices');

-- ============================================
-- 7. COMMENTS
-- ============================================

COMMENT ON TABLE invoice_audits IS
  'AI-powered invoice audit results. Each record represents one invoice audited against a site contract''s fee schedule.';

COMMENT ON COLUMN invoice_audits.audit_result IS
  'Structured JSON containing: summary, line_items[], discrepancies[], recommendations[], extracted_contract_terms';

COMMENT ON TYPE invoice_audit_status IS
  'Status of an invoice audit: pending (queued), processing (AI analyzing), completed (results ready), failed (error occurred)';
