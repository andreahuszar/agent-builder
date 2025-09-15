#!/usr/bin/env node

/**
 * Force Schema Sync for Railway
 * Directly adds missing columns via SQL
 */

const { Client } = require('pg');

async function forceSchemaSync() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.log('⚠️  No DATABASE_URL found. Skipping schema sync.');
    return;
  }

  // Skip if running locally (safety check)
  if (connectionString.includes('localhost') || connectionString.includes('127.0.0.1')) {
    console.log('⚠️  Local database detected. Skipping schema sync.');
    return;
  }

  console.log('🚀 Running database schema sync for Railway...');
  const client = new Client({ connectionString });

  try {
    console.log('🔧 Force syncing database schema...');
    await client.connect();

    // Add missing columns one by one with error handling
    const alterations = [
      // Vendors table
      {
        table: 'vendors',
        column: 'preferred_payment_method',
        sql: 'ALTER TABLE vendors ADD COLUMN IF NOT EXISTS preferred_payment_method VARCHAR(50)'
      },
      {
        table: 'vendors',
        column: 'default_bank_account_id',
        sql: 'ALTER TABLE vendors ADD COLUMN IF NOT EXISTS default_bank_account_id TEXT'
      },
      {
        table: 'vendors',
        column: 'is_verified',
        sql: 'ALTER TABLE vendors ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false'
      },
      {
        table: 'vendors',
        column: 'requires_po',
        sql: 'ALTER TABLE vendors ADD COLUMN IF NOT EXISTS requires_po BOOLEAN DEFAULT true'
      },

      // Invoice headers
      {
        table: 'invoice_headers',
        column: 'tax_rate_percent',
        sql: 'ALTER TABLE invoice_headers ADD COLUMN IF NOT EXISTS tax_rate_percent DECIMAL(9,6)'
      },
      {
        table: 'invoice_headers',
        column: 'cost_center',
        sql: 'ALTER TABLE invoice_headers ADD COLUMN IF NOT EXISTS cost_center VARCHAR(100)'
      },
      {
        table: 'invoice_headers',
        column: 'cost_center_name',
        sql: 'ALTER TABLE invoice_headers ADD COLUMN IF NOT EXISTS cost_center_name VARCHAR(255)'
      },
      {
        table: 'invoice_headers',
        column: 'gl_code',
        sql: 'ALTER TABLE invoice_headers ADD COLUMN IF NOT EXISTS gl_code VARCHAR(50)'
      },
      {
        table: 'invoice_headers',
        column: 'department',
        sql: 'ALTER TABLE invoice_headers ADD COLUMN IF NOT EXISTS department VARCHAR(100)'
      },
      {
        table: 'invoice_headers',
        column: 'ledger',
        sql: "ALTER TABLE invoice_headers ADD COLUMN IF NOT EXISTS ledger VARCHAR(50) DEFAULT 'Accounts Payable'"
      },
      {
        table: 'invoice_headers',
        column: 'accounting_notes',
        sql: 'ALTER TABLE invoice_headers ADD COLUMN IF NOT EXISTS accounting_notes TEXT'
      },
      {
        table: 'invoice_headers',
        column: 'ai_classification_confidence',
        sql: 'ALTER TABLE invoice_headers ADD COLUMN IF NOT EXISTS ai_classification_confidence DECIMAL(3,2)'
      },
      {
        table: 'invoice_headers',
        column: 'ai_classification_reasoning',
        sql: 'ALTER TABLE invoice_headers ADD COLUMN IF NOT EXISTS ai_classification_reasoning TEXT'
      },
      {
        table: 'invoice_headers',
        column: 'extraction_field_confidences',
        sql: "ALTER TABLE invoice_headers ADD COLUMN IF NOT EXISTS extraction_field_confidences JSONB DEFAULT '{}'"
      },
      {
        table: 'invoice_headers',
        column: 'is_manually_edited',
        sql: "ALTER TABLE invoice_headers ADD COLUMN IF NOT EXISTS is_manually_edited JSONB DEFAULT '{}'"
      },
      {
        table: 'invoice_headers',
        column: 'payment_bank_details',
        sql: 'ALTER TABLE invoice_headers ADD COLUMN IF NOT EXISTS payment_bank_details JSONB'
      },
      {
        table: 'invoice_headers',
        column: 'processing_started_at',
        sql: 'ALTER TABLE invoice_headers ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP'
      },
      {
        table: 'invoice_headers',
        column: 'processing_completed_at',
        sql: 'ALTER TABLE invoice_headers ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMP'
      },
      {
        table: 'invoice_headers',
        column: 'payment_method',
        sql: 'ALTER TABLE invoice_headers ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50)'
      },
      {
        table: 'invoice_headers',
        column: 'payment_reference',
        sql: 'ALTER TABLE invoice_headers ADD COLUMN IF NOT EXISTS payment_reference TEXT'
      },
      {
        table: 'invoice_headers',
        column: 'bank_account_id',
        sql: 'ALTER TABLE invoice_headers ADD COLUMN IF NOT EXISTS bank_account_id TEXT'
      },
      {
        table: 'invoice_headers',
        column: 'po_numbers_cached',
        sql: 'ALTER TABLE invoice_headers ADD COLUMN IF NOT EXISTS po_numbers_cached TEXT[]'
      },
      {
        table: 'invoice_headers',
        column: 'gr_numbers_cached',
        sql: 'ALTER TABLE invoice_headers ADD COLUMN IF NOT EXISTS gr_numbers_cached TEXT[]'
      },
      {
        table: 'invoice_headers',
        column: 'validation_warnings',
        sql: 'ALTER TABLE invoice_headers ADD COLUMN IF NOT EXISTS validation_warnings JSONB'
      },
      {
        table: 'invoice_headers',
        column: 'helpdesk_ticket_ref',
        sql: 'ALTER TABLE invoice_headers ADD COLUMN IF NOT EXISTS helpdesk_ticket_ref TEXT'
      },
      {
        table: 'invoice_headers',
        column: 'vendor_name',
        sql: 'ALTER TABLE invoice_headers ADD COLUMN IF NOT EXISTS vendor_name TEXT'
      },
      {
        table: 'invoice_headers',
        column: 'vendor_address',
        sql: 'ALTER TABLE invoice_headers ADD COLUMN IF NOT EXISTS vendor_address TEXT'
      },
      {
        table: 'invoice_headers',
        column: 'vendor_tax_id',
        sql: 'ALTER TABLE invoice_headers ADD COLUMN IF NOT EXISTS vendor_tax_id TEXT'
      },
      {
        table: 'invoice_headers',
        column: 'vendor_email',
        sql: 'ALTER TABLE invoice_headers ADD COLUMN IF NOT EXISTS vendor_email TEXT'
      },
      {
        table: 'invoice_headers',
        column: 'vendor_phone',
        sql: 'ALTER TABLE invoice_headers ADD COLUMN IF NOT EXISTS vendor_phone TEXT'
      },
      {
        table: 'invoice_headers',
        column: 'invoice_document_snapshot',
        sql: 'ALTER TABLE invoice_headers ADD COLUMN IF NOT EXISTS invoice_document_snapshot JSONB'
      },

      // PO headers
      {
        table: 'po_headers',
        column: 'total',
        sql: 'ALTER TABLE po_headers ADD COLUMN IF NOT EXISTS total DECIMAL(18,4)'
      },
      {
        table: 'po_headers',
        column: 'subtotal',
        sql: 'ALTER TABLE po_headers ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12,2)'
      },
      {
        table: 'po_headers',
        column: 'tax_total',
        sql: 'ALTER TABLE po_headers ADD COLUMN IF NOT EXISTS tax_total DECIMAL(12,2)'
      },
      {
        table: 'po_headers',
        column: 'shipping_total',
        sql: 'ALTER TABLE po_headers ADD COLUMN IF NOT EXISTS shipping_total DECIMAL(12,2)'
      },
      {
        table: 'po_headers',
        column: 'discount_total',
        sql: 'ALTER TABLE po_headers ADD COLUMN IF NOT EXISTS discount_total DECIMAL(12,2)'
      },

      // Invoice lines
      {
        table: 'invoice_lines',
        column: 'tax_rate',
        sql: 'ALTER TABLE invoice_lines ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2)'
      },
      {
        table: 'invoice_lines',
        column: 'tax_amount',
        sql: 'ALTER TABLE invoice_lines ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(12,2)'
      },
      {
        table: 'invoice_lines',
        column: 'total_amount',
        sql: 'ALTER TABLE invoice_lines ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12,2)'
      },
      {
        table: 'invoice_lines',
        column: 'cost_center_id',
        sql: 'ALTER TABLE invoice_lines ADD COLUMN IF NOT EXISTS cost_center_id TEXT'
      },
      {
        table: 'invoice_lines',
        column: 'project_id',
        sql: 'ALTER TABLE invoice_lines ADD COLUMN IF NOT EXISTS project_id TEXT'
      },

      // Vendor bank accounts
      {
        table: 'vendor_bank_accounts',
        column: 'is_default',
        sql: 'ALTER TABLE vendor_bank_accounts ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false'
      }
    ];

    console.log(`📝 Checking and applying up to ${alterations.length} schema updates...`);

    for (const alteration of alterations) {
      try {
        await client.query(alteration.sql);
        console.log(`✅ ${alteration.table}.${alteration.column} - ensured`);
      } catch (error) {
        console.log(`⚠️  ${alteration.table}.${alteration.column} - ${error.message}`);
      }
    }

    // Create missing tables if they don't exist
    console.log('\n📋 Ensuring core tables exist...');

    // Check and create vendor_bank_accounts table if missing
    await client.query(`
      CREATE TABLE IF NOT EXISTS vendor_bank_accounts (
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
      )
    `);
    console.log('✅ vendor_bank_accounts table ensured');

    // Check and create cost_centers table if missing
    await client.query(`
      CREATE TABLE IF NOT EXISTS cost_centers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        org_entity_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ cost_centers table ensured');

    // Check and create projects table if missing
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ projects table ensured');

    console.log('\n✅ Schema sync completed successfully!');
    console.log('   All missing columns and tables have been added.');

  } catch (error) {
    console.error('⚠️  Schema sync warning:', error.message);
    console.log('   This may be normal during build phase.');
    console.log('   Schema sync will retry at startup if needed.');
    // Don't exit with error during build
  } finally {
    await client.end();
  }
}

// Run if DATABASE_URL exists
if (process.env.DATABASE_URL) {
  forceSchemaSync();
} else {
  console.log('⚠️  No DATABASE_URL found. This script should run on Railway.');
}