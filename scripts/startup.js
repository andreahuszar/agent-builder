#!/usr/bin/env node

/**
 * Startup script for production
 * Starts server immediately and runs migrations in background
 */

const { exec } = require('child_process');

async function runMigrationsInBackground() {
  // Wait a bit for server to start
  setTimeout(() => {
    console.log('📦 Running database migrations in background...');
    
    // Run migrations
    exec('node scripts/migrate-sql-safe.js', (error, stdout, stderr) => {
      if (error) {
        console.error('⚠️  Migration error:', error.message);
      } else {
        console.log('✅ Migrations completed');
      }
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
    });
    
    // Run seeding after a delay
    setTimeout(() => {
      exec('node scripts/seed-production-sample-data.js', (error, stdout, stderr) => {
        if (error) {
          console.error('⚠️  Seeding error:', error.message);
        } else {
          console.log('✅ Seeding completed');
        }
        if (stdout) console.log(stdout);
        if (stderr) console.error(stderr);
      });
    }, 5000);
  }, 2000);
}

async function startup() {
  console.log('🚀 Starting production server...');
  
  // Run migrations in background if DATABASE_URL is set
  if (process.env.DATABASE_URL) {
    runMigrationsInBackground();
  }
  
  // Start the Next.js server IMMEDIATELY
  console.log('🌐 Starting Next.js server...');
  require('next/dist/cli/next-start');
}

startup().catch(error => {
  console.error('💥 Startup failed:', error);
  process.exit(1);
});