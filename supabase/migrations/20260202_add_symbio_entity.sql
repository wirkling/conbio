-- Add Symbio contracting entity field to contracts
-- For tracking which Symbio legal entity is the contracting party

ALTER TABLE contracts
ADD COLUMN symbio_entity VARCHAR(255);

COMMENT ON COLUMN contracts.symbio_entity IS 'The Symbio legal entity that is party to this contract (e.g., Symbio Research GmbH, Symbio Clinical Services Ltd)';

-- Update existing contracts with default entity
UPDATE contracts
SET symbio_entity = 'Symbio Research GmbH'
WHERE symbio_entity IS NULL;

-- Verify the update
SELECT contract_number, title, symbio_entity
FROM contracts
WHERE contract_number LIKE 'SYM-%'
ORDER BY contract_number;
