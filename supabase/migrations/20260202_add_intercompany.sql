-- Add intercompany flag to contracts
-- For tracking contracts between Symbio entities

ALTER TABLE contracts
ADD COLUMN intercompany BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN contracts.intercompany IS 'TRUE if this is a contract between two Symbio entities (intercompany contract)';

-- Create index for filtering intercompany contracts
CREATE INDEX idx_contracts_intercompany ON contracts(intercompany) WHERE intercompany = TRUE;

-- Update symbio_entity to use entity codes instead of full names
UPDATE contracts
SET symbio_entity = CASE
  WHEN symbio_entity = 'Symbio Research GmbH' THEN 'SREU'
  WHEN symbio_entity = 'Symbio Clinical Services Ltd' THEN 'SRUS'
  ELSE symbio_entity
END
WHERE symbio_entity IS NOT NULL;

-- Fix vendor_name to not duplicate symbio_entity
-- For main contracts: vendor should be empty or different from symbio_entity
UPDATE contracts
SET vendor_name = client_name
WHERE contract_type = 'msa'
  AND vendor_name = symbio_entity;
