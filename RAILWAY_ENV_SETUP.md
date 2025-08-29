# Railway Environment Variables Setup

## Required Environment Variables

You need to set these environment variables in your Railway project:

### 1. DATABASE_URL
This is your PostgreSQL connection string from Railway's PostgreSQL service.

**To get this value:**
1. Go to your Railway project dashboard
2. Click on your PostgreSQL service
3. Go to the "Variables" tab
4. Copy the `DATABASE_PRIVATE_URL` value (since you want to use the private connection)
5. In your Next.js app service (not the database service):
   - Go to Variables tab
   - Add a new variable:
     - Name: `DATABASE_URL`
     - Value: Paste the `DATABASE_PRIVATE_URL` value from your PostgreSQL service

### 2. DIRECT_URL (Optional but recommended)
This is used for migrations and should be the same as DATABASE_URL for Railway.

**To set this:**
- Name: `DIRECT_URL`
- Value: Same as `DATABASE_URL`

### 3. OPENAI_API_KEY (Optional)
If you want OpenAI features in production:
- Name: `OPENAI_API_KEY`
- Value: Your OpenAI API key

## How to Add Environment Variables in Railway

1. Open your Railway project
2. Click on your Next.js application service (not the database)
3. Go to the "Variables" tab
4. Click "New Variable" or "Raw Editor"
5. Add the variables:

```env
DATABASE_URL=${{xelix-postgres.DATABASE_PRIVATE_URL}}
OPENAI_API_KEY=your-openai-api-key-here
ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

**Note:** The `${{xelix-postgres.DATABASE_PRIVATE_URL}}` syntax creates a reference to your PostgreSQL service's private URL.

## Alternative: Using Railway's Reference Variables

Instead of copying values, you can reference your database directly:

1. In your app's Variables tab
2. Click "New Variable"
3. Name: `DATABASE_URL`
4. For the value, type `${{` and Railway will show a dropdown
5. Select your PostgreSQL service → DATABASE_PRIVATE_URL
6. This creates a dynamic reference that updates automatically

## After Setting Variables

Railway will automatically:
1. Detect the new environment variables
2. Trigger a new deployment
3. Run the migrations on start
4. Your app should now connect to the database successfully

## Verify It's Working

Once deployed, visit:
```
https://[your-railway-app-url]/api/test-db
```

You should see a success message with database connection details.