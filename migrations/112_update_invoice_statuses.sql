-- 112_update_invoice_statuses.sql - Update invoice status enum and existing statuses

-- First, we need to rename the old enum and create a new one
-- PostgreSQL doesn't allow direct modification of enum values

-- Create new enum with better statuses
CREATE TYPE invoice_status_new AS ENUM (
  'processing',           -- Initial processing state (replaces 'draft')
  'validating',          -- Running validation checks
  'requires_review',     -- Has validation errors/exceptions
  'pending_approval',    -- Awaiting approval
  'approved',            -- Approved (existing)
  'approved_ready_for_payment', -- Approved and ready for payment
  'posted',              -- Posted (existing)
  'paid',                -- Paid (existing)
  'void',                -- Void (existing)
  'on_hold'              -- On hold for various reasons
);

-- Drop views that depend on the invoice_headers table
DROP VIEW IF EXISTS v_invoice_summary CASCADE;
DROP VIEW IF EXISTS v_invoice_aging CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_invoice_po_unmatched CASCADE;

-- Update the column to use the new enum
-- First, convert to text temporarily
ALTER TABLE invoice_headers 
  ALTER COLUMN status TYPE TEXT;

-- Update existing values to map to new enum values
UPDATE invoice_headers 
SET status = CASE 
  WHEN status = 'draft' THEN 'processing'
  WHEN status = 'approved' THEN 'approved'
  WHEN status = 'posted' THEN 'posted'
  WHEN status = 'paid' THEN 'paid'
  WHEN status = 'void' THEN 'void'
  ELSE status
END;

-- Convert column to use new enum
ALTER TABLE invoice_headers 
  ALTER COLUMN status TYPE invoice_status_new 
  USING status::invoice_status_new;

-- Drop old enum and rename new one
DROP TYPE invoice_status;
ALTER TYPE invoice_status_new RENAME TO invoice_status;

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
CREATE INDEX idx_invoice_status_history_invoice 
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

-- Recreate the views that were dropped
-- v_invoice_summary
CREATE OR REPLACE VIEW v_invoice_summary AS
SELECT 
    ih.id,
    ih.invoice_number,
    ih.vendor_id,
    ih.vendor_name_snapshot,
    ih.invoice_date,
    ih.due_date,
    ih.total,
    ih.currency,
    ih.status,
    ih.match_status,
    CASE 
        WHEN ih.due_date < CURRENT_DATE AND ih.status NOT IN ('paid', 'void') THEN 'overdue'
        WHEN ih.due_date <= CURRENT_DATE + INTERVAL '7 days' AND ih.status NOT IN ('paid', 'void') THEN 'due_soon'
        ELSE 'current'
    END as aging_bucket,
    CURRENT_DATE - ih.due_date as days_overdue,
    ih.po_numbers_cached,
    COUNT(il.id) as line_count,
    ih.created_at,
    ih.updated_at
FROM invoice_headers ih
LEFT JOIN invoice_lines il ON il.invoice_id = ih.id
GROUP BY ih.id;

-- v_invoice_aging
CREATE OR REPLACE VIEW v_invoice_aging AS
SELECT 
    vendor_id,
    vendor_name_snapshot,
    COUNT(*) FILTER (WHERE days_overdue <= 0) as current_count,
    COUNT(*) FILTER (WHERE days_overdue BETWEEN 1 AND 30) as overdue_1_30,
    COUNT(*) FILTER (WHERE days_overdue BETWEEN 31 AND 60) as overdue_31_60,
    COUNT(*) FILTER (WHERE days_overdue BETWEEN 61 AND 90) as overdue_61_90,
    COUNT(*) FILTER (WHERE days_overdue > 90) as overdue_over_90,
    SUM(total) FILTER (WHERE days_overdue <= 0) as current_amount,
    SUM(total) FILTER (WHERE days_overdue BETWEEN 1 AND 30) as amount_1_30,
    SUM(total) FILTER (WHERE days_overdue BETWEEN 31 AND 60) as amount_31_60,
    SUM(total) FILTER (WHERE days_overdue BETWEEN 61 AND 90) as amount_61_90,
    SUM(total) FILTER (WHERE days_overdue > 90) as amount_over_90,
    SUM(total) as total_outstanding
FROM (
    SELECT 
        vendor_id,
        vendor_name_snapshot,
        total,
        CURRENT_DATE - due_date as days_overdue
    FROM invoice_headers
    WHERE status NOT IN ('paid', 'void')
) aging
GROUP BY vendor_id, vendor_name_snapshot;

-- mv_invoice_po_unmatched
CREATE MATERIALIZED VIEW mv_invoice_po_unmatched AS
SELECT 
    ih.id as invoice_id,
    ih.invoice_number,
    ih.vendor_id,
    ih.vendor_name_snapshot,
    ih.total as invoice_total,
    ih.po_numbers_cached,
    po.id as po_id,
    po.po_number,
    po_totals.po_total,
    ih.total - COALESCE(po_totals.po_total, 0) as variance,
    ih.created_at
FROM invoice_headers ih
LEFT JOIN LATERAL (
    SELECT 
        ph.id, 
        ph.po_number,
        SUM(pl.qty_ordered * pl.unit_price) as po_total
    FROM po_headers ph
    JOIN po_lines pl ON pl.po_id = ph.id
    WHERE ph.po_number = ANY(ih.po_numbers_cached)
    GROUP BY ph.id, ph.po_number
    LIMIT 1
) po_totals ON true
LEFT JOIN po_headers po ON po.po_number = ANY(ih.po_numbers_cached)
WHERE ih.match_status IN ('not_matched', 'exception')
  AND ih.po_numbers_cached IS NOT NULL
  AND array_length(ih.po_numbers_cached, 1) > 0;

CREATE UNIQUE INDEX ON mv_invoice_po_unmatched (invoice_id);