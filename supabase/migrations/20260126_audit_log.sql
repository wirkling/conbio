-- Migration: Create audit log table
-- Purpose: Track all changes to contracts, milestones, and related entities

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- What was changed
  entity_type VARCHAR(50) NOT NULL,  -- e.g., 'contract', 'milestone', 'change_order'
  entity_id UUID NOT NULL,           -- ID of the entity that was changed
  action VARCHAR(20) NOT NULL,       -- 'create', 'update', 'delete', 'complete', 'approve'

  -- Change details
  field_name VARCHAR(100),           -- Specific field changed (NULL for entity-level actions)
  old_value TEXT,                    -- Previous value (JSON for complex types)
  new_value TEXT,                    -- New value (JSON for complex types)
  change_summary TEXT,               -- Human-readable description

  -- Context
  user_id UUID REFERENCES users(id),
  user_name VARCHAR(255),            -- Denormalized for historical record
  ip_address VARCHAR(45),            -- IPv4 or IPv6
  user_agent TEXT,                   -- Browser/client info

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Additional context (JSONB for flexibility)
  metadata JSONB
);

-- Indexes for common queries
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);

-- Composite index for entity timeline
CREATE INDEX idx_audit_log_entity_timeline ON audit_log(entity_type, entity_id, created_at DESC);

COMMENT ON TABLE audit_log IS 'Complete audit trail of all changes in the system';
COMMENT ON COLUMN audit_log.entity_type IS 'Type of entity: contract, milestone, change_order, etc.';
COMMENT ON COLUMN audit_log.action IS 'Type of action: create, update, delete, complete, approve, etc.';
COMMENT ON COLUMN audit_log.change_summary IS 'Human-readable description for UI display';
COMMENT ON COLUMN audit_log.metadata IS 'Additional context like change_order_id, milestone_number, etc.';

-- Example usage:
-- INSERT INTO audit_log (entity_type, entity_id, action, change_summary, user_id, user_name)
-- VALUES ('milestone', 'm1', 'complete', 'Milestone "Project Kickoff" marked as complete', '...', 'John Doe');
--
-- INSERT INTO audit_log (entity_type, entity_id, action, field_name, old_value, new_value, change_summary, user_id)
-- VALUES ('contract', 'c1', 'update', 'current_value', '150000', '195000', 'Contract value increased via Change Order CO-001', '...', 'Jane Smith');
