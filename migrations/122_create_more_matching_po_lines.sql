-- Create PO lines that match invoice lines for better demonstration
-- This will help show the PO comparison functionality

-- For each invoice with a PO but no match results, create matching PO lines
DO $$
DECLARE
    inv_rec RECORD;
    line_rec RECORD;
    v_po_id UUID;
    line_count INT;
BEGIN
    -- Loop through invoices with POs but few/no match results
    FOR inv_rec IN 
        SELECT DISTINCT ih.id as invoice_id, ih.po_numbers_cached[1] as po_number
        FROM invoice_headers ih
        LEFT JOIN match_results mr ON mr.invoice_id = ih.id
        WHERE ih.po_numbers_cached IS NOT NULL 
        AND array_length(ih.po_numbers_cached, 1) > 0
        GROUP BY ih.id, ih.po_numbers_cached
        HAVING COUNT(mr.id) < 2  -- Invoices with few or no match results
    LOOP
        -- Get the PO header
        SELECT ph.id INTO v_po_id
        FROM po_headers ph
        WHERE ph.po_number = inv_rec.po_number;
        
        IF v_po_id IS NOT NULL THEN
            -- Delete existing PO lines for this PO to start fresh
            DELETE FROM po_lines WHERE po_id = v_po_id;
            
            line_count := 0;
            -- Create matching PO lines for each invoice line
            FOR line_rec IN 
                SELECT il.*
                FROM invoice_lines il
                WHERE il.invoice_id = inv_rec.invoice_id
                ORDER BY il.line_no
            LOOP
                line_count := line_count + 1;
                
                -- Create a PO line that matches (with some having small variances)
                INSERT INTO po_lines (
                    po_id,
                    line_no,
                    description,
                    qty_ordered,
                    qty_received,
                    qty_invoiced,
                    uom,
                    unit_price,
                    status
                ) VALUES (
                    v_po_id,
                    line_rec.line_no,
                    line_rec.description,
                    -- Add small variance to some quantities (30% of lines)
                    CASE WHEN random() < 0.3 
                        THEN line_rec.qty + (random() * 2 - 1)  -- +/- 1
                        ELSE line_rec.qty 
                    END,
                    0,  -- qty_received
                    0,  -- qty_invoiced
                    line_rec.uom,
                    -- Add small variance to some prices (20% of lines)
                    CASE WHEN random() < 0.2 
                        THEN line_rec.unit_price + (random() * 10 - 5)  -- +/- 5
                        ELSE line_rec.unit_price 
                    END,
                    'open'
                );
                
                -- Create match result for this line
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
                    line_rec.id,
                    'LINE',
                    '2-way',
                    pl.id,
                    line_rec.qty - pl.qty_ordered,
                    line_rec.unit_price - pl.unit_price,
                    line_rec.net_amount - (pl.qty_ordered * pl.unit_price),
                    -- Within tolerance if variances are small
                    CASE 
                        WHEN ABS(line_rec.qty - pl.qty_ordered) <= 0.01 
                        AND ABS(line_rec.unit_price - pl.unit_price) <= 0.01 
                        THEN TRUE
                        ELSE FALSE
                    END,
                    CASE 
                        WHEN ABS(line_rec.qty - pl.qty_ordered) > 0.01 THEN 'QTY_VARIANCE'
                        WHEN ABS(line_rec.unit_price - pl.unit_price) > 0.01 THEN 'PRICE_VARIANCE'
                        ELSE 'MATCHED'
                    END
                FROM po_lines pl
                WHERE pl.po_id = v_po_id
                AND pl.line_no = line_rec.line_no
                AND NOT EXISTS (
                    SELECT 1 FROM match_results mr
                    WHERE mr.invoice_line_id = line_rec.id
                );
            END LOOP;
            
            RAISE NOTICE 'Created % PO lines for PO %', line_count, inv_rec.po_number;
        END IF;
    END LOOP;
END $$;

-- Update invoice match status
UPDATE invoice_headers ih
SET match_status = CASE
    WHEN NOT EXISTS (
        SELECT 1 FROM match_results mr
        WHERE mr.invoice_id = ih.id
    ) THEN 'not_matched'
    WHEN EXISTS (
        SELECT 1 FROM match_results mr
        WHERE mr.invoice_id = ih.id
        AND mr.within_tolerance = FALSE
    ) THEN 'exception'
    WHEN NOT EXISTS (
        SELECT 1 FROM match_results mr
        WHERE mr.invoice_id = ih.id
        AND mr.within_tolerance = FALSE
    ) THEN 'matched'
    ELSE ih.match_status
END
WHERE ih.po_numbers_cached IS NOT NULL;

-- Report final status
SELECT 
    ih.invoice_number,
    ih.po_numbers_cached[1] as po_number,
    ih.match_status,
    COUNT(DISTINCT il.id) as invoice_lines,
    COUNT(DISTINCT mr.id) as match_results,
    SUM(CASE WHEN mr.within_tolerance THEN 1 ELSE 0 END) as matched_lines,
    SUM(CASE WHEN NOT mr.within_tolerance THEN 1 ELSE 0 END) as variance_lines
FROM invoice_headers ih
LEFT JOIN invoice_lines il ON il.invoice_id = ih.id
LEFT JOIN match_results mr ON mr.invoice_line_id = il.id
WHERE ih.po_numbers_cached IS NOT NULL
GROUP BY ih.id, ih.invoice_number, ih.po_numbers_cached, ih.match_status
ORDER BY ih.invoice_number;