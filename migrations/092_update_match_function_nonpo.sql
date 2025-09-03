-- 092_update_match_function_nonpo.sql - Update matching function to handle Non-PO vendors

-- ================================================================
-- UPDATE MATCHING FUNCTION FOR NON-PO VENDORS
-- ================================================================

CREATE OR REPLACE FUNCTION fn_match_invoice(p_invoice_id UUID)
RETURNS VOID AS $$
DECLARE
    v_line RECORD;
    v_po_line RECORD;
    v_tolerance RECORD;
    v_vendor RECORD;
    v_qty_received DECIMAL(18,6);
    v_amount_accepted DECIMAL(18,4);
    v_qty_variance DECIMAL(18,6);
    v_price_variance DECIMAL(18,4);
    v_amount_variance DECIMAL(18,4);
    v_within_tolerance BOOLEAN;
    v_explanation_code VARCHAR(100);
    v_overall_status match_status;
    v_exception_count INTEGER := 0;
    v_tolerance_count INTEGER := 0;
BEGIN
    -- Clear existing match results for this invoice
    DELETE FROM match_results WHERE invoice_id = p_invoice_id;
    
    -- Get vendor details including requires_po flag
    SELECT v.* INTO v_vendor
    FROM invoice_headers ih
    JOIN vendors v ON v.id = ih.vendor_id
    WHERE ih.id = p_invoice_id;
    
    -- Check if this is a Non-PO vendor
    IF v_vendor.requires_po = false THEN
        -- For Non-PO vendors, simply mark as non_po and return
        INSERT INTO match_results (
            invoice_id, level, rule_applied,
            within_tolerance, explanation_code
        ) VALUES (
            p_invoice_id, 'HEADER', 'NON_PO',
            true, 'NON_PO_VENDOR'
        );
        
        -- Update invoice header to non_po status
        UPDATE invoice_headers
        SET match_status = 'non_po',
            updated_at = NOW()
        WHERE id = p_invoice_id;
        
        RETURN; -- Exit early for Non-PO vendors
    END IF;
    
    -- Get vendor tolerance profile (for PO vendors)
    SELECT tp.* INTO v_tolerance
    FROM tolerance_profiles tp
    WHERE tp.id = v_vendor.tolerance_profile_id;
    
    -- If no tolerance profile, use defaults
    IF v_tolerance IS NULL THEN
        v_tolerance.price_tolerance_pct := 1.0;
        v_tolerance.qty_tolerance_pct := 2.0;
        v_tolerance.amount_tolerance_abs := 50.00;
        v_tolerance.match_rule := '3-way';
    END IF;
    
    -- Process each invoice line (for PO vendors)
    FOR v_line IN 
        SELECT il.*, ih.vendor_id
        FROM invoice_lines il
        JOIN invoice_headers ih ON ih.id = il.invoice_id
        WHERE il.invoice_id = p_invoice_id
    LOOP
        -- Check if this is a PO line
        IF v_line.po_line_id IS NOT NULL THEN
            -- Get PO line details
            SELECT * INTO v_po_line
            FROM po_lines
            WHERE id = v_line.po_line_id;
            
            -- Calculate variances
            v_qty_variance := COALESCE(v_line.normalized_qty, 0) - v_po_line.qty_ordered;
            v_price_variance := COALESCE(v_line.normalized_unit_price, 0) - v_po_line.unit_price;
            
            -- For 3-way matching with goods
            IF v_line.gr_line_id IS NOT NULL THEN
                -- Get total received quantity
                SELECT SUM(qty_received - COALESCE(qty_rejected, 0))
                INTO v_qty_received
                FROM gr_lines
                WHERE po_line_id = v_line.po_line_id;
                
                v_qty_variance := COALESCE(v_line.normalized_qty, 0) - COALESCE(v_qty_received, 0);
                
                -- Check tolerances
                v_within_tolerance := 
                    ABS(v_qty_variance) <= (v_po_line.qty_ordered * v_tolerance.qty_tolerance_pct / 100) AND
                    ABS(v_price_variance) <= (v_po_line.unit_price * v_tolerance.price_tolerance_pct / 100);
                
                IF v_within_tolerance THEN
                    v_explanation_code := '3WAY_MATCH_OK';
                ELSIF v_qty_variance > 0 THEN
                    v_explanation_code := 'QTY_EXCEEDS_RECEIPT';
                    v_exception_count := v_exception_count + 1;
                ELSE
                    v_explanation_code := 'PRICE_VARIANCE';
                    v_tolerance_count := v_tolerance_count + 1;
                END IF;
                
            -- For 3-way matching with services
            ELSIF v_line.ses_line_id IS NOT NULL THEN
                -- Get accepted service amount
                SELECT amount_accepted
                INTO v_amount_accepted
                FROM ses_lines
                WHERE id = v_line.ses_line_id;
                
                v_amount_variance := v_line.net_amount - COALESCE(v_amount_accepted, 0);
                
                -- Check tolerance
                v_within_tolerance := ABS(v_amount_variance) <= v_tolerance.amount_tolerance_abs;
                
                IF v_within_tolerance THEN
                    v_explanation_code := '3WAY_SERVICE_OK';
                ELSE
                    v_explanation_code := 'SERVICE_AMOUNT_VARIANCE';
                    v_tolerance_count := v_tolerance_count + 1;
                END IF;
                
            -- 2-way PO matching only
            ELSE
                v_within_tolerance := 
                    ABS(v_qty_variance) <= (v_po_line.qty_ordered * v_tolerance.qty_tolerance_pct / 100) AND
                    ABS(v_price_variance) <= (v_po_line.unit_price * v_tolerance.price_tolerance_pct / 100);
                
                IF v_within_tolerance THEN
                    v_explanation_code := '2WAY_PO_MATCH_OK';
                ELSE
                    v_explanation_code := '2WAY_PO_VARIANCE';
                    v_tolerance_count := v_tolerance_count + 1;
                END IF;
            END IF;
            
            -- Insert match result for this line
            INSERT INTO match_results (
                invoice_id, invoice_line_id, level, rule_applied,
                matched_po_line_id, matched_gr_line_id, matched_ses_line_id,
                qty_variance, price_variance, amount_variance,
                within_tolerance, tolerance_profile_id, explanation_code
            ) VALUES (
                p_invoice_id, v_line.id, 'LINE', v_tolerance.match_rule,
                v_line.po_line_id, v_line.gr_line_id, v_line.ses_line_id,
                v_qty_variance, v_price_variance, v_amount_variance,
                v_within_tolerance, v_tolerance.id, v_explanation_code
            );
            
        ELSE
            -- Non-PO line
            INSERT INTO match_results (
                invoice_id, invoice_line_id, level, rule_applied,
                within_tolerance, explanation_code
            ) VALUES (
                p_invoice_id, v_line.id, 'LINE', 'NONE',
                FALSE, 'NON_PO_LINE'
            );
            v_exception_count := v_exception_count + 1;
        END IF;
    END LOOP;
    
    -- Determine overall match status
    IF v_exception_count > 0 THEN
        v_overall_status := 'exception';
        v_explanation_code := 'HAS_EXCEPTIONS';
    ELSIF v_tolerance_count > 0 THEN
        v_overall_status := 'within_tolerance';
        v_explanation_code := 'WITHIN_TOLERANCE';
    ELSE
        v_overall_status := 'matched';
        v_explanation_code := 'ALL_MATCHED';
    END IF;
    
    -- Insert header-level match result
    INSERT INTO match_results (
        invoice_id, level, rule_applied,
        within_tolerance, tolerance_profile_id, explanation_code
    ) VALUES (
        p_invoice_id, 'HEADER', v_tolerance.match_rule,
        (v_exception_count = 0), v_tolerance.id, v_explanation_code
    );
    
    -- Update invoice header match status
    UPDATE invoice_headers
    SET match_status = v_overall_status,
        updated_at = NOW()
    WHERE id = p_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- ADD NON_PO TO MATCH_STATUS ENUM
-- ================================================================

-- Check if 'non_po' value exists in match_status enum, add if not
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'non_po' 
        AND enumtypid = 'match_status'::regtype
    ) THEN
        ALTER TYPE match_status ADD VALUE 'non_po' AFTER 'not_matched';
    END IF;
END $$;