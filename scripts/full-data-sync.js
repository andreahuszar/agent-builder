#!/usr/bin/env node
/**
 * Full Data Sync to Railway
 * Complete data replication with ID preservation
 */

const SyncUtils = require('./lib/sync-utils');
const SchemaMapper = require('./lib/schema-mapper');
const DependencyResolver = require('./lib/dependency-resolver');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local if it exists
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  });
}

// Command line arguments
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  verbose: args.includes('--verbose') || args.includes('-v'),
  skipBackup: args.includes('--skip-backup'),
  force: args.includes('--force'),
  truncate: args.includes('--truncate'),
  cascade: args.includes('--cascade'),
  tables: null,
  specificInvoices: null
};

// Parse command line options
args.forEach((arg, index) => {
  if (arg === '--tables' && args[index + 1]) {
    options.tables = args[index + 1].split(',');
  }
  if (arg === '--invoices' && args[index + 1]) {
    options.specificInvoices = args[index + 1].split(',');
  }
});

// Database configurations
const LOCAL_DB = {
  host: 'localhost',
  port: 5433,
  database: 'xelix_invoice_dev',
  user: 'postgres',
  password: 'postgres'
};

// Railway database from environment
const RAILWAY_DB = process.env.RAILWAY_DATABASE_URL
  ? SyncUtils.parseDatabaseUrl(process.env.RAILWAY_DATABASE_URL)
  : null;

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

async function validateEnvironment() {
  if (!RAILWAY_DB) {
    console.error('❌ RAILWAY_DATABASE_URL environment variable not set');
    console.log('\nTo set it, add to .env.local:');
    console.log('  RAILWAY_DATABASE_URL="postgresql://user:pass@host:port/database"');
    return false;
  }

  console.log('🔌 Testing connections...');
  const localConnected = await SyncUtils.testConnection(LOCAL_DB, 'Local Database');
  const railwayConnected = await SyncUtils.testConnection(RAILWAY_DB, 'Railway Database');

  if (!localConnected || !railwayConnected) {
    console.error('\n❌ Cannot proceed without database connections');
    return false;
  }

  return true;
}

async function performFullSync() {
  console.log('🔄 Full Data Sync Tool');
  console.log('=======================\n');

  // Validate environment
  if (!await validateEnvironment()) {
    process.exit(1);
  }

  // Initialize components
  const mapper = new SchemaMapper();
  const resolver = new DependencyResolver(LOCAL_DB);

  // Determine tables to sync
  let tablesToSync = [];

  if (options.tables) {
    tablesToSync = options.tables;
    console.log(`\n📋 Tables specified: ${tablesToSync.join(', ')}`);
  } else if (options.specificInvoices) {
    // Special mode: sync specific invoices with all related data
    tablesToSync = [
      'vendors', 'vendor_bank_accounts',
      'tax_rates', 'po_headers', 'po_lines',
      'invoice_headers', 'invoice_lines'
    ];
    console.log(`\n📋 Syncing invoices: ${options.specificInvoices.join(', ')} with related data`);
  } else {
    // Get recommended sync order
    tablesToSync = mapper.getSyncOrderRecommendation();
    console.log('\n📋 Using recommended sync order');
  }

  // Validate schema compatibility
  console.log('\n🔍 Validating schema compatibility...');
  const validationIssues = [];

  for (const table of tablesToSync) {
    const validation = await mapper.validateSchemaCompatibility(
      LOCAL_DB,
      RAILWAY_DB,
      table,
      SyncUtils
    );

    if (!validation.compatible) {
      validationIssues.push(...validation.issues);
    }
  }

  if (validationIssues.length > 0 && !options.force) {
    console.error('\n❌ Schema validation failed:');
    validationIssues.forEach(issue => {
      console.error(`  - ${issue.table}.${issue.column}: ${issue.message}`);
    });
    console.log('\nUse --force to proceed anyway (not recommended)');
    rl.close();
    process.exit(1);
  }

  // Create backup if not skipped
  if (!options.skipBackup && !options.dryRun) {
    console.log('\n🔒 Creating backup...');
    try {
      await SyncUtils.createBackup(RAILWAY_DB, './backups/railway');
    } catch (error) {
      console.error('❌ Backup failed:', error.message);
      const answer = await prompt('Continue without backup? (y/N): ');
      if (answer.toLowerCase() !== 'y') {
        console.log('❌ Sync cancelled');
        rl.close();
        process.exit(0);
      }
    }
  }

  // Show sync plan
  console.log('\n📋 Sync Plan:');
  console.log('  Mode: Full Copy with ID Preservation');
  if (options.truncate) {
    console.log(`  ⚠️  WILL TRUNCATE target tables ${options.cascade ? 'with CASCADE' : ''}`);
  }
  console.log(`  Tables to sync: ${tablesToSync.length}`);
  console.log('  Order:');
  tablesToSync.forEach((table, idx) => {
    console.log(`    ${idx + 1}. ${table}`);
  });

  if (options.dryRun) {
    console.log('\n🔍 DRY RUN MODE - No actual changes will be made');
  }

  // Get user confirmation
  if (!options.force && !options.dryRun) {
    const answer = await prompt('\n❓ Proceed with sync? (y/N): ');
    if (answer.toLowerCase() !== 'y') {
      console.log('❌ Sync cancelled');
      rl.close();
      process.exit(0);
    }
  }

  // Start syncing
  console.log('\n🚀 Starting sync...\n');
  const results = [];

  for (const table of tablesToSync) {
    try {
      console.log(`📦 Syncing table: ${table}`);

      if (options.dryRun) {
        // In dry run, just count records
        const countQuery = `SELECT COUNT(*) FROM ${table}`;
        const count = await SyncUtils.executeQuery(LOCAL_DB, countQuery);
        console.log(`  [DRY RUN] Would sync ${count} records`);
        results.push({ table, status: 'dry-run', count });
      } else {
        // Build WHERE clause if syncing specific invoices
        let whereClause = '';
        if (options.specificInvoices) {
          if (table === 'invoice_headers') {
            const invoiceList = options.specificInvoices.map(inv => `'${inv}'`).join(',');
            whereClause = `WHERE invoice_number IN (${invoiceList})`;
          } else if (table === 'invoice_lines') {
            const invoiceList = options.specificInvoices.map(inv => `'${inv}'`).join(',');
            whereClause = `WHERE invoice_id IN (SELECT id FROM invoice_headers WHERE invoice_number IN (${invoiceList}))`;
          }
          // For related tables, sync all data to maintain referential integrity
        }

        // Perform full copy with ID preservation
        const result = await SyncUtils.fullTableCopy(
          LOCAL_DB,
          RAILWAY_DB,
          table,
          {
            truncate: options.truncate && !whereClause, // Only truncate if not filtering
            cascade: options.cascade,
            verbose: options.verbose,
            whereClause
          }
        );

        results.push(result);
        console.log(`  ✅ Synced ${result.synced}/${result.source} records`);
      }

    } catch (error) {
      console.error(`  ❌ Error: ${error.message}`);
      results.push({
        table,
        status: 'error',
        error: error.message
      });

      if (!options.force) {
        console.error('\n❌ Sync failed. Use --force to continue on errors');
        break;
      }
    }
  }

  // Show summary
  console.log('\n📊 Sync Summary:');
  console.log('  ==================');

  const successful = results.filter(r => r.success || r.status === 'dry-run').length;
  const failed = results.filter(r => r.status === 'error').length;

  console.log(`  Tables processed: ${results.length}`);
  console.log(`  Successful: ${successful}`);
  if (failed > 0) {
    console.log(`  ⚠️ Failed: ${failed}`);
  }

  console.log('\n  Details:');
  results.forEach(result => {
    if (result.status === 'error') {
      console.log(`    ❌ ${result.table}: ${result.error}`);
    } else if (result.status === 'dry-run') {
      console.log(`    🔍 ${result.table}: ${result.count} records (dry-run)`);
    } else {
      const icon = result.success ? '✅' : '⚠️';
      console.log(`    ${icon} ${result.table}: ${result.synced}/${result.source} records`);
    }
  });

  if (successful === results.length && !options.dryRun) {
    console.log('\n✅ Full sync completed successfully!');
  } else if (options.dryRun) {
    console.log('\n✅ Dry run completed. Run without --dry-run to perform actual sync');
  } else {
    console.log('\n⚠️ Sync completed with some issues');
  }

  rl.close();
}

// Show help if requested
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Full Data Sync Tool
===================

Complete data replication from local to Railway with ID preservation.

Usage:
  node scripts/full-data-sync.js [options]

Options:
  --dry-run          Preview changes without syncing
  --truncate         Truncate target tables before sync
  --cascade          Use CASCADE when truncating (removes dependent data)
  --tables <list>    Sync specific tables (comma-separated)
  --invoices <list>  Sync specific invoices with related data
  --skip-backup      Skip creating backup
  --force            Continue on errors
  --verbose, -v      Show detailed output
  --help, -h         Show this help

Examples:
  # Full sync with truncate (clean slate)
  node scripts/full-data-sync.js --truncate --cascade

  # Sync specific tables
  node scripts/full-data-sync.js --tables "invoice_headers,invoice_lines"

  # Sync specific invoices
  node scripts/full-data-sync.js --invoices "INV-2025-0001,INV-2025-0002"

  # Preview changes
  node scripts/full-data-sync.js --dry-run

WARNING:
  --truncate with --cascade will DELETE ALL DATA in target tables!
  Always create a backup first unless using --skip-backup.

Environment:
  RAILWAY_DATABASE_URL - Railway database connection string (required)
`);
  process.exit(0);
}

// Run the sync
performFullSync().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  if (options.verbose) {
    console.error(error.stack);
  }
  process.exit(1);
});