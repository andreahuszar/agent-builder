-- ================================================================
-- MIGRATION TRACKING SYSTEM
-- ================================================================
-- This must be the first migration to run
-- Creates a table to track which migrations have been applied
-- Prevents duplicate execution and enables rollback tracking

-- Create migration tracking table if it doesn't exist
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL UNIQUE,
  checksum VARCHAR(64) NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  execution_time_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  rolled_back BOOLEAN DEFAULT false,
  rolled_back_at TIMESTAMPTZ
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_schema_migrations_filename 
ON schema_migrations(filename);

-- Index for finding failed migrations
CREATE INDEX IF NOT EXISTS idx_schema_migrations_success 
ON schema_migrations(success) 
WHERE success = false;

-- Index for finding rolled back migrations
CREATE INDEX IF NOT EXISTS idx_schema_migrations_rolled_back
ON schema_migrations(rolled_back)
WHERE rolled_back = true;

-- Add comment for documentation
COMMENT ON TABLE schema_migrations IS 'Tracks applied database migrations to prevent duplicate execution';
COMMENT ON COLUMN schema_migrations.filename IS 'Name of the migration file';
COMMENT ON COLUMN schema_migrations.checksum IS 'SHA256 hash of the migration content';
COMMENT ON COLUMN schema_migrations.applied_at IS 'When the migration was applied';
COMMENT ON COLUMN schema_migrations.execution_time_ms IS 'How long the migration took to run';
COMMENT ON COLUMN schema_migrations.success IS 'Whether the migration completed successfully';
COMMENT ON COLUMN schema_migrations.error_message IS 'Error message if migration failed';
COMMENT ON COLUMN schema_migrations.rolled_back IS 'Whether this migration has been rolled back';
COMMENT ON COLUMN schema_migrations.rolled_back_at IS 'When the migration was rolled back';