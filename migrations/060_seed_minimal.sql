-- 060_seed_minimal.sql - Minimal but realistic seed data

-- Clear existing seed data first
TRUNCATE TABLE 
    agent_runs, work_items, external_refs, approvals, approval_policies, 
    approver_group_members, approver_groups, source_files, audit_events, 
    attachments, match_results, invoice_line_receipts, invoice_line_distributions, 
    invoice_line_taxes, invoice_lines, invoice_headers, ses_lines, ses_headers, 
    gr_lines, gr_headers, po_lines, po_headers, uom_conversions, projects, 
    cost_centers, ship_to_sites, org_entities, tax_rates, items, 
    vendor_bank_accounts, vendors, tolerance_profiles, payment_terms, users 
CASCADE;

-- ================================================================
-- USERS
-- ================================================================
INSERT INTO users (id, name, email) VALUES
    ('11111111-1111-1111-1111-111111111111', 'John Smith', 'john.smith@xelix.com'),
    ('22222222-2222-2222-2222-222222222222', 'Jane Doe', 'jane.doe@xelix.com'),
    ('33333333-3333-3333-3333-333333333333', 'Bob Johnson', 'bob.johnson@xelix.com');

-- ================================================================
-- PAYMENT TERMS
-- ================================================================
INSERT INTO payment_terms (id, name, net_days, discount_percent, discount_days) VALUES
    ('a1111111-1111-1111-1111-111111111111'::UUID, 'Net 30', 30, NULL, NULL),
    ('a2222222-2222-2222-2222-222222222222'::UUID, '2/10 Net 30', 30, 2.0, 10);

-- ================================================================
-- TOLERANCE PROFILES
-- ================================================================
INSERT INTO tolerance_profiles (id, name, price_tolerance_pct, qty_tolerance_pct, amount_tolerance_abs, tax_tolerance_abs, rounding_tolerance_abs, match_rule) VALUES
    ('b1111111-1111-1111-1111-111111111111'::UUID, 'Standard Tolerance', 2.0, 5.0, 100.00, 10.00, 1.00, '3-way'),
    ('b2222222-2222-2222-2222-222222222222'::UUID, 'Strict Tolerance', 0.5, 1.0, 10.00, 1.00, 0.10, '3-way');

-- ================================================================
-- VENDORS
-- ================================================================
INSERT INTO vendors (id, name, tax_id, country_code, default_currency, payment_terms_id, tolerance_profile_id, requires_po, is_blocked_for_payment, active) VALUES
    ('c1111111-1111-1111-1111-111111111111'::UUID, 'Acme Office Supplies', '12-3456789', 'US', 'USD', 'a1111111-1111-1111-1111-111111111111'::UUID, 'b1111111-1111-1111-1111-111111111111'::UUID, true, false, true),
    ('c2222222-2222-2222-2222-222222222222'::UUID, 'Global IT Services', '98-7654321', 'US', 'USD', 'a2222222-2222-2222-2222-222222222222'::UUID, 'b2222222-2222-2222-2222-222222222222'::UUID, true, false, true);

-- ================================================================
-- VENDOR BANK ACCOUNTS
-- ================================================================
INSERT INTO vendor_bank_accounts (id, vendor_id, bank_name, account_number_masked, is_default) VALUES
    ('d1111111-1111-1111-1111-111111111111'::UUID, 'c1111111-1111-1111-1111-111111111111'::UUID, 'First National Bank', '****1234', true),
    ('d2222222-2222-2222-2222-222222222222'::UUID, 'c2222222-2222-2222-2222-222222222222'::UUID, 'Chase Bank', '****5678', true);

-- Update vendors with default bank accounts
UPDATE vendors SET default_bank_account_id = 'd1111111-1111-1111-1111-111111111111'::UUID WHERE id = 'c1111111-1111-1111-1111-111111111111'::UUID;
UPDATE vendors SET default_bank_account_id = 'd2222222-2222-2222-2222-222222222222'::UUID WHERE id = 'c2222222-2222-2222-2222-222222222222'::UUID;

-- ================================================================
-- TAX RATES
-- ================================================================
INSERT INTO tax_rates (id, code, rate_percent, valid_from, valid_to) VALUES
    ('e1111111-1111-1111-1111-111111111111'::UUID, 'US-CA-STATE', 7.25, '2024-01-01', NULL),
    ('e2222222-2222-2222-2222-222222222222'::UUID, 'US-CA-COUNTY', 1.00, '2024-01-01', NULL),
    ('e3333333-3333-3333-3333-333333333333'::UUID, 'TAX-EXEMPT', 0.00, '2024-01-01', NULL);

-- ================================================================
-- ITEMS
-- ================================================================
INSERT INTO items (id, sku, description, uom, active) VALUES
    ('f1111111-1111-1111-1111-111111111111'::UUID, 'LAP-001', 'Dell Laptop Computer', 'EA', true),
    ('f2222222-2222-2222-2222-222222222222'::UUID, 'MON-001', 'Dell 27" Monitor', 'EA', true),
    ('f3333333-3333-3333-3333-333333333333'::UUID, 'SVC-001', 'IT Consulting Services', 'HR', true),
    ('f4444444-4444-4444-4444-444444444444'::UUID, 'PAPER-001', 'Copy Paper A4', 'BX', true);

-- ================================================================
-- UOM CONVERSIONS
-- ================================================================
INSERT INTO uom_conversions (id, item_id, from_uom, to_uom, factor, valid_from, valid_to) VALUES
    ('71111111-1111-1111-1111-111111111111'::UUID, 'f4444444-4444-4444-4444-444444444444'::UUID, 'RM', 'BX', 10.0, '2024-01-01', NULL); -- 1 box = 10 reams

-- ================================================================
-- ORGANIZATION ENTITIES
-- ================================================================
INSERT INTO org_entities (id, legal_name, tax_id, address_lines, default_currency) VALUES
    ('81111111-1111-1111-1111-111111111111'::UUID, 'Xelix Corporation', '11-1111111', 
     '{"line1": "123 Main St", "line2": "Suite 100", "city": "San Francisco", "state": "CA", "zip": "94105", "country": "US"}', 'USD');

-- ================================================================
-- SHIP TO SITES
-- ================================================================
INSERT INTO ship_to_sites (id, org_entity_id, name, address_lines) VALUES
    ('91111111-1111-1111-1111-111111111111'::UUID, '81111111-1111-1111-1111-111111111111'::UUID, 'Main Office',
     '{"line1": "123 Main St", "line2": "Suite 100", "city": "San Francisco", "state": "CA", "zip": "94105", "country": "US"}'),
    ('92222222-2222-2222-2222-222222222222'::UUID, '81111111-1111-1111-1111-111111111111'::UUID, 'Warehouse',
     '{"line1": "456 Industrial Blvd", "city": "Oakland", "state": "CA", "zip": "94607", "country": "US"}');

-- ================================================================
-- PURCHASE ORDERS - GOODS
-- ================================================================
INSERT INTO po_headers (id, po_number, vendor_id, po_type, order_date, currency, bill_to_id, ship_to_id, payment_terms_id, expected_match_rule, status, buyer_user_id) VALUES
    ('11111111-1111-1111-1111-111111111111'::UUID, 'PO-2024-001', 'c1111111-1111-1111-1111-111111111111'::UUID, 'standard', '2024-11-01', 'USD', 
     '81111111-1111-1111-1111-111111111111'::UUID, '91111111-1111-1111-1111-111111111111'::UUID, 'a1111111-1111-1111-1111-111111111111'::UUID, '3-way', 'approved', '11111111-1111-1111-1111-111111111111');

INSERT INTO po_lines (id, po_id, line_no, item_id, description, uom, qty_ordered, unit_price, tax_rate_id, cost_center, gl_account, status, allow_over_receipt_pct, allow_over_invoice_pct) VALUES
    ('21111111-1111-1111-1111-111111111111'::UUID, '11111111-1111-1111-1111-111111111111'::UUID, 1, 'f1111111-1111-1111-1111-111111111111'::UUID, 
     'Dell Laptop Computer', 'EA', 10, 1200.00, 'e1111111-1111-1111-1111-111111111111'::UUID, 'IT-100', '6100', 'open', 10.0, 5.0),
    ('22222222-2222-2222-2222-222222222222'::UUID, '11111111-1111-1111-1111-111111111111'::UUID, 2, 'f2222222-2222-2222-2222-222222222222'::UUID, 
     'Dell 27" Monitor', 'EA', 10, 450.00, 'e1111111-1111-1111-1111-111111111111'::UUID, 'IT-100', '6100', 'open', 10.0, 5.0),
    ('23333333-3333-3333-3333-333333333333'::UUID, '11111111-1111-1111-1111-111111111111'::UUID, 3, 'f4444444-4444-4444-4444-444444444444'::UUID, 
     'Copy Paper A4', 'BX', 50, 35.00, 'e1111111-1111-1111-1111-111111111111'::UUID, 'ADM-200', '6200', 'open', 0.0, 0.0);

-- ================================================================
-- PURCHASE ORDERS - SERVICES
-- ================================================================
INSERT INTO po_headers (id, po_number, vendor_id, po_type, order_date, currency, bill_to_id, ship_to_id, payment_terms_id, expected_match_rule, status, buyer_user_id) VALUES
    ('12222222-2222-2222-2222-222222222222'::UUID, 'PO-2024-002', 'c2222222-2222-2222-2222-222222222222'::UUID, 'service', '2024-11-01', 'USD', 
     '81111111-1111-1111-1111-111111111111'::UUID, '91111111-1111-1111-1111-111111111111'::UUID, 'a2222222-2222-2222-2222-222222222222'::UUID, '3-way', 'approved', '22222222-2222-2222-2222-222222222222');

INSERT INTO po_lines (id, po_id, line_no, item_id, description, uom, qty_ordered, unit_price, tax_rate_id, cost_center, project_code, gl_account, status) VALUES
    ('24444444-4444-4444-4444-444444444444'::UUID, '12222222-2222-2222-2222-222222222222'::UUID, 1, 'f3333333-3333-3333-3333-333333333333'::UUID, 
     'IT Consulting Services - November', 'HR', 160, 150.00, 'e3333333-3333-3333-3333-333333333333'::UUID, 'IT-100', 'PROJ-2024-01', '6300', 'open');

-- ================================================================
-- GOODS RECEIPTS (Partial with rejection)
-- ================================================================
INSERT INTO gr_headers (id, gr_number, po_id, receipt_date, received_by_user_id, status, reference) VALUES
    ('31111111-1111-1111-1111-111111111111'::UUID, 'GR-2024-001', '11111111-1111-1111-1111-111111111111'::UUID, '2024-11-10', 
     '33333333-3333-3333-3333-333333333333', 'posted', 'Delivery Note DN-12345');

INSERT INTO gr_lines (id, gr_id, po_line_id, qty_received, qty_rejected, uom, storage_location, reject_reason_code) VALUES
    ('41111111-1111-1111-1111-111111111111'::UUID, '31111111-1111-1111-1111-111111111111'::UUID, '21111111-1111-1111-1111-111111111111'::UUID, 
     8, 1, 'EA', 'WH-A-01', 'DAMAGED'),
    ('42222222-2222-2222-2222-222222222222'::UUID, '31111111-1111-1111-1111-111111111111'::UUID, '22222222-2222-2222-2222-222222222222'::UUID, 
     10, 0, 'EA', 'WH-A-02', NULL),
    ('43333333-3333-3333-3333-333333333333'::UUID, '31111111-1111-1111-1111-111111111111'::UUID, '23333333-3333-3333-3333-333333333333'::UUID, 
     50, 0, 'BX', 'WH-B-01', NULL);

-- ================================================================
-- SERVICE ENTRY SHEET
-- ================================================================
INSERT INTO ses_headers (id, po_id, service_period_start, service_period_end, approved_by_user_id, status) VALUES
    ('51111111-1111-1111-1111-111111111111'::UUID, '12222222-2222-2222-2222-222222222222'::UUID, '2024-11-01', '2024-11-30', 
     '11111111-1111-1111-1111-111111111111', 'posted');

INSERT INTO ses_lines (id, ses_id, po_line_id, amount_accepted, description) VALUES
    ('61111111-1111-1111-1111-111111111111'::UUID, '51111111-1111-1111-1111-111111111111'::UUID, '24444444-4444-4444-4444-444444444444'::UUID, 
     24000.00, 'IT Consulting Services - November 2024 (160 hours @ $150/hr)');

-- ================================================================
-- INVOICE A - Clean 3-way match
-- ================================================================
INSERT INTO invoice_headers (
    id, type, vendor_id, invoice_number, invoice_date, due_date, currency,
    subtotal, tax_total, total, payment_terms_id, bill_to_id,
    vendor_name_snapshot, vendor_tax_id_snapshot, vendor_address_snapshot,
    status, match_status
) VALUES (
    '71111111-1111-1111-1111-111111111111'::UUID, 'invoice', 'c1111111-1111-1111-1111-111111111111'::UUID, 
    'INV-2024-001', '2024-11-15', '2024-12-15', 'USD',
    12950.00, 1053.38, 14003.38, 'a1111111-1111-1111-1111-111111111111'::UUID, '81111111-1111-1111-1111-111111111111'::UUID,
    'Acme Office Supplies', '12-3456789', '{"line1": "789 Vendor St", "city": "Los Angeles", "state": "CA", "zip": "90001"}',
    'draft', 'not_matched'
);

INSERT INTO invoice_lines (
    id, invoice_id, line_no, description, item_id, uom, qty, unit_price,
    net_amount, tax_rate_id, tax_amount, line_total,
    po_line_id, gr_line_id, normalized_qty, normalized_unit_price
) VALUES
    ('81111111-1111-1111-1111-111111111111'::UUID, '71111111-1111-1111-1111-111111111111'::UUID, 1,
     'Dell Laptop Computer', 'f1111111-1111-1111-1111-111111111111'::UUID, 'EA', 7, 1200.00,
     8400.00, 'e1111111-1111-1111-1111-111111111111'::UUID, 609.00, 9009.00,
     '21111111-1111-1111-1111-111111111111'::UUID, '41111111-1111-1111-1111-111111111111'::UUID, 7, 1200.00),
    ('82222222-2222-2222-2222-222222222222'::UUID, '71111111-1111-1111-1111-111111111111'::UUID, 2,
     'Dell 27" Monitor', 'f2222222-2222-2222-2222-222222222222'::UUID, 'EA', 10, 450.00,
     4500.00, 'e1111111-1111-1111-1111-111111111111'::UUID, 326.25, 4826.25,
     '22222222-2222-2222-2222-222222222222'::UUID, '42222222-2222-2222-2222-222222222222'::UUID, 10, 450.00),
    ('83333333-3333-3333-3333-333333333333'::UUID, '71111111-1111-1111-1111-111111111111'::UUID, 3,
     'Copy Paper A4 - 5 Reams', 'f4444444-4444-4444-4444-444444444444'::UUID, 'RM', 5, 3.50,
     50.00, 'e1111111-1111-1111-1111-111111111111'::UUID, 3.63, 53.63,
     '23333333-3333-3333-3333-333333333333'::UUID, '43333333-3333-3333-3333-333333333333'::UUID, 0.5, 35.00);

-- ================================================================
-- INVOICE B - Within tolerance variance
-- ================================================================
INSERT INTO invoice_headers (
    id, type, vendor_id, invoice_number, invoice_date, due_date, currency,
    subtotal, tax_total, total, payment_terms_id, bill_to_id,
    vendor_name_snapshot, vendor_tax_id_snapshot, vendor_address_snapshot,
    status, match_status
) VALUES (
    '72222222-2222-2222-2222-222222222222'::UUID, 'invoice', 'c2222222-2222-2222-2222-222222222222'::UUID, 
    'INV-2024-002', '2024-11-30', '2024-12-10', 'USD',
    24240.00, 0.00, 24240.00, 'a2222222-2222-2222-2222-222222222222'::UUID, '81111111-1111-1111-1111-111111111111'::UUID,
    'Global IT Services', '98-7654321', '{"line1": "456 Tech Ave", "city": "San Jose", "state": "CA", "zip": "95110"}',
    'draft', 'not_matched'
);

INSERT INTO invoice_lines (
    id, invoice_id, line_no, description, item_id, uom, qty, unit_price,
    net_amount, tax_rate_id, tax_amount, line_total,
    po_line_id, ses_line_id, service_period_start, service_period_end
) VALUES
    ('84444444-4444-4444-4444-444444444444'::UUID, '72222222-2222-2222-2222-222222222222'::UUID, 1,
     'IT Consulting Services - November 2024', 'f3333333-3333-3333-3333-333333333333'::UUID, 'HR', 161, 150.495,
     24240.00, 'e3333333-3333-3333-3333-333333333333'::UUID, 0.00, 24240.00,
     '24444444-4444-4444-4444-444444444444'::UUID, '61111111-1111-1111-1111-111111111111'::UUID, '2024-11-01', '2024-11-30');

-- ================================================================
-- INVOICE C - Exception (quantity exceeds receipts)
-- ================================================================
INSERT INTO invoice_headers (
    id, type, vendor_id, invoice_number, invoice_date, due_date, currency,
    subtotal, tax_total, total, payment_terms_id, bill_to_id,
    vendor_name_snapshot, vendor_tax_id_snapshot, vendor_address_snapshot,
    status, match_status
) VALUES (
    '73333333-3333-3333-3333-333333333333'::UUID, 'invoice', 'c1111111-1111-1111-1111-111111111111'::UUID, 
    'INV-2024-003', '2024-11-20', '2024-12-20', 'USD',
    3600.00, 261.00, 3861.00, 'a1111111-1111-1111-1111-111111111111'::UUID, '81111111-1111-1111-1111-111111111111'::UUID,
    'Acme Office Supplies', '12-3456789', '{"line1": "789 Vendor St", "city": "Los Angeles", "state": "CA", "zip": "90001"}',
    'draft', 'not_matched'
);

INSERT INTO invoice_lines (
    id, invoice_id, line_no, description, item_id, uom, qty, unit_price,
    net_amount, tax_rate_id, tax_amount, line_total,
    po_line_id, normalized_qty, normalized_unit_price
) VALUES
    ('85555555-5555-5555-5555-555555555555'::UUID, '73333333-3333-3333-3333-333333333333'::UUID, 1,
     'Dell Laptop Computer - Additional Units', 'f1111111-1111-1111-1111-111111111111'::UUID, 'EA', 3, 1200.00,
     3600.00, 'e1111111-1111-1111-1111-111111111111'::UUID, 261.00, 3861.00,
     '21111111-1111-1111-1111-111111111111'::UUID, 3, 1200.00);

-- ================================================================
-- APPROVER GROUPS AND MEMBERS
-- ================================================================
INSERT INTO approver_groups (id, name) VALUES
    ('91111111-1111-1111-1111-111111111111'::UUID, 'Finance Approvers'),
    ('92222222-2222-2222-2222-222222222222'::UUID, 'IT Approvers');

INSERT INTO approver_group_members (id, group_id, user_id, level) VALUES
    ('a1111111-1111-1111-1111-111111111111'::UUID, '91111111-1111-1111-1111-111111111111'::UUID, '11111111-1111-1111-1111-111111111111', 1),
    ('a2222222-2222-2222-2222-222222222222'::UUID, '91111111-1111-1111-1111-111111111111'::UUID, '22222222-2222-2222-2222-222222222222', 2);

-- ================================================================
-- APPROVAL POLICIES
-- ================================================================
INSERT INTO approval_policies (
    id, name, priority, active, currency, min_amount, max_amount,
    non_po_only, approver_group_id, sequence
) VALUES
    ('b1111111-1111-1111-1111-111111111111'::UUID, 'Standard Invoice Approval < $10000', 1, true, 'USD', 0.00, 10000.00,
     false, '91111111-1111-1111-1111-111111111111'::UUID, 1),
    ('b2222222-2222-2222-2222-222222222222'::UUID, 'High Value Invoice Approval >= $10000', 2, true, 'USD', 10000.00, NULL,
     false, '91111111-1111-1111-1111-111111111111'::UUID, 1);

-- ================================================================
-- WORK ITEMS (Agent workflow)
-- ================================================================
INSERT INTO work_items (
    id, doc_type, doc_id, stage, status, priority, assigned_to_agent_code
) VALUES
    ('c1111111-1111-1111-1111-111111111111'::UUID, 'INV', '71111111-1111-1111-1111-111111111111'::UUID, 
     'extract_index', 'done', 3, 'EXTRACT_AGENT'),
    ('c2222222-2222-2222-2222-222222222222'::UUID, 'INV', '71111111-1111-1111-1111-111111111111'::UUID, 
     'match', 'queued', 3, 'MATCH_AGENT'),
    ('c3333333-3333-3333-3333-333333333333'::UUID, 'INV', '71111111-1111-1111-1111-111111111111'::UUID, 
     'post', 'queued', 3, NULL);