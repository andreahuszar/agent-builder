-- 091_add_electricity_vendor.sql - Add electricity vendor and sample Non-PO invoices

-- ================================================================
-- Add Electricity Vendor (Non-PO)
-- ================================================================

-- Create the electricity vendor with requires_po = false
INSERT INTO vendors (id, name, tax_id, country_code, default_currency, requires_po, active)
VALUES
    ('71111111-5000-4000-8000-000000000005', 'City Power & Electric', 'TAX-33333', 'US', 'USD', false, true)
ON CONFLICT (id) DO UPDATE SET 
    requires_po = false,
    name = EXCLUDED.name;

-- Create vendor bank account
INSERT INTO vendor_bank_accounts (id, vendor_id, bank_name, account_number_masked, is_default) 
VALUES
    ('d3333333-3333-3333-3333-333333333333'::UUID, '71111111-5000-4000-8000-000000000005'::UUID, 'National Bank', '****9876', true)
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- Add Sample Electricity Invoices (Non-PO)
-- ================================================================

-- Insert electricity invoices that don't require PO matching
INSERT INTO invoice_headers (
    id, type, vendor_id, invoice_number, invoice_date, due_date,
    currency, subtotal, tax_total, total, payment_terms_id, 
    bill_to_id, vendor_name_snapshot, vendor_tax_id_snapshot, 
    vendor_address_snapshot, status, match_status,
    assigned_to_user_id
) VALUES
    (
        '91111111-0001-0000-0000-000000000001'::UUID,
        'invoice',
        '71111111-5000-4000-8000-000000000005'::UUID,
        'ELEC-2024-001',
        '2024-01-15',
        '2024-02-15',
        'USD',
        2500.00,
        200.00,
        2700.00,
        'a1111111-1111-1111-1111-111111111111'::UUID,  -- Net 30
        '81111111-1111-1111-1111-111111111111'::UUID,  -- Default bill-to (Xelix Corporation)
        'City Power & Electric',
        'TAX-33333',
        '{"street": "100 Energy Blvd", "city": "San Francisco", "state": "CA", "zip": "94105", "country": "US"}'::jsonb,
        'draft',
        'non_po',  -- Set to non_po status
        (SELECT id FROM users WHERE email = 'alice.johnson@company.com' LIMIT 1)
    ),
    (
        '91111111-0002-0000-0000-000000000002'::UUID,
        'invoice',
        '71111111-5000-4000-8000-000000000005'::UUID,
        'ELEC-2024-002',
        '2024-02-15',
        '2024-03-15',
        'USD',
        2850.00,
        228.00,
        3078.00,
        'a1111111-1111-1111-1111-111111111111'::UUID,
        '81111111-1111-1111-1111-111111111111'::UUID,
        'City Power & Electric',
        'TAX-33333',
        '{"street": "100 Energy Blvd", "city": "San Francisco", "state": "CA", "zip": "94105", "country": "US"}'::jsonb,
        'draft',
        'non_po',
        (SELECT id FROM users WHERE email = 'bob.smith@company.com' LIMIT 1)
    )
ON CONFLICT (id) DO NOTHING;

-- Insert line items for electricity invoices
INSERT INTO invoice_lines (
    id, invoice_id, line_no, description, gl_account,
    normalized_qty, uom, normalized_unit_price, 
    discount_percent, discount_amount, net_amount, line_total
) VALUES
    -- Lines for ELEC-2024-001
    (
        '92111111-0001-0001-0000-000000000001'::UUID,
        '91111111-0001-0000-0000-000000000001'::UUID,
        1,
        'Electricity Usage - January 2024',
        '6200',
        1,
        'MONTH',
        2500.00,
        0,
        0,
        2500.00,
        2700.00
    ),
    -- Lines for ELEC-2024-002
    (
        '92111111-0002-0001-0000-000000000002'::UUID,
        '91111111-0002-0000-0000-000000000002'::UUID,
        1,
        'Electricity Usage - February 2024',
        '6200',
        1,
        'MONTH',
        2850.00,
        0,
        0,
        2850.00,
        3078.00
    )
ON CONFLICT (id) DO NOTHING;

-- Update po_numbers_cached for these invoices (they won't have POs)
UPDATE invoice_headers 
SET po_numbers_cached = NULL
WHERE vendor_id = '71111111-5000-4000-8000-000000000005'::UUID;