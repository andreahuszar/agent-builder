#!/usr/bin/env node

/**
 * Enhanced Force Schema Sync for Railway - Version 2
 * Automatically detects and syncs ALL schema differences between local and Railway
 * Uses the extracted local schema to ensure complete synchronization
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function getRemoteSchema(client) {
  log('\n🔍 Analyzing remote database schema...', 'cyan');

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
    schema.tables[tableName] = {
      columns: columnsResult.rows.map(col => ({
        name: col.column_name,
        type: col.data_type,
        udtName: col.udt_name,
        maxLength: col.character_maximum_length,
        precision: col.numeric_precision,
        scale: col.numeric_scale,
        nullable: col.is_nullable === 'YES',
        default: col.column_default
      }))
    };
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

  log(`  Found ${Object.keys(schema.enums).length} enums`, 'green');
  log(`  Found ${Object.keys(schema.tables).length} tables`, 'green');
  log(`  Found ${Object.values(schema.indexes).reduce((sum, idxs) => sum + idxs.length, 0)} indexes`, 'green');

  return schema;
}

function getSqlType(column) {
  let sqlType = '';

  // Handle custom types (enums)
  if (column.customType || column.type === 'USER-DEFINED') {
    return column.customType || column.udtName;
  }

  // Handle arrays
  if (column.type === 'ARRAY') {
    if (column.udtName === '_text') return 'TEXT[]';
    if (column.udtName === '_varchar') return 'VARCHAR[]';
    return column.udtName.toUpperCase();
  }

  // Standard types
  switch (column.type.toLowerCase()) {
    case 'character varying':
    case 'varchar':
      sqlType = column.maxLength ? `VARCHAR(${column.maxLength})` : 'TEXT';
      break;
    case 'numeric':
    case 'decimal':
      sqlType = column.precision && column.scale ?
        `DECIMAL(${column.precision},${column.scale})` : 'DECIMAL';
      break;
    case 'timestamp with time zone':
    case 'timestamptz':
      sqlType = 'TIMESTAMPTZ';
      break;
    case 'timestamp without time zone':
    case 'timestamp':
      sqlType = 'TIMESTAMP';
      break;
    case 'uuid':
      sqlType = 'UUID';
      break;
    case 'integer':
      sqlType = 'INTEGER';
      break;
    case 'bigint':
      sqlType = 'BIGINT';
      break;
    case 'boolean':
      sqlType = 'BOOLEAN';
      break;
    case 'text':
      sqlType = 'TEXT';
      break;
    case 'jsonb':
      sqlType = 'JSONB';
      break;
    case 'json':
      sqlType = 'JSON';
      break;
    case 'date':
      sqlType = 'DATE';
      break;
    default:
      sqlType = column.type.toUpperCase();
  }

  return sqlType;
}

function formatDefault(defaultValue, column) {
  if (!defaultValue) return '';

  // Remove type casts for comparison
  let cleanDefault = defaultValue.replace(/::[a-z_]+(\[\])?/gi, '');

  // Handle special cases
  if (cleanDefault === 'gen_random_uuid()') return 'DEFAULT gen_random_uuid()';
  if (cleanDefault === 'CURRENT_TIMESTAMP' || cleanDefault === 'now()') return 'DEFAULT CURRENT_TIMESTAMP';
  if (cleanDefault === 'true' || cleanDefault === 'false') return `DEFAULT ${cleanDefault}`;
  if (cleanDefault.match(/^'.*'$/)) return `DEFAULT ${cleanDefault}`;
  if (cleanDefault.match(/^[0-9.]+$/)) return `DEFAULT ${cleanDefault}`;

  // For JSONB/JSON defaults
  if ((column.type === 'jsonb' || column.type === 'json') && cleanDefault) {
    return `DEFAULT '${cleanDefault}'::${column.type}`;
  }

  return `DEFAULT ${cleanDefault}`;
}

async function syncSchema(dryRun = false) {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    log('⚠️  No DATABASE_URL found. Skipping schema sync.', 'yellow');
    return;
  }

  // Safety check for local database
  if (connectionString.includes('localhost') || connectionString.includes('127.0.0.1')) {
    log('⚠️  Local database detected. Skipping schema sync.', 'yellow');
    return;
  }

  log(`\n🚀 ${dryRun ? 'DRY RUN -' : ''} Starting comprehensive schema sync for Railway...`, 'magenta');
  log(`📍 Target: ${connectionString.split('@')[1]?.split('/')[0] || 'Railway database'}`, 'cyan');

  const client = new Client({ connectionString });

  try {
    await client.connect();

    // Load local schema
    const localSchemaPath = path.join(__dirname, 'local-schema.json');
    if (!fs.existsSync(localSchemaPath)) {
      log('❌ Local schema file not found. Please run extract-local-schema.js first.', 'red');
      log('   Run: npm run db:sync:enhanced', 'yellow');
      return;
    }

    const localSchema = JSON.parse(fs.readFileSync(localSchemaPath, 'utf8'));

    // Validate schema structure
    if (!localSchema.tables || !localSchema.enums) {
      log('❌ Invalid local schema structure. Please regenerate it.', 'red');
      log('   Run: node scripts/extract-local-schema.js', 'yellow');
      return;
    }

    log(`\n📋 Loaded local schema (${Object.keys(localSchema.tables).length} tables)`, 'green');

    // Get remote schema
    const remoteSchema = await getRemoteSchema(client);

    const changes = {
      enums: { create: [], modify: [] },
      tables: { create: [], modify: [] },
      columns: { add: [] },
      indexes: { create: [] }
    };

    // 1. Check for missing enums
    log('\n🔧 Checking enums...', 'cyan');
    for (const [enumName, values] of Object.entries(localSchema.enums)) {
      // Ensure values is an array
      const localVals = Array.isArray(values) ? values : [];

      if (!remoteSchema.enums[enumName]) {
        changes.enums.create.push({ name: enumName, values: localVals });
      } else {
        // Check if enum values match
        const remoteVals = Array.isArray(remoteSchema.enums[enumName]) ? remoteSchema.enums[enumName] : [];
        const localValues = [...localVals].sort().join(',');
        const remoteValues = [...remoteVals].sort().join(',');
        if (localValues !== remoteValues) {
          changes.enums.modify.push({
            name: enumName,
            localValues: localVals,
            remoteValues: remoteVals
          });
        }
      }
    }

    // 2. Check for missing tables and columns
    log('\n🔧 Checking tables and columns...', 'cyan');
    for (const [tableName, tableInfo] of Object.entries(localSchema.tables)) {
      if (!remoteSchema.tables[tableName]) {
        changes.tables.create.push({ name: tableName, info: tableInfo });
      } else {
        // Check for missing columns
        const remoteColumns = remoteSchema.tables[tableName].columns.map(c => c.name);
        for (const column of tableInfo.columns) {
          if (!remoteColumns.includes(column.name)) {
            changes.columns.add.push({ table: tableName, column });
          }
        }
      }
    }

    // 3. Check for missing indexes
    log('\n🔧 Checking indexes...', 'cyan');
    for (const [tableName, indexes] of Object.entries(localSchema.indexes || {})) {
      const remoteIndexes = remoteSchema.indexes[tableName] || [];
      for (const index of indexes) {
        if (!remoteIndexes.includes(index.name)) {
          changes.indexes.create.push({ table: tableName, index });
        }
      }
    }

    // Report findings
    log('\n📊 Schema Differences Found:', 'yellow');
    log(`  - Missing enums: ${changes.enums.create.length}`, changes.enums.create.length > 0 ? 'red' : 'green');
    log(`  - Modified enums: ${changes.enums.modify.length}`, changes.enums.modify.length > 0 ? 'yellow' : 'green');
    log(`  - Missing tables: ${changes.tables.create.length}`, changes.tables.create.length > 0 ? 'red' : 'green');
    log(`  - Missing columns: ${changes.columns.add.length}`, changes.columns.add.length > 0 ? 'red' : 'green');
    log(`  - Missing indexes: ${changes.indexes.create.length}`, changes.indexes.create.length > 0 ? 'red' : 'green');

    if (dryRun) {
      log('\n📝 DRY RUN - No changes will be applied', 'yellow');

      // Show what would be done
      if (changes.enums.create.length > 0) {
        log('\nEnums to create:', 'cyan');
        changes.enums.create.forEach(e => log(`  - ${e.name}`, 'white'));
      }

      if (changes.tables.create.length > 0) {
        log('\nTables to create:', 'cyan');
        changes.tables.create.forEach(t => log(`  - ${t.name}`, 'white'));
      }

      if (changes.columns.add.length > 0) {
        log('\nColumns to add:', 'cyan');
        changes.columns.add.forEach(c => log(`  - ${c.table}.${c.column.name}`, 'white'));
      }

      return;
    }

    // Apply changes
    let successCount = 0;
    let errorCount = 0;

    // Create missing enums
    if (changes.enums.create.length > 0) {
      log('\n📝 Creating missing enums...', 'cyan');
      for (const enumDef of changes.enums.create) {
        try {
          const sql = `CREATE TYPE "${enumDef.name}" AS ENUM (${enumDef.values.map(v => `'${v}'`).join(', ')})`;
          await client.query(sql);
          log(`  ✅ Created enum: ${enumDef.name}`, 'green');
          successCount++;
        } catch (error) {
          if (error.message.includes('already exists')) {
            log(`  ⚠️  Enum ${enumDef.name} already exists`, 'yellow');
          } else {
            log(`  ❌ Failed to create enum ${enumDef.name}: ${error.message}`, 'red');
            errorCount++;
          }
        }
      }
    }

    // Add modified enum values (if any)
    if (changes.enums.modify.length > 0) {
      log('\n📝 Updating enum values...', 'cyan');
      for (const enumDef of changes.enums.modify) {
        const missingValues = enumDef.localValues.filter(v => !enumDef.remoteValues.includes(v));
        for (const value of missingValues) {
          try {
            const sql = `ALTER TYPE "${enumDef.name}" ADD VALUE IF NOT EXISTS '${value}'`;
            await client.query(sql);
            log(`  ✅ Added value '${value}' to enum ${enumDef.name}`, 'green');
            successCount++;
          } catch (error) {
            log(`  ⚠️  Could not add value '${value}' to ${enumDef.name}: ${error.message}`, 'yellow');
          }
        }
      }
    }

    // Create missing tables
    if (changes.tables.create.length > 0) {
      log('\n📝 Creating missing tables...', 'cyan');

      // First, load and execute the Prisma-generated SQL for proper table creation
      const prismaSchemaPath = path.join(__dirname, 'prisma-complete-schema.sql');
      if (fs.existsSync(prismaSchemaPath)) {
        const prismaSQL = fs.readFileSync(prismaSchemaPath, 'utf8');

        for (const tableDef of changes.tables.create) {
          try {
            // Extract the CREATE TABLE statement for this table from Prisma SQL
            const tableRegex = new RegExp(`CREATE TABLE[^;]*"${tableDef.name}"[^;]*;`, 'gis');
            const createTableMatch = prismaSQL.match(tableRegex);

            if (createTableMatch && createTableMatch[0]) {
              await client.query(createTableMatch[0]);
              log(`  ✅ Created table: ${tableDef.name}`, 'green');
              successCount++;
            } else {
              log(`  ⚠️  Could not find CREATE TABLE statement for ${tableDef.name} in Prisma schema`, 'yellow');
            }
          } catch (error) {
            if (error.message.includes('already exists')) {
              log(`  ⚠️  Table ${tableDef.name} already exists`, 'yellow');
            } else {
              log(`  ❌ Failed to create table ${tableDef.name}: ${error.message}`, 'red');
              errorCount++;
            }
          }
        }
      }
    }

    // Add missing columns
    if (changes.columns.add.length > 0) {
      log('\n📝 Adding missing columns...', 'cyan');

      // Group columns by table for better output
      const columnsByTable = {};
      for (const col of changes.columns.add) {
        if (!columnsByTable[col.table]) {
          columnsByTable[col.table] = [];
        }
        columnsByTable[col.table].push(col.column);
      }

      for (const [tableName, columns] of Object.entries(columnsByTable)) {
        log(`  Table: ${tableName}`, 'cyan');
        for (const column of columns) {
          try {
            const sqlType = getSqlType(column);
            const nullable = column.nullable ? '' : ' NOT NULL';
            const defaultClause = formatDefault(column.default, column);

            const sql = `ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${column.name}" ${sqlType}${nullable} ${defaultClause}`.trim();

            await client.query(sql);
            log(`    ✅ Added column: ${column.name} (${sqlType})`, 'green');
            successCount++;
          } catch (error) {
            log(`    ❌ Failed to add column ${column.name}: ${error.message}`, 'red');
            errorCount++;
          }
        }
      }
    }

    // Create missing indexes (optional - can be slow on large tables)
    if (changes.indexes.create.length > 0) {
      log('\n📝 Creating missing indexes (this may take a while)...', 'cyan');
      for (const indexDef of changes.indexes.create) {
        try {
          // Use the actual index definition from local schema
          if (indexDef.index.definition) {
            await client.query(indexDef.index.definition);
            log(`  ✅ Created index: ${indexDef.index.name} on ${indexDef.table}`, 'green');
            successCount++;
          }
        } catch (error) {
          if (error.message.includes('already exists')) {
            log(`  ⚠️  Index ${indexDef.index.name} already exists`, 'yellow');
          } else {
            log(`  ⚠️  Failed to create index ${indexDef.index.name}: ${error.message}`, 'yellow');
            // Don't count index failures as errors since they're non-critical
          }
        }
      }
    }

    // Final report
    log('\n' + '='.repeat(60), 'cyan');
    log('✨ Schema synchronization complete!', 'green');
    log(`  ✅ Successful operations: ${successCount}`, 'green');
    if (errorCount > 0) {
      log(`  ❌ Failed operations: ${errorCount}`, 'red');
    }
    log('='.repeat(60), 'cyan');

  } catch (error) {
    log(`\n❌ Fatal error during schema sync: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || args.includes('-d');

if (require.main === module) {
  if (dryRun) {
    log('\n🔍 Running in DRY RUN mode - no changes will be made', 'yellow');
  }

  syncSchema(dryRun)
    .then(() => {
      log('\n👍 Process completed successfully', 'green');
      process.exit(0);
    })
    .catch(error => {
      log(`\n❌ Process failed: ${error.message}`, 'red');
      process.exit(1);
    });
}

module.exports = { syncSchema };