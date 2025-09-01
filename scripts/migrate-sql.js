#!/usr/bin/env node

/**
 * SQL Migration Script - NOW WITH TRACKING
 * This script redirects to the safe migration runner
 */

console.warn('⚠️  DEPRECATION WARNING: migrate-sql.js is deprecated!');
console.warn('⚠️  This script now uses the safe migration runner with tracking.');
console.warn('⚠️  Please use migrate-sql-safe.js directly in the future.\n');

// Redirect to the safe migration script
require('./migrate-sql-safe').runMigrations().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});