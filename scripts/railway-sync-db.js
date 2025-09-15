#!/usr/bin/env node

/**
 * Railway Database Sync
 * Updates Railway database schema to match Prisma schema
 */

const { execSync } = require('child_process');

async function syncDatabase() {
  console.log('🔄 Syncing Railway database with Prisma schema...');

  try {
    // First, generate Prisma client
    console.log('1️⃣ Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });

    // Then push schema to database (this creates/updates tables and columns)
    console.log('2️⃣ Pushing schema to database...');
    execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });

    console.log('✅ Database schema synchronized successfully!');
    console.log('   All missing columns have been added.');

  } catch (error) {
    console.error('❌ Database sync failed:', error.message);
    process.exit(1);
  }
}

// Run the sync
if (process.env.DATABASE_URL) {
  syncDatabase();
} else {
  console.log('⚠️  No DATABASE_URL found. This script should run on Railway.');
}