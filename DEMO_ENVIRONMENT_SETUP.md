# Demo Environment Setup Guide

Complete guide for setting up a dedicated demo environment for events and presentations.

## Overview

This guide will help you create a complete duplicate of your production environment, including:
- Separate git branch (`demo-event`)
- Dedicated Railway database (PostgreSQL)
- Dedicated Railway Volume for file storage
- Environment configuration

## Prerequisites

- Railway account with access to the project
- Railway CLI installed (optional, but recommended): `npm install -g @railway/cli`
- Git repository with remote configured
- Production environment already running

---

## Step 1: Create Git Branch

The demo-event branch has already been created locally. If you have a remote repository, push it:

```bash
# Check current branch
git branch

# You should see: * demo-event

# Push to remote (if you have one configured)
git push -u origin demo-event
```

---

## Step 2: Create Demo Database in Railway

### Option A: Using Railway Dashboard (Recommended)

1. **Go to Railway Dashboard**
   - Navigate to [railway.app](https://railway.app)
   - Select your project

2. **Create New PostgreSQL Service**
   - Click **"New"** button
   - Select **"Database"**
   - Choose **"PostgreSQL"**

3. **Configure the Database**
   - Name: `xelix-invoice-demo` (or similar descriptive name)
   - Railway will automatically provision the database

4. **Get Connection Details**
   - Click on the new PostgreSQL service
   - Go to **"Variables"** tab
   - Find `DATABASE_URL` or create a new variable called `DATABASE_PRIVATE_URL`
   - Copy the connection string (format: `postgresql://user:password@host:port/database`)

5. **Add to Local Environment**
   - Open `.env.local` in your project
   - Add the line:
     ```
     DEMO_DATABASE_URL="postgresql://postgres:PASSWORD@HOST.railway.app:PORT/railway"
     ```

### Option B: Using Railway CLI

```bash
# Login to Railway
railway login

# Link to your project
railway link

# Create new PostgreSQL service
railway add --database postgres

# Get the connection string
railway variables

# Copy the DATABASE_URL and add to .env.local as DEMO_DATABASE_URL
```

---

## Step 3: Duplicate Database Data

Once you have `DEMO_DATABASE_URL` in your `.env.local`, run the automated setup script:

### Preview what will be synced (dry-run):
```bash
node scripts/setup-demo-environment.js --dry-run
```

### Full setup (schema + data):
```bash
node scripts/setup-demo-environment.js
```

This script will:
1. ✅ Validate both database connections
2. ✅ Extract schema from production
3. ✅ Create all tables, enums, and indexes in demo database
4. ✅ Copy all data with ID preservation
5. ✅ Maintain foreign key relationships

### Refresh data only (after initial setup):
```bash
node scripts/setup-demo-environment.js --data-only
```

---

## Step 4: Create Railway Volume for File Storage

Railway Volumes provide persistent file storage for uploaded invoices, PDFs, etc.

### Setup in Railway Dashboard:

1. **Create New Service for Demo Files**
   - In Railway Dashboard, click **"New"**
   - Select **"Empty Service"**
   - Name it: `xelix-invoice-demo-files`

2. **Add Volume to Service**
   - Click on the new service
   - Go to **"Volumes"** tab
   - Click **"New Volume"**
   - Configure:
     - **Mount Path**: `/app/uploads` (or wherever your app stores files)
     - **Size**: Start with 1GB, can increase later
   - Click **"Add"**

3. **Copy Files from Production Volume** (Optional)

   If you need to copy existing files from production:

   **Using Railway CLI:**
   ```bash
   # Connect to production service
   railway connect

   # In the shell, tar the uploads directory
   tar -czf /tmp/uploads-backup.tar.gz /app/uploads

   # Exit and download
   railway run "cat /tmp/uploads-backup.tar.gz" > uploads-backup.tar.gz

   # Connect to demo service
   railway connect <demo-service-name>

   # Upload and extract
   railway run "tar -xzf - -C /" < uploads-backup.tar.gz
   ```

   **Alternative - Manual Copy:**

   For small datasets, you can:
   - Download files from production service via SFTP/SCP
   - Upload to demo service
   - This is more manual but simpler for small file counts

---

## Step 5: Configure Demo Environment Variables

In Railway Dashboard, configure the demo service environment variables:

1. **Select your demo service** (web application)
2. **Go to Variables tab**
3. **Add/Update these variables:**

   ```bash
   # Database - Point to demo database
   DATABASE_URL=${{xelix-invoice-demo.DATABASE_PRIVATE_URL}}

   # Railway Database (for sync scripts)
   RAILWAY_DATABASE_URL=${{xelix-invoice-demo.DATABASE_PRIVATE_URL}}

   # AI Services (same as production)
   ANTHROPIC_API_KEY=<your-key>
   OPENAI_API_KEY=<your-key>

   # Mock Data (optional - use more mock data for demos)
   USE_MOCK_DATA=true
   DEBUG_MOCK=false

   # File Storage (if using volumes)
   UPLOAD_DIR=/app/uploads
   ```

---

## Step 6: Deploy Demo Branch to Railway

### Option A: Automatic Deployment (if connected to GitHub)

1. **Connect Branch to Railway**
   - In Railway Dashboard, go to your service
   - Click **"Settings"** tab
   - Find **"Source"** section
   - Click **"Configure"**
   - Select branch: `demo-event`
   - Save changes

2. **Trigger Deployment**
   - Push any commit to `demo-event` branch
   - Railway will automatically deploy

### Option B: Manual Deployment with Railway CLI

```bash
# Switch to demo branch
git checkout demo-event

# Deploy to Railway
railway up
```

---

## Step 7: Verify Demo Environment

After deployment completes:

1. **Check Deployment Status**
   - Railway Dashboard → Service → Deployments
   - Ensure deployment is successful (green checkmark)

2. **Test Database Connection**
   - Navigate to your demo app URL
   - Try accessing `/api/test-db` endpoint
   - Should return database connection success

3. **Verify Data**
   - Log into the demo application
   - Check that invoices, POs, and other data are present
   - Verify file uploads work

4. **Test Application Features**
   - Create test invoice
   - Upload file
   - Verify AI features work
   - Check all critical workflows

---

## Maintenance & Updates

### Refreshing Demo Data

Before a big event, refresh the demo database with latest data:

```bash
# Preview changes
node scripts/setup-demo-environment.js --dry-run

# Full refresh (data only - keeps schema intact)
node scripts/setup-demo-environment.js --data-only
```

### Adding More Mock Data

For demos, you might want extra mock data. Edit your demo branch's mock services:

```bash
# In demo-event branch
# Edit: app/services/mockInvoiceService.ts
# Add more generateMock* functions with demo-specific data
```

### Syncing Specific Data

To sync only specific invoices for a demo scenario:

```bash
# Use the existing full-data-sync script
node scripts/full-data-sync.js \
  --invoices "INV-2025-0001,INV-2025-0002,INV-2025-0003" \
  --truncate --cascade
```

---

## Quick Reference Commands

```bash
# Switch to demo branch
git checkout demo-event

# Setup demo database (first time)
node scripts/setup-demo-environment.js

# Refresh demo data (before events)
node scripts/setup-demo-environment.js --data-only

# Preview sync
node scripts/setup-demo-environment.js --dry-run

# Deploy to Railway
railway up

# Check Railway logs
railway logs

# Connect to demo database
railway connect xelix-invoice-demo
```

---

## Environment Variables Reference

### `.env.local` (Local Development)

```bash
# Local database
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/xelix_invoice_dev

# Production Railway database
RAILWAY_DATABASE_URL=postgresql://postgres:PASSWORD@HOST.railway.app:PORT/railway

# Demo Railway database (NEW)
DEMO_DATABASE_URL=postgresql://postgres:PASSWORD@HOST.railway.app:PORT/railway

# AI Services
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Mock Data
USE_MOCK_DATA=true
DEBUG_MOCK=false
```

### Railway Demo Service Variables

```bash
# Point to demo database
DATABASE_URL=${{xelix-invoice-demo.DATABASE_PRIVATE_URL}}

# For sync scripts
RAILWAY_DATABASE_URL=${{xelix-invoice-demo.DATABASE_PRIVATE_URL}}

# AI Services (same as production)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Mock Data (use more for demos)
USE_MOCK_DATA=true
DEBUG_MOCK=false
```

---

## Troubleshooting

### Issue: Database connection fails

**Solution:**
- Verify `DEMO_DATABASE_URL` is correctly formatted
- Test connection: `node scripts/setup-demo-environment.js --dry-run`
- Check Railway database service is running

### Issue: File uploads don't persist

**Solution:**
- Ensure Railway Volume is mounted correctly
- Check `UPLOAD_DIR` environment variable
- Verify volume mount path matches application config

### Issue: Schema sync fails

**Solution:**
- Run schema-only first: `node scripts/setup-demo-environment.js --schema-only`
- Check for enum conflicts (might need manual DROP TYPE if changing)
- Use `--force` flag to continue on non-critical errors

### Issue: Data sync is slow

**Solution:**
- Use `--tables` flag to sync specific tables
- Consider syncing during off-hours
- Check network connection to Railway

---

## Best Practices

1. **Before Major Events**
   - Refresh demo data 1-2 days before
   - Test all critical workflows
   - Prepare demo scenarios (specific invoices)
   - Document any custom mock data

2. **During Events**
   - Use demo branch exclusively
   - Never modify production from demo environment
   - Keep demo database separate at all times

3. **After Events**
   - Optional: Clear sensitive demo data
   - Document any issues encountered
   - Update mock data based on feedback

4. **Regular Maintenance**
   - Sync demo data monthly to stay current
   - Update demo branch with production features
   - Test demo environment regularly

---

## Support

For issues with:
- **Database Setup**: Check `scripts/setup-demo-environment.js --help`
- **Railway Configuration**: [Railway Docs](https://docs.railway.app)
- **Volume Setup**: [Railway Volumes Guide](https://docs.railway.app/reference/volumes)
- **Deployment**: Check Railway logs via dashboard or `railway logs`

---

**Last Updated**: October 2025
**Related Scripts**:
- `scripts/setup-demo-environment.js` - Main setup script
- `scripts/full-data-sync.js` - Advanced data sync
- `scripts/backup-database.js` - Create backups
