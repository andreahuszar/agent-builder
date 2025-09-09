#!/usr/bin/env node
/**
 * Wipe Production Database
 * Safely clears all data from production database
 */

const { execSync } = require('child_process');
const readline = require('readline');

// Configuration
const PROD_DB = {
  host: process.env.PROD_DB_HOST || 'localhost',
  port: process.env.PROD_DB_PORT || 5432,
  database: process.env.PROD_DB_NAME || 'xelix_invoice_prod',
  user: process.env.PROD_DB_USER || 'postgres',
  password: process.env.PROD_DB_PASSWORD || 'postgres'
};

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

async function main() {
  console.log('⚠️  PRODUCTION DATABASE WIPE TOOL');
  console.log('=' .repeat(50));
  console.log('\nTarget Database:');
  console.log(`  Host: ${PROD_DB.host}:${PROD_DB.port}`);
  console.log(`  Database: ${PROD_DB.database}`);
  console.log(`  User: ${PROD_DB.user}`);
  console.log('');
  console.log('⚠️  WARNING: This will DELETE ALL DATA in production!');
  console.log('⚠️  This action CANNOT be undone!');
  console.log('');

  // First confirmation
  const confirm1 = await prompt('Type the database name to confirm: ');
  
  if (confirm1 !== PROD_DB.database) {
    console.log('❌ Database name does not match. Operation cancelled.');
    rl.close();
    process.exit(0);
  }

  // Second confirmation
  console.log('\n⚠️  FINAL WARNING: All data will be permanently deleted!');
  const confirm2 = await prompt('Type "DELETE ALL PRODUCTION DATA" to proceed: ');
  
  if (confirm2 !== 'DELETE ALL PRODUCTION DATA') {
    console.log('❌ Operation cancelled.');
    rl.close();
    process.exit(0);
  }

  console.log('\n🔧 Starting database wipe...\n');

  try {
    // Test connection
    console.log('1️⃣ Testing connection...');
    execSync(
      `PGPASSWORD=${PROD_DB.password} psql -h ${PROD_DB.host} -p ${PROD_DB.port} -U ${PROD_DB.user} -d ${PROD_DB.database} -c "SELECT 1"`,
      { stdio: 'ignore' }
    );
    console.log('✅ Connection successful');

    // Get table list
    console.log('\n2️⃣ Getting table list...');
    const tablesQuery = `
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename NOT LIKE '_prisma%'
      ORDER BY tablename
    `;
    
    const tablesResult = execSync(
      `PGPASSWORD=${PROD_DB.password} psql -h ${PROD_DB.host} -p ${PROD_DB.port} -U ${PROD_DB.user} -d ${PROD_DB.database} -t -c "${tablesQuery}"`,
      { encoding: 'utf8' }
    );
    
    const tables = tablesResult
      .split('\n')
      .map(t => t.trim())
      .filter(t => t.length > 0);
    
    console.log(`Found ${tables.length} tables to clear`);

    // Clear each table
    console.log('\n3️⃣ Clearing tables...');
    
    // Disable foreign key checks temporarily
    execSync(
      `PGPASSWORD=${PROD_DB.password} psql -h ${PROD_DB.host} -p ${PROD_DB.port} -U ${PROD_DB.user} -d ${PROD_DB.database} -c "SET session_replication_role = 'replica'"`,
      { stdio: 'ignore' }
    );
    
    for (const table of tables) {
      process.stdout.write(`   Clearing ${table}...`);
      
      const deleteCmd = `TRUNCATE TABLE ${table} CASCADE`;
      execSync(
        `PGPASSWORD=${PROD_DB.password} psql -h ${PROD_DB.host} -p ${PROD_DB.port} -U ${PROD_DB.user} -d ${PROD_DB.database} -c "${deleteCmd}"`,
        { stdio: 'ignore' }
      );
      
      console.log(' ✅');
    }
    
    // Re-enable foreign key checks
    execSync(
      `PGPASSWORD=${PROD_DB.password} psql -h ${PROD_DB.host} -p ${PROD_DB.port} -U ${PROD_DB.user} -d ${PROD_DB.database} -c "SET session_replication_role = 'origin'"`,
      { stdio: 'ignore' }
    );

    // Reset sequences
    console.log('\n4️⃣ Resetting sequences...');
    const sequenceCmd = `
      DO $$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN 
          SELECT sequence_name 
          FROM information_schema.sequences 
          WHERE sequence_schema = 'public'
        LOOP
          EXECUTE format('ALTER SEQUENCE %I RESTART WITH 1', r.sequence_name);
        END LOOP;
      END $$;
    `;
    
    execSync(
      `PGPASSWORD=${PROD_DB.password} psql -h ${PROD_DB.host} -p ${PROD_DB.port} -U ${PROD_DB.user} -d ${PROD_DB.database} -c "${sequenceCmd}"`,
      { stdio: 'ignore' }
    );
    console.log('✅ Sequences reset');

    // Verify
    console.log('\n5️⃣ Verifying...');
    let allClear = true;
    
    for (const table of tables.slice(0, 5)) {
      const countCmd = `SELECT COUNT(*) FROM ${table}`;
      const count = execSync(
        `PGPASSWORD=${PROD_DB.password} psql -h ${PROD_DB.host} -p ${PROD_DB.port} -U ${PROD_DB.user} -d ${PROD_DB.database} -t -c "${countCmd}"`,
        { encoding: 'utf8' }
      ).trim();
      
      if (parseInt(count) !== 0) {
        console.log(`   ❌ ${table} still has ${count} rows`);
        allClear = false;
      } else {
        console.log(`   ✅ ${table}: 0 rows`);
      }
    }
    
    if (tables.length > 5) {
      console.log(`   ... and ${tables.length - 5} more tables`);
    }

    // Success
    console.log('\n' + '=' .repeat(50));
    if (allClear) {
      console.log('✅ Production database wiped successfully!');
      console.log('All tables have been cleared.');
    } else {
      console.log('⚠️  Some tables may not have been fully cleared.');
      console.log('Please check the database manually.');
    }
    console.log('=' .repeat(50));
    
  } catch (error) {
    console.error('\n❌ Wipe failed:', error.message);
    console.error('\nThe database may be in an inconsistent state.');
    console.error('Please check manually and restore from backup if needed.');
    rl.close();
    process.exit(1);
  }
  
  rl.close();
}

main();