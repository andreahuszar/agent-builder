-- 112a_update_draft_status.sql - Update draft invoices to processing status

-- Now that new enum values are available, update draft invoices
UPDATE invoice_headers 
SET status = 'processing' 
WHERE status = 'draft';

-- Log the update
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count > 0 THEN
    RAISE NOTICE 'Updated % invoices from draft to processing status', updated_count;
  END IF;
END $$;