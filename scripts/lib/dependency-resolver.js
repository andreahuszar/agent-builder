#!/usr/bin/env node
/**
 * Dependency Resolver for Database Tables
 * Analyzes foreign key relationships and determines correct sync order
 */

const { execSync } = require('child_process');

class DependencyResolver {
  constructor(dbConfig) {
    this.dbConfig = dbConfig;
    this.dependencies = new Map();
    this.resolved = [];
    this.resolving = new Set();
  }

  /**
   * Get foreign key dependencies for all tables
   */
  async analyzeDependencies() {
    console.log('🔍 Analyzing table dependencies...');

    const query = `
      SELECT
        tc.table_name,
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
        AND tc.table_name NOT LIKE '\\_prisma%'
      ORDER BY tc.table_name;
    `;

    try {
      const result = execSync(
        `PGPASSWORD=${this.dbConfig.password} psql -h ${this.dbConfig.host} -p ${this.dbConfig.port} -U ${this.dbConfig.user} -d ${this.dbConfig.database} -t -A -F'|' -c "${query}"`,
        { encoding: 'utf8' }
      );

      const lines = result.trim().split('\n').filter(line => line);

      // Build dependency map
      this.dependencies.clear();

      for (const line of lines) {
        const [table, column, foreignTable, foreignColumn] = line.split('|');

        if (!this.dependencies.has(table)) {
          this.dependencies.set(table, new Set());
        }

        // Skip self-references (like parent_id in same table)
        if (table !== foreignTable) {
          this.dependencies.get(table).add(foreignTable);
        }
      }

      return this.dependencies;
    } catch (error) {
      console.error('❌ Error analyzing dependencies:', error.message);
      throw error;
    }
  }

  /**
   * Get all tables in the database
   */
  async getAllTables() {
    const query = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE '\\_prisma%'
        AND table_name NOT LIKE 'pg_%'
      ORDER BY table_name;
    `;

    try {
      const result = execSync(
        `PGPASSWORD=${this.dbConfig.password} psql -h ${this.dbConfig.host} -p ${this.dbConfig.port} -U ${this.dbConfig.user} -d ${this.dbConfig.database} -t -A -c "${query}"`,
        { encoding: 'utf8' }
      );

      return result.trim().split('\n').filter(line => line);
    } catch (error) {
      console.error('❌ Error getting tables:', error.message);
      throw error;
    }
  }

  /**
   * Resolve dependencies using topological sort
   */
  resolveDependencyOrder(table, visited = new Set(), stack = []) {
    if (visited.has(table)) {
      return;
    }

    if (this.resolving.has(table)) {
      console.warn(`⚠️ Circular dependency detected involving table: ${table}`);
      return;
    }

    this.resolving.add(table);
    visited.add(table);

    const deps = this.dependencies.get(table) || new Set();
    for (const dep of deps) {
      if (!visited.has(dep)) {
        this.resolveDependencyOrder(dep, visited, stack);
      }
    }

    this.resolving.delete(table);
    stack.push(table);

    return stack;
  }

  /**
   * Get the complete sync order for all tables
   */
  async getSyncOrder() {
    await this.analyzeDependencies();
    const allTables = await this.getAllTables();

    const visited = new Set();
    const syncOrder = [];

    // First, add tables with no dependencies
    for (const table of allTables) {
      if (!this.dependencies.has(table) || this.dependencies.get(table).size === 0) {
        const hasDependents = Array.from(this.dependencies.values()).some(deps => deps.has(table));
        if (!hasDependents) {
          syncOrder.push(table);
          visited.add(table);
        }
      }
    }

    // Then resolve remaining tables
    for (const table of allTables) {
      if (!visited.has(table)) {
        const order = this.resolveDependencyOrder(table, visited, []);
        if (order) {
          syncOrder.push(...order.filter(t => !syncOrder.includes(t)));
        }
      }
    }

    return syncOrder;
  }

  /**
   * Group tables by dependency levels for parallel processing
   */
  async getSyncLevels() {
    const syncOrder = await this.getSyncOrder();
    const levels = [];
    const processed = new Set();

    while (processed.size < syncOrder.length) {
      const currentLevel = [];

      for (const table of syncOrder) {
        if (processed.has(table)) continue;

        const deps = this.dependencies.get(table) || new Set();
        const canProcess = Array.from(deps).every(dep => processed.has(dep));

        if (canProcess) {
          currentLevel.push(table);
        }
      }

      if (currentLevel.length === 0 && processed.size < syncOrder.length) {
        // Handle remaining tables (likely circular dependencies)
        const remaining = syncOrder.filter(t => !processed.has(t));
        console.warn('⚠️ Adding remaining tables with potential circular dependencies:', remaining);
        currentLevel.push(...remaining);
      }

      currentLevel.forEach(table => processed.add(table));
      if (currentLevel.length > 0) {
        levels.push(currentLevel);
      }
    }

    return levels;
  }

  /**
   * Validate that all foreign key references will be satisfied
   */
  async validateSync(tablesToSync) {
    const syncSet = new Set(tablesToSync);
    const issues = [];

    for (const table of tablesToSync) {
      const deps = this.dependencies.get(table) || new Set();
      for (const dep of deps) {
        if (!syncSet.has(dep)) {
          issues.push({
            table,
            missingDependency: dep,
            message: `Table '${table}' depends on '${dep}' which is not in sync list`
          });
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}

// Export for use in other scripts
module.exports = DependencyResolver;

// If run directly, show dependency analysis
if (require.main === module) {
  const dbConfig = {
    host: 'localhost',
    port: 5433,
    database: 'xelix_invoice_dev',
    user: 'postgres',
    password: 'postgres'
  };

  const resolver = new DependencyResolver(dbConfig);

  (async () => {
    try {
      console.log('📊 Database Dependency Analysis');
      console.log('================================\n');

      const dependencies = await resolver.analyzeDependencies();
      console.log('Dependencies found:');
      for (const [table, deps] of dependencies) {
        if (deps.size > 0) {
          console.log(`  ${table} → [${Array.from(deps).join(', ')}]`);
        }
      }

      console.log('\n📋 Recommended sync order:');
      const syncOrder = await resolver.getSyncOrder();
      syncOrder.forEach((table, index) => {
        console.log(`  ${index + 1}. ${table}`);
      });

      console.log('\n🔄 Sync levels (can be processed in parallel):');
      const levels = await resolver.getSyncLevels();
      levels.forEach((level, index) => {
        console.log(`  Level ${index + 1}: [${level.join(', ')}]`);
      });

    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  })();
}