#!/usr/bin/env node
/**
 * Data Sync to Railway Production
 * Main orchestrator for incremental database sync
 */

const DependencyResolver = require('./lib/dependency-resolver');
const SyncTracker = require('./lib/sync-tracker');
const SyncUtils = require('./lib/sync-utils');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local if it exists
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    // Skip comments and empty lines
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        // Only set if not already set (allows override from actual env)
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
  full: args.includes('--full'),
  verbose: args.includes('--verbose') || args.includes('-v'),
  tables: null,
  from: null,
  to: null,
  skipBackup: args.includes('--skip-backup'),
  force: args.includes('--force')
};

// Parse command line options
args.forEach((arg, index) => {
  if (arg === '--tables' && args[index + 1]) {
    options.tables = args[index + 1].split(',');
  }
  if (arg === '--from' && args[index + 1]) {
    options.from = args[index + 1];
  }
  if (arg === '--to' && args[index + 1]) {
    options.to = args[index + 1];
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

// Load config file if exists
const configFile = path.join(process.cwd(), '.syncconfig.json');
let config = {
  batchSize: 100,
  excludeTables: ['_prisma_migrations', 'test_migration'],
  dateFields: {
    default: 'created_at',
    audit_events: 'at',
    invoice_status_history: 'created_at',
    approvals: 'decided_at'
  }
};

if (fs.existsSync(configFile)) {
  try {
    const userConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    config = { ...config, ...userConfig };
  } catch (error) {
    console.warn('⚠️ Could not load config file:', error.message);
  }
}

// Create readline interface for user interaction
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
  console.log('🔄 Railway Data Sync Tool');
  console.log('========================\n');

  // Check Railway database configuration
  if (!RAILWAY_DB) {
    console.error('❌ RAILWAY_DATABASE_URL environment variable not set');
    console.log('\nTo set it, run:');
    console.log('  export RAILWAY_DATABASE_URL="postgresql://user:pass@host:port/database"');
    process.exit(1);
  }

  // Test connections
  console.log('🔌 Testing connections...');
  const localConnected = await SyncUtils.testConnection(LOCAL_DB, 'Local Database');
  const railwayConnected = await SyncUtils.testConnection(RAILWAY_DB, 'Railway Database');

  if (!localConnected || !railwayConnected) {
    console.error('\n❌ Cannot proceed without database connections');
    process.exit(1);
  }

  // Initialize components
  const resolver = new DependencyResolver(LOCAL_DB);
  const tracker = new SyncTracker();

  // Get sync information
  console.log('\n📊 Analyzing changes...');
  const lastSync = options.full ? null : tracker.getLastSync();

  if (lastSync && !options.full) {
    console.log(`  Last sync: ${lastSync}`);
  } else if (options.full) {
    console.log('  Full sync requested (ignoring sync history)');
  } else {
    console.log('  No previous sync found - this will be the initial sync');
  }

  // Determine tables to sync
  let tablesToSync = [];

  if (options.tables) {
    // User specified tables
    tablesToSync = options.tables;
    console.log(`\n📋 Tables specified: ${tablesToSync.join(', ')}`);
  } else {
    // Get all tables in dependency order
    tablesToSync = await resolver.getSyncOrder();
    // Remove excluded tables
    tablesToSync = tablesToSync.filter(table => !config.excludeTables.includes(table));
  }

  // Validate dependencies
  const validation = await resolver.validateSync(tablesToSync);
  if (!validation.valid && !options.force) {
    console.error('\n❌ Dependency validation failed:');
    validation.issues.forEach(issue => {
      console.error(`  - ${issue.message}`);
    });
    console.log('\nUse --force to override dependency checks (not recommended)');
    process.exit(1);
  }

  // Check what needs syncing
  console.log('\n📊 Checking for changes...');
  const syncPlan = [];
  let totalRecords = 0;

  for (const table of tablesToSync) {
    const dateField = config.dateFields[table] || config.dateFields.default;

    let whereClause = '';
    if (!options.full) {
      const tableLastSync = tracker.getTableLastSync(table);

      if (options.from || options.to || tableLastSync) {
        const conditions = [];

        if (options.from) {
          conditions.push(`${dateField} >= '${options.from}'`);
        } else if (tableLastSync) {
          conditions.push(`${dateField} > '${tableLastSync}'`);
        }

        if (options.to) {
          conditions.push(`${dateField} <= '${options.to}'`);
        }

        if (conditions.length > 0) {
          whereClause = `WHERE ${conditions.join(' AND ')}`;
        }
      }
    }

    // Count records to sync
    const countQuery = `SELECT COUNT(*) FROM ${table} ${whereClause}`;
    try {
      const count = parseInt(await SyncUtils.executeQuery(LOCAL_DB, countQuery), 10);

      if (count > 0) {
        syncPlan.push({
          table,
          count,
          whereClause,
          dateField
        });
        totalRecords += count;
      }
    } catch (error) {
      if (options.verbose) {
        console.warn(`  ⚠️ Could not check ${table}: ${error.message}`);
      }
    }
  }

  if (syncPlan.length === 0) {
    console.log('\n✅ Everything is up to date! No changes to sync.');
    rl.close();
    process.exit(0);
  }

  // Show sync plan
  console.log('\n📋 Sync Plan:');
  console.log('  Tables to sync:');

  // Group tables by dependency level for display
  const levels = await resolver.getSyncLevels();
  let displayOrder = 1;

  for (const level of levels) {
    const levelTables = syncPlan.filter(p => level.includes(p.table));
    if (levelTables.length > 0) {
      levelTables.forEach(plan => {
        console.log(`    ${displayOrder}. ${plan.table}: ${SyncUtils.formatNumber(plan.count)} records`);
        displayOrder++;
      });
    }
  }

  console.log(`\n  Total records to sync: ${SyncUtils.formatNumber(totalRecords)}`);

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

  // Start sync session
  const sessionId = tracker.startSync(syncPlan.map(p => p.table));
  console.log(`\n🚀 Starting sync (Session: ${sessionId})...\n`);

  let successCount = 0;
  let errorCount = 0;
  let totalSynced = 0;

  // Process each table in dependency order
  for (const plan of syncPlan) {
    try {
      console.log(`📦 Syncing ${plan.table}...`);

      if (options.dryRun) {
        console.log(`  [DRY RUN] Would sync ${plan.count} records`);
        successCount++;
      } else {
        const result = await SyncUtils.copyTableData(
          LOCAL_DB,
          RAILWAY_DB,
          plan.table,
          plan.whereClause,
          {
            batchSize: config.batchSize,
            onConflict: 'DO NOTHING',
            verbose: options.verbose
          }
        );

        tracker.updateProgress(plan.table, result.synced);
        totalSynced += result.synced;
        successCount++;

        console.log(`  ✅ Synced ${result.synced} records`);
      }
    } catch (error) {
      errorCount++;
      tracker.recordError(error, { table: plan.table });
      console.error(`  ❌ Error: ${error.message}`);

      if (!options.force) {
        console.error('\n❌ Sync failed. Use --force to continue on errors');
        tracker.completeSync('failed');
        rl.close();
        process.exit(1);
      }
    }
  }

  // Complete sync session
  const session = tracker.completeSync(errorCount > 0 ? 'partial' : 'success');

  // Show summary
  console.log('\n📊 Sync Summary:');
  console.log('  ================');
  console.log(`  Session ID: ${session.sessionId}`);
  console.log(`  Status: ${session.status}`);
  console.log(`  Tables processed: ${successCount}/${syncPlan.length}`);
  console.log(`  Records synced: ${SyncUtils.formatNumber(totalSynced)}`);
  console.log(`  Duration: ${session.duration}`);

  if (errorCount > 0) {
    console.log(`  ⚠️ Errors: ${errorCount}`);
    console.log('\n  Error details:');
    session.errors.forEach((error, index) => {
      console.log(`    ${index + 1}. ${error.context.table}: ${error.message}`);
    });
  }

  // Show next steps
  if (!options.dryRun) {
    console.log('\n✅ Sync completed successfully!');
    console.log(`  Next sync will include records created after: ${new Date().toISOString()}`);
  } else {
    console.log('\n✅ Dry run completed');
    console.log('  Run without --dry-run to perform actual sync');
  }

  rl.close();
}

// Show help if requested
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Railway Data Sync Tool
======================

Incrementally sync data from local database to Railway production.

Usage:
  npm run db:sync:data [options]

Options:
  --dry-run          Preview changes without syncing
  --full             Full sync (ignore sync history)
  --tables <list>    Sync specific tables (comma-separated)
  --from <date>      Sync records from this date
  --to <date>        Sync records up to this date
  --skip-backup      Skip creating backup
  --force            Continue on errors
  --verbose, -v      Show detailed output
  --help, -h         Show this help

Examples:
  # Incremental sync (only new records)
  npm run db:sync:data

  # Sync specific tables
  npm run db:sync:data -- --tables "invoice_headers,invoice_lines"

  # Sync date range
  npm run db:sync:data -- --from "2025-01-01" --to "2025-01-31"

  # Preview changes
  npm run db:sync:data -- --dry-run

  # Full sync (careful!)
  npm run db:sync:data -- --full

Configuration:
  Create .syncconfig.json for custom settings:
  {
    "batchSize": 100,
    "excludeTables": ["test_data"],
    "dateFields": {
      "custom_table": "custom_date_field"
    }
  }

Environment:
  RAILWAY_DATABASE_URL - Railway database connection string (required)
`);
  process.exit(0);
}

// Run main function
main().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  if (options.verbose) {
    console.error(error.stack);
  }
  process.exit(1);
});