-- Migration: Add inflation rates tracking table
-- Purpose: Track historical inflation rates for automatic contract adjustments

CREATE TABLE IF NOT EXISTS inflation_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rate_type VARCHAR(100) NOT NULL,  -- e.g., "German CPI", "HVPI"
  year INTEGER NOT NULL,
  rate_percentage DECIMAL(5, 2) NOT NULL,  -- e.g., 2.50 for 2.5%
  effective_from DATE NOT NULL,
  effective_until DATE,
  source_url TEXT,  -- Link to official source
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  CONSTRAINT unique_rate_year UNIQUE(rate_type, year)
);

CREATE INDEX idx_inflation_rates_type_year ON inflation_rates(rate_type, year DESC);

COMMENT ON TABLE inflation_rates IS 'Historical inflation rates for automatic contract adjustments';
COMMENT ON COLUMN inflation_rates.rate_type IS 'Type of inflation rate (e.g., German CPI, HVPI)';
COMMENT ON COLUMN inflation_rates.year IS 'Year the rate applies to';
COMMENT ON COLUMN inflation_rates.rate_percentage IS 'Inflation rate as percentage (e.g., 2.50 for 2.5%)';
COMMENT ON COLUMN inflation_rates.source_url IS 'URL to official source for verification';

-- Insert some sample data for testing
INSERT INTO inflation_rates (rate_type, year, rate_percentage, effective_from, effective_until, notes)
VALUES
  ('German Consumer Price Index (CPI)', 2024, 2.20, '2024-01-01', '2024-12-31', 'Source: Federal Statistical Office'),
  ('German Consumer Price Index (CPI)', 2025, 2.50, '2025-01-01', '2025-12-31', 'Source: Federal Statistical Office'),
  ('HVPI (Harmonized Index)', 2024, 2.40, '2024-01-01', '2024-12-31', 'Source: Eurostat'),
  ('HVPI (Harmonized Index)', 2025, 2.60, '2025-01-01', '2025-12-31', 'Source: Eurostat')
ON CONFLICT (rate_type, year) DO NOTHING;
