-- Migration: Change inflation tracking to array-based for multiple years
-- Purpose: Support compound inflation adjustments over multiple years

-- Remove old single-value columns
ALTER TABLE milestones DROP COLUMN IF EXISTS inflation_adjustment_amount;
ALTER TABLE milestones DROP COLUMN IF EXISTS inflation_adjustment_rate;
ALTER TABLE milestones DROP COLUMN IF EXISTS inflation_adjustment_date;

-- Add array-based inflation tracking
ALTER TABLE milestones ADD COLUMN inflation_adjustments JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN milestones.inflation_adjustments IS
  'Array of inflation adjustments: [{ year: 2025, rate: 3.2, amount: 1600, applied_date: "2025-01-15", applied_by: "user_id" }]';

-- Keep the superseded flag
-- COLUMN inflation_superseded_by_co already exists

-- Add index for querying inflation history
CREATE INDEX idx_milestones_inflation_adjustments ON milestones USING GIN (inflation_adjustments);

-- Value calculation logic with compounding:
-- 1. Start with original_value
-- 2. Apply each inflation adjustment sequentially (compounds)
--    2025: €50,000 × 3.2% = €1,600 → €51,600
--    2026: €51,600 × 2.5% = €1,290 → €52,890
-- 3. Result becomes current_value
-- 4. Change Orders can override (set inflation_superseded_by_co = TRUE)
-- 5. Bonus/malus applies to current_value
-- 6. Invoice amount = current_value + adjustment_amount

-- Example data structure:
-- inflation_adjustments: [
--   {
--     "year": 2025,
--     "rate": 3.2,
--     "amount": 1600,
--     "applied_date": "2025-01-15",
--     "applied_by": "user_123"
--   },
--   {
--     "year": 2026,
--     "rate": 2.5,
--     "amount": 1290,
--     "applied_date": "2026-02-01",
--     "applied_by": "user_123"
--   }
-- ]
