#!/usr/bin/env node
/**
 * Sync State Tracker
 * Manages sync history and tracks what has been synced
 */

const fs = require('fs');
const path = require('path');

class SyncTracker {
  constructor(stateFile = '.sync-state.json') {
    this.stateFile = path.join(process.cwd(), stateFile);
    this.state = this.loadState();
  }

  /**
   * Load sync state from file
   */
  loadState() {
    try {
      if (fs.existsSync(this.stateFile)) {
        const data = fs.readFileSync(this.stateFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn('⚠️ Could not load sync state, starting fresh:', error.message);
    }

    // Default state structure
    return {
      lastSync: null,
      syncHistory: [],
      tableStates: {},
      config: {
        maxHistoryEntries: 100,
        syncBatchSize: 100
      }
    };
  }

  /**
   * Save sync state to file
   */
  saveState() {
    try {
      fs.writeFileSync(
        this.stateFile,
        JSON.stringify(this.state, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('❌ Error saving sync state:', error.message);
      throw error;
    }
  }

  /**
   * Get last sync timestamp for a specific table
   */
  getTableLastSync(tableName) {
    return this.state.tableStates[tableName]?.lastSyncedAt || null;
  }

  /**
   * Get last successful sync timestamp
   */
  getLastSync() {
    return this.state.lastSync;
  }

  /**
   * Start a new sync session
   */
  startSync(tables = []) {
    const sessionId = this.generateSessionId();
    const syncSession = {
      sessionId,
      startedAt: new Date().toISOString(),
      tables: tables,
      status: 'in_progress',
      recordsSynced: 0,
      errors: []
    };

    // Add to current session
    this.currentSession = syncSession;

    return sessionId;
  }

  /**
   * Update progress for current sync session
   */
  updateProgress(tableName, recordCount) {
    if (!this.currentSession) {
      throw new Error('No active sync session');
    }

    // Update table state
    if (!this.state.tableStates[tableName]) {
      this.state.tableStates[tableName] = {};
    }

    this.state.tableStates[tableName] = {
      ...this.state.tableStates[tableName],
      lastSyncedAt: new Date().toISOString(),
      lastSyncRecordCount: recordCount,
      totalSyncedRecords: (this.state.tableStates[tableName].totalSyncedRecords || 0) + recordCount
    };

    // Update session
    this.currentSession.recordsSynced += recordCount;

    // Save progress incrementally
    this.saveState();
  }

  /**
   * Record an error during sync
   */
  recordError(error, context = {}) {
    if (!this.currentSession) {
      throw new Error('No active sync session');
    }

    this.currentSession.errors.push({
      timestamp: new Date().toISOString(),
      message: error.message || String(error),
      context
    });
  }

  /**
   * Complete the current sync session
   */
  completeSync(status = 'success') {
    if (!this.currentSession) {
      throw new Error('No active sync session');
    }

    const endedAt = new Date().toISOString();

    // Finalize session
    this.currentSession.endedAt = endedAt;
    this.currentSession.status = status;
    this.currentSession.duration = this.calculateDuration(
      this.currentSession.startedAt,
      endedAt
    );

    // Update global last sync
    if (status === 'success') {
      this.state.lastSync = endedAt;
    }

    // Add to history (limit size)
    this.state.syncHistory.unshift(this.currentSession);
    if (this.state.syncHistory.length > this.state.config.maxHistoryEntries) {
      this.state.syncHistory = this.state.syncHistory.slice(
        0,
        this.state.config.maxHistoryEntries
      );
    }

    // Save final state
    this.saveState();

    const session = this.currentSession;
    this.currentSession = null;

    return session;
  }

  /**
   * Get records that need syncing based on timestamps
   */
  async getRecordsToSync(dbConfig, tableName, dateField = 'created_at') {
    const lastSync = this.getTableLastSync(tableName);
    const { execSync } = require('child_process');

    let whereClause = '';
    if (lastSync) {
      whereClause = `WHERE ${dateField} > '${lastSync}'`;
    }

    const countQuery = `
      SELECT COUNT(*)
      FROM ${tableName}
      ${whereClause}
    `;

    try {
      const result = execSync(
        `PGPASSWORD=${dbConfig.password} psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} -t -A -c "${countQuery}"`,
        { encoding: 'utf8' }
      );

      return {
        count: parseInt(result.trim(), 10),
        lastSync,
        whereClause
      };
    } catch (error) {
      console.error(`❌ Error checking records to sync for ${tableName}:`, error.message);
      throw error;
    }
  }

  /**
   * Generate sync report
   */
  generateReport() {
    const report = {
      lastSync: this.state.lastSync,
      totalSyncs: this.state.syncHistory.length,
      successfulSyncs: this.state.syncHistory.filter(s => s.status === 'success').length,
      failedSyncs: this.state.syncHistory.filter(s => s.status === 'failed').length,
      totalRecordsSynced: this.state.syncHistory.reduce((sum, s) => sum + s.recordsSynced, 0),
      tablesSummary: {}
    };

    // Summarize by table
    for (const [table, state] of Object.entries(this.state.tableStates)) {
      report.tablesSummary[table] = {
        lastSync: state.lastSyncedAt,
        totalRecords: state.totalSyncedRecords || 0,
        lastBatch: state.lastSyncRecordCount || 0
      };
    }

    // Recent sync history
    report.recentSyncs = this.state.syncHistory.slice(0, 10).map(s => ({
      date: s.startedAt,
      status: s.status,
      records: s.recordsSynced,
      duration: s.duration,
      errors: s.errors.length
    }));

    return report;
  }

  /**
   * Clear sync history (useful for reset)
   */
  clearHistory() {
    this.state.syncHistory = [];
    this.saveState();
  }

  /**
   * Reset sync state for specific table
   */
  resetTableState(tableName) {
    delete this.state.tableStates[tableName];
    this.saveState();
  }

  /**
   * Reset all sync state
   */
  resetAll() {
    this.state = {
      lastSync: null,
      syncHistory: [],
      tableStates: {},
      config: this.state.config
    };
    this.saveState();
  }

  /**
   * Helper: Generate unique session ID
   */
  generateSessionId() {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Helper: Calculate duration between two timestamps
   */
  calculateDuration(start, end) {
    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();
    const durationMs = endMs - startMs;

    if (durationMs < 1000) {
      return `${durationMs}ms`;
    } else if (durationMs < 60000) {
      return `${(durationMs / 1000).toFixed(1)}s`;
    } else {
      return `${Math.floor(durationMs / 60000)}m ${Math.floor((durationMs % 60000) / 1000)}s`;
    }
  }

  /**
   * Get sync statistics
   */
  getStats() {
    const stats = {
      totalSyncs: this.state.syncHistory.length,
      successRate: 0,
      averageDuration: '0s',
      averageRecords: 0,
      lastSyncStatus: null,
      mostSyncedTable: null,
      tablesCount: Object.keys(this.state.tableStates).length
    };

    if (stats.totalSyncs > 0) {
      const successful = this.state.syncHistory.filter(s => s.status === 'success').length;
      stats.successRate = Math.round((successful / stats.totalSyncs) * 100);

      stats.averageRecords = Math.round(
        this.state.syncHistory.reduce((sum, s) => sum + s.recordsSynced, 0) / stats.totalSyncs
      );

      stats.lastSyncStatus = this.state.syncHistory[0]?.status;
    }

    // Find most synced table
    let maxSyncs = 0;
    for (const [table, state] of Object.entries(this.state.tableStates)) {
      if (state.totalSyncedRecords > maxSyncs) {
        maxSyncs = state.totalSyncedRecords;
        stats.mostSyncedTable = table;
      }
    }

    return stats;
  }
}

// Export for use in other scripts
module.exports = SyncTracker;

// If run directly, show sync state info
if (require.main === module) {
  const tracker = new SyncTracker();

  console.log('📊 Sync State Information');
  console.log('========================\n');

  const stats = tracker.getStats();
  console.log('📈 Statistics:');
  console.log(`  Total syncs: ${stats.totalSyncs}`);
  console.log(`  Success rate: ${stats.successRate}%`);
  console.log(`  Average records: ${stats.averageRecords}`);
  console.log(`  Tables tracked: ${stats.tablesCount}`);
  console.log(`  Most synced table: ${stats.mostSyncedTable || 'None'}`);

  console.log('\n📋 Recent Sync History:');
  const report = tracker.generateReport();
  if (report.recentSyncs.length > 0) {
    report.recentSyncs.forEach((sync, index) => {
      console.log(`  ${index + 1}. ${sync.date} - ${sync.status} (${sync.records} records, ${sync.duration})`);
    });
  } else {
    console.log('  No sync history yet');
  }

  console.log('\n📅 Table States:');
  if (Object.keys(report.tablesSummary).length > 0) {
    for (const [table, summary] of Object.entries(report.tablesSummary)) {
      console.log(`  ${table}:`);
      console.log(`    Last sync: ${summary.lastSync || 'Never'}`);
      console.log(`    Total records: ${summary.totalRecords}`);
    }
  } else {
    console.log('  No tables synced yet');
  }
}