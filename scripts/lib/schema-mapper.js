#!/usr/bin/env node
/**
 * Schema Mapper
 * Handles column and table mapping differences between environments
 */

class SchemaMapper {
  constructor() {
    // Define known column mappings (source -> target)
    this.columnMappings = {
      tax_rates: {
        tax_code: 'code',
        rate: 'rate_percent',
        effective_from: 'valid_from',
        effective_to: 'valid_to'
      },
      // Add more table mappings as needed
    };

    // Define tables that need special handling
    this.specialTables = {
      // Tables with computed columns that shouldn't be synced
      invoice_headers: {
        skipColumns: ['outstanding_amount', 'days_until_due', 'days_overdue'],
        computedColumns: ['matched_line_count', 'has_attachments', 'latest_approval_status']
      },
      // Add more special handling as needed
    };

    // Define column type conversions if needed
    this.typeConversions = {
      // Example: convert text to jsonb
      // vendor_masters: {
      //   metadata: { from: 'text', to: 'jsonb', convert: (val) => JSON.parse(val || '{}') }
      // }
    };
  }

  /**
   * Map column names from source to target schema
   */
  mapColumns(tableName, sourceColumns) {
    if (!this.columnMappings[tableName]) {
      return sourceColumns;
    }

    const mapping = this.columnMappings[tableName];
    return sourceColumns.map(col => mapping[col] || col);
  }

  /**
   * Get the mapped column name for a specific table and column
   */
  getMappedColumnName(tableName, sourceColumn) {
    if (!this.columnMappings[tableName]) {
      return sourceColumn;
    }
    return this.columnMappings[tableName][sourceColumn] || sourceColumn;
  }

  /**
   * Get columns to skip for a table
   */
  getSkipColumns(tableName) {
    if (!this.specialTables[tableName]) {
      return [];
    }
    return this.specialTables[tableName].skipColumns || [];
  }

  /**
   * Check if a column should be skipped
   */
  shouldSkipColumn(tableName, columnName) {
    const skipColumns = this.getSkipColumns(tableName);
    return skipColumns.includes(columnName);
  }

  /**
   * Build column mapping SQL for INSERT
   */
  buildColumnMapping(tableName, sourceColumns) {
    const targetColumns = [];
    const sourceRefs = [];

    for (const col of sourceColumns) {
      // Skip columns that shouldn't be synced
      if (this.shouldSkipColumn(tableName, col)) {
        continue;
      }

      const mappedCol = this.getMappedColumnName(tableName, col);
      targetColumns.push(mappedCol);
      sourceRefs.push(col);
    }

    return {
      targetColumns: targetColumns.join(', '),
      sourceColumns: sourceRefs.join(', ')
    };
  }

  /**
   * Apply type conversion if needed
   */
  convertValue(tableName, columnName, value) {
    if (!this.typeConversions[tableName]) {
      return value;
    }

    const conversion = this.typeConversions[tableName][columnName];
    if (!conversion) {
      return value;
    }

    try {
      return conversion.convert(value);
    } catch (error) {
      console.warn(`Failed to convert ${tableName}.${columnName}:`, error.message);
      return value;
    }
  }

  /**
   * Validate schema compatibility between source and target
   */
  async validateSchemaCompatibility(sourceDb, targetDb, tableName, SyncUtils) {
    try {
      // Get source columns
      const sourceQuery = `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = '${tableName}'
        ORDER BY ordinal_position
      `;

      const sourceColumns = await SyncUtils.executeQuery(sourceDb, sourceQuery, true);

      // Get target columns
      const targetColumns = await SyncUtils.executeQuery(targetDb, sourceQuery, true);

      const sourceColMap = {};
      const targetColMap = {};

      // Build column maps
      sourceColumns.forEach(col => {
        sourceColMap[col[0]] = {
          type: col[1],
          nullable: col[2],
          default: col[3]
        };
      });

      targetColumns.forEach(col => {
        targetColMap[col[0]] = {
          type: col[1],
          nullable: col[2],
          default: col[3]
        };
      });

      const issues = [];

      // Check for missing columns in target
      for (const [colName, colInfo] of Object.entries(sourceColMap)) {
        const mappedName = this.getMappedColumnName(tableName, colName);

        if (!targetColMap[mappedName] && !this.shouldSkipColumn(tableName, colName)) {
          issues.push({
            type: 'missing_column',
            table: tableName,
            column: colName,
            message: `Column ${colName} missing in target (expected as ${mappedName})`
          });
        }
      }

      // Check for type mismatches
      for (const [colName, colInfo] of Object.entries(sourceColMap)) {
        const mappedName = this.getMappedColumnName(tableName, colName);
        const targetCol = targetColMap[mappedName];

        if (targetCol && !this.shouldSkipColumn(tableName, colName)) {
          // Allow some type variations
          const compatibleTypes = this.areTypesCompatible(colInfo.type, targetCol.type);
          if (!compatibleTypes) {
            issues.push({
              type: 'type_mismatch',
              table: tableName,
              column: colName,
              sourceType: colInfo.type,
              targetType: targetCol.type,
              message: `Type mismatch for ${colName}: ${colInfo.type} -> ${targetCol.type}`
            });
          }
        }
      }

      return {
        compatible: issues.length === 0,
        issues
      };

    } catch (error) {
      console.error(`Error validating schema for ${tableName}:`, error.message);
      return {
        compatible: false,
        issues: [{
          type: 'error',
          message: error.message
        }]
      };
    }
  }

  /**
   * Check if two column types are compatible
   */
  areTypesCompatible(sourceType, targetType) {
    // Exact match
    if (sourceType === targetType) return true;

    // Common compatible types
    const compatibilityMap = {
      'character varying': ['text', 'character varying'],
      'text': ['character varying', 'text'],
      'integer': ['integer', 'bigint'],
      'bigint': ['integer', 'bigint'],
      'numeric': ['decimal', 'numeric'],
      'decimal': ['numeric', 'decimal'],
      'timestamp with time zone': ['timestamp without time zone', 'timestamp with time zone'],
      'timestamp without time zone': ['timestamp with time zone', 'timestamp without time zone'],
      'json': ['jsonb', 'json'],
      'jsonb': ['json', 'jsonb']
    };

    const sourceCompat = compatibilityMap[sourceType] || [];
    return sourceCompat.includes(targetType);
  }

  /**
   * Get sync order recommendation based on dependencies
   */
  getSyncOrderRecommendation() {
    // Return recommended order based on typical foreign key dependencies
    return [
      // Foundation tables (no dependencies)
      'users',
      'tax_rates',
      'payment_terms',

      // Master data
      'vendors',
      'vendor_bank_accounts',
      'items',
      'cost_centers',

      // Transactional headers
      'po_headers',
      'gr_headers',
      'ses_headers',
      'invoice_headers',
      // 'payment_headers',  // Commented out - table doesn't exist yet

      // Transactional lines
      'po_lines',
      'gr_lines',
      'ses_lines',
      'invoice_lines',
      // 'payment_lines',  // Commented out - table doesn't exist yet

      // Supporting data
      'attachments',
      'approvals',
      'audit_events',
      'invoice_status_history',
      'match_results'  // Added for PO-invoice line matching
    ];
  }
}

// Export for use in other scripts
module.exports = SchemaMapper;

// If run directly, show mapping info
if (require.main === module) {
  const mapper = new SchemaMapper();

  console.log('📋 Schema Mapping Configuration');
  console.log('================================\n');

  console.log('Column Mappings:');
  console.log(JSON.stringify(mapper.columnMappings, null, 2));

  console.log('\nSpecial Tables:');
  console.log(JSON.stringify(mapper.specialTables, null, 2));

  console.log('\nRecommended Sync Order:');
  mapper.getSyncOrderRecommendation().forEach((table, index) => {
    console.log(`  ${index + 1}. ${table}`);
  });
}