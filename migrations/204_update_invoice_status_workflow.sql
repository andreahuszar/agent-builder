-- Migration: Update invoice_status enum to new 10 workflow statuses
-- Purpose: Replace old statuses with new workflow: RECEIVED, DATA_CAPTURE, MATCHING, VERIFICATION, APPROVAL, POSTED, DISPUTED, REJECTED, ON_HOLD, ARCHIVED

-- Step 1: Create new enum type with the 10 new statuses
CREATE TYPE invoice_status_new AS ENUM (
  'received_new',
  'data_capture',
  'matching',
  'verification',
  'approval',
  'posted',
  'disputed',
  'rejected',
  'on_hold',
  'archived_closed'
);

-- Step 2: Add temporary column with new enum type
ALTER TABLE invoice_headers
ADD COLUMN status_new invoice_status_new;

-- Step 3: Map old status values to new status values
UPDATE invoice_headers SET status_new =
  CASE
    WHEN status = 'draft' THEN 'received_new'::invoice_status_new
    WHEN status = 'processing' THEN 'data_capture'::invoice_status_new
    WHEN status = 'validating' THEN 'verification'::invoice_status_new
    WHEN status = 'requires_review' THEN 'verification'::invoice_status_new
    WHEN status = 'in_approval' THEN 'approval'::invoice_status_new
    WHEN status = 'pending_approval' THEN 'approval'::invoice_status_new
    WHEN status = 'approved' THEN 'posted'::invoice_status_new
    WHEN status = 'ready_for_payment' THEN 'posted'::invoice_status_new
    WHEN status = 'approved_ready_for_payment' THEN 'posted'::invoice_status_new
    WHEN status = 'posted' THEN 'posted'::invoice_status_new
    WHEN status = 'paid' THEN 'archived_closed'::invoice_status_new
    WHEN status = 'void' THEN 'archived_closed'::invoice_status_new
    WHEN status = 'on_hold' THEN 'on_hold'::invoice_status_new
    ELSE 'received_new'::invoice_status_new  -- Default fallback
  END;

-- Step 4: Drop old status column
ALTER TABLE invoice_headers DROP COLUMN status;

-- Step 5: Rename new column to status
ALTER TABLE invoice_headers RENAME COLUMN status_new TO status;

-- Step 6: Set NOT NULL constraint (if it was set before)
ALTER TABLE invoice_headers ALTER COLUMN status SET NOT NULL;

-- Step 7: Set default value
ALTER TABLE invoice_headers ALTER COLUMN status SET DEFAULT 'received_new'::invoice_status_new;

-- Step 8: Drop old enum type
DROP TYPE invoice_status;

-- Step 9: Rename new enum type to original name
ALTER TYPE invoice_status_new RENAME TO invoice_status;

-- Add comment for documentation
COMMENT ON TYPE invoice_status IS 'Invoice workflow status: 10 stages from received to archived';
COMMENT ON COLUMN invoice_headers.status IS 'Current workflow status of the invoice';
