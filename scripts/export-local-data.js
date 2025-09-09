#!/usr/bin/env node
/**
 * Export Local Database Data
 * Exports all data from local database to SQL files for production import
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const LOCAL_DB = {
  host: 'localhost',
  port: 5433,
  database: 'xelix_invoice_dev',
  user: 'postgres',
  password: 'postgres'
};

const EXPORT_DIR = path.join(__dirname, '../data-export');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');

// Ensure export directory exists
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

console.log('🔧 Starting local database export...');
console.log(`📁 Export directory: ${EXPORT_DIR}`);

// Tables to export in order (respecting foreign key constraints)
const TABLES = [
  // Core entities
  'users',
  'payment_terms',
  'org_entities',
  'cost_centers',
  'projects',
  'tax_rates',
  'items',
  'tolerance_profiles',
  'ship_to_sites',
  'uom_conversions',
  
  // Vendors and related
  'vendors',
  'vendor_bank_accounts',
  
  // Purchase orders
  'po_headers',
  'po_lines',
  
  // Goods receipts
  'gr_headers',
  'gr_lines',
  
  // Service entries
  'ses_headers',
  'ses_lines',
  
  // Invoices and related
  'invoice_headers',
  'invoice_lines',
  'invoice_line_distributions',
  'invoice_line_receipts',
  'invoice_line_taxes',
  'invoice_status_history',
  
  // Matching and approvals
  'match_results',
  'approval_policies',
  'approver_groups',
  'approver_group_members',
  'approvals',
  
  // Supporting tables
  'attachments',
  'source_files',
  'external_refs',
  'audit_events',
  'work_items',
  'agent_runs'
];

try {
  // 1. Export schema (structure only)
  console.log('\n📋 Exporting database schema...');
  const schemaFile = path.join(EXPORT_DIR, `schema_${TIMESTAMP}.sql`);
  execSync(
    `PGPASSWORD=${LOCAL_DB.password} pg_dump -h ${LOCAL_DB.host} -p ${LOCAL_DB.port} -U ${LOCAL_DB.user} -d ${LOCAL_DB.database} --schema-only --no-owner --no-privileges > "${schemaFile}"`,
    { stdio: 'inherit' }
  );
  console.log(`✅ Schema exported to: ${schemaFile}`);

  // 2. Export data for each table
  console.log('\n📊 Exporting table data...');
  const dataFile = path.join(EXPORT_DIR, `data_${TIMESTAMP}.sql`);
  
  // Start with header
  fs.writeFileSync(dataFile, `-- Local Database Export: ${new Date().toISOString()}\n`);
  fs.appendFileSync(dataFile, `-- Database: ${LOCAL_DB.database}\n`);
  fs.appendFileSync(dataFile, `-- Tables: ${TABLES.length}\n\n`);
  fs.appendFileSync(dataFile, `BEGIN;\n\n`);
  
  for (const table of TABLES) {
    console.log(`  Exporting ${table}...`);
    
    // Get row count
    const countCmd = `PGPASSWORD=${LOCAL_DB.password} psql -h ${LOCAL_DB.host} -p ${LOCAL_DB.port} -U ${LOCAL_DB.user} -d ${LOCAL_DB.database} -t -c "SELECT COUNT(*) FROM ${table}"`;
    const count = parseInt(execSync(countCmd).toString().trim());
    
    if (count > 0) {
      fs.appendFileSync(dataFile, `-- Table: ${table} (${count} rows)\n`);
      
      // Export data as INSERT statements
      const tempFile = path.join(EXPORT_DIR, `temp_${table}.sql`);
      execSync(
        `PGPASSWORD=${LOCAL_DB.password} pg_dump -h ${LOCAL_DB.host} -p ${LOCAL_DB.port} -U ${LOCAL_DB.user} -d ${LOCAL_DB.database} --data-only --table=${table} --column-inserts > "${tempFile}"`,
        { stdio: 'ignore' }
      );
      
      // Read and append to main file
      const tableData = fs.readFileSync(tempFile, 'utf8');
      // Remove SET statements and keep only INSERT statements
      const inserts = tableData
        .split('\n')
        .filter(line => line.startsWith('INSERT INTO'))
        .join('\n');
      
      fs.appendFileSync(dataFile, inserts + '\n\n');
      fs.unlinkSync(tempFile); // Clean up temp file
      
      console.log(`    ✅ Exported ${count} rows from ${table}`);
    } else {
      console.log(`    ⏭️  Skipped ${table} (empty)`);
    }
  }
  
  fs.appendFileSync(dataFile, `COMMIT;\n`);
  console.log(`\n✅ Data exported to: ${dataFile}`);

  // 3. Create a manifest file
  const manifestFile = path.join(EXPORT_DIR, `manifest_${TIMESTAMP}.json`);
  const manifest = {
    timestamp: new Date().toISOString(),
    database: LOCAL_DB.database,
    tables: TABLES,
    files: {
      schema: path.basename(schemaFile),
      data: path.basename(dataFile)
    }
  };
  
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
  console.log(`\n📄 Manifest created: ${manifestFile}`);

  // 4. Create combined export file
  console.log('\n🔗 Creating combined export file...');
  const combinedFile = path.join(EXPORT_DIR, `complete_export_${TIMESTAMP}.sql`);
  
  fs.writeFileSync(combinedFile, `-- Complete Database Export: ${new Date().toISOString()}\n`);
  fs.appendFileSync(combinedFile, `-- This file contains both schema and data\n\n`);
  
  // Add schema
  fs.appendFileSync(combinedFile, fs.readFileSync(schemaFile, 'utf8'));
  fs.appendFileSync(combinedFile, '\n\n-- DATA SECTION --\n\n');
  
  // Add data
  fs.appendFileSync(combinedFile, fs.readFileSync(dataFile, 'utf8'));
  
  console.log(`✅ Combined export: ${combinedFile}`);

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('✅ Export completed successfully!');
  console.log('='.repeat(50));
  console.log('Files created:');
  console.log(`  - Schema: ${path.basename(schemaFile)}`);
  console.log(`  - Data: ${path.basename(dataFile)}`);
  console.log(`  - Combined: ${path.basename(combinedFile)}`);
  console.log(`  - Manifest: ${path.basename(manifestFile)}`);
  console.log('\nNext steps:');
  console.log('  1. Review the exported files');
  console.log('  2. Run "npm run db:production:import" to import to production');
  
} catch (error) {
  console.error('\n❌ Export failed:', error.message);
  process.exit(1);
}