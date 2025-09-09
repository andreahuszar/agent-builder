-- Restore Original Invoice Database
-- This script creates the exact invoice data that should be in the database

-- Clear any existing invoice data first
TRUNCATE TABLE 
  invoice_status_history, invoice_validations, validation_runs,
  match_results, invoice_line_receipts, invoice_line_distributions, 
  invoice_line_taxes, invoice_lines, invoice_headers 
CASCADE;

-- Restore the original 10 invoices with proper data
INSERT INTO invoice_headers (
  id, type, vendor_id, invoice_number, invoice_date, due_date, currency,
  subtotal, tax_total, total, payment_terms_id, bill_to_id,
  vendor_name_snapshot, vendor_tax_id_snapshot, vendor_address_snapshot,
  status, match_status, created_at, created_by
) VALUES 
  ('11100001-1111-1111-1111-111111111111'::UUID, 'invoice', 'c1111111-1111-1111-1111-111111111111'::UUID,
   'INV-2024-0001', '2025-08-01', '2025-08-31', 'USD',
   4500.00, 360.00, 4860.00, 'a1111111-1111-1111-1111-111111111111'::UUID,
   '81111111-1111-1111-1111-111111111111'::UUID,
   'Acme Office Supplies', '12-3456789', '{"line1": "456 Oak Ave", "city": "San Francisco", "state": "CA", "zip": "94102"}'::jsonb,
   'processing', 'not_matched', NOW() - INTERVAL '2 hours', '11111111-1111-1111-1111-111111111111'::UUID),
   
  ('11100002-2222-2222-2222-222222222222'::UUID, 'invoice', 'c2222222-2222-2222-2222-222222222222'::UUID,
   'INV-2024-0002', '2025-08-02', '2025-09-01', 'USD',
   15000.00, 1200.00, 16200.00, 'a1111111-1111-1111-1111-111111111111'::UUID,
   '81111111-1111-1111-1111-111111111111'::UUID,
   'Global IT Services', '98-7654321', '{"line1": "789 Tech Blvd", "city": "San Jose", "state": "CA", "zip": "95110"}'::jsonb,
   'processing', 'not_matched', NOW() - INTERVAL '1 hour', '11111111-1111-1111-1111-111111111111'::UUID),
   
  ('11100003-3333-3333-3333-333333333333'::UUID, 'invoice', 'c1111111-1111-1111-1111-111111111111'::UUID,
   'INV-2024-0003', '2025-08-05', '2025-09-04', 'USD',
   3200.00, 256.00, 3456.00, 'a1111111-1111-1111-1111-111111111111'::UUID,
   '81111111-1111-1111-1111-111111111111'::UUID,
   'Acme Office Supplies', '12-3456789', '{"line1": "456 Oak Ave", "city": "San Francisco", "state": "CA", "zip": "94102"}'::jsonb,
   'processing', 'exception', NOW() - INTERVAL '45 minutes', '11111111-1111-1111-1111-111111111111'::UUID),
   
  ('11100004-4444-4444-4444-444444444444'::UUID, 'invoice', 'c1111111-1111-1111-1111-111111111111'::UUID,
   'INV-2024-0004', '2025-07-28', '2025-08-28', 'USD',
   2800.00, 224.00, 3024.00, 'a1111111-1111-1111-1111-111111111111'::UUID,
   '81111111-1111-1111-1111-111111111111'::UUID,
   'Acme Office Supplies', '12-3456789', '{"line1": "456 Oak Ave", "city": "San Francisco", "state": "CA", "zip": "94102"}'::jsonb,
   'processing', 'matched', NOW() - INTERVAL '30 minutes', '11111111-1111-1111-1111-111111111111'::UUID),
   
  ('11100005-5555-5555-5555-555555555555'::UUID, 'invoice', 'c2222222-2222-2222-2222-222222222222'::UUID,
   'INV-2024-0005', '2025-07-30', '2025-08-30', 'USD',
   16200.00, 1296.00, 17496.00, 'a1111111-1111-1111-1111-111111111111'::UUID,
   '81111111-1111-1111-1111-111111111111'::UUID,
   'Global IT Services', '98-7654321', '{"line1": "789 Tech Blvd", "city": "San Jose", "state": "CA", "zip": "95110"}'::jsonb,
   'processing', 'within_tolerance', NOW() - INTERVAL '15 minutes', '11111111-1111-1111-1111-111111111111'::UUID),
   
  ('11100006-6666-6666-6666-666666666666'::UUID, 'invoice', 'c1111111-1111-1111-1111-111111111111'::UUID,
   'INV-2024-0006', '2025-07-25', '2025-08-25', 'USD',
   1500.00, 120.00, 1620.00, 'a1111111-1111-1111-1111-111111111111'::UUID,
   '81111111-1111-1111-1111-111111111111'::UUID,
   'Acme Office Supplies', '12-3456789', '{"line1": "456 Oak Ave", "city": "San Francisco", "state": "CA", "zip": "94102"}'::jsonb,
   'approved', 'matched', NOW() - INTERVAL '5 days', '11111111-1111-1111-1111-111111111111'::UUID),
   
  ('11100007-7777-7777-7777-777777777777'::UUID, 'invoice', 'c2222222-2222-2222-2222-222222222222'::UUID,
   'INV-2024-0007', '2025-07-20', '2025-08-20', 'USD',
   45000.00, 3600.00, 48600.00, 'a1111111-1111-1111-1111-111111111111'::UUID,
   '81111111-1111-1111-1111-111111111111'::UUID,
   'Global IT Services', '98-7654321', '{"line1": "789 Tech Blvd", "city": "San Jose", "state": "CA", "zip": "95110"}'::jsonb,
   'approved', 'matched', NOW() - INTERVAL '7 days', '11111111-1111-1111-1111-111111111111'::UUID),
   
  ('11100008-8888-8888-8888-888888888888'::UUID, 'invoice', 'c1111111-1111-1111-1111-111111111111'::UUID,
   'INV-2024-0008', '2025-07-15', '2025-08-15', 'USD',
   6750.00, 540.00, 7290.00, 'a1111111-1111-1111-1111-111111111111'::UUID,
   '81111111-1111-1111-1111-111111111111'::UUID,
   'Acme Office Supplies', '12-3456789', '{"line1": "456 Oak Ave", "city": "San Francisco", "state": "CA", "zip": "94102"}'::jsonb,
   'approved', 'matched', NOW() - INTERVAL '10 days', '11111111-1111-1111-1111-111111111111'::UUID),
   
  ('11100009-9999-9999-9999-999999999999'::UUID, 'invoice', 'c2222222-2222-2222-2222-222222222222'::UUID,
   'INV-2024-0009', '2025-07-10', '2025-08-10', 'USD',
   12500.00, 1000.00, 13500.00, 'a1111111-1111-1111-1111-111111111111'::UUID,
   '81111111-1111-1111-1111-111111111111'::UUID,
   'Global IT Services', '98-7654321', '{"line1": "789 Tech Blvd", "city": "San Jose", "state": "CA", "zip": "95110"}'::jsonb,
   'approved', 'matched', NOW() - INTERVAL '12 days', '11111111-1111-1111-1111-111111111111'::UUID),
   
  ('11100010-1010-1010-1010-101010101010'::UUID, 'invoice', 'c1111111-1111-1111-1111-111111111111'::UUID,
   'INV-2024-0010', '2025-07-05', '2025-08-05', 'USD',
   3500.00, 280.00, 3780.00, 'a1111111-1111-1111-1111-111111111111'::UUID,
   '81111111-1111-1111-1111-111111111111'::UUID,
   'Acme Office Supplies', '12-3456789', '{"line1": "456 Oak Ave", "city": "San Francisco", "state": "CA", "zip": "94102"}'::jsonb,
   'draft', 'not_matched', NOW() - INTERVAL '15 days', '11111111-1111-1111-1111-111111111111'::UUID);

-- Add line items for each invoice
INSERT INTO invoice_lines (id, invoice_id, line_no, description, qty, uom, unit_price, net_amount, line_total)
VALUES
  -- INV-2024-0001 lines
  (gen_random_uuid(), '11100001-1111-1111-1111-111111111111'::UUID, 1, 'Office Chairs (Ergonomic)', 10, 'EA', 250.00, 2500.00, 2500.00),
  (gen_random_uuid(), '11100001-1111-1111-1111-111111111111'::UUID, 2, 'Standing Desks', 5, 'EA', 400.00, 2000.00, 2000.00),
  
  -- INV-2024-0002 lines
  (gen_random_uuid(), '11100002-2222-2222-2222-222222222222'::UUID, 1, 'Cloud Infrastructure Setup', 1, 'SVC', 10000.00, 10000.00, 10000.00),
  (gen_random_uuid(), '11100002-2222-2222-2222-222222222222'::UUID, 2, 'Security Audit Services', 1, 'SVC', 3000.00, 3000.00, 3000.00),
  (gen_random_uuid(), '11100002-2222-2222-2222-222222222222'::UUID, 3, 'Monthly Support', 2, 'MO', 1000.00, 2000.00, 2000.00),
  
  -- INV-2024-0003 lines
  (gen_random_uuid(), '11100003-3333-3333-3333-333333333333'::UUID, 1, 'Printer Paper (Case)', 20, 'CS', 35.00, 700.00, 700.00),
  (gen_random_uuid(), '11100003-3333-3333-3333-333333333333'::UUID, 2, 'Toner Cartridges', 8, 'EA', 150.00, 1200.00, 1200.00),
  (gen_random_uuid(), '11100003-3333-3333-3333-333333333333'::UUID, 3, 'Office Supplies Bundle', 1, 'LOT', 1300.00, 1300.00, 1300.00),
  
  -- INV-2024-0004 lines
  (gen_random_uuid(), '11100004-4444-4444-4444-444444444444'::UUID, 1, 'Laptop Stands', 20, 'EA', 75.00, 1500.00, 1500.00),
  (gen_random_uuid(), '11100004-4444-4444-4444-444444444444'::UUID, 2, 'USB-C Hubs', 20, 'EA', 65.00, 1300.00, 1300.00),
  
  -- INV-2024-0005 lines
  (gen_random_uuid(), '11100005-5555-5555-5555-555555555555'::UUID, 1, 'Enterprise Software License', 1, 'YR', 12000.00, 12000.00, 12000.00),
  (gen_random_uuid(), '11100005-5555-5555-5555-555555555555'::UUID, 2, 'Implementation Services', 1, 'SVC', 4200.00, 4200.00, 4200.00),
  
  -- INV-2024-0006 lines
  (gen_random_uuid(), '11100006-6666-6666-6666-666666666666'::UUID, 1, 'Desk Organizers', 30, 'EA', 25.00, 750.00, 750.00),
  (gen_random_uuid(), '11100006-6666-6666-6666-666666666666'::UUID, 2, 'Monitor Arms', 15, 'EA', 50.00, 750.00, 750.00),
  
  -- INV-2024-0007 lines
  (gen_random_uuid(), '11100007-7777-7777-7777-777777777777'::UUID, 1, 'Data Center Migration', 1, 'PRJ', 30000.00, 30000.00, 30000.00),
  (gen_random_uuid(), '11100007-7777-7777-7777-777777777777'::UUID, 2, 'Disaster Recovery Setup', 1, 'SVC', 10000.00, 10000.00, 10000.00),
  (gen_random_uuid(), '11100007-7777-7777-7777-777777777777'::UUID, 3, 'Training Services', 5, 'DAY', 1000.00, 5000.00, 5000.00),
  
  -- INV-2024-0008 lines
  (gen_random_uuid(), '11100008-8888-8888-8888-888888888888'::UUID, 1, 'Conference Room Equipment', 1, 'SET', 4500.00, 4500.00, 4500.00),
  (gen_random_uuid(), '11100008-8888-8888-8888-888888888888'::UUID, 2, 'Whiteboards', 5, 'EA', 450.00, 2250.00, 2250.00),
  
  -- INV-2024-0009 lines
  (gen_random_uuid(), '11100009-9999-9999-9999-999999999999'::UUID, 1, 'Network Security Assessment', 1, 'SVC', 7500.00, 7500.00, 7500.00),
  (gen_random_uuid(), '11100009-9999-9999-9999-999999999999'::UUID, 2, 'Firewall Configuration', 1, 'SVC', 3000.00, 3000.00, 3000.00),
  (gen_random_uuid(), '11100009-9999-9999-9999-999999999999'::UUID, 3, 'Monthly Monitoring', 2, 'MO', 1000.00, 2000.00, 2000.00),
  
  -- INV-2024-0010 lines
  (gen_random_uuid(), '11100010-1010-1010-1010-101010101010'::UUID, 1, 'Office Renovation Materials', 1, 'LOT', 2500.00, 2500.00, 2500.00),
  (gen_random_uuid(), '11100010-1010-1010-1010-101010101010'::UUID, 2, 'Safety Equipment', 1, 'SET', 1000.00, 1000.00, 1000.00);

-- Update gr_numbers_cached to empty arrays where null
UPDATE invoice_headers SET gr_numbers_cached = '{}' WHERE gr_numbers_cached IS NULL;