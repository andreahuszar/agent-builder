#!/usr/bin/env node

/**
 * Production Initialization Script
 * Runs database migrations and seeding asynchronously after server startup
 */

const { runMigrations } = require('./migrate-sql-safe.js');
const { createSampleData } = require('./seed-production-sample-data.js');

async function initializeProduction() {
  // Wait a moment for the server to start
  setTimeout(async () => {
    try {
      console.log('🚀 Starting production database initialization...');
      
      // Run migrations first
      console.log('📦 Running database migrations...');
      await runMigrations();
      
      // Then seed data if needed
      console.log('🌱 Seeding production data...');
      await createSampleData();
      
      console.log('✅ Production initialization completed successfully!');
    } catch (error) {
      console.error('❌ Production initialization failed:', error);
      // Don't exit the process - let the server continue running
    }
  }, 2000); // Wait 2 seconds for server to be ready
}

// Only run if this script is executed directly
if (require.main === module) {
  initializeProduction();
}

module.exports = { initializeProduction };