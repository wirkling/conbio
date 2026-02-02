-- ============================================
-- FIX CURRENT VALUES
-- ============================================
-- Updates current_value for all contracts
-- current_value = original_value + sum of change order values

-- Update all contracts to calculate current_value
UPDATE contracts
SET current_value = COALESCE(original_value, 0) + COALESCE(
  (SELECT SUM(value_change) FROM change_orders WHERE contract_id = contracts.id),
  0
);

-- Verify the fix
SELECT
  contract_number,
  title,
  original_value,
  (SELECT SUM(value_change) FROM change_orders WHERE contract_id = contracts.id) as total_change_orders,
  current_value,
  currency
FROM contracts
WHERE contract_number LIKE 'SYM-%'
ORDER BY contract_number;
