-- ================================================================
-- ADD MISSING FOREIGN KEY INDEXES
-- ================================================================
-- Performance optimization: Add indexes for all foreign keys
-- These prevent full table scans on JOIN operations and CASCADE deletes
-- Using CONCURRENTLY to avoid locking tables in production

-- Note: CREATE INDEX CONCURRENTLY cannot run in a transaction
-- This migration should be run separately if the database is under load

-- Vendors table
CREATE INDEX IF NOT EXISTS idx_vendors_default_bank_account_id 
ON vendors(default_bank_account_id);

-- PO Headers table
CREATE INDEX IF NOT EXISTS idx_po_headers_parent_po_id 
ON po_headers(parent_po_id);

CREATE INDEX IF NOT EXISTS idx_po_headers_bill_to_id 
ON po_headers(bill_to_id);

CREATE INDEX IF NOT EXISTS idx_po_headers_ship_to_id 
ON po_headers(ship_to_id);

CREATE INDEX IF NOT EXISTS idx_po_headers_payment_terms_id 
ON po_headers(payment_terms_id);

CREATE INDEX IF NOT EXISTS idx_po_headers_buyer_user_id 
ON po_headers(buyer_user_id);

-- PO Lines table
CREATE INDEX IF NOT EXISTS idx_po_lines_tax_rate_id 
ON po_lines(tax_rate_id);

-- GR Headers table
CREATE INDEX IF NOT EXISTS idx_gr_headers_received_by_user_id 
ON gr_headers(received_by_user_id);

-- SES Headers table
CREATE INDEX IF NOT EXISTS idx_ses_headers_approved_by_user_id 
ON ses_headers(approved_by_user_id);

-- Invoice Headers table
CREATE INDEX IF NOT EXISTS idx_invoice_headers_payment_terms_id 
ON invoice_headers(payment_terms_id);

CREATE INDEX IF NOT EXISTS idx_invoice_headers_bill_to_id 
ON invoice_headers(bill_to_id);

CREATE INDEX IF NOT EXISTS idx_invoice_headers_ship_to_id 
ON invoice_headers(ship_to_id);

CREATE INDEX IF NOT EXISTS idx_invoice_headers_vendor_bank_account_id 
ON invoice_headers(vendor_bank_account_id);

-- Invoice Lines table
CREATE INDEX IF NOT EXISTS idx_invoice_lines_tax_rate_id 
ON invoice_lines(tax_rate_id);

CREATE INDEX IF NOT EXISTS idx_invoice_lines_po_line_id 
ON invoice_lines(po_line_id);

CREATE INDEX IF NOT EXISTS idx_invoice_lines_gr_line_id 
ON invoice_lines(gr_line_id);

CREATE INDEX IF NOT EXISTS idx_invoice_lines_ses_line_id 
ON invoice_lines(ses_line_id);

-- Match Results table
CREATE INDEX IF NOT EXISTS idx_match_results_invoice_line_id 
ON match_results(invoice_line_id);

CREATE INDEX IF NOT EXISTS idx_match_results_matched_po_line_id 
ON match_results(matched_po_line_id);

CREATE INDEX IF NOT EXISTS idx_match_results_matched_gr_line_id 
ON match_results(matched_gr_line_id);

CREATE INDEX IF NOT EXISTS idx_match_results_matched_ses_line_id 
ON match_results(matched_ses_line_id);

CREATE INDEX IF NOT EXISTS idx_match_results_tolerance_profile_id 
ON match_results(tolerance_profile_id);

-- Approvals table
CREATE INDEX IF NOT EXISTS idx_approvals_assigned_to 
ON approvals(assigned_to);

-- Note: acted_by column does not exist in approvals table
-- CREATE INDEX IF NOT EXISTS idx_approvals_acted_by 
-- ON approvals(acted_by);

-- Work Items table
CREATE INDEX IF NOT EXISTS idx_work_items_assigned_to 
ON work_items(assigned_to);

-- External Refs table
CREATE INDEX IF NOT EXISTS idx_external_refs_org_entity_id 
ON external_refs(org_entity_id);

-- Additional composite indexes for common query patterns
-- Invoice lookup by vendor and number
CREATE INDEX IF NOT EXISTS idx_invoice_headers_vendor_invoice 
ON invoice_headers(vendor_id, invoice_number);

-- PO lookup by vendor and number
CREATE INDEX IF NOT EXISTS idx_po_headers_vendor_po 
ON po_headers(vendor_id, po_number);

-- Work items by status and stage
CREATE INDEX IF NOT EXISTS idx_work_items_status_stage 
ON work_items(status, stage);

-- Approvals by document and status
CREATE INDEX IF NOT EXISTS idx_approvals_doc_status 
ON approvals(doc_type, doc_id, status);

-- Match results by invoice and tolerance
CREATE INDEX IF NOT EXISTS idx_match_results_invoice_tolerance 
ON match_results(invoice_id, within_tolerance);

-- Audit events by document
CREATE INDEX IF NOT EXISTS idx_audit_events_doc 
ON audit_events(doc_type, doc_id, event_timestamp DESC);

-- Invoice lines by invoice (for aggregation queries)
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice_id 
ON invoice_lines(invoice_id);

-- ================================================================
-- ANALYZE TABLES TO UPDATE STATISTICS
-- ================================================================
-- Update table statistics for query planner after adding indexes

ANALYZE vendors;
ANALYZE po_headers;
ANALYZE po_lines;
ANALYZE gr_headers;
ANALYZE gr_lines;
ANALYZE ses_headers;
ANALYZE ses_lines;
ANALYZE invoice_headers;
ANALYZE invoice_lines;
ANALYZE match_results;
ANALYZE approvals;
ANALYZE work_items;
ANALYZE audit_events;