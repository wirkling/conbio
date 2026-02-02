-- ============================================
-- SEED DATA FOR SYMBIO RESEARCH CRO DEMO
-- ============================================
-- Run this to populate sample data for CFO demo
-- Assumes schema is already created

-- Clear existing sample data (optional - comment out if you want to keep existing data)
DELETE FROM passthrough_actuals;
DELETE FROM passthrough_costs;
DELETE FROM milestone_changes;
DELETE FROM milestones;
DELETE FROM vendor_revenue_share;
DELETE FROM change_orders;
DELETE FROM documents;
DELETE FROM contracts WHERE contract_number LIKE 'SYM-%' OR contract_number LIKE 'CON-2024-%';
DELETE FROM users WHERE email IN ('admin@symbio.com', 'finance@symbio.com', 'legal@symbio.com');

-- Insert sample users
INSERT INTO users (email, name, department, role) VALUES
  ('admin@symbio.com', 'Dr. Sarah Mitchell', 'operations', 'admin'),
  ('finance@symbio.com', 'Michael Chen', 'finance', 'editor'),
  ('legal@symbio.com', 'Emma Rodriguez', 'legal', 'editor')
ON CONFLICT (email) DO NOTHING;

-- Insert sample contracts
INSERT INTO contracts (
  title, contract_number, contract_type, status,
  vendor_name, client_name, project_name, sponsor_name,
  signature_date, start_date, end_date, notice_period_days,
  original_value, currency, department, description
) VALUES
  -- Active Phase III Psoriasis Trial
  ('Phase III Clinical Trial - Psoriasis Biologics', 'SYM-2024-001', 'service_agreement', 'active',
   'Symbio Research GmbH', 'DermaPharma AG', 'PSORIA-CLEAR Study', 'DermaPharma AG',
   DATE '2024-01-15', DATE '2024-02-01', DATE '2026-08-31', 90,
   2850000.00, 'EUR', 'operations',
   'Multi-center Phase III trial evaluating novel IL-17 inhibitor for moderate to severe plaque psoriasis. 450 patients across 35 sites in EU.'),

  -- Active Phase II Atopic Dermatitis Trial
  ('Phase II Clinical Study - Atopic Dermatitis', 'SYM-2024-002', 'service_agreement', 'active',
   'Symbio Research GmbH', 'BioSkin Therapeutics', 'AD-RELIEF-02', 'BioSkin Therapeutics',
   DATE '2024-03-10', DATE '2024-04-01', DATE '2026-03-31', 60,
   1650000.00, 'EUR', 'operations',
   'Phase IIb dose-finding study for topical JAK inhibitor in adolescents and adults with moderate atopic dermatitis. 180 patients, 18 sites.'),

  -- Completed Phase II Acne Trial
  ('Phase II Acne Vulgaris Study', 'SYM-2023-008', 'service_agreement', 'expired',
   'Symbio Research GmbH', 'ClearSkin Biotech', 'ACNE-CLEAR', 'ClearSkin Biotech',
   DATE '2023-02-01', DATE '2023-03-01', DATE '2024-12-31', 60,
   890000.00, 'EUR', 'operations',
   'Phase II study of microbiome-modulating topical therapy for moderate acne vulgaris. 120 patients, 12 sites. Successfully completed.'),

  -- Active Medical Device Study - Melanoma Screening
  ('Medical Device Study - AI Melanoma Detection', 'SYM-2024-005', 'service_agreement', 'active',
   'Symbio Research GmbH', 'DermaTech Solutions', 'MELADETECT-01', 'DermaTech Solutions',
   DATE '2024-06-01', DATE '2024-07-01', DATE '2025-12-31', 45,
   425000.00, 'EUR', 'operations',
   'Clinical validation study for AI-powered melanoma detection device. 300 lesions assessed, 8 dermatology centers.'),

  -- Active Phase I Wound Healing Study
  ('Phase I/II Chronic Wound Healing', 'SYM-2025-001', 'service_agreement', 'active',
   'Symbio Research GmbH', 'RegenDerm Inc.', 'WOUND-REGEN', 'RegenDerm Inc.',
   DATE '2025-01-10', DATE '2025-02-01', DATE '2026-07-31', 60,
   1125000.00, 'EUR', 'operations',
   'Phase I/II study of stem cell-derived wound healing gel for diabetic foot ulcers. 80 patients, 10 specialized wound care centers.'),

  -- NDA with potential sponsor
  ('Confidentiality Agreement - Project Aurora', 'SYM-2024-NDA-003', 'nda', 'active',
   'Symbio Research GmbH', 'GlobalDerm Pharmaceuticals', NULL, 'GlobalDerm Pharmaceuticals',
   DATE '2024-09-15', DATE '2024-09-15', DATE '2027-09-14', 30,
   0.00, 'EUR', 'legal',
   'Mutual NDA for discussions regarding Phase III vitiligo study opportunity.')
ON CONFLICT (contract_number) DO NOTHING;

-- Insert change orders
INSERT INTO change_orders (
  contract_id, change_order_number, title, description,
  effective_date, value_change
)
SELECT
  id, 'CO-2024-001', 'Protocol Amendment 2 - Additional Sites',
  'Added 5 additional clinical sites in Germany and Austria due to strong enrollment. Includes site initiation, monitoring, and additional imaging assessments.',
  DATE '2024-08-15', 285000.00
FROM contracts WHERE contract_number = 'SYM-2024-001'
UNION ALL
SELECT
  id, 'CO-2024-002', 'Extended Follow-up Period',
  'Sponsor requested extension of safety follow-up from 12 weeks to 24 weeks per regulatory feedback. Additional site visits and laboratory assessments required.',
  DATE '2024-09-01', 125000.00
FROM contracts WHERE contract_number = 'SYM-2024-001'
UNION ALL
SELECT
  id, 'CO-2024-003', 'Site Closure Adjustment',
  'Two underperforming sites closed per sponsor decision. Reduction in monitoring visits and associated pass-through costs.',
  DATE '2024-10-15', -68000.00
FROM contracts WHERE contract_number = 'SYM-2024-002'
UNION ALL
SELECT
  id, 'CO-2025-001', 'Expanded Biomarker Analysis',
  'Additional biomarker panel added to assess wound healing mechanisms. Includes specialized lab testing and sample processing.',
  DATE '2025-03-01', 85000.00
FROM contracts WHERE contract_number = 'SYM-2025-001';
