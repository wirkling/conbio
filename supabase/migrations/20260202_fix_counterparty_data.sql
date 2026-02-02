-- Fix counterparty data in existing contracts
-- Update vendor_name to be the actual sponsor/client, not Symbio

-- For Project Contracts (MSA): vendor should be the sponsor
UPDATE contracts
SET
  vendor_name = COALESCE(sponsor_name, client_name),
  client_name = COALESCE(sponsor_name, client_name)
WHERE contract_type = 'msa'
  AND symbio_entity IN ('SREU', 'SRUS')
  AND (vendor_name LIKE '%Symbio%' OR vendor_name = client_name);

-- Update specific contracts with correct sponsor names based on contract number
UPDATE contracts
SET
  vendor_name = 'DermaPharma AG',
  client_name = 'DermaPharma AG',
  sponsor_name = 'DermaPharma AG'
WHERE contract_number = 'SYM-2024-001';

UPDATE contracts
SET
  vendor_name = 'BioSkin Therapeutics',
  client_name = 'BioSkin Therapeutics',
  sponsor_name = 'BioSkin Therapeutics'
WHERE contract_number = 'SYM-2024-002';

UPDATE contracts
SET
  vendor_name = 'ClearSkin Biotech',
  client_name = 'ClearSkin Biotech',
  sponsor_name = 'ClearSkin Biotech'
WHERE contract_number = 'SYM-2023-008';

UPDATE contracts
SET
  vendor_name = 'DermaTech Solutions',
  client_name = 'DermaTech Solutions',
  sponsor_name = 'DermaTech Solutions'
WHERE contract_number = 'SYM-2024-005';

UPDATE contracts
SET
  vendor_name = 'RegenDerm Inc.',
  client_name = 'RegenDerm Inc.',
  sponsor_name = 'RegenDerm Inc.'
WHERE contract_number = 'SYM-2025-001';

UPDATE contracts
SET
  vendor_name = 'GlobalDerm Pharmaceuticals',
  client_name = 'GlobalDerm Pharmaceuticals',
  sponsor_name = 'GlobalDerm Pharmaceuticals'
WHERE contract_number = 'SYM-2024-NDA-003';

-- For Subcontracts: client should be the sponsor (not Symbio)
UPDATE contracts
SET client_name = sponsor_name
WHERE parent_contract_id IS NOT NULL
  AND relationship_type = 'sub_contract'
  AND client_name LIKE '%Symbio%';

-- Verify the updates
SELECT
  contract_number,
  title,
  symbio_entity,
  vendor_name as counterparty,
  contract_type,
  intercompany
FROM contracts
WHERE contract_number LIKE 'SYM-%'
ORDER BY contract_number;
