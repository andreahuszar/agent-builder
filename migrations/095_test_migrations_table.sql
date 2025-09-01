-- 095_test_migrations_table.sql
-- Create test_migrations table for healthcheck endpoint
-- This table is used by /api/test-db to verify database connectivity

CREATE TABLE IF NOT EXISTS test_migrations (
    id VARCHAR(30) PRIMARY KEY DEFAULT (CONCAT('test_', TO_CHAR(NOW(), 'YYYYMMDDHH24MISS'), '_', SUBSTR(MD5(RANDOM()::TEXT), 1, 6))),
    name VARCHAR(255) NOT NULL,
    value TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Add update trigger for updatedAt
CREATE OR REPLACE TRIGGER update_test_migrations_updated_at
    BEFORE UPDATE ON test_migrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert initial test record
INSERT INTO test_migrations (name, value) 
VALUES ('Initial Setup', 'Migration applied successfully')
ON CONFLICT DO NOTHING;