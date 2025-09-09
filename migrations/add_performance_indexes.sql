-- Performance Optimization Indexes
-- Add indexes for frequently queried columns

-- Invoice Headers indexes
CREATE INDEX IF NOT EXISTS idx_invoice_headers_status ON invoice_headers(status);
CREATE INDEX IF NOT EXISTS idx_invoice_headers_vendor_id ON invoice_headers(vendor_id);
CREATE INDEX IF NOT EXISTS idx_invoice_headers_invoice_date ON invoice_headers(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoice_headers_created_at ON invoice_headers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_headers_match_status ON invoice_headers(match_status);
CREATE INDEX IF NOT EXISTS idx_invoice_headers_po_numbers ON invoice_headers USING GIN(po_numbers_cached);

-- Invoice Lines indexes
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice_id ON invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_po_line_id ON invoice_lines(po_line_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_gr_line_id ON invoice_lines(gr_line_id);

-- PO Headers indexes
CREATE INDEX IF NOT EXISTS idx_po_headers_po_number ON po_headers(po_number);
CREATE INDEX IF NOT EXISTS idx_po_headers_vendor_id ON po_headers(vendor_id);
CREATE INDEX IF NOT EXISTS idx_po_headers_status ON po_headers(status);
CREATE INDEX IF NOT EXISTS idx_po_headers_order_date ON po_headers(order_date);

-- PO Lines indexes
CREATE INDEX IF NOT EXISTS idx_po_lines_po_id ON po_lines(po_id);
CREATE INDEX IF NOT EXISTS idx_po_lines_item_id ON po_lines(item_id);
CREATE INDEX IF NOT EXISTS idx_po_lines_status ON po_lines(status);

-- GR Headers indexes
CREATE INDEX IF NOT EXISTS idx_gr_headers_gr_number ON gr_headers(gr_number);
CREATE INDEX IF NOT EXISTS idx_gr_headers_po_id ON gr_headers(po_id);
CREATE INDEX IF NOT EXISTS idx_gr_headers_receipt_date ON gr_headers(receipt_date);

-- GR Lines indexes
CREATE INDEX IF NOT EXISTS idx_gr_lines_gr_id ON gr_lines(gr_id);
CREATE INDEX IF NOT EXISTS idx_gr_lines_po_line_id ON gr_lines(po_line_id);

-- Match Results indexes
CREATE INDEX IF NOT EXISTS idx_match_results_invoice_id ON match_results(invoice_id);
CREATE INDEX IF NOT EXISTS idx_match_results_invoice_line_id ON match_results(invoice_line_id);
CREATE INDEX IF NOT EXISTS idx_match_results_po_line_id ON match_results(matched_po_line_id);
CREATE INDEX IF NOT EXISTS idx_match_results_gr_line_id ON match_results(matched_gr_line_id);
CREATE INDEX IF NOT EXISTS idx_match_results_within_tolerance ON match_results(within_tolerance);

-- Vendors indexes
CREATE INDEX IF NOT EXISTS idx_vendors_active ON vendors(active);
CREATE INDEX IF NOT EXISTS idx_vendors_requires_po ON vendors(requires_po);
CREATE INDEX IF NOT EXISTS idx_vendors_is_verified ON vendors(is_verified);
CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name);

-- Approvals indexes
CREATE INDEX IF NOT EXISTS idx_approvals_invoice_id ON approvals(invoice_id);
CREATE INDEX IF NOT EXISTS idx_approvals_approver_id ON approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
CREATE INDEX IF NOT EXISTS idx_approvals_requested_at ON approvals(requested_at);

-- Work Items indexes
CREATE INDEX IF NOT EXISTS idx_work_items_invoice_id ON work_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_work_items_assigned_to ON work_items(assigned_to);
CREATE INDEX IF NOT EXISTS idx_work_items_status ON work_items(status);
CREATE INDEX IF NOT EXISTS idx_work_items_priority ON work_items(priority);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_invoice_vendor_status ON invoice_headers(vendor_id, status);
CREATE INDEX IF NOT EXISTS idx_invoice_date_status ON invoice_headers(invoice_date, status);
CREATE INDEX IF NOT EXISTS idx_po_vendor_status ON po_headers(vendor_id, status);
CREATE INDEX IF NOT EXISTS idx_match_invoice_tolerance ON match_results(invoice_id, within_tolerance);

-- Analyze tables to update statistics
ANALYZE invoice_headers;
ANALYZE invoice_lines;
ANALYZE po_headers;
ANALYZE po_lines;
ANALYZE gr_headers;
ANALYZE gr_lines;
ANALYZE match_results;
ANALYZE vendors;
ANALYZE approvals;
ANALYZE work_items;