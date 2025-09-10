-- Add tax_rate_percent column to invoice_headers table
-- This column stores the tax rate as a percentage (e.g., 20 for 20%, 7.5 for 7.5%)

ALTER TABLE invoice_headers
ADD COLUMN IF NOT EXISTS tax_rate_percent DECIMAL(9, 6);

-- Also add to invoice_lines for line-level tax rates
ALTER TABLE invoice_lines
ADD COLUMN IF NOT EXISTS tax_rate_percent DECIMAL(9, 6);

-- Update existing records with calculated tax rate where possible
UPDATE invoice_headers
SET tax_rate_percent = CASE 
  WHEN subtotal > 0 AND tax_total > 0 THEN 
    ROUND((tax_total / subtotal) * 100, 2)
  ELSE NULL
END
WHERE tax_rate_percent IS NULL;

-- Add comment to explain the field
COMMENT ON COLUMN invoice_headers.tax_rate_percent IS 'Tax rate as a percentage (e.g., 20 for 20%, 7.5 for 7.5%)';
COMMENT ON COLUMN invoice_lines.tax_rate_percent IS 'Tax rate as a percentage for this line item';