-- 201_add_accounting_classification.sql - Add accounting classification fields to invoice headers

-- ================================================================
-- ADD ACCOUNTING CLASSIFICATION COLUMNS TO INVOICE_HEADERS
-- ================================================================

-- Add cost center field for department/project allocation
ALTER TABLE invoice_headers 
ADD COLUMN IF NOT EXISTS cost_center VARCHAR(100);

-- Add cost center name for display purposes
ALTER TABLE invoice_headers 
ADD COLUMN IF NOT EXISTS cost_center_name VARCHAR(255);

-- Add GL code for general ledger account mapping
ALTER TABLE invoice_headers 
ADD COLUMN IF NOT EXISTS gl_code VARCHAR(50);

-- Add department field for organizational mapping
ALTER TABLE invoice_headers 
ADD COLUMN IF NOT EXISTS department VARCHAR(100);

-- Add accounting notes for manual annotations
ALTER TABLE invoice_headers 
ADD COLUMN IF NOT EXISTS accounting_notes TEXT;

-- Add AI classification confidence score (0.00 to 1.00)
ALTER TABLE invoice_headers 
ADD COLUMN IF NOT EXISTS ai_classification_confidence DECIMAL(3,2);

-- Add AI classification reasoning for audit trail
ALTER TABLE invoice_headers 
ADD COLUMN IF NOT EXISTS ai_classification_reasoning TEXT;

-- ================================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ================================================================

COMMENT ON COLUMN invoice_headers.cost_center IS 'Cost center code for budget allocation (e.g., IT-100, MKT-200)';
COMMENT ON COLUMN invoice_headers.cost_center_name IS 'Human-readable cost center name (e.g., Information Technology, Marketing)';
COMMENT ON COLUMN invoice_headers.gl_code IS 'General ledger account code for financial posting';
COMMENT ON COLUMN invoice_headers.department IS 'Department responsible for the expense';
COMMENT ON COLUMN invoice_headers.accounting_notes IS 'Manual accounting notes and annotations';
COMMENT ON COLUMN invoice_headers.ai_classification_confidence IS 'AI confidence score for automatic classification (0.00 to 1.00)';
COMMENT ON COLUMN invoice_headers.ai_classification_reasoning IS 'AI reasoning for classification decisions (audit trail)';

-- ================================================================
-- UPDATE EXISTING LEDGER FIELD COMMENT
-- ================================================================

COMMENT ON COLUMN invoice_headers.ledger IS 'Primary ledger account (Accounts Payable, Accruals, Prepaid Expenses, Fixed Assets, Inventory)';

-- ================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ================================================================

-- Index for cost center queries and reporting
CREATE INDEX IF NOT EXISTS idx_invoice_headers_cost_center 
ON invoice_headers(cost_center) 
WHERE cost_center IS NOT NULL;

-- Index for department filtering
CREATE INDEX IF NOT EXISTS idx_invoice_headers_department 
ON invoice_headers(department) 
WHERE department IS NOT NULL;

-- Composite index for financial reporting
CREATE INDEX IF NOT EXISTS idx_invoice_headers_accounting 
ON invoice_headers(cost_center, gl_code, ledger) 
WHERE cost_center IS NOT NULL;

-- ================================================================
-- SAMPLE DATA FOR DEMONSTRATION
-- ================================================================

-- Update a few existing invoices with sample accounting classification
UPDATE invoice_headers 
SET 
    cost_center = 'IT-100',
    cost_center_name = 'Information Technology',
    gl_code = '6210',
    department = 'Technology',
    ledger = 'Accounts Payable',
    accounting_notes = 'Monthly software subscription',
    ai_classification_confidence = 0.92,
    ai_classification_reasoning = 'Technology vendor, software subscription detected, monthly recurring pattern'
WHERE id IN (
    SELECT id FROM invoice_headers 
    WHERE vendor_name_snapshot ILIKE '%Global IT%' 
      AND cost_center IS NULL
    LIMIT 2
);

UPDATE invoice_headers 
SET 
    cost_center = 'OPS-300',
    cost_center_name = 'Operations',
    gl_code = '5100',
    department = 'Operations',
    ledger = 'Accounts Payable',
    accounting_notes = 'Office supplies and materials',
    ai_classification_confidence = 0.88,
    ai_classification_reasoning = 'Office supplies vendor, operational materials detected'
WHERE id IN (
    SELECT id FROM invoice_headers 
    WHERE vendor_name_snapshot ILIKE '%Office Supplies%' 
      AND cost_center IS NULL
    LIMIT 2
);

UPDATE invoice_headers 
SET 
    cost_center = 'FAC-700',
    cost_center_name = 'Facilities',
    gl_code = '5400',
    department = 'Facilities',
    ledger = 'Accruals',
    accounting_notes = 'Utility services - electricity',
    ai_classification_confidence = 0.95,
    ai_classification_reasoning = 'Utility vendor, electricity service, monthly billing cycle'
WHERE id IN (
    SELECT id FROM invoice_headers 
    WHERE vendor_name_snapshot ILIKE '%Electric%' 
      AND cost_center IS NULL
    LIMIT 1
);

-- ================================================================
-- VALIDATION CHECK
-- ================================================================

-- Display sample of updated records
SELECT 
    invoice_number,
    vendor_name_snapshot,
    ledger,
    cost_center,
    cost_center_name,
    gl_code,
    department,
    ai_classification_confidence,
    SUBSTRING(ai_classification_reasoning, 1, 50) as reasoning_preview
FROM invoice_headers 
WHERE cost_center IS NOT NULL
LIMIT 5;