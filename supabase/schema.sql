-- Symbio Contract Management System - Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable full-text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- ENUM TYPES
-- ============================================

CREATE TYPE contract_type AS ENUM (
  'service_agreement',
  'license_agreement',
  'nda',
  'sow',
  'msa',
  'purchase_order',
  'lease',
  'sponsorship',
  'partnership',
  'other'
);

CREATE TYPE contract_status AS ENUM (
  'draft',
  'active',
  'expired',
  'terminated',
  'renewed'
);

CREATE TYPE department AS ENUM (
  'legal',
  'finance',
  'operations',
  'other'
);

CREATE TYPE user_role AS ENUM (
  'admin',
  'editor',
  'viewer'
);

CREATE TYPE relationship_type AS ENUM (
  'amendment',
  'renewal',
  'sub_contract'
);

-- ============================================
-- TABLES
-- ============================================

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  department department,
  role user_role DEFAULT 'viewer',
  azure_ad_id VARCHAR(255) UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- Contracts table
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  contract_number VARCHAR(100) UNIQUE,
  contract_type contract_type NOT NULL DEFAULT 'other',
  status contract_status NOT NULL DEFAULT 'draft',
  description TEXT,

  -- Parties
  vendor_name VARCHAR(255),
  client_name VARCHAR(255),
  project_name VARCHAR(255),
  sponsor_name VARCHAR(255),

  -- Dates
  signature_date DATE,
  start_date DATE,
  end_date DATE,
  notice_period_days INTEGER CHECK (notice_period_days >= 0 AND notice_period_days <= 365),
  cancellation_deadline DATE,
  auto_renew BOOLEAN DEFAULT FALSE,

  -- Commercials
  original_value DECIMAL(15, 2) CHECK (original_value >= 0),
  currency VARCHAR(3) DEFAULT 'EUR',
  current_value DECIMAL(15, 2),
  payment_terms VARCHAR(255),

  -- Ownership
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
  department department,
  sharepoint_url TEXT,
  notes TEXT,

  -- Relationships
  parent_contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  relationship_type relationship_type,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Constraints
  CONSTRAINT valid_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

-- Change Orders table
CREATE TABLE change_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  change_order_number VARCHAR(50),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  effective_date DATE,
  value_change DECIMAL(15, 2),
  scope_change_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  change_order_id UUID REFERENCES change_orders(id) ON DELETE SET NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50),
  file_size_bytes INTEGER,
  storage_path TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  is_primary BOOLEAN DEFAULT FALSE,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ai_summary TEXT
);

-- ============================================
-- INDEXES
-- ============================================

-- Full-text search index for contracts
CREATE INDEX idx_contracts_search ON contracts
  USING GIN (
    to_tsvector('english',
      COALESCE(title, '') || ' ' ||
      COALESCE(vendor_name, '') || ' ' ||
      COALESCE(client_name, '') || ' ' ||
      COALESCE(project_name, '') || ' ' ||
      COALESCE(sponsor_name, '') || ' ' ||
      COALESCE(description, '')
    )
  );

-- Trigram index for fuzzy search
CREATE INDEX idx_contracts_title_trgm ON contracts USING GIN (title gin_trgm_ops);
CREATE INDEX idx_contracts_vendor_trgm ON contracts USING GIN (vendor_name gin_trgm_ops);
CREATE INDEX idx_contracts_client_trgm ON contracts USING GIN (client_name gin_trgm_ops);
CREATE INDEX idx_contracts_project_trgm ON contracts USING GIN (project_name gin_trgm_ops);

-- Filter indexes
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_type ON contracts(contract_type);
CREATE INDEX idx_contracts_department ON contracts(department);
CREATE INDEX idx_contracts_owner ON contracts(owner_id);
CREATE INDEX idx_contracts_end_date ON contracts(end_date) WHERE status = 'active';
CREATE INDEX idx_contracts_cancellation ON contracts(cancellation_deadline) WHERE status = 'active';

-- Change orders
CREATE INDEX idx_change_orders_contract ON change_orders(contract_id);

-- Documents
CREATE INDEX idx_documents_contract ON documents(contract_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate current_value from change orders
CREATE OR REPLACE FUNCTION calculate_current_value()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE contracts
  SET current_value = COALESCE(original_value, 0) + COALESCE(
    (SELECT SUM(value_change) FROM change_orders WHERE contract_id = NEW.contract_id),
    0
  )
  WHERE id = NEW.contract_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate cancellation deadline
CREATE OR REPLACE FUNCTION calculate_cancellation_deadline()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_date IS NOT NULL AND NEW.notice_period_days IS NOT NULL THEN
    NEW.cancellation_deadline = NEW.end_date - (NEW.notice_period_days || ' days')::INTERVAL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fuzzy search function
CREATE OR REPLACE FUNCTION search_contracts(search_query TEXT)
RETURNS TABLE (
  id UUID,
  title VARCHAR,
  contract_number VARCHAR,
  contract_type contract_type,
  status contract_status,
  vendor_name VARCHAR,
  client_name VARCHAR,
  project_name VARCHAR,
  sponsor_name VARCHAR,
  end_date DATE,
  current_value DECIMAL,
  currency VARCHAR,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.title,
    c.contract_number,
    c.contract_type,
    c.status,
    c.vendor_name,
    c.client_name,
    c.project_name,
    c.sponsor_name,
    c.end_date,
    c.current_value,
    c.currency,
    GREATEST(
      COALESCE(similarity(c.title, search_query), 0),
      COALESCE(similarity(c.vendor_name, search_query), 0),
      COALESCE(similarity(c.client_name, search_query), 0),
      COALESCE(similarity(c.project_name, search_query), 0),
      COALESCE(similarity(c.sponsor_name, search_query), 0)
    ) AS rank
  FROM contracts c
  WHERE
    c.title ILIKE '%' || search_query || '%'
    OR c.vendor_name ILIKE '%' || search_query || '%'
    OR c.client_name ILIKE '%' || search_query || '%'
    OR c.project_name ILIKE '%' || search_query || '%'
    OR c.sponsor_name ILIKE '%' || search_query || '%'
    OR c.contract_number ILIKE '%' || search_query || '%'
    OR similarity(c.title, search_query) > 0.1
    OR similarity(c.vendor_name, search_query) > 0.1
    OR similarity(c.client_name, search_query) > 0.1
  ORDER BY rank DESC, c.updated_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Update timestamp trigger
CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Calculate current value when change order is added/modified
CREATE TRIGGER calculate_contract_value
  AFTER INSERT OR UPDATE OR DELETE ON change_orders
  FOR EACH ROW
  EXECUTE FUNCTION calculate_current_value();

-- Calculate cancellation deadline when contract dates change
CREATE TRIGGER calculate_contract_cancellation
  BEFORE INSERT OR UPDATE OF end_date, notice_period_days ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION calculate_cancellation_deadline();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Policies (permissive for MVP - tighten later)
CREATE POLICY "Users can view all contracts" ON contracts
  FOR SELECT USING (true);

CREATE POLICY "Users can insert contracts" ON contracts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update contracts" ON contracts
  FOR UPDATE USING (true);

CREATE POLICY "Users can view all change orders" ON change_orders
  FOR SELECT USING (true);

CREATE POLICY "Users can insert change orders" ON change_orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update change orders" ON change_orders
  FOR UPDATE USING (true);

CREATE POLICY "Users can view all documents" ON documents
  FOR SELECT USING (true);

CREATE POLICY "Users can insert documents" ON documents
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update documents" ON documents
  FOR UPDATE USING (true);

CREATE POLICY "Users can view all users" ON users
  FOR SELECT USING (true);

-- ============================================
-- STORAGE BUCKET
-- ============================================

-- Run this in Supabase Dashboard > Storage
-- Create a bucket called 'contracts' with public access disabled

-- ============================================
-- SAMPLE DATA (Optional)
-- ============================================

-- Insert sample user
INSERT INTO users (email, name, department, role) VALUES
  ('admin@symbio.com', 'Dr. Sarah Mitchell', 'operations', 'admin'),
  ('finance@symbio.com', 'Michael Chen', 'finance', 'editor'),
  ('legal@symbio.com', 'Emma Rodriguez', 'legal', 'editor');

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
   '2024-01-15', '2024-02-01', '2026-08-31', 90,
   2850000.00, 'EUR', 'operations',
   'Multi-center Phase III trial evaluating novel IL-17 inhibitor for moderate to severe plaque psoriasis. 450 patients across 35 sites in EU.'),

  -- Active Phase II Atopic Dermatitis Trial
  ('Phase II Clinical Study - Atopic Dermatitis', 'SYM-2024-002', 'service_agreement', 'active',
   'Symbio Research GmbH', 'BioSkin Therapeutics', 'AD-RELIEF-02', 'BioSkin Therapeutics',
   '2024-03-10', '2024-04-01', '2026-03-31', 60,
   1650000.00, 'EUR', 'operations',
   'Phase IIb dose-finding study for topical JAK inhibitor in adolescents and adults with moderate atopic dermatitis. 180 patients, 18 sites.'),

  -- Completed Phase II Acne Trial
  ('Phase II Acne Vulgaris Study', 'SYM-2023-008', 'service_agreement', 'expired',
   'Symbio Research GmbH', 'ClearSkin Biotech', 'ACNE-CLEAR', 'ClearSkin Biotech',
   '2023-02-01', '2023-03-01', '2024-12-31', 60,
   890000.00, 'EUR', 'operations',
   'Phase II study of microbiome-modulating topical therapy for moderate acne vulgaris. 120 patients, 12 sites. Successfully completed.'),

  -- Active Medical Device Study - Melanoma Screening
  ('Medical Device Study - AI Melanoma Detection', 'SYM-2024-005', 'service_agreement', 'active',
   'Symbio Research GmbH', 'DermaTech Solutions', 'MELADETECT-01', 'DermaTech Solutions',
   '2024-06-01', '2024-07-01', '2025-12-31', 45,
   425000.00, 'EUR', 'operations',
   'Clinical validation study for AI-powered melanoma detection device. 300 lesions assessed, 8 dermatology centers.'),

  -- Active Phase I Wound Healing Study
  ('Phase I/II Chronic Wound Healing', 'SYM-2025-001', 'service_agreement', 'active',
   'Symbio Research GmbH', 'RegenDerm Inc.', 'WOUND-REGEN', 'RegenDerm Inc.',
   '2025-01-10', '2025-02-01', '2026-07-31', 60,
   1125000.00, 'EUR', 'operations',
   'Phase I/II study of stem cell-derived wound healing gel for diabetic foot ulcers. 80 patients, 10 specialized wound care centers.'),

  -- NDA with potential sponsor
  ('Confidentiality Agreement - Project Aurora', 'SYM-2024-NDA-003', 'nda', 'active',
   'Symbio Research GmbH', 'GlobalDerm Pharmaceuticals', NULL, 'GlobalDerm Pharmaceuticals',
   '2024-09-15', '2024-09-15', '2027-09-14', 30,
   0.00, 'EUR', 'legal',
   'Mutual NDA for discussions regarding Phase III vitiligo study opportunity.');

-- Insert change orders
INSERT INTO change_orders (
  contract_id, change_order_number, title, description,
  effective_date, value_change
)
SELECT
  id, 'CO-2024-001', 'Protocol Amendment 2 - Additional Sites',
  'Added 5 additional clinical sites in Germany and Austria due to strong enrollment. Includes site initiation, monitoring, and additional imaging assessments.',
  '2024-08-15', 285000.00
FROM contracts WHERE contract_number = 'SYM-2024-001'
UNION ALL
SELECT
  id, 'CO-2024-002', 'Extended Follow-up Period',
  'Sponsor requested extension of safety follow-up from 12 weeks to 24 weeks per regulatory feedback. Additional site visits and laboratory assessments required.',
  '2024-09-01', 125000.00
FROM contracts WHERE contract_number = 'SYM-2024-001'
UNION ALL
SELECT
  id, 'CO-2024-003', 'Site Closure Adjustment',
  'Two underperforming sites closed per sponsor decision. Reduction in monitoring visits and associated pass-through costs.',
  '2024-10-15', -68000.00
FROM contracts WHERE contract_number = 'SYM-2024-002'
UNION ALL
SELECT
  id, 'CO-2025-001', 'Expanded Biomarker Analysis',
  'Additional biomarker panel added to assess wound healing mechanisms. Includes specialized lab testing and sample processing.',
  '2025-03-01', 85000.00
FROM contracts WHERE contract_number = 'SYM-2025-001';
