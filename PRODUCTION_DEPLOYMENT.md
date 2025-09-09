# Production Deployment Guide

## Overview

This guide covers the complete process for deploying the Xelix Invoice Processing application to production, including database migration from local to production environment.

## Phase 4: Production Migration

### Prerequisites

1. **Local Database Running**: Ensure your local PostgreSQL database is running on port 5433
2. **Production Database Access**: Have your production database credentials ready
3. **Backup Storage**: Ensure you have sufficient disk space for database exports

### Database Migration Scripts

We've created several scripts to handle production deployment:

| Script | Purpose | Command |
|--------|---------|---------|
| `export-local-data.js` | Export local database schema and data | `npm run db:export` |
| `import-to-production.js` | Import data to production database | `npm run db:production:import` |
| `production-migration.js` | Complete migration orchestrator | `npm run db:production:migrate` |
| `wipe-production.js` | Clear production data (use with caution) | `npm run db:production:wipe` |

### Step-by-Step Migration Process

#### 1. Export Local Data

First, export your local database:

```bash
npm run db:export
```

This will create:
- Schema SQL file with complete database structure
- Data SQL file with all records
- Manifest JSON file with metadata
- Combined SQL file for easy import

Files are saved in `data-export/` directory with timestamps.

#### 2. Set Production Environment Variables

Configure your production database connection:

```bash
export PROD_DB_HOST=your-production-host.com
export PROD_DB_PORT=5432
export PROD_DB_NAME=xelix_invoice_prod
export PROD_DB_USER=postgres
export PROD_DB_PASSWORD=your-secure-password
```

Or use a single DATABASE_URL:

```bash
export DATABASE_URL=postgresql://user:password@host:port/database
```

#### 3. Run Complete Migration

Execute the complete migration to production:

```bash
npm run db:production:migrate
```

This script will:
1. Export local data (if not already done)
2. Verify the export
3. Request confirmation (requires typing exact phrases)
4. Create a backup of existing production data
5. Wipe production database
6. Import schema and data
7. Verify the import

**⚠️ WARNING**: This is a destructive operation that will completely replace production data!

#### 4. Alternative: Manual Import

If you prefer more control, run the import directly:

```bash
npm run db:production:import
```

You'll be prompted to:
1. Confirm the database name
2. Type "DEPLOY TO PRODUCTION" to proceed
3. The script will handle backup and import automatically

### Production Database Schema

The production database will have the exact same structure as local, including:

#### Core Tables
- `users` - User accounts
- `vendors` - Vendor information
- `payment_terms` - Payment term definitions
- `org_entities` - Organization entities
- `cost_centers` - Cost center definitions
- `projects` - Project information
- `tax_rates` - Tax rate configurations
- `items` - Item catalog
- `tolerance_profiles` - Tolerance configuration
- `ship_to_sites` - Shipping locations
- `uom_conversions` - Unit of measure conversions

#### Transaction Tables
- `invoice_headers` - Invoice header information
- `invoice_lines` - Invoice line items
- `invoice_line_distributions` - Line distributions
- `invoice_line_receipts` - Receipt matching
- `invoice_line_taxes` - Tax calculations
- `invoice_status_history` - Status tracking

#### Purchase Order Tables
- `po_headers` - Purchase order headers
- `po_lines` - Purchase order lines

#### Goods Receipt Tables
- `gr_headers` - Goods receipt headers
- `gr_lines` - Goods receipt lines

#### Service Entry Tables
- `ses_headers` - Service entry headers
- `ses_lines` - Service entry lines

#### Matching & Approval Tables
- `match_results` - 3-way matching results
- `approval_policies` - Approval rules
- `approver_groups` - Approver group definitions
- `approver_group_members` - Group memberships
- `approvals` - Approval records

#### Supporting Tables
- `attachments` - File attachments
- `source_files` - Source document tracking
- `external_refs` - External system references
- `audit_events` - Audit trail
- `work_items` - Work queue items
- `agent_runs` - AI agent execution logs

### Performance Optimizations

The migration includes performance indexes on:

#### Invoice Indexes
- Status, vendor, date, and match status
- GIN index for PO number arrays
- Composite indexes for common queries

#### PO/GR Indexes
- Order numbers, vendors, dates
- Line item relationships
- Status tracking

#### Matching Indexes
- Invoice and line relationships
- Tolerance matching
- PO and GR line matching

### Data Integrity

The migration ensures:
1. **Foreign Key Constraints**: All relationships are preserved
2. **Sequences**: Auto-increment counters are properly reset
3. **Data Types**: Decimal precision is maintained
4. **Constraints**: All unique and check constraints are enforced

### Rollback Strategy

If issues occur after migration:

1. **Immediate Rollback**: Use the automatic backup created during import
   ```bash
   # Backups are in data-export/prod_backup_*.sql
   PGPASSWORD=$PROD_DB_PASSWORD psql -h $PROD_DB_HOST -p $PROD_DB_PORT \
     -U $PROD_DB_USER -d $PROD_DB_NAME < data-export/prod_backup_[timestamp].sql
   ```

2. **Clean Slate**: Wipe and re-import
   ```bash
   npm run db:production:wipe
   npm run db:production:import
   ```

### Post-Migration Checklist

After successful migration:

- [ ] Verify record counts match between local and production
- [ ] Test invoice creation and viewing
- [ ] Verify PO and GR relationships
- [ ] Check matching results
- [ ] Test approval workflows
- [ ] Verify all indexes are created
- [ ] Monitor application logs for errors
- [ ] Keep backup files for at least 7 days

### Security Considerations

1. **Credentials**: Never commit database credentials to git
2. **Backups**: Store backups in secure location
3. **Access**: Limit production database access
4. **Encryption**: Use SSL/TLS for database connections
5. **Audit**: Log all migration activities

### Troubleshooting

#### Connection Issues
```bash
# Test connection
PGPASSWORD=$PROD_DB_PASSWORD psql -h $PROD_DB_HOST -p $PROD_DB_PORT \
  -U $PROD_DB_USER -d postgres -c "SELECT 1"
```

#### Permission Issues
Ensure the database user has:
- CREATE/DROP database privileges
- Full table permissions
- Sequence manipulation rights

#### Data Size Issues
For large databases:
1. Split exports into smaller chunks
2. Use compression for transfer
3. Consider using pg_dump with custom format

### Monitoring

After deployment, monitor:
- Query performance
- Connection pool usage
- Error rates
- Transaction volumes
- Index usage statistics

### Support

For issues during migration:
1. Check `data-export/` for backup files
2. Review migration logs
3. Verify environment variables
4. Test database connectivity
5. Ensure sufficient disk space

## Summary

The Phase 4 production migration provides:
- ✅ Complete local-to-production data migration
- ✅ Automatic backup creation
- ✅ Schema and data integrity preservation
- ✅ Performance optimizations via indexes
- ✅ Safety confirmations to prevent accidents
- ✅ Rollback capabilities

All migration scripts are idempotent and include safety checks to prevent data loss.