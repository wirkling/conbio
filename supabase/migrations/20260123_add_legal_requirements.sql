-- Migration: Add Legal Requirements Fields
-- Date: 2026-01-23
-- Description: Adds four new legal requirement fields requested by Legal Head:
--   1. Bonus/Malus Vereinbarungen (bonus_malus_terms)
--   2. Inflationsklausel (inflation_clause)
--   3. Haftung (liability_terms)
--   4. Aufbewahrungszeitraum (retention_period_value + retention_period_unit)

BEGIN;

-- 1. Add bonus/malus terms column
-- Flexible text field for "1 month delay = 10% penalty" style entries
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS
  bonus_malus_terms TEXT;

-- 2. Add inflation clause as structured JSON
-- Stores: rate_type, calculation_method, application_timing, notes
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS
  inflation_clause JSONB;

-- 3. Add liability terms column
-- Free-form text as it varies per contract
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS
  liability_terms TEXT;

-- 4. Add retention period columns
-- Split into value (number) and unit (days/months/years) for structured data
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS
  retention_period_value INTEGER CHECK (retention_period_value >= 0 AND retention_period_value <= 999);

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS
  retention_period_unit VARCHAR(20) CHECK (retention_period_unit IN ('days', 'months', 'years'));

-- Add index for retention period queries (e.g., find contracts with 10+ year retention)
CREATE INDEX IF NOT EXISTS idx_contracts_retention_period
  ON contracts(retention_period_value, retention_period_unit)
  WHERE retention_period_value IS NOT NULL;

-- Add GIN index for JSONB querying on inflation clause
-- Enables fast queries like: WHERE inflation_clause->>'rate_type' = 'CPI'
CREATE INDEX IF NOT EXISTS idx_contracts_inflation_clause_gin
  ON contracts USING GIN (inflation_clause);

-- Update the full-text search index to include new text fields
-- This allows searching bonus/malus terms and liability in contract searches
DROP INDEX IF EXISTS idx_contracts_search;
CREATE INDEX idx_contracts_search ON contracts
  USING GIN (
    to_tsvector('english',
      COALESCE(title, '') || ' ' ||
      COALESCE(vendor_name, '') || ' ' ||
      COALESCE(client_name, '') || ' ' ||
      COALESCE(project_name, '') || ' ' ||
      COALESCE(sponsor_name, '') || ' ' ||
      COALESCE(description, '') || ' ' ||
      COALESCE(bonus_malus_terms, '') || ' ' ||
      COALESCE(liability_terms, '')
    )
  );

-- Add documentation comments
COMMENT ON COLUMN contracts.bonus_malus_terms IS
  'Bonus/penalty agreements: defines limits and percentages (e.g., "1 month delay = 10% penalty")';

COMMENT ON COLUMN contracts.inflation_clause IS
  'Inflation clause structured as JSON: {rate_type, calculation_method, application_timing, notes}';

COMMENT ON COLUMN contracts.liability_terms IS
  'Liability terms and conditions - varies per contract';

COMMENT ON COLUMN contracts.retention_period_value IS
  'Document retention period numeric value (1-999)';

COMMENT ON COLUMN contracts.retention_period_unit IS
  'Document retention period unit: days, months, or years';

COMMIT;
