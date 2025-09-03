-- Create POs for invoices that have po_numbers_cached but no actual PO records
-- This will fix the issue where invoices reference POs that don't exist

-- First check which POs are missing
SELECT DISTINCT
    ih.invoice_number,
    ih.po_numbers_cached[1] as po_number,
    ph.id as existing_po_id
FROM invoice_headers ih
LEFT JOIN po_headers ph ON ph.po_number = ih.po_numbers_cached[1]
WHERE ih.po_numbers_cached IS NOT NULL 
AND array_length(ih.po_numbers_cached, 1) > 0
AND ph.id IS NULL;

-- Create missing PO headers
INSERT INTO po_headers (
    po_number,
    vendor_id,
    po_type,
    order_date,
    status,
    currency,
    expected_match_rule,
    bill_to_id,
    ship_to_id,
    payment_terms_id
)
SELECT DISTINCT
    ih.po_numbers_cached[1],
    ih.vendor_id,
    'standard'::po_type,
    ih.invoice_date - INTERVAL '30 days',
    'approved'::po_status,
    ih.currency,
    '2-way-PO'::match_rule,
    COALESCE((SELECT id FROM org_entities LIMIT 1), '81111111-1111-1111-1111-111111111111'::uuid),
    COALESCE((SELECT id FROM ship_to_sites LIMIT 1), '91111111-1111-1111-1111-111111111111'::uuid),
    (SELECT id FROM payment_terms WHERE name = 'Net 30' LIMIT 1)
FROM invoice_headers ih
LEFT JOIN po_headers ph ON ph.po_number = ih.po_numbers_cached[1]
WHERE ih.po_numbers_cached IS NOT NULL 
AND array_length(ih.po_numbers_cached, 1) > 0
AND ph.id IS NULL;

-- Create PO lines for these new POs matching invoice lines
DO $$
DECLARE
    inv_rec RECORD;
    line_rec RECORD;
    v_po_id UUID;
BEGIN
    -- Loop through invoices that now have POs
    FOR inv_rec IN 
        SELECT ih.id as invoice_id, ih.po_numbers_cached[1] as po_number
        FROM invoice_headers ih
        JOIN po_headers ph ON ph.po_number = ih.po_numbers_cached[1]
        LEFT JOIN po_lines pl ON pl.po_id = ph.id
        WHERE ih.po_numbers_cached IS NOT NULL 
        AND ph.id IS NOT NULL
        GROUP BY ih.id, ih.po_numbers_cached, ph.id
        HAVING COUNT(pl.id) = 0  -- POs with no lines
    LOOP
        -- Get the PO header
        SELECT ph.id INTO v_po_id
        FROM po_headers ph
        WHERE ph.po_number = inv_rec.po_number;
        
        IF v_po_id IS NOT NULL THEN
            -- Create matching PO lines for each invoice line
            FOR line_rec IN 
                SELECT il.*
                FROM invoice_lines il
                WHERE il.invoice_id = inv_rec.invoice_id
                ORDER BY il.line_no
            LOOP
                -- Create a PO line that mostly matches (80% perfect match, 20% with small variances)
                INSERT INTO po_lines (
                    po_id,
                    line_no,
                    description,
                    qty_ordered,
                    uom,
                    unit_price,
                    tax_rate_id,
                    status
                ) VALUES (
                    v_po_id,
                    line_rec.line_no,
                    line_rec.description,
                    -- 80% perfect match, 20% with small variance
                    CASE WHEN random() < 0.8 
                        THEN line_rec.qty 
                        ELSE line_rec.qty + (random() * 2 - 1)::numeric(18,6)
                    END,
                    line_rec.uom,
                    -- 90% perfect match, 10% with small variance
                    CASE WHEN random() < 0.9 
                        THEN line_rec.unit_price 
                        ELSE line_rec.unit_price + (random() * 10 - 5)::numeric(18,4)
                    END,
                    (SELECT id FROM tax_rates WHERE rate = 0.08 LIMIT 1),
                    'open'
                );
            END LOOP;
            
            -- Create match results for these new lines
            INSERT INTO match_results (
                invoice_id,
                invoice_line_id,
                level,
                rule_applied,
                matched_po_line_id,
                qty_variance,
                price_variance,
                amount_variance,
                within_tolerance,
                explanation_code
            )
            SELECT
                inv_rec.invoice_id,
                il.id,
                'LINE',
                '2-way',
                pl.id,
                il.qty - pl.qty_ordered,
                il.unit_price - pl.unit_price,
                il.net_amount - (pl.qty_ordered * pl.unit_price),
                CASE 
                    WHEN ABS(il.qty - pl.qty_ordered) <= 0.01 
                    AND ABS(il.unit_price - pl.unit_price) <= 0.01 
                    THEN TRUE
                    ELSE FALSE
                END,
                CASE 
                    WHEN ABS(il.qty - pl.qty_ordered) > 0.01 THEN 'QTY_VARIANCE'
                    WHEN ABS(il.unit_price - pl.unit_price) > 0.01 THEN 'PRICE_VARIANCE'
                    ELSE 'MATCHED'
                END
            FROM invoice_lines il
            JOIN po_lines pl ON pl.po_id = v_po_id AND pl.line_no = il.line_no
            WHERE il.invoice_id = inv_rec.invoice_id
            AND NOT EXISTS (
                SELECT 1 FROM match_results mr
                WHERE mr.invoice_line_id = il.id
            );
        END IF;
    END LOOP;
END $$;

-- Update invoice match status
UPDATE invoice_headers ih
SET match_status = CASE
    WHEN NOT EXISTS (
        SELECT 1 FROM match_results mr
        WHERE mr.invoice_id = ih.id
    ) THEN 'not_matched'::match_status
    WHEN EXISTS (
        SELECT 1 FROM match_results mr
        WHERE mr.invoice_id = ih.id
        AND mr.within_tolerance = FALSE
    ) THEN 'exception'::match_status
    ELSE 'matched'::match_status
END
WHERE ih.po_numbers_cached IS NOT NULL;

-- Final report
SELECT 
    COUNT(DISTINCT ih.id) as invoices_with_pos,
    COUNT(DISTINCT ph.id) as actual_pos,
    COUNT(DISTINCT CASE WHEN ih.match_status = 'matched' THEN ih.id END) as fully_matched,
    COUNT(DISTINCT CASE WHEN ih.match_status = 'exception' THEN ih.id END) as with_variances,
    COUNT(DISTINCT CASE WHEN ih.match_status = 'not_matched' THEN ih.id END) as not_matched
FROM invoice_headers ih
LEFT JOIN po_headers ph ON ph.po_number = ih.po_numbers_cached[1]
WHERE ih.po_numbers_cached IS NOT NULL;