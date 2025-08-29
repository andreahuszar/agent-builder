-- Clean up existing database tables
-- This script removes old tables to prepare for the new document management system
-- WARNING: This will DROP all data! Add safety check for production.

-- Safety check: Uncomment for production to prevent accidental data loss
-- DO $$
-- BEGIN
--   IF EXISTS (SELECT 1 FROM invoice_headers LIMIT 1) THEN
--     RAISE EXCEPTION 'Database contains data. Run cleanup manually if intended.';
--   END IF;
-- END $$;

-- Drop existing tables (if they exist)
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS test_migrations CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop any existing enums (cleanup from previous attempts)
DROP TYPE IF EXISTS po_status CASCADE;
DROP TYPE IF EXISTS po_type CASCADE;
DROP TYPE IF EXISTS gr_status CASCADE;
DROP TYPE IF EXISTS invoice_type CASCADE;
DROP TYPE IF EXISTS invoice_status CASCADE;
DROP TYPE IF EXISTS match_status CASCADE;
DROP TYPE IF EXISTS doc_type CASCADE;
DROP TYPE IF EXISTS workflow_status CASCADE;
DROP TYPE IF EXISTS match_rule CASCADE;
DROP TYPE IF EXISTS hold_reason_code CASCADE;
DROP TYPE IF EXISTS tax_treatment_code CASCADE;
DROP TYPE IF EXISTS work_stage CASCADE;
DROP TYPE IF EXISTS work_item_status CASCADE;