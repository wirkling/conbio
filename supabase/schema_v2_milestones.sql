-- Symbio Contract Management System - Schema V2
-- Adds: Milestones, Pass-through Costs, Vendor Relationships
-- Run AFTER schema.sql

-- ============================================
-- CONTRACT RELATIONSHIP TYPES (Enhanced)
-- ============================================

-- Drop and recreate relationship type enum with more options
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_relationship_type_check;
DROP TYPE IF EXISTS relationship_type CASCADE;

CREATE TYPE relationship_type AS ENUM (
  'amendment',
  'renewal',
  'sub_contract',
  'vendor_contract',    -- Vendor linked to client MSA/project
  'pass_through'        -- Pass-through cost relationship
);

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS relationship_type relationship_type;

-- ============================================
-- MILESTONES TABLE
-- ============================================

CREATE TYPE milestone_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'delayed',
  'cancelled'
);

CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,

  -- Milestone details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  milestone_number INTEGER,

  -- Original values (as defined in contract)
  original_due_date DATE,
  original_value DECIMAL(15, 2),

  -- Current values (after change orders)
  current_due_date DATE,
  current_value DECIMAL(15, 2),

  -- Status tracking
  status milestone_status DEFAULT 'pending',
  completed_date DATE,

  -- Payment tracking
  invoiced BOOLEAN DEFAULT FALSE,
  invoiced_date DATE,
  paid BOOLEAN DEFAULT FALSE,
  paid_date DATE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Index for milestone queries
CREATE INDEX idx_milestones_contract ON milestones(contract_id);
CREATE INDEX idx_milestones_due_date ON milestones(current_due_date) WHERE status IN ('pending', 'in_progress');
CREATE INDEX idx_milestones_status ON milestones(status);

-- ============================================
-- MILESTONE CHANGES (via Change Orders)
-- ============================================

CREATE TABLE milestone_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  change_order_id UUID NOT NULL REFERENCES change_orders(id) ON DELETE CASCADE,

  -- What changed
  previous_due_date DATE,
  new_due_date DATE,
  previous_value DECIMAL(15, 2),
  new_value DECIMAL(15, 2),

  change_reason TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_milestone_changes_milestone ON milestone_changes(milestone_id);
CREATE INDEX idx_milestone_changes_co ON milestone_changes(change_order_id);

-- ============================================
-- PASS-THROUGH COSTS TABLE
-- ============================================

CREATE TYPE passthrough_type AS ENUM (
  'total',           -- Fixed total amount for contract
  'quarterly',       -- Estimated per quarter
  'monthly',         -- Estimated per month
  'per_unit'         -- Per patient/site/unit
);

CREATE TYPE cost_category AS ENUM (
  'investigator_fees',
  'lab_costs',
  'imaging',
  'travel',
  'equipment',
  'regulatory',
  'other'
);

CREATE TABLE passthrough_costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,

  -- Cost definition
  category cost_category NOT NULL,
  description VARCHAR(255),
  passthrough_type passthrough_type NOT NULL DEFAULT 'total',

  -- Budgeted amounts
  budgeted_total DECIMAL(15, 2),           -- For 'total' type
  budgeted_per_period DECIMAL(15, 2),      -- For quarterly/monthly
  budgeted_per_unit DECIMAL(15, 2),        -- For per_unit
  estimated_units INTEGER,                  -- Expected number of units

  -- Currency
  currency VARCHAR(3) DEFAULT 'EUR',

  -- Actuals tracking
  actual_spent DECIMAL(15, 2) DEFAULT 0,

  -- Period tracking (for quarterly/monthly)
  period_start DATE,
  period_end DATE,

  -- Vendor link (if this pass-through goes to a specific vendor)
  vendor_contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_passthrough_contract ON passthrough_costs(contract_id);
CREATE INDEX idx_passthrough_category ON passthrough_costs(category);
CREATE INDEX idx_passthrough_vendor ON passthrough_costs(vendor_contract_id);

-- ============================================
-- PASS-THROUGH ACTUALS (Tracking spend)
-- ============================================

CREATE TABLE passthrough_actuals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  passthrough_cost_id UUID NOT NULL REFERENCES passthrough_costs(id) ON DELETE CASCADE,

  -- Transaction details
  amount DECIMAL(15, 2) NOT NULL,
  transaction_date DATE NOT NULL,
  description VARCHAR(255),

  -- Period (for quarterly/monthly tracking)
  period_year INTEGER,
  period_quarter INTEGER,  -- 1-4
  period_month INTEGER,    -- 1-12

  -- Reference
  invoice_number VARCHAR(100),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_passthrough_actuals_cost ON passthrough_actuals(passthrough_cost_id);
CREATE INDEX idx_passthrough_actuals_date ON passthrough_actuals(transaction_date);

-- ============================================
-- VENDOR REVENUE SHARE
-- ============================================

CREATE TYPE revenue_share_type AS ENUM (
  'percentage',        -- % of sponsor revenue
  'fixed',             -- Fixed amount
  'per_unit',          -- Per patient/site/unit
  'tiered'             -- Tiered based on volume
);

CREATE TABLE vendor_revenue_share (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Links
  vendor_contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  client_contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,

  -- Revenue share definition
  share_type revenue_share_type NOT NULL,
  percentage DECIMAL(5, 2),               -- For percentage type (e.g., 15.00 = 15%)
  fixed_amount DECIMAL(15, 2),            -- For fixed type
  per_unit_amount DECIMAL(15, 2),         -- For per_unit type
  currency VARCHAR(3) DEFAULT 'EUR',

  -- Scope
  description TEXT,
  applies_to VARCHAR(255),                -- e.g., "All lab work", "Imaging only"

  -- Tracking
  total_shared DECIMAL(15, 2) DEFAULT 0,  -- Running total paid to vendor

  -- Validity
  effective_from DATE,
  effective_until DATE,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_revenue_share_vendor ON vendor_revenue_share(vendor_contract_id);
CREATE INDEX idx_revenue_share_client ON vendor_revenue_share(client_contract_id);

-- ============================================
-- ENHANCED CONTRACT VIEWS
-- ============================================

-- View: Contract with milestone summary
CREATE OR REPLACE VIEW contract_milestone_summary AS
SELECT
  c.id AS contract_id,
  c.title,
  COUNT(m.id) AS total_milestones,
  COUNT(CASE WHEN m.status = 'completed' THEN 1 END) AS completed_milestones,
  COUNT(CASE WHEN m.status IN ('pending', 'in_progress') AND m.current_due_date < CURRENT_DATE THEN 1 END) AS overdue_milestones,
  SUM(m.original_value) AS total_milestone_value,
  SUM(CASE WHEN m.status = 'completed' THEN m.current_value ELSE 0 END) AS completed_value,
  MIN(CASE WHEN m.status IN ('pending', 'in_progress') THEN m.current_due_date END) AS next_milestone_date
FROM contracts c
LEFT JOIN milestones m ON c.id = m.contract_id
GROUP BY c.id, c.title;

-- View: Contract with pass-through summary
CREATE OR REPLACE VIEW contract_passthrough_summary AS
SELECT
  c.id AS contract_id,
  c.title,
  SUM(pt.budgeted_total) AS total_passthrough_budget,
  SUM(pt.actual_spent) AS total_passthrough_spent,
  SUM(pt.budgeted_total) - SUM(pt.actual_spent) AS passthrough_remaining,
  CASE
    WHEN SUM(pt.budgeted_total) > 0
    THEN ROUND((SUM(pt.actual_spent) / SUM(pt.budgeted_total)) * 100, 1)
    ELSE 0
  END AS passthrough_utilization_pct
FROM contracts c
LEFT JOIN passthrough_costs pt ON c.id = pt.contract_id
GROUP BY c.id, c.title;

-- View: Vendor contract with linked client contracts
CREATE OR REPLACE VIEW vendor_client_relationships AS
SELECT
  vc.id AS vendor_contract_id,
  vc.title AS vendor_contract_title,
  vc.vendor_name,
  cc.id AS client_contract_id,
  cc.title AS client_contract_title,
  cc.client_name AS sponsor_name,
  vrs.share_type,
  vrs.percentage AS revenue_share_pct,
  vrs.total_shared
FROM contracts vc
JOIN vendor_revenue_share vrs ON vc.id = vrs.vendor_contract_id
JOIN contracts cc ON vrs.client_contract_id = cc.id
WHERE vc.contract_type IN ('service_agreement', 'sow', 'other');

-- ============================================
-- TRIGGERS
-- ============================================

-- Update milestone current values from original if not set
CREATE OR REPLACE FUNCTION set_milestone_current_values()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_due_date IS NULL THEN
    NEW.current_due_date = NEW.original_due_date;
  END IF;
  IF NEW.current_value IS NULL THEN
    NEW.current_value = NEW.original_value;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_milestone_defaults
  BEFORE INSERT ON milestones
  FOR EACH ROW
  EXECUTE FUNCTION set_milestone_current_values();

-- Update passthrough actual_spent when actuals are added
CREATE OR REPLACE FUNCTION update_passthrough_spent()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE passthrough_costs
  SET actual_spent = (
    SELECT COALESCE(SUM(amount), 0)
    FROM passthrough_actuals
    WHERE passthrough_cost_id = NEW.passthrough_cost_id
  ),
  updated_at = NOW()
  WHERE id = NEW.passthrough_cost_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_passthrough_on_actual
  AFTER INSERT OR UPDATE OR DELETE ON passthrough_actuals
  FOR EACH ROW
  EXECUTE FUNCTION update_passthrough_spent();

-- Update milestones timestamp
CREATE TRIGGER update_milestones_updated_at
  BEFORE UPDATE ON milestones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE passthrough_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE passthrough_actuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_revenue_share ENABLE ROW LEVEL SECURITY;

-- Permissive policies for MVP
CREATE POLICY "Users can view all milestones" ON milestones FOR SELECT USING (true);
CREATE POLICY "Users can insert milestones" ON milestones FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update milestones" ON milestones FOR UPDATE USING (true);

CREATE POLICY "Users can view all milestone_changes" ON milestone_changes FOR SELECT USING (true);
CREATE POLICY "Users can insert milestone_changes" ON milestone_changes FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view all passthrough_costs" ON passthrough_costs FOR SELECT USING (true);
CREATE POLICY "Users can insert passthrough_costs" ON passthrough_costs FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update passthrough_costs" ON passthrough_costs FOR UPDATE USING (true);

CREATE POLICY "Users can view all passthrough_actuals" ON passthrough_actuals FOR SELECT USING (true);
CREATE POLICY "Users can insert passthrough_actuals" ON passthrough_actuals FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view all vendor_revenue_share" ON vendor_revenue_share FOR SELECT USING (true);
CREATE POLICY "Users can insert vendor_revenue_share" ON vendor_revenue_share FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update vendor_revenue_share" ON vendor_revenue_share FOR UPDATE USING (true);

-- ============================================
-- SAMPLE DATA
-- ============================================

-- Get the first contract (MSA) for sample data
DO $$
DECLARE
  msa_id UUID;
  vendor_id UUID;
  milestone_id UUID;
BEGIN
  -- Get existing MSA
  SELECT id INTO msa_id FROM contracts WHERE contract_number = 'CON-2024-001' LIMIT 1;

  IF msa_id IS NOT NULL THEN
    -- Add milestones to MSA
    INSERT INTO milestones (contract_id, name, milestone_number, original_due_date, original_value, status)
    VALUES
      (msa_id, 'Project Kickoff', 1, '2024-02-15', 15000, 'completed'),
      (msa_id, 'Design Phase Complete', 2, '2024-04-30', 35000, 'completed'),
      (msa_id, 'Development Phase 1', 3, '2024-07-31', 50000, 'in_progress'),
      (msa_id, 'UAT Complete', 4, '2024-10-31', 30000, 'pending'),
      (msa_id, 'Go-Live', 5, '2024-12-31', 20000, 'pending');

    -- Add pass-through costs
    INSERT INTO passthrough_costs (contract_id, category, description, passthrough_type, budgeted_total, currency)
    VALUES
      (msa_id, 'travel', 'Client site visits', 'quarterly', 5000, 'EUR'),
      (msa_id, 'equipment', 'Development hardware', 'total', 15000, 'EUR'),
      (msa_id, 'other', 'Third-party licenses', 'total', 8000, 'EUR');

    -- Create a vendor contract
    INSERT INTO contracts (
      title, contract_number, contract_type, status,
      vendor_name, client_name, project_name,
      signature_date, start_date, end_date,
      original_value, currency, department
    ) VALUES (
      'Subcontractor Agreement - DevTeam GmbH', 'CON-2024-010', 'service_agreement', 'active',
      'DevTeam GmbH', 'Symbio', 'Platform Development',
      '2024-02-01', '2024-02-15', '2025-01-31',
      45000, 'EUR', 'operations'
    ) RETURNING id INTO vendor_id;

    -- Link vendor to MSA with revenue share
    INSERT INTO vendor_revenue_share (
      vendor_contract_id, client_contract_id,
      share_type, percentage,
      description, applies_to,
      effective_from, effective_until
    ) VALUES (
      vendor_id, msa_id,
      'percentage', 25.00,
      'Development work subcontracted to DevTeam', 'Development milestones only',
      '2024-02-15', '2025-01-31'
    );
  END IF;
END $$;
