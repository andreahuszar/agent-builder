-- pgTAP tests for invoice processing database
-- Requires pgTAP extension to be installed

-- Start transaction for test isolation
BEGIN;

-- Load pgTAP
CREATE EXTENSION IF NOT EXISTS pgtap;

-- Plan the number of tests
SELECT plan(20);

-- ================================================================
-- SCHEMA INTEGRITY TESTS
-- ================================================================

-- Test 1: Check that all required tables exist
SELECT has_table('vendors', 'vendors table exists');
SELECT has_table('invoice_headers', 'invoice_headers table exists');
SELECT has_table('invoice_lines', 'invoice_lines table exists');
SELECT has_table('po_headers', 'po_headers table exists');
SELECT has_table('po_lines', 'po_lines table exists');

-- Test 2: Check foreign key relationships
SELECT has_fk('invoice_lines', 'invoice_lines_invoice_id_fkey', 'invoice_lines has FK to invoice_headers');
SELECT has_fk('invoice_lines', 'invoice_lines_po_line_id_fkey', 'invoice_lines has FK to po_lines');
SELECT has_fk('po_lines', 'po_lines_po_id_fkey', 'po_lines has FK to po_headers');

-- Test 3: Check unique constraints
SELECT has_unique('invoice_headers', ARRAY['vendor_id', 'invoice_number'], 'invoice_headers has unique (vendor_id, invoice_number)');
SELECT has_unique('po_headers', ARRAY['po_number'], 'po_headers has unique po_number');

-- ================================================================
-- CONSTRAINT VALIDATION TESTS
-- ================================================================

-- Test 4: Check that invoice line can't have both GR and SES
PREPARE insert_invalid_line AS 
    INSERT INTO invoice_lines (
        invoice_id, line_no, description, net_amount, line_total,
        gr_line_id, ses_line_id
    ) VALUES (
        'p1111111-1111-1111-1111-111111111111', 999, 'Invalid', 100, 100,
        'm1111111-1111-1111-1111-111111111111', 'o1111111-1111-1111-1111-111111111111'
    );

SELECT throws_ok(
    'insert_invalid_line',
    '23514',
    'new row for relation "invoice_lines" violates check constraint "invoice_lines_check"',
    'Cannot set both gr_line_id and ses_line_id'
);

-- Test 5: Check enum values work
SELECT enum_has('po_status', ARRAY['draft', 'approved', 'closed', 'canceled'], 'po_status has correct values');
SELECT enum_has('invoice_status', ARRAY['draft', 'approved', 'posted', 'paid', 'void'], 'invoice_status has correct values');

-- ================================================================
-- VIEW TESTS
-- ================================================================

-- Test 6: Check po_line_rollups view calculates correctly
SELECT results_eq(
    'SELECT qty_received_to_date FROM po_line_rollups WHERE po_line_id = ''k1111111-1111-1111-1111-111111111111''',
    'SELECT CAST(7 AS DECIMAL(18,6))',
    'po_line_rollups calculates received quantity correctly (8 received - 1 rejected = 7)'
);

-- Test 7: Check po_line_rollups invoice quantity
SELECT results_eq(
    'SELECT qty_invoiced_to_date FROM po_line_rollups WHERE po_line_id = ''k1111111-1111-1111-1111-111111111111''',
    'SELECT CAST(10 AS DECIMAL(18,6))',
    'po_line_rollups calculates invoiced quantity correctly'
);

-- ================================================================
-- FUNCTION TESTS
-- ================================================================

-- Test 8: Test fn_match_invoice for clean match (Invoice A)
SELECT lives_ok(
    'SELECT fn_match_invoice(''p1111111-1111-1111-1111-111111111111'')',
    'fn_match_invoice executes for Invoice A'
);

-- Test 9: Check match status after matching Invoice A
SELECT results_eq(
    'SELECT match_status FROM invoice_headers WHERE id = ''p1111111-1111-1111-1111-111111111111''',
    'SELECT ''matched''::match_status',
    'Invoice A has matched status after fn_match_invoice'
);

-- Test 10: Test fn_match_invoice for tolerance case (Invoice B)
SELECT lives_ok(
    'SELECT fn_match_invoice(''p2222222-2222-2222-2222-222222222222'')',
    'fn_match_invoice executes for Invoice B'
);

-- Test 11: Check match status for Invoice B
SELECT results_eq(
    'SELECT match_status FROM invoice_headers WHERE id = ''p2222222-2222-2222-2222-222222222222''',
    'SELECT ''within_tolerance''::match_status',
    'Invoice B has within_tolerance status'
);

-- Test 12: Test fn_match_invoice for exception case (Invoice C)
SELECT lives_ok(
    'SELECT fn_match_invoice(''p3333333-3333-3333-3333-333333333333'')',
    'fn_match_invoice executes for Invoice C'
);

-- Test 13: Check match status for Invoice C
SELECT results_eq(
    'SELECT match_status FROM invoice_headers WHERE id = ''p3333333-3333-3333-3333-333333333333''',
    'SELECT ''exception''::match_status',
    'Invoice C has exception status (qty exceeds receipts)'
);

-- ================================================================
-- TRIGGER TESTS
-- ================================================================

-- Test 14: Test updated_at trigger
UPDATE vendors SET name = 'Updated Vendor Name' WHERE id = 'c1111111-1111-1111-1111-111111111111';
SELECT ok(
    (SELECT updated_at > created_at FROM vendors WHERE id = 'c1111111-1111-1111-1111-111111111111'),
    'updated_at trigger works on vendors table'
);

-- Test 15: Test po_numbers_cached maintenance
-- This should already be populated from seed data
SELECT results_eq(
    'SELECT po_numbers_cached FROM invoice_headers WHERE id = ''p1111111-1111-1111-1111-111111111111''',
    'SELECT ARRAY[''PO-2024-001'']::TEXT[]',
    'po_numbers_cached is maintained correctly'
);

-- ================================================================
-- BUSINESS LOGIC TESTS
-- ================================================================

-- Test 16: Check that distributions sum to line amount
SELECT ok(
    (SELECT COUNT(*) = 0 FROM (
        SELECT il.id
        FROM invoice_lines il
        LEFT JOIN (
            SELECT invoice_line_id, SUM(amount) as dist_total
            FROM invoice_line_distributions
            GROUP BY invoice_line_id
        ) d ON d.invoice_line_id = il.id
        WHERE d.dist_total IS NOT NULL 
          AND ABS(il.net_amount - d.dist_total) > 0.01
    ) AS mismatched),
    'All invoice line distributions sum to net_amount'
);

-- Test 17: Check approval policy expansion
SELECT lives_ok(
    'SELECT fn_expand_approval_policy(''p1111111-1111-1111-1111-111111111111'')',
    'fn_expand_approval_policy executes successfully'
);

-- Test 18: Check approvals were created
SELECT ok(
    (SELECT COUNT(*) > 0 FROM approvals WHERE doc_type = 'INV' AND doc_id = 'p1111111-1111-1111-1111-111111111111'),
    'Approvals created for invoice'
);

-- Test 19: Test work item enqueue
SELECT ok(
    fn_enqueue('match', 'INV', 'p1111111-1111-1111-1111-111111111111') IS NOT NULL,
    'fn_enqueue returns work item ID'
);

-- Test 20: Check work queue view
SELECT ok(
    (SELECT COUNT(*) > 0 FROM work_queue WHERE doc_type = 'INV'),
    'Work queue view returns results'
);

-- Finish tests
SELECT * FROM finish();

-- Rollback to keep test data clean
ROLLBACK;