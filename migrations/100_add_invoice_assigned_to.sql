-- ================================================================
-- Add Assigned To functionality for Invoice Headers
-- ================================================================

-- Add assigned_to_user_id field to invoice_headers
ALTER TABLE invoice_headers 
ADD COLUMN assigned_to_user_id UUID REFERENCES users(id);

-- Add index for performance on assignments query
CREATE INDEX idx_invoice_headers_assigned_to 
ON invoice_headers(assigned_to_user_id);

-- Set default assignments for existing invoices to John Smith
-- This ensures existing invoices have an assignee rather than showing as unassigned
UPDATE invoice_headers 
SET assigned_to_user_id = '11111111-1111-1111-1111-111111111111'::UUID 
WHERE assigned_to_user_id IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN invoice_headers.assigned_to_user_id IS 'User responsible for processing this invoice';