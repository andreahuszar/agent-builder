# Database Setup Guide

## Local Development Setup

### Prerequisites
- Docker Desktop installed and running
- Node.js 18+ installed
- npm or yarn package manager

### Quick Start

1. **Start PostgreSQL Database**
   ```bash
   npm run db:dev
   ```
   This starts PostgreSQL in Docker on port 5432.

2. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

3. **Run Database Migrations**
   ```bash
   npm run db:migrate:dev
   ```
   This creates all tables and applies the schema.

4. **Test the Connection**
   Visit: http://localhost:3001/api/test-db
   
   You should see:
   ```json
   {
     "success": true,
     "message": "Database connected successfully!",
     ...
   }
   ```

5. **Open Prisma Studio** (optional)
   ```bash
   npm run db:studio
   ```
   Opens at http://localhost:5555 for visual database management.

### Database Commands

| Command | Description |
|---------|-------------|
| `npm run db:dev` | Start PostgreSQL in Docker |
| `npm run db:down` | Stop PostgreSQL container |
| `npm run db:migrate:dev` | Create and apply migrations (dev) |
| `npm run db:migrate:deploy` | Apply migrations (production) |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run db:push` | Push schema changes without migration |

## Railway Production Setup

### Step 1: Add PostgreSQL to Railway

1. **Open your Railway project dashboard**
2. Click **"New Service"**
3. Select **"Database"** → **"Add PostgreSQL"**
4. Railway will automatically provision a PostgreSQL instance

### Step 2: Connect Database to Your App

1. **In your app service**, go to **Variables** tab
2. Click **"Add Variable Reference"**
3. Select your PostgreSQL service
4. Railway auto-adds these variables:
   - `DATABASE_URL`
   - `PGDATABASE`
   - `PGHOST`
   - `PGPASSWORD`
   - `PGPORT`
   - `PGUSER`

### Step 3: Add Required Environment Variables

In your app's **Variables** tab, add:

```env
# Copy the DATABASE_URL value to DIRECT_URL
DIRECT_URL=${{DATABASE_URL}}

# Set Node environment
NODE_ENV=production

# Your OpenAI key (if using AI features)
OPENAI_API_KEY=your_key_here
```

### Step 4: Update Build & Start Commands

1. Go to **Settings** → **Deploy**

2. Set **Build Command**:
   ```bash
   npm ci && npm run build
   ```

3. Set **Start Command**:
   ```bash
   npx prisma migrate deploy && npm start
   ```

This ensures migrations run automatically before starting the app.

### Step 5: Deploy

1. Push your code to GitHub
2. Railway automatically:
   - Installs dependencies
   - Generates Prisma Client
   - Runs migrations
   - Starts your app

### Step 6: Verify Database Connection

Visit your Railway app URL: `https://your-app.railway.app/api/test-db`

You should see a successful connection response.

## Migration Workflow

### Creating New Migrations

1. **Make schema changes** in `prisma/schema.prisma`

2. **Create migration locally**:
   ```bash
   npm run db:migrate:dev
   ```
   Enter a descriptive name like "add_user_table"

3. **Test locally** to ensure everything works

4. **Commit and push** to GitHub:
   ```bash
   git add .
   git commit -m "Add user table migration"
   git push
   ```

5. **Railway automatically applies** the migration on deploy

### Important Notes

- Migrations are stored in `/prisma/migrations/`
- Always test migrations locally first
- Never edit migration files after they're created
- Use `db:push` for rapid prototyping (dev only)
- Use `db:migrate:dev` for proper migrations

## Troubleshooting

### Local Issues

**Error: "Cannot connect to database"**
- Ensure Docker is running: `docker ps`
- Check if PostgreSQL is up: `npm run db:dev`
- Verify `.env.local` has correct `DATABASE_URL`

**Error: "Prisma Client not generated"**
```bash
npx prisma generate
```

**Error: "Migration failed"**
```bash
# Reset database (WARNING: Deletes all data)
npx prisma migrate reset
```

### Railway Issues

**Error: "Database connection failed in production"**
1. Check Railway logs for details
2. Verify `DATABASE_URL` is set in Variables
3. Ensure `DIRECT_URL` equals `DATABASE_URL`
4. Check if PostgreSQL service is running

**Error: "Migrations not running"**
1. Verify Start Command includes: `npx prisma migrate deploy`
2. Check migration files are committed to git
3. Review Railway build logs

## Database Schema

Current models available:

### TestMigration
- For testing database connectivity
- Safe to use for connection verification

### Invoice
- Production-ready invoice tracking
- Includes vendor, amount, status, dates

### PurchaseOrder
- Purchase order management
- Tracks PO details, items, delivery

### User
- User authentication (future)
- Email, name, role fields

## Best Practices

1. **Always use migrations** in production
2. **Test locally first** before deploying
3. **Backup data** before major schema changes
4. **Use transactions** for complex operations
5. **Index frequently queried fields**
6. **Monitor connection pool** in production

## Support

- [Prisma Documentation](https://www.prisma.io/docs)
- [Railway Documentation](https://docs.railway.app)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)