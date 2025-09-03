-- 110_add_validation_fields.sql - Add validation and helpdesk tracking fields to invoices

-- Add validation and helpdesk fields to invoice_headers
ALTER TABLE invoice_headers ADD COLUMN IF NOT EXISTS helpdesk_ticket_ref VARCHAR(50);
ALTER TABLE invoice_headers ADD COLUMN IF NOT EXISTS validation_errors JSONB DEFAULT '[]'::jsonb;
ALTER TABLE invoice_headers ADD COLUMN IF NOT EXISTS validation_warnings JSONB DEFAULT '[]'::jsonb;
ALTER TABLE invoice_headers ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(5,2) DEFAULT 100.00;
ALTER TABLE invoice_headers ADD COLUMN IF NOT EXISTS fraud_risk_score DECIMAL(5,2) DEFAULT 0.00;
ALTER TABLE invoice_headers ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;
ALTER TABLE invoice_headers ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMPTZ;

-- Add constraints for scores
ALTER TABLE invoice_headers ADD CONSTRAINT chk_confidence_score 
  CHECK (confidence_score >= 0 AND confidence_score <= 100);
ALTER TABLE invoice_headers ADD CONSTRAINT chk_fraud_risk_score 
  CHECK (fraud_risk_score >= 0 AND fraud_risk_score <= 100);

-- Add index for helpdesk ticket reference
CREATE INDEX IF NOT EXISTS idx_invoice_headers_helpdesk_ticket 
  ON invoice_headers(helpdesk_ticket_ref) 
  WHERE helpdesk_ticket_ref IS NOT NULL;

-- Add index for finding invoices with validation issues
CREATE INDEX IF NOT EXISTS idx_invoice_headers_has_errors 
  ON invoice_headers((jsonb_array_length(validation_errors) > 0));

-- Add index for confidence score queries
CREATE INDEX IF NOT EXISTS idx_invoice_headers_confidence 
  ON invoice_headers(confidence_score);

-- Comments for documentation
COMMENT ON COLUMN invoice_headers.helpdesk_ticket_ref IS 'Reference to associated helpdesk ticket (e.g., HD-2024-001)';
COMMENT ON COLUMN invoice_headers.validation_errors IS 'Array of validation error objects with field, message, and severity';
COMMENT ON COLUMN invoice_headers.validation_warnings IS 'Array of validation warning objects with field, message, and severity';
COMMENT ON COLUMN invoice_headers.confidence_score IS 'Overall validation confidence score (0-100)';
COMMENT ON COLUMN invoice_headers.fraud_risk_score IS 'Calculated fraud risk score (0-100)';
COMMENT ON COLUMN invoice_headers.processing_started_at IS 'Timestamp when invoice processing began';
COMMENT ON COLUMN invoice_headers.processing_completed_at IS 'Timestamp when invoice processing completed';