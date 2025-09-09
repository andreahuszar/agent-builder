#!/usr/bin/env node
/**
 * Alternative Export Local Database Data
 * Uses COPY commands to avoid pg_dump version issues
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

console.log('🔧 Starting local database export (alternative method)...');
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

function runPsql(query, outputFile = null) {
  const cmd = outputFile 
    ? `PGPASSWORD=${LOCAL_DB.password} psql -h ${LOCAL_DB.host} -p ${LOCAL_DB.port} -U ${LOCAL_DB.user} -d ${LOCAL_DB.database} -c "${query}" > "${outputFile}"`
    : `PGPASSWORD=${LOCAL_DB.password} psql -h ${LOCAL_DB.host} -p ${LOCAL_DB.port} -U ${LOCAL_DB.user} -d ${LOCAL_DB.database} -t -c "${query}"`;
  
  return execSync(cmd, { encoding: 'utf8' });
}

try {
  // 1. Export schema using psql
  console.log('\n📋 Exporting database schema...');
  const schemaFile = path.join(EXPORT_DIR, `schema_${TIMESTAMP}.sql`);
  
  // Get CREATE TABLE statements
  fs.writeFileSync(schemaFile, `-- Database Schema Export: ${new Date().toISOString()}\n`);
  fs.appendFileSync(schemaFile, `-- Database: ${LOCAL_DB.database}\n\n`);
  
  // Get table definitions
  for (const table of TABLES) {
    console.log(`  Exporting schema for ${table}...`);
    
    // Get table DDL
    const ddlQuery = `
      SELECT 
        'CREATE TABLE IF NOT EXISTS ' || tablename || ' (' || E'\\n' ||
        array_to_string(
          array_agg(
            '  ' || column_name || ' ' || 
            data_type || 
            CASE 
              WHEN character_maximum_length IS NOT NULL 
              THEN '(' || character_maximum_length || ')' 
              ELSE '' 
            END ||
            CASE 
              WHEN is_nullable = 'NO' THEN ' NOT NULL' 
              ELSE '' 
            END
          ), E',\\n'
        ) || E'\\n);'
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = '${table}'
      GROUP BY tablename;
    `;
    
    try {
      const ddl = runPsql(ddlQuery);
      if (ddl && ddl.trim()) {
        fs.appendFileSync(schemaFile, `\n-- Table: ${table}\n`);
        fs.appendFileSync(schemaFile, ddl.trim() + '\n');
      }
    } catch (err) {
      console.log(`    Skipping ${table} (might not exist)`);
    }
  }
  
  console.log(`✅ Schema exported to: ${schemaFile}`);

  // 2. Export data
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
    try {
      const count = parseInt(runPsql(`SELECT COUNT(*) FROM ${table}`).trim());
      
      if (count > 0) {
        fs.appendFileSync(dataFile, `-- Table: ${table} (${count} rows)\n`);
        
        // Export data using COPY TO
        const tempFile = path.join(EXPORT_DIR, `temp_${table}.csv`);
        execSync(
          `PGPASSWORD=${LOCAL_DB.password} psql -h ${LOCAL_DB.host} -p ${LOCAL_DB.port} -U ${LOCAL_DB.user} -d ${LOCAL_DB.database} -c "\\COPY ${table} TO '${tempFile}' WITH CSV HEADER"`,
          { stdio: 'ignore' }
        );
        
        // Convert CSV to INSERT statements
        const csvContent = fs.readFileSync(tempFile, 'utf8');
        const lines = csvContent.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        fs.appendFileSync(dataFile, `-- Clear existing data\n`);
        fs.appendFileSync(dataFile, `DELETE FROM ${table};\n`);
        
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim()) {
            fs.appendFileSync(dataFile, `INSERT INTO ${table} (${headers.join(', ')}) VALUES (${lines[i]});\n`);
          }
        }
        
        fs.unlinkSync(tempFile); // Clean up temp file
        fs.appendFileSync(dataFile, '\n');
        
        console.log(`    ✅ Exported ${count} rows from ${table}`);
      } else {
        console.log(`    ⏭️  Skipped ${table} (empty)`);
      }
    } catch (err) {
      console.log(`    ⏭️  Skipped ${table} (error: ${err.message})`);
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
    },
    method: 'psql-copy'
  };
  
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
  console.log(`\n📄 Manifest created: ${manifestFile}`);

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('✅ Export completed successfully!');
  console.log('='.repeat(50));
  console.log('Files created:');
  console.log(`  - Schema: ${path.basename(schemaFile)}`);
  console.log(`  - Data: ${path.basename(dataFile)}`);
  console.log(`  - Manifest: ${path.basename(manifestFile)}`);
  console.log('\nNext steps:');
  console.log('  1. Review the exported files');
  console.log('  2. Run "npm run db:production:import" to import to production');
  
} catch (error) {
  console.error('\n❌ Export failed:', error.message);
  process.exit(1);
}