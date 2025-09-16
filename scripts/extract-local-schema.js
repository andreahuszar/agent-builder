#!/usr/bin/env node

/**
 * Extract Complete Local Database Schema
 * This script introspects the local database and outputs the complete schema
 * including all tables, columns, types, constraints, indexes, and enums
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function extractLocalSchema() {
  // Use local database connection
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:5433/xelix_invoice_dev';

  console.log('📊 Extracting local database schema...');
  const client = new Client({ connectionString });

  try {
    await client.connect();

    const schema = {
      extractedAt: new Date().toISOString(),
      database: 'xelix_invoice_dev',
      enums: {},
      tables: {},
      indexes: {},
      constraints: {}
    };

    // 1. Extract all custom enums
    console.log('🔍 Extracting enums...');
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
    console.log(`  Found ${Object.keys(schema.enums).length} enums`);

    // 2. Extract all tables and their columns
    console.log('🔍 Extracting tables and columns...');
    const tablesQuery = `
      SELECT DISTINCT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN ('_prisma_migrations')
      ORDER BY table_name;
    `;

    const tablesResult = await client.query(tablesQuery);

    for (const table of tablesResult.rows) {
      const tableName = table.table_name;

      // Get column details for each table
      const columnsQuery = `
        SELECT
          c.column_name,
          c.data_type,
          c.character_maximum_length,
          c.numeric_precision,
          c.numeric_scale,
          c.is_nullable,
          c.column_default,
          c.udt_name,
          CASE
            WHEN c.data_type = 'USER-DEFINED' THEN c.udt_name
            WHEN c.data_type = 'ARRAY' THEN
              CASE
                WHEN c.udt_name = '_text' THEN 'text[]'
                WHEN c.udt_name = '_varchar' THEN 'varchar[]'
                ELSE c.udt_name
              END
            ELSE NULL
          END as custom_type
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
          customType: col.custom_type,
          udtName: col.udt_name,
          maxLength: col.character_maximum_length,
          precision: col.numeric_precision,
          scale: col.numeric_scale,
          nullable: col.is_nullable === 'YES',
          default: col.column_default
        }))
      };
    }

    console.log(`  Found ${Object.keys(schema.tables).length} tables`);

    // 3. Extract indexes
    console.log('🔍 Extracting indexes...');
    const indexesQuery = `
      SELECT
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname NOT LIKE '%_pkey'
        AND tablename NOT IN ('_prisma_migrations')
      ORDER BY tablename, indexname;
    `;

    const indexesResult = await client.query(indexesQuery);
    for (const idx of indexesResult.rows) {
      if (!schema.indexes[idx.tablename]) {
        schema.indexes[idx.tablename] = [];
      }
      schema.indexes[idx.tablename].push({
        name: idx.indexname,
        definition: idx.indexdef
      });
    }
    console.log(`  Found ${indexesResult.rows.length} indexes`);

    // 4. Extract primary keys
    console.log('🔍 Extracting primary keys...');
    const pkeysQuery = `
      SELECT
        tc.table_name,
        tc.constraint_name,
        array_agg(kcu.column_name::text ORDER BY kcu.ordinal_position) as columns
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name NOT IN ('_prisma_migrations')
      GROUP BY tc.table_name, tc.constraint_name
      ORDER BY tc.table_name;
    `;

    const pkeysResult = await client.query(pkeysQuery);
    for (const pk of pkeysResult.rows) {
      if (schema.tables[pk.table_name]) {
        schema.tables[pk.table_name].primaryKey = {
          name: pk.constraint_name,
          columns: pk.columns
        };
      }
    }

    // 5. Extract foreign keys
    console.log('🔍 Extracting foreign keys...');
    const fkeysQuery = `
      SELECT
        tc.table_name,
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name NOT IN ('_prisma_migrations')
      ORDER BY tc.table_name, tc.constraint_name;
    `;

    const fkeysResult = await client.query(fkeysQuery);
    for (const fk of fkeysResult.rows) {
      if (!schema.tables[fk.table_name].foreignKeys) {
        schema.tables[fk.table_name].foreignKeys = [];
      }
      schema.tables[fk.table_name].foreignKeys.push({
        name: fk.constraint_name,
        column: fk.column_name,
        referencedTable: fk.foreign_table_name,
        referencedColumn: fk.foreign_column_name
      });
    }

    // 6. Extract unique constraints
    console.log('🔍 Extracting unique constraints...');
    const uniqueQuery = `
      SELECT
        tc.table_name,
        tc.constraint_name,
        array_agg(kcu.column_name::text ORDER BY kcu.ordinal_position) as columns
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'UNIQUE'
        AND tc.table_schema = 'public'
        AND tc.table_name NOT IN ('_prisma_migrations')
      GROUP BY tc.table_name, tc.constraint_name
      ORDER BY tc.table_name;
    `;

    const uniqueResult = await client.query(uniqueQuery);
    for (const uniq of uniqueResult.rows) {
      if (!schema.tables[uniq.table_name].uniqueConstraints) {
        schema.tables[uniq.table_name].uniqueConstraints = [];
      }
      schema.tables[uniq.table_name].uniqueConstraints.push({
        name: uniq.constraint_name,
        columns: uniq.columns
      });
    }

    // Save the schema to a JSON file
    const outputPath = path.join(__dirname, 'local-schema.json');
    fs.writeFileSync(outputPath, JSON.stringify(schema, null, 2));

    console.log(`\n✅ Schema extracted successfully!`);
    console.log(`📄 Saved to: ${outputPath}`);
    console.log(`\n📊 Summary:`);
    console.log(`  - Enums: ${Object.keys(schema.enums).length}`);
    console.log(`  - Tables: ${Object.keys(schema.tables).length}`);
    console.log(`  - Total columns: ${Object.values(schema.tables).reduce((sum, t) => sum + t.columns.length, 0)}`);
    console.log(`  - Indexes: ${Object.values(schema.indexes).reduce((sum, idxs) => sum + idxs.length, 0)}`);

    return schema;

  } catch (error) {
    console.error('❌ Error extracting schema:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run the extraction
if (require.main === module) {
  extractLocalSchema().catch(console.error);
}

module.exports = { extractLocalSchema };