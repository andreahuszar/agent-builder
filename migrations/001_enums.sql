-- 001_enums.sql - Create ENUM types for the invoice processing system

-- Purchase Order Status
CREATE TYPE po_status AS ENUM (
    'draft',
    'approved',
    'closed',
    'canceled'
);

-- Purchase Order Type
CREATE TYPE po_type AS ENUM (
    'standard',
    'blanket',
    'service',
    'release'
);

-- Goods Receipt Status
CREATE TYPE gr_status AS ENUM (
    'posted',
    'reversed'
);

-- Invoice Type
CREATE TYPE invoice_type AS ENUM (
    'invoice',
    'credit_memo',
    'debit_memo'
);

-- Invoice Status
CREATE TYPE invoice_status AS ENUM (
    'draft',
    'approved',
    'posted',
    'paid',
    'void'
);

-- Match Status
CREATE TYPE match_status AS ENUM (
    'not_matched',
    'matched',
    'within_tolerance',
    'exception'
);

-- Document Type
CREATE TYPE doc_type AS ENUM (
    'PO',
    'GR',
    'INV',
    'SES'
);

-- Workflow Status
CREATE TYPE workflow_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'skipped'
);

-- Match Rule
CREATE TYPE match_rule AS ENUM (
    '2-way-PO',
    '2-way-GR',
    '3-way'
);

-- Hold Reason Code
CREATE TYPE hold_reason_code AS ENUM (
    'MATCH',
    'POLICY',
    'COMPLIANCE',
    'VENDOR_CHANGE',
    'TAX'
);

-- Tax Treatment Code
CREATE TYPE tax_treatment_code AS ENUM (
    'STANDARD',
    'ZERO_RATED',
    'EXEMPT',
    'REVERSE_CHARGE',
    'SELF_BILLED'
);

-- Work Stage
CREATE TYPE work_stage AS ENUM (
    'ingest',
    'extract_index',
    'match',
    'non_po',
    'post'
);

-- Work Item Status
CREATE TYPE work_item_status AS ENUM (
    'queued',
    'in_progress',
    'done',
    'blocked'
);