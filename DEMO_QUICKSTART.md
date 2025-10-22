# Demo Environment - Quick Start 🚀

**TL;DR**: Run `npm run demo:setup` and follow the interactive prompts!

---

## What's Been Set Up For You

✅ **New Git Branch**: `demo-event` (already created and checked out)
✅ **Automated Scripts**: Database duplication and sync tools
✅ **Documentation**: Complete setup guide
✅ **Configuration Templates**: Ready-to-use environment files

---

## Quick Start (3 Steps)

### 1️⃣ Create Demo Database in Railway

Go to [Railway Dashboard](https://railway.app):
- Click **"New"** → **"Database"** → **"PostgreSQL"**
- Name it: `xelix-invoice-demo`
- Copy the `DATABASE_URL` from Variables tab
- Add to `.env.local`:
  ```bash
  DEMO_DATABASE_URL="postgresql://postgres:PASSWORD@HOST.railway.app:PORT/railway"
  ```

### 2️⃣ Run Setup Script

```bash
npm run demo:setup
```

This interactive script will guide you through:
- Verifying your configuration
- Setting up database schema
- Copying data from production
- Configuring file storage
- Deployment options

### 3️⃣ Test It!

```bash
# Test locally
PORT=3001 npm run dev

# Then deploy to Railway (see guide below)
```

---

## Available Commands

### Setup & Sync
```bash
npm run demo:setup          # Interactive setup wizard
npm run demo:sync           # Full database sync (schema + data)
npm run demo:sync:dry       # Preview what would be synced
npm run demo:sync:schema    # Sync schema only
npm run demo:sync:data      # Sync data only
npm run demo:refresh        # Quick data refresh (before events)
```

### Manual Scripts
```bash
node scripts/setup-demo-environment.js --help      # View all options
node scripts/full-data-sync.js --invoices "INV-1"  # Sync specific invoices
```

---

## File Storage Setup (Railway Volumes)

### Quick Steps:
1. Railway Dashboard → **New** → **Empty Service**
2. Name: `xelix-invoice-demo-files`
3. **Volumes** tab → **New Volume**
4. Mount path: `/app/uploads`
5. Size: 1GB

**Need to copy files from production?**
See: [DEMO_ENVIRONMENT_SETUP.md](./DEMO_ENVIRONMENT_SETUP.md#step-4-create-railway-volume-for-file-storage)

---

## Deployment to Railway

### Option A: Automatic (GitHub)
1. Railway Dashboard → Service → **Settings**
2. **Source** → **Configure**
3. Select branch: `demo-event`
4. Set environment variables (see below)
5. Push commits to auto-deploy

### Option B: Manual (CLI)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway up
```

---

## Environment Variables (Railway)

Set these in Railway Dashboard → Service → **Variables**:

```bash
# Database (use reference variable)
DATABASE_URL=${{xelix-invoice-demo.DATABASE_PRIVATE_URL}}

# For sync scripts
RAILWAY_DATABASE_URL=${{xelix-invoice-demo.DATABASE_PRIVATE_URL}}

# AI Services (same as production)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Mock Data (optional)
USE_MOCK_DATA=true

# File Storage
UPLOAD_DIR=/app/uploads
```

**Full list**: See [.env.demo.example](./.env.demo.example)

---

## Before Your Event Checklist

### 1-2 Days Before:
- [ ] Refresh demo database: `npm run demo:refresh`
- [ ] Test all critical workflows
- [ ] Verify demo URL is accessible
- [ ] Check file uploads work
- [ ] Prepare specific demo scenarios

### Day Of:
- [ ] Quick data check
- [ ] Verify all services are running
- [ ] Have backup plan (screenshots/videos)

---

## Troubleshooting

### "DEMO_DATABASE_URL not found"
→ Add it to `.env.local` (step 1 above)

### "Database connection failed"
→ Verify Railway database service is running
→ Check URL format is correct

### "Schema sync errors"
→ Run schema-only first: `npm run demo:sync:schema`
→ Then data: `npm run demo:sync:data`

### "File uploads don't persist"
→ Verify Railway Volume is mounted
→ Check mount path matches `UPLOAD_DIR`

---

## Documentation

📚 **Complete Guide**: [DEMO_ENVIRONMENT_SETUP.md](./DEMO_ENVIRONMENT_SETUP.md)
🔧 **Script Help**: `node scripts/setup-demo-environment.js --help`
⚙️ **Config Template**: [.env.demo.example](./.env.demo.example)

---

## Key Differences: Demo vs Production

| Aspect | Production | Demo |
|--------|-----------|------|
| Branch | `main` | `demo-event` |
| Database | `RAILWAY_DATABASE_URL` | `DEMO_DATABASE_URL` |
| Volume | Production volume | Demo volume |
| Mock Data | Limited | Extensive |
| Env Vars | Production keys | Demo keys |

**Important**: Never mix production and demo environments!

---

## Common Workflows

### Add More Test Data for Demo
```bash
# Option 1: Sync specific invoices
node scripts/full-data-sync.js --invoices "INV-1,INV-2,INV-3"

# Option 2: Edit mock service (demo branch)
# File: app/services/mockInvoiceService.ts
```

### Refresh Demo Before Event
```bash
# Quick data refresh
npm run demo:refresh

# Or full sync
npm run demo:sync
```

### Reset Demo Database (Clean Slate)
```bash
# WARNING: Deletes all data!
node scripts/setup-demo-environment.js
```

---

## Support & Resources

- **Railway Dashboard**: https://railway.app
- **Railway Docs**: https://docs.railway.app
- **Volumes Guide**: https://docs.railway.app/reference/volumes
- **Project Issues**: Check Railway logs via dashboard or `railway logs`

---

## Quick Checklist

- [x] Git branch `demo-event` created
- [ ] Demo database created in Railway
- [ ] `DEMO_DATABASE_URL` added to `.env.local`
- [ ] Database synced: `npm run demo:sync`
- [ ] Railway Volume created for files
- [ ] Environment variables set in Railway
- [ ] Demo branch deployed to Railway
- [ ] All features tested on demo URL
- [ ] Demo data prepared for event

---

**Need help?** See the complete guide: [DEMO_ENVIRONMENT_SETUP.md](./DEMO_ENVIRONMENT_SETUP.md)

**Ready to start?** Run: `npm run demo:setup` 🚀
