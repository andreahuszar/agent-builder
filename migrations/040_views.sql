-- 040_views.sql - Create views and computed columns

-- ================================================================
-- PO LINE ROLLUPS VIEW
-- ================================================================
-- Aggregates receipts and invoices by po_line_id

CREATE OR REPLACE VIEW po_line_rollups AS
SELECT 
    pl.id AS po_line_id,
    pl.po_id,
    pl.line_no,
    pl.qty_ordered,
    pl.unit_price,
    
    -- Quantity received to date (accepted quantity only)
    COALESCE(
        SUM(grl.qty_received - COALESCE(grl.qty_rejected, 0)),
        0
    ) AS qty_received_to_date,
    
    -- Quantity invoiced to date (normalized quantity)
    COALESCE(
        (SELECT SUM(il.normalized_qty) 
         FROM invoice_lines il 
         WHERE il.po_line_id = pl.id),
        0
    ) AS qty_invoiced_to_date,
    
    -- Calculated remaining quantities
    pl.qty_ordered - COALESCE(
        SUM(grl.qty_received - COALESCE(grl.qty_rejected, 0)),
        0
    ) AS qty_remaining_to_receive,
    
    pl.qty_ordered - COALESCE(
        (SELECT SUM(il.normalized_qty) 
         FROM invoice_lines il 
         WHERE il.po_line_id = pl.id),
        0
    ) AS qty_remaining_to_invoice,
    
    -- Service amounts (for service POs)
    COALESCE(
        (SELECT SUM(sl.amount_accepted)
         FROM ses_lines sl
         WHERE sl.po_line_id = pl.id),
        0
    ) AS service_amount_accepted,
    
    -- Amount invoiced (for both goods and services)
    COALESCE(
        (SELECT SUM(il.net_amount)
         FROM invoice_lines il
         WHERE il.po_line_id = pl.id),
        0
    ) AS amount_invoiced_to_date

FROM po_lines pl
LEFT JOIN gr_lines grl ON grl.po_line_id = pl.id
GROUP BY pl.id, pl.po_id, pl.line_no, pl.qty_ordered, pl.unit_price;

-- ================================================================
-- INVOICE HEADER ENRICHED VIEW
-- ================================================================
-- Provides additional computed fields for invoices

CREATE OR REPLACE VIEW invoice_headers_enriched AS
SELECT 
    ih.*,
    -- Outstanding amount
    ih.total - ih.paid_amount AS outstanding_amount,
    
    -- Days until due
    ih.due_date - CURRENT_DATE AS days_until_due,
    
    -- Days overdue (negative if not yet due)
    CASE 
        WHEN CURRENT_DATE > ih.due_date THEN CURRENT_DATE - ih.due_date
        ELSE 0
    END AS days_overdue,
    
    -- Early payment discount available
    CASE 
        WHEN ih.early_pay_discount_deadline IS NOT NULL 
         AND CURRENT_DATE <= ih.early_pay_discount_deadline
         AND ih.early_pay_discount_offered_percent IS NOT NULL
        THEN ih.total * ih.early_pay_discount_offered_percent / 100
        ELSE 0
    END AS early_pay_discount_available,
    
    -- Count of invoice lines
    (SELECT COUNT(*) FROM invoice_lines il WHERE il.invoice_id = ih.id) AS line_count,
    
    -- Count of matched lines
    (SELECT COUNT(*) 
     FROM invoice_lines il 
     WHERE il.invoice_id = ih.id 
       AND il.po_line_id IS NOT NULL) AS matched_line_count,
    
    -- Has attachments
    EXISTS (
        SELECT 1 FROM attachments a 
        WHERE a.doc_type = 'INV' 
          AND a.doc_id = ih.id
    ) AS has_attachments,
    
    -- Approval status
    (SELECT a.status 
     FROM approvals a 
     WHERE a.doc_type = 'INV' 
       AND a.doc_id = ih.id 
     ORDER BY a.step DESC 
     LIMIT 1) AS latest_approval_status

FROM invoice_headers ih;

-- ================================================================
-- VENDOR SUMMARY VIEW
-- ================================================================
-- Provides vendor statistics and summaries

CREATE OR REPLACE VIEW vendor_summary AS
SELECT 
    v.id AS vendor_id,
    v.name AS vendor_name,
    v.active,
    v.is_blocked_for_payment,
    
    -- PO statistics
    COUNT(DISTINCT po.id) AS total_po_count,
    COUNT(DISTINCT po.id) FILTER (WHERE po.status = 'approved') AS approved_po_count,
    
    -- Invoice statistics
    COUNT(DISTINCT ih.id) AS total_invoice_count,
    COUNT(DISTINCT ih.id) FILTER (WHERE ih.status = 'posted') AS posted_invoice_count,
    COUNT(DISTINCT ih.id) FILTER (WHERE ih.status = 'paid') AS paid_invoice_count,
    
    -- Financial totals
    COALESCE(SUM(ih.total), 0) AS total_invoice_amount,
    COALESCE(SUM(ih.total) FILTER (WHERE ih.status = 'paid'), 0) AS total_paid_amount,
    COALESCE(SUM(ih.total - ih.paid_amount) FILTER (WHERE ih.status NOT IN ('paid', 'void')), 0) AS outstanding_amount,
    
    -- Match statistics
    COUNT(DISTINCT ih.id) FILTER (WHERE ih.match_status = 'matched') AS matched_invoice_count,
    COUNT(DISTINCT ih.id) FILTER (WHERE ih.match_status = 'exception') AS exception_invoice_count,
    
    -- Latest activity
    MAX(po.created_at) AS latest_po_date,
    MAX(ih.created_at) AS latest_invoice_date

FROM vendors v
LEFT JOIN po_headers po ON po.vendor_id = v.id
LEFT JOIN invoice_headers ih ON ih.vendor_id = v.id
GROUP BY v.id, v.name, v.active, v.is_blocked_for_payment;

-- ================================================================
-- WORK QUEUE VIEW
-- ================================================================
-- Provides a unified view of work items with additional context

CREATE OR REPLACE VIEW work_queue AS
SELECT 
    wi.id AS work_item_id,
    wi.doc_type,
    wi.doc_id,
    wi.stage,
    wi.status,
    wi.priority,
    wi.assigned_to_user_id,
    wi.assigned_to_agent_code,
    wi.due_at,
    wi.created_at,
    wi.updated_at,
    
    -- Document context
    CASE 
        WHEN wi.doc_type = 'INV' THEN 
            (SELECT ih.invoice_number FROM invoice_headers ih WHERE ih.id = wi.doc_id)
        WHEN wi.doc_type = 'PO' THEN 
            (SELECT po.po_number FROM po_headers po WHERE po.id = wi.doc_id)
        WHEN wi.doc_type = 'GR' THEN 
            (SELECT gr.gr_number FROM gr_headers gr WHERE gr.id = wi.doc_id)
    END AS document_number,
    
    CASE 
        WHEN wi.doc_type = 'INV' THEN 
            (SELECT v.name FROM invoice_headers ih 
             JOIN vendors v ON v.id = ih.vendor_id 
             WHERE ih.id = wi.doc_id)
        WHEN wi.doc_type = 'PO' THEN 
            (SELECT v.name FROM po_headers po 
             JOIN vendors v ON v.id = po.vendor_id 
             WHERE po.id = wi.doc_id)
    END AS vendor_name,
    
    -- Time in current status
    EXTRACT(EPOCH FROM (NOW() - wi.updated_at)) / 3600 AS hours_in_status,
    
    -- Overdue flag
    CASE 
        WHEN wi.due_at IS NOT NULL AND wi.due_at < NOW() THEN TRUE
        ELSE FALSE
    END AS is_overdue,
    
    -- Agent run statistics
    (SELECT COUNT(*) FROM agent_runs ar WHERE ar.work_item_id = wi.id) AS agent_run_count,
    (SELECT MAX(ar.finished_at) FROM agent_runs ar WHERE ar.work_item_id = wi.id) AS last_agent_run_at

FROM work_items wi;

-- ================================================================
-- MATCH RESULTS SUMMARY VIEW
-- ================================================================
-- Provides aggregated matching results by invoice

CREATE OR REPLACE VIEW match_results_summary AS
SELECT 
    mr.invoice_id,
    COUNT(DISTINCT mr.invoice_line_id) AS lines_checked,
    COUNT(DISTINCT mr.invoice_line_id) FILTER (WHERE mr.within_tolerance = TRUE) AS lines_within_tolerance,
    COUNT(DISTINCT mr.invoice_line_id) FILTER (WHERE mr.within_tolerance = FALSE) AS lines_outside_tolerance,
    
    -- Variance totals
    SUM(ABS(mr.qty_variance)) AS total_qty_variance,
    SUM(ABS(mr.price_variance)) AS total_price_variance,
    SUM(ABS(mr.amount_variance)) AS total_amount_variance,
    
    -- Most common issues
    MODE() WITHIN GROUP (ORDER BY mr.explanation_code) AS most_common_issue,
    
    -- Overall match recommendation
    CASE 
        WHEN COUNT(*) FILTER (WHERE mr.within_tolerance = FALSE) = 0 THEN 'APPROVE'
        WHEN COUNT(*) FILTER (WHERE mr.within_tolerance = FALSE) <= 2 THEN 'REVIEW'
        ELSE 'REJECT'
    END AS match_recommendation,
    
    MAX(mr.at) AS last_checked_at

FROM match_results mr
GROUP BY mr.invoice_id;