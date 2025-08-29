# Database Dumps

Generated from PostgreSQL 15 container with complete invoice processing schema and seed data.

## Files

- **schema.sql** - Schema-only dump (tables, views, functions, triggers, indexes)
- **data.sql** - Data-only dump with INSERT statements  
- **invoice_poc.dump** - Custom format dump (complete backup)

## Generation Commands

These dumps were generated using the following commands:

```bash
# 1. Start PostgreSQL 15 container
docker run --name postgres15-dump -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=invoice_poc -p 5433:5432 -d postgres:15

# 2. Apply migrations in order (000-070)
for file in migrations/0*.sql; do
  PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d invoice_poc -f "$file"
done

# 3. Generate schema-only dump
docker exec postgres15-dump pg_dump -U postgres -d invoice_poc \
  --schema-only --no-owner --no-privileges --no-comments \
  --no-publications --no-subscriptions --no-tablespaces > dumps/schema.sql

# 4. Generate data-only dump with INSERT statements
docker exec postgres15-dump pg_dump -U postgres -d invoice_poc \
  --data-only --no-owner --no-privileges --inserts --no-comments \
  --no-publications --no-subscriptions > dumps/data.sql

# 5. Generate custom format dump
docker exec postgres15-dump pg_dump -U postgres -d invoice_poc \
  --format=custom --no-owner --no-privileges --no-comments > dumps/invoice_poc.dump
```

## Restoration Commands

### Schema Only
```bash
psql -U postgres -d target_db < dumps/schema.sql
```

### Data Only (requires schema to exist)
```bash
psql -U postgres -d target_db < dumps/data.sql
```

### Complete Restore from Custom Format
```bash
pg_restore --no-owner --no-privileges -d target_db dumps/invoice_poc.dump
```

## Important Notes

1. **PostgreSQL Version**: Generated with PostgreSQL 15.14
2. **Portability**: Uses `--no-owner` and `--no-privileges` for maximum portability
3. **Raw SQL**: Do NOT use Prisma migrate - execute raw SQL files in numeric order
4. **Circular FK Warning**: Data dump may require `--disable-triggers` on restore due to circular foreign keys

## Database Contents

- **34 tables** for complete document management
- **13 ENUM types** for controlled vocabularies  
- **5 views** for aggregations and rollups
- **9 functions** for matching, approvals, and workflows
- **3 test invoices** with different matching scenarios
- **Complete indexes** for performance optimization