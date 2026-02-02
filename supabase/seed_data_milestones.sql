-- ============================================
-- SEED DATA - MILESTONES & PASS-THROUGH COSTS
-- ============================================
-- Run this AFTER seed_data.sql
-- Populates milestones, PTC, and subcontractor relationships

DO $$
DECLARE
  psoriasis_id UUID;
  ad_study_id UUID;
  wound_study_id UUID;
  central_lab_id UUID;
  imaging_lab_id UUID;
  data_mgmt_id UUID;
  site_vendor_id UUID;
BEGIN
  -- Get existing clinical trial contracts
  SELECT id INTO psoriasis_id FROM contracts WHERE contract_number = 'SYM-2024-001' LIMIT 1;
  SELECT id INTO ad_study_id FROM contracts WHERE contract_number = 'SYM-2024-002' LIMIT 1;
  SELECT id INTO wound_study_id FROM contracts WHERE contract_number = 'SYM-2025-001' LIMIT 1;

  IF psoriasis_id IS NOT NULL THEN
    -- ========================================
    -- PSORIASIS STUDY MILESTONES (SYM-2024-001)
    -- ========================================
    INSERT INTO milestones (
      contract_id, name, description, milestone_number,
      original_due_date, original_value,
      current_due_date, current_value,
      status, completed_date,
      invoiced, invoiced_date, paid, paid_date
    )
    VALUES
      -- Milestone 1: Study Startup - COMPLETED & PAID
      (psoriasis_id, 'Study Startup & Protocol Finalization',
       'Protocol development, CRF design, ethics submission preparation', 1,
       '2024-03-15', 125000,
       '2024-03-15', 125000,
       'completed', '2024-03-10',
       TRUE, '2024-03-20', TRUE, '2024-04-15'),

      -- Milestone 2: Ethics & Regulatory - COMPLETED & PAID
      (psoriasis_id, 'Ethics Committee Approvals',
       'All 35 site ethics approvals and regulatory submissions completed', 2,
       '2024-05-31', 185000,
       '2024-05-31', 185000,
       'completed', '2024-05-28',
       TRUE, '2024-06-05', TRUE, '2024-07-01'),

      -- Milestone 3: Sites Initiated - COMPLETED, INVOICED
      (psoriasis_id, 'Site Initiation Complete',
       'All sites trained and initiated for patient enrollment', 3,
       '2024-07-31', 225000,
       '2024-08-20', 275000,  -- Increased due to 5 additional sites (CO-001)
       'completed', '2024-08-18',
       TRUE, '2024-08-25', TRUE, '2024-09-20'),

      -- Milestone 4: First Patient Enrolled - COMPLETED, INVOICED
      (psoriasis_id, 'First Patient First Visit (FPFV)',
       'First patient enrolled in study', 4,
       '2024-08-15', 95000,
       '2024-08-15', 95000,
       'completed', '2024-08-12',
       TRUE, '2024-08-20', FALSE, NULL),

      -- Milestone 5: 50% Enrollment - IN PROGRESS
      (psoriasis_id, '50% Enrollment Achieved',
       '225 of 450 patients enrolled', 5,
       '2024-12-31', 285000,
       '2024-12-31', 285000,
       'in_progress', NULL,
       FALSE, NULL, FALSE, NULL),

      -- Milestone 6: Full Enrollment - PENDING
      (psoriasis_id, 'Full Enrollment (450 patients)',
       'All 450 patients enrolled across 35 sites', 6,
       '2025-06-30', 425000,
       '2025-06-30', 425000,
       'pending', NULL,
       FALSE, NULL, FALSE, NULL),

      -- Milestone 7: Last Patient Last Visit - PENDING
      (psoriasis_id, 'Last Patient Last Visit (LPLV)',
       'All patients completed 52-week follow-up', 7,
       '2026-07-31', 485000,
       '2026-08-31', 535000,  -- Extended follow-up (CO-002) adds value and time
       'pending', NULL,
       FALSE, NULL, FALSE, NULL),

      -- Milestone 8: Database Lock - PENDING
      (psoriasis_id, 'Database Lock & Clean',
       'All data entered, queries resolved, database locked', 8,
       '2026-09-30', 325000,
       '2026-10-31', 325000,
       'pending', NULL,
       FALSE, NULL, FALSE, NULL),

      -- Milestone 9: Final Report - PENDING
      (psoriasis_id, 'Clinical Study Report (CSR)',
       'Final CSR delivered to sponsor', 9,
       '2026-12-31', 445000,
       '2026-12-31', 445000,
       'pending', NULL,
       FALSE, NULL, FALSE, NULL);

    -- ========================================
    -- PSORIASIS STUDY PASS-THROUGH COSTS
    -- ========================================
    INSERT INTO passthrough_costs (
      contract_id, category, description, passthrough_type,
      budgeted_total, budgeted_per_period, actual_spent,
      currency, period_start, period_end, notes
    )
    VALUES
      -- Investigator payments (per patient)
      (psoriasis_id, 'investigator_fees', 'Per-patient fees to investigators', 'per_unit',
       675000, NULL, 285000,  -- €1,500 per patient x 450 patients
       'EUR', '2024-02-01', '2026-08-31', 'Actual: 190 patients completed @ €1,500'),

      -- Central lab costs
      (psoriasis_id, 'lab_costs', 'Central laboratory - hematology, chemistry, immunology', 'total',
       285000, NULL, 142000,
       'EUR', '2024-02-01', '2026-08-31', 'Safety labs, biomarker analysis, PK samples'),

      -- Dermatology imaging assessments
      (psoriasis_id, 'imaging', 'Standardized photography and PASI scoring', 'total',
       135000, NULL, 68000,
       'EUR', '2024-02-01', '2026-08-31', 'Baseline and follow-up imaging per protocol'),

      -- Site monitoring travel
      (psoriasis_id, 'travel', 'Site monitoring visits - CRA travel', 'quarterly',
       185000, 18500, 92000,
       'EUR', '2024-02-01', '2026-08-31', 'Avg 4 visits/site, increased for additional sites'),

      -- Regulatory fees
      (psoriasis_id, 'regulatory', 'Ethics fees, regulatory submissions', 'total',
       45000, NULL, 45000,
       'EUR', '2024-02-01', '2024-05-31', 'All ethics approvals completed and paid');

    -- ========================================
    -- SUBCONTRACTOR: Central Lab (child of SYM-2024-001)
    -- ========================================
    INSERT INTO contracts (
      title, contract_number, contract_type, status,
      vendor_name, client_name, project_name, sponsor_name,
      signature_date, start_date, end_date,
      original_value, current_value, currency, department, description,
      parent_contract_id, relationship_type, symbio_entity
    ) VALUES (
      'Central Laboratory Services - PSORIA-CLEAR', 'SYM-SUB-2024-101', 'service_agreement', 'active',
      'EuroLab Diagnostics GmbH', 'Symbio Research GmbH', 'PSORIA-CLEAR Study', 'DermaPharma AG',
      DATE '2024-02-15', DATE '2024-03-01', DATE '2026-10-31',
      285000, 285000, 'EUR', 'operations',
      'Central lab services: hematology, clinical chemistry, immunology panels, biomarker testing',
      psoriasis_id, 'sub_contract', 'Symbio Research GmbH'
    ) ON CONFLICT (contract_number) DO NOTHING
    RETURNING id INTO central_lab_id;

    -- Get the ID if it already exists
    IF central_lab_id IS NULL THEN
      SELECT id INTO central_lab_id FROM contracts WHERE contract_number = 'SYM-SUB-2024-101';
    END IF;

    -- ========================================
    -- SUBCONTRACTOR: Imaging Lab (child of SYM-2024-001)
    -- ========================================
    INSERT INTO contracts (
      title, contract_number, contract_type, status,
      vendor_name, client_name, project_name, sponsor_name,
      signature_date, start_date, end_date,
      original_value, current_value, currency, department, description,
      parent_contract_id, relationship_type, symbio_entity
    ) VALUES (
      'Digital Imaging Core Lab - PSORIA-CLEAR', 'SYM-SUB-2024-102', 'service_agreement', 'active',
      'DermImaging Solutions AG', 'Symbio Research GmbH', 'PSORIA-CLEAR Study', 'DermaPharma AG',
      DATE '2024-03-01', DATE '2024-04-01', DATE '2026-11-30',
      135000, 135000, 'EUR', 'operations',
      'Standardized digital photography, PASI assessment, image quality control and archiving',
      psoriasis_id, 'sub_contract', 'Symbio Research GmbH'
    ) ON CONFLICT (contract_number) DO NOTHING
    RETURNING id INTO imaging_lab_id;

    IF imaging_lab_id IS NULL THEN
      SELECT id INTO imaging_lab_id FROM contracts WHERE contract_number = 'SYM-SUB-2024-102';
    END IF;

    -- ========================================
    -- SUBCONTRACTOR: Data Management (Completed, child of SYM-2024-001)
    -- ========================================
    INSERT INTO contracts (
      title, contract_number, contract_type, status,
      vendor_name, client_name, project_name, sponsor_name,
      signature_date, start_date, end_date,
      original_value, current_value, currency, department, description,
      parent_contract_id, relationship_type, symbio_entity
    ) VALUES (
      'eCRF Development & Setup - PSORIA-CLEAR', 'SYM-SUB-2024-103', 'service_agreement', 'expired',
      'ClinData Systems Ltd', 'Symbio Research GmbH', 'PSORIA-CLEAR Study', 'DermaPharma AG',
      DATE '2024-01-20', DATE '2024-02-01', DATE '2024-06-30',
      42000, 42000, 'EUR', 'operations',
      'Electronic CRF design, database build, validation, and UAT for study database',
      psoriasis_id, 'sub_contract', 'Symbio Research GmbH'
    ) ON CONFLICT (contract_number) DO NOTHING
    RETURNING id INTO data_mgmt_id;

    IF data_mgmt_id IS NULL THEN
      SELECT id INTO data_mgmt_id FROM contracts WHERE contract_number = 'SYM-SUB-2024-103';
    END IF;

    -- Link subcontractors to main study via revenue share (only if not exists)
    IF NOT EXISTS (SELECT 1 FROM vendor_revenue_share WHERE vendor_contract_id = central_lab_id) THEN
      INSERT INTO vendor_revenue_share (
        vendor_contract_id, client_contract_id,
        share_type, fixed_amount,
        description, applies_to, total_shared,
        effective_from, effective_until, is_active
      ) VALUES
        -- Central lab: fixed amount from pass-through
        (central_lab_id, psoriasis_id,
         'fixed', 285000,
         'Central laboratory services pass-through', 'Lab costs',
         142000,  -- Paid to date based on actual samples
         '2024-03-01', '2026-10-31', TRUE),

        -- Imaging lab: fixed amount from pass-through
        (imaging_lab_id, psoriasis_id,
         'fixed', 135000,
         'Digital imaging and PASI assessment pass-through', 'Imaging',
         68000,  -- Paid to date based on completed visits
         '2024-04-01', '2026-11-30', TRUE),

        -- eCRF development: completed, fully paid
        (data_mgmt_id, psoriasis_id,
         'fixed', 42000,
         'Database development and validation', 'Study startup',
         42000,  -- Fully paid
         '2024-02-01', '2024-06-30', FALSE);
    END IF;
  END IF;

  IF ad_study_id IS NOT NULL THEN
    -- ========================================
    -- ATOPIC DERMATITIS STUDY MILESTONES (SYM-2024-002)
    -- ========================================
    INSERT INTO milestones (
      contract_id, name, description, milestone_number,
      original_due_date, original_value,
      current_due_date, current_value,
      status, completed_date,
      invoiced, invoiced_date, paid, paid_date
    )
    VALUES
      -- Study startup - completed
      (ad_study_id, 'Study Startup Complete',
       'Protocol, eCRF, ethics submissions ready', 1,
       '2024-05-15', 95000,
       '2024-05-15', 95000,
       'completed', '2024-05-12',
       TRUE, '2024-05-20', TRUE, '2024-06-15'),

      -- Ethics approvals - completed
      (ad_study_id, 'Ethics Approvals - 18 Sites',
       'All site ethics approvals obtained', 2,
       '2024-07-31', 125000,
       '2024-07-31', 125000,
       'completed', '2024-07-25',
       TRUE, '2024-08-01', TRUE, '2024-08-28'),

      -- Site initiations - affected by site closures (CO-003)
      (ad_study_id, 'Site Initiation - 18 Sites',
       'Sites initiated and ready for enrollment', 3,
       '2024-09-15', 145000,
       '2024-09-15', 115000,  -- Reduced due to 2 site closures
       'completed', '2024-09-10',
       TRUE, '2024-09-18', FALSE, NULL),

      -- First patient - completed
      (ad_study_id, 'First Patient Enrolled',
       'Study enrollment commenced', 4,
       '2024-09-30', 65000,
       '2024-09-30', 65000,
       'completed', '2024-09-28',
       TRUE, '2024-10-05', FALSE, NULL),

      -- 50% enrollment - in progress
      (ad_study_id, '50% Enrollment (90/180 patients)',
       'Mid-point enrollment milestone', 5,
       '2025-03-31', 195000,
       '2025-03-31', 195000,
       'in_progress', NULL,
       FALSE, NULL, FALSE, NULL),

      -- Full enrollment - pending
      (ad_study_id, 'Full Enrollment - 180 Patients',
       'All patients enrolled', 6,
       '2025-09-30', 285000,
       '2025-09-30', 285000,
       'pending', NULL,
       FALSE, NULL, FALSE, NULL),

      -- Database lock - pending
      (ad_study_id, 'Database Lock',
       'All data cleaned and locked', 7,
       '2026-02-28', 245000,
       '2026-02-28', 245000,
       'pending', NULL,
       FALSE, NULL, FALSE, NULL),

      -- Final report - pending
      (ad_study_id, 'Final Clinical Study Report',
       'CSR delivered to sponsor', 8,
       '2026-05-31', 325000,
       '2026-05-31', 325000,
       'pending', NULL,
       FALSE, NULL, FALSE, NULL);

    -- Pass-through costs for AD study
    INSERT INTO passthrough_costs (
      contract_id, category, description, passthrough_type,
      budgeted_total, actual_spent, currency, notes
    )
    VALUES
      (ad_study_id, 'investigator_fees', 'Per-patient investigator fees', 'per_unit',
       270000, 95000, 'EUR', '180 patients @ €1,500 each; 63 enrolled to date'),

      (ad_study_id, 'lab_costs', 'Safety labs and biomarker analysis', 'total',
       115000, 42000, 'EUR', 'Safety monitoring and JAK pathway biomarkers'),

      (ad_study_id, 'travel', 'Monitoring visit travel', 'total',
       85000, 38000, 'EUR', 'Reduced after 2 site closures');
  END IF;

  IF wound_study_id IS NOT NULL THEN
    -- ========================================
    -- WOUND HEALING STUDY MILESTONES (SYM-2025-001)
    -- ========================================
    INSERT INTO milestones (
      contract_id, name, description, milestone_number,
      original_due_date, original_value,
      status
    )
    VALUES
      (wound_study_id, 'Study Startup & IND Preparation',
       'Protocol, IB, ethics package, regulatory strategy', 1,
       '2025-03-15', 85000, 'in_progress'),

      (wound_study_id, 'Regulatory Approvals',
       'Competent authority and ethics approvals', 2,
       '2025-05-31', 125000, 'pending'),

      (wound_study_id, 'Site Initiation - 10 Sites',
       'Specialized wound care centers initiated', 3,
       '2025-07-15', 145000, 'pending'),

      (wound_study_id, 'First Patient Treated',
       'Phase I portion commenced', 4,
       '2025-08-15', 95000, 'pending'),

      (wound_study_id, 'Phase I Complete (20 patients)',
       'Safety evaluation complete, DMC approval for Phase II', 5,
       '2025-12-31', 185000, 'pending'),

      (wound_study_id, 'Phase II Enrollment Complete (80 total)',
       'All patients enrolled', 6,
       '2026-05-31', 245000, 'pending'),

      (wound_study_id, 'Database Lock',
       'All data cleaned and database locked', 7,
       '2026-09-30', 165000, 'pending'),

      (wound_study_id, 'Final Study Report',
       'Complete CSR delivered', 8,
       '2026-11-30', 225000, 'pending');

    -- Pass-through costs including biomarker analysis (CO-2025-001)
    INSERT INTO passthrough_costs (
      contract_id, category, description, passthrough_type,
      budgeted_total, actual_spent, currency, notes
    )
    VALUES
      (wound_study_id, 'investigator_fees', 'Per-patient fees - specialized wound centers', 'per_unit',
       240000, 0, 'EUR', '80 patients @ €3,000 (higher complexity)'),

      (wound_study_id, 'lab_costs', 'Safety labs and biomarker analysis', 'total',
       185000, 0, 'EUR', 'Includes expanded biomarker panel per CO-2025-001'),

      (wound_study_id, 'imaging', 'Wound imaging and assessment', 'total',
       95000, 0, 'EUR', '3D wound imaging and healing assessments'),

      (wound_study_id, 'travel', 'Site monitoring and initiation travel', 'total',
       68000, 0, 'EUR', 'Specialized centers require more intensive monitoring');

    -- Add specialized imaging vendor for wound study (child of SYM-2025-001)
    INSERT INTO contracts (
      title, contract_number, contract_type, status,
      vendor_name, client_name, project_name, sponsor_name,
      signature_date, start_date, end_date,
      original_value, current_value, currency, department, description,
      parent_contract_id, relationship_type, symbio_entity
    ) VALUES (
      '3D Wound Imaging - WOUND-REGEN', 'SYM-SUB-2025-201', 'service_agreement', 'active',
      'WoundTech Imaging Solutions', 'Symbio Research GmbH', 'WOUND-REGEN', 'RegenDerm Inc.',
      DATE '2025-01-25', DATE '2025-02-15', DATE '2026-10-31',
      95000, 95000, 'EUR', 'operations',
      'Specialized 3D wound imaging, volumetric analysis, and healing trajectory modeling',
      wound_study_id, 'sub_contract', 'Symbio Research GmbH'
    ) ON CONFLICT (contract_number) DO NOTHING
    RETURNING id INTO site_vendor_id;

    IF site_vendor_id IS NULL THEN
      SELECT id INTO site_vendor_id FROM contracts WHERE contract_number = 'SYM-SUB-2025-201';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM vendor_revenue_share WHERE vendor_contract_id = site_vendor_id) THEN
      INSERT INTO vendor_revenue_share (
        vendor_contract_id, client_contract_id,
        share_type, fixed_amount,
        description, applies_to, total_shared,
        effective_from, effective_until, is_active
      ) VALUES
        (site_vendor_id, wound_study_id,
         'fixed', 95000,
         '3D wound imaging and analysis pass-through', 'Imaging costs',
         0,  -- Not yet started
         '2025-02-15', '2026-10-31', TRUE);
    END IF;
  END IF;
END $$;
