-- =====================================================
-- PTC Prepayment / Retainer Tracking
-- =====================================================
-- Adds prepayment tracking for pass-through costs.
-- Two models: retainer/bucket (refillable fund) and
-- hold & repay (lump sum held until reconciliation).
-- =====================================================

-- ============================================
-- 1. ENUMS
-- ============================================

CREATE TYPE prepayment_model AS ENUM ('retainer', 'hold_repay');
CREATE TYPE prepayment_direction AS ENUM ('receive', 'pay');
CREATE TYPE prepayment_payment_terms AS ENUM (
  'upon_signature',
  '30_days_after_signature',
  '60_days_after_signature',
  'upon_study_start',
  'custom'
);

-- ============================================
-- 2. PTC PREPAYMENTS TABLE (one per contract)
-- ============================================

CREATE TABLE ptc_prepayments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,

  -- Model & direction
  prepayment_model prepayment_model NOT NULL,
  direction prepayment_direction NOT NULL DEFAULT 'receive',

  -- Payment terms
  payment_terms prepayment_payment_terms NOT NULL DEFAULT 'upon_signature',
  payment_terms_custom TEXT,

  -- Amount
  prepayment_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',

  -- Retainer fields
  threshold_amount DECIMAL(15, 2),
  threshold_percentage DECIMAL(5, 2),

  -- Hold & Repay fields
  reconciliation_trigger TEXT,
  reconciliation_milestone_id UUID REFERENCES milestones(id) ON DELETE SET NULL,
  reconciliation_date DATE,
  reconciled BOOLEAN NOT NULL DEFAULT FALSE,
  reconciled_date DATE,
  reconciled_amount DECIMAL(15, 2),

  -- Payment status
  payment_received BOOLEAN NOT NULL DEFAULT FALSE,
  payment_received_date DATE,

  -- Meta
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- One prepayment config per contract
  CONSTRAINT uq_ptc_prepayments_contract UNIQUE (contract_id)
);

CREATE INDEX idx_ptc_prepayments_contract ON ptc_prepayments(contract_id);

-- ============================================
-- 3. PTC PREPAYMENT TOP-UPS (retainer refills)
-- ============================================

CREATE TABLE ptc_prepayment_topups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prepayment_id UUID NOT NULL REFERENCES ptc_prepayments(id) ON DELETE CASCADE,

  amount DECIMAL(15, 2) NOT NULL,
  topup_date DATE NOT NULL DEFAULT CURRENT_DATE,
  invoice_number TEXT,
  invoice_url TEXT,
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_ptc_prepayment_topups_prepayment ON ptc_prepayment_topups(prepayment_id);

-- ============================================
-- 4. ALTER passthrough_actuals - add invoice_url
-- ============================================

ALTER TABLE passthrough_actuals ADD COLUMN IF NOT EXISTS invoice_url TEXT;

-- ============================================
-- 5. BALANCE VIEW
-- ============================================

CREATE OR REPLACE VIEW ptc_prepayment_balance AS
SELECT
  p.id AS prepayment_id,
  p.contract_id,
  p.prepayment_model,
  p.prepayment_amount,
  p.currency,
  p.threshold_amount,
  p.threshold_percentage,

  -- Total funded = initial amount + all top-ups
  p.prepayment_amount + COALESCE(t.total_topups, 0) AS total_funded,

  -- Total drawn = sum of all passthrough actuals for this contract's PTC categories
  COALESCE(a.total_drawn, 0) AS total_drawn,

  -- Current balance
  p.prepayment_amount + COALESCE(t.total_topups, 0) - COALESCE(a.total_drawn, 0) AS current_balance,

  -- Below threshold check
  CASE
    WHEN p.prepayment_model = 'retainer' AND p.threshold_amount IS NOT NULL THEN
      (p.prepayment_amount + COALESCE(t.total_topups, 0) - COALESCE(a.total_drawn, 0)) < p.threshold_amount
    WHEN p.prepayment_model = 'retainer' AND p.threshold_percentage IS NOT NULL THEN
      (p.prepayment_amount + COALESCE(t.total_topups, 0) - COALESCE(a.total_drawn, 0))
        < ((p.prepayment_amount + COALESCE(t.total_topups, 0)) * p.threshold_percentage / 100)
    ELSE FALSE
  END AS is_below_threshold

FROM ptc_prepayments p

LEFT JOIN (
  SELECT prepayment_id, SUM(amount) AS total_topups
  FROM ptc_prepayment_topups
  GROUP BY prepayment_id
) t ON t.prepayment_id = p.id

LEFT JOIN (
  SELECT pc.contract_id, SUM(pa.amount) AS total_drawn
  FROM passthrough_actuals pa
  JOIN passthrough_costs pc ON pc.id = pa.passthrough_cost_id
  GROUP BY pc.contract_id
) a ON a.contract_id = p.contract_id;

-- ============================================
-- 6. TRIGGERS
-- ============================================

-- updated_at trigger for ptc_prepayments
CREATE TRIGGER update_ptc_prepayments_updated_at
  BEFORE UPDATE ON ptc_prepayments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- updated_at trigger for ptc_prepayment_topups
CREATE TRIGGER update_ptc_prepayment_topups_updated_at
  BEFORE UPDATE ON ptc_prepayment_topups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE ptc_prepayments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ptc_prepayment_topups ENABLE ROW LEVEL SECURITY;

-- ptc_prepayments policies
CREATE POLICY "Users can view all ptc_prepayments"
  ON ptc_prepayments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert ptc_prepayments"
  ON ptc_prepayments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update ptc_prepayments"
  ON ptc_prepayments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete ptc_prepayments"
  ON ptc_prepayments FOR DELETE
  TO authenticated
  USING (true);

-- ptc_prepayment_topups policies
CREATE POLICY "Users can view all ptc_prepayment_topups"
  ON ptc_prepayment_topups FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert ptc_prepayment_topups"
  ON ptc_prepayment_topups FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update ptc_prepayment_topups"
  ON ptc_prepayment_topups FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete ptc_prepayment_topups"
  ON ptc_prepayment_topups FOR DELETE
  TO authenticated
  USING (true);

-- passthrough_actuals: add missing update/delete policies
CREATE POLICY "Users can update passthrough_actuals"
  ON passthrough_actuals FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete passthrough_actuals"
  ON passthrough_actuals FOR DELETE
  TO authenticated
  USING (true);
