#!/usr/bin/env node
/**
 * Database Backup Script
 * Creates timestamped backups of database schema and data
 * Format: DD-MM-YY-HH-MIN-{git_commit_hash}
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 5433,
  database: process.env.DB_NAME || 'xelix_invoice_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
};

// Paths
const PROJECT_ROOT = path.join(__dirname, '..');
const DUMPS_DIR = path.join(PROJECT_ROOT, 'dumps');
const BACKUPS_DIR = path.join(DUMPS_DIR, 'backups');
const LATEST_LINK = path.join(DUMPS_DIR, 'latest');

// Ensure directories exist
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

console.log('🔧 Database Backup Script');
console.log('========================');
console.log(`📦 Database: ${DB_CONFIG.database}`);
console.log(`🔌 Host: ${DB_CONFIG.host}:${DB_CONFIG.port}`);

// Check for uncommitted changes
function checkGitStatus() {
  try {
    const status = execSync('git status --porcelain', { cwd: PROJECT_ROOT }).toString();
    if (status.trim()) {
      console.log('\n⚠️  Uncommitted changes detected. Creating commit...');
      
      // Add all changes
      execSync('git add -A', { cwd: PROJECT_ROOT });
      
      // Create commit
      const commitMessage = `chore: Auto-commit before database backup\n\nAutomated commit to align code with database backup`;
      execSync(`git commit -m "${commitMessage}"`, { cwd: PROJECT_ROOT });
      console.log('✅ Changes committed');
    }
  } catch (error) {
    console.error('❌ Git operations failed:', error.message);
    process.exit(1);
  }
}

// Get current git commit hash
function getGitCommit() {
  try {
    const hash = execSync('git rev-parse --short HEAD', { cwd: PROJECT_ROOT })
      .toString()
      .trim();
    console.log(`📝 Git commit: ${hash}`);
    return hash;
  } catch (error) {
    console.error('❌ Failed to get git commit:', error.message);
    return 'no-commit';
  }
}

// Create timestamp
function createTimestamp() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${dd}-${mm}-${yy}-${hh}-${min}`;
}

// Create backup directory
function createBackupDir(timestamp, commit) {
  const dirName = `${timestamp}-${commit}`;
  const backupPath = path.join(BACKUPS_DIR, dirName);
  
  if (fs.existsSync(backupPath)) {
    console.error(`❌ Backup already exists: ${dirName}`);
    process.exit(1);
  }
  
  fs.mkdirSync(backupPath, { recursive: true });
  console.log(`📁 Created backup directory: ${dirName}`);
  return backupPath;
}

// Execute pg_dump command
function pgDump(args, outputFile, description) {
  const env = {
    PGPASSWORD: DB_CONFIG.password,
    PATH: process.env.PATH
  };
  
  const command = [
    'pg_dump',
    `-h ${DB_CONFIG.host}`,
    `-p ${DB_CONFIG.port}`,
    `-U ${DB_CONFIG.user}`,
    `-d ${DB_CONFIG.database}`,
    '--no-owner',
    '--no-privileges',
    '--no-comments',
    args
  ].join(' ');
  
  try {
    console.log(`⏳ Creating ${description}...`);
    execSync(`${command} > "${outputFile}"`, { env });
    const size = (fs.statSync(outputFile).size / 1024).toFixed(1);
    console.log(`✅ ${description} created (${size} KB)`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to create ${description}:`, error.message);
    return false;
  }
}

// Get database statistics
function getDatabaseStats() {
  const env = { PGPASSWORD: DB_CONFIG.password };
  const psqlBase = `psql -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -U ${DB_CONFIG.user} -d ${DB_CONFIG.database} -t -c`;
  
  try {
    // Count tables
    const tableCount = execSync(
      `${psqlBase} "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';"`,
      { env }
    ).toString().trim();
    
    // Count total rows (approximate)
    const rowCount = execSync(
      `${psqlBase} "SELECT SUM(n_live_tup) FROM pg_stat_user_tables;"`,
      { env }
    ).toString().trim();
    
    // Database size
    const dbSize = execSync(
      `${psqlBase} "SELECT pg_size_pretty(pg_database_size('${DB_CONFIG.database}'));"`,
      { env }
    ).toString().trim();
    
    return {
      tables: parseInt(tableCount) || 0,
      rows: parseInt(rowCount) || 0,
      size: dbSize
    };
  } catch (error) {
    console.warn('⚠️  Could not get database statistics');
    return { tables: 0, rows: 0, size: 'unknown' };
  }
}

// Create metadata file
function createMetadata(backupPath, timestamp, commit) {
  const stats = getDatabaseStats();
  const metadata = {
    timestamp: new Date().toISOString(),
    timestampFormatted: timestamp,
    gitCommit: commit,
    database: DB_CONFIG.database,
    host: `${DB_CONFIG.host}:${DB_CONFIG.port}`,
    postgresVersion: getPostgresVersion(),
    statistics: stats,
    files: {
      schema: 'schema.sql',
      data: 'data.sql',
      full: 'full.dump'
    },
    description: process.argv[2] || 'Manual backup'
  };
  
  const metadataPath = path.join(backupPath, 'metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  console.log('📋 Metadata saved');
  return metadata;
}

// Get PostgreSQL version
function getPostgresVersion() {
  try {
    const env = { PGPASSWORD: DB_CONFIG.password };
    const version = execSync(
      `psql -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -U ${DB_CONFIG.user} -d ${DB_CONFIG.database} -t -c "SELECT version();"`,
      { env }
    ).toString().trim();
    return version.split(' ')[1];
  } catch (error) {
    return 'unknown';
  }
}

// Create restore script
function createRestoreScript(backupPath, timestamp, commit) {
  const script = `#!/bin/bash
# Restore script for backup ${timestamp}-${commit}
# Generated: ${new Date().toISOString()}

set -e

# Configuration
DB_HOST="${DB_CONFIG.host}"
DB_PORT="${DB_CONFIG.port}"
DB_NAME="${DB_CONFIG.database}"
DB_USER="${DB_CONFIG.user}"

echo "🔄 Database Restore Script"
echo "========================"
echo "Backup: ${timestamp}-${commit}"
echo "Database: $DB_NAME"
echo ""
echo "⚠️  WARNING: This will DROP and RECREATE the database!"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

# Set password
export PGPASSWORD="${DB_CONFIG.password}"

# Drop and recreate database
echo "🗑️  Dropping existing database..."
dropdb -h $DB_HOST -p $DB_PORT -U $DB_USER --if-exists $DB_NAME

echo "✨ Creating new database..."
createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME

# Restore from custom format dump
echo "📥 Restoring database..."
pg_restore -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME --no-owner --no-privileges full.dump

echo "✅ Database restored successfully!"
echo ""
echo "📊 Verifying restoration..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) as tables FROM information_schema.tables WHERE table_schema = 'public';"
`;

  const scriptPath = path.join(backupPath, 'restore.sh');
  fs.writeFileSync(scriptPath, script);
  fs.chmodSync(scriptPath, '755');
  console.log('🔧 Restore script created');
}

// Update latest symlink
function updateLatestLink(backupPath) {
  try {
    // Remove existing symlink if it exists
    if (fs.existsSync(LATEST_LINK)) {
      fs.unlinkSync(LATEST_LINK);
    }
    
    // Create new symlink
    const relativePath = path.relative(path.dirname(LATEST_LINK), backupPath);
    fs.symlinkSync(relativePath, LATEST_LINK);
    console.log('🔗 Updated latest symlink');
  } catch (error) {
    console.warn('⚠️  Could not update latest symlink:', error.message);
  }
}

// Main backup function
async function performBackup() {
  console.log('\n🚀 Starting backup process...\n');
  
  // Step 1: Check git status and commit if needed
  checkGitStatus();
  
  // Step 2: Get git commit hash
  const commit = getGitCommit();
  
  // Step 3: Create timestamp
  const timestamp = createTimestamp();
  
  // Step 4: Create backup directory
  const backupPath = createBackupDir(timestamp, commit);
  
  console.log('\n📦 Creating database dumps...\n');
  
  // Step 5: Create schema dump
  const schemaPath = path.join(backupPath, 'schema.sql');
  pgDump('--schema-only', schemaPath, 'Schema dump');
  
  // Step 6: Create data dump
  const dataPath = path.join(backupPath, 'data.sql');
  pgDump('--data-only --inserts', dataPath, 'Data dump');
  
  // Step 7: Create full custom format dump
  const fullPath = path.join(backupPath, 'full.dump');
  pgDump('--format=custom', fullPath, 'Full backup');
  
  // Step 8: Create metadata
  console.log('\n📊 Gathering statistics...\n');
  const metadata = createMetadata(backupPath, timestamp, commit);
  
  // Step 9: Create restore script
  createRestoreScript(backupPath, timestamp, commit);
  
  // Step 10: Update latest symlink
  updateLatestLink(backupPath);
  
  // Summary
  console.log('\n✨ Backup completed successfully!');
  console.log('================================');
  console.log(`📁 Location: dumps/backups/${timestamp}-${commit}/`);
  console.log(`📊 Statistics: ${metadata.statistics.tables} tables, ${metadata.statistics.rows} rows`);
  console.log(`💾 Database size: ${metadata.statistics.size}`);
  console.log('\nTo restore this backup, run:');
  console.log(`  cd dumps/backups/${timestamp}-${commit} && ./restore.sh`);
}

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('\n❌ Backup failed:', error.message);
  process.exit(1);
});

// Run backup
performBackup().catch((error) => {
  console.error('\n❌ Backup failed:', error);
  process.exit(1);
});