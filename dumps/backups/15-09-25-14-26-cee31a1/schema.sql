--
-- PostgreSQL database dump
--

\restrict hT7Xok8nYWyyuk4ughjwjNC06erKYbrApFPhS4zTW3O3DUSvSnSuEPzxFjwGAWR

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: approval_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.approval_status AS ENUM (
    'not_required',
    'pending',
    'in_progress',
    'approved',
    'rejected',
    'escalated'
);


--
-- Name: doc_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.doc_type AS ENUM (
    'PO',
    'GR',
    'INV',
    'SES'
);


--
-- Name: gr_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.gr_status AS ENUM (
    'posted',
    'reversed'
);


--
-- Name: hold_reason_code; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.hold_reason_code AS ENUM (
    'MATCH',
    'POLICY',
    'COMPLIANCE',
    'VENDOR_CHANGE',
    'TAX'
);


--
-- Name: invoice_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.invoice_status AS ENUM (
    'draft',
    'processing',
    'validating',
    'requires_review',
    'in_approval',
    'pending_approval',
    'approved',
    'ready_for_payment',
    'approved_ready_for_payment',
    'posted',
    'paid',
    'void',
    'on_hold'
);


--
-- Name: invoice_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.invoice_type AS ENUM (
    'invoice',
    'credit_memo',
    'debit_memo'
);


--
-- Name: match_rule; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.match_rule AS ENUM (
    '2-way-PO',
    '2-way-GR',
    '3-way'
);


--
-- Name: match_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.match_status AS ENUM (
    'not_matched',
    'non_po',
    'matched',
    'within_tolerance',
    'exception'
);


--
-- Name: po_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.po_status AS ENUM (
    'draft',
    'approved',
    'closed',
    'canceled'
);


--
-- Name: po_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.po_type AS ENUM (
    'standard',
    'blanket',
    'service',
    'release'
);


--
-- Name: tax_treatment_code; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tax_treatment_code AS ENUM (
    'STANDARD',
    'ZERO_RATED',
    'EXEMPT',
    'REVERSE_CHARGE',
    'SELF_BILLED'
);


--
-- Name: validation_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.validation_category AS ENUM (
    'financial',
    'process',
    'compliance',
    'risk',
    'data_quality'
);


--
-- Name: validation_rule_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.validation_rule_type AS ENUM (
    'required_field',
    'amount_variance',
    'date_consistency',
    'tax_calculation',
    'duplicate_detection',
    'vendor_verification',
    'po_matching',
    'receipt_matching',
    'budget_impact',
    'approval_limit',
    'custom'
);


--
-- Name: validation_severity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.validation_severity AS ENUM (
    'error',
    'warning',
    'info'
);


--
-- Name: work_item_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.work_item_status AS ENUM (
    'queued',
    'in_progress',
    'done',
    'blocked'
);


--
-- Name: work_stage; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.work_stage AS ENUM (
    'ingest',
    'extract_index',
    'match',
    'non_po',
    'post'
);


--
-- Name: workflow_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.workflow_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'skipped'
);


--
-- Name: fn_enqueue(public.work_stage, public.doc_type, uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_enqueue(p_stage public.work_stage, p_doc_type public.doc_type, p_doc_id uuid, p_priority integer DEFAULT 3) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: fn_expand_approval_policy(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_expand_approval_policy(p_invoice_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: fn_get_po_line_remaining(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_get_po_line_remaining(p_po_line_id uuid) RETURNS TABLE(qty_remaining_to_receive numeric, qty_remaining_to_invoice numeric, amount_remaining_to_invoice numeric)
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: fn_match_invoice(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_match_invoice(p_invoice_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: fn_record_agent_run(character varying, uuid, jsonb, jsonb, boolean, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_record_agent_run(p_agent_code character varying, p_work_item_id uuid, p_input_json jsonb, p_output_json jsonb DEFAULT NULL::jsonb, p_success boolean DEFAULT NULL::boolean, p_error text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: fn_run_invoice_validations(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_run_invoice_validations(p_invoice_id uuid) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_run_id UUID;
  v_error_count INTEGER := 0;
  v_warning_count INTEGER := 0;
  v_info_count INTEGER := 0;
  v_confidence_score DECIMAL(5,2) := 100.00;
  v_fraud_risk_score DECIMAL(5,2) := 0.00;
BEGIN
  -- Create validation run record
  INSERT INTO validation_runs (invoice_id, run_type, total_rules_checked)
  VALUES (p_invoice_id, 'automatic', 0)
  RETURNING id INTO v_run_id;
  
  -- Run validations (simplified - actual implementation would check each rule)
  -- This is a placeholder for the actual validation logic
  
  -- Update run record with results
  UPDATE validation_runs
  SET 
    errors_found = v_error_count,
    warnings_found = v_warning_count,
    info_found = v_info_count,
    confidence_score = v_confidence_score,
    fraud_risk_score = v_fraud_risk_score,
    completed_at = NOW(),
    duration_ms = EXTRACT(MILLISECONDS FROM (NOW() - started_at))
  WHERE id = v_run_id;
  
  -- Update invoice header with latest scores
  UPDATE invoice_headers
  SET 
    confidence_score = v_confidence_score,
    fraud_risk_score = v_fraud_risk_score
  WHERE id = p_invoice_id;
  
  RETURN v_run_id;
END;
$$;


--
-- Name: fn_track_invoice_status_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_track_invoice_status_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO invoice_status_history (
      invoice_id, 
      old_status, 
      new_status,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      NEW.updated_by
    );
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: fn_validate_invoice_totals(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_validate_invoice_totals(p_invoice_id uuid) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: is_production_database(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_production_database() RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_record_count INTEGER;
BEGIN
    -- Check for significant data that indicates production use
    SELECT COUNT(*) INTO v_record_count
    FROM invoice_headers
    WHERE created_at < CURRENT_DATE - INTERVAL '30 days';
    
    -- If we have invoices older than 30 days, likely production
    RETURN v_record_count > 10;
END;
$$;


--
-- Name: log_critical_audit_event(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_critical_audit_event() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_doc_type doc_type;
    v_doc_id UUID;
    v_event_type VARCHAR(100);
    v_payload JSONB;
BEGIN
    -- Determine document type and event based on table
    IF TG_TABLE_NAME = 'invoice_headers' THEN
        v_doc_type := 'INV';
        v_doc_id := NEW.id;
        
        IF TG_OP = 'INSERT' THEN
            v_event_type := 'INVOICE_CREATED';
        ELSIF OLD.status != NEW.status THEN
            v_event_type := 'INVOICE_STATUS_CHANGED';
            v_payload := jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status
            );
        ELSIF OLD.match_status != NEW.match_status THEN
            v_event_type := 'INVOICE_MATCH_STATUS_CHANGED';
            v_payload := jsonb_build_object(
                'old_match_status', OLD.match_status,
                'new_match_status', NEW.match_status
            );
        END IF;
    ELSIF TG_TABLE_NAME = 'po_headers' THEN
        v_doc_type := 'PO';
        v_doc_id := NEW.id;
        
        IF TG_OP = 'INSERT' THEN
            v_event_type := 'PO_CREATED';
        ELSIF OLD.status != NEW.status THEN
            v_event_type := 'PO_STATUS_CHANGED';
            v_payload := jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status
            );
        END IF;
    END IF;
    
    -- Log the event if we have one
    IF v_event_type IS NOT NULL THEN
        INSERT INTO audit_events (doc_type, doc_id, event_type, by_user_id, at, payload_json)
        VALUES (v_doc_type, v_doc_id, v_event_type, NULL, NOW(), v_payload);
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: normalize_invoice_line_quantities(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.normalize_invoice_line_quantities() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_conversion_factor DECIMAL(18,9);
    v_base_uom VARCHAR(20);
BEGIN
    -- Only process if we have a po_line_id and qty
    IF NEW.po_line_id IS NOT NULL AND NEW.qty IS NOT NULL THEN
        -- Get the base UOM from the PO line
        SELECT pl.uom INTO v_base_uom
        FROM po_lines pl
        WHERE pl.id = NEW.po_line_id;
        
        -- If UOMs match, no conversion needed
        IF NEW.uom = v_base_uom OR NEW.uom IS NULL THEN
            NEW.normalized_qty := NEW.qty;
            NEW.normalized_unit_price := NEW.unit_price;
        ELSE
            -- Look for a conversion factor
            SELECT uc.factor INTO v_conversion_factor
            FROM uom_conversions uc
            JOIN po_lines pl ON pl.item_id = uc.item_id
            WHERE pl.id = NEW.po_line_id
              AND uc.from_uom = NEW.uom
              AND uc.to_uom = v_base_uom
              AND CURRENT_DATE BETWEEN uc.valid_from AND COALESCE(uc.valid_to, '9999-12-31'::DATE);
            
            IF v_conversion_factor IS NOT NULL THEN
                -- Apply conversion
                NEW.normalized_qty := NEW.qty * v_conversion_factor;
                NEW.normalized_unit_price := NEW.unit_price / v_conversion_factor;
                NEW.orig_uom := NEW.uom;
            ELSE
                -- No conversion found, use original values
                NEW.normalized_qty := NEW.qty;
                NEW.normalized_unit_price := NEW.unit_price;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: update_invoice_po_numbers_cache(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_invoice_po_numbers_cache() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_invoice_id UUID;
    v_po_numbers TEXT[];
BEGIN
    -- Determine which invoice to update
    IF TG_OP = 'DELETE' THEN
        v_invoice_id := OLD.invoice_id;
    ELSE
        v_invoice_id := NEW.invoice_id;
    END IF;
    
    -- Collect unique PO numbers from invoice lines
    SELECT ARRAY_AGG(DISTINCT po.po_number ORDER BY po.po_number)
    INTO v_po_numbers
    FROM invoice_lines il
    JOIN po_lines pl ON pl.id = il.po_line_id
    JOIN po_headers po ON po.id = pl.po_id
    WHERE il.invoice_id = v_invoice_id;
    
    -- Update the cached PO numbers on the invoice header
    UPDATE invoice_headers
    SET po_numbers_cached = v_po_numbers
    WHERE id = v_invoice_id;
    
    RETURN CASE
        WHEN TG_OP = 'DELETE' THEN OLD
        ELSE NEW
    END;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: validate_invoice_totals_trigger(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_invoice_totals_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_line_subtotal DECIMAL(18,4);
    v_line_tax_total DECIMAL(18,4);
    v_tolerance DECIMAL(18,4) := 0.01;  -- Allow 1 cent rounding difference
    v_calculated_total DECIMAL(18,4);
BEGIN
    -- Only validate on UPDATE of totals or INSERT
    IF TG_OP = 'UPDATE' THEN
        IF OLD.subtotal = NEW.subtotal AND 
           OLD.tax_total = NEW.tax_total AND 
           OLD.total = NEW.total AND
           OLD.shipping_total = NEW.shipping_total AND
           OLD.discount_total = NEW.discount_total AND
           OLD.other_charges_total = NEW.other_charges_total THEN
            RETURN NEW;  -- No total changes, skip validation
        END IF;
    END IF;
    
    -- Calculate line totals
    SELECT 
        COALESCE(SUM(net_amount), 0),
        COALESCE(SUM(tax_amount), 0)
    INTO v_line_subtotal, v_line_tax_total
    FROM invoice_lines
    WHERE invoice_id = NEW.id;
    
    -- Check if header matches lines (with tolerance for rounding)
    IF ABS(NEW.subtotal - v_line_subtotal) > v_tolerance THEN
        RAISE WARNING 'Invoice % subtotal (%) does not match line sum (%)', 
            NEW.invoice_number, NEW.subtotal, v_line_subtotal;
    END IF;
    
    IF ABS(NEW.tax_total - v_line_tax_total) > v_tolerance THEN
        RAISE WARNING 'Invoice % tax_total (%) does not match line sum (%)', 
            NEW.invoice_number, NEW.tax_total, v_line_tax_total;
    END IF;
    
    -- Calculate the correct total including ALL components
    v_calculated_total := NEW.subtotal + NEW.tax_total + 
                         COALESCE(NEW.shipping_total, 0) + 
                         COALESCE(NEW.other_charges_total, 0) - 
                         COALESCE(NEW.discount_total, 0);
    
    -- If extracted_total exists and differs significantly, use it (AI is more reliable)
    IF NEW.extracted_total IS NOT NULL AND ABS(NEW.extracted_total - v_calculated_total) > 1.0 THEN
        -- Trust the AI-extracted total when there's a significant discrepancy
        NEW.total := NEW.extracted_total;
        NEW.total_discrepancy := ABS(NEW.extracted_total - v_calculated_total);
        RAISE WARNING 'Invoice % using extracted total (%) instead of calculated (%) - discrepancy: %', 
            NEW.invoice_number, NEW.extracted_total, v_calculated_total, NEW.total_discrepancy;
    ELSE
        -- Ensure total includes all components
        IF ABS(NEW.total - v_calculated_total) > v_tolerance THEN
            NEW.total := v_calculated_total;
            RAISE WARNING 'Invoice % total corrected to % (subtotal:% + tax:% + shipping:% + other:% - discount:%)', 
                NEW.invoice_number, NEW.total, NEW.subtotal, NEW.tax_total, 
                COALESCE(NEW.shipping_total, 0), COALESCE(NEW.other_charges_total, 0), 
                COALESCE(NEW.discount_total, 0);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: agent_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_code character varying(100) NOT NULL,
    work_item_id uuid NOT NULL,
    input_json jsonb NOT NULL,
    output_json jsonb,
    started_at timestamp with time zone NOT NULL,
    finished_at timestamp with time zone,
    success boolean,
    error text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: approval_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    priority integer NOT NULL,
    active boolean DEFAULT true,
    vendor_id uuid,
    currency character varying(3),
    min_amount numeric(18,4),
    max_amount numeric(18,4),
    non_po_only boolean DEFAULT false,
    match_json jsonb,
    approver_group_id uuid NOT NULL,
    sequence integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT check_approval_amounts CHECK (((min_amount IS NULL) OR (max_amount IS NULL) OR (min_amount <= max_amount)))
);


--
-- Name: approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    doc_type public.doc_type NOT NULL,
    doc_id uuid NOT NULL,
    step integer NOT NULL,
    status public.workflow_status NOT NULL,
    assigned_to uuid,
    note text,
    acted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: approver_group_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approver_group_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    user_id uuid NOT NULL,
    level integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT check_level CHECK ((level > 0))
);


--
-- Name: approver_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approver_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    doc_type public.doc_type NOT NULL,
    doc_id uuid NOT NULL,
    filename character varying(255) NOT NULL,
    media_type character varying(100) NOT NULL,
    storage_url text NOT NULL,
    source character varying(100) NOT NULL,
    sha256 character varying(64) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: audit_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    doc_type public.doc_type NOT NULL,
    doc_id uuid NOT NULL,
    event_type character varying(100) NOT NULL,
    by_user_id uuid,
    at timestamp with time zone DEFAULT now(),
    payload_json jsonb
);


--
-- Name: cost_centers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cost_centers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: external_refs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_refs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    doc_type public.doc_type NOT NULL,
    doc_id uuid NOT NULL,
    system_code character varying(50) NOT NULL,
    external_id character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: gr_headers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gr_headers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    gr_number character varying(50) NOT NULL,
    po_id uuid NOT NULL,
    receipt_date date NOT NULL,
    received_by_user_id uuid,
    status public.gr_status NOT NULL,
    reference character varying(255),
    carrier character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: gr_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gr_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    gr_id uuid NOT NULL,
    po_line_id uuid NOT NULL,
    qty_received numeric(18,6) NOT NULL,
    qty_rejected numeric(18,6),
    uom character varying(20) NOT NULL,
    storage_location character varying(100),
    reject_reason_code character varying(50),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT check_positive_qty_received CHECK ((qty_received >= (0)::numeric)),
    CONSTRAINT check_qty_rejected CHECK (((qty_rejected IS NULL) OR ((qty_rejected >= (0)::numeric) AND (qty_rejected <= qty_received))))
);


--
-- Name: invoice_headers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_headers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type public.invoice_type NOT NULL,
    vendor_id uuid NOT NULL,
    invoice_number character varying(100) NOT NULL,
    invoice_date date NOT NULL,
    due_date date NOT NULL,
    currency character varying(3) NOT NULL,
    home_currency character varying(3),
    fx_rate numeric(18,8),
    subtotal numeric(18,4) NOT NULL,
    discount_total numeric(18,4),
    tax_total numeric(18,4) NOT NULL,
    shipping_total numeric(18,4),
    other_charges_total numeric(18,4),
    withholding_tax_total numeric(18,4),
    rounding_diff numeric(18,4),
    total numeric(18,4) NOT NULL,
    paid_amount numeric(18,4) DEFAULT 0,
    payment_terms_id uuid NOT NULL,
    bill_to_id uuid NOT NULL,
    ship_to_id uuid,
    vendor_bank_account_id uuid,
    vendor_name_snapshot character varying(255) NOT NULL,
    vendor_tax_id_snapshot character varying(50) NOT NULL,
    vendor_address_snapshot jsonb NOT NULL,
    terms_text text,
    tax_point_date date,
    po_numbers_cached text[],
    tax_inclusive boolean DEFAULT false,
    tax_treatment_code public.tax_treatment_code,
    self_billed boolean DEFAULT false,
    early_pay_discount_offered_percent numeric(7,4),
    early_pay_discount_deadline date,
    early_pay_discount_taken_amount numeric(18,4),
    prepayment_reference character varying(255),
    references_invoice_id uuid,
    revision integer DEFAULT 1,
    supersedes_invoice_id uuid,
    fingerprint_sha256 character varying(64),
    status public.invoice_status NOT NULL,
    match_status public.match_status DEFAULT 'not_matched'::public.match_status NOT NULL,
    hold_reason text,
    hold_reason_code public.hold_reason_code,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    approval_status public.approval_status DEFAULT 'not_required'::public.approval_status,
    gr_numbers_cached text[],
    po_id uuid,
    bill_to_snapshot jsonb,
    ship_to_snapshot jsonb,
    assigned_to_user_id uuid,
    helpdesk_ticket_ref character varying(50),
    validation_errors jsonb DEFAULT '[]'::jsonb,
    validation_warnings jsonb DEFAULT '[]'::jsonb,
    confidence_score numeric(5,2) DEFAULT 100.00,
    fraud_risk_score numeric(5,2) DEFAULT 0.00,
    processing_started_at timestamp with time zone,
    processing_completed_at timestamp with time zone,
    ledger character varying(50) DEFAULT 'Accounts Payable'::character varying,
    tax_rate_percent numeric(9,6),
    cost_center character varying(100),
    cost_center_name character varying(255),
    gl_code character varying(50),
    department character varying(100),
    accounting_notes text,
    ai_classification_confidence numeric(3,2),
    ai_classification_reasoning text,
    extraction_field_confidences jsonb DEFAULT '{}'::jsonb,
    is_manually_edited jsonb DEFAULT '{}'::jsonb,
    payment_method character varying(50),
    payment_bank_details jsonb,
    extracted_total numeric(18,4),
    total_discrepancy numeric(18,4),
    CONSTRAINT check_invoice_dates CHECK ((invoice_date <= due_date)),
    CONSTRAINT check_paid_amount CHECK (((paid_amount >= (0)::numeric) AND (paid_amount <= total))),
    CONSTRAINT chk_confidence_score CHECK (((confidence_score >= (0)::numeric) AND (confidence_score <= (100)::numeric))),
    CONSTRAINT chk_fraud_risk_score CHECK (((fraud_risk_score >= (0)::numeric) AND (fraud_risk_score <= (100)::numeric)))
);


--
-- Name: invoice_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    line_no integer NOT NULL,
    description text NOT NULL,
    item_id uuid,
    uom character varying(20),
    qty numeric(18,6),
    unit_price numeric(18,4),
    discount_percent numeric(7,4),
    discount_amount numeric(18,4),
    extended_amount numeric(18,4),
    net_amount numeric(18,4) NOT NULL,
    tax_rate_id uuid,
    tax_amount numeric(18,4),
    line_total numeric(18,4) NOT NULL,
    cost_center character varying(50),
    project_code character varying(50),
    gl_account character varying(50),
    po_line_id uuid,
    gr_line_id uuid,
    ses_line_id uuid,
    orig_uom character varying(20),
    normalized_qty numeric(18,6),
    normalized_unit_price numeric(18,6),
    service_period_start date,
    service_period_end date,
    po_number_snapshot character varying(50),
    po_line_no_snapshot integer,
    gr_number_snapshot character varying(50),
    gr_line_no_snapshot integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tax_rate_percent numeric(9,6),
    CONSTRAINT check_invoice_service_periods CHECK (((service_period_start IS NULL) OR (service_period_end IS NULL) OR (service_period_start <= service_period_end))),
    CONSTRAINT invoice_lines_check CHECK ((NOT ((gr_line_id IS NOT NULL) AND (ses_line_id IS NOT NULL))))
);


--
-- Name: invoice_headers_enriched; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.invoice_headers_enriched AS
 SELECT id,
    type,
    vendor_id,
    invoice_number,
    invoice_date,
    due_date,
    currency,
    home_currency,
    fx_rate,
    subtotal,
    discount_total,
    tax_total,
    shipping_total,
    other_charges_total,
    withholding_tax_total,
    rounding_diff,
    total,
    paid_amount,
    payment_terms_id,
    bill_to_id,
    ship_to_id,
    vendor_bank_account_id,
    vendor_name_snapshot,
    vendor_tax_id_snapshot,
    vendor_address_snapshot,
    terms_text,
    tax_point_date,
    po_numbers_cached,
    tax_inclusive,
    tax_treatment_code,
    self_billed,
    early_pay_discount_offered_percent,
    early_pay_discount_deadline,
    early_pay_discount_taken_amount,
    prepayment_reference,
    references_invoice_id,
    revision,
    supersedes_invoice_id,
    fingerprint_sha256,
    status,
    match_status,
    hold_reason,
    hold_reason_code,
    created_at,
    updated_at,
    created_by,
    updated_by,
    (total - paid_amount) AS outstanding_amount,
    (due_date - CURRENT_DATE) AS days_until_due,
        CASE
            WHEN (CURRENT_DATE > due_date) THEN (CURRENT_DATE - due_date)
            ELSE 0
        END AS days_overdue,
        CASE
            WHEN ((early_pay_discount_deadline IS NOT NULL) AND (CURRENT_DATE <= early_pay_discount_deadline) AND (early_pay_discount_offered_percent IS NOT NULL)) THEN ((total * early_pay_discount_offered_percent) / (100)::numeric)
            ELSE (0)::numeric
        END AS early_pay_discount_available,
    ( SELECT count(*) AS count
           FROM public.invoice_lines il
          WHERE (il.invoice_id = ih.id)) AS line_count,
    ( SELECT count(*) AS count
           FROM public.invoice_lines il
          WHERE ((il.invoice_id = ih.id) AND (il.po_line_id IS NOT NULL))) AS matched_line_count,
    (EXISTS ( SELECT 1
           FROM public.attachments a
          WHERE ((a.doc_type = 'INV'::public.doc_type) AND (a.doc_id = ih.id)))) AS has_attachments,
    ( SELECT a.status
           FROM public.approvals a
          WHERE ((a.doc_type = 'INV'::public.doc_type) AND (a.doc_id = ih.id))
          ORDER BY a.step DESC
         LIMIT 1) AS latest_approval_status
   FROM public.invoice_headers ih;


--
-- Name: invoice_line_distributions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_line_distributions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_line_id uuid NOT NULL,
    cost_center character varying(50) NOT NULL,
    gl_account character varying(50) NOT NULL,
    project_code character varying(50),
    amount numeric(18,4) NOT NULL,
    percent numeric(7,4),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: invoice_line_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_line_receipts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_line_id uuid NOT NULL,
    gr_line_id uuid,
    ses_line_id uuid,
    qty_applied numeric(18,6),
    amount_applied numeric(18,4),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT invoice_line_receipts_check CHECK (((gr_line_id IS NOT NULL) OR (ses_line_id IS NOT NULL)))
);


--
-- Name: invoice_line_taxes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_line_taxes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_line_id uuid NOT NULL,
    tax_rate_id uuid NOT NULL,
    base_amount numeric(18,4) NOT NULL,
    tax_amount numeric(18,4) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: invoice_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    old_status public.invoice_status,
    new_status public.invoice_status NOT NULL,
    changed_by uuid,
    reason text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: invoice_validations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_validations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    validation_rule_id uuid NOT NULL,
    field_name character varying(100),
    line_number integer,
    severity public.validation_severity NOT NULL,
    category public.validation_category NOT NULL,
    is_valid boolean NOT NULL,
    message text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb,
    expected_value text,
    actual_value text,
    variance_amount numeric(18,4),
    variance_percent numeric(7,4),
    is_resolved boolean DEFAULT false,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    resolution_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sku character varying(100) NOT NULL,
    description text NOT NULL,
    uom character varying(20) NOT NULL,
    tax_class_id uuid,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: match_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.match_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    invoice_line_id uuid,
    level character varying(50) NOT NULL,
    rule_applied character varying(50) NOT NULL,
    matched_po_line_id uuid,
    matched_gr_line_id uuid,
    matched_ses_line_id uuid,
    qty_variance numeric(18,6),
    price_variance numeric(18,6),
    amount_variance numeric(18,4),
    within_tolerance boolean NOT NULL,
    tolerance_profile_id uuid,
    explanation_code character varying(100) NOT NULL,
    at timestamp with time zone DEFAULT now()
);


--
-- Name: match_results_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.match_results_summary AS
 SELECT invoice_id,
    count(DISTINCT invoice_line_id) AS lines_checked,
    count(DISTINCT invoice_line_id) FILTER (WHERE (within_tolerance = true)) AS lines_within_tolerance,
    count(DISTINCT invoice_line_id) FILTER (WHERE (within_tolerance = false)) AS lines_outside_tolerance,
    sum(abs(qty_variance)) AS total_qty_variance,
    sum(abs(price_variance)) AS total_price_variance,
    sum(abs(amount_variance)) AS total_amount_variance,
    mode() WITHIN GROUP (ORDER BY explanation_code) AS most_common_issue,
        CASE
            WHEN (count(*) FILTER (WHERE (within_tolerance = false)) = 0) THEN 'APPROVE'::text
            WHEN (count(*) FILTER (WHERE (within_tolerance = false)) <= 2) THEN 'REVIEW'::text
            ELSE 'REJECT'::text
        END AS match_recommendation,
    max(at) AS last_checked_at
   FROM public.match_results mr
  GROUP BY invoice_id;


--
-- Name: org_entities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_entities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    legal_name character varying(255) NOT NULL,
    tax_id character varying(50) NOT NULL,
    address_lines jsonb NOT NULL,
    default_currency character varying(3) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: payment_terms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_terms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    net_days integer NOT NULL,
    discount_percent numeric(7,4),
    discount_days integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT check_discount_days CHECK (((discount_days IS NULL) OR (discount_days <= net_days))),
    CONSTRAINT check_discount_percent CHECK (((discount_percent IS NULL) OR ((discount_percent >= (0)::numeric) AND (discount_percent <= (100)::numeric))))
);


--
-- Name: po_headers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.po_headers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    po_number character varying(50) NOT NULL,
    vendor_id uuid NOT NULL,
    po_type public.po_type NOT NULL,
    parent_po_id uuid,
    order_date date NOT NULL,
    currency character varying(3) NOT NULL,
    bill_to_id uuid NOT NULL,
    ship_to_id uuid NOT NULL,
    payment_terms_id uuid NOT NULL,
    expected_match_rule public.match_rule,
    status public.po_status NOT NULL,
    buyer_user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    subtotal numeric(18,4),
    tax_total numeric(18,4),
    total numeric(18,4)
);


--
-- Name: po_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.po_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    po_id uuid NOT NULL,
    line_no integer NOT NULL,
    item_id uuid,
    description text NOT NULL,
    uom character varying(20) NOT NULL,
    qty_ordered numeric(18,6) NOT NULL,
    unit_price numeric(18,4) NOT NULL,
    tax_rate_id uuid NOT NULL,
    cost_center character varying(50),
    project_code character varying(50),
    gl_account character varying(50),
    need_by_date date,
    status character varying(50) NOT NULL,
    allow_over_receipt_pct numeric(7,4),
    allow_over_invoice_pct numeric(7,4),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT check_over_invoice_pct CHECK (((allow_over_invoice_pct IS NULL) OR ((allow_over_invoice_pct >= (0)::numeric) AND (allow_over_invoice_pct <= (100)::numeric)))),
    CONSTRAINT check_over_receipt_pct CHECK (((allow_over_receipt_pct IS NULL) OR ((allow_over_receipt_pct >= (0)::numeric) AND (allow_over_receipt_pct <= (100)::numeric)))),
    CONSTRAINT check_positive_qty_price CHECK (((qty_ordered > (0)::numeric) AND (unit_price >= (0)::numeric)))
);


--
-- Name: ses_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ses_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ses_id uuid NOT NULL,
    po_line_id uuid NOT NULL,
    amount_accepted numeric(18,4) NOT NULL,
    description text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: po_line_rollups; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.po_line_rollups AS
 SELECT pl.id AS po_line_id,
    pl.po_id,
    pl.line_no,
    pl.qty_ordered,
    pl.unit_price,
    COALESCE(sum((grl.qty_received - COALESCE(grl.qty_rejected, (0)::numeric))), (0)::numeric) AS qty_received_to_date,
    COALESCE(( SELECT sum(il.normalized_qty) AS sum
           FROM public.invoice_lines il
          WHERE (il.po_line_id = pl.id)), (0)::numeric) AS qty_invoiced_to_date,
    (pl.qty_ordered - COALESCE(sum((grl.qty_received - COALESCE(grl.qty_rejected, (0)::numeric))), (0)::numeric)) AS qty_remaining_to_receive,
    (pl.qty_ordered - COALESCE(( SELECT sum(il.normalized_qty) AS sum
           FROM public.invoice_lines il
          WHERE (il.po_line_id = pl.id)), (0)::numeric)) AS qty_remaining_to_invoice,
    COALESCE(( SELECT sum(sl.amount_accepted) AS sum
           FROM public.ses_lines sl
          WHERE (sl.po_line_id = pl.id)), (0)::numeric) AS service_amount_accepted,
    COALESCE(( SELECT sum(il.net_amount) AS sum
           FROM public.invoice_lines il
          WHERE (il.po_line_id = pl.id)), (0)::numeric) AS amount_invoiced_to_date
   FROM (public.po_lines pl
     LEFT JOIN public.gr_lines grl ON ((grl.po_line_id = pl.id)))
  GROUP BY pl.id, pl.po_id, pl.line_no, pl.qty_ordered, pl.unit_price;


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    id integer NOT NULL,
    filename character varying(255) NOT NULL,
    checksum character varying(64) NOT NULL,
    applied_at timestamp with time zone DEFAULT now(),
    execution_time_ms integer,
    success boolean DEFAULT true,
    error_message text,
    rolled_back boolean DEFAULT false,
    rolled_back_at timestamp with time zone
);


--
-- Name: schema_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.schema_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: schema_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.schema_migrations_id_seq OWNED BY public.schema_migrations.id;


--
-- Name: ses_headers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ses_headers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    po_id uuid NOT NULL,
    service_period_start date,
    service_period_end date,
    approved_by_user_id uuid,
    status public.gr_status NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT check_service_periods CHECK (((service_period_start IS NULL) OR (service_period_end IS NULL) OR (service_period_start <= service_period_end)))
);


--
-- Name: ship_to_sites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ship_to_sites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_entity_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    address_lines jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: source_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.source_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    filename character varying(255) NOT NULL,
    media_type character varying(100) NOT NULL,
    storage_url text NOT NULL,
    sha256 character varying(64) NOT NULL,
    extracted_json jsonb,
    ocr_confidence numeric(5,4),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: tax_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tax_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(50) NOT NULL,
    rate_percent numeric(9,6) NOT NULL,
    valid_from date NOT NULL,
    valid_to date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: test_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_migrations (
    id character varying(30) DEFAULT concat('test_', to_char(now(), 'YYYYMMDDHH24MISS'::text), '_', substr(md5((random())::text), 1, 6)) NOT NULL,
    name character varying(255) NOT NULL,
    value text,
    "createdAt" timestamp with time zone DEFAULT now(),
    "updatedAt" timestamp with time zone DEFAULT now()
);


--
-- Name: tolerance_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tolerance_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    price_tolerance_pct numeric(7,4) NOT NULL,
    qty_tolerance_pct numeric(7,4) NOT NULL,
    amount_tolerance_abs numeric(18,4) NOT NULL,
    tax_tolerance_abs numeric(18,4),
    rounding_tolerance_abs numeric(18,4),
    match_rule public.match_rule NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT check_tolerance_percentages CHECK (((price_tolerance_pct >= (0)::numeric) AND (price_tolerance_pct <= (100)::numeric) AND (qty_tolerance_pct >= (0)::numeric) AND (qty_tolerance_pct <= (100)::numeric)))
);


--
-- Name: uom_conversions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.uom_conversions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_id uuid NOT NULL,
    from_uom character varying(20) NOT NULL,
    to_uom character varying(20) NOT NULL,
    factor numeric(18,9) NOT NULL,
    valid_from date NOT NULL,
    valid_to date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: validation_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.validation_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    rule_type public.validation_rule_type NOT NULL,
    category public.validation_category NOT NULL,
    severity public.validation_severity NOT NULL,
    is_active boolean DEFAULT true,
    config jsonb DEFAULT '{}'::jsonb,
    tolerance_percent numeric(7,4),
    tolerance_amount numeric(18,4),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: validation_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.validation_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_id uuid NOT NULL,
    run_type character varying(50) NOT NULL,
    triggered_by uuid,
    total_rules_checked integer DEFAULT 0 NOT NULL,
    errors_found integer DEFAULT 0 NOT NULL,
    warnings_found integer DEFAULT 0 NOT NULL,
    info_found integer DEFAULT 0 NOT NULL,
    confidence_score numeric(5,2),
    fraud_risk_score numeric(5,2),
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    duration_ms integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: vendor_bank_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_bank_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vendor_id uuid NOT NULL,
    bank_name character varying(255) NOT NULL,
    iban character varying(50),
    swift_bic character varying(20),
    account_number_masked character varying(50) NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    account_name character varying(255),
    account_number character varying(100),
    sort_code character varying(20),
    routing_number character varying(20)
);


--
-- Name: vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    tax_id character varying(50),
    country_code character varying(2),
    default_currency character varying(3),
    payment_terms_id uuid,
    default_bank_account_id uuid,
    tolerance_profile_id uuid,
    requires_po boolean DEFAULT true,
    is_blocked_for_payment boolean DEFAULT false,
    w9_on_file boolean,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_verified boolean DEFAULT false,
    preferred_payment_method character varying(50),
    CONSTRAINT check_payment_method CHECK (((preferred_payment_method IS NULL) OR ((preferred_payment_method)::text = ANY ((ARRAY['bank_transfer'::character varying, 'check'::character varying, 'credit_card'::character varying, 'paypal'::character varying, 'wire_transfer'::character varying, 'cash'::character varying, 'ach'::character varying, 'eft'::character varying, 'bacs'::character varying, 'other'::character varying])::text[]))))
);


--
-- Name: vendor_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vendor_summary AS
 SELECT v.id AS vendor_id,
    v.name AS vendor_name,
    v.active,
    v.is_blocked_for_payment,
    count(DISTINCT po.id) AS total_po_count,
    count(DISTINCT po.id) FILTER (WHERE (po.status = 'approved'::public.po_status)) AS approved_po_count,
    count(DISTINCT ih.id) AS total_invoice_count,
    count(DISTINCT ih.id) FILTER (WHERE (ih.status = 'posted'::public.invoice_status)) AS posted_invoice_count,
    count(DISTINCT ih.id) FILTER (WHERE (ih.status = 'paid'::public.invoice_status)) AS paid_invoice_count,
    COALESCE(sum(ih.total), (0)::numeric) AS total_invoice_amount,
    COALESCE(sum(ih.total) FILTER (WHERE (ih.status = 'paid'::public.invoice_status)), (0)::numeric) AS total_paid_amount,
    COALESCE(sum((ih.total - ih.paid_amount)) FILTER (WHERE (ih.status <> ALL (ARRAY['paid'::public.invoice_status, 'void'::public.invoice_status]))), (0)::numeric) AS outstanding_amount,
    count(DISTINCT ih.id) FILTER (WHERE (ih.match_status = 'matched'::public.match_status)) AS matched_invoice_count,
    count(DISTINCT ih.id) FILTER (WHERE (ih.match_status = 'exception'::public.match_status)) AS exception_invoice_count,
    max(po.created_at) AS latest_po_date,
    max(ih.created_at) AS latest_invoice_date
   FROM ((public.vendors v
     LEFT JOIN public.po_headers po ON ((po.vendor_id = v.id)))
     LEFT JOIN public.invoice_headers ih ON ((ih.vendor_id = v.id)))
  GROUP BY v.id, v.name, v.active, v.is_blocked_for_payment;


--
-- Name: work_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    doc_type public.doc_type NOT NULL,
    doc_id uuid NOT NULL,
    stage public.work_stage NOT NULL,
    status public.work_item_status NOT NULL,
    priority integer DEFAULT 3,
    assigned_to_user_id uuid,
    assigned_to_agent_code character varying(100),
    due_at timestamp with time zone,
    result_json jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT check_priority CHECK (((priority >= 1) AND (priority <= 10)))
);


--
-- Name: work_queue; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.work_queue AS
 SELECT id AS work_item_id,
    doc_type,
    doc_id,
    stage,
    status,
    priority,
    assigned_to_user_id,
    assigned_to_agent_code,
    due_at,
    created_at,
    updated_at,
        CASE
            WHEN (doc_type = 'INV'::public.doc_type) THEN ( SELECT ih.invoice_number
               FROM public.invoice_headers ih
              WHERE (ih.id = wi.doc_id))
            WHEN (doc_type = 'PO'::public.doc_type) THEN ( SELECT po.po_number
               FROM public.po_headers po
              WHERE (po.id = wi.doc_id))
            WHEN (doc_type = 'GR'::public.doc_type) THEN ( SELECT gr.gr_number
               FROM public.gr_headers gr
              WHERE (gr.id = wi.doc_id))
            ELSE NULL::character varying
        END AS document_number,
        CASE
            WHEN (doc_type = 'INV'::public.doc_type) THEN ( SELECT v.name
               FROM (public.invoice_headers ih
                 JOIN public.vendors v ON ((v.id = ih.vendor_id)))
              WHERE (ih.id = wi.doc_id))
            WHEN (doc_type = 'PO'::public.doc_type) THEN ( SELECT v.name
               FROM (public.po_headers po
                 JOIN public.vendors v ON ((v.id = po.vendor_id)))
              WHERE (po.id = wi.doc_id))
            ELSE NULL::character varying
        END AS vendor_name,
    (EXTRACT(epoch FROM (now() - updated_at)) / (3600)::numeric) AS hours_in_status,
        CASE
            WHEN ((due_at IS NOT NULL) AND (due_at < now())) THEN true
            ELSE false
        END AS is_overdue,
    ( SELECT count(*) AS count
           FROM public.agent_runs ar
          WHERE (ar.work_item_id = wi.id)) AS agent_run_count,
    ( SELECT max(ar.finished_at) AS max
           FROM public.agent_runs ar
          WHERE (ar.work_item_id = wi.id)) AS last_agent_run_at
   FROM public.work_items wi;


--
-- Name: schema_migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations ALTER COLUMN id SET DEFAULT nextval('public.schema_migrations_id_seq'::regclass);


--
-- Name: agent_runs agent_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_runs
    ADD CONSTRAINT agent_runs_pkey PRIMARY KEY (id);


--
-- Name: approval_policies approval_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_policies
    ADD CONSTRAINT approval_policies_pkey PRIMARY KEY (id);


--
-- Name: approvals approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_pkey PRIMARY KEY (id);


--
-- Name: approver_group_members approver_group_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approver_group_members
    ADD CONSTRAINT approver_group_members_pkey PRIMARY KEY (id);


--
-- Name: approver_groups approver_groups_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approver_groups
    ADD CONSTRAINT approver_groups_name_key UNIQUE (name);


--
-- Name: approver_groups approver_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approver_groups
    ADD CONSTRAINT approver_groups_pkey PRIMARY KEY (id);


--
-- Name: attachments attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_pkey PRIMARY KEY (id);


--
-- Name: audit_events audit_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_events
    ADD CONSTRAINT audit_events_pkey PRIMARY KEY (id);


--
-- Name: cost_centers cost_centers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_centers
    ADD CONSTRAINT cost_centers_pkey PRIMARY KEY (id);


--
-- Name: external_refs external_refs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_refs
    ADD CONSTRAINT external_refs_pkey PRIMARY KEY (id);


--
-- Name: gr_headers gr_headers_gr_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gr_headers
    ADD CONSTRAINT gr_headers_gr_number_key UNIQUE (gr_number);


--
-- Name: gr_headers gr_headers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gr_headers
    ADD CONSTRAINT gr_headers_pkey PRIMARY KEY (id);


--
-- Name: gr_lines gr_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gr_lines
    ADD CONSTRAINT gr_lines_pkey PRIMARY KEY (id);


--
-- Name: invoice_headers invoice_headers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_headers
    ADD CONSTRAINT invoice_headers_pkey PRIMARY KEY (id);


--
-- Name: invoice_headers invoice_headers_vendor_id_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_headers
    ADD CONSTRAINT invoice_headers_vendor_id_invoice_number_key UNIQUE (vendor_id, invoice_number);


--
-- Name: invoice_line_distributions invoice_line_distributions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_line_distributions
    ADD CONSTRAINT invoice_line_distributions_pkey PRIMARY KEY (id);


--
-- Name: invoice_line_receipts invoice_line_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_line_receipts
    ADD CONSTRAINT invoice_line_receipts_pkey PRIMARY KEY (id);


--
-- Name: invoice_line_taxes invoice_line_taxes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_line_taxes
    ADD CONSTRAINT invoice_line_taxes_pkey PRIMARY KEY (id);


--
-- Name: invoice_lines invoice_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_lines
    ADD CONSTRAINT invoice_lines_pkey PRIMARY KEY (id);


--
-- Name: invoice_status_history invoice_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_status_history
    ADD CONSTRAINT invoice_status_history_pkey PRIMARY KEY (id);


--
-- Name: invoice_validations invoice_validations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_validations
    ADD CONSTRAINT invoice_validations_pkey PRIMARY KEY (id);


--
-- Name: items items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.items
    ADD CONSTRAINT items_pkey PRIMARY KEY (id);


--
-- Name: match_results match_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_results
    ADD CONSTRAINT match_results_pkey PRIMARY KEY (id);


--
-- Name: org_entities org_entities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_entities
    ADD CONSTRAINT org_entities_pkey PRIMARY KEY (id);


--
-- Name: payment_terms payment_terms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_terms
    ADD CONSTRAINT payment_terms_pkey PRIMARY KEY (id);


--
-- Name: po_headers po_headers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_headers
    ADD CONSTRAINT po_headers_pkey PRIMARY KEY (id);


--
-- Name: po_headers po_headers_po_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_headers
    ADD CONSTRAINT po_headers_po_number_key UNIQUE (po_number);


--
-- Name: po_lines po_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_lines
    ADD CONSTRAINT po_lines_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_filename_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_filename_key UNIQUE (filename);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (id);


--
-- Name: ses_headers ses_headers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ses_headers
    ADD CONSTRAINT ses_headers_pkey PRIMARY KEY (id);


--
-- Name: ses_lines ses_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ses_lines
    ADD CONSTRAINT ses_lines_pkey PRIMARY KEY (id);


--
-- Name: ship_to_sites ship_to_sites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ship_to_sites
    ADD CONSTRAINT ship_to_sites_pkey PRIMARY KEY (id);


--
-- Name: source_files source_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_files
    ADD CONSTRAINT source_files_pkey PRIMARY KEY (id);


--
-- Name: tax_rates tax_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_rates
    ADD CONSTRAINT tax_rates_pkey PRIMARY KEY (id);


--
-- Name: test_migrations test_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_migrations
    ADD CONSTRAINT test_migrations_pkey PRIMARY KEY (id);


--
-- Name: tolerance_profiles tolerance_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tolerance_profiles
    ADD CONSTRAINT tolerance_profiles_pkey PRIMARY KEY (id);


--
-- Name: approver_group_members unique_group_level; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approver_group_members
    ADD CONSTRAINT unique_group_level UNIQUE (group_id, level);


--
-- Name: approver_group_members unique_group_member; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approver_group_members
    ADD CONSTRAINT unique_group_member UNIQUE (group_id, user_id);


--
-- Name: invoice_lines unique_invoice_line_no; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_lines
    ADD CONSTRAINT unique_invoice_line_no UNIQUE (invoice_id, line_no);


--
-- Name: po_lines unique_po_line_no; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_lines
    ADD CONSTRAINT unique_po_line_no UNIQUE (po_id, line_no);


--
-- Name: uom_conversions uom_conversions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uom_conversions
    ADD CONSTRAINT uom_conversions_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: validation_rules validation_rules_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.validation_rules
    ADD CONSTRAINT validation_rules_code_key UNIQUE (code);


--
-- Name: validation_rules validation_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.validation_rules
    ADD CONSTRAINT validation_rules_pkey PRIMARY KEY (id);


--
-- Name: validation_runs validation_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.validation_runs
    ADD CONSTRAINT validation_runs_pkey PRIMARY KEY (id);


--
-- Name: vendor_bank_accounts vendor_bank_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_bank_accounts
    ADD CONSTRAINT vendor_bank_accounts_pkey PRIMARY KEY (id);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: work_items work_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_items
    ADD CONSTRAINT work_items_pkey PRIMARY KEY (id);


--
-- Name: idx_agent_runs_agent_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_runs_agent_code ON public.agent_runs USING btree (agent_code);


--
-- Name: idx_agent_runs_started_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_runs_started_at ON public.agent_runs USING btree (started_at);


--
-- Name: idx_agent_runs_work_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_runs_work_item_id ON public.agent_runs USING btree (work_item_id);


--
-- Name: idx_approval_policies_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approval_policies_active ON public.approval_policies USING btree (active);


--
-- Name: idx_approval_policies_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approval_policies_priority ON public.approval_policies USING btree (priority);


--
-- Name: idx_approval_policies_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approval_policies_vendor_id ON public.approval_policies USING btree (vendor_id);


--
-- Name: idx_approvals_doc_type_doc_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approvals_doc_type_doc_id ON public.approvals USING btree (doc_type, doc_id);


--
-- Name: idx_approvals_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approvals_status ON public.approvals USING btree (status);


--
-- Name: idx_approver_group_members_group_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approver_group_members_group_id ON public.approver_group_members USING btree (group_id);


--
-- Name: idx_approver_group_members_group_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approver_group_members_group_level ON public.approver_group_members USING btree (group_id, level);


--
-- Name: idx_approver_group_members_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approver_group_members_user_id ON public.approver_group_members USING btree (user_id);


--
-- Name: idx_attachments_doc_type_doc_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attachments_doc_type_doc_id ON public.attachments USING btree (doc_type, doc_id);


--
-- Name: idx_attachments_sha256; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attachments_sha256 ON public.attachments USING btree (sha256);


--
-- Name: idx_audit_events_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_events_at ON public.audit_events USING btree (at);


--
-- Name: idx_audit_events_doc_type_doc_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_events_doc_type_doc_id ON public.audit_events USING btree (doc_type, doc_id);


--
-- Name: idx_audit_events_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_events_event_type ON public.audit_events USING btree (event_type);


--
-- Name: idx_cost_centers_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cost_centers_code ON public.cost_centers USING btree (code);


--
-- Name: idx_external_refs_doc_type_doc_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_external_refs_doc_type_doc_id ON public.external_refs USING btree (doc_type, doc_id);


--
-- Name: idx_external_refs_external_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_external_refs_external_id ON public.external_refs USING btree (external_id);


--
-- Name: idx_external_refs_system_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_external_refs_system_code ON public.external_refs USING btree (system_code);


--
-- Name: idx_gr_headers_gr_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gr_headers_gr_number ON public.gr_headers USING btree (gr_number);


--
-- Name: idx_gr_headers_po_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gr_headers_po_id ON public.gr_headers USING btree (po_id);


--
-- Name: idx_gr_headers_receipt_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gr_headers_receipt_date ON public.gr_headers USING btree (receipt_date);


--
-- Name: idx_gr_headers_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gr_headers_status ON public.gr_headers USING btree (status);


--
-- Name: idx_gr_lines_gr_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gr_lines_gr_id ON public.gr_lines USING btree (gr_id);


--
-- Name: idx_gr_lines_po_line_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gr_lines_po_line_id ON public.gr_lines USING btree (po_line_id);


--
-- Name: idx_invoice_date_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_date_status ON public.invoice_headers USING btree (invoice_date, status);


--
-- Name: idx_invoice_headers_accounting; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_headers_accounting ON public.invoice_headers USING btree (cost_center, gl_code, ledger) WHERE (cost_center IS NOT NULL);


--
-- Name: idx_invoice_headers_approval_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_headers_approval_status ON public.invoice_headers USING btree (approval_status) WHERE (approval_status <> 'not_required'::public.approval_status);


--
-- Name: idx_invoice_headers_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_headers_assigned_to ON public.invoice_headers USING btree (assigned_to_user_id);


--
-- Name: idx_invoice_headers_confidence; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_headers_confidence ON public.invoice_headers USING btree (confidence_score);


--
-- Name: idx_invoice_headers_cost_center; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_headers_cost_center ON public.invoice_headers USING btree (cost_center) WHERE (cost_center IS NOT NULL);


--
-- Name: idx_invoice_headers_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_headers_created_at ON public.invoice_headers USING btree (created_at DESC);


--
-- Name: idx_invoice_headers_department; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_headers_department ON public.invoice_headers USING btree (department) WHERE (department IS NOT NULL);


--
-- Name: idx_invoice_headers_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_headers_due_date ON public.invoice_headers USING btree (due_date);


--
-- Name: idx_invoice_headers_gr_numbers_cached; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_headers_gr_numbers_cached ON public.invoice_headers USING gin (gr_numbers_cached);


--
-- Name: idx_invoice_headers_has_errors; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_headers_has_errors ON public.invoice_headers USING btree (((jsonb_array_length(validation_errors) > 0)));


--
-- Name: idx_invoice_headers_helpdesk_ticket; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_headers_helpdesk_ticket ON public.invoice_headers USING btree (helpdesk_ticket_ref) WHERE (helpdesk_ticket_ref IS NOT NULL);


--
-- Name: idx_invoice_headers_invoice_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_headers_invoice_date ON public.invoice_headers USING btree (invoice_date);


--
-- Name: idx_invoice_headers_match_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_headers_match_status ON public.invoice_headers USING btree (match_status);


--
-- Name: idx_invoice_headers_payment_method; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_headers_payment_method ON public.invoice_headers USING btree (payment_method);


--
-- Name: idx_invoice_headers_po_numbers; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_headers_po_numbers ON public.invoice_headers USING gin (po_numbers_cached);


--
-- Name: idx_invoice_headers_po_numbers_cached; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_headers_po_numbers_cached ON public.invoice_headers USING gin (po_numbers_cached);


--
-- Name: idx_invoice_headers_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_headers_status ON public.invoice_headers USING btree (status);


--
-- Name: idx_invoice_headers_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_headers_vendor_id ON public.invoice_headers USING btree (vendor_id);


--
-- Name: idx_invoice_headers_vendor_id_invoice_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_headers_vendor_id_invoice_date ON public.invoice_headers USING btree (vendor_id, invoice_date);


--
-- Name: idx_invoice_line_distributions_cost_center; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_line_distributions_cost_center ON public.invoice_line_distributions USING btree (cost_center);


--
-- Name: idx_invoice_line_distributions_gl_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_line_distributions_gl_account ON public.invoice_line_distributions USING btree (gl_account);


--
-- Name: idx_invoice_line_distributions_invoice_line_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_line_distributions_invoice_line_id ON public.invoice_line_distributions USING btree (invoice_line_id);


--
-- Name: idx_invoice_line_receipts_gr_line_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_line_receipts_gr_line_id ON public.invoice_line_receipts USING btree (gr_line_id);


--
-- Name: idx_invoice_line_receipts_invoice_line_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_line_receipts_invoice_line_id ON public.invoice_line_receipts USING btree (invoice_line_id);


--
-- Name: idx_invoice_line_receipts_ses_line_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_line_receipts_ses_line_id ON public.invoice_line_receipts USING btree (ses_line_id);


--
-- Name: idx_invoice_line_taxes_invoice_line_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_line_taxes_invoice_line_id ON public.invoice_line_taxes USING btree (invoice_line_id);


--
-- Name: idx_invoice_lines_cost_center; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_lines_cost_center ON public.invoice_lines USING btree (cost_center);


--
-- Name: idx_invoice_lines_gr_line_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_lines_gr_line_id ON public.invoice_lines USING btree (gr_line_id);


--
-- Name: idx_invoice_lines_invoice_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_lines_invoice_id ON public.invoice_lines USING btree (invoice_id);


--
-- Name: idx_invoice_lines_invoice_id_line_no; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_lines_invoice_id_line_no ON public.invoice_lines USING btree (invoice_id, line_no);


--
-- Name: idx_invoice_lines_po_line_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_lines_po_line_id ON public.invoice_lines USING btree (po_line_id);


--
-- Name: idx_invoice_lines_project_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_lines_project_code ON public.invoice_lines USING btree (project_code);


--
-- Name: idx_invoice_lines_ses_line_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_lines_ses_line_id ON public.invoice_lines USING btree (ses_line_id);


--
-- Name: idx_invoice_status_history_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_status_history_invoice ON public.invoice_status_history USING btree (invoice_id, created_at DESC);


--
-- Name: idx_invoice_validations_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_validations_category ON public.invoice_validations USING btree (category);


--
-- Name: idx_invoice_validations_invoice_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_validations_invoice_id ON public.invoice_validations USING btree (invoice_id);


--
-- Name: idx_invoice_validations_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_validations_severity ON public.invoice_validations USING btree (severity) WHERE (NOT is_resolved);


--
-- Name: idx_invoice_validations_unresolved; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_validations_unresolved ON public.invoice_validations USING btree (invoice_id) WHERE (NOT is_resolved);


--
-- Name: idx_invoice_vendor_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoice_vendor_status ON public.invoice_headers USING btree (vendor_id, status);


--
-- Name: idx_items_description; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_description ON public.items USING btree (description);


--
-- Name: idx_items_sku; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_items_sku ON public.items USING btree (sku);


--
-- Name: idx_match_invoice_tolerance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_invoice_tolerance ON public.match_results USING btree (invoice_id, within_tolerance);


--
-- Name: idx_match_results_explanation_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_results_explanation_code ON public.match_results USING btree (explanation_code);


--
-- Name: idx_match_results_gr_line_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_results_gr_line_id ON public.match_results USING btree (matched_gr_line_id);


--
-- Name: idx_match_results_invoice_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_results_invoice_id ON public.match_results USING btree (invoice_id);


--
-- Name: idx_match_results_invoice_line_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_results_invoice_line_id ON public.match_results USING btree (invoice_line_id);


--
-- Name: idx_match_results_po_line_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_results_po_line_id ON public.match_results USING btree (matched_po_line_id);


--
-- Name: idx_match_results_within_tolerance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_results_within_tolerance ON public.match_results USING btree (within_tolerance);


--
-- Name: idx_payment_terms_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_terms_name ON public.payment_terms USING btree (name);


--
-- Name: idx_po_headers_order_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_headers_order_date ON public.po_headers USING btree (order_date);


--
-- Name: idx_po_headers_po_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_headers_po_number ON public.po_headers USING btree (po_number);


--
-- Name: idx_po_headers_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_headers_status ON public.po_headers USING btree (status);


--
-- Name: idx_po_headers_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_headers_vendor_id ON public.po_headers USING btree (vendor_id);


--
-- Name: idx_po_lines_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_lines_item_id ON public.po_lines USING btree (item_id);


--
-- Name: idx_po_lines_po_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_lines_po_id ON public.po_lines USING btree (po_id);


--
-- Name: idx_po_lines_po_id_line_no; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_lines_po_id_line_no ON public.po_lines USING btree (po_id, line_no);


--
-- Name: idx_po_lines_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_lines_status ON public.po_lines USING btree (status);


--
-- Name: idx_po_vendor_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_vendor_status ON public.po_headers USING btree (vendor_id, status);


--
-- Name: idx_projects_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_code ON public.projects USING btree (code);


--
-- Name: idx_schema_migrations_filename; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schema_migrations_filename ON public.schema_migrations USING btree (filename);


--
-- Name: idx_schema_migrations_rolled_back; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schema_migrations_rolled_back ON public.schema_migrations USING btree (rolled_back) WHERE (rolled_back = true);


--
-- Name: idx_schema_migrations_success; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schema_migrations_success ON public.schema_migrations USING btree (success) WHERE (success = false);


--
-- Name: idx_ses_headers_po_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ses_headers_po_id ON public.ses_headers USING btree (po_id);


--
-- Name: idx_ses_headers_service_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ses_headers_service_period ON public.ses_headers USING btree (service_period_start, service_period_end);


--
-- Name: idx_ses_headers_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ses_headers_status ON public.ses_headers USING btree (status);


--
-- Name: idx_ses_lines_po_line_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ses_lines_po_line_id ON public.ses_lines USING btree (po_line_id);


--
-- Name: idx_ses_lines_ses_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ses_lines_ses_id ON public.ses_lines USING btree (ses_id);


--
-- Name: idx_ship_to_sites_org_entity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ship_to_sites_org_entity_id ON public.ship_to_sites USING btree (org_entity_id);


--
-- Name: idx_source_files_sha256; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_source_files_sha256 ON public.source_files USING btree (sha256);


--
-- Name: idx_tax_rates_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tax_rates_code ON public.tax_rates USING btree (code);


--
-- Name: idx_tax_rates_valid_from; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tax_rates_valid_from ON public.tax_rates USING btree (valid_from);


--
-- Name: idx_tax_rates_valid_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tax_rates_valid_to ON public.tax_rates USING btree (valid_to);


--
-- Name: idx_uom_conversions_from_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_uom_conversions_from_to ON public.uom_conversions USING btree (from_uom, to_uom);


--
-- Name: idx_uom_conversions_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_uom_conversions_item_id ON public.uom_conversions USING btree (item_id);


--
-- Name: idx_uom_conversions_validity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_uom_conversions_validity ON public.uom_conversions USING btree (valid_from, valid_to);


--
-- Name: idx_validation_runs_completed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_validation_runs_completed ON public.validation_runs USING btree (completed_at DESC);


--
-- Name: idx_validation_runs_invoice_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_validation_runs_invoice_id ON public.validation_runs USING btree (invoice_id);


--
-- Name: idx_vendor_bank_accounts_is_default; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_bank_accounts_is_default ON public.vendor_bank_accounts USING btree (is_default);


--
-- Name: idx_vendor_bank_accounts_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendor_bank_accounts_vendor_id ON public.vendor_bank_accounts USING btree (vendor_id);


--
-- Name: idx_vendors_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_active ON public.vendors USING btree (active);


--
-- Name: idx_vendors_is_verified; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_is_verified ON public.vendors USING btree (is_verified);


--
-- Name: idx_vendors_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_name ON public.vendors USING btree (name);


--
-- Name: idx_vendors_payment_terms_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_payment_terms_id ON public.vendors USING btree (payment_terms_id);


--
-- Name: idx_vendors_preferred_payment_method; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_preferred_payment_method ON public.vendors USING btree (preferred_payment_method);


--
-- Name: idx_vendors_requires_po; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_requires_po ON public.vendors USING btree (requires_po);


--
-- Name: idx_vendors_tolerance_profile_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vendors_tolerance_profile_id ON public.vendors USING btree (tolerance_profile_id);


--
-- Name: idx_work_items_assigned_to_agent_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_items_assigned_to_agent_code ON public.work_items USING btree (assigned_to_agent_code);


--
-- Name: idx_work_items_assigned_to_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_items_assigned_to_user_id ON public.work_items USING btree (assigned_to_user_id);


--
-- Name: idx_work_items_due_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_items_due_at ON public.work_items USING btree (due_at);


--
-- Name: idx_work_items_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_items_priority ON public.work_items USING btree (priority);


--
-- Name: idx_work_items_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_items_stage ON public.work_items USING btree (stage);


--
-- Name: idx_work_items_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_work_items_status ON public.work_items USING btree (status);


--
-- Name: unique_default_bank_account; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unique_default_bank_account ON public.vendor_bank_accounts USING btree (vendor_id) WHERE (is_default = true);


--
-- Name: invoice_headers audit_invoice_headers_changes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_invoice_headers_changes AFTER INSERT OR UPDATE ON public.invoice_headers FOR EACH ROW EXECUTE FUNCTION public.log_critical_audit_event();


--
-- Name: po_headers audit_po_headers_changes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER audit_po_headers_changes AFTER INSERT OR UPDATE ON public.po_headers FOR EACH ROW EXECUTE FUNCTION public.log_critical_audit_event();


--
-- Name: invoice_lines maintain_invoice_po_numbers_cache; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER maintain_invoice_po_numbers_cache AFTER INSERT OR DELETE OR UPDATE OF po_line_id ON public.invoice_lines FOR EACH ROW EXECUTE FUNCTION public.update_invoice_po_numbers_cache();


--
-- Name: invoice_lines normalize_invoice_line_quantities_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER normalize_invoice_line_quantities_trigger BEFORE INSERT OR UPDATE OF qty, unit_price, uom, po_line_id ON public.invoice_lines FOR EACH ROW EXECUTE FUNCTION public.normalize_invoice_line_quantities();


--
-- Name: invoice_headers trg_invoice_status_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_invoice_status_change AFTER UPDATE ON public.invoice_headers FOR EACH ROW EXECUTE FUNCTION public.fn_track_invoice_status_change();


--
-- Name: agent_runs update_agent_runs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_agent_runs_updated_at BEFORE UPDATE ON public.agent_runs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: approval_policies update_approval_policies_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_approval_policies_updated_at BEFORE UPDATE ON public.approval_policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: approvals update_approvals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_approvals_updated_at BEFORE UPDATE ON public.approvals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: approver_group_members update_approver_group_members_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_approver_group_members_updated_at BEFORE UPDATE ON public.approver_group_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: approver_groups update_approver_groups_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_approver_groups_updated_at BEFORE UPDATE ON public.approver_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: attachments update_attachments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_attachments_updated_at BEFORE UPDATE ON public.attachments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: cost_centers update_cost_centers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_cost_centers_updated_at BEFORE UPDATE ON public.cost_centers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: external_refs update_external_refs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_external_refs_updated_at BEFORE UPDATE ON public.external_refs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: gr_headers update_gr_headers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_gr_headers_updated_at BEFORE UPDATE ON public.gr_headers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: gr_lines update_gr_lines_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_gr_lines_updated_at BEFORE UPDATE ON public.gr_lines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: invoice_headers update_invoice_headers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_invoice_headers_updated_at BEFORE UPDATE ON public.invoice_headers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: invoice_line_distributions update_invoice_line_distributions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_invoice_line_distributions_updated_at BEFORE UPDATE ON public.invoice_line_distributions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: invoice_line_receipts update_invoice_line_receipts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_invoice_line_receipts_updated_at BEFORE UPDATE ON public.invoice_line_receipts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: invoice_line_taxes update_invoice_line_taxes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_invoice_line_taxes_updated_at BEFORE UPDATE ON public.invoice_line_taxes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: invoice_lines update_invoice_lines_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_invoice_lines_updated_at BEFORE UPDATE ON public.invoice_lines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: items update_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: org_entities update_org_entities_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_org_entities_updated_at BEFORE UPDATE ON public.org_entities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payment_terms update_payment_terms_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_payment_terms_updated_at BEFORE UPDATE ON public.payment_terms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: po_headers update_po_headers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_po_headers_updated_at BEFORE UPDATE ON public.po_headers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: po_lines update_po_lines_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_po_lines_updated_at BEFORE UPDATE ON public.po_lines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: projects update_projects_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ses_headers update_ses_headers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ses_headers_updated_at BEFORE UPDATE ON public.ses_headers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ses_lines update_ses_lines_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ses_lines_updated_at BEFORE UPDATE ON public.ses_lines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ship_to_sites update_ship_to_sites_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ship_to_sites_updated_at BEFORE UPDATE ON public.ship_to_sites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: source_files update_source_files_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_source_files_updated_at BEFORE UPDATE ON public.source_files FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tax_rates update_tax_rates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tax_rates_updated_at BEFORE UPDATE ON public.tax_rates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: test_migrations update_test_migrations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_test_migrations_updated_at BEFORE UPDATE ON public.test_migrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tolerance_profiles update_tolerance_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tolerance_profiles_updated_at BEFORE UPDATE ON public.tolerance_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: uom_conversions update_uom_conversions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_uom_conversions_updated_at BEFORE UPDATE ON public.uom_conversions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: vendor_bank_accounts update_vendor_bank_accounts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_vendor_bank_accounts_updated_at BEFORE UPDATE ON public.vendor_bank_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: vendors update_vendors_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: work_items update_work_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_work_items_updated_at BEFORE UPDATE ON public.work_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: invoice_headers validate_invoice_totals_on_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_invoice_totals_on_change BEFORE INSERT OR UPDATE ON public.invoice_headers FOR EACH ROW EXECUTE FUNCTION public.validate_invoice_totals_trigger();


--
-- Name: agent_runs agent_runs_work_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_runs
    ADD CONSTRAINT agent_runs_work_item_id_fkey FOREIGN KEY (work_item_id) REFERENCES public.work_items(id);


--
-- Name: approval_policies approval_policies_approver_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_policies
    ADD CONSTRAINT approval_policies_approver_group_id_fkey FOREIGN KEY (approver_group_id) REFERENCES public.approver_groups(id);


--
-- Name: approval_policies approval_policies_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_policies
    ADD CONSTRAINT approval_policies_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: approvals approvals_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: approver_group_members approver_group_members_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approver_group_members
    ADD CONSTRAINT approver_group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.approver_groups(id) ON DELETE CASCADE;


--
-- Name: approver_group_members approver_group_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approver_group_members
    ADD CONSTRAINT approver_group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: audit_events audit_events_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_events
    ADD CONSTRAINT audit_events_by_user_id_fkey FOREIGN KEY (by_user_id) REFERENCES public.users(id);


--
-- Name: gr_headers gr_headers_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gr_headers
    ADD CONSTRAINT gr_headers_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.po_headers(id);


--
-- Name: gr_headers gr_headers_received_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gr_headers
    ADD CONSTRAINT gr_headers_received_by_user_id_fkey FOREIGN KEY (received_by_user_id) REFERENCES public.users(id);


--
-- Name: gr_lines gr_lines_gr_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gr_lines
    ADD CONSTRAINT gr_lines_gr_id_fkey FOREIGN KEY (gr_id) REFERENCES public.gr_headers(id) ON DELETE CASCADE;


--
-- Name: gr_lines gr_lines_po_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gr_lines
    ADD CONSTRAINT gr_lines_po_line_id_fkey FOREIGN KEY (po_line_id) REFERENCES public.po_lines(id);


--
-- Name: invoice_headers invoice_headers_assigned_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_headers
    ADD CONSTRAINT invoice_headers_assigned_to_user_id_fkey FOREIGN KEY (assigned_to_user_id) REFERENCES public.users(id);


--
-- Name: invoice_headers invoice_headers_bill_to_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_headers
    ADD CONSTRAINT invoice_headers_bill_to_id_fkey FOREIGN KEY (bill_to_id) REFERENCES public.org_entities(id);


--
-- Name: invoice_headers invoice_headers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_headers
    ADD CONSTRAINT invoice_headers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: invoice_headers invoice_headers_payment_terms_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_headers
    ADD CONSTRAINT invoice_headers_payment_terms_id_fkey FOREIGN KEY (payment_terms_id) REFERENCES public.payment_terms(id);


--
-- Name: invoice_headers invoice_headers_references_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_headers
    ADD CONSTRAINT invoice_headers_references_invoice_id_fkey FOREIGN KEY (references_invoice_id) REFERENCES public.invoice_headers(id);


--
-- Name: invoice_headers invoice_headers_ship_to_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_headers
    ADD CONSTRAINT invoice_headers_ship_to_id_fkey FOREIGN KEY (ship_to_id) REFERENCES public.ship_to_sites(id);


--
-- Name: invoice_headers invoice_headers_supersedes_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_headers
    ADD CONSTRAINT invoice_headers_supersedes_invoice_id_fkey FOREIGN KEY (supersedes_invoice_id) REFERENCES public.invoice_headers(id);


--
-- Name: invoice_headers invoice_headers_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_headers
    ADD CONSTRAINT invoice_headers_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: invoice_headers invoice_headers_vendor_bank_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_headers
    ADD CONSTRAINT invoice_headers_vendor_bank_account_id_fkey FOREIGN KEY (vendor_bank_account_id) REFERENCES public.vendor_bank_accounts(id);


--
-- Name: invoice_headers invoice_headers_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_headers
    ADD CONSTRAINT invoice_headers_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: invoice_line_distributions invoice_line_distributions_invoice_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_line_distributions
    ADD CONSTRAINT invoice_line_distributions_invoice_line_id_fkey FOREIGN KEY (invoice_line_id) REFERENCES public.invoice_lines(id) ON DELETE CASCADE;


--
-- Name: invoice_line_receipts invoice_line_receipts_gr_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_line_receipts
    ADD CONSTRAINT invoice_line_receipts_gr_line_id_fkey FOREIGN KEY (gr_line_id) REFERENCES public.gr_lines(id);


--
-- Name: invoice_line_receipts invoice_line_receipts_invoice_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_line_receipts
    ADD CONSTRAINT invoice_line_receipts_invoice_line_id_fkey FOREIGN KEY (invoice_line_id) REFERENCES public.invoice_lines(id) ON DELETE CASCADE;


--
-- Name: invoice_line_receipts invoice_line_receipts_ses_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_line_receipts
    ADD CONSTRAINT invoice_line_receipts_ses_line_id_fkey FOREIGN KEY (ses_line_id) REFERENCES public.ses_lines(id);


--
-- Name: invoice_line_taxes invoice_line_taxes_invoice_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_line_taxes
    ADD CONSTRAINT invoice_line_taxes_invoice_line_id_fkey FOREIGN KEY (invoice_line_id) REFERENCES public.invoice_lines(id) ON DELETE CASCADE;


--
-- Name: invoice_line_taxes invoice_line_taxes_tax_rate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_line_taxes
    ADD CONSTRAINT invoice_line_taxes_tax_rate_id_fkey FOREIGN KEY (tax_rate_id) REFERENCES public.tax_rates(id);


--
-- Name: invoice_lines invoice_lines_gr_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_lines
    ADD CONSTRAINT invoice_lines_gr_line_id_fkey FOREIGN KEY (gr_line_id) REFERENCES public.gr_lines(id);


--
-- Name: invoice_lines invoice_lines_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_lines
    ADD CONSTRAINT invoice_lines_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoice_headers(id) ON DELETE CASCADE;


--
-- Name: invoice_lines invoice_lines_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_lines
    ADD CONSTRAINT invoice_lines_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id);


--
-- Name: invoice_lines invoice_lines_po_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_lines
    ADD CONSTRAINT invoice_lines_po_line_id_fkey FOREIGN KEY (po_line_id) REFERENCES public.po_lines(id);


--
-- Name: invoice_lines invoice_lines_ses_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_lines
    ADD CONSTRAINT invoice_lines_ses_line_id_fkey FOREIGN KEY (ses_line_id) REFERENCES public.ses_lines(id);


--
-- Name: invoice_lines invoice_lines_tax_rate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_lines
    ADD CONSTRAINT invoice_lines_tax_rate_id_fkey FOREIGN KEY (tax_rate_id) REFERENCES public.tax_rates(id);


--
-- Name: invoice_status_history invoice_status_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_status_history
    ADD CONSTRAINT invoice_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id);


--
-- Name: invoice_status_history invoice_status_history_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_status_history
    ADD CONSTRAINT invoice_status_history_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoice_headers(id) ON DELETE CASCADE;


--
-- Name: invoice_validations invoice_validations_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_validations
    ADD CONSTRAINT invoice_validations_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoice_headers(id) ON DELETE CASCADE;


--
-- Name: invoice_validations invoice_validations_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_validations
    ADD CONSTRAINT invoice_validations_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id);


--
-- Name: invoice_validations invoice_validations_validation_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_validations
    ADD CONSTRAINT invoice_validations_validation_rule_id_fkey FOREIGN KEY (validation_rule_id) REFERENCES public.validation_rules(id);


--
-- Name: match_results match_results_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_results
    ADD CONSTRAINT match_results_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoice_headers(id) ON DELETE CASCADE;


--
-- Name: match_results match_results_invoice_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_results
    ADD CONSTRAINT match_results_invoice_line_id_fkey FOREIGN KEY (invoice_line_id) REFERENCES public.invoice_lines(id);


--
-- Name: match_results match_results_matched_gr_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_results
    ADD CONSTRAINT match_results_matched_gr_line_id_fkey FOREIGN KEY (matched_gr_line_id) REFERENCES public.gr_lines(id);


--
-- Name: match_results match_results_matched_po_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_results
    ADD CONSTRAINT match_results_matched_po_line_id_fkey FOREIGN KEY (matched_po_line_id) REFERENCES public.po_lines(id);


--
-- Name: match_results match_results_matched_ses_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_results
    ADD CONSTRAINT match_results_matched_ses_line_id_fkey FOREIGN KEY (matched_ses_line_id) REFERENCES public.ses_lines(id);


--
-- Name: match_results match_results_tolerance_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_results
    ADD CONSTRAINT match_results_tolerance_profile_id_fkey FOREIGN KEY (tolerance_profile_id) REFERENCES public.tolerance_profiles(id);


--
-- Name: po_headers po_headers_bill_to_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_headers
    ADD CONSTRAINT po_headers_bill_to_id_fkey FOREIGN KEY (bill_to_id) REFERENCES public.org_entities(id);


--
-- Name: po_headers po_headers_buyer_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_headers
    ADD CONSTRAINT po_headers_buyer_user_id_fkey FOREIGN KEY (buyer_user_id) REFERENCES public.users(id);


--
-- Name: po_headers po_headers_parent_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_headers
    ADD CONSTRAINT po_headers_parent_po_id_fkey FOREIGN KEY (parent_po_id) REFERENCES public.po_headers(id);


--
-- Name: po_headers po_headers_payment_terms_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_headers
    ADD CONSTRAINT po_headers_payment_terms_id_fkey FOREIGN KEY (payment_terms_id) REFERENCES public.payment_terms(id);


--
-- Name: po_headers po_headers_ship_to_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_headers
    ADD CONSTRAINT po_headers_ship_to_id_fkey FOREIGN KEY (ship_to_id) REFERENCES public.ship_to_sites(id);


--
-- Name: po_headers po_headers_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_headers
    ADD CONSTRAINT po_headers_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: po_lines po_lines_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_lines
    ADD CONSTRAINT po_lines_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id);


--
-- Name: po_lines po_lines_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_lines
    ADD CONSTRAINT po_lines_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.po_headers(id) ON DELETE CASCADE;


--
-- Name: po_lines po_lines_tax_rate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_lines
    ADD CONSTRAINT po_lines_tax_rate_id_fkey FOREIGN KEY (tax_rate_id) REFERENCES public.tax_rates(id);


--
-- Name: ses_headers ses_headers_approved_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ses_headers
    ADD CONSTRAINT ses_headers_approved_by_user_id_fkey FOREIGN KEY (approved_by_user_id) REFERENCES public.users(id);


--
-- Name: ses_headers ses_headers_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ses_headers
    ADD CONSTRAINT ses_headers_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.po_headers(id);


--
-- Name: ses_lines ses_lines_po_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ses_lines
    ADD CONSTRAINT ses_lines_po_line_id_fkey FOREIGN KEY (po_line_id) REFERENCES public.po_lines(id);


--
-- Name: ses_lines ses_lines_ses_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ses_lines
    ADD CONSTRAINT ses_lines_ses_id_fkey FOREIGN KEY (ses_id) REFERENCES public.ses_headers(id) ON DELETE CASCADE;


--
-- Name: ship_to_sites ship_to_sites_org_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ship_to_sites
    ADD CONSTRAINT ship_to_sites_org_entity_id_fkey FOREIGN KEY (org_entity_id) REFERENCES public.org_entities(id);


--
-- Name: uom_conversions uom_conversions_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uom_conversions
    ADD CONSTRAINT uom_conversions_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id);


--
-- Name: validation_runs validation_runs_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.validation_runs
    ADD CONSTRAINT validation_runs_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoice_headers(id) ON DELETE CASCADE;


--
-- Name: validation_runs validation_runs_triggered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.validation_runs
    ADD CONSTRAINT validation_runs_triggered_by_fkey FOREIGN KEY (triggered_by) REFERENCES public.users(id);


--
-- Name: vendor_bank_accounts vendor_bank_accounts_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_bank_accounts
    ADD CONSTRAINT vendor_bank_accounts_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: vendors vendors_default_bank_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_default_bank_account_id_fkey FOREIGN KEY (default_bank_account_id) REFERENCES public.vendor_bank_accounts(id);


--
-- Name: vendors vendors_payment_terms_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_payment_terms_id_fkey FOREIGN KEY (payment_terms_id) REFERENCES public.payment_terms(id);


--
-- Name: vendors vendors_tolerance_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_tolerance_profile_id_fkey FOREIGN KEY (tolerance_profile_id) REFERENCES public.tolerance_profiles(id);


--
-- Name: work_items work_items_assigned_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_items
    ADD CONSTRAINT work_items_assigned_to_user_id_fkey FOREIGN KEY (assigned_to_user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict hT7Xok8nYWyyuk4ughjwjNC06erKYbrApFPhS4zTW3O3DUSvSnSuEPzxFjwGAWR

