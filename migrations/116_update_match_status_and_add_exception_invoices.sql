-- Update existing match_status values to be more meaningful
-- Replace 'not_matched' with 'exception' and ensure we only have 'matched', 'exception', or 'within_tolerance'

-- First update any 'not_matched' to 'exception'
UPDATE invoice_headers 
SET match_status = 'exception'
WHERE match_status = 'not_matched';

-- Run matching function on all invoices to get proper status
SELECT fn_match_invoice(id) FROM invoice_headers;

-- Add more diverse invoices with various exceptions
-- These will have different types of issues for demonstration

-- Invoice with price variance (over tolerance)
INSERT INTO invoice_headers (
  id, invoice_number, vendor_id, vendor_name_snapshot, vendor_tax_id_snapshot,
  vendor_address_snapshot, invoice_date, due_date, currency, subtotal, tax_total, total,
  status, match_status, payment_terms_id, terms_text, helpdesk_ticket_ref,
  po_numbers_cached, validation_errors, validation_warnings
) VALUES (
  '11100021-aaaa-bbbb-cccc-dddddddddddd',
  'INV-2024-0021',
  'v0000001-0000-0000-0000-000000000001',
  'Premium Tech Solutions',
  '98-7654321',
  '{"line1": "789 Innovation Way", "city": "Austin", "state": "TX", "zip": "78701"}',
  '2024-12-15',
  '2025-01-15',
  'USD',
  12500.00,
  1125.00,
  13625.00,
  'requires_review',
  'exception',
  'a1111111-1111-1111-1111-111111111111',
  'Net 30',
  'HD-2024-0021',
  ARRAY['PO-2024-0021'],
  '[{"field": "unit_price", "message": "Price variance exceeds 10% tolerance", "severity": "error"}]'::jsonb,
  '[]'::jsonb
) ON CONFLICT (id) DO UPDATE SET 
  match_status = 'exception',
  validation_errors = '[{"field": "unit_price", "message": "Price variance exceeds 10% tolerance", "severity": "error"}]'::jsonb;

-- Invoice with quantity variance
INSERT INTO invoice_headers (
  id, invoice_number, vendor_id, vendor_name_snapshot, vendor_tax_id_snapshot,
  vendor_address_snapshot, invoice_date, due_date, currency, subtotal, tax_total, total,
  status, match_status, payment_terms_id, terms_text, helpdesk_ticket_ref,
  po_numbers_cached, validation_errors
) VALUES (
  '11100022-bbbb-cccc-dddd-eeeeeeeeeeee',
  'INV-2024-0022',
  'v0000001-0000-0000-0000-000000000002',
  'Manufacturing Plus Inc',
  '45-6789012',
  '{"line1": "321 Factory Blvd", "city": "Detroit", "state": "MI", "zip": "48201"}',
  '2024-12-16',
  '2025-01-16',
  'USD',
  45000.00,
  3600.00,
  48600.00,
  'requires_review',
  'exception',
  'a1111111-1111-1111-1111-111111111111',
  'Net 30',
  'HD-2024-0022',
  ARRAY['PO-2024-0022'],
  '[{"field": "quantity", "message": "Quantity received (150) exceeds PO quantity (100) by 50%", "severity": "error"}]'::jsonb
) ON CONFLICT (id) DO UPDATE SET 
  match_status = 'exception',
  validation_errors = '[{"field": "quantity", "message": "Quantity received (150) exceeds PO quantity (100) by 50%", "severity": "error"}]'::jsonb;

-- Invoice missing PO completely
INSERT INTO invoice_headers (
  id, invoice_number, vendor_id, vendor_name_snapshot, vendor_tax_id_snapshot,
  vendor_address_snapshot, invoice_date, due_date, currency, subtotal, tax_total, total,
  status, match_status, payment_terms_id, terms_text, helpdesk_ticket_ref,
  validation_errors
) VALUES (
  '11100023-cccc-dddd-eeee-ffffffffffff',
  'INV-2024-0023',
  'v0000001-0000-0000-0000-000000000003',
  'Emergency Supplies Corp',
  '67-8901234',
  '{"line1": "555 Urgent Ave", "city": "Phoenix", "state": "AZ", "zip": "85001"}',
  '2024-12-17',
  '2025-01-17',
  'USD',
  8900.00,
  712.00,
  9612.00,
  'requires_review',
  'exception',
  'a1111111-1111-1111-1111-111111111111',
  'Net 15 - Urgent',
  'HD-2024-0023',
  '[{"field": "po_number", "message": "No purchase order found for this invoice", "severity": "error"}]'::jsonb
) ON CONFLICT (id) DO UPDATE SET 
  match_status = 'exception',
  validation_errors = '[{"field": "po_number", "message": "No purchase order found for this invoice", "severity": "error"}]'::jsonb;

-- Invoice with duplicate submission
INSERT INTO invoice_headers (
  id, invoice_number, vendor_id, vendor_name_snapshot, vendor_tax_id_snapshot,
  vendor_address_snapshot, invoice_date, due_date, currency, subtotal, tax_total, total,
  status, match_status, payment_terms_id, terms_text, helpdesk_ticket_ref,
  validation_errors, validation_warnings
) VALUES (
  '11100024-dddd-eeee-ffff-111111111111',
  'INV-2024-0024',
  'v0000001-0000-0000-0000-000000000001',
  'Premium Tech Solutions',
  '98-7654321',
  '{"line1": "789 Innovation Way", "city": "Austin", "state": "TX", "zip": "78701"}',
  '2024-12-18',
  '2025-01-18',
  'USD',
  12500.00,
  1125.00,
  13625.00,
  'on_hold',
  'exception',
  'a1111111-1111-1111-1111-111111111111',
  'Net 30',
  'HD-2024-0024',
  ARRAY['PO-2024-0021'],
  '[{"field": "invoice_number", "message": "Potential duplicate invoice detected", "severity": "error"}]'::jsonb,
  '[{"field": "amount", "message": "Same amount as INV-2024-0021", "severity": "warning"}]'::jsonb
) ON CONFLICT (id) DO UPDATE SET 
  match_status = 'exception',
  validation_errors = '[{"field": "invoice_number", "message": "Potential duplicate invoice detected", "severity": "error"}]'::jsonb;

-- Invoice with tax calculation error
INSERT INTO invoice_headers (
  id, invoice_number, vendor_id, vendor_name_snapshot, vendor_tax_id_snapshot,
  vendor_address_snapshot, invoice_date, due_date, currency, subtotal, tax_total, total,
  status, match_status, payment_terms_id, terms_text, helpdesk_ticket_ref,
  validation_errors
) VALUES (
  '11100025-eeee-ffff-1111-222222222222',
  'INV-2024-0025',
  'v0000001-0000-0000-0000-000000000004',
  'Regional Distributors LLC',
  '34-5678901',
  '{"line1": "999 Commerce St", "city": "Dallas", "state": "TX", "zip": "75201"}',
  '2024-12-19',
  '2025-01-19',
  'USD',
  15000.00,
  2000.00,  -- Should be 1200 at 8% tax
  17000.00,
  'requires_review',
  'exception',
  'a1111111-1111-1111-1111-111111111111',
  'Net 30',
  'HD-2024-0025',
  ARRAY['PO-2024-0025'],
  '[{"field": "tax_total", "message": "Tax calculation error: Expected $1,200.00 but got $2,000.00", "severity": "error"}]'::jsonb
) ON CONFLICT (id) DO UPDATE SET 
  match_status = 'exception',
  validation_errors = '[{"field": "tax_total", "message": "Tax calculation error: Expected $1,200.00 but got $2,000.00", "severity": "error"}]'::jsonb;

-- Invoice missing goods receipt (3-way match failure)
INSERT INTO invoice_headers (
  id, invoice_number, vendor_id, vendor_name_snapshot, vendor_tax_id_snapshot,
  vendor_address_snapshot, invoice_date, due_date, currency, subtotal, tax_total, total,
  status, match_status, payment_terms_id, terms_text, helpdesk_ticket_ref,
  po_numbers_cached, validation_errors
) VALUES (
  '11100026-ffff-1111-2222-333333333333',
  'INV-2024-0026',
  'v0000001-0000-0000-0000-000000000005',
  'Logistics Express International',
  '56-7890123',
  '{"line1": "777 Shipping Lane", "city": "Memphis", "state": "TN", "zip": "38103"}',
  '2024-12-20',
  '2025-01-20',
  'USD',
  32000.00,
  2560.00,
  34560.00,
  'requires_review',
  'exception',
  'a1111111-1111-1111-1111-111111111111',
  'Net 45',
  'HD-2024-0026',
  ARRAY['PO-2024-0026'],
  '[{"field": "goods_receipt", "message": "No goods receipt found - 3-way match incomplete", "severity": "error"}]'::jsonb
) ON CONFLICT (id) DO UPDATE SET 
  match_status = 'exception',
  validation_errors = '[{"field": "goods_receipt", "message": "No goods receipt found - 3-way match incomplete", "severity": "error"}]'::jsonb;

-- Invoice with past due date
INSERT INTO invoice_headers (
  id, invoice_number, vendor_id, vendor_name_snapshot, vendor_tax_id_snapshot,
  vendor_address_snapshot, invoice_date, due_date, currency, subtotal, tax_total, total,
  status, match_status, payment_terms_id, terms_text, helpdesk_ticket_ref,
  validation_warnings
) VALUES (
  '11100027-1111-2222-3333-444444444444',
  'INV-2024-0027',
  'v0000001-0000-0000-0000-000000000006',
  'Quick Services Co',
  '78-9012345',
  '{"line1": "444 Fast Lane", "city": "Chicago", "state": "IL", "zip": "60601"}',
  '2024-11-01',
  '2024-12-01',  -- Past due
  'USD',
  5500.00,
  440.00,
  5940.00,
  'pending_approval',
  'within_tolerance',
  'a1111111-1111-1111-1111-111111111111',
  'Net 30',
  'HD-2024-0027',
  '[{"field": "due_date", "message": "Invoice is 30+ days past due", "severity": "warning"}]'::jsonb
) ON CONFLICT (id) DO UPDATE SET 
  match_status = 'within_tolerance',
  validation_warnings = '[{"field": "due_date", "message": "Invoice is 30+ days past due", "severity": "warning"}]'::jsonb;

-- Successfully matched invoice (no issues)
INSERT INTO invoice_headers (
  id, invoice_number, vendor_id, vendor_name_snapshot, vendor_tax_id_snapshot,
  vendor_address_snapshot, invoice_date, due_date, currency, subtotal, tax_total, total,
  status, match_status, payment_terms_id, terms_text, helpdesk_ticket_ref,
  po_numbers_cached
) VALUES (
  '11100028-2222-3333-4444-555555555555',
  'INV-2024-0028',
  'v0000001-0000-0000-0000-000000000007',
  'Perfect Match Suppliers',
  '89-0123456',
  '{"line1": "111 Ideal Street", "city": "Seattle", "state": "WA", "zip": "98101"}',
  '2024-12-21',
  '2025-01-21',
  'USD',
  10000.00,
  800.00,
  10800.00,
  'approved_ready_for_payment',
  'matched',
  'a1111111-1111-1111-1111-111111111111',
  'Net 30',
  'HD-2024-0028',
  ARRAY['PO-2024-0028']
) ON CONFLICT (id) DO UPDATE SET 
  match_status = 'matched';

-- Add line items for the new invoices
-- Lines for INV-2024-0021 (price variance)
INSERT INTO invoice_lines (id, invoice_id, line_no, description, qty, uom, unit_price, net_amount, line_total)
VALUES 
  ('11111050-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11100021-aaaa-bbbb-cccc-dddddddddddd', 1, 'Server Hardware - Overpriced', 5, 'EA', 2500.00, 12500.00, 12500.00)
ON CONFLICT (id) DO NOTHING;

-- Lines for INV-2024-0022 (quantity variance)
INSERT INTO invoice_lines (id, invoice_id, line_no, description, qty, uom, unit_price, net_amount, line_total)
VALUES 
  ('11111051-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11100022-bbbb-cccc-dddd-eeeeeeeeeeee', 1, 'Industrial Components - Over delivered', 150, 'EA', 300.00, 45000.00, 45000.00)
ON CONFLICT (id) DO NOTHING;

-- Lines for INV-2024-0023 (missing PO)
INSERT INTO invoice_lines (id, invoice_id, line_no, description, qty, uom, unit_price, net_amount, line_total)
VALUES 
  ('11111052-cccc-cccc-cccc-cccccccccccc', '11100023-cccc-dddd-eeee-ffffffffffff', 1, 'Emergency Equipment - No PO', 10, 'EA', 890.00, 8900.00, 8900.00)
ON CONFLICT (id) DO NOTHING;

-- Lines for INV-2024-0025 (tax error)
INSERT INTO invoice_lines (id, invoice_id, line_no, description, qty, uom, unit_price, net_amount, line_total)
VALUES 
  ('11111053-dddd-dddd-dddd-dddddddddddd', '11100025-eeee-ffff-1111-222222222222', 1, 'Distribution Services', 100, 'HRS', 150.00, 15000.00, 15000.00)
ON CONFLICT (id) DO NOTHING;

-- Lines for INV-2024-0026 (missing GR)
INSERT INTO invoice_lines (id, invoice_id, line_no, description, qty, uom, unit_price, net_amount, line_total)
VALUES 
  ('11111054-eeee-eeee-eeee-eeeeeeeeeeee', '11100026-ffff-1111-2222-333333333333', 1, 'International Freight - No Receipt', 1, 'LOT', 32000.00, 32000.00, 32000.00)
ON CONFLICT (id) DO NOTHING;

-- Lines for INV-2024-0028 (perfect match)
INSERT INTO invoice_lines (id, invoice_id, line_no, description, qty, uom, unit_price, net_amount, line_total)
VALUES 
  ('11111055-ffff-ffff-ffff-ffffffffffff', '11100028-2222-3333-4444-555555555555', 1, 'Standard Supplies', 100, 'EA', 100.00, 10000.00, 10000.00)
ON CONFLICT (id) DO NOTHING;