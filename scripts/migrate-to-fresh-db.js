#!/usr/bin/env node

/**
 * Complete Database Migration for Railway Production
 * This script completely replaces the production database with local data
 * It runs automatically on Railway deployment using DATABASE_URL
 */

const { Client } = require('pg');

async function migrateDatabase() {
  // Use DATABASE_URL from Railway environment
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.log('⚠️  No DATABASE_URL found. Skipping migration (local development).');
    return;
  }

  // Check if this is production (Railway sets this)
  const isProduction = process.env.NODE_ENV === 'production' ||
                       connectionString.includes('railway.app') ||
                       connectionString.includes('containers-us-west') ||
                       process.env.RAILWAY_ENVIRONMENT === 'production';

  if (!isProduction) {
    console.log('⚠️  Not running in production environment. Skipping migration.');
    console.log('   To run in production, ensure DATABASE_URL points to Railway database.');
    return;
  }

  const client = new Client({ connectionString });

  try {
    console.log('🚀 Starting complete database migration...');
    console.log('📍 Target: Railway Production Database');
    await client.connect();

    // Start transaction for safety
    await client.query('BEGIN');

    console.log('1️⃣ Dropping all existing tables...');

    // Get all table names
    const tablesResult = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename NOT LIKE '_prisma%'
      ORDER BY tablename
    `);

    // Drop all tables with CASCADE
    for (const row of tablesResult.rows) {
      console.log(`   Dropping ${row.tablename}...`);
      await client.query(`DROP TABLE IF EXISTS ${row.tablename} CASCADE`);
    }

    console.log('2️⃣ Creating fresh schema...');

    // Create all tables with latest schema
    await client.query(`
      -- Users table
      CREATE TABLE users (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Payment terms
      CREATE TABLE payment_terms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        days INTEGER NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Organization entities
      CREATE TABLE org_entities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        type TEXT,
        parent_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Cost centers
      CREATE TABLE cost_centers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        org_entity_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Projects
      CREATE TABLE projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Tax rates
      CREATE TABLE tax_rates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        rate DECIMAL(5,4) NOT NULL,
        country TEXT,
        state TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Items
      CREATE TABLE items (
        id TEXT PRIMARY KEY,
        item_number TEXT UNIQUE NOT NULL,
        description TEXT NOT NULL,
        category TEXT,
        unit_of_measure TEXT,
        unit_price DECIMAL(12,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Tolerance profiles
      CREATE TABLE tolerance_profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        amount_tolerance DECIMAL(12,2),
        percentage_tolerance DECIMAL(5,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Ship to sites
      CREATE TABLE ship_to_sites (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        address_line1 TEXT,
        address_line2 TEXT,
        city TEXT,
        state TEXT,
        postal_code TEXT,
        country TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- UOM conversions
      CREATE TABLE uom_conversions (
        id TEXT PRIMARY KEY,
        from_uom TEXT NOT NULL,
        to_uom TEXT NOT NULL,
        conversion_factor DECIMAL(12,6) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Vendors
      CREATE TABLE vendors (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT UNIQUE,
        tax_id TEXT,
        address_line1 TEXT,
        address_line2 TEXT,
        city TEXT,
        state TEXT,
        postal_code TEXT,
        country TEXT,
        contact_name TEXT,
        contact_email TEXT,
        contact_phone TEXT,
        payment_terms_id TEXT,
        preferred_payment_method TEXT,
        default_bank_account_id TEXT,
        is_verified BOOLEAN DEFAULT false,
        requires_po BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Vendor bank accounts
      CREATE TABLE vendor_bank_accounts (
        id TEXT PRIMARY KEY,
        vendor_id TEXT NOT NULL,
        account_name TEXT,
        bank_name TEXT,
        account_number TEXT,
        routing_number TEXT,
        swift_code TEXT,
        iban TEXT,
        account_type TEXT,
        currency TEXT DEFAULT 'USD',
        is_verified BOOLEAN DEFAULT false,
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- PO Headers
      CREATE TABLE po_headers (
        id TEXT PRIMARY KEY,
        po_number TEXT UNIQUE NOT NULL,
        vendor_id TEXT,
        status TEXT DEFAULT 'open',
        order_date DATE,
        delivery_date DATE,
        payment_terms_id TEXT,
        ship_to_site_id TEXT,
        buyer_id TEXT,
        total DECIMAL(12,2),
        currency TEXT DEFAULT 'USD',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- PO Lines
      CREATE TABLE po_lines (
        id TEXT PRIMARY KEY,
        po_header_id TEXT NOT NULL,
        line_number INTEGER NOT NULL,
        item_id TEXT,
        description TEXT NOT NULL,
        qty_ordered DECIMAL(12,3) NOT NULL,
        qty_received DECIMAL(12,3) DEFAULT 0,
        qty_invoiced DECIMAL(12,3) DEFAULT 0,
        unit_price DECIMAL(12,4) NOT NULL,
        unit_of_measure TEXT,
        line_total DECIMAL(12,2) NOT NULL,
        cost_center_id TEXT,
        project_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- GR Headers
      CREATE TABLE gr_headers (
        id TEXT PRIMARY KEY,
        gr_number TEXT UNIQUE NOT NULL,
        po_header_id TEXT,
        receipt_date DATE NOT NULL,
        receiver_id TEXT,
        status TEXT DEFAULT 'posted',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- GR Lines
      CREATE TABLE gr_lines (
        id TEXT PRIMARY KEY,
        gr_header_id TEXT NOT NULL,
        po_line_id TEXT,
        line_number INTEGER NOT NULL,
        qty_received DECIMAL(12,3) NOT NULL,
        unit_of_measure TEXT,
        location TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- SES Headers
      CREATE TABLE ses_headers (
        id TEXT PRIMARY KEY,
        ses_number TEXT UNIQUE NOT NULL,
        po_header_id TEXT,
        service_date DATE NOT NULL,
        approver_id TEXT,
        status TEXT DEFAULT 'approved',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- SES Lines
      CREATE TABLE ses_lines (
        id TEXT PRIMARY KEY,
        ses_header_id TEXT NOT NULL,
        po_line_id TEXT,
        line_number INTEGER NOT NULL,
        service_description TEXT NOT NULL,
        qty_confirmed DECIMAL(12,3) NOT NULL,
        unit_of_measure TEXT,
        amount DECIMAL(12,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Invoice Headers
      CREATE TABLE invoice_headers (
        id TEXT PRIMARY KEY,
        invoice_number TEXT UNIQUE NOT NULL,
        vendor_id TEXT,
        po_id TEXT,
        status TEXT DEFAULT 'draft',
        invoice_date DATE NOT NULL,
        due_date DATE NOT NULL,
        payment_terms_id TEXT,
        currency TEXT DEFAULT 'USD',
        subtotal DECIMAL(12,2),
        tax_amount DECIMAL(12,2),
        shipping_amount DECIMAL(12,2),
        discount_amount DECIMAL(12,2),
        total DECIMAL(12,2) NOT NULL,
        payment_method TEXT,
        payment_reference TEXT,
        bank_account_id TEXT,
        match_status TEXT,
        approval_status TEXT,
        po_numbers_cached TEXT[],
        gr_numbers_cached TEXT[],
        validation_warnings JSONB,
        helpdesk_ticket_ref TEXT,
        vendor_name TEXT,
        vendor_address TEXT,
        vendor_tax_id TEXT,
        vendor_email TEXT,
        vendor_phone TEXT,
        invoice_document_snapshot JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Invoice Lines
      CREATE TABLE invoice_lines (
        id TEXT PRIMARY KEY,
        invoice_header_id TEXT NOT NULL,
        line_number INTEGER NOT NULL,
        po_line_id TEXT,
        item_id TEXT,
        description TEXT NOT NULL,
        quantity DECIMAL(12,3) NOT NULL,
        unit_price DECIMAL(12,4) NOT NULL,
        unit_of_measure TEXT,
        line_amount DECIMAL(12,2) NOT NULL,
        tax_rate DECIMAL(5,2),
        tax_amount DECIMAL(12,2),
        total_amount DECIMAL(12,2),
        cost_center_id TEXT,
        project_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Invoice Line Distributions
      CREATE TABLE invoice_line_distributions (
        id TEXT PRIMARY KEY,
        invoice_line_id TEXT NOT NULL,
        cost_center_id TEXT,
        project_id TEXT,
        gl_account TEXT,
        amount DECIMAL(12,2) NOT NULL,
        percentage DECIMAL(5,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Invoice Line Receipts
      CREATE TABLE invoice_line_receipts (
        id TEXT PRIMARY KEY,
        invoice_line_id TEXT NOT NULL,
        gr_line_id TEXT,
        ses_line_id TEXT,
        quantity DECIMAL(12,3) NOT NULL,
        amount DECIMAL(12,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Invoice Line Taxes
      CREATE TABLE invoice_line_taxes (
        id TEXT PRIMARY KEY,
        invoice_line_id TEXT NOT NULL,
        tax_rate_id TEXT,
        tax_rate DECIMAL(5,2) NOT NULL,
        tax_amount DECIMAL(12,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Invoice Status History
      CREATE TABLE invoice_status_history (
        id TEXT PRIMARY KEY,
        invoice_header_id TEXT NOT NULL,
        status TEXT NOT NULL,
        changed_by TEXT,
        change_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Match Results
      CREATE TABLE match_results (
        id TEXT PRIMARY KEY,
        invoice_id TEXT NOT NULL,
        invoice_line_id TEXT,
        po_line_id TEXT,
        matched_gr_line_id TEXT,
        matched_ses_line_id TEXT,
        match_type TEXT,
        match_status TEXT,
        invoice_qty DECIMAL(12,3),
        invoice_price DECIMAL(12,4),
        invoice_amount DECIMAL(12,2),
        po_qty_ordered DECIMAL(12,3),
        po_unit_price DECIMAL(12,4),
        po_line_total DECIMAL(12,2),
        gr_qty_received DECIMAL(12,3),
        ses_qty_confirmed DECIMAL(12,3),
        qty_variance DECIMAL(12,3),
        price_variance DECIMAL(12,4),
        amount_variance DECIMAL(12,2),
        within_tolerance BOOLEAN DEFAULT false,
        tolerance_profile_id TEXT,
        explanation_code TEXT,
        explanation_details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Approval Policies
      CREATE TABLE approval_policies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        min_amount DECIMAL(12,2),
        max_amount DECIMAL(12,2),
        approver_group_id TEXT,
        auto_approve BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Approver Groups
      CREATE TABLE approver_groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Approver Group Members
      CREATE TABLE approver_group_members (
        id TEXT PRIMARY KEY,
        approver_group_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        can_approve BOOLEAN DEFAULT true,
        approval_limit DECIMAL(12,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Approvals
      CREATE TABLE approvals (
        id TEXT PRIMARY KEY,
        invoice_header_id TEXT NOT NULL,
        approver_id TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        approval_date TIMESTAMP,
        comments TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Attachments
      CREATE TABLE attachments (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_type TEXT,
        file_size INTEGER,
        file_url TEXT,
        uploaded_by TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Source Files
      CREATE TABLE source_files (
        id TEXT PRIMARY KEY,
        file_name TEXT NOT NULL,
        file_type TEXT,
        file_size INTEGER,
        status TEXT DEFAULT 'pending',
        processed_at TIMESTAMP,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- External References
      CREATE TABLE external_refs (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        external_system TEXT NOT NULL,
        external_id TEXT NOT NULL,
        external_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Audit Events
      CREATE TABLE audit_events (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        event_details JSONB,
        user_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Work Items
      CREATE TABLE work_items (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        priority INTEGER DEFAULT 0,
        assigned_to TEXT,
        entity_type TEXT,
        entity_id TEXT,
        title TEXT NOT NULL,
        description TEXT,
        due_date TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Agent Runs
      CREATE TABLE agent_runs (
        id TEXT PRIMARY KEY,
        agent_type TEXT NOT NULL,
        status TEXT DEFAULT 'running',
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        input_data JSONB,
        output_data JSONB,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Schema Migrations (for tracking)
      CREATE TABLE schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Test Migrations
      CREATE TABLE test_migrations (
        id TEXT PRIMARY KEY,
        name TEXT,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Invoice Validations
      CREATE TABLE invoice_validations (
        id TEXT PRIMARY KEY,
        invoice_id TEXT NOT NULL,
        validation_type TEXT NOT NULL,
        status TEXT,
        details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Validation Rules
      CREATE TABLE validation_rules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        config JSONB,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Validation Runs
      CREATE TABLE validation_runs (
        id TEXT PRIMARY KEY,
        invoice_id TEXT NOT NULL,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        status TEXT,
        results JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('3️⃣ Creating indexes...');

    // Create all necessary indexes
    await client.query(`
      -- Vendor indexes
      CREATE INDEX idx_vendors_name ON vendors(name);
      CREATE INDEX idx_vendors_tax_id ON vendors(tax_id);

      -- Invoice indexes
      CREATE INDEX idx_invoice_headers_vendor_id ON invoice_headers(vendor_id);
      CREATE INDEX idx_invoice_headers_po_id ON invoice_headers(po_id);
      CREATE INDEX idx_invoice_headers_status ON invoice_headers(status);
      CREATE INDEX idx_invoice_headers_match_status ON invoice_headers(match_status);
      CREATE INDEX idx_invoice_headers_po_numbers ON invoice_headers USING GIN (po_numbers_cached);
      CREATE INDEX idx_invoice_headers_gr_numbers ON invoice_headers USING GIN (gr_numbers_cached);

      -- Invoice lines indexes
      CREATE INDEX idx_invoice_lines_header_id ON invoice_lines(invoice_header_id);
      CREATE INDEX idx_invoice_lines_po_line_id ON invoice_lines(po_line_id);

      -- PO indexes
      CREATE INDEX idx_po_headers_vendor_id ON po_headers(vendor_id);
      CREATE INDEX idx_po_lines_header_id ON po_lines(po_header_id);

      -- GR indexes
      CREATE INDEX idx_gr_headers_po_id ON gr_headers(po_header_id);
      CREATE INDEX idx_gr_lines_header_id ON gr_lines(gr_header_id);

      -- Match results indexes
      CREATE INDEX idx_match_results_invoice_id ON match_results(invoice_id);
      CREATE INDEX idx_match_results_po_line_id ON match_results(po_line_id);
    `);

    console.log('4️⃣ Inserting data...');

    // Insert all the data from local database
    await insertData(client);

    // Commit transaction
    await client.query('COMMIT');

    console.log('✅ Database migration completed successfully!');
    console.log('📊 Production database is now an exact copy of local database');

  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

async function insertData(client) {
  // Insert users
  await client.query(`
    INSERT INTO users (id, name, email, role) VALUES
    ('user-1', 'John Doe', 'john.doe@company.com', 'admin'),
    ('user-2', 'Jane Smith', 'jane.smith@company.com', 'approver'),
    ('user-3', 'Bob Johnson', 'bob.johnson@company.com', 'viewer'),
    ('user-4', 'Alice Williams', 'alice.williams@company.com', 'admin');
  `);

  // Insert payment terms
  await client.query(`
    INSERT INTO payment_terms (id, name, days, description) VALUES
    ('net-30', 'Net 30', 30, 'Payment due in 30 days'),
    ('net-45', 'Net 45', 45, 'Payment due in 45 days'),
    ('net-60', 'Net 60', 60, 'Payment due in 60 days'),
    ('immediate', 'Due on Receipt', 0, 'Payment due immediately');
  `);

  // Insert tax rates
  await client.query(`
    INSERT INTO tax_rates (id, name, rate, country, state) VALUES
    ('tax-ca-state', 'California State Tax', 0.0725, 'US', 'CA'),
    ('tax-ny-state', 'New York State Tax', 0.08, 'US', 'NY'),
    ('tax-tx-state', 'Texas State Tax', 0.0625, 'US', 'TX');
  `);

  // Insert cost centers
  await client.query(`
    INSERT INTO cost_centers (id, name, code) VALUES
    ('cc-1000', 'Engineering', 'ENG-001'),
    ('cc-2000', 'Marketing', 'MKT-001'),
    ('cc-3000', 'Operations', 'OPS-001');
  `);

  // Insert projects
  await client.query(`
    INSERT INTO projects (id, name, code, status) VALUES
    ('proj-alpha', 'Project Alpha', 'ALPHA-2025', 'active'),
    ('proj-beta', 'Project Beta', 'BETA-2025', 'active');
  `);

  // Insert tolerance profiles
  await client.query(`
    INSERT INTO tolerance_profiles (id, name, type, amount_tolerance, percentage_tolerance) VALUES
    ('tol-standard', 'Standard Tolerance', 'both', 100.00, 5.00),
    ('tol-strict', 'Strict Tolerance', 'both', 10.00, 1.00);
  `);

  // Insert vendors
  await client.query(`
    INSERT INTO vendors (id, name, code, tax_id, address_line1, city, state, postal_code, country,
                        contact_email, payment_terms_id, preferred_payment_method, is_verified, requires_po) VALUES
    ('22025001-1111-1111-1111-111111111111', 'TechPro Solutions', 'TECH-001', '45-6789012',
     '123 Tech Street', 'San Francisco', 'CA', '94105', 'US', 'ap@techpro.com',
     'net-30', 'bank_transfer', true, true),
    ('vendor-2', 'Office Supplies Inc', 'OFF-001', '98-7654321',
     '456 Supply Ave', 'New York', 'NY', '10001', 'US', 'billing@officesupplies.com',
     'net-45', 'check', true, false);
  `);

  // Insert vendor bank accounts
  await client.query(`
    INSERT INTO vendor_bank_accounts (id, vendor_id, account_name, bank_name, account_number,
                                      routing_number, is_verified, is_default) VALUES
    ('22025001-1111-1111-1111-111111111111', '22025001-1111-1111-1111-111111111111',
     'TechPro Solutions LLC', 'Bank of America', '****5678', '021000322', true, true),
    ('bank-2', '22025001-1111-1111-1111-111111111111',
     'TechPro Solutions LLC', 'Wells Fargo', '****9012', '121000248', false, false);
  `);

  // Insert PO headers
  await client.query(`
    INSERT INTO po_headers (id, po_number, vendor_id, status, order_date, delivery_date,
                           payment_terms_id, total, currency) VALUES
    ('52025001-1111-1111-1111-111111111111', 'PO-2025-1001', '22025001-1111-1111-1111-111111111111',
     'open', '2025-09-01', '2025-09-15', 'net-30', 3000.00, 'USD');
  `);

  // Insert PO lines
  await client.query(`
    INSERT INTO po_lines (id, po_header_id, line_number, description, qty_ordered, qty_received,
                         unit_price, unit_of_measure, line_total) VALUES
    ('pol-1', '52025001-1111-1111-1111-111111111111', 1, 'Software License',
     10.000, 6.000, 200.0000, 'EA', 2000.00),
    ('pol-2', '52025001-1111-1111-1111-111111111111', 2, 'Support Services',
     5.000, 0.000, 200.0000, 'HR', 1000.00);
  `);

  // Insert GR headers
  await client.query(`
    INSERT INTO gr_headers (id, gr_number, po_header_id, receipt_date, status) VALUES
    ('gr-1', 'GR-2025-001', '52025001-1111-1111-1111-111111111111', '2025-09-10', 'posted');
  `);

  // Insert GR lines
  await client.query(`
    INSERT INTO gr_lines (id, gr_header_id, po_line_id, line_number, qty_received, unit_of_measure) VALUES
    ('grl-1', 'gr-1', 'pol-1', 1, 6.000, 'EA');
  `);

  // Insert invoices with all test data
  await client.query(`
    INSERT INTO invoice_headers (
      id, invoice_number, vendor_id, po_id, status, invoice_date, due_date,
      payment_terms_id, currency, subtotal, tax_amount, total,
      match_status, po_numbers_cached, gr_numbers_cached, validation_warnings,
      vendor_name, vendor_tax_id, payment_method, bank_account_id
    ) VALUES
    (
      '52025001-1111-1111-1111-111111111111',
      'INV-2025-0001',
      '22025001-1111-1111-1111-111111111111',
      '52025001-1111-1111-1111-111111111111',
      'requires_review',
      '2025-09-15',
      '2025-10-15',
      'net-30',
      'USD',
      1200.00,
      96.00,
      1296.00,
      'exception',
      ARRAY['PO-2025-1001'],
      ARRAY['GR-2025-001'],
      NULL,
      'TechPro Solutions',
      '45-6789012',
      'bank_transfer',
      '22025001-1111-1111-1111-111111111111'
    ),
    (
      '52025002-2222-2222-2222-222222222222',
      'INV-2025-0002',
      '22025001-1111-1111-1111-111111111111',
      '52025001-1111-1111-1111-111111111111',
      'requires_review',
      '2025-09-15',
      '2025-10-15',
      'net-30',
      'USD',
      3000.00,
      240.00,
      3240.00,
      'matched',
      ARRAY['PO-2025-1001'],
      ARRAY[]::text[],
      NULL,
      'TechPro Solutions',
      '45-6789012',
      'bank_transfer',
      '22025001-1111-1111-1111-111111111111'
    ),
    (
      '52025003-3333-3333-3333-333333333333',
      'INV-2025-0003',
      '22025001-1111-1111-1111-111111111111',
      NULL,
      'requires_review',
      '2025-09-15',
      '2025-10-15',
      'net-30',
      'USD',
      2500.00,
      200.00,
      2700.00,
      'exception',
      ARRAY[]::text[],
      ARRAY[]::text[],
      '[{"code": "BANK_DETAILS_CHANGED", "message": "Bank account details on invoice do not match vendor records", "severity": "error", "category": "risk", "field": "bank_account"}]'::jsonb,
      'TechPro Solutions',
      '45-6789012',
      'bank_transfer',
      'bank-2'
    );
  `);

  // Insert invoice lines for INV-2025-0001
  await client.query(`
    INSERT INTO invoice_lines (
      id, invoice_header_id, line_number, po_line_id, description,
      quantity, unit_price, unit_of_measure, line_amount, tax_rate, tax_amount, total_amount
    ) VALUES
    ('il-1', '52025001-1111-1111-1111-111111111111', 1, 'pol-1',
     'Software License', 6.000, 200.0000, 'EA', 1200.00, 8.00, 96.00, 1296.00);
  `);

  // Insert invoice lines for INV-2025-0002
  await client.query(`
    INSERT INTO invoice_lines (
      id, invoice_header_id, line_number, po_line_id, description,
      quantity, unit_price, unit_of_measure, line_amount, tax_rate, tax_amount, total_amount
    ) VALUES
    ('il-2', '52025002-2222-2222-2222-222222222222', 1, 'pol-1',
     'Software License', 10.000, 200.0000, 'EA', 2000.00, 8.00, 160.00, 2160.00),
    ('il-3', '52025002-2222-2222-2222-222222222222', 2, 'pol-2',
     'Support Services', 5.000, 200.0000, 'HR', 1000.00, 8.00, 80.00, 1080.00);
  `);

  // Insert invoice lines for INV-2025-0003
  await client.query(`
    INSERT INTO invoice_lines (
      id, invoice_header_id, line_number, description,
      quantity, unit_price, unit_of_measure, line_amount, tax_rate, tax_amount, total_amount,
      cost_center_id, project_id
    ) VALUES
    ('il-4', '52025003-3333-3333-3333-333333333333', 1,
     'Consulting Services', 25.000, 100.0000, 'HR', 2500.00, 8.00, 200.00, 2700.00,
     'cc-1000', 'proj-alpha');
  `);

  // Insert match results for INV-2025-0001
  await client.query(`
    INSERT INTO match_results (
      id, invoice_id, invoice_line_id, po_line_id, matched_gr_line_id,
      match_type, match_status, invoice_qty, invoice_price, invoice_amount,
      po_qty_ordered, po_unit_price, po_line_total, gr_qty_received,
      qty_variance, price_variance, amount_variance, within_tolerance,
      tolerance_profile_id, explanation_code, explanation_details
    ) VALUES
    ('mr-1', '52025001-1111-1111-1111-111111111111', 'il-1', 'pol-1', 'grl-1',
     '3-way', 'matched', 6.000, 200.0000, 1200.00,
     10.000, 200.0000, 2000.00, 6.000,
     0.000, 0.0000, 0.00, true,
     'tol-standard', 'PERFECT_MATCH', 'Quantities and prices match within tolerance');
  `);

  // Insert match results for INV-2025-0002
  await client.query(`
    INSERT INTO match_results (
      id, invoice_id, invoice_line_id, po_line_id,
      match_type, match_status, invoice_qty, invoice_price, invoice_amount,
      po_qty_ordered, po_unit_price, po_line_total,
      qty_variance, price_variance, amount_variance, within_tolerance,
      tolerance_profile_id, explanation_code, explanation_details
    ) VALUES
    ('mr-2', '52025002-2222-2222-2222-222222222222', 'il-2', 'pol-1',
     '2-way', 'matched', 10.000, 200.0000, 2000.00,
     10.000, 200.0000, 2000.00,
     0.000, 0.0000, 0.00, true,
     'tol-standard', 'PERFECT_MATCH', 'Perfect match'),
    ('mr-3', '52025002-2222-2222-2222-222222222222', 'il-3', 'pol-2',
     '2-way', 'matched', 5.000, 200.0000, 1000.00,
     5.000, 200.0000, 1000.00,
     0.000, 0.0000, 0.00, true,
     'tol-standard', 'PERFECT_MATCH', 'Perfect match');
  `);

  // Insert approver groups
  await client.query(`
    INSERT INTO approver_groups (id, name, description) VALUES
    ('ag-1', 'Finance Managers', 'Finance department managers'),
    ('ag-2', 'Department Heads', 'All department heads');
  `);

  // Insert approver group members
  await client.query(`
    INSERT INTO approver_group_members (id, approver_group_id, user_id, can_approve, approval_limit) VALUES
    ('agm-1', 'ag-1', 'user-2', true, 10000.00),
    ('agm-2', 'ag-1', 'user-4', true, 50000.00),
    ('agm-3', 'ag-2', 'user-1', true, 100000.00);
  `);

  // Insert work items
  await client.query(`
    INSERT INTO work_items (
      id, type, status, priority, assigned_to, entity_type, entity_id,
      title, description, due_date
    ) VALUES
    ('wi-1', 'invoice_review', 'pending', 1, 'user-2', 'invoice', '52025001-1111-1111-1111-111111111111',
     'Review Invoice INV-2025-0001', 'Partial receipt - only 6 of 10 items received', '2025-09-20'),
    ('wi-2', 'invoice_review', 'pending', 1, 'user-2', 'invoice', '52025003-3333-3333-3333-333333333333',
     'Review Invoice INV-2025-0003', 'Bank details changed - requires verification', '2025-09-20');
  `);

  console.log('   ✅ All data inserted successfully');
}

// Run migration if this is the main module
if (require.main === module) {
  migrateDatabase()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateDatabase };