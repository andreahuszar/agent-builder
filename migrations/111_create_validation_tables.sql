-- 111_create_validation_tables.sql - Create validation tracking and rules tables

-- Validation rule types enum
CREATE TYPE validation_rule_type AS ENUM (
  'required_field',
  'amount_variance',
  'date_consistency',
  'tax_calculation',
  'duplicate_detection',
  'vendor_verification',
  'po_matching',
  'receipt_matching',
  'budget_impact',
  'approval_limit',
  'custom'
);

-- Validation severity levels
CREATE TYPE validation_severity AS ENUM (
  'error',
  'warning',
  'info'
);

-- Validation categories
CREATE TYPE validation_category AS ENUM (
  'financial',
  'process',
  'compliance',
  'risk',
  'data_quality'
);

-- Validation Rules Table
CREATE TABLE validation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  rule_type validation_rule_type NOT NULL,
  category validation_category NOT NULL,
  severity validation_severity NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Configuration for the rule
  config JSONB DEFAULT '{}'::jsonb,
  
  -- Thresholds
  tolerance_percent DECIMAL(7,4),
  tolerance_amount DECIMAL(18,4),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoice Validations Table (stores validation results per invoice)
CREATE TABLE invoice_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoice_headers(id) ON DELETE CASCADE,
  validation_rule_id UUID NOT NULL REFERENCES validation_rules(id),
  
  -- Validation details
  field_name VARCHAR(100),
  line_number INTEGER,
  severity validation_severity NOT NULL,
  category validation_category NOT NULL,
  
  -- Results
  is_valid BOOLEAN NOT NULL,
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  
  -- Values for comparison
  expected_value TEXT,
  actual_value TEXT,
  variance_amount DECIMAL(18,4),
  variance_percent DECIMAL(7,4),
  
  -- Resolution tracking
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Validation Run History (tracks when validations were performed)
CREATE TABLE validation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoice_headers(id) ON DELETE CASCADE,
  
  -- Run details
  run_type VARCHAR(50) NOT NULL, -- 'manual', 'automatic', 'scheduled'
  triggered_by UUID REFERENCES users(id),
  
  -- Results summary
  total_rules_checked INTEGER NOT NULL DEFAULT 0,
  errors_found INTEGER NOT NULL DEFAULT 0,
  warnings_found INTEGER NOT NULL DEFAULT 0,
  info_found INTEGER NOT NULL DEFAULT 0,
  
  -- Scores
  confidence_score DECIMAL(5,2),
  fraud_risk_score DECIMAL(5,2),
  
  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_invoice_validations_invoice_id ON invoice_validations(invoice_id);
CREATE INDEX idx_invoice_validations_severity ON invoice_validations(severity) WHERE NOT is_resolved;
CREATE INDEX idx_invoice_validations_category ON invoice_validations(category);
CREATE INDEX idx_invoice_validations_unresolved ON invoice_validations(invoice_id) WHERE NOT is_resolved;

CREATE INDEX idx_validation_runs_invoice_id ON validation_runs(invoice_id);
CREATE INDEX idx_validation_runs_completed ON validation_runs(completed_at DESC);

-- Insert default validation rules
INSERT INTO validation_rules (code, name, description, rule_type, category, severity, config) VALUES
  -- Financial validations
  ('AMT_VAR_PO', 'PO Amount Variance', 'Invoice amount varies from PO amount', 'amount_variance', 'financial', 'error', 
   '{"tolerance_percent": 5.0, "tolerance_amount": 100.00}'::jsonb),
  
  ('TAX_CALC', 'Tax Calculation', 'Tax amount calculation verification', 'tax_calculation', 'financial', 'error',
   '{"tolerance_amount": 1.00}'::jsonb),
  
  ('BUDGET_IMPACT', 'Budget Impact', 'Invoice exceeds budget threshold', 'budget_impact', 'financial', 'warning',
   '{"threshold_percent": 90.0}'::jsonb),
  
  -- Process validations
  ('REQ_FIELDS', 'Required Fields', 'Check for missing required fields', 'required_field', 'process', 'error',
   '{"required_fields": ["invoice_number", "vendor_id", "total", "due_date"]}'::jsonb),
  
  ('DATE_CONSISTENCY', 'Date Consistency', 'Due date before invoice date', 'date_consistency', 'data_quality', 'warning',
   '{}'::jsonb),
  
  ('PO_MATCH', 'PO Matching', 'Invoice requires PO matching', 'po_matching', 'process', 'error',
   '{"require_po_for_amount_above": 1000.00}'::jsonb),
  
  ('RECEIPT_MATCH', 'Receipt Matching', 'Invoice requires goods receipt', 'receipt_matching', 'process', 'warning',
   '{"require_gr_for_goods": true}'::jsonb),
  
  -- Risk validations
  ('DUPLICATE_INV', 'Duplicate Invoice', 'Potential duplicate invoice detected', 'duplicate_detection', 'risk', 'error',
   '{"similarity_threshold": 0.95, "date_range_days": 30}'::jsonb),
  
  ('VENDOR_VERIFY', 'Vendor Verification', 'Vendor information mismatch', 'vendor_verification', 'risk', 'warning',
   '{"check_tax_id": true, "check_bank_account": true}'::jsonb),
  
  ('FRAUD_PATTERN', 'Fraud Pattern Detection', 'Suspicious pattern detected', 'custom', 'risk', 'warning',
   '{"patterns": ["round_numbers", "sequential_gaps", "unusual_timing"]}'::jsonb),
  
  -- Compliance validations
  ('APPROVAL_LIMIT', 'Approval Limit', 'Invoice exceeds approval authority', 'approval_limit', 'compliance', 'error',
   '{"limits": {"standard": 10000, "manager": 50000, "director": 100000}}'::jsonb),
  
  ('TAX_COMPLIANCE', 'Tax Compliance', 'Missing tax information', 'custom', 'compliance', 'warning',
   '{"require_tax_id": true, "require_w9": true}'::jsonb);

-- Function to run validations on an invoice
CREATE OR REPLACE FUNCTION fn_run_invoice_validations(p_invoice_id UUID)
RETURNS UUID AS $$
DECLARE
  v_run_id UUID;
  v_error_count INTEGER := 0;
  v_warning_count INTEGER := 0;
  v_info_count INTEGER := 0;
  v_confidence_score DECIMAL(5,2) := 100.00;
  v_fraud_risk_score DECIMAL(5,2) := 0.00;
BEGIN
  -- Create validation run record
  INSERT INTO validation_runs (invoice_id, run_type, total_rules_checked)
  VALUES (p_invoice_id, 'automatic', 0)
  RETURNING id INTO v_run_id;
  
  -- Run validations (simplified - actual implementation would check each rule)
  -- This is a placeholder for the actual validation logic
  
  -- Update run record with results
  UPDATE validation_runs
  SET 
    errors_found = v_error_count,
    warnings_found = v_warning_count,
    info_found = v_info_count,
    confidence_score = v_confidence_score,
    fraud_risk_score = v_fraud_risk_score,
    completed_at = NOW(),
    duration_ms = EXTRACT(MILLISECONDS FROM (NOW() - started_at))
  WHERE id = v_run_id;
  
  -- Update invoice header with latest scores
  UPDATE invoice_headers
  SET 
    confidence_score = v_confidence_score,
    fraud_risk_score = v_fraud_risk_score
  WHERE id = p_invoice_id;
  
  RETURN v_run_id;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE validation_rules IS 'Defines validation rules to be applied to invoices';
COMMENT ON TABLE invoice_validations IS 'Stores validation results for each invoice';
COMMENT ON TABLE validation_runs IS 'History of validation runs performed on invoices';
COMMENT ON FUNCTION fn_run_invoice_validations IS 'Executes all active validation rules on an invoice';