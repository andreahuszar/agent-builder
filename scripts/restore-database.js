#!/usr/bin/env node
/**
 * Database Restore Script
 * Restores database from a previous backup
 * Interactive selection of available backups
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

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

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify readline question
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

console.log('🔄 Database Restore Script');
console.log('=========================');
console.log(`📦 Target Database: ${DB_CONFIG.database}`);
console.log(`🔌 Host: ${DB_CONFIG.host}:${DB_CONFIG.port}`);
console.log('');

// Get list of available backups
function getAvailableBackups() {
  if (!fs.existsSync(BACKUPS_DIR)) {
    console.error('❌ No backups directory found');
    process.exit(1);
  }
  
  const backups = fs.readdirSync(BACKUPS_DIR)
    .filter(dir => {
      const fullPath = path.join(BACKUPS_DIR, dir);
      return fs.statSync(fullPath).isDirectory() && 
             fs.existsSync(path.join(fullPath, 'metadata.json'));
    })
    .map(dir => {
      const metadataPath = path.join(BACKUPS_DIR, dir, 'metadata.json');
      try {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        return {
          name: dir,
          path: path.join(BACKUPS_DIR, dir),
          metadata
        };
      } catch (error) {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.metadata.timestamp) - new Date(a.metadata.timestamp));
  
  return backups;
}

// Display backup list
function displayBackups(backups) {
  console.log('📋 Available Backups:');
  console.log('');
  
  backups.forEach((backup, index) => {
    const { metadata } = backup;
    const date = new Date(metadata.timestamp).toLocaleString();
    const stats = metadata.statistics || {};
    
    console.log(`${index + 1}. ${backup.name}`);
    console.log(`   📅 Date: ${date}`);
    console.log(`   📝 Commit: ${metadata.gitCommit}`);
    console.log(`   📊 Stats: ${stats.tables || '?'} tables, ${stats.rows || '?'} rows`);
    console.log(`   💬 Description: ${metadata.description || 'No description'}`);
    console.log('');
  });
}

// Execute psql command
function psql(command) {
  const env = {
    PGPASSWORD: DB_CONFIG.password,
    PATH: process.env.PATH
  };
  
  const fullCommand = [
    'psql',
    `-h ${DB_CONFIG.host}`,
    `-p ${DB_CONFIG.port}`,
    `-U ${DB_CONFIG.user}`,
    `-d ${DB_CONFIG.database}`,
    `-c "${command}"`
  ].join(' ');
  
  try {
    return execSync(fullCommand, { env, encoding: 'utf8' });
  } catch (error) {
    throw new Error(`psql command failed: ${error.message}`);
  }
}

// Check if database exists
function databaseExists(dbName) {
  const env = {
    PGPASSWORD: DB_CONFIG.password,
    PATH: process.env.PATH
  };
  
  try {
    const result = execSync(
      `psql -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -U ${DB_CONFIG.user} -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${dbName}';"`,
      { env, encoding: 'utf8' }
    );
    return result.trim() === '1';
  } catch (error) {
    return false;
  }
}

// Drop database
function dropDatabase(dbName) {
  const env = {
    PGPASSWORD: DB_CONFIG.password,
    PATH: process.env.PATH
  };
  
  console.log(`🗑️  Dropping database: ${dbName}...`);
  
  try {
    // First, terminate all connections
    execSync(
      `psql -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -U ${DB_CONFIG.user} -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${dbName}' AND pid <> pg_backend_pid();"`,
      { env }
    );
    
    // Then drop the database
    execSync(
      `dropdb -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -U ${DB_CONFIG.user} --if-exists ${dbName}`,
      { env }
    );
    console.log('✅ Database dropped');
  } catch (error) {
    console.error('❌ Failed to drop database:', error.message);
    throw error;
  }
}

// Create database
function createDatabase(dbName) {
  const env = {
    PGPASSWORD: DB_CONFIG.password,
    PATH: process.env.PATH
  };
  
  console.log(`✨ Creating database: ${dbName}...`);
  
  try {
    execSync(
      `createdb -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -U ${DB_CONFIG.user} ${dbName}`,
      { env }
    );
    console.log('✅ Database created');
  } catch (error) {
    console.error('❌ Failed to create database:', error.message);
    throw error;
  }
}

// Restore from backup
async function restoreFromBackup(backupPath, restoreType) {
  const env = {
    PGPASSWORD: DB_CONFIG.password,
    PATH: process.env.PATH
  };
  
  console.log('\n🔄 Starting restoration...\n');
  
  try {
    // Drop and recreate database
    if (databaseExists(DB_CONFIG.database)) {
      dropDatabase(DB_CONFIG.database);
    }
    createDatabase(DB_CONFIG.database);
    
    // Restore based on type
    if (restoreType === 'full') {
      // Restore from custom format dump
      const dumpPath = path.join(backupPath, 'full.dump');
      if (!fs.existsSync(dumpPath)) {
        throw new Error('Full dump file not found');
      }
      
      console.log('📥 Restoring from full backup...');
      execSync(
        `pg_restore -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -U ${DB_CONFIG.user} -d ${DB_CONFIG.database} --no-owner --no-privileges "${dumpPath}"`,
        { env, stdio: 'inherit' }
      );
    } else if (restoreType === 'sql') {
      // Restore from SQL files
      const schemaPath = path.join(backupPath, 'schema.sql');
      const dataPath = path.join(backupPath, 'data.sql');
      
      if (fs.existsSync(schemaPath)) {
        console.log('📥 Restoring schema...');
        execSync(
          `psql -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -U ${DB_CONFIG.user} -d ${DB_CONFIG.database} -f "${schemaPath}"`,
          { env, stdio: 'inherit' }
        );
      }
      
      if (fs.existsSync(dataPath)) {
        console.log('📥 Restoring data...');
        execSync(
          `psql -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -U ${DB_CONFIG.user} -d ${DB_CONFIG.database} -f "${dataPath}"`,
          { env, stdio: 'inherit' }
        );
      }
    }
    
    // Verify restoration
    console.log('\n📊 Verifying restoration...\n');
    const tableCount = execSync(
      `psql -h ${DB_CONFIG.host} -p ${DB_CONFIG.port} -U ${DB_CONFIG.user} -d ${DB_CONFIG.database} -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';"`,
      { env, encoding: 'utf8' }
    ).trim();
    
    console.log(`✅ Restoration complete! Found ${tableCount} tables.`);
    
    // Run Prisma generate to sync schema
    console.log('\n🔧 Syncing Prisma schema...');
    try {
      execSync('npx prisma db pull', { cwd: PROJECT_ROOT, stdio: 'inherit' });
      execSync('npx prisma generate', { cwd: PROJECT_ROOT, stdio: 'inherit' });
      console.log('✅ Prisma schema synced');
    } catch (error) {
      console.warn('⚠️  Could not sync Prisma schema. You may need to run: npx prisma db pull && npx prisma generate');
    }
    
  } catch (error) {
    console.error('\n❌ Restoration failed:', error.message);
    throw error;
  }
}

// Main restore function
async function main() {
  try {
    // Get available backups
    const backups = getAvailableBackups();
    
    if (backups.length === 0) {
      console.log('❌ No backups found');
      process.exit(1);
    }
    
    // Display backups
    displayBackups(backups);
    
    // Ask user to select a backup
    const selection = await question('Select a backup to restore (number): ');
    const index = parseInt(selection) - 1;
    
    if (index < 0 || index >= backups.length) {
      console.log('❌ Invalid selection');
      process.exit(1);
    }
    
    const selectedBackup = backups[index];
    console.log(`\n📁 Selected: ${selectedBackup.name}`);
    
    // Ask for restore type
    console.log('\nRestore options:');
    console.log('1. Full backup (recommended - uses custom format)');
    console.log('2. SQL files (schema + data)');
    
    const typeSelection = await question('Select restore type (1 or 2): ');
    const restoreType = typeSelection === '2' ? 'sql' : 'full';
    
    // Confirm restoration
    console.log('\n⚠️  WARNING: This will COMPLETELY REPLACE the current database!');
    console.log(`   Database: ${DB_CONFIG.database}`);
    console.log(`   Backup: ${selectedBackup.name}`);
    
    const confirm = await question('\nType "yes" to confirm: ');
    
    if (confirm.toLowerCase() !== 'yes') {
      console.log('❌ Restoration cancelled');
      process.exit(0);
    }
    
    // Perform restoration
    await restoreFromBackup(selectedBackup.path, restoreType);
    
    // Check if we need to checkout the git commit
    const checkoutCommit = await question('\nDo you want to checkout the corresponding git commit? (y/n): ');
    if (checkoutCommit.toLowerCase() === 'y') {
      const commit = selectedBackup.metadata.gitCommit;
      console.log(`\n📝 Checking out commit: ${commit}`);
      try {
        execSync(`git checkout ${commit}`, { cwd: PROJECT_ROOT, stdio: 'inherit' });
        console.log('✅ Git checkout complete');
      } catch (error) {
        console.error('❌ Git checkout failed:', error.message);
      }
    }
    
    console.log('\n✨ Restoration completed successfully!');
    console.log('You may need to restart your development server.');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Handle interrupts
process.on('SIGINT', () => {
  console.log('\n\n❌ Restoration cancelled by user');
  process.exit(0);
});

// Run the script
main();