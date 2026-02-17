-- Migration 205: Add Approval Routing Features
-- Adds support for intelligent invoice approval routing with AI-powered suggestions

-- ============================================================================
-- 1. Extend invoice_headers for approval tracking
-- ============================================================================

-- Add approval assignment fields
ALTER TABLE invoice_headers
ADD COLUMN IF NOT EXISTS assigned_to_user_id TEXT,
ADD COLUMN IF NOT EXISTS assigned_to_name TEXT,
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2), -- 0.00 to 1.00
ADD COLUMN IF NOT EXISTS is_ai_suggested BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS rejection_category TEXT,
ADD COLUMN IF NOT EXISTS suggested_approver_id TEXT,
ADD COLUMN IF NOT EXISTS suggested_approver_name TEXT;

-- Add foreign key constraint
ALTER TABLE invoice_headers
ADD CONSTRAINT fk_invoice_assigned_to_user
FOREIGN KEY (assigned_to_user_id)
REFERENCES "user"(id)
ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoice_assigned_to ON invoice_headers(assigned_to_user_id) WHERE assigned_to_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoice_assigned_at ON invoice_headers(assigned_at) WHERE assigned_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoice_rejection_category ON invoice_headers(rejection_category) WHERE rejection_category IS NOT NULL;

-- Add comments
COMMENT ON COLUMN invoice_headers.assigned_to_user_id IS 'User ID of approver this invoice is assigned to';
COMMENT ON COLUMN invoice_headers.assigned_to_name IS 'Cached name of assigned approver';
COMMENT ON COLUMN invoice_headers.assigned_at IS 'Timestamp when invoice was assigned for approval';
COMMENT ON COLUMN invoice_headers.confidence_score IS 'AI confidence score for routing suggestion (0.00-1.00)';
COMMENT ON COLUMN invoice_headers.is_ai_suggested IS 'Whether this assignment was made via AI suggestion';
COMMENT ON COLUMN invoice_headers.rejection_category IS 'Category of rejection (wrong_approver, amount_authority, etc.)';
COMMENT ON COLUMN invoice_headers.suggested_approver_id IS 'Approver suggested during rejection feedback';
COMMENT ON COLUMN invoice_headers.suggested_approver_name IS 'Name of suggested approver during rejection';

-- ============================================================================
-- 2. Create approval_routing_patterns table
-- ============================================================================

CREATE TABLE IF NOT EXISTS approval_routing_patterns (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  vendor_name TEXT NOT NULL,
  amount_min DECIMAL(15,2) NOT NULL DEFAULT 0,
  amount_max DECIMAL(15,2) NOT NULL,
  approver_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  approver_name TEXT NOT NULL,
  success_count INTEGER NOT NULL DEFAULT 1,
  rejection_count INTEGER NOT NULL DEFAULT 0,
  last_success_at TIMESTAMPTZ,
  last_rejection_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure valid ranges
  CONSTRAINT valid_amount_range CHECK (amount_min <= amount_max),
  CONSTRAINT positive_success_count CHECK (success_count >= 0),
  CONSTRAINT positive_rejection_count CHECK (rejection_count >= 0)
);

-- Indexes for pattern matching queries
CREATE INDEX IF NOT EXISTS idx_routing_patterns_vendor ON approval_routing_patterns(vendor_name);
CREATE INDEX IF NOT EXISTS idx_routing_patterns_approver ON approval_routing_patterns(approver_id);
CREATE INDEX IF NOT EXISTS idx_routing_patterns_amount ON approval_routing_patterns(amount_min, amount_max);
CREATE INDEX IF NOT EXISTS idx_routing_patterns_success ON approval_routing_patterns(success_count DESC);

-- Comments
COMMENT ON TABLE approval_routing_patterns IS 'Learned patterns for intelligent invoice routing based on vendor and amount';
COMMENT ON COLUMN approval_routing_patterns.vendor_name IS 'Vendor name for pattern matching (fuzzy match)';
COMMENT ON COLUMN approval_routing_patterns.amount_min IS 'Minimum invoice amount for this pattern';
COMMENT ON COLUMN approval_routing_patterns.amount_max IS 'Maximum invoice amount for this pattern';
COMMENT ON COLUMN approval_routing_patterns.success_count IS 'Number of successful approvals for this pattern';
COMMENT ON COLUMN approval_routing_patterns.rejection_count IS 'Number of rejections for this pattern';

-- ============================================================================
-- 3. Create approver_status table
-- ============================================================================

CREATE TABLE IF NOT EXISTS approver_status (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('available', 'busy', 'out-of-office', 'left-company')),
  status_details JSONB,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  effective_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure valid date range
  CONSTRAINT valid_effective_range CHECK (effective_until IS NULL OR effective_from <= effective_until)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_approver_status_user ON approver_status(user_id);
CREATE INDEX IF NOT EXISTS idx_approver_status_effective ON approver_status(effective_from, effective_until) WHERE effective_until IS NULL OR effective_until > CURRENT_TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_approver_status_active ON approver_status(user_id, status) WHERE effective_until IS NULL OR effective_until > CURRENT_TIMESTAMP;

-- Comments
COMMENT ON TABLE approver_status IS 'Tracks approver availability status (OOO, left company, etc.)';
COMMENT ON COLUMN approver_status.status IS 'Current status: available, busy, out-of-office, left-company';
COMMENT ON COLUMN approver_status.status_details IS 'JSON metadata (return_date, backup_approver_id, replacement_approver_id, reason)';
COMMENT ON COLUMN approver_status.effective_from IS 'When this status becomes effective';
COMMENT ON COLUMN approver_status.effective_until IS 'When this status expires (NULL for indefinite)';

-- ============================================================================
-- 4. Create helper function to get current approver status
-- ============================================================================

CREATE OR REPLACE FUNCTION get_approver_current_status(p_user_id TEXT)
RETURNS TABLE (
  status TEXT,
  status_details JSONB,
  effective_from TIMESTAMPTZ,
  effective_until TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.status,
    s.status_details,
    s.effective_from,
    s.effective_until
  FROM approver_status s
  WHERE s.user_id = p_user_id
    AND s.effective_from <= CURRENT_TIMESTAMP
    AND (s.effective_until IS NULL OR s.effective_until > CURRENT_TIMESTAMP)
  ORDER BY s.effective_from DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_approver_current_status IS 'Returns the current active status for an approver';

-- ============================================================================
-- 5. Create trigger to update routing patterns
-- ============================================================================

CREATE OR REPLACE FUNCTION update_routing_pattern()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if invoice was approved successfully
  IF NEW.status = 'approved' AND NEW.assigned_to_user_id IS NOT NULL THEN
    -- Insert or update routing pattern
    INSERT INTO approval_routing_patterns (
      vendor_name,
      amount_min,
      amount_max,
      approver_id,
      approver_name,
      success_count,
      last_success_at
    )
    VALUES (
      NEW.vendor_name_snapshot,
      GREATEST(0, NEW.total - 10000), -- Range: amount ± 10k
      NEW.total + 10000,
      NEW.assigned_to_user_id,
      NEW.assigned_to_name,
      1,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ON CONSTRAINT approval_routing_patterns_pkey
    DO UPDATE SET
      success_count = approval_routing_patterns.success_count + 1,
      last_success_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (drop first if exists)
DROP TRIGGER IF EXISTS trg_update_routing_pattern ON invoice_headers;
CREATE TRIGGER trg_update_routing_pattern
  AFTER UPDATE ON invoice_headers
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND OLD.status <> 'approved')
  EXECUTE FUNCTION update_routing_pattern();

COMMENT ON FUNCTION update_routing_pattern IS 'Automatically updates routing patterns when invoices are approved';
COMMENT ON TRIGGER trg_update_routing_pattern ON invoice_headers IS 'Learns from successful approvals to improve future routing';
