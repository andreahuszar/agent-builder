-- Add fields to track extraction accuracy for invoice totals
ALTER TABLE invoice_headers 
ADD COLUMN IF NOT EXISTS extracted_total DECIMAL(18, 4),
ADD COLUMN IF NOT EXISTS total_discrepancy DECIMAL(18, 4);

-- Add comment to explain the fields
COMMENT ON COLUMN invoice_headers.extracted_total IS 'Original total extracted by AI from the invoice document';
COMMENT ON COLUMN invoice_headers.total_discrepancy IS 'Difference between extracted and calculated total (when significant)';