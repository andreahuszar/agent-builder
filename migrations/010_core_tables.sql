-- 010_core_tables.sql - Create all core tables for invoice processing system

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- MASTER LOOKUP TABLES
-- ================================================================

-- Payment Terms
CREATE TABLE payment_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    net_days INTEGER NOT NULL,
    discount_percent DECIMAL(7,4),
    discount_days INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tolerance Profiles
CREATE TABLE tolerance_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    price_tolerance_pct DECIMAL(7,4) NOT NULL,
    qty_tolerance_pct DECIMAL(7,4) NOT NULL,
    amount_tolerance_abs DECIMAL(18,4) NOT NULL,
    tax_tolerance_abs DECIMAL(18,4),
    rounding_tolerance_abs DECIMAL(18,4),
    match_rule match_rule NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendors
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    tax_id VARCHAR(50),
    country_code VARCHAR(2),
    default_currency VARCHAR(3),
    payment_terms_id UUID REFERENCES payment_terms(id),
    default_bank_account_id UUID, -- FK added later
    tolerance_profile_id UUID REFERENCES tolerance_profiles(id),
    requires_po BOOLEAN DEFAULT TRUE,
    is_blocked_for_payment BOOLEAN DEFAULT FALSE,
    w9_on_file BOOLEAN,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendor Bank Accounts
CREATE TABLE vendor_bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    bank_name VARCHAR(255) NOT NULL,
    iban VARCHAR(50),
    swift_bic VARCHAR(20),
    account_number_masked VARCHAR(50) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key for default_bank_account_id
ALTER TABLE vendors ADD FOREIGN KEY (default_bank_account_id) REFERENCES vendor_bank_accounts(id);

-- Items
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    uom VARCHAR(20) NOT NULL,
    tax_class_id UUID,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tax Rates
CREATE TABLE tax_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL,
    rate_percent DECIMAL(9,6) NOT NULL,
    valid_from DATE NOT NULL,
    valid_to DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization Entities
CREATE TABLE org_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legal_name VARCHAR(255) NOT NULL,
    tax_id VARCHAR(50) NOT NULL,
    address_lines JSONB NOT NULL,
    default_currency VARCHAR(3) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ship To Sites
CREATE TABLE ship_to_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_entity_id UUID NOT NULL REFERENCES org_entities(id),
    name VARCHAR(255) NOT NULL,
    address_lines JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cost Centers
CREATE TABLE cost_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- UOM Conversions
CREATE TABLE uom_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(id),
    from_uom VARCHAR(20) NOT NULL,
    to_uom VARCHAR(20) NOT NULL,
    factor DECIMAL(18,9) NOT NULL,
    valid_from DATE NOT NULL,
    valid_to DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- PURCHASE ORDERS
-- ================================================================

-- PO Headers
CREATE TABLE po_headers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number VARCHAR(50) NOT NULL UNIQUE,
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    po_type po_type NOT NULL,
    parent_po_id UUID REFERENCES po_headers(id),
    order_date DATE NOT NULL,
    currency VARCHAR(3) NOT NULL,
    bill_to_id UUID NOT NULL REFERENCES org_entities(id),
    ship_to_id UUID NOT NULL REFERENCES ship_to_sites(id),
    payment_terms_id UUID NOT NULL REFERENCES payment_terms(id),
    expected_match_rule match_rule,
    status po_status NOT NULL,
    buyer_user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PO Lines
CREATE TABLE po_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID NOT NULL REFERENCES po_headers(id),
    line_no INTEGER NOT NULL,
    item_id UUID REFERENCES items(id),
    description TEXT NOT NULL,
    uom VARCHAR(20) NOT NULL,
    qty_ordered DECIMAL(18,6) NOT NULL,
    unit_price DECIMAL(18,4) NOT NULL,
    tax_rate_id UUID NOT NULL REFERENCES tax_rates(id),
    cost_center VARCHAR(50),
    project_code VARCHAR(50),
    gl_account VARCHAR(50),
    need_by_date DATE,
    status VARCHAR(50) NOT NULL,
    allow_over_receipt_pct DECIMAL(7,4),
    allow_over_invoice_pct DECIMAL(7,4),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- GOODS RECEIPTS
-- ================================================================

-- GR Headers
CREATE TABLE gr_headers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gr_number VARCHAR(50) NOT NULL UNIQUE,
    po_id UUID NOT NULL REFERENCES po_headers(id),
    receipt_date DATE NOT NULL,
    received_by_user_id UUID REFERENCES users(id),
    status gr_status NOT NULL,
    reference VARCHAR(255),
    carrier VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- GR Lines
CREATE TABLE gr_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gr_id UUID NOT NULL REFERENCES gr_headers(id),
    po_line_id UUID NOT NULL REFERENCES po_lines(id),
    qty_received DECIMAL(18,6) NOT NULL,
    qty_rejected DECIMAL(18,6),
    uom VARCHAR(20) NOT NULL,
    storage_location VARCHAR(100),
    reject_reason_code VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- SERVICE ENTRY SHEETS
-- ================================================================

-- SES Headers
CREATE TABLE ses_headers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID NOT NULL REFERENCES po_headers(id),
    service_period_start DATE,
    service_period_end DATE,
    approved_by_user_id UUID REFERENCES users(id),
    status gr_status NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SES Lines
CREATE TABLE ses_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ses_id UUID NOT NULL REFERENCES ses_headers(id),
    po_line_id UUID NOT NULL REFERENCES po_lines(id),
    amount_accepted DECIMAL(18,4) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INVOICES
-- ================================================================

-- Invoice Headers
CREATE TABLE invoice_headers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type invoice_type NOT NULL,
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    invoice_number VARCHAR(100) NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    currency VARCHAR(3) NOT NULL,
    home_currency VARCHAR(3),
    fx_rate DECIMAL(18,8),
    subtotal DECIMAL(18,4) NOT NULL,
    discount_total DECIMAL(18,4),
    tax_total DECIMAL(18,4) NOT NULL,
    shipping_total DECIMAL(18,4),
    other_charges_total DECIMAL(18,4),
    withholding_tax_total DECIMAL(18,4),
    rounding_diff DECIMAL(18,4),
    total DECIMAL(18,4) NOT NULL,
    paid_amount DECIMAL(18,4) DEFAULT 0,
    payment_terms_id UUID NOT NULL REFERENCES payment_terms(id),
    bill_to_id UUID NOT NULL REFERENCES org_entities(id),
    ship_to_id UUID REFERENCES ship_to_sites(id),
    vendor_bank_account_id UUID REFERENCES vendor_bank_accounts(id),
    vendor_name_snapshot VARCHAR(255) NOT NULL,
    vendor_tax_id_snapshot VARCHAR(50) NOT NULL,
    vendor_address_snapshot JSONB NOT NULL,
    terms_text TEXT,
    tax_point_date DATE,
    po_numbers_cached TEXT[],
    tax_inclusive BOOLEAN DEFAULT FALSE,
    tax_treatment_code tax_treatment_code,
    self_billed BOOLEAN DEFAULT FALSE,
    early_pay_discount_offered_percent DECIMAL(7,4),
    early_pay_discount_deadline DATE,
    early_pay_discount_taken_amount DECIMAL(18,4),
    prepayment_reference VARCHAR(255),
    references_invoice_id UUID REFERENCES invoice_headers(id),
    revision INTEGER DEFAULT 1,
    supersedes_invoice_id UUID REFERENCES invoice_headers(id),
    fingerprint_sha256 VARCHAR(64),
    status invoice_status NOT NULL,
    match_status match_status NOT NULL DEFAULT 'not_matched',
    hold_reason TEXT,
    hold_reason_code hold_reason_code,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    UNIQUE(vendor_id, invoice_number)
);

-- Invoice Lines
CREATE TABLE invoice_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoice_headers(id),
    line_no INTEGER NOT NULL,
    description TEXT NOT NULL,
    item_id UUID REFERENCES items(id),
    uom VARCHAR(20),
    qty DECIMAL(18,6),
    unit_price DECIMAL(18,4),
    discount_percent DECIMAL(7,4),
    discount_amount DECIMAL(18,4),
    extended_amount DECIMAL(18,4),
    net_amount DECIMAL(18,4) NOT NULL,
    tax_rate_id UUID REFERENCES tax_rates(id),
    tax_amount DECIMAL(18,4),
    line_total DECIMAL(18,4) NOT NULL,
    cost_center VARCHAR(50),
    project_code VARCHAR(50),
    gl_account VARCHAR(50),
    po_line_id UUID REFERENCES po_lines(id),
    gr_line_id UUID REFERENCES gr_lines(id),
    ses_line_id UUID REFERENCES ses_lines(id),
    orig_uom VARCHAR(20),
    normalized_qty DECIMAL(18,6),
    normalized_unit_price DECIMAL(18,6),
    service_period_start DATE,
    service_period_end DATE,
    po_number_snapshot VARCHAR(50),
    po_line_no_snapshot INTEGER,
    gr_number_snapshot VARCHAR(50),
    gr_line_no_snapshot INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (NOT (gr_line_id IS NOT NULL AND ses_line_id IS NOT NULL))
);

-- Invoice Line Taxes
CREATE TABLE invoice_line_taxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_line_id UUID NOT NULL REFERENCES invoice_lines(id),
    tax_rate_id UUID NOT NULL REFERENCES tax_rates(id),
    base_amount DECIMAL(18,4) NOT NULL,
    tax_amount DECIMAL(18,4) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoice Line Distributions
CREATE TABLE invoice_line_distributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_line_id UUID NOT NULL REFERENCES invoice_lines(id),
    cost_center VARCHAR(50) NOT NULL,
    gl_account VARCHAR(50) NOT NULL,
    project_code VARCHAR(50),
    amount DECIMAL(18,4) NOT NULL,
    percent DECIMAL(7,4),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoice Line Receipts
CREATE TABLE invoice_line_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_line_id UUID NOT NULL REFERENCES invoice_lines(id),
    gr_line_id UUID REFERENCES gr_lines(id),
    ses_line_id UUID REFERENCES ses_lines(id),
    qty_applied DECIMAL(18,6),
    amount_applied DECIMAL(18,4),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (gr_line_id IS NOT NULL OR ses_line_id IS NOT NULL)
);

-- ================================================================
-- CROSS-CUTTING OPERATIONS
-- ================================================================

-- Match Results
CREATE TABLE match_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoice_headers(id),
    invoice_line_id UUID REFERENCES invoice_lines(id),
    level VARCHAR(50) NOT NULL,
    rule_applied VARCHAR(50) NOT NULL,
    matched_po_line_id UUID REFERENCES po_lines(id),
    matched_gr_line_id UUID REFERENCES gr_lines(id),
    matched_ses_line_id UUID REFERENCES ses_lines(id),
    qty_variance DECIMAL(18,6),
    price_variance DECIMAL(18,6),
    amount_variance DECIMAL(18,4),
    within_tolerance BOOLEAN NOT NULL,
    tolerance_profile_id UUID REFERENCES tolerance_profiles(id),
    explanation_code VARCHAR(100) NOT NULL,
    at TIMESTAMPTZ DEFAULT NOW()
);

-- Attachments
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_type doc_type NOT NULL,
    doc_id UUID NOT NULL,
    filename VARCHAR(255) NOT NULL,
    media_type VARCHAR(100) NOT NULL,
    storage_url TEXT NOT NULL,
    source VARCHAR(100) NOT NULL,
    sha256 VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Events
CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_type doc_type NOT NULL,
    doc_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    by_user_id UUID REFERENCES users(id),
    at TIMESTAMPTZ DEFAULT NOW(),
    payload_json JSONB
);

-- Source Files
CREATE TABLE source_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255) NOT NULL,
    media_type VARCHAR(100) NOT NULL,
    storage_url TEXT NOT NULL,
    sha256 VARCHAR(64) NOT NULL,
    extracted_json JSONB,
    ocr_confidence DECIMAL(5,4),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Approver Groups
CREATE TABLE approver_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Approver Group Members
CREATE TABLE approver_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES approver_groups(id),
    user_id UUID NOT NULL REFERENCES users(id),
    level INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Approval Policies
CREATE TABLE approval_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    priority INTEGER NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    vendor_id UUID REFERENCES vendors(id),
    currency VARCHAR(3),
    min_amount DECIMAL(18,4),
    max_amount DECIMAL(18,4),
    non_po_only BOOLEAN DEFAULT FALSE,
    match_json JSONB,
    approver_group_id UUID NOT NULL REFERENCES approver_groups(id),
    sequence INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Approvals
CREATE TABLE approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_type doc_type NOT NULL,
    doc_id UUID NOT NULL,
    step INTEGER NOT NULL,
    status workflow_status NOT NULL,
    assigned_to UUID REFERENCES users(id),
    note TEXT,
    acted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- External References
CREATE TABLE external_refs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_type doc_type NOT NULL,
    doc_id UUID NOT NULL,
    system_code VARCHAR(50) NOT NULL,
    external_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Work Items
CREATE TABLE work_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_type doc_type NOT NULL,
    doc_id UUID NOT NULL,
    stage work_stage NOT NULL,
    status work_item_status NOT NULL,
    priority INTEGER DEFAULT 3,
    assigned_to_user_id UUID REFERENCES users(id),
    assigned_to_agent_code VARCHAR(100),
    due_at TIMESTAMPTZ,
    result_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Runs
CREATE TABLE agent_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_code VARCHAR(100) NOT NULL,
    work_item_id UUID NOT NULL REFERENCES work_items(id),
    input_json JSONB NOT NULL,
    output_json JSONB,
    started_at TIMESTAMPTZ NOT NULL,
    finished_at TIMESTAMPTZ,
    success BOOLEAN,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);