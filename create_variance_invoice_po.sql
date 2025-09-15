-- Create Invoice INV-2025-0002 with PO-2025-0002 that has >5% variance
-- This demonstrates exception handling when variance exceeds tolerance

BEGIN;

-- 1. Create PO-2025-0002 
INSERT INTO po_headers (
    id,
    po_number,
    vendor_id,
    po_type,
    order_date,
    currency,
    bill_to_id,
    ship_to_id,
    payment_terms_id,
    status,
    subtotal,
    tax_total,
    total,
    created_at,
    updated_at
) VALUES (
    '32025002-2222-2222-2222-222222222222',
    'PO-2025-0002',
    '12025001-1111-1111-1111-111111111111', -- Same vendor as PO-2025-0001
    'standard',
    '2025-01-11',
    'USD',
    '81111111-1111-1111-1111-111111111111', -- Same bill_to as PO-2025-0001
    '91111111-1111-1111-1111-111111111111', -- Same ship_to as PO-2025-0001
    'a1111111-1111-1111-1111-111111111111', -- Same payment_terms as PO-2025-0001
    'approved',
    5850.00,  -- subtotal
    424.13,   -- tax (7.25%)
    6274.13,  -- total
    NOW(),
    NOW()
);

-- 2. Create PO line items (services, no GR required)
INSERT INTO po_lines (
    id,
    po_id,
    line_no,
    description,
    uom,
    qty_ordered,
    unit_price,
    tax_rate_id,
    status,
    created_at,
    updated_at
) VALUES 
(
    '42025002-1111-2222-3333-444444444444',
    '32025002-2222-2222-2222-222222222222',
    1,
    'Consulting Services - Business Analysis and System Design',
    'Hours',
    15,
    150.00,  -- PO price: $150/hour
    'e1111111-1111-1111-1111-111111111111', -- Same tax rate as PO-2025-0001
    'open',
    NOW(),
    NOW()
),
(
    '42025002-2222-3333-4444-555555555555',
    '32025002-2222-2222-2222-222222222222',
    2,
    'Training Services - End User Training and Documentation',
    'Hours',
    8,
    200.00,
    'e1111111-1111-1111-1111-111111111111',
    'open',
    NOW(),
    NOW()
),
(
    '42025002-3333-4444-5555-666666666666',
    '32025002-2222-2222-2222-222222222222',
    3,
    'Documentation Services - Technical Documentation and User Guides',
    'Hours',
    20,
    100.00,
    'e1111111-1111-1111-1111-111111111111',
    'open',
    NOW(),
    NOW()
);

-- 3. Create Invoice INV-2025-0002 with price discrepancy
INSERT INTO invoice_headers (
    id,
    type,
    invoice_number,
    vendor_id,
    po_id,
    po_numbers_cached,
    status,
    invoice_date,
    due_date,
    currency,
    payment_terms_id,
    bill_to_id,
    ship_to_id,
    subtotal,
    tax_total,
    total,
    vendor_name_snapshot,
    vendor_tax_id_snapshot,
    vendor_address_snapshot,
    bill_to_snapshot,
    created_at,
    updated_at
) VALUES (
    '52025002-2222-2222-2222-222222222222',
    'invoice',
    'INV-2025-0002',
    '12025001-1111-1111-1111-111111111111', -- Same vendor as INV-2025-0001
    '32025002-2222-2222-2222-222222222222',
    ARRAY['PO-2025-0002'],
    'requires_review',  -- Status for invoice with variance
    '2025-01-12',
    '2025-02-11',
    'USD',
    'a1111111-1111-1111-1111-111111111111', -- Same payment_terms_id as INV-2025-0001
    '81111111-1111-1111-1111-111111111111', -- Same bill_to_id as INV-2025-0001
    '91111111-1111-1111-1111-111111111111', -- Same ship_to_id as INV-2025-0001
    6225.00,  -- Higher subtotal due to price increase
    451.31,   -- tax
    6676.31,  -- total (6.4% variance from PO)
    'TechPro Solutions Inc.',
    '45-6789012',  -- Same tax ID as vendor
    '{"line1": "123 Main Street", "line2": "Suite 500", "city": "San Francisco", "state": "CA", "zip": "94105", "country": "USA"}',
    '{"company": {"name": "Acme Corporation", "address": {"line1": "456 Tech Park", "city": "San Jose", "state": "CA", "zip": "95110", "country": "USA"}}}',
    NOW(),
    NOW()
);

-- 4. Create Invoice line items with price discrepancy
INSERT INTO invoice_lines (
    id,
    invoice_id,
    po_line_id,
    line_no,
    description,
    qty,
    unit_price,
    net_amount,
    tax_amount,
    line_total,
    uom,
    created_at,
    updated_at
) VALUES 
(
    '62025002-1111-2222-3333-444444444444',
    '52025002-2222-2222-2222-222222222222',
    '42025002-1111-2222-3333-444444444444',
    1,
    'Consulting Services - Business Analysis and System Design',
    15,
    175.00,  -- Invoice price: $175/hour (vs $150 in PO)
    2625.00,
    190.31,
    2625.00,  -- line_total without tax
    'Hours',
    NOW(),
    NOW()
),
(
    '62025002-2222-3333-4444-555555555555',
    '52025002-2222-2222-2222-222222222222',
    '42025002-2222-3333-4444-555555555555',
    2,
    'Training Services - End User Training and Documentation',
    8,
    200.00,  -- Matches PO price
    1600.00,
    116.00,
    1600.00,
    'Hours',
    NOW(),
    NOW()
),
(
    '62025002-3333-4444-5555-666666666666',
    '52025002-2222-2222-2222-222222222222',
    '42025002-3333-4444-5555-666666666666',
    3,
    'Documentation Services - Technical Documentation and User Guides',
    20,
    100.00,  -- Matches PO price
    2000.00,
    145.00,
    2000.00,
    'Hours',
    NOW(),
    NOW()
);

-- 5. Create match results showing variance
INSERT INTO match_results (
    id,
    invoice_id,
    level,
    rule_applied,
    invoice_line_id,
    matched_po_line_id,
    qty_variance,
    price_variance,
    amount_variance,
    within_tolerance,
    explanation_code,
    at
) VALUES
-- Line level matches
(
    '72025002-1111-2222-3333-444444444444',
    '52025002-2222-2222-2222-222222222222',
    'line',
    '2-way',  -- Rule applied (PO-Invoice)
    '62025002-1111-2222-3333-444444444444',
    '42025002-1111-2222-3333-444444444444',
    0.00,      -- No qty variance
    25.00,     -- Price variance: $175 - $150 = $25
    375.00,    -- Amount variance: 15 * $25 = $375
    false,     -- Not within tolerance (16.7% price variance)
    'PRICE_MISMATCH',
    NOW()
),
(
    '72025002-2222-3333-4444-555555555555',
    '52025002-2222-2222-2222-222222222222',
    'line',
    '2-way',
    '62025002-2222-3333-4444-555555555555',
    '42025002-2222-3333-4444-555555555555',
    0.00,
    0.00,
    0.00,
    true,      -- Within tolerance (perfect match)
    'MATCHED',
    NOW()
),
(
    '72025002-3333-4444-5555-666666666666',
    '52025002-2222-2222-2222-222222222222',
    'line',
    '2-way',
    '62025002-3333-4444-5555-666666666666',
    '42025002-3333-4444-5555-666666666666',
    0.00,
    0.00,
    0.00,
    true,      -- Within tolerance (perfect match)
    'MATCHED',
    NOW()
),
-- Header level match
(
    '72025002-4444-5555-6666-777777777777',
    '52025002-2222-2222-2222-222222222222',
    'header',
    '2-way',
    NULL,
    NULL,
    0.00,
    0.00,
    402.18,    -- Total variance: $6676.31 - $6274.13
    false,     -- Not within tolerance (6.4% variance)
    'TOTAL_VARIANCE_EXCEEDED',
    NOW()
);

COMMIT;

-- Verify the data
SELECT 
    'PO Total' as doc_type,
    po_number,
    total
FROM po_headers 
WHERE id = '32025002-2222-2222-2222-222222222222'
UNION ALL
SELECT 
    'Invoice Total' as doc_type,
    invoice_number,
    total
FROM invoice_headers 
WHERE id = '52025002-2222-2222-2222-222222222222';

-- Show variance calculation
SELECT 
    ih.invoice_number,
    ih.total as invoice_total,
    ph.total as po_total,
    ih.total - ph.total as variance_amount,
    ROUND(((ih.total - ph.total) / ph.total * 100), 2) as variance_percent
FROM invoice_headers ih
JOIN po_headers ph ON ih.po_id = ph.id
WHERE ih.id = '52025002-2222-2222-2222-222222222222';