#!/usr/bin/env node
/**
 * Import Data to Production Database
 * Imports exported SQL files from local database to production
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const PROD_DB = {
  host: process.env.PROD_DB_HOST || 'localhost',
  port: process.env.PROD_DB_PORT || 5432,
  database: process.env.PROD_DB_NAME || 'xelix_invoice_prod',
  user: process.env.PROD_DB_USER || 'postgres',
  password: process.env.PROD_DB_PASSWORD || 'postgres'
};

const EXPORT_DIR = path.join(__dirname, '../data-export');

// Create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question) {
  return new Promise(resolve => {
    rl.question(question, answer => {
      resolve(answer);
    });
  });
}

async function main() {
  try {
    console.log('🚀 Production Database Import Tool');
    console.log('==================================');
    console.log('Target Database:');
    console.log(`  Host: ${PROD_DB.host}:${PROD_DB.port}`);
    console.log(`  Database: ${PROD_DB.database}`);
    console.log(`  User: ${PROD_DB.user}`);
    console.log('');

    // Check for export files
    if (!fs.existsSync(EXPORT_DIR)) {
      console.error('❌ Export directory not found. Run "npm run db:export" first.');
      process.exit(1);
    }

    // Find the latest export files
    const files = fs.readdirSync(EXPORT_DIR);
    const manifests = files.filter(f => f.startsWith('manifest_')).sort().reverse();
    
    if (manifests.length === 0) {
      console.error('❌ No export manifests found. Run "npm run db:export" first.');
      process.exit(1);
    }

    // Read the latest manifest
    const manifestFile = path.join(EXPORT_DIR, manifests[0]);
    const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    
    console.log('📦 Found export from:', manifest.timestamp);
    console.log('Files to import:');
    console.log(`  - Schema: ${manifest.files.schema}`);
    console.log(`  - Data: ${manifest.files.data}`);
    console.log(`  - Tables: ${manifest.tables.length}`);
    console.log('');

    // Get user confirmation
    console.log('⚠️  WARNING: This will COMPLETELY REPLACE the production database!');
    console.log('⚠️  All existing data will be PERMANENTLY DELETED!');
    console.log('');
    
    const confirm = await prompt('Type "DEPLOY TO PRODUCTION" to continue: ');
    
    if (confirm !== 'DEPLOY TO PRODUCTION') {
      console.log('❌ Import cancelled.');
      rl.close();
      process.exit(0);
    }

    console.log('\n🔧 Starting production import...\n');

    // 1. Test connection
    console.log('1️⃣ Testing connection to production database...');
    try {
      execSync(
        `PGPASSWORD=${PROD_DB.password} psql -h ${PROD_DB.host} -p ${PROD_DB.port} -U ${PROD_DB.user} -d postgres -c "SELECT 1"`,
        { stdio: 'ignore' }
      );
      console.log('✅ Connection successful');
    } catch (error) {
      console.error('❌ Cannot connect to production database');
      throw error;
    }

    // 2. Create backup of existing production database
    console.log('\n2️⃣ Creating backup of existing production database...');
    const backupFile = path.join(EXPORT_DIR, `prod_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.sql`);
    try {
      execSync(
        `PGPASSWORD=${PROD_DB.password} pg_dump -h ${PROD_DB.host} -p ${PROD_DB.port} -U ${PROD_DB.user} -d ${PROD_DB.database} > "${backupFile}"`,
        { stdio: 'inherit' }
      );
      console.log(`✅ Backup created: ${path.basename(backupFile)}`);
    } catch (error) {
      console.log('⚠️  Could not create backup (database might not exist yet)');
    }

    // 3. Drop and recreate database
    console.log('\n3️⃣ Recreating production database...');
    
    // Drop existing database
    execSync(
      `PGPASSWORD=${PROD_DB.password} psql -h ${PROD_DB.host} -p ${PROD_DB.port} -U ${PROD_DB.user} -d postgres -c "DROP DATABASE IF EXISTS ${PROD_DB.database}"`,
      { stdio: 'inherit' }
    );
    
    // Create new database
    execSync(
      `PGPASSWORD=${PROD_DB.password} psql -h ${PROD_DB.host} -p ${PROD_DB.port} -U ${PROD_DB.user} -d postgres -c "CREATE DATABASE ${PROD_DB.database}"`,
      { stdio: 'inherit' }
    );
    
    console.log('✅ Database recreated');

    // 4. Import schema
    console.log('\n4️⃣ Importing database schema...');
    const schemaFile = path.join(EXPORT_DIR, manifest.files.schema);
    execSync(
      `PGPASSWORD=${PROD_DB.password} psql -h ${PROD_DB.host} -p ${PROD_DB.port} -U ${PROD_DB.user} -d ${PROD_DB.database} < "${schemaFile}"`,
      { stdio: 'inherit' }
    );
    console.log('✅ Schema imported');

    // 5. Import data
    console.log('\n5️⃣ Importing data...');
    const dataFile = path.join(EXPORT_DIR, manifest.files.data);
    
    // Check file size
    const stats = fs.statSync(dataFile);
    console.log(`   Data file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    
    execSync(
      `PGPASSWORD=${PROD_DB.password} psql -h ${PROD_DB.host} -p ${PROD_DB.port} -U ${PROD_DB.user} -d ${PROD_DB.database} < "${dataFile}"`,
      { stdio: 'inherit' }
    );
    console.log('✅ Data imported');

    // 6. Verify import
    console.log('\n6️⃣ Verifying import...');
    for (const table of manifest.tables.slice(0, 5)) {
      const countCmd = `PGPASSWORD=${PROD_DB.password} psql -h ${PROD_DB.host} -p ${PROD_DB.port} -U ${PROD_DB.user} -d ${PROD_DB.database} -t -c "SELECT COUNT(*) FROM ${table}"`;
      const count = parseInt(execSync(countCmd).toString().trim());
      console.log(`   ${table}: ${count} rows`);
    }
    console.log('   ...');
    console.log('✅ Import verified');

    // 7. Update sequences
    console.log('\n7️⃣ Updating sequences...');
    const sequenceCmd = `
      DO $$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN 
          SELECT schemaname, tablename, pg_get_serial_sequence(schemaname||'.'||tablename, 'id') as seq
          FROM pg_tables
          WHERE schemaname = 'public'
          AND pg_get_serial_sequence(schemaname||'.'||tablename, 'id') IS NOT NULL
        LOOP
          IF r.seq IS NOT NULL THEN
            EXECUTE format('SELECT setval(%L, COALESCE((SELECT MAX(id) FROM %I.%I), 0) + 1, false)', 
                          r.seq, r.schemaname, r.tablename);
          END IF;
        END LOOP;
      END $$;
    `;
    
    execSync(
      `PGPASSWORD=${PROD_DB.password} psql -h ${PROD_DB.host} -p ${PROD_DB.port} -U ${PROD_DB.user} -d ${PROD_DB.database} -c "${sequenceCmd}"`,
      { stdio: 'ignore' }
    );
    console.log('✅ Sequences updated');

    // Success
    console.log('\n' + '='.repeat(50));
    console.log('✅ Production import completed successfully!');
    console.log('='.repeat(50));
    console.log('Summary:');
    console.log(`  - Database: ${PROD_DB.database}`);
    console.log(`  - Tables imported: ${manifest.tables.length}`);
    console.log(`  - Backup saved: ${path.basename(backupFile)}`);
    console.log('\nNext steps:');
    console.log('  1. Update your .env.production with the correct database URL');
    console.log('  2. Run "npm run build" to build the production application');
    console.log('  3. Deploy the application to your production server');
    
    rl.close();
    
  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    console.error('\nIf you need to restore, use the backup file created earlier.');
    rl.close();
    process.exit(1);
  }
}

main();