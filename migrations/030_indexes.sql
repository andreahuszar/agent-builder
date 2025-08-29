-- 030_indexes.sql - Create performance indexes

-- ================================================================
-- RECOMMENDED INDEXES FROM SCHEMA
-- ================================================================

-- PO Lines
CREATE INDEX idx_po_lines_po_id_line_no ON po_lines(po_id, line_no);

-- GR Lines
CREATE INDEX idx_gr_lines_po_line_id ON gr_lines(po_line_id);

-- Invoice Lines
CREATE INDEX idx_invoice_lines_invoice_id_line_no ON invoice_lines(invoice_id, line_no);
CREATE INDEX idx_invoice_lines_po_line_id ON invoice_lines(po_line_id);
CREATE INDEX idx_invoice_lines_gr_line_id ON invoice_lines(gr_line_id);
CREATE INDEX idx_invoice_lines_ses_line_id ON invoice_lines(ses_line_id);

-- Invoice Headers
CREATE INDEX idx_invoice_headers_vendor_id_invoice_date ON invoice_headers(vendor_id, invoice_date);
CREATE INDEX idx_invoice_headers_due_date ON invoice_headers(due_date);

-- GIN index for array search on po_numbers_cached
CREATE INDEX idx_invoice_headers_po_numbers_cached ON invoice_headers USING GIN(po_numbers_cached);

-- ================================================================
-- FOREIGN KEY INDEXES (not already created by constraints)
-- ================================================================

-- Vendors
CREATE INDEX idx_vendors_payment_terms_id ON vendors(payment_terms_id);
CREATE INDEX idx_vendors_tolerance_profile_id ON vendors(tolerance_profile_id);

-- Vendor Bank Accounts
CREATE INDEX idx_vendor_bank_accounts_vendor_id ON vendor_bank_accounts(vendor_id);
CREATE INDEX idx_vendor_bank_accounts_is_default ON vendor_bank_accounts(is_default);

-- Items
CREATE INDEX idx_items_sku ON items(sku);
CREATE INDEX idx_items_description ON items(description);

-- Tax Rates
CREATE INDEX idx_tax_rates_code ON tax_rates(code);
CREATE INDEX idx_tax_rates_valid_from ON tax_rates(valid_from);
CREATE INDEX idx_tax_rates_valid_to ON tax_rates(valid_to);

-- Payment Terms
CREATE INDEX idx_payment_terms_name ON payment_terms(name);

-- Ship To Sites
CREATE INDEX idx_ship_to_sites_org_entity_id ON ship_to_sites(org_entity_id);

-- Cost Centers
CREATE INDEX idx_cost_centers_code ON cost_centers(code);

-- Projects
CREATE INDEX idx_projects_code ON projects(code);

-- UOM Conversions
CREATE INDEX idx_uom_conversions_item_id ON uom_conversions(item_id);
CREATE INDEX idx_uom_conversions_from_to ON uom_conversions(from_uom, to_uom);
CREATE INDEX idx_uom_conversions_validity ON uom_conversions(valid_from, valid_to);

-- PO Headers
CREATE INDEX idx_po_headers_vendor_id ON po_headers(vendor_id);
CREATE INDEX idx_po_headers_order_date ON po_headers(order_date);
CREATE INDEX idx_po_headers_status ON po_headers(status);

-- PO Lines
CREATE INDEX idx_po_lines_po_id ON po_lines(po_id);
CREATE INDEX idx_po_lines_item_id ON po_lines(item_id);

-- GR Headers
CREATE INDEX idx_gr_headers_po_id ON gr_headers(po_id);
CREATE INDEX idx_gr_headers_receipt_date ON gr_headers(receipt_date);
CREATE INDEX idx_gr_headers_status ON gr_headers(status);

-- GR Lines
CREATE INDEX idx_gr_lines_gr_id ON gr_lines(gr_id);

-- SES Headers
CREATE INDEX idx_ses_headers_po_id ON ses_headers(po_id);
CREATE INDEX idx_ses_headers_service_period ON ses_headers(service_period_start, service_period_end);
CREATE INDEX idx_ses_headers_status ON ses_headers(status);

-- SES Lines
CREATE INDEX idx_ses_lines_ses_id ON ses_lines(ses_id);
CREATE INDEX idx_ses_lines_po_line_id ON ses_lines(po_line_id);

-- Invoice Headers
CREATE INDEX idx_invoice_headers_vendor_id ON invoice_headers(vendor_id);
CREATE INDEX idx_invoice_headers_invoice_date ON invoice_headers(invoice_date);
CREATE INDEX idx_invoice_headers_match_status ON invoice_headers(match_status);

-- Invoice Lines
CREATE INDEX idx_invoice_lines_cost_center ON invoice_lines(cost_center);
CREATE INDEX idx_invoice_lines_project_code ON invoice_lines(project_code);

-- Invoice Line Taxes
CREATE INDEX idx_invoice_line_taxes_invoice_line_id ON invoice_line_taxes(invoice_line_id);

-- Invoice Line Distributions
CREATE INDEX idx_invoice_line_distributions_invoice_line_id ON invoice_line_distributions(invoice_line_id);
CREATE INDEX idx_invoice_line_distributions_cost_center ON invoice_line_distributions(cost_center);
CREATE INDEX idx_invoice_line_distributions_gl_account ON invoice_line_distributions(gl_account);

-- Invoice Line Receipts
CREATE INDEX idx_invoice_line_receipts_invoice_line_id ON invoice_line_receipts(invoice_line_id);
CREATE INDEX idx_invoice_line_receipts_gr_line_id ON invoice_line_receipts(gr_line_id);
CREATE INDEX idx_invoice_line_receipts_ses_line_id ON invoice_line_receipts(ses_line_id);

-- Match Results
CREATE INDEX idx_match_results_invoice_id ON match_results(invoice_id);
CREATE INDEX idx_match_results_invoice_line_id ON match_results(invoice_line_id);
CREATE INDEX idx_match_results_within_tolerance ON match_results(within_tolerance);
CREATE INDEX idx_match_results_explanation_code ON match_results(explanation_code);

-- Attachments
CREATE INDEX idx_attachments_doc_type_doc_id ON attachments(doc_type, doc_id);
CREATE INDEX idx_attachments_sha256 ON attachments(sha256);

-- Audit Events
CREATE INDEX idx_audit_events_doc_type_doc_id ON audit_events(doc_type, doc_id);
CREATE INDEX idx_audit_events_event_type ON audit_events(event_type);
CREATE INDEX idx_audit_events_at ON audit_events(at);

-- Source Files
CREATE INDEX idx_source_files_sha256 ON source_files(sha256);

-- Approvals
CREATE INDEX idx_approvals_doc_type_doc_id ON approvals(doc_type, doc_id);
CREATE INDEX idx_approvals_status ON approvals(status);

-- External References
CREATE INDEX idx_external_refs_doc_type_doc_id ON external_refs(doc_type, doc_id);
CREATE INDEX idx_external_refs_system_code ON external_refs(system_code);
CREATE INDEX idx_external_refs_external_id ON external_refs(external_id);

-- Approver Group Members
CREATE INDEX idx_approver_group_members_group_id ON approver_group_members(group_id);
CREATE INDEX idx_approver_group_members_user_id ON approver_group_members(user_id);
CREATE INDEX idx_approver_group_members_group_level ON approver_group_members(group_id, level);

-- Approval Policies
CREATE INDEX idx_approval_policies_active ON approval_policies(active);
CREATE INDEX idx_approval_policies_vendor_id ON approval_policies(vendor_id);
CREATE INDEX idx_approval_policies_priority ON approval_policies(priority);

-- Work Items
CREATE INDEX idx_work_items_stage ON work_items(stage);
CREATE INDEX idx_work_items_status ON work_items(status);
CREATE INDEX idx_work_items_due_at ON work_items(due_at);
CREATE INDEX idx_work_items_assigned_to_user_id ON work_items(assigned_to_user_id);
CREATE INDEX idx_work_items_assigned_to_agent_code ON work_items(assigned_to_agent_code);

-- Agent Runs
CREATE INDEX idx_agent_runs_agent_code ON agent_runs(agent_code);
CREATE INDEX idx_agent_runs_work_item_id ON agent_runs(work_item_id);
CREATE INDEX idx_agent_runs_started_at ON agent_runs(started_at);