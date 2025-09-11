-- Migration: Add payment method fields to invoice_headers table
-- Date: 2025-09-11
-- Description: Adds payment_method and payment_bank_details columns to store payment information extracted from invoices

-- Add payment_method column
ALTER TABLE invoice_headers
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);

-- Add payment_bank_details column as JSONB for flexible storage
ALTER TABLE invoice_headers
ADD COLUMN IF NOT EXISTS payment_bank_details JSONB;

-- Add index on payment_method for querying
CREATE INDEX IF NOT EXISTS idx_invoice_headers_payment_method 
ON invoice_headers(payment_method);

-- Add comment on columns
COMMENT ON COLUMN invoice_headers.payment_method IS 'Payment method extracted from invoice (bank_transfer, check, credit_card, paypal, wire_transfer, cash, other)';
COMMENT ON COLUMN invoice_headers.payment_bank_details IS 'JSON object containing bank details: bank_name, account_name, account_number, sort_code, iban, swift_bic, routing_number';

-- Update existing records to have null payment method (optional, for clarity)
UPDATE invoice_headers
SET payment_method = NULL,
    payment_bank_details = NULL
WHERE payment_method IS NULL;