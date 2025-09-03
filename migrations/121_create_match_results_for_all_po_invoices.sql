-- Create match results for all invoices with POs
-- This ensures proper PO comparison functionality

-- First, get all invoices with POs that don't have match results yet
DO $$
DECLARE
    inv_rec RECORD;
    line_rec RECORD;
    po_rec RECORD;
    po_line_rec RECORD;
BEGIN
    -- Loop through all invoices that have POs
    FOR inv_rec IN 
        SELECT ih.id as invoice_id, ih.po_numbers_cached, ih.vendor_id
        FROM invoice_headers ih
        WHERE ih.po_numbers_cached IS NOT NULL 
        AND array_length(ih.po_numbers_cached, 1) > 0
    LOOP
        -- Get the first PO number
        SELECT ph.id INTO po_rec
        FROM po_headers ph
        WHERE ph.po_number = inv_rec.po_numbers_cached[1]
        LIMIT 1;
        
        IF po_rec.id IS NOT NULL THEN
            -- Loop through invoice lines
            FOR line_rec IN 
                SELECT il.id, il.line_no, il.description, il.qty, il.unit_price, il.net_amount
                FROM invoice_lines il
                WHERE il.invoice_id = inv_rec.invoice_id
                ORDER BY il.line_no
            LOOP
                -- Try to find matching PO line by line number
                SELECT pl.id INTO po_line_rec
                FROM po_lines pl
                WHERE pl.po_id = po_rec.id
                AND pl.line_no = line_rec.line_no
                LIMIT 1;
                
                -- If no match by line number, try by description similarity
                IF po_line_rec.id IS NULL THEN
                    SELECT pl.id INTO po_line_rec
                    FROM po_lines pl
                    WHERE pl.po_id = po_rec.id
                    AND (
                        pl.description ILIKE '%' || SUBSTRING(line_rec.description, 1, 20) || '%'
                        OR line_rec.description ILIKE '%' || SUBSTRING(pl.description, 1, 20) || '%'
                    )
                    LIMIT 1;
                END IF;
                
                -- Create match result if we found a PO line and don't have one already
                IF po_line_rec.id IS NOT NULL THEN
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
                        'LINE',  -- level
                        '2-way',  -- rule_applied
                        po_line_rec.id,
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
                    WHERE pl.id = po_line_rec.id
                    AND NOT EXISTS (
                        SELECT 1 FROM match_results mr
                        WHERE mr.invoice_line_id = line_rec.id
                    );
                END IF;
            END LOOP;
        END IF;
    END LOOP;
END $$;

-- Update invoice match status based on match results
UPDATE invoice_headers ih
SET match_status = CASE
    WHEN EXISTS (
        SELECT 1 FROM match_results mr
        WHERE mr.invoice_id = ih.id
        AND mr.within_tolerance = FALSE
    ) THEN 'not_matched'
    WHEN EXISTS (
        SELECT 1 FROM match_results mr
        WHERE mr.invoice_id = ih.id
        AND mr.within_tolerance = TRUE
    ) THEN 'matched'
    ELSE ih.match_status
END
WHERE ih.po_numbers_cached IS NOT NULL 
AND array_length(ih.po_numbers_cached, 1) > 0;

-- Report on what was created
SELECT 
    ih.invoice_number,
    ih.po_numbers_cached,
    COUNT(mr.id) as match_results_count,
    SUM(CASE WHEN mr.within_tolerance THEN 1 ELSE 0 END) as matched_lines,
    SUM(CASE WHEN NOT mr.within_tolerance THEN 1 ELSE 0 END) as variance_lines
FROM invoice_headers ih
LEFT JOIN match_results mr ON mr.invoice_id = ih.id
WHERE ih.po_numbers_cached IS NOT NULL
GROUP BY ih.id, ih.invoice_number, ih.po_numbers_cached
ORDER BY ih.invoice_number;