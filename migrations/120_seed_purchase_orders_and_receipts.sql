-- 120_seed_purchase_orders_and_receipts.sql
-- Comprehensive seed data for Purchase Orders, Goods Receipts, and proper matching

-- Clear existing test data (be careful in production!)
-- Delete in correct order to respect foreign key constraints
DELETE FROM match_results WHERE invoice_id IN (SELECT id FROM invoice_headers WHERE invoice_number LIKE 'INV-2024-%' OR invoice_number LIKE 'INV-2025-%');
DELETE FROM ses_lines WHERE ses_id IN (SELECT id FROM ses_headers);
DELETE FROM ses_headers WHERE id IS NOT NULL;
DELETE FROM gr_lines WHERE gr_id IN (SELECT id FROM gr_headers WHERE gr_number LIKE 'GR-%');
DELETE FROM gr_headers WHERE gr_number LIKE 'GR-%';
DELETE FROM po_lines WHERE po_id IN (SELECT id FROM po_headers WHERE po_number LIKE 'PO-2%');
DELETE FROM po_headers WHERE po_number LIKE 'PO-2%';

-- ================================================================
-- VENDORS (if not exist)
-- ================================================================

-- Add vendors if they don't exist
INSERT INTO vendors (id, name, tax_id, country_code, default_currency, requires_po, active)
VALUES
('71111111-1000-4000-8000-000000000001', 'Acme Office Supplies', 'TAX-12345', 'US', 'USD', true, true),
('71111111-2000-4000-8000-000000000002', 'Professional Consulting Inc', 'TAX-67890', 'US', 'USD', true, true),
('71111111-3000-4000-8000-000000000003', 'Tech Solutions Corp', 'TAX-11111', 'US', 'USD', true, true),
('71111111-4000-4000-8000-000000000004', 'Cloud Services Pro', 'TAX-22222', 'US', 'USD', true, true)
ON CONFLICT (name) DO NOTHING;

-- ================================================================
-- PURCHASE ORDERS
-- ================================================================

-- PO-2025-0001: For invoice INV-2025-0901-2825 (Office Supplies)
INSERT INTO po_headers (id, po_number, vendor_id, po_type, order_date, currency, bill_to_id, ship_to_id, payment_terms_id, expected_match_rule, status, created_at)
VALUES 
('11111111-1000-4000-8000-000000000001', 'PO-2025-0001', 
 '71111111-1000-4000-8000-000000000001',
 'standard', '2025-01-15', 'USD',
 (SELECT id FROM org_entities LIMIT 1),
 (SELECT id FROM ship_to_sites LIMIT 1),
 (SELECT id FROM payment_terms WHERE name = 'Net 30' LIMIT 1),
 '3-way', 'approved', NOW());

INSERT INTO po_lines (id, po_id, line_no, description, uom, qty_ordered, unit_price, tax_rate_id, status)
VALUES 
('21111111-1000-4000-8000-000000000001', '11111111-1000-4000-8000-000000000001', 1, 'Office Paper - A4', 'REAM', 14, 25.00, (SELECT id FROM tax_rates LIMIT 1), 'open'),
('21111111-1000-4000-8000-000000000002', '11111111-1000-4000-8000-000000000001', 2, 'Printer Cartridges', 'EA', 5, 65.00, (SELECT id FROM tax_rates LIMIT 1), 'open'),
('21111111-1000-4000-8000-000000000003', '11111111-1000-4000-8000-000000000001', 3, 'Filing Folders', 'BOX', 25, 15.00, (SELECT id FROM tax_rates LIMIT 1), 'open');

-- PO-2025-2956: For variance example (Professional Services)
INSERT INTO po_headers (id, po_number, vendor_id, po_type, order_date, currency, bill_to_id, ship_to_id, payment_terms_id, expected_match_rule, status, created_at)
VALUES 
('11111111-2000-4000-8000-000000000002', 'PO-2025-2956', 
 '71111111-2000-4000-8000-000000000002',
 'service', '2025-01-10', 'USD',
 (SELECT id FROM org_entities LIMIT 1),
 (SELECT id FROM ship_to_sites LIMIT 1),
 (SELECT id FROM payment_terms WHERE name = 'Net 30' LIMIT 1),
 '2-way-PO', 'approved', NOW());

INSERT INTO po_lines (id, po_id, line_no, description, uom, qty_ordered, unit_price, tax_rate_id, status)
VALUES 
('21111111-2000-4000-8000-000000000001', '11111111-2000-4000-8000-000000000002', 1, 'Professional Services - Consulting', 'HRS', 8, 138.89, (SELECT id FROM tax_rates LIMIT 1), 'open'),
('21111111-2000-4000-8000-000000000002', '11111111-2000-4000-8000-000000000002', 2, 'Software License - Annual', 'EA', 1, 2222.22, (SELECT id FROM tax_rates LIMIT 1), 'open');

-- PO-2025-6929: Another matched example
INSERT INTO po_headers (id, po_number, vendor_id, po_type, order_date, currency, bill_to_id, ship_to_id, payment_terms_id, expected_match_rule, status, created_at)
VALUES 
('11111111-3000-4000-8000-000000000003', 'PO-2025-6929', 
 '71111111-1000-4000-8000-000000000001',
 'standard', '2025-01-20', 'USD',
 (SELECT id FROM org_entities LIMIT 1),
 (SELECT id FROM ship_to_sites LIMIT 1),
 (SELECT id FROM payment_terms WHERE name = 'Net 30' LIMIT 1),
 '3-way', 'approved', NOW());

INSERT INTO po_lines (id, po_id, line_no, description, uom, qty_ordered, unit_price, tax_rate_id, status)
VALUES 
('21111111-3000-4000-8000-000000000001', '11111111-3000-4000-8000-000000000003', 1, 'Office Paper - A4', 'REAM', 14, 25.00, (SELECT id FROM tax_rates LIMIT 1), 'received'),
('21111111-3000-4000-8000-000000000002', '11111111-3000-4000-8000-000000000003', 2, 'Printer Cartridges', 'EA', 5, 65.00, (SELECT id FROM tax_rates LIMIT 1), 'received'),
('21111111-3000-4000-8000-000000000003', '11111111-3000-4000-8000-000000000003', 3, 'Filing Folders', 'BOX', 25, 15.00, (SELECT id FROM tax_rates LIMIT 1), 'received');

-- Additional POs for other invoices
INSERT INTO po_headers (id, po_number, vendor_id, po_type, order_date, currency, bill_to_id, ship_to_id, payment_terms_id, expected_match_rule, status, created_at)
VALUES 
('11111111-4000-4000-8000-000000000004', 'PO-2024-1234', 
 '71111111-3000-4000-8000-000000000003',
 'standard', '2024-12-15', 'USD',
 (SELECT id FROM org_entities LIMIT 1),
 (SELECT id FROM ship_to_sites LIMIT 1),
 (SELECT id FROM payment_terms WHERE name = 'Net 30' LIMIT 1),
 '3-way', 'approved', NOW()),
 
('11111111-5000-4000-8000-000000000005', 'PO-2024-5678', 
 '71111111-4000-4000-8000-000000000004',
 'service', '2024-12-10', 'USD',
 (SELECT id FROM org_entities LIMIT 1),
 (SELECT id FROM ship_to_sites LIMIT 1),
 (SELECT id FROM payment_terms WHERE name = 'Net 45' LIMIT 1),
 '2-way-PO', 'approved', NOW());

-- ================================================================
-- GOODS RECEIPTS
-- ================================================================

-- GR for PO-2025-6929 (fully received)
INSERT INTO gr_headers (id, gr_number, po_id, receipt_date, received_by_user_id, status, created_at)
VALUES 
('31111111-3000-4000-8000-000000000001', 'GR-2025-0001', '11111111-3000-4000-8000-000000000003', 
 '2025-01-25', (SELECT id FROM users LIMIT 1), 'posted', NOW());

INSERT INTO gr_lines (id, gr_id, po_line_id, qty_received, uom, created_at)
VALUES 
('41111111-3000-4000-8000-000000000001', '31111111-3000-4000-8000-000000000001', '21111111-3000-4000-8000-000000000001', 14, 'REAM', NOW()),
('41111111-3000-4000-8000-000000000002', '31111111-3000-4000-8000-000000000001', '21111111-3000-4000-8000-000000000002', 5, 'EA', NOW()),
('41111111-3000-4000-8000-000000000003', '31111111-3000-4000-8000-000000000001', '21111111-3000-4000-8000-000000000003', 25, 'BOX', NOW());

-- Partial GR for PO-2025-0001
INSERT INTO gr_headers (id, gr_number, po_id, receipt_date, received_by_user_id, status, created_at)
VALUES 
('31111111-1000-4000-8000-000000000002', 'GR-2025-0002', '11111111-1000-4000-8000-000000000001', 
 '2025-01-20', (SELECT id FROM users LIMIT 1), 'posted', NOW());

INSERT INTO gr_lines (id, gr_id, po_line_id, qty_received, uom, created_at)
VALUES 
('41111111-1000-4000-8000-000000000004', '31111111-1000-4000-8000-000000000002', '21111111-1000-4000-8000-000000000001', 10, 'REAM', NOW()),
('41111111-1000-4000-8000-000000000005', '31111111-1000-4000-8000-000000000002', '21111111-1000-4000-8000-000000000002', 5, 'EA', NOW());

-- ================================================================
-- MATCH RESULTS - Link Invoice Lines to PO Lines
-- ================================================================

-- Get invoice IDs for matching
DO $$
DECLARE
    inv_2825 UUID;
    inv_2825_line1 UUID;
    inv_2825_line2 UUID;
    inv_2825_line3 UUID;
BEGIN
    -- Get invoice header
    SELECT id INTO inv_2825 FROM invoice_headers WHERE invoice_number = 'INV-2025-0901-2825';
    
    -- Get invoice line IDs (assuming they exist)
    SELECT id INTO inv_2825_line1 FROM invoice_lines WHERE invoice_id = inv_2825 AND line_no = 1;
    SELECT id INTO inv_2825_line2 FROM invoice_lines WHERE invoice_id = inv_2825 AND line_no = 2;
    SELECT id INTO inv_2825_line3 FROM invoice_lines WHERE invoice_id = inv_2825 AND line_no = 3;
    
    -- Only insert if we have the invoice
    IF inv_2825 IS NOT NULL THEN
        -- Clear existing match results for this invoice
        DELETE FROM match_results WHERE invoice_id = inv_2825;
        
        -- Insert new match results linking to PO lines
        INSERT INTO match_results (
            invoice_id, invoice_line_id, level, rule_applied, 
            matched_po_line_id, matched_gr_line_id,
            qty_variance, price_variance, amount_variance,
            within_tolerance, explanation_code, at
        ) VALUES
        -- Line 1: Perfect match with GR
        (inv_2825, inv_2825_line1, 'line', '3-way', 
         '21111111-3000-4000-8000-000000000001', '41111111-3000-4000-8000-000000000001',
         0, 0, 0, true, 'MATCHED', NOW()),
        
        -- Line 2: Perfect match with GR  
        (inv_2825, inv_2825_line2, 'line', '3-way',
         '21111111-3000-4000-8000-000000000002', '41111111-3000-4000-8000-000000000002',
         0, 0, 0, true, 'MATCHED', NOW()),
         
        -- Line 3: Perfect match with GR
        (inv_2825, inv_2825_line3, 'line', '3-way',
         '21111111-3000-4000-8000-000000000003', '41111111-3000-4000-8000-000000000003',
         0, 0, 0, true, 'MATCHED', NOW());
         
        -- Update invoice to show it's matched
        UPDATE invoice_headers 
        SET match_status = 'matched',
            po_numbers_cached = ARRAY['PO-2025-6929']
        WHERE id = inv_2825;
    END IF;
END $$;

-- Add match results for invoices with variances
DO $$
DECLARE
    inv_prof UUID;
    inv_prof_line1 UUID;
    inv_prof_line2 UUID;
BEGIN
    -- Find an invoice from Professional Consulting Inc
    SELECT id INTO inv_prof FROM invoice_headers 
    WHERE vendor_name_snapshot = 'Professional Consulting Inc' 
    LIMIT 1;
    
    IF inv_prof IS NOT NULL THEN
        -- Get/create invoice lines for this invoice
        SELECT id INTO inv_prof_line1 FROM invoice_lines WHERE invoice_id = inv_prof AND line_no = 1;
        SELECT id INTO inv_prof_line2 FROM invoice_lines WHERE invoice_id = inv_prof AND line_no = 2;
        
        -- If lines don't exist, create them
        IF inv_prof_line1 IS NULL THEN
            INSERT INTO invoice_lines (invoice_id, line_no, description, qty, uom, unit_price, net_amount, line_total)
            VALUES 
            (inv_prof, 1, 'Professional Services - Consulting', 9, 'HRS', 150.00, 1350.00, 1350.00),
            (inv_prof, 2, 'Software License - Annual', 1, 'EA', 2400.00, 2400.00, 2400.00)
            RETURNING id INTO inv_prof_line1;
            
            SELECT id INTO inv_prof_line2 FROM invoice_lines WHERE invoice_id = inv_prof AND line_no = 2;
        END IF;
        
        -- Clear and insert match results with variances
        DELETE FROM match_results WHERE invoice_id = inv_prof;
        
        INSERT INTO match_results (
            invoice_id, invoice_line_id, level, rule_applied,
            matched_po_line_id, qty_variance, price_variance, amount_variance,
            within_tolerance, explanation_code, at
        ) VALUES
        -- Line 1: Quantity and price variance
        (inv_prof, inv_prof_line1, 'line', '2-way-PO',
         '21111111-2000-4000-8000-000000000001', 1, 11.11, 238.89,
         false, 'OVER_TOLERANCE', NOW()),
         
        -- Line 2: Price variance
        (inv_prof, inv_prof_line2, 'line', '2-way-PO',
         '21111111-2000-4000-8000-000000000002', 0, 177.78, 177.78,
         false, 'OVER_TOLERANCE', NOW());
         
        -- Update invoice status
        UPDATE invoice_headers 
        SET match_status = 'exception',
            po_numbers_cached = ARRAY['PO-2025-2956']
        WHERE id = inv_prof;
    END IF;
END $$;

-- Update more invoices with PO associations
UPDATE invoice_headers 
SET po_numbers_cached = ARRAY['PO-2024-' || LPAD(FLOOR(RANDOM() * 9999 + 1)::TEXT, 4, '0')]
WHERE po_numbers_cached IS NULL 
  AND invoice_number LIKE 'INV-2024-%'
  AND RANDOM() < 0.8; -- 80% of invoices have POs