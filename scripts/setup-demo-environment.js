#!/usr/bin/env node
/**
 * Demo Environment Setup Tool
 * Duplicates production Railway database to a new demo database
 *
 * Usage:
 *   node scripts/setup-demo-environment.js [options]
 *
 * Prerequisites:
 *   1. Create a new PostgreSQL service in Railway Dashboard
 *   2. Add DEMO_DATABASE_URL to .env.local
 *   3. Run this script to copy data from production to demo
 */

const SyncUtils = require('./lib/sync-utils');
const SchemaMapper = require('./lib/schema-mapper');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
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
  schemaOnly: args.includes('--schema-only'),
  dataOnly: args.includes('--data-only'),
};

// Database configurations
const PRODUCTION_DB = process.env.RAILWAY_DATABASE_URL
  ? SyncUtils.parseDatabaseUrl(process.env.RAILWAY_DATABASE_URL)
  : null;

const DEMO_DB = process.env.DEMO_DATABASE_URL
  ? SyncUtils.parseDatabaseUrl(process.env.DEMO_DATABASE_URL)
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
  console.log('🔍 Validating environment...\n');

  if (!PRODUCTION_DB) {
    console.error('❌ RAILWAY_DATABASE_URL not found in .env.local');
    console.log('\nAdd to .env.local:');
    console.log('  RAILWAY_DATABASE_URL="postgresql://user:pass@host:port/database"');
    return false;
  }

  if (!DEMO_DB) {
    console.error('❌ DEMO_DATABASE_URL not found in .env.local');
    console.log('\n📋 Setup Instructions:');
    console.log('  1. Go to Railway Dashboard');
    console.log('  2. Click "New" → "Database" → "PostgreSQL"');
    console.log('  3. Name it "xelix-invoice-demo"');
    console.log('  4. Copy the DATABASE_URL from Variables tab');
    console.log('  5. Add to .env.local:');
    console.log('     DEMO_DATABASE_URL="postgresql://..."');
    return false;
  }

  console.log('✅ Production database URL found');
  console.log('✅ Demo database URL found\n');

  console.log('🔌 Testing connections...');
  const prodConnected = await SyncUtils.testConnection(PRODUCTION_DB, 'Production Database');
  const demoConnected = await SyncUtils.testConnection(DEMO_DB, 'Demo Database');

  if (!prodConnected || !demoConnected) {
    console.error('\n❌ Cannot proceed without database connections');
    return false;
  }

  return true;
}

async function syncSchema() {
  console.log('\n📋 Step 1: Syncing Database Schema');
  console.log('=====================================\n');

  try {
    // Extract schema from production
    console.log('🔍 Extracting schema from production...');
    const schema = await SyncUtils.extractSchema(PRODUCTION_DB);

    if (options.verbose) {
      console.log(`  Found ${schema.tables?.length || 0} tables`);
      console.log(`  Found ${schema.enums?.length || 0} enums`);
    }

    // Apply schema to demo database
    console.log('📝 Applying schema to demo database...');

    // Create enums first
    if (schema.enums && schema.enums.length > 0) {
      for (const enumDef of schema.enums) {
        try {
          // Check if enum already exists
          const checkEnum = `SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${enumDef.name}')`;
          const exists = await SyncUtils.executeQuery(DEMO_DB, checkEnum);

          if (exists.includes('t')) {
            console.log(`  ⚠️  Enum ${enumDef.name} already exists`);
            continue;
          }

          const createEnum = `CREATE TYPE ${enumDef.name} AS ENUM (${enumDef.values.map(v => `'${v}'`).join(', ')})`;
          await SyncUtils.executeQuery(DEMO_DB, createEnum);
          console.log(`  ✅ Created enum: ${enumDef.name}`);
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`  ⚠️  Enum ${enumDef.name} already exists`);
          } else {
            console.error(`  ❌ Failed to create enum ${enumDef.name}:`, error.message);
            if (!options.force) throw error;
          }
        }
      }
    }

    // Create tables
    if (schema.tables && schema.tables.length > 0) {
      for (const table of schema.tables) {
        try {
          await SyncUtils.executeQuery(DEMO_DB, table.createStatement);
          console.log(`  ✅ Created table: ${table.name}`);
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log(`  ⚠️  Table ${table.name} already exists`);
          } else {
            console.error(`  ❌ Failed to create table ${table.name}:`, error.message);
            if (!options.force) throw error;
          }
        }
      }
    }

    console.log('\n✅ Schema sync completed!');
    return true;

  } catch (error) {
    console.error('\n❌ Schema sync failed:', error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    return false;
  }
}

async function syncData() {
  console.log('\n📦 Step 2: Syncing Database Data');
  console.log('===================================\n');

  const mapper = new SchemaMapper();
  const tablesToSync = mapper.getSyncOrderRecommendation();

  console.log(`📋 Tables to sync: ${tablesToSync.length}`);
  console.log('  Order:');
  tablesToSync.forEach((table, idx) => {
    console.log(`    ${idx + 1}. ${table}`);
  });

  if (options.dryRun) {
    console.log('\n🔍 DRY RUN MODE - Showing what would be synced\n');
  }

  // Create backup if not skipped
  if (!options.skipBackup && !options.dryRun) {
    console.log('\n🔒 Creating backup of demo database...');
    try {
      await SyncUtils.createBackup(DEMO_DB, './backups/demo');
      console.log('✅ Backup created successfully');
    } catch (error) {
      console.error('❌ Backup failed:', error.message);
      const answer = await prompt('Continue without backup? (y/N): ');
      if (answer.toLowerCase() !== 'y') {
        console.log('❌ Setup cancelled');
        return false;
      }
    }
  }

  // Start syncing
  const results = [];

  for (const table of tablesToSync) {
    try {
      console.log(`\n📦 Processing: ${table}`);

      if (options.dryRun) {
        const countQuery = `SELECT COUNT(*) FROM ${table}`;
        const count = await SyncUtils.executeQuery(PRODUCTION_DB, countQuery);
        console.log(`  [DRY RUN] Would sync ${count.rows[0].count} records`);
        results.push({ table, status: 'dry-run', count: count.rows[0].count });
      } else {
        // Truncate target table first for clean copy
        console.log(`  🗑️  Truncating ${table}...`);
        await SyncUtils.executeQuery(DEMO_DB, `TRUNCATE TABLE ${table} CASCADE`);

        // Perform full copy with ID preservation
        const result = await SyncUtils.fullTableCopy(
          PRODUCTION_DB,
          DEMO_DB,
          table,
          {
            truncate: false, // Already truncated above
            cascade: false,
            verbose: options.verbose
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
        console.error('\n❌ Data sync failed. Use --force to continue on errors');
        return false;
      }
    }
  }

  // Show summary
  console.log('\n📊 Data Sync Summary:');
  console.log('  ====================');

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

  return successful === results.length;
}

async function setupDemoEnvironment() {
  console.log('\n🎯 Demo Environment Setup Tool');
  console.log('================================\n');
  console.log('This will duplicate your production Railway database to a demo database.\n');

  // Validate environment
  if (!await validateEnvironment()) {
    rl.close();
    process.exit(1);
  }

  // Show configuration
  console.log('\n⚙️  Configuration:');
  console.log(`  Source: ${PRODUCTION_DB.host}:${PRODUCTION_DB.port}/${PRODUCTION_DB.database}`);
  console.log(`  Target: ${DEMO_DB.host}:${DEMO_DB.port}/${DEMO_DB.database}`);
  console.log(`  Mode: ${options.dryRun ? 'DRY RUN' : 'LIVE'}`);

  if (options.schemaOnly) {
    console.log('  Scope: Schema only (no data)');
  } else if (options.dataOnly) {
    console.log('  Scope: Data only (no schema)');
  } else {
    console.log('  Scope: Full (schema + data)');
  }

  // Get user confirmation
  if (!options.force && !options.dryRun) {
    console.log('\n⚠️  WARNING: This will REPLACE ALL DATA in the demo database!');
    const answer = await prompt('\n❓ Are you sure you want to proceed? (y/N): ');
    if (answer.toLowerCase() !== 'y') {
      console.log('❌ Setup cancelled');
      rl.close();
      process.exit(0);
    }
  }

  // Perform setup
  let success = true;

  // Step 1: Sync schema (unless data-only mode)
  if (!options.dataOnly) {
    success = await syncSchema();
    if (!success && !options.force) {
      console.log('\n❌ Setup failed at schema sync step');
      rl.close();
      process.exit(1);
    }
  }

  // Step 2: Sync data (unless schema-only mode)
  if (!options.schemaOnly) {
    success = await syncData();
    if (!success && !options.force) {
      console.log('\n❌ Setup failed at data sync step');
      rl.close();
      process.exit(1);
    }
  }

  // Final message
  if (options.dryRun) {
    console.log('\n✅ Dry run completed successfully!');
    console.log('\nRun without --dry-run to perform actual setup:');
    console.log('  node scripts/setup-demo-environment.js');
  } else if (success) {
    console.log('\n✅ Demo environment setup completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('  1. Update your demo branch .env.local:');
    console.log('     DATABASE_URL=$DEMO_DATABASE_URL');
    console.log('  2. Deploy demo branch to Railway');
    console.log('  3. Set DEMO_DATABASE_URL in Railway environment variables');
  } else {
    console.log('\n⚠️  Setup completed with some issues');
    console.log('Check the errors above and re-run with --force if needed');
  }

  rl.close();
}

// Show help if requested
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Demo Environment Setup Tool
============================

Duplicates production Railway database to a new demo database for events/testing.

Usage:
  node scripts/setup-demo-environment.js [options]

Options:
  --dry-run         Preview what would be done without making changes
  --schema-only     Only sync database schema (no data)
  --data-only       Only sync data (assumes schema exists)
  --skip-backup     Skip creating backup before sync
  --force           Continue on errors
  --verbose, -v     Show detailed output
  --help, -h        Show this help

Prerequisites:
  1. Create a new PostgreSQL service in Railway Dashboard
  2. Name it "xelix-invoice-demo" (or similar)
  3. Add DEMO_DATABASE_URL to .env.local:
     DEMO_DATABASE_URL="postgresql://user:pass@host:port/database"

Examples:
  # Preview what would be synced
  node scripts/setup-demo-environment.js --dry-run

  # Full setup (schema + data)
  node scripts/setup-demo-environment.js

  # Schema only (for initial setup)
  node scripts/setup-demo-environment.js --schema-only

  # Data only (refresh data without changing schema)
  node scripts/setup-demo-environment.js --data-only

Environment Variables:
  RAILWAY_DATABASE_URL - Production database (source)
  DEMO_DATABASE_URL    - Demo database (target)

Both should be set in .env.local file.
`);
  process.exit(0);
}

// Run the setup
setupDemoEnvironment().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  if (options.verbose) {
    console.error(error.stack);
  }
  rl.close();
  process.exit(1);
});
