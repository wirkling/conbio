-- Migration: Update bonus_malus_terms to support structured data
-- Purpose: Enable both standard (programmatic) and custom (text) bonus/malus agreements

-- Step 1: Backup existing data and convert text to custom type
-- Create a temporary column to hold the converted data
ALTER TABLE contracts ADD COLUMN bonus_malus_terms_new JSONB;

-- Convert existing text data to JSONB with custom type
UPDATE contracts
SET bonus_malus_terms_new = jsonb_build_object(
  'type', 'custom',
  'terms', bonus_malus_terms
)
WHERE bonus_malus_terms IS NOT NULL AND bonus_malus_terms != '';

-- Step 2: Drop old column and rename new one
ALTER TABLE contracts DROP COLUMN bonus_malus_terms;
ALTER TABLE contracts RENAME COLUMN bonus_malus_terms_new TO bonus_malus_terms;

-- Step 3: Add index for querying standard agreements
CREATE INDEX idx_contracts_bonus_malus_type ON contracts((bonus_malus_terms->>'type'))
WHERE bonus_malus_terms IS NOT NULL;

-- Add helpful comment
COMMENT ON COLUMN contracts.bonus_malus_terms IS
  'Bonus/Malus terms: either {type: "standard", early_bonus_percent, early_threshold_weeks, late_penalty_percent, penalty_per_period, max_penalty_percent} or {type: "custom", terms: "text description"}';

-- Example of standard format:
-- {
--   "type": "standard",
--   "early_bonus_percent": 5,
--   "early_threshold_weeks": 2,
--   "late_penalty_percent": 10,
--   "penalty_per_period": "month",
--   "max_penalty_percent": 20
-- }

-- Example of custom format:
-- {
--   "type": "custom",
--   "terms": "1 month delay = 10% penalty, max 20% total; Early delivery = 5% bonus"
-- }
