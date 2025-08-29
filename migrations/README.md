# Invoice Processing Database Migrations

This directory contains SQL migrations for the comprehensive invoice processing system with 2-way/3-way matching, approval workflows, and agent orchestration.

## Overview

The database implements a complete document management system for:
- Purchase Orders (POs)
- Goods Receipts (GRs)
- Service Entry Sheets (SES)
- Invoices with automatic matching
- Approval workflows
- Agent-based processing pipeline

## Migration Files

### Core Structure
- `000_cleanup.sql` - Removes existing tables (run first on existing DB)
- `001_enums.sql` - PostgreSQL ENUM type definitions
- `010_core_tables.sql` - All entity tables
- `020_constraints.sql` - Foreign keys, checks, unique constraints
- `030_indexes.sql` - Performance and search indexes
- `040_views.sql` - Computed views and rollups
- `050_triggers.sql` - Automatic field maintenance
- `060_seed_minimal.sql` - Realistic test data
- `070_sample_functions.sql` - Matching, approval, and workflow functions

## Quick Start

### 1. Apply Migrations

```bash
# Start PostgreSQL (if using Docker)
npm run db:dev

# Apply all migrations in order
psql $DATABASE_URL -f migrations/000_cleanup.sql
psql $DATABASE_URL -f migrations/001_enums.sql
psql $DATABASE_URL -f migrations/010_core_tables.sql
psql $DATABASE_URL -f migrations/020_constraints.sql
psql $DATABASE_URL -f migrations/030_indexes.sql
psql $DATABASE_URL -f migrations/040_views.sql
psql $DATABASE_URL -f migrations/050_triggers.sql
psql $DATABASE_URL -f migrations/060_seed_minimal.sql
psql $DATABASE_URL -f migrations/070_sample_functions.sql

# Or apply all at once
cat migrations/*.sql | psql $DATABASE_URL
```

### 2. Run Tests

```bash
# Install pgTAP extension (if not installed)
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS pgtap;"

# Run tests
psql $DATABASE_URL -f tests/pgtap.sql
```

### 3. Verify Installation

```sql
-- Check seed data
SELECT COUNT(*) FROM vendors;  -- Should return 2
SELECT COUNT(*) FROM po_headers;  -- Should return 2
SELECT COUNT(*) FROM invoice_headers;  -- Should return 3

-- Test matching function
SELECT fn_match_invoice('p1111111-1111-1111-1111-111111111111');
SELECT match_status FROM invoice_headers WHERE id = 'p1111111-1111-1111-1111-111111111111';
-- Should return 'matched'
```

## Key Features

### 2-Way/3-Way Matching
The system supports multiple matching scenarios:
- **2-way PO**: Invoice ↔ Purchase Order
- **3-way Goods**: Invoice ↔ PO ↔ Goods Receipt
- **3-way Services**: Invoice ↔ PO ↔ Service Entry

### Tolerance Profiles
Configurable tolerance levels for:
- Price variance (percentage)
- Quantity variance (percentage)
- Amount variance (absolute)
- Tax and rounding differences

### Workflow Stages
Documents flow through stages:
1. `ingest` - Document received
2. `extract_index` - Data extraction
3. `match` - Automatic matching
4. `non_po` - Non-PO processing
5. `post` - ERP posting

## Example Queries

### Find Remaining PO Quantities
```sql
SELECT 
    po.po_number,
    pl.line_no,
    pl.description,
    plr.qty_ordered,
    plr.qty_received_to_date,
    plr.qty_remaining_to_receive,
    plr.qty_invoiced_to_date,
    plr.qty_remaining_to_invoice
FROM po_line_rollups plr
JOIN po_lines pl ON pl.id = plr.po_line_id
JOIN po_headers po ON po.id = pl.po_id
WHERE plr.qty_remaining_to_receive > 0;
```

### Search Invoices by PO Number
```sql
SELECT 
    ih.invoice_number,
    ih.vendor_name_snapshot,
    ih.total,
    ih.match_status,
    ih.po_numbers_cached
FROM invoice_headers ih
WHERE ih.po_numbers_cached @> ARRAY['PO-2024-001'];
```

### View Match Results
```sql
SELECT 
    ih.invoice_number,
    il.line_no,
    il.description,
    mr.explanation_code,
    mr.within_tolerance,
    mr.qty_variance,
    mr.price_variance
FROM match_results mr
JOIN invoice_headers ih ON ih.id = mr.invoice_id
LEFT JOIN invoice_lines il ON il.id = mr.invoice_line_id
WHERE ih.invoice_number = 'INV-2024-001'
ORDER BY il.line_no;
```

### Work Queue Status
```sql
SELECT 
    document_number,
    vendor_name,
    stage,
    status,
    hours_in_status,
    is_overdue
FROM work_queue
WHERE status IN ('queued', 'in_progress')
ORDER BY priority, created_at;
```

## Data Model Highlights

### Financial Precision
- **Money**: DECIMAL(18,4) - 18 digits, 4 decimal places
- **Quantities**: DECIMAL(18,6) - 18 digits, 6 decimal places
- **FX Rates**: DECIMAL(18,8) - 18 digits, 8 decimal places
- **Percentages**: DECIMAL(7,4) - 7 digits, 4 decimal places

### Key Relationships
- Invoices → PO Lines → POs → Vendors
- Invoice Lines → GR/SES Lines → PO Lines
- Invoices → Approvals → Approver Groups → Users
- Documents → Work Items → Agent Runs

### Automatic Maintenance
- `updated_at` timestamps via triggers
- `po_numbers_cached` array on invoices
- Normalized quantities with UOM conversion
- Audit event logging for critical changes

## Security

### Recommended Roles
```sql
-- Read-only role
CREATE ROLE app_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_ro;

-- Read-write role
CREATE ROLE app_rw;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_rw;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_rw;

-- Application user
CREATE USER app_user WITH PASSWORD 'secure_password';
GRANT app_rw TO app_user;
```

## Troubleshooting

### Common Issues

1. **Migration fails with "type already exists"**
   - Run `000_cleanup.sql` first to remove existing objects

2. **Tests fail with "extension not found"**
   - Install pgTAP: `CREATE EXTENSION pgtap;`

3. **Match function returns unexpected results**
   - Check tolerance profiles are configured
   - Verify GR/SES data exists for 3-way matching

4. **Performance issues**
   - Run `ANALYZE;` after loading data
   - Check indexes with `\di` in psql
   - Review slow queries with `EXPLAIN ANALYZE`

## Next Steps

After installation:
1. Configure Prisma schema to match new structure
2. Update application code to use new tables
3. Set up agent workers for work_items processing
4. Configure approval policies for your organization
5. Implement document ingestion pipeline