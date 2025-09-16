#!/usr/bin/env node

/**
 * Schema Validation Script
 * Compares local and remote database schemas to detect drift
 * Can be run as part of CI/CD or manually for monitoring
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset', bold = false) {
  const prefix = bold ? colors.bold : '';
  console.log(`${prefix}${colors[color]}${message}${colors.reset}`);
}

async function getSchema(connectionString) {
  const client = new Client({ connectionString });

  try {
    await client.connect();

    const schema = {
      enums: {},
      tables: {},
      indexes: {}
    };

    // Get enums
    const enumsQuery = `
      SELECT
        t.typname as enum_name,
        array_agg(e.enumlabel ORDER BY e.enumsortorder) as values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      GROUP BY t.typname
      ORDER BY t.typname;
    `;

    const enumsResult = await client.query(enumsQuery);
    for (const row of enumsResult.rows) {
      schema.enums[row.enum_name] = row.values;
    }

    // Get tables and columns
    const tablesQuery = `
      SELECT DISTINCT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN ('_prisma_migrations', 'schema_migrations')
      ORDER BY table_name;
    `;

    const tablesResult = await client.query(tablesQuery);

    for (const table of tablesResult.rows) {
      const tableName = table.table_name;

      const columnsQuery = `
        SELECT
          c.column_name,
          c.data_type,
          c.character_maximum_length,
          c.numeric_precision,
          c.numeric_scale,
          c.is_nullable,
          c.column_default,
          c.udt_name
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = $1
        ORDER BY c.ordinal_position;
      `;

      const columnsResult = await client.query(columnsQuery, [tableName]);
      schema.tables[tableName] = columnsResult.rows.map(col => ({
        name: col.column_name,
        type: col.data_type,
        udtName: col.udt_name,
        maxLength: col.character_maximum_length,
        precision: col.numeric_precision,
        scale: col.numeric_scale,
        nullable: col.is_nullable === 'YES',
        default: col.column_default
      }));
    }

    // Get indexes
    const indexesQuery = `
      SELECT
        tablename,
        indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname NOT LIKE '%_pkey'
        AND tablename NOT IN ('_prisma_migrations', 'schema_migrations')
      ORDER BY tablename, indexname;
    `;

    const indexesResult = await client.query(indexesQuery);
    for (const idx of indexesResult.rows) {
      if (!schema.indexes[idx.tablename]) {
        schema.indexes[idx.tablename] = [];
      }
      schema.indexes[idx.tablename].push(idx.indexname);
    }

    return schema;

  } finally {
    await client.end();
  }
}

function compareSchemas(localSchema, remoteSchema) {
  const differences = {
    enums: {
      missing: [],
      different: []
    },
    tables: {
      missing: [],
      extra: []
    },
    columns: {
      missing: [],
      extra: [],
      different: []
    },
    indexes: {
      missing: [],
      extra: []
    }
  };

  // Compare enums
  for (const [enumName, values] of Object.entries(localSchema.enums)) {
    if (!remoteSchema.enums[enumName]) {
      differences.enums.missing.push(enumName);
    } else {
      const localValues = values.sort().join(',');
      const remoteValues = remoteSchema.enums[enumName].sort().join(',');
      if (localValues !== remoteValues) {
        differences.enums.different.push({
          name: enumName,
          local: values,
          remote: remoteSchema.enums[enumName]
        });
      }
    }
  }

  // Compare tables
  for (const tableName of Object.keys(localSchema.tables)) {
    if (!remoteSchema.tables[tableName]) {
      differences.tables.missing.push(tableName);
    } else {
      // Compare columns
      const localColumns = localSchema.tables[tableName];
      const remoteColumns = remoteSchema.tables[tableName];
      const localColumnNames = localColumns.map(c => c.name);
      const remoteColumnNames = remoteColumns.map(c => c.name);

      // Find missing columns
      for (const col of localColumns) {
        if (!remoteColumnNames.includes(col.name)) {
          differences.columns.missing.push({
            table: tableName,
            column: col.name,
            type: col.type
          });
        }
      }

      // Find extra columns (in remote but not in local)
      for (const col of remoteColumns) {
        if (!localColumnNames.includes(col.name)) {
          differences.columns.extra.push({
            table: tableName,
            column: col.name,
            type: col.type
          });
        }
      }

      // Check column types for matching columns
      for (const localCol of localColumns) {
        const remoteCol = remoteColumns.find(c => c.name === localCol.name);
        if (remoteCol) {
          // Compare types (be lenient about type aliases)
          const localType = normalizeType(localCol);
          const remoteType = normalizeType(remoteCol);
          if (localType !== remoteType) {
            differences.columns.different.push({
              table: tableName,
              column: localCol.name,
              localType: localType,
              remoteType: remoteType
            });
          }
        }
      }
    }
  }

  // Find extra tables (in remote but not in local)
  for (const tableName of Object.keys(remoteSchema.tables)) {
    if (!localSchema.tables[tableName]) {
      differences.tables.extra.push(tableName);
    }
  }

  // Compare indexes
  for (const [tableName, indexes] of Object.entries(localSchema.indexes || {})) {
    const remoteIndexes = remoteSchema.indexes[tableName] || [];
    for (const index of indexes) {
      if (!remoteIndexes.includes(index)) {
        differences.indexes.missing.push({
          table: tableName,
          index: index
        });
      }
    }
  }

  // Find extra indexes
  for (const [tableName, indexes] of Object.entries(remoteSchema.indexes || {})) {
    const localIndexes = localSchema.indexes[tableName] || [];
    for (const index of indexes) {
      if (!localIndexes.includes(index)) {
        differences.indexes.extra.push({
          table: tableName,
          index: index
        });
      }
    }
  }

  return differences;
}

function normalizeType(column) {
  let type = column.type.toLowerCase();

  // Normalize common type aliases
  if (type === 'character varying') type = 'varchar';
  if (type === 'timestamp with time zone') type = 'timestamptz';
  if (type === 'timestamp without time zone') type = 'timestamp';

  // Add length/precision info if present
  if (column.maxLength) {
    type += `(${column.maxLength})`;
  } else if (column.precision && column.scale) {
    type += `(${column.precision},${column.scale})`;
  }

  // Handle arrays
  if (type === 'array' && column.udtName) {
    if (column.udtName === '_text') type = 'text[]';
    else if (column.udtName === '_varchar') type = 'varchar[]';
  }

  return type;
}

function printDifferences(differences) {
  let hasIssues = false;

  // Enums
  if (differences.enums.missing.length > 0) {
    hasIssues = true;
    log('\n❌ Missing Enums:', 'red', true);
    differences.enums.missing.forEach(e => log(`  - ${e}`, 'red'));
  }

  if (differences.enums.different.length > 0) {
    hasIssues = true;
    log('\n⚠️  Enums with Different Values:', 'yellow', true);
    differences.enums.different.forEach(e => {
      log(`  - ${e.name}`, 'yellow');
      const missingValues = e.local.filter(v => !e.remote.includes(v));
      if (missingValues.length > 0) {
        log(`    Missing values: ${missingValues.join(', ')}`, 'yellow');
      }
    });
  }

  // Tables
  if (differences.tables.missing.length > 0) {
    hasIssues = true;
    log('\n❌ Missing Tables:', 'red', true);
    differences.tables.missing.forEach(t => log(`  - ${t}`, 'red'));
  }

  if (differences.tables.extra.length > 0) {
    log('\n⚠️  Extra Tables (in remote but not local):', 'yellow', true);
    differences.tables.extra.forEach(t => log(`  - ${t}`, 'yellow'));
  }

  // Columns
  if (differences.columns.missing.length > 0) {
    hasIssues = true;
    log('\n❌ Missing Columns:', 'red', true);
    const byTable = {};
    differences.columns.missing.forEach(c => {
      if (!byTable[c.table]) byTable[c.table] = [];
      byTable[c.table].push(c);
    });
    for (const [table, cols] of Object.entries(byTable)) {
      log(`  Table: ${table}`, 'red');
      cols.forEach(c => log(`    - ${c.column} (${c.type})`, 'red'));
    }
  }

  if (differences.columns.extra.length > 0) {
    log('\n⚠️  Extra Columns (in remote but not local):', 'yellow', true);
    const byTable = {};
    differences.columns.extra.forEach(c => {
      if (!byTable[c.table]) byTable[c.table] = [];
      byTable[c.table].push(c);
    });
    for (const [table, cols] of Object.entries(byTable)) {
      log(`  Table: ${table}`, 'yellow');
      cols.forEach(c => log(`    - ${c.column} (${c.type})`, 'yellow'));
    }
  }

  if (differences.columns.different.length > 0) {
    log('\n⚠️  Columns with Different Types:', 'yellow', true);
    differences.columns.different.forEach(c => {
      log(`  - ${c.table}.${c.column}`, 'yellow');
      log(`    Local: ${c.localType}, Remote: ${c.remoteType}`, 'yellow');
    });
  }

  // Indexes
  if (differences.indexes.missing.length > 0) {
    log('\n⚠️  Missing Indexes:', 'yellow', true);
    differences.indexes.missing.forEach(i => {
      log(`  - ${i.table}: ${i.index}`, 'yellow');
    });
  }

  return hasIssues;
}

async function validateSchema() {
  const remoteUrl = process.env.DATABASE_URL;
  const localUrl = process.env.LOCAL_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5433/xelix_invoice_dev';

  log('\n📊 Schema Validation Tool', 'cyan', true);
  log('=' . repeat(60), 'cyan');

  if (!remoteUrl) {
    log('\n⚠️  No DATABASE_URL found. Set DATABASE_URL to validate against remote.', 'yellow');
    return;
  }

  try {
    // Get local schema
    log('\n🔍 Fetching local schema...', 'blue');
    const localDbName = localUrl.split('/').pop().split('?')[0];
    log(`  Database: ${localDbName}`, 'blue');
    const localSchema = await getSchema(localUrl);
    log(`  ✅ Found ${Object.keys(localSchema.tables).length} tables`, 'green');

    // Get remote schema
    log('\n🔍 Fetching remote schema...', 'blue');
    const remoteDbName = remoteUrl.split('/').pop().split('?')[0];
    const remoteHost = remoteUrl.split('@')[1]?.split('/')[0] || 'remote';
    log(`  Database: ${remoteDbName} (${remoteHost})`, 'blue');
    const remoteSchema = await getSchema(remoteUrl);
    log(`  ✅ Found ${Object.keys(remoteSchema.tables).length} tables`, 'green');

    // Compare schemas
    log('\n🔄 Comparing schemas...', 'cyan');
    const differences = compareSchemas(localSchema, remoteSchema);

    // Print results
    const hasIssues = printDifferences(differences);

    // Summary
    log('\n' + '=' . repeat(60), 'cyan');
    if (hasIssues) {
      log('⚠️  Schema validation found differences!', 'yellow', true);
      log('Run `npm run db:sync:enhanced` on Railway to fix.', 'yellow');
      process.exit(1); // Exit with error code for CI/CD
    } else {
      log('✅ Schemas are in sync!', 'green', true);
      log('Local and remote databases have matching schemas.', 'green');
    }

  } catch (error) {
    log(`\n❌ Error during validation: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const showHelp = args.includes('--help') || args.includes('-h');

if (showHelp) {
  log('\n📊 Schema Validation Tool', 'cyan', true);
  log('\nUsage:', 'yellow');
  log('  node scripts/validate-schema.js', 'white');
  log('\nEnvironment Variables:', 'yellow');
  log('  DATABASE_URL         - Remote database connection string (required)', 'white');
  log('  LOCAL_DATABASE_URL   - Local database connection string (optional)', 'white');
  log('                         Defaults to: postgresql://postgres:postgres@127.0.0.1:5433/xelix_invoice_dev', 'white');
  log('\nExamples:', 'yellow');
  log('  # Validate Railway database against local', 'white');
  log('  DATABASE_URL=$RAILWAY_URL node scripts/validate-schema.js', 'white');
  log('\n  # Use custom local database', 'white');
  log('  DATABASE_URL=$RAILWAY_URL LOCAL_DATABASE_URL=$LOCAL_URL node scripts/validate-schema.js', 'white');
  process.exit(0);
}

if (require.main === module) {
  validateSchema().catch(error => {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { validateSchema };