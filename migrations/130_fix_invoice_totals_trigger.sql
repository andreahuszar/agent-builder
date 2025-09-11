-- Fix the validate_invoice_totals_trigger to properly calculate totals including all components
-- The trigger was incorrectly calculating total as just subtotal + tax_total, 
-- ignoring shipping, discounts, and other charges

CREATE OR REPLACE FUNCTION public.validate_invoice_totals_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_line_subtotal DECIMAL(18,4);
    v_line_tax_total DECIMAL(18,4);
    v_tolerance DECIMAL(18,4) := 0.01;  -- Allow 1 cent rounding difference
    v_calculated_total DECIMAL(18,4);
BEGIN
    -- Only validate on UPDATE of totals or INSERT
    IF TG_OP = 'UPDATE' THEN
        IF OLD.subtotal = NEW.subtotal AND 
           OLD.tax_total = NEW.tax_total AND 
           OLD.total = NEW.total AND
           OLD.shipping_total = NEW.shipping_total AND
           OLD.discount_total = NEW.discount_total AND
           OLD.other_charges_total = NEW.other_charges_total THEN
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
    
    -- Calculate the correct total including ALL components
    v_calculated_total := NEW.subtotal + NEW.tax_total + 
                         COALESCE(NEW.shipping_total, 0) + 
                         COALESCE(NEW.other_charges_total, 0) - 
                         COALESCE(NEW.discount_total, 0);
    
    -- If extracted_total exists and differs significantly, use it (AI is more reliable)
    IF NEW.extracted_total IS NOT NULL AND ABS(NEW.extracted_total - v_calculated_total) > 1.0 THEN
        -- Trust the AI-extracted total when there's a significant discrepancy
        NEW.total := NEW.extracted_total;
        NEW.total_discrepancy := ABS(NEW.extracted_total - v_calculated_total);
        RAISE WARNING 'Invoice % using extracted total (%) instead of calculated (%) - discrepancy: %', 
            NEW.invoice_number, NEW.extracted_total, v_calculated_total, NEW.total_discrepancy;
    ELSE
        -- Ensure total includes all components
        IF ABS(NEW.total - v_calculated_total) > v_tolerance THEN
            NEW.total := v_calculated_total;
            RAISE WARNING 'Invoice % total corrected to % (subtotal:% + tax:% + shipping:% + other:% - discount:%)', 
                NEW.invoice_number, NEW.total, NEW.subtotal, NEW.tax_total, 
                COALESCE(NEW.shipping_total, 0), COALESCE(NEW.other_charges_total, 0), 
                COALESCE(NEW.discount_total, 0);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Fix the existing invoices that have incorrect totals
UPDATE invoice_headers 
SET total = CASE 
    -- If we have an extracted_total that differs significantly, use it
    WHEN extracted_total IS NOT NULL AND 
         ABS(extracted_total - (subtotal + tax_total + COALESCE(shipping_total, 0) + COALESCE(other_charges_total, 0) - COALESCE(discount_total, 0))) > 1.0 
    THEN extracted_total
    -- Otherwise calculate from components
    ELSE subtotal + tax_total + COALESCE(shipping_total, 0) + COALESCE(other_charges_total, 0) - COALESCE(discount_total, 0)
END,
total_discrepancy = CASE
    WHEN extracted_total IS NOT NULL AND 
         ABS(extracted_total - (subtotal + tax_total + COALESCE(shipping_total, 0) + COALESCE(other_charges_total, 0) - COALESCE(discount_total, 0))) > 1.0 
    THEN ABS(extracted_total - (subtotal + tax_total + COALESCE(shipping_total, 0) + COALESCE(other_charges_total, 0) - COALESCE(discount_total, 0)))
    ELSE NULL
END
WHERE invoice_number IN ('INV-2025-0910-003', 'INV-2025-0910-004');