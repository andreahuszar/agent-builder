-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."approval_status" AS ENUM ('not_required', 'pending', 'in_progress', 'approved', 'rejected', 'escalated');

-- CreateEnum
CREATE TYPE "public"."doc_type" AS ENUM ('PO', 'GR', 'INV', 'SES');

-- CreateEnum
CREATE TYPE "public"."gr_status" AS ENUM ('posted', 'reversed');

-- CreateEnum
CREATE TYPE "public"."hold_reason_code" AS ENUM ('MATCH', 'POLICY', 'COMPLIANCE', 'VENDOR_CHANGE', 'TAX');

-- CreateEnum
CREATE TYPE "public"."invoice_status" AS ENUM ('draft', 'processing', 'validating', 'requires_review', 'in_approval', 'pending_approval', 'approved', 'ready_for_payment', 'approved_ready_for_payment', 'posted', 'paid', 'void', 'on_hold');

-- CreateEnum
CREATE TYPE "public"."invoice_type" AS ENUM ('invoice', 'credit_memo', 'debit_memo');

-- CreateEnum
CREATE TYPE "public"."match_rule" AS ENUM ('2-way-PO', '2-way-GR', '3-way');

-- CreateEnum
CREATE TYPE "public"."match_status" AS ENUM ('not_matched', 'non_po', 'matched', 'within_tolerance', 'exception');

-- CreateEnum
CREATE TYPE "public"."po_status" AS ENUM ('draft', 'approved', 'closed', 'canceled');

-- CreateEnum
CREATE TYPE "public"."po_type" AS ENUM ('standard', 'blanket', 'service', 'release');

-- CreateEnum
CREATE TYPE "public"."tax_treatment_code" AS ENUM ('STANDARD', 'ZERO_RATED', 'EXEMPT', 'REVERSE_CHARGE', 'SELF_BILLED');

-- CreateEnum
CREATE TYPE "public"."work_item_status" AS ENUM ('queued', 'in_progress', 'done', 'blocked');

-- CreateEnum
CREATE TYPE "public"."work_stage" AS ENUM ('ingest', 'extract_index', 'match', 'non_po', 'post');

-- CreateEnum
CREATE TYPE "public"."workflow_status" AS ENUM ('pending', 'approved', 'rejected', 'skipped');

-- CreateEnum
CREATE TYPE "public"."validation_category" AS ENUM ('financial', 'process', 'compliance', 'risk', 'data_quality');

-- CreateEnum
CREATE TYPE "public"."validation_rule_type" AS ENUM ('required_field', 'amount_variance', 'date_consistency', 'tax_calculation', 'duplicate_detection', 'vendor_verification', 'po_matching', 'receipt_matching', 'budget_impact', 'approval_limit', 'custom');

-- CreateEnum
CREATE TYPE "public"."validation_severity" AS ENUM ('error', 'warning', 'info');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."agent_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agent_code" VARCHAR(100) NOT NULL,
    "work_item_id" UUID NOT NULL,
    "input_json" JSONB NOT NULL,
    "output_json" JSONB,
    "started_at" TIMESTAMPTZ(6) NOT NULL,
    "finished_at" TIMESTAMPTZ(6),
    "success" BOOLEAN,
    "error" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."approval_policies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "priority" INTEGER NOT NULL,
    "active" BOOLEAN DEFAULT true,
    "vendor_id" UUID,
    "currency" VARCHAR(3),
    "min_amount" DECIMAL(18,4),
    "max_amount" DECIMAL(18,4),
    "non_po_only" BOOLEAN DEFAULT false,
    "match_json" JSONB,
    "approver_group_id" UUID NOT NULL,
    "sequence" INTEGER DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."approvals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "doc_type" "public"."doc_type" NOT NULL,
    "doc_id" UUID NOT NULL,
    "step" INTEGER NOT NULL,
    "status" "public"."workflow_status" NOT NULL,
    "assigned_to" UUID,
    "note" TEXT,
    "acted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."approver_group_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "group_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "level" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approver_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."approver_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approver_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "doc_type" "public"."doc_type" NOT NULL,
    "doc_id" UUID NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "media_type" VARCHAR(100) NOT NULL,
    "storage_url" TEXT NOT NULL,
    "source" VARCHAR(100) NOT NULL,
    "sha256" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "doc_type" "public"."doc_type" NOT NULL,
    "doc_id" UUID NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "by_user_id" UUID,
    "at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "payload_json" JSONB,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."cost_centers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."external_refs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "doc_type" "public"."doc_type" NOT NULL,
    "doc_id" UUID NOT NULL,
    "system_code" VARCHAR(50) NOT NULL,
    "external_id" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_refs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."gr_headers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gr_number" VARCHAR(50) NOT NULL,
    "po_id" UUID NOT NULL,
    "receipt_date" DATE NOT NULL,
    "received_by_user_id" UUID,
    "status" "public"."gr_status" NOT NULL,
    "reference" VARCHAR(255),
    "carrier" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gr_headers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."gr_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gr_id" UUID NOT NULL,
    "po_line_id" UUID NOT NULL,
    "qty_received" DECIMAL(18,6) NOT NULL,
    "qty_rejected" DECIMAL(18,6),
    "uom" VARCHAR(20) NOT NULL,
    "storage_location" VARCHAR(100),
    "reject_reason_code" VARCHAR(50),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gr_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoice_headers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "public"."invoice_type" NOT NULL,
    "vendor_id" UUID NOT NULL,
    "invoice_number" VARCHAR(100) NOT NULL,
    "invoice_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "home_currency" VARCHAR(3),
    "fx_rate" DECIMAL(18,8),
    "subtotal" DECIMAL(18,4) NOT NULL,
    "discount_total" DECIMAL(18,4),
    "tax_total" DECIMAL(18,4) NOT NULL,
    "shipping_total" DECIMAL(18,4),
    "other_charges_total" DECIMAL(18,4),
    "withholding_tax_total" DECIMAL(18,4),
    "rounding_diff" DECIMAL(18,4),
    "total" DECIMAL(18,4) NOT NULL,
    "paid_amount" DECIMAL(18,4) DEFAULT 0,
    "payment_terms_id" UUID NOT NULL,
    "bill_to_id" UUID NOT NULL,
    "ship_to_id" UUID,
    "vendor_bank_account_id" UUID,
    "vendor_name_snapshot" VARCHAR(255) NOT NULL,
    "vendor_tax_id_snapshot" VARCHAR(50) NOT NULL,
    "vendor_address_snapshot" JSONB NOT NULL,
    "terms_text" TEXT,
    "tax_point_date" DATE,
    "po_numbers_cached" TEXT[],
    "tax_inclusive" BOOLEAN DEFAULT false,
    "tax_treatment_code" "public"."tax_treatment_code",
    "self_billed" BOOLEAN DEFAULT false,
    "early_pay_discount_offered_percent" DECIMAL(7,4),
    "early_pay_discount_deadline" DATE,
    "early_pay_discount_taken_amount" DECIMAL(18,4),
    "prepayment_reference" VARCHAR(255),
    "references_invoice_id" UUID,
    "revision" INTEGER DEFAULT 1,
    "supersedes_invoice_id" UUID,
    "fingerprint_sha256" VARCHAR(64),
    "status" "public"."invoice_status" NOT NULL,
    "match_status" "public"."match_status" NOT NULL DEFAULT 'not_matched',
    "hold_reason" TEXT,
    "hold_reason_code" "public"."hold_reason_code",
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,
    "approval_status" "public"."approval_status" DEFAULT 'not_required',
    "gr_numbers_cached" TEXT[],
    "po_id" UUID,
    "bill_to_snapshot" JSONB,
    "ship_to_snapshot" JSONB,
    "assigned_to_user_id" UUID,
    "helpdesk_ticket_ref" VARCHAR(50),
    "validation_errors" JSONB DEFAULT '[]',
    "validation_warnings" JSONB DEFAULT '[]',
    "confidence_score" DECIMAL(5,2) DEFAULT 100.00,
    "fraud_risk_score" DECIMAL(5,2) DEFAULT 0.00,
    "processing_started_at" TIMESTAMPTZ(6),
    "processing_completed_at" TIMESTAMPTZ(6),
    "ledger" VARCHAR(50) DEFAULT 'Accounts Payable',
    "tax_rate_percent" DECIMAL(9,6),
    "cost_center" VARCHAR(100),
    "cost_center_name" VARCHAR(255),
    "gl_code" VARCHAR(50),
    "department" VARCHAR(100),
    "accounting_notes" TEXT,
    "ai_classification_confidence" DECIMAL(3,2),
    "ai_classification_reasoning" TEXT,
    "extraction_field_confidences" JSONB DEFAULT '{}',
    "is_manually_edited" JSONB DEFAULT '{}',
    "payment_method" VARCHAR(50),
    "payment_bank_details" JSONB,
    "extracted_total" DECIMAL(18,4),
    "total_discrepancy" DECIMAL(18,4),

    CONSTRAINT "invoice_headers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoice_line_distributions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_line_id" UUID NOT NULL,
    "cost_center" VARCHAR(50) NOT NULL,
    "gl_account" VARCHAR(50) NOT NULL,
    "project_code" VARCHAR(50),
    "amount" DECIMAL(18,4) NOT NULL,
    "percent" DECIMAL(7,4),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_line_distributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoice_line_receipts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_line_id" UUID NOT NULL,
    "gr_line_id" UUID,
    "ses_line_id" UUID,
    "qty_applied" DECIMAL(18,6),
    "amount_applied" DECIMAL(18,4),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_line_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoice_line_taxes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_line_id" UUID NOT NULL,
    "tax_rate_id" UUID NOT NULL,
    "base_amount" DECIMAL(18,4) NOT NULL,
    "tax_amount" DECIMAL(18,4) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_line_taxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoice_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_id" UUID NOT NULL,
    "line_no" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "item_id" UUID,
    "uom" VARCHAR(20),
    "qty" DECIMAL(18,6),
    "unit_price" DECIMAL(18,4),
    "discount_percent" DECIMAL(7,4),
    "discount_amount" DECIMAL(18,4),
    "extended_amount" DECIMAL(18,4),
    "net_amount" DECIMAL(18,4) NOT NULL,
    "tax_rate_id" UUID,
    "tax_amount" DECIMAL(18,4),
    "line_total" DECIMAL(18,4) NOT NULL,
    "cost_center" VARCHAR(50),
    "project_code" VARCHAR(50),
    "gl_account" VARCHAR(50),
    "po_line_id" UUID,
    "gr_line_id" UUID,
    "ses_line_id" UUID,
    "orig_uom" VARCHAR(20),
    "normalized_qty" DECIMAL(18,6),
    "normalized_unit_price" DECIMAL(18,6),
    "service_period_start" DATE,
    "service_period_end" DATE,
    "po_number_snapshot" VARCHAR(50),
    "po_line_no_snapshot" INTEGER,
    "gr_number_snapshot" VARCHAR(50),
    "gr_line_no_snapshot" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "tax_rate_percent" DECIMAL(9,6),

    CONSTRAINT "invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoice_status_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_id" UUID NOT NULL,
    "old_status" "public"."invoice_status",
    "new_status" "public"."invoice_status" NOT NULL,
    "changed_by" UUID,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sku" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "uom" VARCHAR(20) NOT NULL,
    "tax_class_id" UUID,
    "active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."match_results" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_id" UUID NOT NULL,
    "invoice_line_id" UUID,
    "level" VARCHAR(50) NOT NULL,
    "rule_applied" VARCHAR(50) NOT NULL,
    "matched_po_line_id" UUID,
    "matched_gr_line_id" UUID,
    "matched_ses_line_id" UUID,
    "qty_variance" DECIMAL(18,6),
    "price_variance" DECIMAL(18,6),
    "amount_variance" DECIMAL(18,4),
    "within_tolerance" BOOLEAN NOT NULL,
    "tolerance_profile_id" UUID,
    "explanation_code" VARCHAR(100) NOT NULL,
    "at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."org_entities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "legal_name" VARCHAR(255) NOT NULL,
    "tax_id" VARCHAR(50) NOT NULL,
    "address_lines" JSONB NOT NULL,
    "default_currency" VARCHAR(3) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payment_terms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "net_days" INTEGER NOT NULL,
    "discount_percent" DECIMAL(7,4),
    "discount_days" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."po_headers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "po_number" VARCHAR(50) NOT NULL,
    "vendor_id" UUID NOT NULL,
    "po_type" "public"."po_type" NOT NULL,
    "parent_po_id" UUID,
    "order_date" DATE NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "bill_to_id" UUID NOT NULL,
    "ship_to_id" UUID NOT NULL,
    "payment_terms_id" UUID NOT NULL,
    "expected_match_rule" "public"."match_rule",
    "status" "public"."po_status" NOT NULL,
    "buyer_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "subtotal" DECIMAL(18,4),
    "tax_total" DECIMAL(18,4),
    "total" DECIMAL(18,4),

    CONSTRAINT "po_headers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."po_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "po_id" UUID NOT NULL,
    "line_no" INTEGER NOT NULL,
    "item_id" UUID,
    "description" TEXT NOT NULL,
    "uom" VARCHAR(20) NOT NULL,
    "qty_ordered" DECIMAL(18,6) NOT NULL,
    "unit_price" DECIMAL(18,4) NOT NULL,
    "tax_rate_id" UUID NOT NULL,
    "cost_center" VARCHAR(50),
    "project_code" VARCHAR(50),
    "gl_account" VARCHAR(50),
    "need_by_date" DATE,
    "status" VARCHAR(50) NOT NULL,
    "allow_over_receipt_pct" DECIMAL(7,4),
    "allow_over_invoice_pct" DECIMAL(7,4),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "po_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."projects" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ses_headers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "po_id" UUID NOT NULL,
    "service_period_start" DATE,
    "service_period_end" DATE,
    "approved_by_user_id" UUID,
    "status" "public"."gr_status" NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ses_headers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ses_lines" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ses_id" UUID NOT NULL,
    "po_line_id" UUID NOT NULL,
    "amount_accepted" DECIMAL(18,4) NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ses_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ship_to_sites" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_entity_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "address_lines" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ship_to_sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."source_files" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "filename" VARCHAR(255) NOT NULL,
    "media_type" VARCHAR(100) NOT NULL,
    "storage_url" TEXT NOT NULL,
    "sha256" VARCHAR(64) NOT NULL,
    "extracted_json" JSONB,
    "ocr_confidence" DECIMAL(5,4),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tax_rates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "rate_percent" DECIMAL(9,6) NOT NULL,
    "valid_from" DATE NOT NULL,
    "valid_to" DATE,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tolerance_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "price_tolerance_pct" DECIMAL(7,4) NOT NULL,
    "qty_tolerance_pct" DECIMAL(7,4) NOT NULL,
    "amount_tolerance_abs" DECIMAL(18,4) NOT NULL,
    "tax_tolerance_abs" DECIMAL(18,4),
    "rounding_tolerance_abs" DECIMAL(18,4),
    "match_rule" "public"."match_rule" NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tolerance_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."uom_conversions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "item_id" UUID NOT NULL,
    "from_uom" VARCHAR(20) NOT NULL,
    "to_uom" VARCHAR(20) NOT NULL,
    "factor" DECIMAL(18,9) NOT NULL,
    "valid_from" DATE NOT NULL,
    "valid_to" DATE,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uom_conversions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vendor_bank_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "vendor_id" UUID NOT NULL,
    "bank_name" VARCHAR(255) NOT NULL,
    "iban" VARCHAR(50),
    "swift_bic" VARCHAR(20),
    "account_number_masked" VARCHAR(50) NOT NULL,
    "is_default" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "account_name" VARCHAR(255),
    "account_number" VARCHAR(100),
    "sort_code" VARCHAR(20),
    "routing_number" VARCHAR(20),

    CONSTRAINT "vendor_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vendors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "tax_id" VARCHAR(50),
    "country_code" VARCHAR(2),
    "default_currency" VARCHAR(3),
    "payment_terms_id" UUID,
    "default_bank_account_id" UUID,
    "tolerance_profile_id" UUID,
    "requires_po" BOOLEAN DEFAULT true,
    "is_blocked_for_payment" BOOLEAN DEFAULT false,
    "w9_on_file" BOOLEAN,
    "active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "is_verified" BOOLEAN DEFAULT false,
    "preferred_payment_method" VARCHAR(50),

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."work_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "doc_type" "public"."doc_type" NOT NULL,
    "doc_id" UUID NOT NULL,
    "stage" "public"."work_stage" NOT NULL,
    "status" "public"."work_item_status" NOT NULL,
    "priority" INTEGER DEFAULT 3,
    "assigned_to_user_id" UUID,
    "assigned_to_agent_code" VARCHAR(100),
    "due_at" TIMESTAMPTZ(6),
    "result_json" JSONB,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoice_validations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_id" UUID NOT NULL,
    "validation_rule_id" UUID NOT NULL,
    "field_name" VARCHAR(100),
    "line_number" INTEGER,
    "severity" "public"."validation_severity" NOT NULL,
    "category" "public"."validation_category" NOT NULL,
    "is_valid" BOOLEAN NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB DEFAULT '{}',
    "expected_value" TEXT,
    "actual_value" TEXT,
    "variance_amount" DECIMAL(18,4),
    "variance_percent" DECIMAL(7,4),
    "is_resolved" BOOLEAN DEFAULT false,
    "resolved_by" UUID,
    "resolved_at" TIMESTAMPTZ(6),
    "resolution_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_validations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."schema_migrations" (
    "id" SERIAL NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "applied_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "execution_time_ms" INTEGER,
    "success" BOOLEAN DEFAULT true,
    "error_message" TEXT,
    "rolled_back" BOOLEAN DEFAULT false,
    "rolled_back_at" TIMESTAMPTZ(6),

    CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."test_migrations" (
    "id" VARCHAR(30) NOT NULL DEFAULT concat('test_', to_char(now(), 'YYYYMMDDHH24MISS'::text), '_', substr(md5((random())::text), 1, 6)),
    "name" VARCHAR(255) NOT NULL,
    "value" TEXT,
    "createdAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_migrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."validation_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "rule_type" "public"."validation_rule_type" NOT NULL,
    "category" "public"."validation_category" NOT NULL,
    "severity" "public"."validation_severity" NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "config" JSONB DEFAULT '{}',
    "tolerance_percent" DECIMAL(7,4),
    "tolerance_amount" DECIMAL(18,4),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "validation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."validation_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_id" UUID NOT NULL,
    "run_type" VARCHAR(50) NOT NULL,
    "triggered_by" UUID,
    "total_rules_checked" INTEGER NOT NULL DEFAULT 0,
    "errors_found" INTEGER NOT NULL DEFAULT 0,
    "warnings_found" INTEGER NOT NULL DEFAULT 0,
    "info_found" INTEGER NOT NULL DEFAULT 0,
    "confidence_score" DECIMAL(5,2),
    "fraud_risk_score" DECIMAL(5,2),
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "duration_ms" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "validation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "idx_agent_runs_agent_code" ON "public"."agent_runs"("agent_code");

-- CreateIndex
CREATE INDEX "idx_agent_runs_started_at" ON "public"."agent_runs"("started_at");

-- CreateIndex
CREATE INDEX "idx_agent_runs_work_item_id" ON "public"."agent_runs"("work_item_id");

-- CreateIndex
CREATE INDEX "idx_approval_policies_active" ON "public"."approval_policies"("active");

-- CreateIndex
CREATE INDEX "idx_approval_policies_priority" ON "public"."approval_policies"("priority");

-- CreateIndex
CREATE INDEX "idx_approval_policies_vendor_id" ON "public"."approval_policies"("vendor_id");

-- CreateIndex
CREATE INDEX "idx_approvals_doc_type_doc_id" ON "public"."approvals"("doc_type", "doc_id");

-- CreateIndex
CREATE INDEX "idx_approvals_status" ON "public"."approvals"("status");

-- CreateIndex
CREATE INDEX "idx_approver_group_members_group_id" ON "public"."approver_group_members"("group_id");

-- CreateIndex
CREATE INDEX "idx_approver_group_members_group_level" ON "public"."approver_group_members"("group_id", "level");

-- CreateIndex
CREATE INDEX "idx_approver_group_members_user_id" ON "public"."approver_group_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_group_level" ON "public"."approver_group_members"("group_id", "level");

-- CreateIndex
CREATE UNIQUE INDEX "unique_group_member" ON "public"."approver_group_members"("group_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "approver_groups_name_key" ON "public"."approver_groups"("name");

-- CreateIndex
CREATE INDEX "idx_attachments_doc_type_doc_id" ON "public"."attachments"("doc_type", "doc_id");

-- CreateIndex
CREATE INDEX "idx_attachments_sha256" ON "public"."attachments"("sha256");

-- CreateIndex
CREATE INDEX "idx_audit_events_at" ON "public"."audit_events"("at");

-- CreateIndex
CREATE INDEX "idx_audit_events_doc_type_doc_id" ON "public"."audit_events"("doc_type", "doc_id");

-- CreateIndex
CREATE INDEX "idx_audit_events_event_type" ON "public"."audit_events"("event_type");

-- CreateIndex
CREATE INDEX "idx_cost_centers_code" ON "public"."cost_centers"("code");

-- CreateIndex
CREATE INDEX "idx_external_refs_doc_type_doc_id" ON "public"."external_refs"("doc_type", "doc_id");

-- CreateIndex
CREATE INDEX "idx_external_refs_external_id" ON "public"."external_refs"("external_id");

-- CreateIndex
CREATE INDEX "idx_external_refs_system_code" ON "public"."external_refs"("system_code");

-- CreateIndex
CREATE UNIQUE INDEX "gr_headers_gr_number_key" ON "public"."gr_headers"("gr_number");

-- CreateIndex
CREATE INDEX "idx_gr_headers_po_id" ON "public"."gr_headers"("po_id");

-- CreateIndex
CREATE INDEX "idx_gr_headers_receipt_date" ON "public"."gr_headers"("receipt_date");

-- CreateIndex
CREATE INDEX "idx_gr_headers_status" ON "public"."gr_headers"("status");

-- CreateIndex
CREATE INDEX "idx_gr_headers_gr_number" ON "public"."gr_headers"("gr_number");

-- CreateIndex
CREATE INDEX "idx_gr_lines_gr_id" ON "public"."gr_lines"("gr_id");

-- CreateIndex
CREATE INDEX "idx_gr_lines_po_line_id" ON "public"."gr_lines"("po_line_id");

-- CreateIndex
CREATE INDEX "idx_invoice_headers_due_date" ON "public"."invoice_headers"("due_date");

-- CreateIndex
CREATE INDEX "idx_invoice_headers_invoice_date" ON "public"."invoice_headers"("invoice_date");

-- CreateIndex
CREATE INDEX "idx_invoice_headers_match_status" ON "public"."invoice_headers"("match_status");

-- CreateIndex
CREATE INDEX "idx_invoice_headers_po_numbers_cached" ON "public"."invoice_headers" USING GIN ("po_numbers_cached");

-- CreateIndex
CREATE INDEX "idx_invoice_headers_vendor_id" ON "public"."invoice_headers"("vendor_id");

-- CreateIndex
CREATE INDEX "idx_invoice_headers_vendor_id_invoice_date" ON "public"."invoice_headers"("vendor_id", "invoice_date");

-- CreateIndex
CREATE INDEX "idx_invoice_headers_status" ON "public"."invoice_headers"("status");

-- CreateIndex
CREATE INDEX "idx_invoice_date_status" ON "public"."invoice_headers"("invoice_date", "status");

-- CreateIndex
CREATE INDEX "idx_invoice_headers_assigned_to" ON "public"."invoice_headers"("assigned_to_user_id");

-- CreateIndex
CREATE INDEX "idx_invoice_headers_confidence" ON "public"."invoice_headers"("confidence_score");

-- CreateIndex
CREATE INDEX "idx_invoice_headers_created_at" ON "public"."invoice_headers"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_invoice_headers_gr_numbers_cached" ON "public"."invoice_headers" USING GIN ("gr_numbers_cached");

-- CreateIndex
CREATE INDEX "idx_invoice_headers_po_numbers" ON "public"."invoice_headers" USING GIN ("po_numbers_cached");

-- CreateIndex
CREATE INDEX "idx_invoice_vendor_status" ON "public"."invoice_headers"("vendor_id", "status");

-- CreateIndex
CREATE INDEX "idx_invoice_headers_payment_method" ON "public"."invoice_headers"("payment_method");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_headers_vendor_id_invoice_number_key" ON "public"."invoice_headers"("vendor_id", "invoice_number");

-- CreateIndex
CREATE INDEX "idx_invoice_line_distributions_cost_center" ON "public"."invoice_line_distributions"("cost_center");

-- CreateIndex
CREATE INDEX "idx_invoice_line_distributions_gl_account" ON "public"."invoice_line_distributions"("gl_account");

-- CreateIndex
CREATE INDEX "idx_invoice_line_distributions_invoice_line_id" ON "public"."invoice_line_distributions"("invoice_line_id");

-- CreateIndex
CREATE INDEX "idx_invoice_line_receipts_gr_line_id" ON "public"."invoice_line_receipts"("gr_line_id");

-- CreateIndex
CREATE INDEX "idx_invoice_line_receipts_invoice_line_id" ON "public"."invoice_line_receipts"("invoice_line_id");

-- CreateIndex
CREATE INDEX "idx_invoice_line_receipts_ses_line_id" ON "public"."invoice_line_receipts"("ses_line_id");

-- CreateIndex
CREATE INDEX "idx_invoice_line_taxes_invoice_line_id" ON "public"."invoice_line_taxes"("invoice_line_id");

-- CreateIndex
CREATE INDEX "idx_invoice_lines_cost_center" ON "public"."invoice_lines"("cost_center");

-- CreateIndex
CREATE INDEX "idx_invoice_lines_gr_line_id" ON "public"."invoice_lines"("gr_line_id");

-- CreateIndex
CREATE INDEX "idx_invoice_lines_invoice_id_line_no" ON "public"."invoice_lines"("invoice_id", "line_no");

-- CreateIndex
CREATE INDEX "idx_invoice_lines_po_line_id" ON "public"."invoice_lines"("po_line_id");

-- CreateIndex
CREATE INDEX "idx_invoice_lines_project_code" ON "public"."invoice_lines"("project_code");

-- CreateIndex
CREATE INDEX "idx_invoice_lines_ses_line_id" ON "public"."invoice_lines"("ses_line_id");

-- CreateIndex
CREATE INDEX "idx_invoice_lines_invoice_id" ON "public"."invoice_lines"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_invoice_line_no" ON "public"."invoice_lines"("invoice_id", "line_no");

-- CreateIndex
CREATE INDEX "idx_invoice_status_history_invoice" ON "public"."invoice_status_history"("invoice_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_items_description" ON "public"."items"("description");

-- CreateIndex
CREATE INDEX "idx_items_sku" ON "public"."items"("sku");

-- CreateIndex
CREATE INDEX "idx_match_results_explanation_code" ON "public"."match_results"("explanation_code");

-- CreateIndex
CREATE INDEX "idx_match_results_invoice_id" ON "public"."match_results"("invoice_id");

-- CreateIndex
CREATE INDEX "idx_match_results_invoice_line_id" ON "public"."match_results"("invoice_line_id");

-- CreateIndex
CREATE INDEX "idx_match_results_within_tolerance" ON "public"."match_results"("within_tolerance");

-- CreateIndex
CREATE INDEX "idx_match_invoice_tolerance" ON "public"."match_results"("invoice_id", "within_tolerance");

-- CreateIndex
CREATE INDEX "idx_match_results_gr_line_id" ON "public"."match_results"("matched_gr_line_id");

-- CreateIndex
CREATE INDEX "idx_match_results_po_line_id" ON "public"."match_results"("matched_po_line_id");

-- CreateIndex
CREATE INDEX "idx_payment_terms_name" ON "public"."payment_terms"("name");

-- CreateIndex
CREATE UNIQUE INDEX "po_headers_po_number_key" ON "public"."po_headers"("po_number");

-- CreateIndex
CREATE INDEX "idx_po_headers_order_date" ON "public"."po_headers"("order_date");

-- CreateIndex
CREATE INDEX "idx_po_headers_status" ON "public"."po_headers"("status");

-- CreateIndex
CREATE INDEX "idx_po_headers_vendor_id" ON "public"."po_headers"("vendor_id");

-- CreateIndex
CREATE INDEX "idx_po_headers_po_number" ON "public"."po_headers"("po_number");

-- CreateIndex
CREATE INDEX "idx_po_vendor_status" ON "public"."po_headers"("vendor_id", "status");

-- CreateIndex
CREATE INDEX "idx_po_lines_item_id" ON "public"."po_lines"("item_id");

-- CreateIndex
CREATE INDEX "idx_po_lines_po_id" ON "public"."po_lines"("po_id");

-- CreateIndex
CREATE INDEX "idx_po_lines_po_id_line_no" ON "public"."po_lines"("po_id", "line_no");

-- CreateIndex
CREATE INDEX "idx_po_lines_status" ON "public"."po_lines"("status");

-- CreateIndex
CREATE UNIQUE INDEX "unique_po_line_no" ON "public"."po_lines"("po_id", "line_no");

-- CreateIndex
CREATE INDEX "idx_projects_code" ON "public"."projects"("code");

-- CreateIndex
CREATE INDEX "idx_ses_headers_po_id" ON "public"."ses_headers"("po_id");

-- CreateIndex
CREATE INDEX "idx_ses_headers_service_period" ON "public"."ses_headers"("service_period_start", "service_period_end");

-- CreateIndex
CREATE INDEX "idx_ses_headers_status" ON "public"."ses_headers"("status");

-- CreateIndex
CREATE INDEX "idx_ses_lines_po_line_id" ON "public"."ses_lines"("po_line_id");

-- CreateIndex
CREATE INDEX "idx_ses_lines_ses_id" ON "public"."ses_lines"("ses_id");

-- CreateIndex
CREATE INDEX "idx_ship_to_sites_org_entity_id" ON "public"."ship_to_sites"("org_entity_id");

-- CreateIndex
CREATE INDEX "idx_source_files_sha256" ON "public"."source_files"("sha256");

-- CreateIndex
CREATE INDEX "idx_tax_rates_code" ON "public"."tax_rates"("code");

-- CreateIndex
CREATE INDEX "idx_tax_rates_valid_from" ON "public"."tax_rates"("valid_from");

-- CreateIndex
CREATE INDEX "idx_tax_rates_valid_to" ON "public"."tax_rates"("valid_to");

-- CreateIndex
CREATE INDEX "idx_uom_conversions_from_to" ON "public"."uom_conversions"("from_uom", "to_uom");

-- CreateIndex
CREATE INDEX "idx_uom_conversions_item_id" ON "public"."uom_conversions"("item_id");

-- CreateIndex
CREATE INDEX "idx_uom_conversions_validity" ON "public"."uom_conversions"("valid_from", "valid_to");

-- CreateIndex
CREATE INDEX "idx_vendor_bank_accounts_is_default" ON "public"."vendor_bank_accounts"("is_default");

-- CreateIndex
CREATE INDEX "idx_vendor_bank_accounts_vendor_id" ON "public"."vendor_bank_accounts"("vendor_id");

-- CreateIndex
CREATE INDEX "idx_vendors_payment_terms_id" ON "public"."vendors"("payment_terms_id");

-- CreateIndex
CREATE INDEX "idx_vendors_tolerance_profile_id" ON "public"."vendors"("tolerance_profile_id");

-- CreateIndex
CREATE INDEX "idx_vendors_is_verified" ON "public"."vendors"("is_verified");

-- CreateIndex
CREATE INDEX "idx_vendors_active" ON "public"."vendors"("active");

-- CreateIndex
CREATE INDEX "idx_vendors_name" ON "public"."vendors"("name");

-- CreateIndex
CREATE INDEX "idx_vendors_requires_po" ON "public"."vendors"("requires_po");

-- CreateIndex
CREATE INDEX "idx_vendors_preferred_payment_method" ON "public"."vendors"("preferred_payment_method");

-- CreateIndex
CREATE INDEX "idx_work_items_assigned_to_agent_code" ON "public"."work_items"("assigned_to_agent_code");

-- CreateIndex
CREATE INDEX "idx_work_items_assigned_to_user_id" ON "public"."work_items"("assigned_to_user_id");

-- CreateIndex
CREATE INDEX "idx_work_items_due_at" ON "public"."work_items"("due_at");

-- CreateIndex
CREATE INDEX "idx_work_items_stage" ON "public"."work_items"("stage");

-- CreateIndex
CREATE INDEX "idx_work_items_status" ON "public"."work_items"("status");

-- CreateIndex
CREATE INDEX "idx_work_items_priority" ON "public"."work_items"("priority");

-- CreateIndex
CREATE INDEX "idx_invoice_validations_category" ON "public"."invoice_validations"("category");

-- CreateIndex
CREATE INDEX "idx_invoice_validations_invoice_id" ON "public"."invoice_validations"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "schema_migrations_filename_key" ON "public"."schema_migrations"("filename");

-- CreateIndex
CREATE INDEX "idx_schema_migrations_filename" ON "public"."schema_migrations"("filename");

-- CreateIndex
CREATE UNIQUE INDEX "validation_rules_code_key" ON "public"."validation_rules"("code");

-- CreateIndex
CREATE INDEX "idx_validation_runs_completed" ON "public"."validation_runs"("completed_at" DESC);

-- CreateIndex
CREATE INDEX "idx_validation_runs_invoice_id" ON "public"."validation_runs"("invoice_id");

-- AddForeignKey
ALTER TABLE "public"."agent_runs" ADD CONSTRAINT "agent_runs_work_item_id_fkey" FOREIGN KEY ("work_item_id") REFERENCES "public"."work_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."approval_policies" ADD CONSTRAINT "approval_policies_approver_group_id_fkey" FOREIGN KEY ("approver_group_id") REFERENCES "public"."approver_groups"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."approval_policies" ADD CONSTRAINT "approval_policies_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."approvals" ADD CONSTRAINT "approvals_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."approver_group_members" ADD CONSTRAINT "approver_group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."approver_groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."approver_group_members" ADD CONSTRAINT "approver_group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."audit_events" ADD CONSTRAINT "audit_events_by_user_id_fkey" FOREIGN KEY ("by_user_id") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."gr_headers" ADD CONSTRAINT "gr_headers_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "public"."po_headers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."gr_headers" ADD CONSTRAINT "gr_headers_received_by_user_id_fkey" FOREIGN KEY ("received_by_user_id") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."gr_lines" ADD CONSTRAINT "gr_lines_gr_id_fkey" FOREIGN KEY ("gr_id") REFERENCES "public"."gr_headers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."gr_lines" ADD CONSTRAINT "gr_lines_po_line_id_fkey" FOREIGN KEY ("po_line_id") REFERENCES "public"."po_lines"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."invoice_headers" ADD CONSTRAINT "invoice_headers_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."invoice_headers" ADD CONSTRAINT "invoice_headers_bill_to_id_fkey" FOREIGN KEY ("bill_to_id") REFERENCES "public"."org_entities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."invoice_headers" ADD CONSTRAINT "invoice_headers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."invoice_headers" ADD CONSTRAINT "invoice_headers_payment_terms_id_fkey" FOREIGN KEY ("payment_terms_id") REFERENCES "public"."payment_terms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."invoice_headers" ADD CONSTRAINT "invoice_headers_references_invoice_id_fkey" FOREIGN KEY ("references_invoice_id") REFERENCES "public"."invoice_headers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."invoice_headers" ADD CONSTRAINT "invoice_headers_ship_to_id_fkey" FOREIGN KEY ("ship_to_id") REFERENCES "public"."ship_to_sites"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."invoice_headers" ADD CONSTRAINT "invoice_headers_supersedes_invoice_id_fkey" FOREIGN KEY ("supersedes_invoice_id") REFERENCES "public"."invoice_headers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."invoice_headers" ADD CONSTRAINT "invoice_headers_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."invoice_headers" ADD CONSTRAINT "invoice_headers_vendor_bank_account_id_fkey" FOREIGN KEY ("vendor_bank_account_id") REFERENCES "public"."vendor_bank_accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."invoice_headers" ADD CONSTRAINT "invoice_headers_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."invoice_line_distributions" ADD CONSTRAINT "invoice_line_distributions_invoice_line_id_fkey" FOREIGN KEY ("invoice_line_id") REFERENCES "public"."invoice_lines"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."invoice_line_receipts" ADD CONSTRAINT "invoice_line_receipts_gr_line_id_fkey" FOREIGN KEY ("gr_line_id") REFERENCES "public"."gr_lines"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."invoice_line_receipts" ADD CONSTRAINT "invoice_line_receipts_invoice_line_id_fkey" FOREIGN KEY ("invoice_line_id") REFERENCES "public"."invoice_lines"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."invoice_line_receipts" ADD CONSTRAINT "invoice_line_receipts_ses_line_id_fkey" FOREIGN KEY ("ses_line_id") REFERENCES "public"."ses_lines"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."invoice_line_taxes" ADD CONSTRAINT "invoice_line_taxes_invoice_line_id_fkey" FOREIGN KEY ("invoice_line_id") REFERENCES "public"."invoice_lines"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."invoice_line_taxes" ADD CONSTRAINT "invoice_line_taxes_tax_rate_id_fkey" FOREIGN KEY ("tax_rate_id") REFERENCES "public"."tax_rates"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."invoice_lines" ADD CONSTRAINT "invoice_lines_gr_line_id_fkey" FOREIGN KEY ("gr_line_id") REFERENCES "public"."gr_lines"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."invoice_lines" ADD CONSTRAINT "invoice_lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice_headers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."invoice_lines" ADD CONSTRAINT "invoice_lines_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."invoice_lines" ADD CONSTRAINT "invoice_lines_po_line_id_fkey" FOREIGN KEY ("po_line_id") REFERENCES "public"."po_lines"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."invoice_lines" ADD CONSTRAINT "invoice_lines_ses_line_id_fkey" FOREIGN KEY ("ses_line_id") REFERENCES "public"."ses_lines"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."invoice_lines" ADD CONSTRAINT "invoice_lines_tax_rate_id_fkey" FOREIGN KEY ("tax_rate_id") REFERENCES "public"."tax_rates"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."invoice_status_history" ADD CONSTRAINT "invoice_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."invoice_status_history" ADD CONSTRAINT "invoice_status_history_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice_headers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."match_results" ADD CONSTRAINT "match_results_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice_headers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."match_results" ADD CONSTRAINT "match_results_invoice_line_id_fkey" FOREIGN KEY ("invoice_line_id") REFERENCES "public"."invoice_lines"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."match_results" ADD CONSTRAINT "match_results_matched_gr_line_id_fkey" FOREIGN KEY ("matched_gr_line_id") REFERENCES "public"."gr_lines"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."match_results" ADD CONSTRAINT "match_results_matched_po_line_id_fkey" FOREIGN KEY ("matched_po_line_id") REFERENCES "public"."po_lines"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."match_results" ADD CONSTRAINT "match_results_matched_ses_line_id_fkey" FOREIGN KEY ("matched_ses_line_id") REFERENCES "public"."ses_lines"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."match_results" ADD CONSTRAINT "match_results_tolerance_profile_id_fkey" FOREIGN KEY ("tolerance_profile_id") REFERENCES "public"."tolerance_profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."po_headers" ADD CONSTRAINT "po_headers_bill_to_id_fkey" FOREIGN KEY ("bill_to_id") REFERENCES "public"."org_entities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."po_headers" ADD CONSTRAINT "po_headers_buyer_user_id_fkey" FOREIGN KEY ("buyer_user_id") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."po_headers" ADD CONSTRAINT "po_headers_parent_po_id_fkey" FOREIGN KEY ("parent_po_id") REFERENCES "public"."po_headers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."po_headers" ADD CONSTRAINT "po_headers_payment_terms_id_fkey" FOREIGN KEY ("payment_terms_id") REFERENCES "public"."payment_terms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."po_headers" ADD CONSTRAINT "po_headers_ship_to_id_fkey" FOREIGN KEY ("ship_to_id") REFERENCES "public"."ship_to_sites"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."po_headers" ADD CONSTRAINT "po_headers_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."po_lines" ADD CONSTRAINT "po_lines_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."po_lines" ADD CONSTRAINT "po_lines_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "public"."po_headers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."po_lines" ADD CONSTRAINT "po_lines_tax_rate_id_fkey" FOREIGN KEY ("tax_rate_id") REFERENCES "public"."tax_rates"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."ses_headers" ADD CONSTRAINT "ses_headers_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."ses_headers" ADD CONSTRAINT "ses_headers_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "public"."po_headers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."ses_lines" ADD CONSTRAINT "ses_lines_po_line_id_fkey" FOREIGN KEY ("po_line_id") REFERENCES "public"."po_lines"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."ses_lines" ADD CONSTRAINT "ses_lines_ses_id_fkey" FOREIGN KEY ("ses_id") REFERENCES "public"."ses_headers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."ship_to_sites" ADD CONSTRAINT "ship_to_sites_org_entity_id_fkey" FOREIGN KEY ("org_entity_id") REFERENCES "public"."org_entities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."uom_conversions" ADD CONSTRAINT "uom_conversions_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."vendor_bank_accounts" ADD CONSTRAINT "vendor_bank_accounts_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."vendors" ADD CONSTRAINT "vendors_default_bank_account_id_fkey" FOREIGN KEY ("default_bank_account_id") REFERENCES "public"."vendor_bank_accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."vendors" ADD CONSTRAINT "vendors_payment_terms_id_fkey" FOREIGN KEY ("payment_terms_id") REFERENCES "public"."payment_terms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."vendors" ADD CONSTRAINT "vendors_tolerance_profile_id_fkey" FOREIGN KEY ("tolerance_profile_id") REFERENCES "public"."tolerance_profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."work_items" ADD CONSTRAINT "work_items_assigned_to_user_id_fkey" FOREIGN KEY ("assigned_to_user_id") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."invoice_validations" ADD CONSTRAINT "invoice_validations_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice_headers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."invoice_validations" ADD CONSTRAINT "invoice_validations_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."invoice_validations" ADD CONSTRAINT "invoice_validations_validation_rule_id_fkey" FOREIGN KEY ("validation_rule_id") REFERENCES "public"."validation_rules"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."validation_runs" ADD CONSTRAINT "validation_runs_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoice_headers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."validation_runs" ADD CONSTRAINT "validation_runs_triggered_by_fkey" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

