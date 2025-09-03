-- 113_seed_enhanced_invoices.sql - Enhanced seed data with diverse invoices

-- Clear existing invoice data (preserving master data)
TRUNCATE TABLE 
  invoice_status_history, invoice_validations, validation_runs,
  match_results, invoice_line_receipts, invoice_line_distributions, 
  invoice_line_taxes, invoice_lines, invoice_headers 
CASCADE;

-- ================================================================
-- ENHANCED INVOICE SEED DATA
-- ================================================================

-- 1. Processing Status - New invoice being processed
INSERT INTO invoice_headers (
  id, type, vendor_id, invoice_number, invoice_date, due_date, currency,
  subtotal, tax_total, total, payment_terms_id, bill_to_id, ship_to_id,
  vendor_name_snapshot, vendor_tax_id_snapshot, vendor_address_snapshot,
  status, match_status, helpdesk_ticket_ref, confidence_score, fraud_risk_score,
  processing_started_at, validation_errors, created_at
) VALUES (
  '11100001-1111-1111-1111-111111111111'::UUID, 'invoice', 'c1111111-1111-1111-1111-111111111111'::UUID,
  'INV-2024-0001', '2024-12-01', '2024-12-31', 'USD',
  4500.00, 360.00, 4860.00, 'a1111111-1111-1111-1111-111111111111'::UUID,
  '81111111-1111-1111-1111-111111111111'::UUID, '91111111-1111-1111-1111-111111111111'::UUID,
  'Acme Office Supplies', '12-3456789', '{"line1": "456 Oak Ave", "city": "San Francisco", "state": "CA", "zip": "94102"}'::jsonb,
  'processing', 'not_matched', 'HD-2024-0001', 85.00, 5.00,
  NOW() - INTERVAL '2 hours', '[]'::jsonb, NOW() - INTERVAL '2 hours'
);

-- 2. Processing Status - Currently validating
INSERT INTO invoice_headers (
  id, type, vendor_id, invoice_number, invoice_date, due_date, currency,
  subtotal, tax_total, total, payment_terms_id, bill_to_id, ship_to_id,
  vendor_name_snapshot, vendor_tax_id_snapshot, vendor_address_snapshot,
  status, match_status, helpdesk_ticket_ref, confidence_score, fraud_risk_score,
  processing_started_at, validation_warnings, created_at
) VALUES (
  '11100002-2222-2222-2222-222222222222'::UUID, 'invoice', 'c2222222-2222-2222-2222-222222222222'::UUID,
  'INV-2024-0002', '2024-12-02', '2025-01-01', 'USD',
  15000.00, 1200.00, 16200.00, 'a2222222-2222-2222-2222-222222222222'::UUID,
  '81111111-1111-1111-1111-111111111111'::UUID, '91111111-1111-1111-1111-111111111111'::UUID,
  'Global IT Services', '98-7654321', '{"line1": "789 Tech Blvd", "city": "San Jose", "state": "CA", "zip": "95110"}'::jsonb,
  'validating', 'not_matched', 'HD-2024-0002', 75.00, 10.00,
  NOW() - INTERVAL '1 hour', '[{"field": "amount", "message": "Amount exceeds typical range", "severity": "warning"}]'::jsonb, NOW() - INTERVAL '1 hour'
);

-- 3. Requires Review - Has validation errors
INSERT INTO invoice_headers (
  id, type, vendor_id, invoice_number, invoice_date, due_date, currency,
  subtotal, tax_total, total, payment_terms_id, bill_to_id, ship_to_id,
  vendor_name_snapshot, vendor_tax_id_snapshot, vendor_address_snapshot,
  status, match_status, helpdesk_ticket_ref, confidence_score, fraud_risk_score,
  processing_started_at, processing_completed_at, validation_errors, created_at
) VALUES (
  '11100003-3333-3333-3333-333333333333'::UUID, 'invoice', 'c1111111-1111-1111-1111-111111111111'::UUID,
  'INV-2024-0003', '2024-12-05', '2024-12-04', 'USD', -- Due date before invoice date (error)
  3200.00, 256.00, 3456.00, 'a1111111-1111-1111-1111-111111111111'::UUID,
  '81111111-1111-1111-1111-111111111111'::UUID, '91111111-1111-1111-1111-111111111111'::UUID,
  'Acme Office Supplies', '12-3456789', '{"line1": "456 Oak Ave", "city": "San Francisco", "state": "CA", "zip": "94102"}'::jsonb,
  'requires_review', 'exception', 'HD-2024-0003', 45.00, 25.00,
  NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours 30 minutes',
  '[{"field": "due_date", "message": "Due date is before invoice date", "severity": "error"}, {"field": "tax_total", "message": "Tax calculation appears incorrect", "severity": "error"}]'::jsonb,
  NOW() - INTERVAL '3 hours'
);

-- 4. Requires Review - PO mismatch
INSERT INTO invoice_headers (
  id, type, vendor_id, invoice_number, invoice_date, due_date, currency,
  subtotal, tax_total, total, payment_terms_id, bill_to_id, ship_to_id,
  vendor_name_snapshot, vendor_tax_id_snapshot, vendor_address_snapshot,
  status, match_status, po_numbers_cached, helpdesk_ticket_ref, confidence_score, fraud_risk_score,
  validation_errors, created_at
) VALUES (
  '11100004-4444-4444-4444-444444444444'::UUID, 'invoice', 'c1111111-1111-1111-1111-111111111111'::UUID,
  'INV-2024-0004', '2024-11-28', '2024-12-28', 'USD',
  2800.00, 224.00, 3024.00, 'a1111111-1111-1111-1111-111111111111'::UUID,
  '81111111-1111-1111-1111-111111111111'::UUID, '91111111-1111-1111-1111-111111111111'::UUID,
  'Acme Office Supplies', '12-3456789', '{"line1": "456 Oak Ave", "city": "San Francisco", "state": "CA", "zip": "94102"}'::jsonb,
  'requires_review', 'exception', '{"PO-2024-001"}', 'HD-2024-0004', 55.00, 15.00,
  '[{"field": "total", "message": "Invoice total exceeds PO amount by 12%", "severity": "error"}]'::jsonb,
  NOW() - INTERVAL '4 hours'
);

-- 5. Requires Review - Duplicate invoice suspected
INSERT INTO invoice_headers (
  id, type, vendor_id, invoice_number, invoice_date, due_date, currency,
  subtotal, tax_total, total, payment_terms_id, bill_to_id, ship_to_id,
  vendor_name_snapshot, vendor_tax_id_snapshot, vendor_address_snapshot,
  status, match_status, helpdesk_ticket_ref, confidence_score, fraud_risk_score,
  validation_errors, created_at
) VALUES (
  '11100005-5555-5555-5555-555555555555'::UUID, 'invoice', 'c2222222-2222-2222-2222-222222222222'::UUID,
  'INV-2024-0005', '2024-11-30', '2024-12-30', 'USD',
  16200.00, 1296.00, 17496.00, 'a2222222-2222-2222-2222-222222222222'::UUID,
  '81111111-1111-1111-1111-111111111111'::UUID, '91111111-1111-1111-1111-111111111111'::UUID,
  'Global IT Services', '98-7654321', '{"line1": "789 Tech Blvd", "city": "San Jose", "state": "CA", "zip": "95110"}'::jsonb,
  'requires_review', 'not_matched', 'HD-2024-0005', 35.00, 65.00,
  '[{"field": "invoice_number", "message": "Possible duplicate of INV-2024-0002", "severity": "error"}, {"field": "amount", "message": "Suspicious round number pattern detected", "severity": "warning"}]'::jsonb,
  NOW() - INTERVAL '5 hours'
);

-- 6. Pending Approval - Clean validation, awaiting approval
INSERT INTO invoice_headers (
  id, type, vendor_id, invoice_number, invoice_date, due_date, currency,
  subtotal, tax_total, total, payment_terms_id, bill_to_id, ship_to_id,
  vendor_name_snapshot, vendor_tax_id_snapshot, vendor_address_snapshot,
  status, match_status, approval_status, po_numbers_cached, helpdesk_ticket_ref, 
  confidence_score, fraud_risk_score, created_at
) VALUES (
  '11100006-6666-6666-6666-666666666666'::UUID, 'invoice', 'c1111111-1111-1111-1111-111111111111'::UUID,
  'INV-2024-0006', '2024-11-25', '2024-12-25', 'USD',
  1500.00, 120.00, 1620.00, 'a1111111-1111-1111-1111-111111111111'::UUID,
  '81111111-1111-1111-1111-111111111111'::UUID, '91111111-1111-1111-1111-111111111111'::UUID,
  'Acme Office Supplies', '12-3456789', '{"line1": "456 Oak Ave", "city": "San Francisco", "state": "CA", "zip": "94102"}'::jsonb,
  'pending_approval', 'matched', 'pending', '{"PO-2024-002"}', 'HD-2024-0006',
  92.00, 3.00, NOW() - INTERVAL '6 hours'
);

-- 7. Pending Approval - Requires manager approval
INSERT INTO invoice_headers (
  id, type, vendor_id, invoice_number, invoice_date, due_date, currency,
  subtotal, tax_total, total, payment_terms_id, bill_to_id, ship_to_id,
  vendor_name_snapshot, vendor_tax_id_snapshot, vendor_address_snapshot,
  status, match_status, approval_status, helpdesk_ticket_ref, 
  confidence_score, fraud_risk_score, validation_warnings, created_at
) VALUES (
  '11100007-7777-7777-7777-777777777777'::UUID, 'invoice', 'c2222222-2222-2222-2222-222222222222'::UUID,
  'INV-2024-0007', '2024-11-20', '2024-12-20', 'USD',
  45000.00, 3600.00, 48600.00, 'a2222222-2222-2222-2222-222222222222'::UUID,
  '81111111-1111-1111-1111-111111111111'::UUID, '91111111-1111-1111-1111-111111111111'::UUID,
  'Global IT Services', '98-7654321', '{"line1": "789 Tech Blvd", "city": "San Jose", "state": "CA", "zip": "95110"}'::jsonb,
  'pending_approval', 'within_tolerance', 'escalated', 'HD-2024-0007',
  88.00, 8.00, 
  '[{"field": "total", "message": "Amount requires manager approval", "severity": "info"}]'::jsonb,
  NOW() - INTERVAL '1 day'
);

-- 8. Pending Approval
INSERT INTO invoice_headers (
  id, type, vendor_id, invoice_number, invoice_date, due_date, currency,
  subtotal, tax_total, total, payment_terms_id, bill_to_id, ship_to_id,
  vendor_name_snapshot, vendor_tax_id_snapshot, vendor_address_snapshot,
  status, match_status, approval_status, po_numbers_cached, helpdesk_ticket_ref,
  confidence_score, fraud_risk_score, created_at
) VALUES (
  '11100008-8888-8888-8888-888888888888'::UUID, 'invoice', 'c1111111-1111-1111-1111-111111111111'::UUID,
  'INV-2024-0008', '2024-11-18', '2024-12-18', 'USD',
  6750.00, 540.00, 7290.00, 'a1111111-1111-1111-1111-111111111111'::UUID,
  '81111111-1111-1111-1111-111111111111'::UUID, '91111111-1111-1111-1111-111111111111'::UUID,
  'Acme Office Supplies', '12-3456789', '{"line1": "456 Oak Ave", "city": "San Francisco", "state": "CA", "zip": "94102"}'::jsonb,
  'pending_approval', 'matched', 'in_progress', '{"PO-2024-003"}', 'HD-2024-0008',
  95.00, 2.00, NOW() - INTERVAL '2 days'
);

-- 9. Pending Approval
INSERT INTO invoice_headers (
  id, type, vendor_id, invoice_number, invoice_date, due_date, currency,
  subtotal, tax_total, total, payment_terms_id, bill_to_id, ship_to_id,
  vendor_name_snapshot, vendor_tax_id_snapshot, vendor_address_snapshot,
  status, match_status, approval_status, helpdesk_ticket_ref,
  confidence_score, fraud_risk_score, created_at
) VALUES (
  '11100009-9999-9999-9999-999999999999'::UUID, 'invoice', 'c2222222-2222-2222-2222-222222222222'::UUID,
  'INV-2024-0009', '2024-11-15', '2024-12-15', 'USD',
  12500.00, 1000.00, 13500.00, 'a2222222-2222-2222-2222-222222222222'::UUID,
  '81111111-1111-1111-1111-111111111111'::UUID, '91111111-1111-1111-1111-111111111111'::UUID,
  'Global IT Services', '98-7654321', '{"line1": "789 Tech Blvd", "city": "San Jose", "state": "CA", "zip": "95110"}'::jsonb,
  'pending_approval', 'within_tolerance', 'pending', 'HD-2024-0009',
  90.00, 5.00, NOW() - INTERVAL '3 days'
);

-- 10. Approved Ready for Payment
INSERT INTO invoice_headers (
  id, type, vendor_id, invoice_number, invoice_date, due_date, currency,
  subtotal, tax_total, total, payment_terms_id, bill_to_id, ship_to_id,
  vendor_name_snapshot, vendor_tax_id_snapshot, vendor_address_snapshot,
  status, match_status, approval_status, po_numbers_cached, helpdesk_ticket_ref,
  confidence_score, fraud_risk_score, created_at
) VALUES (
  '11100010-AAAA-AAAA-AAAA-AAAAAAAAAAAA'::UUID, 'invoice', 'c1111111-1111-1111-1111-111111111111'::UUID,
  'INV-2024-0010', '2024-11-10', '2024-12-10', 'USD',
  3500.00, 280.00, 3780.00, 'a1111111-1111-1111-1111-111111111111'::UUID,
  '81111111-1111-1111-1111-111111111111'::UUID, '91111111-1111-1111-1111-111111111111'::UUID,
  'Acme Office Supplies', '12-3456789', '{"line1": "456 Oak Ave", "city": "San Francisco", "state": "CA", "zip": "94102"}'::jsonb,
  'approved_ready_for_payment', 'matched', 'approved', '{"PO-2024-004"}', 'HD-2024-0010',
  98.00, 1.00, NOW() - INTERVAL '5 days'
);

-- 11. Approved Ready for Payment
INSERT INTO invoice_headers (
  id, type, vendor_id, invoice_number, invoice_date, due_date, currency,
  subtotal, tax_total, total, payment_terms_id, bill_to_id, ship_to_id,
  vendor_name_snapshot, vendor_tax_id_snapshot, vendor_address_snapshot,
  status, match_status, approval_status, po_numbers_cached, helpdesk_ticket_ref,
  confidence_score, fraud_risk_score, created_at
) VALUES (
  '11100011-BBBB-BBBB-BBBB-BBBBBBBBBBBB'::UUID, 'invoice', 'c2222222-2222-2222-2222-222222222222'::UUID,
  'INV-2024-0011', '2024-11-08', '2024-12-08', 'USD',
  22000.00, 1760.00, 23760.00, 'a2222222-2222-2222-2222-222222222222'::UUID,
  '81111111-1111-1111-1111-111111111111'::UUID, '91111111-1111-1111-1111-111111111111'::UUID,
  'Global IT Services', '98-7654321', '{"line1": "789 Tech Blvd", "city": "San Jose", "state": "CA", "zip": "95110"}'::jsonb,
  'approved_ready_for_payment', 'matched', 'approved', '{"PO-2024-005"}', 'HD-2024-0011',
  96.00, 2.00, NOW() - INTERVAL '6 days'
);

-- 12. Approved Ready for Payment - Early payment discount available
INSERT INTO invoice_headers (
  id, type, vendor_id, invoice_number, invoice_date, due_date, currency,
  subtotal, tax_total, total, payment_terms_id, bill_to_id, ship_to_id,
  vendor_name_snapshot, vendor_tax_id_snapshot, vendor_address_snapshot,
  status, match_status, approval_status, helpdesk_ticket_ref,
  confidence_score, fraud_risk_score,
  early_pay_discount_offered_percent, early_pay_discount_deadline, created_at
) VALUES (
  '11100012-CCCC-CCCC-CCCC-CCCCCCCCCCCC'::UUID, 'invoice', 'c1111111-1111-1111-1111-111111111111'::UUID,
  'INV-2024-0012', '2024-11-05', '2024-12-05', 'USD',
  8900.00, 712.00, 9612.00, 'a2222222-2222-2222-2222-222222222222'::UUID,
  '81111111-1111-1111-1111-111111111111'::UUID, '91111111-1111-1111-1111-111111111111'::UUID,
  'Acme Office Supplies', '12-3456789', '{"line1": "456 Oak Ave", "city": "San Francisco", "state": "CA", "zip": "94102"}'::jsonb,
  'approved_ready_for_payment', 'matched', 'approved', 'HD-2024-0012',
  99.00, 0.50, 2.00, '2024-11-15', NOW() - INTERVAL '7 days'
);

-- 13. Approved Ready for Payment
INSERT INTO invoice_headers (
  id, type, vendor_id, invoice_number, invoice_date, due_date, currency,
  subtotal, tax_total, total, payment_terms_id, bill_to_id, ship_to_id,
  vendor_name_snapshot, vendor_tax_id_snapshot, vendor_address_snapshot,
  status, match_status, approval_status, po_numbers_cached, helpdesk_ticket_ref,
  confidence_score, fraud_risk_score, created_at
) VALUES (
  '11100013-DDDD-DDDD-DDDD-DDDDDDDDDDDD'::UUID, 'invoice', 'c2222222-2222-2222-2222-222222222222'::UUID,
  'INV-2024-0013', '2024-11-03', '2024-12-03', 'USD',
  31000.00, 2480.00, 33480.00, 'a1111111-1111-1111-1111-111111111111'::UUID,
  '81111111-1111-1111-1111-111111111111'::UUID, '91111111-1111-1111-1111-111111111111'::UUID,
  'Global IT Services', '98-7654321', '{"line1": "789 Tech Blvd", "city": "San Jose", "state": "CA", "zip": "95110"}'::jsonb,
  'approved_ready_for_payment', 'matched', 'approved', '{"PO-2024-006", "PO-2024-007"}', 'HD-2024-0013',
  97.00, 1.50, NOW() - INTERVAL '8 days'
);

-- 14. Approved Ready for Payment
INSERT INTO invoice_headers (
  id, type, vendor_id, invoice_number, invoice_date, due_date, currency,
  subtotal, tax_total, total, payment_terms_id, bill_to_id, ship_to_id,
  vendor_name_snapshot, vendor_tax_id_snapshot, vendor_address_snapshot,
  status, match_status, approval_status, helpdesk_ticket_ref,
  confidence_score, fraud_risk_score, created_at
) VALUES (
  '11100014-EEEE-EEEE-EEEE-EEEEEEEEEEEE'::UUID, 'invoice', 'c1111111-1111-1111-1111-111111111111'::UUID,
  'INV-2024-0014', '2024-11-01', '2024-12-01', 'USD',
  5250.00, 420.00, 5670.00, 'a1111111-1111-1111-1111-111111111111'::UUID,
  '81111111-1111-1111-1111-111111111111'::UUID, '91111111-1111-1111-1111-111111111111'::UUID,
  'Acme Office Supplies', '12-3456789', '{"line1": "456 Oak Ave", "city": "San Francisco", "state": "CA", "zip": "94102"}'::jsonb,
  'approved_ready_for_payment', 'matched', 'approved', 'HD-2024-0014',
  100.00, 0.00, NOW() - INTERVAL '10 days'
);

-- 15. Paid - Completed successfully
INSERT INTO invoice_headers (
  id, type, vendor_id, invoice_number, invoice_date, due_date, currency,
  subtotal, tax_total, total, paid_amount, payment_terms_id, bill_to_id, ship_to_id,
  vendor_name_snapshot, vendor_tax_id_snapshot, vendor_address_snapshot,
  status, match_status, approval_status, po_numbers_cached, helpdesk_ticket_ref,
  confidence_score, fraud_risk_score, created_at
) VALUES (
  '11100015-FFFF-FFFF-FFFF-FFFFFFFFFFFF'::UUID, 'invoice', 'c2222222-2222-2222-2222-222222222222'::UUID,
  'INV-2024-0015', '2024-10-28', '2024-11-28', 'USD',
  18500.00, 1480.00, 19980.00, 19980.00, 'a2222222-2222-2222-2222-222222222222'::UUID,
  '81111111-1111-1111-1111-111111111111'::UUID, '91111111-1111-1111-1111-111111111111'::UUID,
  'Global IT Services', '98-7654321', '{"line1": "789 Tech Blvd", "city": "San Jose", "state": "CA", "zip": "95110"}'::jsonb,
  'paid', 'matched', 'approved', '{"PO-2024-008"}', 'HD-2024-0015',
  100.00, 0.00, NOW() - INTERVAL '15 days'
);

-- 16. Paid - With early payment discount taken
INSERT INTO invoice_headers (
  id, type, vendor_id, invoice_number, invoice_date, due_date, currency,
  subtotal, tax_total, total, paid_amount, payment_terms_id, bill_to_id, ship_to_id,
  vendor_name_snapshot, vendor_tax_id_snapshot, vendor_address_snapshot,
  status, match_status, approval_status, helpdesk_ticket_ref,
  confidence_score, fraud_risk_score,
  early_pay_discount_offered_percent, early_pay_discount_taken_amount, created_at
) VALUES (
  '11100016-1010-1010-1010-101010101010'::UUID, 'invoice', 'c1111111-1111-1111-1111-111111111111'::UUID,
  'INV-2024-0016', '2024-10-25', '2024-11-25', 'USD',
  10000.00, 800.00, 10800.00, 10584.00, 'a2222222-2222-2222-2222-222222222222'::UUID,
  '81111111-1111-1111-1111-111111111111'::UUID, '91111111-1111-1111-1111-111111111111'::UUID,
  'Acme Office Supplies', '12-3456789', '{"line1": "456 Oak Ave", "city": "San Francisco", "state": "CA", "zip": "94102"}'::jsonb,
  'paid', 'matched', 'approved', 'HD-2024-0016',
  100.00, 0.00, 2.00, 216.00, NOW() - INTERVAL '20 days'
);

-- 17. Paid
INSERT INTO invoice_headers (
  id, type, vendor_id, invoice_number, invoice_date, due_date, currency,
  subtotal, tax_total, total, paid_amount, payment_terms_id, bill_to_id, ship_to_id,
  vendor_name_snapshot, vendor_tax_id_snapshot, vendor_address_snapshot,
  status, match_status, approval_status, po_numbers_cached, helpdesk_ticket_ref,
  confidence_score, fraud_risk_score, created_at
) VALUES (
  '11100017-1111-2222-3333-444444444444'::UUID, 'invoice', 'c2222222-2222-2222-2222-222222222222'::UUID,
  'INV-2024-0017', '2024-10-20', '2024-11-20', 'USD',
  42000.00, 3360.00, 45360.00, 45360.00, 'a1111111-1111-1111-1111-111111111111'::UUID,
  '81111111-1111-1111-1111-111111111111'::UUID, '91111111-1111-1111-1111-111111111111'::UUID,
  'Global IT Services', '98-7654321', '{"line1": "789 Tech Blvd", "city": "San Jose", "state": "CA", "zip": "95110"}'::jsonb,
  'paid', 'matched', 'approved', '{"PO-2024-009", "PO-2024-010", "PO-2024-011"}', 'HD-2024-0017',
  100.00, 0.00, NOW() - INTERVAL '25 days'
);

-- 18. On Hold - Vendor issue
INSERT INTO invoice_headers (
  id, type, vendor_id, invoice_number, invoice_date, due_date, currency,
  subtotal, tax_total, total, payment_terms_id, bill_to_id, ship_to_id,
  vendor_name_snapshot, vendor_tax_id_snapshot, vendor_address_snapshot,
  status, match_status, hold_reason, hold_reason_code, helpdesk_ticket_ref,
  confidence_score, fraud_risk_score, validation_errors, created_at
) VALUES (
  '11100018-5555-6666-7777-888888888888'::UUID, 'invoice', 'c1111111-1111-1111-1111-111111111111'::UUID,
  'INV-2024-0018', '2024-11-22', '2024-12-22', 'USD',
  7800.00, 624.00, 8424.00, 'a1111111-1111-1111-1111-111111111111'::UUID,
  '81111111-1111-1111-1111-111111111111'::UUID, '91111111-1111-1111-1111-111111111111'::UUID,
  'Acme Office Supplies', '12-3456789', '{"line1": "456 Oak Ave", "city": "San Francisco", "state": "CA", "zip": "94102"}'::jsonb,
  'on_hold', 'exception', 'Vendor bank account change pending verification', 'VENDOR_CHANGE', 'HD-2024-0018',
  60.00, 35.00,
  '[{"field": "vendor_bank_account", "message": "Bank account changed recently", "severity": "error"}]'::jsonb,
  NOW() - INTERVAL '3 days'
);

-- 19. Credit Memo - Processing
INSERT INTO invoice_headers (
  id, type, vendor_id, invoice_number, invoice_date, due_date, currency,
  subtotal, tax_total, total, payment_terms_id, bill_to_id, ship_to_id,
  vendor_name_snapshot, vendor_tax_id_snapshot, vendor_address_snapshot,
  status, match_status, references_invoice_id, helpdesk_ticket_ref,
  confidence_score, fraud_risk_score, created_at
) VALUES (
  '11100019-9999-AAAA-BBBB-CCCCCCCCCCCC'::UUID, 'credit_memo', 'c2222222-2222-2222-2222-222222222222'::UUID,
  'CM-2024-0001', '2024-12-01', '2024-12-31', 'USD',
  -2000.00, -160.00, -2160.00, 'a2222222-2222-2222-2222-222222222222'::UUID,
  '81111111-1111-1111-1111-111111111111'::UUID, '91111111-1111-1111-1111-111111111111'::UUID,
  'Global IT Services', '98-7654321', '{"line1": "789 Tech Blvd", "city": "San Jose", "state": "CA", "zip": "95110"}'::jsonb,
  'processing', 'not_matched', '11100017-1111-2222-3333-444444444444'::UUID, 'HD-2024-0019',
  85.00, 5.00, NOW() - INTERVAL '30 minutes'
);

-- 20. Processing - Just received
INSERT INTO invoice_headers (
  id, type, vendor_id, invoice_number, invoice_date, due_date, currency,
  subtotal, tax_total, total, payment_terms_id, bill_to_id, ship_to_id,
  vendor_name_snapshot, vendor_tax_id_snapshot, vendor_address_snapshot,
  status, match_status, helpdesk_ticket_ref,
  confidence_score, fraud_risk_score, processing_started_at, created_at
) VALUES (
  '11100020-DDDD-EEEE-FFFF-111111111111'::UUID, 'invoice', 'c1111111-1111-1111-1111-111111111111'::UUID,
  'INV-2024-0020', '2024-12-02', '2025-01-02', 'USD',
  950.00, 76.00, 1026.00, 'a1111111-1111-1111-1111-111111111111'::UUID,
  '81111111-1111-1111-1111-111111111111'::UUID, '91111111-1111-1111-1111-111111111111'::UUID,
  'Acme Office Supplies', '12-3456789', '{"line1": "456 Oak Ave", "city": "San Francisco", "state": "CA", "zip": "94102"}'::jsonb,
  'processing', 'not_matched', 'HD-2024-0020',
  80.00, 10.00, NOW(), NOW()
);

-- ================================================================
-- ADD SAMPLE LINE ITEMS FOR SELECTED INVOICES
-- ================================================================

-- Add lines for invoice INV-2024-0001 (processing)
INSERT INTO invoice_lines (invoice_id, line_no, description, qty, uom, unit_price, net_amount, tax_amount, line_total) VALUES
  ('INV00001-1111-1111-1111-111111111111'::UUID, 1, 'Dell Laptop Computer', 3, 'EA', 1500.00, 4500.00, 360.00, 4860.00);

-- Add lines for invoice INV-2024-0003 (requires_review)
INSERT INTO invoice_lines (invoice_id, line_no, description, qty, uom, unit_price, net_amount, tax_amount, line_total) VALUES
  ('11100003-3333-3333-3333-333333333333'::UUID, 1, 'Office Chairs', 8, 'EA', 400.00, 3200.00, 256.00, 3456.00);

-- Add lines for invoice INV-2024-0006 (pending_approval)
INSERT INTO invoice_lines (invoice_id, line_no, description, qty, uom, unit_price, net_amount, tax_amount, line_total) VALUES
  ('11100006-6666-6666-6666-666666666666'::UUID, 1, 'Copy Paper A4', 10, 'BX', 45.00, 450.00, 36.00, 486.00),
  ('11100006-6666-6666-6666-666666666666'::UUID, 2, 'Printer Toner', 5, 'EA', 210.00, 1050.00, 84.00, 1134.00);

-- Add lines for invoice INV-2024-0010 (approved_ready_for_payment)
INSERT INTO invoice_lines (invoice_id, line_no, description, qty, uom, unit_price, net_amount, tax_amount, line_total) VALUES
  ('11100010-AAAA-AAAA-AAAA-AAAAAAAAAAAA'::UUID, 1, 'Standing Desk', 5, 'EA', 700.00, 3500.00, 280.00, 3780.00);

-- Add lines for invoice INV-2024-0015 (paid)
INSERT INTO invoice_lines (invoice_id, line_no, description, qty, uom, unit_price, net_amount, tax_amount, line_total) VALUES
  ('11100015-FFFF-FFFF-FFFF-FFFFFFFFFFFF'::UUID, 1, 'IT Consulting Services', 100, 'HR', 185.00, 18500.00, 1480.00, 19980.00);

-- ================================================================
-- ADD SAMPLE VALIDATION RESULTS
-- ================================================================

-- Add validation errors for invoice INV-2024-0003
INSERT INTO invoice_validations (
  invoice_id, validation_rule_id, field_name, severity, category,
  is_valid, message, actual_value, expected_value
) VALUES
  ('11100003-3333-3333-3333-333333333333'::UUID, 
   (SELECT id FROM validation_rules WHERE code = 'DATE_CONSISTENCY'),
   'due_date', 'error', 'data_quality', FALSE,
   'Due date (2024-12-04) is before invoice date (2024-12-05)',
   '2024-12-04', '> 2024-12-05'),
  ('11100003-3333-3333-3333-333333333333'::UUID,
   (SELECT id FROM validation_rules WHERE code = 'TAX_CALC'),
   'tax_total', 'error', 'financial', FALSE,
   'Tax calculation appears incorrect. Expected 8% of 3200.00',
   '256.00', '256.00');

-- Add validation warnings for invoice INV-2024-0002
INSERT INTO invoice_validations (
  invoice_id, validation_rule_id, field_name, severity, category,
  is_valid, message, variance_amount
) VALUES
  ('11100002-2222-2222-2222-222222222222'::UUID,
   (SELECT id FROM validation_rules WHERE code = 'BUDGET_IMPACT'),
   'total', 'warning', 'financial', TRUE,
   'Invoice amount exceeds typical range for this vendor',
   1200.00);

-- ================================================================
-- COMMENTS FOR DOCUMENTATION
-- ================================================================

COMMENT ON COLUMN invoice_headers.helpdesk_ticket_ref IS 'Reference to helpdesk ticket for tracking (e.g., HD-2024-0001)';