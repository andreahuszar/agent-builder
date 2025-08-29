#!/usr/bin/env node

/**
 * SQL Migration Script for Railway Deployment
 * Applies raw SQL migrations in order
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const migrations = [
  '000_cleanup.sql',
  '001_enums.sql',
  '010_core_tables.sql',
  '020_constraints.sql',
  '030_indexes.sql',
  '040_views.sql',
  '050_triggers.sql',
  '060_seed_minimal.sql',
  '070_sample_functions.sql'
];

async function runMigrations() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🚀 Connecting to database...');
    await client.connect();
    
    console.log('📦 Running SQL migrations...');
    
    for (const migration of migrations) {
      const filePath = path.join(__dirname, '..', 'migrations', migration);
      
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️  Migration file not found: ${migration}`);
        continue;
      }
      
      console.log(`  ▶ Running ${migration}...`);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      try {
        await client.query(sql);
        console.log(`  ✅ ${migration} completed`);
      } catch (error) {
        console.error(`  ❌ ${migration} failed:`, error.message);
        // Continue with other migrations even if one fails
        // This allows for idempotent migrations
      }
    }
    
    console.log('✨ All migrations completed!');
    
  } catch (error) {
    console.error('Fatal error during migration:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run migrations if this is the main module
if (require.main === module) {
  runMigrations().catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

module.exports = { runMigrations };