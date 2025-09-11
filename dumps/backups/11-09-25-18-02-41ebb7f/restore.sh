#!/bin/bash
# Restore script for backup 11-09-25-18-02-41ebb7f
# Generated: 2025-09-11T17:02:38.688Z

set -e

# Configuration
DB_HOST="127.0.0.1"
DB_PORT="5433"
DB_NAME="xelix_invoice_dev"
DB_USER="postgres"

echo "🔄 Database Restore Script"
echo "========================"
echo "Backup: 11-09-25-18-02-41ebb7f"
echo "Database: $DB_NAME"
echo ""
echo "⚠️  WARNING: This will DROP and RECREATE the database!"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

# Set password
export PGPASSWORD="postgres"

# Drop and recreate database
echo "🗑️  Dropping existing database..."
dropdb -h $DB_HOST -p $DB_PORT -U $DB_USER --if-exists $DB_NAME

echo "✨ Creating new database..."
createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME

# Restore from custom format dump
echo "📥 Restoring database..."
pg_restore -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME --no-owner --no-privileges full.dump

echo "✅ Database restored successfully!"
echo ""
echo "📊 Verifying restoration..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) as tables FROM information_schema.tables WHERE table_schema = 'public';"
