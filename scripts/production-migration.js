#!/usr/bin/env node
/**
 * Production Migration Orchestrator
 * Main script to migrate local database to production
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const SCRIPTS_DIR = __dirname;
const PROJECT_ROOT = path.join(__dirname, '..');

// Create readline interface
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

function runCommand(command, description) {
  console.log(`\n📍 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit', cwd: PROJECT_ROOT });
    return true;
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Production Migration Tool');
  console.log('=' .repeat(50));
  console.log('\nThis tool will:');
  console.log('  1. Export all data from your local database');
  console.log('  2. Wipe the production database completely');
  console.log('  3. Import schema and data to production');
  console.log('  4. Verify the migration');
  console.log('\n⚠️  WARNING: This is a DESTRUCTIVE operation!');
  console.log('⚠️  All production data will be PERMANENTLY DELETED!');
  console.log('');

  // Check environment
  if (!process.env.PROD_DB_HOST && !process.env.DATABASE_URL) {
    console.log('ℹ️  No production database configuration found.');
    console.log('   Set PROD_DB_* environment variables or DATABASE_URL');
    console.log('   Example:');
    console.log('     PROD_DB_HOST=your-host.com');
    console.log('     PROD_DB_PORT=5432');
    console.log('     PROD_DB_NAME=xelix_invoice_prod');
    console.log('     PROD_DB_USER=postgres');
    console.log('     PROD_DB_PASSWORD=your-password');
    console.log('');
  }

  // Get confirmation
  const confirm = await prompt('Type "MIGRATE TO PRODUCTION" to continue: ');
  
  if (confirm !== 'MIGRATE TO PRODUCTION') {
    console.log('❌ Migration cancelled.');
    rl.close();
    process.exit(0);
  }

  console.log('\n🔧 Starting migration process...\n');

  // Step 1: Export local data
  console.log('=' .repeat(50));
  console.log('STEP 1: EXPORT LOCAL DATA');
  console.log('=' .repeat(50));
  
  if (!runCommand('node scripts/export-local-data.js', 'Exporting local database')) {
    console.error('\n❌ Export failed. Migration aborted.');
    rl.close();
    process.exit(1);
  }

  // Step 2: Verify export
  console.log('\n' + '=' .repeat(50));
  console.log('STEP 2: VERIFY EXPORT');
  console.log('=' .repeat(50));
  
  const exportDir = path.join(PROJECT_ROOT, 'data-export');
  const files = fs.readdirSync(exportDir);
  const manifests = files.filter(f => f.startsWith('manifest_')).sort().reverse();
  
  if (manifests.length === 0) {
    console.error('❌ No export manifest found. Migration aborted.');
    rl.close();
    process.exit(1);
  }
  
  const manifestFile = path.join(exportDir, manifests[0]);
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  
  console.log('\n✅ Export verified:');
  console.log(`   Timestamp: ${manifest.timestamp}`);
  console.log(`   Tables: ${manifest.tables.length}`);
  console.log(`   Schema file: ${manifest.files.schema}`);
  console.log(`   Data file: ${manifest.files.data}`);

  // Step 3: Final confirmation
  console.log('\n' + '=' .repeat(50));
  console.log('⚠️  FINAL WARNING');
  console.log('=' .repeat(50));
  console.log('\nYou are about to:');
  console.log('  • DELETE all data in the production database');
  console.log('  • Replace it with data from your local database');
  console.log('  • This action CANNOT be undone');
  console.log('');
  
  const finalConfirm = await prompt('Type "YES DELETE PRODUCTION" to proceed: ');
  
  if (finalConfirm !== 'YES DELETE PRODUCTION') {
    console.log('❌ Migration cancelled.');
    rl.close();
    process.exit(0);
  }

  // Step 4: Import to production
  console.log('\n' + '=' .repeat(50));
  console.log('STEP 3: IMPORT TO PRODUCTION');
  console.log('=' .repeat(50));
  
  // Run import script
  const importProcess = spawn('node', ['scripts/import-to-production.js'], {
    cwd: PROJECT_ROOT,
    stdio: 'inherit',
    env: { ...process.env }
  });

  importProcess.on('close', (code) => {
    if (code === 0) {
      console.log('\n' + '=' .repeat(50));
      console.log('✅ MIGRATION COMPLETED SUCCESSFULLY!');
      console.log('=' .repeat(50));
      console.log('\nNext steps:');
      console.log('  1. Test your production application');
      console.log('  2. Monitor for any issues');
      console.log('  3. Keep the backup files in data-export/ until confirmed');
      console.log('\n📁 Backup files are stored in: data-export/');
      console.log('   Keep these files until you confirm production is working correctly.');
    } else {
      console.error('\n❌ Migration failed with exit code:', code);
      console.error('Check the error messages above and try again.');
    }
    rl.close();
  });

  importProcess.on('error', (error) => {
    console.error('❌ Failed to run import script:', error);
    rl.close();
    process.exit(1);
  });
}

main().catch(error => {
  console.error('❌ Unexpected error:', error);
  rl.close();
  process.exit(1);
});