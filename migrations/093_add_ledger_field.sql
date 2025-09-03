-- 093_add_ledger_field.sql - Add ledger field to invoice headers

-- ================================================================
-- ADD LEDGER COLUMN TO INVOICE_HEADERS
-- ================================================================

-- Add ledger column with default value for typical vendor invoices
ALTER TABLE invoice_headers 
ADD COLUMN IF NOT EXISTS ledger VARCHAR(50) DEFAULT 'Accounts Payable';

-- Update existing invoices to have the default ledger value
UPDATE invoice_headers 
SET ledger = 'Accounts Payable' 
WHERE ledger IS NULL;

-- ================================================================
-- UPDATE SPECIFIC INVOICE TYPES WITH APPROPRIATE LEDGERS
-- ================================================================

-- Set ledger for credit memos to a different value if needed
UPDATE invoice_headers 
SET ledger = 'Accounts Payable' 
WHERE type = 'credit_memo' AND ledger IS NULL;

-- Set ledger for electricity/utility invoices (Non-PO vendors)
UPDATE invoice_headers 
SET ledger = 'Accounts Payable'
WHERE vendor_id IN (
    SELECT id FROM vendors WHERE requires_po = false
) AND ledger IS NULL;

-- ================================================================
-- ADD COMMENT FOR DOCUMENTATION
-- ================================================================

COMMENT ON COLUMN invoice_headers.ledger IS 'Accounting ledger for posting (e.g., Accounts Payable, Accruals, Prepaid Expenses)';

-- ================================================================
-- SAMPLE LEDGER VALUES FOR VARIETY
-- ================================================================

-- Update a few invoices to show different ledger types for demonstration
UPDATE invoice_headers 
SET ledger = 'Accruals'
WHERE invoice_number IN ('INV-2024-0006', 'INV-2024-0007')
  AND EXISTS (SELECT 1 FROM invoice_headers WHERE invoice_number = 'INV-2024-0006');

UPDATE invoice_headers 
SET ledger = 'Prepaid Expenses'
WHERE invoice_number = 'INV-2024-0010'
  AND EXISTS (SELECT 1 FROM invoice_headers WHERE invoice_number = 'INV-2024-0010');