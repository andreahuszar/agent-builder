-- ================================================================
-- CRITICAL FIXES PATCH
-- ================================================================
-- This migration fixes critical data and structural issues identified in assessment
-- Date: 2025-09-01
-- Issues addressed:
--   1. UOM conversion factor inverted (RM→BX)
--   2. Invoice line math errors
--   3. Header/line total mismatches
--   4. Missing document fidelity fields
--   5. Production safety improvements

-- ================================================================
-- PHASE 1: CRITICAL DATA FIXES
-- ================================================================

-- Fix 1: Correct UOM conversion factor for paper (10 reams = 1 box, so factor = 0.1)
-- Only update if not already fixed
UPDATE uom_conversions
SET factor = 0.1,
    updated_at = NOW()
WHERE item_id = 'f4444444-4444-4444-4444-444444444444'  -- Copy Paper A4
  AND from_uom = 'RM' 
  AND to_uom = 'BX'
  AND factor != 0.1;  -- Only update if not already correct

-- Fix 2: Correct invoice line 3 amounts (5 RM @ 3.50 = 17.50)
-- Only update if amounts are wrong
UPDATE invoice_lines
SET extended_amount = 17.50,
    net_amount = 17.50,
    tax_amount = 1.27,  -- 17.50 * 0.0725
    line_total = 18.77,
    gr_number_snapshot = NULLIF(gr_number_snapshot, 'RM'),  -- Clear only if bogus
    updated_at = NOW()
WHERE id = '83333333-3333-3333-3333-333333333333'
  AND (net_amount != 17.50 OR tax_amount != 1.27 OR line_total != 18.77);

-- Fix 3: Recalculate invoice header totals for INV-2024-001
-- Only update if totals don't match
DO $$
DECLARE
    v_subtotal DECIMAL(18,4);
    v_tax_total DECIMAL(18,4);
BEGIN
    -- Calculate correct totals
    SELECT 
        COALESCE(SUM(net_amount), 0),
        COALESCE(SUM(tax_amount), 0)
    INTO v_subtotal, v_tax_total
    FROM invoice_lines
    WHERE invoice_id = '71111111-1111-1111-1111-111111111111';
    
    -- Only update if different
    UPDATE invoice_headers
    SET subtotal = v_subtotal,
        tax_total = v_tax_total,
        updated_at = NOW()
    WHERE id = '71111111-1111-1111-1111-111111111111'
      AND (subtotal != v_subtotal OR tax_total != v_tax_total);
END $$;

-- Update total = subtotal + tax_total
-- Only update if not already correct
UPDATE invoice_headers
SET total = subtotal + tax_total,
    updated_at = NOW()
WHERE id = '71111111-1111-1111-1111-111111111111'
  AND total != (subtotal + tax_total);

-- Fix 4: Re-normalize invoice lines after UOM correction
-- Only trigger if normalization is needed
UPDATE invoice_lines
SET qty = qty  -- No-op to trigger normalization
WHERE id = '83333333-3333-3333-3333-333333333333'
  AND (normalized_qty IS NULL OR normalized_qty != 0.5);  -- Expected: 5 RM * 0.1 = 0.5 BX

-- ================================================================
-- PHASE 2: STRUCTURAL IMPROVEMENTS
-- ================================================================

-- Add document fidelity fields to invoice_headers (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoice_headers' 
        AND column_name = 'bill_to_snapshot'
    ) THEN
        ALTER TABLE invoice_headers 
        ADD COLUMN bill_to_snapshot JSONB,
        ADD COLUMN ship_to_snapshot JSONB;
    END IF;
END $$;

-- ================================================================
-- PHASE 3: DATA VALIDATION
-- ================================================================

-- Create validation trigger to ensure header/line totals match
CREATE OR REPLACE FUNCTION validate_invoice_totals_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_line_subtotal DECIMAL(18,4);
    v_line_tax_total DECIMAL(18,4);
    v_tolerance DECIMAL(18,4) := 0.01;  -- Allow 1 cent rounding difference
BEGIN
    -- Only validate on UPDATE of totals or INSERT
    IF TG_OP = 'UPDATE' THEN
        IF OLD.subtotal = NEW.subtotal AND 
           OLD.tax_total = NEW.tax_total AND 
           OLD.total = NEW.total THEN
            RETURN NEW;  -- No total changes, skip validation
        END IF;
    END IF;
    
    -- Calculate line totals
    SELECT 
        COALESCE(SUM(net_amount), 0),
        COALESCE(SUM(tax_amount), 0)
    INTO v_line_subtotal, v_line_tax_total
    FROM invoice_lines
    WHERE invoice_id = NEW.id;
    
    -- Check if header matches lines (with tolerance for rounding)
    IF ABS(NEW.subtotal - v_line_subtotal) > v_tolerance THEN
        RAISE WARNING 'Invoice % subtotal (%) does not match line sum (%)', 
            NEW.invoice_number, NEW.subtotal, v_line_subtotal;
    END IF;
    
    IF ABS(NEW.tax_total - v_line_tax_total) > v_tolerance THEN
        RAISE WARNING 'Invoice % tax_total (%) does not match line sum (%)', 
            NEW.invoice_number, NEW.tax_total, v_line_tax_total;
    END IF;
    
    -- Ensure total = subtotal + tax_total
    IF ABS(NEW.total - (NEW.subtotal + NEW.tax_total)) > v_tolerance THEN
        NEW.total := NEW.subtotal + NEW.tax_total;
        RAISE WARNING 'Invoice % total corrected to match subtotal + tax_total', 
            NEW.invoice_number;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS validate_invoice_totals_on_change ON invoice_headers;

CREATE TRIGGER validate_invoice_totals_on_change
BEFORE INSERT OR UPDATE ON invoice_headers
FOR EACH ROW EXECUTE FUNCTION validate_invoice_totals_trigger();

-- ================================================================
-- PHASE 4: PRODUCTION SAFETY
-- ================================================================

-- Create function to check if database has production data
CREATE OR REPLACE FUNCTION is_production_database()
RETURNS BOOLEAN AS $$
DECLARE
    v_record_count INTEGER;
BEGIN
    -- Check for significant data that indicates production use
    SELECT COUNT(*) INTO v_record_count
    FROM invoice_headers
    WHERE created_at < CURRENT_DATE - INTERVAL '30 days';
    
    -- If we have invoices older than 30 days, likely production
    RETURN v_record_count > 10;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- PHASE 5: RE-RUN MATCHING
-- ================================================================

-- Re-run matching for all invoices to apply corrected UOM and amounts
SELECT fn_match_invoice(id) 
FROM invoice_headers 
WHERE invoice_number IN ('INV-2024-001', 'INV-2024-002', 'INV-2024-003');

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================

-- Verify UOM conversion is fixed
DO $$
DECLARE
    v_factor DECIMAL;
BEGIN
    SELECT factor INTO v_factor
    FROM uom_conversions
    WHERE item_id = 'f4444444-4444-4444-4444-444444444444'
      AND from_uom = 'RM' AND to_uom = 'BX';
    
    IF v_factor != 0.1 THEN
        RAISE EXCEPTION 'UOM conversion not fixed! Factor is %', v_factor;
    END IF;
    
    RAISE NOTICE '✓ UOM conversion fixed: RM→BX factor = 0.1';
END $$;

-- Verify invoice totals are consistent
DO $$
DECLARE
    v_valid BOOLEAN;
BEGIN
    SELECT fn_validate_invoice_totals(id) INTO v_valid
    FROM invoice_headers
    WHERE invoice_number = 'INV-2024-001';
    
    IF NOT v_valid THEN
        RAISE EXCEPTION 'Invoice INV-2024-001 totals still inconsistent!';
    END IF;
    
    RAISE NOTICE '✓ Invoice totals validated successfully';
END $$;

-- Show final state
SELECT 
    'Invoice Status After Fixes' as report,
    invoice_number,
    subtotal,
    tax_total,
    total,
    match_status,
    fn_validate_invoice_totals(id) as totals_valid
FROM invoice_headers
WHERE invoice_number IN ('INV-2024-001', 'INV-2024-002', 'INV-2024-003')
ORDER BY invoice_number;