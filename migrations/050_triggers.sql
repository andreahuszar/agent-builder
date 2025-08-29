-- 050_triggers.sql - Create triggers for automatic field maintenance

-- ================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ================================================================
-- Generic function to update the updated_at timestamp

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- APPLY UPDATED_AT TRIGGERS TO ALL TABLES
-- ================================================================

-- Master Lookup Tables
CREATE TRIGGER update_payment_terms_updated_at BEFORE UPDATE ON payment_terms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tolerance_profiles_updated_at BEFORE UPDATE ON tolerance_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendor_bank_accounts_updated_at BEFORE UPDATE ON vendor_bank_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tax_rates_updated_at BEFORE UPDATE ON tax_rates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_org_entities_updated_at BEFORE UPDATE ON org_entities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ship_to_sites_updated_at BEFORE UPDATE ON ship_to_sites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cost_centers_updated_at BEFORE UPDATE ON cost_centers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_uom_conversions_updated_at BEFORE UPDATE ON uom_conversions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Purchase Orders
CREATE TRIGGER update_po_headers_updated_at BEFORE UPDATE ON po_headers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_po_lines_updated_at BEFORE UPDATE ON po_lines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Goods Receipts
CREATE TRIGGER update_gr_headers_updated_at BEFORE UPDATE ON gr_headers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gr_lines_updated_at BEFORE UPDATE ON gr_lines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Service Entry Sheets
CREATE TRIGGER update_ses_headers_updated_at BEFORE UPDATE ON ses_headers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ses_lines_updated_at BEFORE UPDATE ON ses_lines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Invoices
CREATE TRIGGER update_invoice_headers_updated_at BEFORE UPDATE ON invoice_headers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoice_lines_updated_at BEFORE UPDATE ON invoice_lines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoice_line_taxes_updated_at BEFORE UPDATE ON invoice_line_taxes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoice_line_distributions_updated_at BEFORE UPDATE ON invoice_line_distributions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoice_line_receipts_updated_at BEFORE UPDATE ON invoice_line_receipts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Cross-cutting Operations
CREATE TRIGGER update_attachments_updated_at BEFORE UPDATE ON attachments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_source_files_updated_at BEFORE UPDATE ON source_files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approver_groups_updated_at BEFORE UPDATE ON approver_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approver_group_members_updated_at BEFORE UPDATE ON approver_group_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approval_policies_updated_at BEFORE UPDATE ON approval_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approvals_updated_at BEFORE UPDATE ON approvals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_external_refs_updated_at BEFORE UPDATE ON external_refs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_work_items_updated_at BEFORE UPDATE ON work_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_runs_updated_at BEFORE UPDATE ON agent_runs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- PO NUMBERS CACHE MAINTENANCE TRIGGER
-- ================================================================
-- Automatically maintain invoice_headers.po_numbers_cached from invoice_lines

CREATE OR REPLACE FUNCTION update_invoice_po_numbers_cache()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_id UUID;
    v_po_numbers TEXT[];
BEGIN
    -- Determine which invoice to update
    IF TG_OP = 'DELETE' THEN
        v_invoice_id := OLD.invoice_id;
    ELSE
        v_invoice_id := NEW.invoice_id;
    END IF;
    
    -- Collect unique PO numbers from invoice lines
    SELECT ARRAY_AGG(DISTINCT po.po_number ORDER BY po.po_number)
    INTO v_po_numbers
    FROM invoice_lines il
    JOIN po_lines pl ON pl.id = il.po_line_id
    JOIN po_headers po ON po.id = pl.po_id
    WHERE il.invoice_id = v_invoice_id;
    
    -- Update the cached PO numbers on the invoice header
    UPDATE invoice_headers
    SET po_numbers_cached = v_po_numbers
    WHERE id = v_invoice_id;
    
    RETURN CASE
        WHEN TG_OP = 'DELETE' THEN OLD
        ELSE NEW
    END;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger for INSERT, UPDATE, DELETE on invoice_lines
CREATE TRIGGER maintain_invoice_po_numbers_cache
AFTER INSERT OR UPDATE OF po_line_id OR DELETE ON invoice_lines
FOR EACH ROW EXECUTE FUNCTION update_invoice_po_numbers_cache();

-- ================================================================
-- INVOICE LINE NORMALIZATION TRIGGER
-- ================================================================
-- Automatically calculate normalized quantities and prices based on UOM conversions

CREATE OR REPLACE FUNCTION normalize_invoice_line_quantities()
RETURNS TRIGGER AS $$
DECLARE
    v_conversion_factor DECIMAL(18,9);
    v_base_uom VARCHAR(20);
BEGIN
    -- Only process if we have a po_line_id and qty
    IF NEW.po_line_id IS NOT NULL AND NEW.qty IS NOT NULL THEN
        -- Get the base UOM from the PO line
        SELECT pl.uom INTO v_base_uom
        FROM po_lines pl
        WHERE pl.id = NEW.po_line_id;
        
        -- If UOMs match, no conversion needed
        IF NEW.uom = v_base_uom OR NEW.uom IS NULL THEN
            NEW.normalized_qty := NEW.qty;
            NEW.normalized_unit_price := NEW.unit_price;
        ELSE
            -- Look for a conversion factor
            SELECT uc.factor INTO v_conversion_factor
            FROM uom_conversions uc
            JOIN po_lines pl ON pl.item_id = uc.item_id
            WHERE pl.id = NEW.po_line_id
              AND uc.from_uom = NEW.uom
              AND uc.to_uom = v_base_uom
              AND CURRENT_DATE BETWEEN uc.valid_from AND COALESCE(uc.valid_to, '9999-12-31'::DATE);
            
            IF v_conversion_factor IS NOT NULL THEN
                -- Apply conversion
                NEW.normalized_qty := NEW.qty * v_conversion_factor;
                NEW.normalized_unit_price := NEW.unit_price / v_conversion_factor;
                NEW.orig_uom := NEW.uom;
            ELSE
                -- No conversion found, use original values
                NEW.normalized_qty := NEW.qty;
                NEW.normalized_unit_price := NEW.unit_price;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger for INSERT and UPDATE on invoice_lines
CREATE TRIGGER normalize_invoice_line_quantities_trigger
BEFORE INSERT OR UPDATE OF qty, unit_price, uom, po_line_id ON invoice_lines
FOR EACH ROW EXECUTE FUNCTION normalize_invoice_line_quantities();

-- ================================================================
-- AUDIT EVENT LOGGING TRIGGER
-- ================================================================
-- Automatically log certain critical events

CREATE OR REPLACE FUNCTION log_critical_audit_event()
RETURNS TRIGGER AS $$
DECLARE
    v_doc_type doc_type;
    v_doc_id UUID;
    v_event_type VARCHAR(100);
    v_payload JSONB;
BEGIN
    -- Determine document type and event based on table
    IF TG_TABLE_NAME = 'invoice_headers' THEN
        v_doc_type := 'INV';
        v_doc_id := NEW.id;
        
        IF TG_OP = 'INSERT' THEN
            v_event_type := 'INVOICE_CREATED';
        ELSIF OLD.status != NEW.status THEN
            v_event_type := 'INVOICE_STATUS_CHANGED';
            v_payload := jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status
            );
        ELSIF OLD.match_status != NEW.match_status THEN
            v_event_type := 'INVOICE_MATCH_STATUS_CHANGED';
            v_payload := jsonb_build_object(
                'old_match_status', OLD.match_status,
                'new_match_status', NEW.match_status
            );
        END IF;
    ELSIF TG_TABLE_NAME = 'po_headers' THEN
        v_doc_type := 'PO';
        v_doc_id := NEW.id;
        
        IF TG_OP = 'INSERT' THEN
            v_event_type := 'PO_CREATED';
        ELSIF OLD.status != NEW.status THEN
            v_event_type := 'PO_STATUS_CHANGED';
            v_payload := jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status
            );
        END IF;
    END IF;
    
    -- Log the event if we have one
    IF v_event_type IS NOT NULL THEN
        INSERT INTO audit_events (doc_type, doc_id, event_type, by_user_id, at, payload_json)
        VALUES (v_doc_type, v_doc_id, v_event_type, NULL, NOW(), v_payload);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to critical tables
CREATE TRIGGER audit_invoice_headers_changes
AFTER INSERT OR UPDATE ON invoice_headers
FOR EACH ROW EXECUTE FUNCTION log_critical_audit_event();

CREATE TRIGGER audit_po_headers_changes
AFTER INSERT OR UPDATE ON po_headers
FOR EACH ROW EXECUTE FUNCTION log_critical_audit_event();