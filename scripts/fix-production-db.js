#!/usr/bin/env node

/**
 * Quick fix for production database
 * Adds the missing gr_numbers_cached column
 */

const { Client } = require('pg');

async function fixDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔧 Fixing production database...');
    await client.connect();
    
    // Add gr_numbers_cached column if it doesn't exist
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'invoice_headers' 
          AND column_name = 'gr_numbers_cached'
        ) THEN
          ALTER TABLE invoice_headers 
          ADD COLUMN gr_numbers_cached text[] DEFAULT '{}' NOT NULL;
          RAISE NOTICE 'Added gr_numbers_cached column';
        END IF;
      END $$;
    `);
    
    // Create index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_invoice_headers_gr_numbers_cached 
      ON invoice_headers USING GIN (gr_numbers_cached);
    `);
    
    console.log('✅ Database fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing database:', error);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  fixDatabase().catch(console.error);
}

module.exports = { fixDatabase };