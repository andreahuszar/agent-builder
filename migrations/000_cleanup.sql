-- ================================================================
-- CLEANUP SCRIPT - ONLY FOR INITIAL SETUP
-- ================================================================
-- WARNING: This script is DESTRUCTIVE and should only run on fresh databases
-- It will be skipped if the core tables already exist

-- Safety check: Skip if database already has the schema
DO $$
BEGIN
  -- Check if core tables exist
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'invoice_headers'
  ) THEN
    -- Check if this is a production database (has real data)
    IF EXISTS (
      SELECT 1 FROM invoice_headers 
      WHERE created_at < CURRENT_DATE - INTERVAL '7 days'
      LIMIT 1
    ) THEN
      RAISE NOTICE 'Database contains existing data. Skipping cleanup script.';
      RAISE EXCEPTION 'SKIP_MIGRATION: Database already initialized';
    END IF;
    
    -- Check if we're explicitly allowed to be destructive
    IF current_setting('app.allow_destructive', true) IS DISTINCT FROM 'true' THEN
      RAISE NOTICE 'Database exists. Set app.allow_destructive=true to force cleanup.';
      RAISE EXCEPTION 'SKIP_MIGRATION: Cleanup requires explicit permission';
    END IF;
  END IF;
  
  -- If we get here, it's safe to proceed
  RAISE NOTICE 'Proceeding with cleanup...';
END $$;

-- Only drop legacy tables from old schema (not current schema)
DROP TABLE IF EXISTS invoices CASCADE;  -- Old Prisma table
DROP TABLE IF EXISTS purchase_orders CASCADE;  -- Old Prisma table
DROP TABLE IF EXISTS test_migrations CASCADE;  -- Old test table
-- Note: users table might be needed, check if it's the old version
DO $$
BEGIN
  -- Only drop users if it's the old schema (missing required columns)
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'users' AND schemaname = 'public')
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns 
       WHERE table_name = 'users' 
       AND column_name = 'department'
     ) THEN
    DROP TABLE users CASCADE;
    RAISE NOTICE 'Dropped old users table';
  END IF;
END $$;

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