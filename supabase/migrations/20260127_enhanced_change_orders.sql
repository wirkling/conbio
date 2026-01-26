-- Migration: Enhanced Change Orders with Document Management and Flexible Impact Tracking
-- Purpose: Support different CO types, document uploads, and combined direct/PTC changes

-- ============================================
-- 1. CREATE ENUM TYPE for Change Order Types
-- ============================================

CREATE TYPE co_type AS ENUM (
  'milestone_adjustment',    -- Adjust existing milestone(s)
  'lump_sum_immediate',      -- Immediate billing
  'lump_sum_milestone',      -- New milestone with due date
  'passthrough_only',        -- PTC budget adjustment only
  'combined'                 -- Direct + PTC changes
);

COMMENT ON TYPE co_type IS 'Type of change order impact on contract';

-- ============================================
-- 2. UPDATE change_orders TABLE
-- ============================================

-- Add new columns for enhanced functionality
ALTER TABLE change_orders ADD COLUMN co_type co_type NOT NULL DEFAULT 'milestone_adjustment';
ALTER TABLE change_orders ADD COLUMN document_url TEXT;
ALTER TABLE change_orders ADD COLUMN is_document_sharepoint BOOLEAN DEFAULT FALSE;
ALTER TABLE change_orders ADD COLUMN direct_cost_change DECIMAL(15, 2);
ALTER TABLE change_orders ADD COLUMN ptc_change DECIMAL(15, 2);
ALTER TABLE change_orders ADD COLUMN invoiced_immediately BOOLEAN DEFAULT FALSE;
ALTER TABLE change_orders ADD COLUMN invoiced_date DATE;

-- Add comments for documentation
COMMENT ON COLUMN change_orders.co_type IS 'Type of change order impact';
COMMENT ON COLUMN change_orders.document_url IS 'URL to CO PDF (upload path or SharePoint link)';
COMMENT ON COLUMN change_orders.is_document_sharepoint IS 'TRUE if document_url is a SharePoint link, FALSE if uploaded file';
COMMENT ON COLUMN change_orders.direct_cost_change IS 'Direct revenue/cost impact (separate from PTC)';
COMMENT ON COLUMN change_orders.ptc_change IS 'Pass-through cost budget adjustment total';
COMMENT ON COLUMN change_orders.invoiced_immediately IS 'TRUE for lump_sum_immediate type if invoiced right away';
COMMENT ON COLUMN change_orders.invoiced_date IS 'Date when lump sum was invoiced (for immediate billing)';

-- Note: Keep value_change column for backward compatibility
-- It will be calculated as direct_cost_change for display purposes
COMMENT ON COLUMN change_orders.value_change IS 'DEPRECATED: Use direct_cost_change instead. Kept for backward compatibility.';

-- ============================================
-- 3. CREATE change_order_passthrough_adjustments TABLE
-- ============================================

CREATE TABLE change_order_passthrough_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  change_order_id UUID NOT NULL REFERENCES change_orders(id) ON DELETE CASCADE,
  passthrough_cost_id UUID NOT NULL REFERENCES passthrough_costs(id) ON DELETE CASCADE,
  previous_budget DECIMAL(15, 2) NOT NULL,
  new_budget DECIMAL(15, 2) NOT NULL,
  adjustment_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_co_ptc_adjustment UNIQUE(change_order_id, passthrough_cost_id)
);

COMMENT ON TABLE change_order_passthrough_adjustments IS 'Tracks pass-through cost budget changes per change order';
COMMENT ON COLUMN change_order_passthrough_adjustments.change_order_id IS 'Reference to the change order';
COMMENT ON COLUMN change_order_passthrough_adjustments.passthrough_cost_id IS 'Reference to the pass-through cost category';
COMMENT ON COLUMN change_order_passthrough_adjustments.previous_budget IS 'Budget before this change order';
COMMENT ON COLUMN change_order_passthrough_adjustments.new_budget IS 'Budget after this change order';
COMMENT ON COLUMN change_order_passthrough_adjustments.adjustment_reason IS 'Optional reason for the budget adjustment';

-- Create indexes for performance
CREATE INDEX idx_co_ptc_adjustments_co_id ON change_order_passthrough_adjustments(change_order_id);
CREATE INDEX idx_co_ptc_adjustments_ptc_id ON change_order_passthrough_adjustments(passthrough_cost_id);

-- ============================================
-- 4. DATA MIGRATION (if needed)
-- ============================================

-- Migrate existing change orders to use direct_cost_change
UPDATE change_orders
SET direct_cost_change = value_change
WHERE direct_cost_change IS NULL AND value_change IS NOT NULL;

-- ============================================
-- 5. EXAMPLE USAGE PATTERNS
-- ============================================

-- Example 1: Milestone Adjustment CO
-- INSERT INTO change_orders (contract_id, co_type, title, direct_cost_change, ...)
-- VALUES (..., 'milestone_adjustment', 'Extend Milestone 3', 15000, ...);
-- Then update affected milestones via milestone_changes table

-- Example 2: Lump Sum Immediate
-- INSERT INTO change_orders (contract_id, co_type, title, direct_cost_change, invoiced_immediately, invoiced_date, ...)
-- VALUES (..., 'lump_sum_immediate', 'Emergency Fix', 5000, TRUE, CURRENT_DATE, ...);

-- Example 3: Lump Sum Milestone
-- INSERT INTO change_orders (contract_id, co_type, title, direct_cost_change, ...)
-- VALUES (..., 'lump_sum_milestone', 'Phase 2 Deliverable', 50000, ...);
-- Then create new milestone linked to this CO

-- Example 4: Pass-Through Only
-- INSERT INTO change_orders (contract_id, co_type, title, ptc_change, ...)
-- VALUES (..., 'passthrough_only', 'Travel Budget Increase', 0, ...);
-- Then insert into change_order_passthrough_adjustments

-- Example 5: Combined
-- INSERT INTO change_orders (contract_id, co_type, title, direct_cost_change, ptc_change, ...)
-- VALUES (..., 'combined', 'Scope & PTC Increase', 30000, 10000, ...);
-- Then update milestones AND insert PTC adjustments
