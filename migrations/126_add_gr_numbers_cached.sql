-- Add missing gr_numbers_cached column to invoice_headers table
-- This field is used to cache GR numbers associated with invoices

DO $$ 
BEGIN
    -- Check if the column already exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'invoice_headers' 
        AND column_name = 'gr_numbers_cached'
    ) THEN
        -- Add the gr_numbers_cached column
        ALTER TABLE invoice_headers 
        ADD COLUMN gr_numbers_cached text[] DEFAULT '{}' NOT NULL;
        
        RAISE NOTICE 'Added gr_numbers_cached column to invoice_headers table';
    ELSE
        RAISE NOTICE 'gr_numbers_cached column already exists in invoice_headers table';
    END IF;
    
    -- Create index for performance on gr_numbers_cached searches
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE indexname = 'idx_invoice_headers_gr_numbers_cached'
    ) THEN
        CREATE INDEX idx_invoice_headers_gr_numbers_cached 
        ON invoice_headers USING GIN (gr_numbers_cached);
        RAISE NOTICE 'Created index for gr_numbers_cached column';
    ELSE
        RAISE NOTICE 'Index for gr_numbers_cached already exists';
    END IF;
    
    RAISE NOTICE 'Migration 126_add_gr_numbers_cached completed successfully';
END $$;