# Database Sync Reference Guide

## 🔄 Quick Reference - Keeping Local & Railway in Sync

### After Schema Changes (new tables, columns, enums)
```bash
npm run db:sync:enhanced
```
This extracts your local schema and syncs it to Railway automatically.

### After Adding New Data
```bash
npm run db:sync:full
```
This syncs all data with ID preservation for proper relationships.

### For Clean Slate Sync (complete replacement)
```bash
npm run db:sync:full:clean
```
⚠️ WARNING: This will TRUNCATE all Railway data first!

---

## 📁 Critical Files to Update

### 1. `scripts/lib/schema-mapper.js`
When adding new tables, update the sync order:
```javascript
getSyncOrderRecommendation() {
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

    // Transactional lines
    'po_lines',
    'gr_lines',
    'ses_lines',
    'invoice_lines',

    // Supporting data
    'attachments',
    'approvals',
    'audit_events',
    'invoice_status_history',
    'match_results'  // ← Add new tables here in dependency order
  ];
}
```

### 2. `scripts/lib/sync-utils.js`
For special data handling:

#### Enum Value Mappings
```javascript
// Fix enum value mappings for all status fields
if ((colName === 'status' || colName === 'old_status' || colName === 'new_status') && val === 'ready_for_payment') {
  val = 'approved_ready_for_payment';
}
```

#### Array Format Conversions
```javascript
// Handle NOT NULL constraint for gr_numbers_cached
if (colName === 'gr_numbers_cached' && val === '\\N') {
  return `'{}'::text[]`;  // Empty array for PostgreSQL format
}
```

---

## 🔧 Database Functions & Triggers

If you modify any database functions (like `validate_invoice_totals_trigger`):

### Export from Local
```bash
# Single function
pg_dump -h localhost -p 5433 -U postgres -d xelix_invoice_dev \
  --schema-only -t function_name > function.sql

# All functions
pg_dump -h localhost -p 5433 -U postgres -d xelix_invoice_dev \
  --schema-only --function-only > all_functions.sql
```

### Apply to Railway
```bash
psql $RAILWAY_DATABASE_URL < function.sql
```

### Common Functions to Watch
- `validate_invoice_totals_trigger()` - Invoice total calculation
- `fn_match_invoice()` - PO matching logic
- Any custom aggregate or validation functions

---

## ✅ Verification Commands

### Check Schema Differences
```bash
# Compare local vs Railway schemas
DATABASE_URL=$RAILWAY_DATABASE_URL npm run db:validate
```

### Verify Data Sync
```bash
# Preview what would be synced
npm run db:sync:verify

# Dry run (no changes)
npm run db:sync:full:dry
```

### Quick Database Checks
```bash
# Check record counts in Railway
PGPASSWORD=<railway_password> psql -h <railway_host> -p <port> -U postgres -d railway -c "
  SELECT 'invoice_headers' as table_name, COUNT(*) as count FROM invoice_headers
  UNION ALL
  SELECT 'match_results', COUNT(*) FROM match_results
  UNION ALL
  SELECT 'vendors', COUNT(*) FROM vendors
  ORDER BY table_name;
"
```

---

## 🚨 Common Issues & Fixes

### Issue: Enum Value Errors
**Error**: `invalid input value for enum invoice_status: "ready_for_payment"`
**Fix**: Update enum mapping in `sync-utils.js`

### Issue: Array Literal Errors
**Error**: `malformed array literal: "[]"`
**Fix**: Use PostgreSQL format `'{}'::text[]` instead of `'[]'`

### Issue: Invoice Totals Wrong
**Symptom**: Total doesn't include discounts/shipping
**Fix**: Update `validate_invoice_totals_trigger` function in Railway

### Issue: PO Matching Not Working
**Symptom**: Shows "uninvoiced" instead of "matched"
**Fix**: Ensure `match_results` table is synced

---

## 📋 Complete Sync Checklist

When making database changes, follow this order:

1. [ ] Make schema changes locally
2. [ ] Test locally with sample data
3. [ ] Create a backup: `npm run db:backup`
4. [ ] Sync schema: `npm run db:sync:enhanced`
5. [ ] Sync data: `npm run db:sync:full`
6. [ ] Verify: `DATABASE_URL=$RAILWAY_DATABASE_URL npm run db:validate`
7. [ ] Test in production

---

## 🔄 Sync Configuration

The sync system uses `.syncconfig.json`:
```json
{
  "batchSize": 1000,
  "excludeTables": [],
  "syncBehavior": {
    "onConflict": "DO UPDATE",  // Important: not DO NOTHING
    "createBackup": true,
    "requireConfirmation": true
  }
}
```

---

## 💡 Pro Tips

1. **Always backup before major changes**: `npm run db:backup "before major sync"`
2. **Use clean slate for corrupted data**: `npm run db:sync:full:clean`
3. **Sync specific invoices**: `npm run db:sync:full -- --invoices "INV-2025-0001,INV-2025-0002"`
4. **Check sync history**: `npm run db:sync:status`
5. **For production issues**: Always check triggers and functions first!

---

## 📞 Emergency Commands

If something goes wrong:

```bash
# Restore from latest backup
npm run db:restore

# Check what's in Railway
psql $RAILWAY_DATABASE_URL -c "\dt"

# Compare specific table structures
psql $RAILWAY_DATABASE_URL -c "\d invoice_headers" > railway_schema.txt
psql postgresql://postgres:postgres@localhost:5433/xelix_invoice_dev -c "\d invoice_headers" > local_schema.txt
diff local_schema.txt railway_schema.txt

# Check function definitions
psql $RAILWAY_DATABASE_URL -c "\sf validate_invoice_totals_trigger"
```

---

## 🔗 Related Documentation

- `CLAUDE.md` - Main project documentation
- `scripts/lib/schema-mapper.js` - Table sync order configuration
- `scripts/lib/sync-utils.js` - Data transformation logic
- `.syncconfig.json` - Sync behavior settings