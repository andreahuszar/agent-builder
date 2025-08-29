-- 020_constraints.sql - Additional constraints and foreign key policies

-- Most PRIMARY KEY and FOREIGN KEY constraints are defined inline in 010_core_tables.sql
-- This file adds additional constraints and policies

-- ================================================================
-- UNIQUE CONSTRAINTS (already added inline, listed here for reference)
-- ================================================================
-- invoice_headers: UNIQUE(vendor_id, invoice_number) - already inline
-- approver_groups: UNIQUE(name) - already inline
-- users: UNIQUE(email) - already inline

-- ================================================================
-- CHECK CONSTRAINTS (already added inline, listed here for reference)
-- ================================================================
-- invoice_lines: CHECK (NOT (gr_line_id IS NOT NULL AND ses_line_id IS NOT NULL)) - already inline
-- invoice_line_receipts: CHECK (gr_line_id IS NOT NULL OR ses_line_id IS NOT NULL) - already inline

-- ================================================================
-- ADDITIONAL CONSTRAINTS
-- ================================================================

-- Ensure PO line numbers are unique within a PO
ALTER TABLE po_lines ADD CONSTRAINT unique_po_line_no UNIQUE (po_id, line_no);

-- Ensure invoice line numbers are unique within an invoice
ALTER TABLE invoice_lines ADD CONSTRAINT unique_invoice_line_no UNIQUE (invoice_id, line_no);

-- Ensure only one default bank account per vendor
CREATE UNIQUE INDEX unique_default_bank_account ON vendor_bank_accounts(vendor_id) 
WHERE is_default = TRUE;

-- Ensure unique approver group member per level
ALTER TABLE approver_group_members ADD CONSTRAINT unique_group_member UNIQUE (group_id, user_id);
ALTER TABLE approver_group_members ADD CONSTRAINT unique_group_level UNIQUE (group_id, level);

-- ================================================================
-- FOREIGN KEY DELETE POLICIES
-- ================================================================

-- Financial documents use RESTRICT to prevent accidental deletion
-- (Most are already set to RESTRICT by default)

-- Child rows use CASCADE for automatic cleanup
ALTER TABLE invoice_line_taxes 
    DROP CONSTRAINT invoice_line_taxes_invoice_line_id_fkey,
    ADD CONSTRAINT invoice_line_taxes_invoice_line_id_fkey 
    FOREIGN KEY (invoice_line_id) REFERENCES invoice_lines(id) ON DELETE CASCADE;

ALTER TABLE invoice_line_distributions 
    DROP CONSTRAINT invoice_line_distributions_invoice_line_id_fkey,
    ADD CONSTRAINT invoice_line_distributions_invoice_line_id_fkey 
    FOREIGN KEY (invoice_line_id) REFERENCES invoice_lines(id) ON DELETE CASCADE;

ALTER TABLE invoice_line_receipts 
    DROP CONSTRAINT invoice_line_receipts_invoice_line_id_fkey,
    ADD CONSTRAINT invoice_line_receipts_invoice_line_id_fkey 
    FOREIGN KEY (invoice_line_id) REFERENCES invoice_lines(id) ON DELETE CASCADE;

ALTER TABLE invoice_lines 
    DROP CONSTRAINT invoice_lines_invoice_id_fkey,
    ADD CONSTRAINT invoice_lines_invoice_id_fkey 
    FOREIGN KEY (invoice_id) REFERENCES invoice_headers(id) ON DELETE CASCADE;

ALTER TABLE po_lines 
    DROP CONSTRAINT po_lines_po_id_fkey,
    ADD CONSTRAINT po_lines_po_id_fkey 
    FOREIGN KEY (po_id) REFERENCES po_headers(id) ON DELETE CASCADE;

ALTER TABLE gr_lines 
    DROP CONSTRAINT gr_lines_gr_id_fkey,
    ADD CONSTRAINT gr_lines_gr_id_fkey 
    FOREIGN KEY (gr_id) REFERENCES gr_headers(id) ON DELETE CASCADE;

ALTER TABLE ses_lines 
    DROP CONSTRAINT ses_lines_ses_id_fkey,
    ADD CONSTRAINT ses_lines_ses_id_fkey 
    FOREIGN KEY (ses_id) REFERENCES ses_headers(id) ON DELETE CASCADE;

ALTER TABLE approver_group_members 
    DROP CONSTRAINT approver_group_members_group_id_fkey,
    ADD CONSTRAINT approver_group_members_group_id_fkey 
    FOREIGN KEY (group_id) REFERENCES approver_groups(id) ON DELETE CASCADE;

ALTER TABLE match_results 
    DROP CONSTRAINT match_results_invoice_id_fkey,
    ADD CONSTRAINT match_results_invoice_id_fkey 
    FOREIGN KEY (invoice_id) REFERENCES invoice_headers(id) ON DELETE CASCADE;

-- ================================================================
-- ADDITIONAL BUSINESS RULE CONSTRAINTS
-- ================================================================

-- Ensure discount days is less than net days
ALTER TABLE payment_terms ADD CONSTRAINT check_discount_days 
    CHECK (discount_days IS NULL OR discount_days <= net_days);

-- Ensure valid percentages
ALTER TABLE payment_terms ADD CONSTRAINT check_discount_percent 
    CHECK (discount_percent IS NULL OR (discount_percent >= 0 AND discount_percent <= 100));

ALTER TABLE tolerance_profiles ADD CONSTRAINT check_tolerance_percentages 
    CHECK (price_tolerance_pct >= 0 AND price_tolerance_pct <= 100 
       AND qty_tolerance_pct >= 0 AND qty_tolerance_pct <= 100);

ALTER TABLE po_lines ADD CONSTRAINT check_over_receipt_pct 
    CHECK (allow_over_receipt_pct IS NULL OR (allow_over_receipt_pct >= 0 AND allow_over_receipt_pct <= 100));

ALTER TABLE po_lines ADD CONSTRAINT check_over_invoice_pct 
    CHECK (allow_over_invoice_pct IS NULL OR (allow_over_invoice_pct >= 0 AND allow_over_invoice_pct <= 100));

-- Ensure positive quantities and amounts
ALTER TABLE po_lines ADD CONSTRAINT check_positive_qty_price 
    CHECK (qty_ordered > 0 AND unit_price >= 0);

ALTER TABLE gr_lines ADD CONSTRAINT check_positive_qty_received 
    CHECK (qty_received >= 0);

ALTER TABLE gr_lines ADD CONSTRAINT check_qty_rejected 
    CHECK (qty_rejected IS NULL OR (qty_rejected >= 0 AND qty_rejected <= qty_received));

ALTER TABLE invoice_headers ADD CONSTRAINT check_paid_amount 
    CHECK (paid_amount >= 0 AND paid_amount <= total);

-- Ensure invoice dates are logical
ALTER TABLE invoice_headers ADD CONSTRAINT check_invoice_dates 
    CHECK (invoice_date <= due_date);

-- Ensure service periods are logical
ALTER TABLE ses_headers ADD CONSTRAINT check_service_periods 
    CHECK (service_period_start IS NULL OR service_period_end IS NULL 
        OR service_period_start <= service_period_end);

ALTER TABLE invoice_lines ADD CONSTRAINT check_invoice_service_periods 
    CHECK (service_period_start IS NULL OR service_period_end IS NULL 
        OR service_period_start <= service_period_end);

-- Ensure approval policy amounts are logical
ALTER TABLE approval_policies ADD CONSTRAINT check_approval_amounts 
    CHECK (min_amount IS NULL OR max_amount IS NULL OR min_amount <= max_amount);

-- Ensure work item priority is reasonable
ALTER TABLE work_items ADD CONSTRAINT check_priority 
    CHECK (priority >= 1 AND priority <= 10);

-- Ensure approver level is positive
ALTER TABLE approver_group_members ADD CONSTRAINT check_level 
    CHECK (level > 0);