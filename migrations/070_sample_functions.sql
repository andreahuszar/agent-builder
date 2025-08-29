-- 070_sample_functions.sql - Helper SQL functions for matching, approvals, and workflow

-- ================================================================
-- MATCHING FUNCTION
-- ================================================================
-- Performs 2-way/3-way matching for an invoice

CREATE OR REPLACE FUNCTION fn_match_invoice(p_invoice_id UUID)
RETURNS VOID AS $$
DECLARE
    v_line RECORD;
    v_po_line RECORD;
    v_tolerance RECORD;
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
    
    -- Get vendor tolerance profile
    SELECT tp.* INTO v_tolerance
    FROM invoice_headers ih
    JOIN vendors v ON v.id = ih.vendor_id
    LEFT JOIN tolerance_profiles tp ON tp.id = v.tolerance_profile_id
    WHERE ih.id = p_invoice_id;
    
    -- If no tolerance profile, use defaults
    IF v_tolerance IS NULL THEN
        v_tolerance.price_tolerance_pct := 1.0;
        v_tolerance.qty_tolerance_pct := 2.0;
        v_tolerance.amount_tolerance_abs := 50.00;
        v_tolerance.match_rule := '3-way';
    END IF;
    
    -- Process each invoice line
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
-- APPROVAL POLICY EXPANSION FUNCTION
-- ================================================================
-- Creates approval entries based on policies

CREATE OR REPLACE FUNCTION fn_expand_approval_policy(p_invoice_id UUID)
RETURNS VOID AS $$
DECLARE
    v_invoice RECORD;
    v_policy RECORD;
    v_member RECORD;
    v_step INTEGER := 1;
BEGIN
    -- Get invoice details
    SELECT * INTO v_invoice
    FROM invoice_headers
    WHERE id = p_invoice_id;
    
    -- Clear existing approvals for this invoice
    DELETE FROM approvals 
    WHERE doc_type = 'INV' AND doc_id = p_invoice_id;
    
    -- Find applicable approval policies
    FOR v_policy IN
        SELECT ap.*
        FROM approval_policies ap
        WHERE ap.active = TRUE
          AND (ap.vendor_id IS NULL OR ap.vendor_id = v_invoice.vendor_id)
          AND (ap.currency IS NULL OR ap.currency = v_invoice.currency)
          AND (ap.min_amount IS NULL OR v_invoice.total >= ap.min_amount)
          AND (ap.max_amount IS NULL OR v_invoice.total <= ap.max_amount)
          AND (ap.non_po_only = FALSE OR NOT EXISTS (
              SELECT 1 FROM invoice_lines il 
              WHERE il.invoice_id = p_invoice_id 
                AND il.po_line_id IS NOT NULL
          ))
        ORDER BY ap.priority, ap.sequence
    LOOP
        -- Get approver group members
        FOR v_member IN
            SELECT agm.*
            FROM approver_group_members agm
            WHERE agm.group_id = v_policy.approver_group_id
            ORDER BY agm.level
        LOOP
            -- Create approval entry
            INSERT INTO approvals (
                doc_type, doc_id, step, status, assigned_to
            ) VALUES (
                'INV', p_invoice_id, v_step, 'pending', v_member.user_id
            );
            
            v_step := v_step + 1;
        END LOOP;
    END LOOP;
    
    -- If no approvals were created, auto-approve
    IF v_step = 1 THEN
        INSERT INTO approvals (
            doc_type, doc_id, step, status, note, acted_at
        ) VALUES (
            'INV', p_invoice_id, 1, 'approved', 'Auto-approved: No matching policies', NOW()
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- WORK ITEM ENQUEUE FUNCTION
-- ================================================================
-- Creates work items for processing stages

CREATE OR REPLACE FUNCTION fn_enqueue(
    p_stage work_stage,
    p_doc_type doc_type,
    p_doc_id UUID,
    p_priority INTEGER DEFAULT 3
)
RETURNS UUID AS $$
DECLARE
    v_work_item_id UUID;
BEGIN
    -- Check if work item already exists for this stage
    SELECT id INTO v_work_item_id
    FROM work_items
    WHERE doc_type = p_doc_type
      AND doc_id = p_doc_id
      AND stage = p_stage
      AND status IN ('queued', 'in_progress');
    
    -- If not exists, create new work item
    IF v_work_item_id IS NULL THEN
        INSERT INTO work_items (
            doc_type, doc_id, stage, status, priority
        ) VALUES (
            p_doc_type, p_doc_id, p_stage, 'queued', p_priority
        )
        RETURNING id INTO v_work_item_id;
    END IF;
    
    RETURN v_work_item_id;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- INVOICE TOTAL VALIDATION FUNCTION
-- ================================================================
-- Validates that invoice lines sum to header totals

CREATE OR REPLACE FUNCTION fn_validate_invoice_totals(p_invoice_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_calculated_subtotal DECIMAL(18,4);
    v_calculated_tax DECIMAL(18,4);
    v_calculated_total DECIMAL(18,4);
    v_header RECORD;
BEGIN
    -- Get header totals
    SELECT * INTO v_header
    FROM invoice_headers
    WHERE id = p_invoice_id;
    
    -- Calculate totals from lines
    SELECT 
        SUM(net_amount) AS subtotal,
        SUM(COALESCE(tax_amount, 0)) AS tax,
        SUM(line_total) AS total
    INTO v_calculated_subtotal, v_calculated_tax, v_calculated_total
    FROM invoice_lines
    WHERE invoice_id = p_invoice_id;
    
    -- Add header-level charges
    v_calculated_total := v_calculated_total + 
        COALESCE(v_header.shipping_total, 0) +
        COALESCE(v_header.other_charges_total, 0) -
        COALESCE(v_header.discount_total, 0) -
        COALESCE(v_header.withholding_tax_total, 0) +
        COALESCE(v_header.rounding_diff, 0);
    
    -- Check if totals match within rounding tolerance
    RETURN ABS(v_header.total - v_calculated_total) < 0.01;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- GET REMAINING PO QUANTITIES FUNCTION
-- ================================================================
-- Returns remaining quantities for a PO line

CREATE OR REPLACE FUNCTION fn_get_po_line_remaining(p_po_line_id UUID)
RETURNS TABLE (
    qty_remaining_to_receive DECIMAL(18,6),
    qty_remaining_to_invoice DECIMAL(18,6),
    amount_remaining_to_invoice DECIMAL(18,4)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pl.qty_ordered - COALESCE(plr.qty_received_to_date, 0) AS qty_remaining_to_receive,
        pl.qty_ordered - COALESCE(plr.qty_invoiced_to_date, 0) AS qty_remaining_to_invoice,
        (pl.qty_ordered - COALESCE(plr.qty_invoiced_to_date, 0)) * pl.unit_price AS amount_remaining_to_invoice
    FROM po_lines pl
    LEFT JOIN po_line_rollups plr ON plr.po_line_id = pl.id
    WHERE pl.id = p_po_line_id;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- AGENT RUN TRACKING FUNCTION
-- ================================================================
-- Records agent execution for audit

CREATE OR REPLACE FUNCTION fn_record_agent_run(
    p_agent_code VARCHAR(100),
    p_work_item_id UUID,
    p_input_json JSONB,
    p_output_json JSONB DEFAULT NULL,
    p_success BOOLEAN DEFAULT NULL,
    p_error TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_agent_run_id UUID;
BEGIN
    -- Insert agent run record
    INSERT INTO agent_runs (
        agent_code, work_item_id, input_json, output_json,
        started_at, finished_at, success, error
    ) VALUES (
        p_agent_code, p_work_item_id, p_input_json, p_output_json,
        NOW(), 
        CASE WHEN p_success IS NOT NULL THEN NOW() ELSE NULL END,
        p_success, p_error
    )
    RETURNING id INTO v_agent_run_id;
    
    -- Update work item status if success is provided
    IF p_success = TRUE THEN
        UPDATE work_items
        SET status = 'done',
            result_json = p_output_json,
            updated_at = NOW()
        WHERE id = p_work_item_id;
    ELSIF p_success = FALSE THEN
        UPDATE work_items
        SET status = 'blocked',
            updated_at = NOW()
        WHERE id = p_work_item_id;
    END IF;
    
    RETURN v_agent_run_id;
END;
$$ LANGUAGE plpgsql;