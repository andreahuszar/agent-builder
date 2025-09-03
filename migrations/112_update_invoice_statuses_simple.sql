-- 112_update_invoice_statuses_simple.sql - Add new invoice statuses to existing enum

-- Add new enum values (these require separate transactions in PostgreSQL)
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'processing' AFTER 'draft';
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'validating' AFTER 'processing';
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'requires_review' AFTER 'validating';
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'pending_approval' AFTER 'requires_review';
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'approved_ready_for_payment' AFTER 'approved';
ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'on_hold' AFTER 'void';

-- Note: In PostgreSQL, we cannot use new enum values in the same transaction where they were created
-- So we'll update the draft invoices to processing in the next migration file

-- Add an approval status enum for more granular tracking
CREATE TYPE approval_status AS ENUM (
  'not_required',
  'pending',
  'in_progress',
  'approved',
  'rejected',
  'escalated'
);

-- Add approval status column to invoice_headers
ALTER TABLE invoice_headers 
  ADD COLUMN IF NOT EXISTS approval_status approval_status DEFAULT 'not_required';

-- Add index for finding invoices by status
CREATE INDEX IF NOT EXISTS idx_invoice_headers_status 
  ON invoice_headers(status);

CREATE INDEX IF NOT EXISTS idx_invoice_headers_approval_status 
  ON invoice_headers(approval_status) 
  WHERE approval_status != 'not_required';

-- Update any invoices that are in 'approved' status to have proper approval_status
UPDATE invoice_headers 
SET approval_status = 'approved' 
WHERE status = 'approved' AND approval_status = 'not_required';

-- Add status transition tracking table
CREATE TABLE IF NOT EXISTS invoice_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoice_headers(id) ON DELETE CASCADE,
  old_status invoice_status,
  new_status invoice_status NOT NULL,
  changed_by UUID REFERENCES users(id),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for status history lookups
CREATE INDEX IF NOT EXISTS idx_invoice_status_history_invoice 
  ON invoice_status_history(invoice_id, created_at DESC);

-- Function to track status changes
CREATE OR REPLACE FUNCTION fn_track_invoice_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO invoice_status_history (
      invoice_id, 
      old_status, 
      new_status,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      NEW.updated_by
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to track status changes
DROP TRIGGER IF EXISTS trg_invoice_status_change ON invoice_headers;
CREATE TRIGGER trg_invoice_status_change
  AFTER UPDATE ON invoice_headers
  FOR EACH ROW
  EXECUTE FUNCTION fn_track_invoice_status_change();

-- Comments for documentation
COMMENT ON COLUMN invoice_headers.status IS 'Current processing status of the invoice';
COMMENT ON COLUMN invoice_headers.approval_status IS 'Approval workflow status';
COMMENT ON TABLE invoice_status_history IS 'Audit trail of invoice status changes';