-- Migration: Add adjustment tracking to milestones
-- Purpose: Store bonus/malus adjustments for audit trail and invoicing

-- Add adjustment fields to milestones table
ALTER TABLE milestones ADD COLUMN adjustment_type VARCHAR(20);
ALTER TABLE milestones ADD COLUMN adjustment_amount DECIMAL(12, 2);
ALTER TABLE milestones ADD COLUMN adjustment_percentage DECIMAL(5, 2);
ALTER TABLE milestones ADD COLUMN adjustment_reason TEXT;
ALTER TABLE milestones ADD COLUMN adjustment_calculated_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN milestones.adjustment_type IS 'Type of adjustment: bonus, penalty, or NULL';
COMMENT ON COLUMN milestones.adjustment_amount IS 'Calculated bonus (+) or penalty (-) amount';
COMMENT ON COLUMN milestones.adjustment_percentage IS 'Percentage applied for the adjustment';
COMMENT ON COLUMN milestones.adjustment_reason IS 'Human-readable reason (e.g., "Delivered 2 weeks early")';
COMMENT ON COLUMN milestones.adjustment_calculated_at IS 'When the adjustment was calculated and applied';

-- Add index for querying adjustments
CREATE INDEX idx_milestones_adjustment_type ON milestones(adjustment_type) WHERE adjustment_type IS NOT NULL;

-- Add computed invoice_amount field (virtual/generated column would be ideal, but for compatibility we'll calculate in app)
-- The invoice amount = current_value + adjustment_amount
