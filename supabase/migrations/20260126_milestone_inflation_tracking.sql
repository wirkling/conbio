-- Migration: Add inflation tracking to milestones
-- Purpose: Track inflation adjustments separately from change orders

-- Add inflation tracking fields to milestones table
ALTER TABLE milestones ADD COLUMN inflation_adjustment_amount DECIMAL(12, 2);
ALTER TABLE milestones ADD COLUMN inflation_adjustment_rate DECIMAL(5, 2);
ALTER TABLE milestones ADD COLUMN inflation_adjustment_date DATE;
ALTER TABLE milestones ADD COLUMN inflation_superseded_by_co BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN milestones.inflation_adjustment_amount IS 'Calculated inflation increase amount';
COMMENT ON COLUMN milestones.inflation_adjustment_rate IS 'Inflation rate percentage applied (e.g., 3.2 for 3.2%)';
COMMENT ON COLUMN milestones.inflation_adjustment_date IS 'Date when inflation adjustment was applied';
COMMENT ON COLUMN milestones.inflation_superseded_by_co IS 'TRUE if a Change Order has replaced the inflation-adjusted value';

-- Add index for querying inflation adjustments
CREATE INDEX idx_milestones_inflation ON milestones(inflation_adjustment_date) WHERE inflation_adjustment_amount IS NOT NULL;

-- Value calculation logic:
-- 1. Start with original_value
-- 2. If inflation applied and NOT superseded: show inflation_adjustment_amount
-- 3. current_value = final value (either original + inflation, or CO-set value)
-- 4. Bonus/malus applies to current_value
-- 5. Invoice amount = current_value + adjustment_amount

-- Example flow:
-- Original: €50,000
-- + Inflation (3.2%): +€1,600 → current_value becomes €51,600
-- If Change Order happens: current_value set to €66,600, inflation_superseded_by_co = TRUE
-- ± Bonus/Malus: calculated on €66,600
-- = Final Invoice Amount
