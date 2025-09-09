#!/usr/bin/env node

/**
 * Startup script for production
 * Ensures database is ready before starting the server
 */

const { execSync } = require('child_process');

async function startup() {
  console.log('🚀 Starting production server...');
  
  // Run migrations if DATABASE_URL is set
  if (process.env.DATABASE_URL) {
    console.log('📦 Running database migrations...');
    try {
      execSync('node scripts/migrate-sql-safe.js', { stdio: 'inherit' });
      console.log('✅ Migrations completed');
    } catch (error) {
      console.error('⚠️  Migration failed, but continuing:', error.message);
    }
    
    // Seed sample data if needed
    try {
      execSync('node scripts/seed-production-sample-data.js', { stdio: 'inherit' });
      console.log('✅ Seeding completed');
    } catch (error) {
      console.error('⚠️  Seeding failed, but continuing:', error.message);
    }
  }
  
  // Start the Next.js server
  console.log('🌐 Starting Next.js server...');
  require('next/dist/cli/next-start');
}

startup().catch(error => {
  console.error('💥 Startup failed:', error);
  process.exit(1);
});