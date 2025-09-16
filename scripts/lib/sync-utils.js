#!/usr/bin/env node
/**
 * Sync Utilities
 * Helper functions for database sync operations
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class SyncUtils {
  /**
   * Execute a PostgreSQL query and return results
   */
  static async executeQuery(dbConfig, query, returnRows = false) {
    try {
      const flags = returnRows ? '-t -A -F"|"' : '-t -A';
      const result = execSync(
        `PGPASSWORD=${dbConfig.password} psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} ${flags} -c "${query}"`,
        { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 } // 10MB buffer
      );

      if (returnRows) {
        return result.trim().split('\n').filter(line => line).map(line => line.split('|'));
      }

      return result.trim();
    } catch (error) {
      console.error('❌ Query execution failed:', error.message);
      throw error;
    }
  }

  /**
   * Copy data from source to target database
   */
  static async copyTableData(sourceDb, targetDb, tableName, whereClause = '', options = {}) {
    const {
      batchSize = 100,
      onConflict = 'DO NOTHING',
      dryRun = false,
      verbose = false
    } = options;

    try {
      // Get ALL column names (including IDs to preserve relationships)
      // Only exclude truly generated columns (STORED or VIRTUAL)
      const columnsQuery = `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = '${tableName}'
          AND is_generated = 'NEVER'
        ORDER BY ordinal_position
      `;

      const columnsResult = await this.executeQuery(sourceDb, columnsQuery, true);
      const columns = columnsResult.map(row => row[0]);

      if (columns.length === 0) {
        console.warn(`⚠️ No columns found for table ${tableName}`);
        return { synced: 0, skipped: 0 };
      }

      const columnsList = columns.join(', ');

      // Count records to sync
      const countQuery = `SELECT COUNT(*) FROM ${tableName} ${whereClause}`;
      const totalRecords = parseInt(await this.executeQuery(sourceDb, countQuery), 10);

      if (totalRecords === 0) {
        if (verbose) console.log(`  ℹ️ No records to sync in ${tableName}`);
        return { synced: 0, skipped: 0 };
      }

      console.log(`  📦 Syncing ${totalRecords} records from ${tableName}...`);

      let syncedCount = 0;
      let offset = 0;

      while (offset < totalRecords) {
        // Export data from source
        const exportQuery = `
          COPY (
            SELECT ${columnsList}
            FROM ${tableName}
            ${whereClause}
            ORDER BY ${columns[0]}
            LIMIT ${batchSize}
            OFFSET ${offset}
          ) TO STDOUT WITH (FORMAT CSV, HEADER FALSE, DELIMITER '|', NULL '\\\\N')
        `;

        const data = await this.executeQuery(sourceDb, exportQuery);

        if (dryRun) {
          console.log(`  [DRY RUN] Would sync batch ${offset / batchSize + 1} (${batchSize} records)`);
        } else {
          // Import data to target
          const tempFile = path.join(__dirname, `.temp_sync_${tableName}_${Date.now()}.csv`);
          fs.writeFileSync(tempFile, data);

          try {
            // Find the primary key or unique constraint
            const pkQuery = `
              SELECT column_name
              FROM information_schema.key_column_usage
              WHERE table_schema = 'public'
                AND table_name = '${tableName}'
                AND constraint_name = (
                  SELECT constraint_name
                  FROM information_schema.table_constraints
                  WHERE table_schema = 'public'
                    AND table_name = '${tableName}'
                    AND constraint_type = 'PRIMARY KEY'
                )
              ORDER BY ordinal_position
            `;

            const pkResult = await this.executeQuery(sourceDb, pkQuery, true);
            const pkColumns = pkResult.map(row => row[0]);

            let conflictClause = onConflict;
            if (pkColumns.length > 0 && onConflict !== 'DO NOTHING') {
              const pkList = pkColumns.join(', ');
              if (onConflict === 'UPDATE') {
                const updateList = columns
                  .filter(col => !pkColumns.includes(col))
                  .map(col => `${col} = EXCLUDED.${col}`)
                  .join(', ');
                conflictClause = `(${pkList}) DO UPDATE SET ${updateList}`;
              } else {
                conflictClause = `(${pkList}) ${onConflict}`;
              }
            }

            // Import with COPY and ON CONFLICT
            const importQuery = `
              COPY ${tableName} (${columnsList})
              FROM '${tempFile}'
              WITH (FORMAT CSV, DELIMITER '|', NULL '\\\\N')
            `;

            // For tables with unique constraints, we need to handle conflicts differently
            if (pkColumns.length > 0 || tableName.includes('_headers') || tableName.includes('users') || tableName.includes('vendors')) {
              // Get column types for proper casting
              const typeQuery = `
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = '${tableName}'
                  AND column_name IN (${columns.map(c => `'${c}'`).join(', ')})
                ORDER BY ordinal_position
              `;

              const typeResult = await this.executeQuery(targetDb, typeQuery, true);
              const columnTypes = {};
              typeResult.forEach(row => {
                columnTypes[row[0]] = row[1];
              });

              // Build VALUES with proper type casting
              const valuesStr = data.split('\n').filter(line => line).map(line => {
                const vals = line.split('|');
                const castValues = vals.map((val, idx) => {
                  const colName = columns[idx];
                  const colType = columnTypes[colName];

                  if (val === '\\N') return 'NULL';

                  // Handle timestamps
                  if (colType && colType.includes('timestamp')) {
                    return `'${val}'::timestamp with time zone`;
                  }
                  // Handle dates
                  if (colType === 'date') {
                    return `'${val}'::date`;
                  }
                  // Handle decimals/numeric
                  if (colType === 'numeric' || colType === 'decimal') {
                    return val;
                  }
                  // Handle booleans
                  if (colType === 'boolean') {
                    return val === 't' ? 'true' : 'false';
                  }
                  // Handle integers
                  if (colType === 'integer' || colType === 'bigint') {
                    return val;
                  }
                  // Handle JSON columns with dollar quoting for safety
                  if (colType === 'json' || colType === 'jsonb') {
                    // Use dollar quoting to safely handle any content
                    return `$json$${val}$json$::${colType}`;
                  }
                  // Default to string - properly escape quotes
                  const escaped = val.replace(/'/g, "''");
                  return `'${escaped}'`;
                });
                return `(${castValues.join(', ')})`;
              }).join(', ');

              // Use INSERT with ON CONFLICT for better control
              const insertQuery = `
                INSERT INTO ${tableName} (${columnsList})
                VALUES ${valuesStr}
                ON CONFLICT ${conflictClause}
              `;

              await this.executeQuery(targetDb, insertQuery);
            } else {
              // For simple tables without constraints, use direct COPY
              await this.executeQuery(targetDb, importQuery);
            }

            fs.unlinkSync(tempFile);
          } catch (importError) {
            // Clean up temp file on error
            if (fs.existsSync(tempFile)) {
              fs.unlinkSync(tempFile);
            }

            if (importError.message.includes('duplicate key') || importError.message.includes('violates unique constraint')) {
              if (verbose) console.log(`  ⚠️ Some records already exist (skipped duplicates)`);
            } else {
              throw importError;
            }
          }
        }

        syncedCount += Math.min(batchSize, totalRecords - offset);
        offset += batchSize;

        // Progress indicator
        const progress = Math.round((offset / totalRecords) * 100);
        process.stdout.write(`\r  📦 Syncing ${tableName}: ${progress}% (${Math.min(offset, totalRecords)}/${totalRecords})`);
      }

      process.stdout.write('\n');
      return { synced: syncedCount, skipped: 0 };

    } catch (error) {
      console.error(`\n❌ Error syncing table ${tableName}:`, error.message);
      throw error;
    }
  }

  /**
   * Check database connectivity
   */
  static async testConnection(dbConfig, label = 'Database') {
    try {
      await this.executeQuery(dbConfig, 'SELECT 1');
      console.log(`✅ Connected to ${label}`);
      return true;
    } catch (error) {
      console.error(`❌ Cannot connect to ${label}:`, error.message);
      return false;
    }
  }

  /**
   * Get database size info
   */
  static async getDatabaseInfo(dbConfig) {
    const sizeQuery = `
      SELECT
        pg_database.datname,
        pg_size_pretty(pg_database_size(pg_database.datname)) AS size
      FROM pg_database
      WHERE datname = '${dbConfig.database}'
    `;

    const tableCountQuery = `
      SELECT COUNT(*)
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE '\\_prisma%'
    `;

    const recordCountQuery = `
      SELECT
        schemaname,
        tablename,
        n_live_tup AS row_count
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY n_live_tup DESC
      LIMIT 10
    `;

    try {
      const size = await this.executeQuery(dbConfig, sizeQuery, true);
      const tableCount = await this.executeQuery(dbConfig, tableCountQuery);
      const topTables = await this.executeQuery(dbConfig, recordCountQuery, true);

      return {
        database: dbConfig.database,
        size: size[0][1],
        tableCount: parseInt(tableCount, 10),
        topTables: topTables.map(row => ({
          name: row[1],
          records: parseInt(row[2], 10)
        }))
      };
    } catch (error) {
      console.error('Error getting database info:', error.message);
      return null;
    }
  }

  /**
   * Create a backup before sync
   */
  static async createBackup(dbConfig, backupDir = './backups') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup_${dbConfig.database}_${timestamp}.sql`);

    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    try {
      console.log(`🔒 Creating backup at ${backupFile}...`);

      execSync(
        `PGPASSWORD=${dbConfig.password} pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} --no-owner --no-acl > ${backupFile}`,
        { stdio: 'inherit' }
      );

      // Compress the backup
      execSync(`gzip ${backupFile}`, { stdio: 'inherit' });

      console.log(`✅ Backup created: ${backupFile}.gz`);
      return `${backupFile}.gz`;
    } catch (error) {
      console.error('❌ Backup failed:', error.message);
      throw error;
    }
  }

  /**
   * Validate that required environment variables are set
   */
  static validateEnvironment(required = []) {
    const missing = required.filter(varName => !process.env[varName]);

    if (missing.length > 0) {
      console.error('❌ Missing required environment variables:');
      missing.forEach(varName => console.error(`  - ${varName}`));
      return false;
    }

    return true;
  }

  /**
   * Parse database URL into config object
   */
  static parseDatabaseUrl(url) {
    const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);

    if (!match) {
      throw new Error('Invalid database URL format');
    }

    return {
      user: match[1],
      password: decodeURIComponent(match[2]),
      host: match[3],
      port: parseInt(match[4], 10),
      database: match[5].split('?')[0]
    };
  }

  /**
   * Format number with commas
   */
  static formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /**
   * Format bytes to human readable
   */
  static formatBytes(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Sleep for specified milliseconds
   */
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Full table copy with ID preservation and clean slate option
   */
  static async fullTableCopy(sourceDb, targetDb, tableName, options = {}) {
    const {
      truncate = false,
      cascade = false,
      batchSize = 1000,
      verbose = false,
      whereClause = ''
    } = options;

    try {
      // Get all columns
      const columnsQuery = `
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = '${tableName}'
          AND is_generated = 'NEVER'
        ORDER BY ordinal_position
      `;

      const columnsResult = await this.executeQuery(sourceDb, columnsQuery, true);
      const columns = columnsResult.map(row => ({ name: row[0], type: row[1] }));
      const columnNames = columns.map(c => c.name).join(', ');

      // Count source records
      const countQuery = `SELECT COUNT(*) FROM ${tableName} ${whereClause}`;
      const sourceCount = parseInt(await this.executeQuery(sourceDb, countQuery), 10);

      if (verbose) {
        console.log(`  Table: ${tableName}`);
        console.log(`  Columns: ${columns.length}`);
        console.log(`  Records: ${sourceCount}`);
      }

      // Truncate target table if requested
      if (truncate) {
        const truncateCmd = `TRUNCATE TABLE ${tableName} ${cascade ? 'CASCADE' : ''}`;
        if (verbose) console.log(`  Truncating target table${cascade ? ' with CASCADE' : ''}...`);
        await this.executeQuery(targetDb, truncateCmd);

        // Reset identity separately if needed
        try {
          await this.executeQuery(targetDb, `ALTER SEQUENCE IF EXISTS ${tableName}_id_seq RESTART WITH 1`);
        } catch (e) {
          // Sequence might not exist, that's ok
        }
      }

      // Copy data using COPY TO/FROM with proper escaping
      let syncedCount = 0;
      let offset = 0;

      // Disable triggers temporarily for faster insertion
      await this.executeQuery(targetDb, `ALTER TABLE ${tableName} DISABLE TRIGGER ALL`);

      try {
        while (offset < sourceCount) {
          // Export batch from source using COPY with dollar delimiter
          const exportQuery = `
            COPY (
              SELECT ${columnNames}
              FROM ${tableName}
              ${whereClause}
              ORDER BY ${columns[0].name}
              LIMIT ${batchSize}
              OFFSET ${offset}
            ) TO STDOUT WITH (FORMAT CSV, DELIMITER E'\\t', NULL '\\\\N', QUOTE E'\\x01', ESCAPE E'\\x02')
          `;

          const data = await this.executeQuery(sourceDb, exportQuery);

          // Import to target using dollar quoting for safety
          const lines = data.trim().split('\n').filter(line => line);
          for (const line of lines) {
            const values = line.split('\t').map((val, idx) => {
              const colName = columns[idx].name;
              const colType = columns[idx].type;

              // Fix enum value mappings for all status fields
              if ((colName === 'status' || colName === 'old_status' || colName === 'new_status') && val === 'ready_for_payment') {
                val = 'approved_ready_for_payment';
              }

              // Handle NOT NULL constraint for gr_numbers_cached
              if (colName === 'gr_numbers_cached' && val === '\\N') {
                return `'{}'::text[]`;  // Empty array for gr_numbers_cached (PostgreSQL format)
              }

              if (val === '\\N') return 'NULL';

              // Handle different data types
              if (colType === 'integer' || colType === 'bigint' ||
                  colType === 'numeric' || colType === 'decimal' ||
                  colType.includes('double') || colType.includes('real')) {
                return val === '' ? 'NULL' : val;
              }

              if (colType === 'boolean') {
                return val === 't' ? 'true' : val === 'f' ? 'false' : 'NULL';
              }

              if (colType === 'json' || colType === 'jsonb') {
                // Clean any quote character artifacts
                const cleaned = val.replace(/\x01/g, '');
                return `$json$${cleaned}$json$::${colType}`;
              }

              if (colType.includes('timestamp') || colType === 'date' || colType === 'time') {
                return val === '' ? 'NULL' : `'${val}'::${colType}`;
              }

              // Default: text types - clean and use dollar quoting
              const cleaned = val.replace(/\x01/g, '');
              return `$txt$${cleaned}$txt$`;
            });

            // Write query to temp file to avoid shell escaping issues
            const queryFile = path.join(__dirname, `.temp_query_${Date.now()}.sql`);

            // Build UPDATE clause for all columns except primary key
            const updateClauses = columns
              .filter(c => c.name !== 'id')  // Exclude primary key from update
              .map(c => `${c.name} = EXCLUDED.${c.name}`)
              .join(', ');

            // Use ON CONFLICT UPDATE to overwrite existing records
            const insertQuery = `INSERT INTO ${tableName} (${columnNames}) VALUES (${values.join(', ')})
              ON CONFLICT (id) DO UPDATE SET ${updateClauses};`;
            fs.writeFileSync(queryFile, insertQuery);

            try {
              // Execute from file to avoid shell interpretation of dollar signs
              const execCmd = `PGPASSWORD=${targetDb.password} psql -h ${targetDb.host} -p ${targetDb.port} -U ${targetDb.user} -d ${targetDb.database} -f ${queryFile}`;
              execSync(execCmd, { encoding: 'utf8', stdio: 'pipe' });
              syncedCount++;
            } finally {
              // Clean up temp file
              if (fs.existsSync(queryFile)) {
                fs.unlinkSync(queryFile);
              }
            }
          }

          offset += batchSize;
          if (verbose && offset % (batchSize * 10) === 0) {
            const progress = Math.round((offset / sourceCount) * 100);
            console.log(`    Progress: ${progress}% (${Math.min(offset, sourceCount)}/${sourceCount})`);
          }
        }
      } finally {
        // Re-enable triggers
        await this.executeQuery(targetDb, `ALTER TABLE ${tableName} ENABLE TRIGGER ALL`);
      }

      // Update sequences if table has serial/identity columns
      const seqQuery = `
        SELECT pg_get_serial_sequence('${tableName}', column_name) as seq_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = '${tableName}'
          AND column_default LIKE 'nextval%'
      `;

      const seqResult = await this.executeQuery(targetDb, seqQuery, true);
      for (const row of seqResult) {
        if (row[0]) {
          const resetSeq = `SELECT setval('${row[0]}', (SELECT MAX(id) FROM ${tableName}))`;
          await this.executeQuery(targetDb, resetSeq);
        }
      }

      return {
        table: tableName,
        synced: syncedCount,
        source: sourceCount,
        success: syncedCount === sourceCount
      };

    } catch (error) {
      console.error(`Error copying table ${tableName}:`, error.message);
      throw error;
    }
  }
}

// Export for use in other scripts
module.exports = SyncUtils;

// If run directly, test utilities
if (require.main === module) {
  const localDb = {
    host: 'localhost',
    port: 5433,
    database: 'xelix_invoice_dev',
    user: 'postgres',
    password: 'postgres'
  };

  (async () => {
    console.log('🔧 Testing Sync Utilities');
    console.log('========================\n');

    // Test connection
    await SyncUtils.testConnection(localDb, 'Local Database');

    // Get database info
    console.log('\n📊 Database Information:');
    const info = await SyncUtils.getDatabaseInfo(localDb);
    if (info) {
      console.log(`  Database: ${info.database}`);
      console.log(`  Size: ${info.size}`);
      console.log(`  Tables: ${info.tableCount}`);
      console.log('\n  Top 5 tables by record count:');
      info.topTables.slice(0, 5).forEach((table, index) => {
        console.log(`    ${index + 1}. ${table.name}: ${SyncUtils.formatNumber(table.records)} records`);
      });
    }
  })();
}