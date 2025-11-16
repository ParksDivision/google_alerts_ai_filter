# Heroku Deployment Guide

Deploy your RSS Content Analyzer API to Heroku in minutes with PostgreSQL database and Claude AI.

---

## Quick Reference

**What you'll deploy:**
- Node.js/TypeScript backend API
- PostgreSQL database (1GB)
- Claude Haiku 4.5 AI analyzer
- JWT authentication
- Rate limiting & cost controls

**Total time:** ~10 minutes
**Monthly cost:** ~$12-30 (Heroku) + $20-50 (Claude API)

---

## Prerequisites

Before deploying, you need:

1. **Heroku Account** - [Sign up free](https://signup.heroku.com/)
2. **Heroku CLI** - [Download installer](https://devcenter.heroku.com/articles/heroku-cli)
3. **Claude API Key** - [Get from Anthropic Console](https://console.anthropic.com/settings/keys)
4. **Git** - Ensure your code is committed

---

## Quick Deploy (5 Minutes)

### 1. Install Heroku CLI

**Windows:** Download and run the [64-bit installer](https://cli-assets.heroku.com/heroku-x64.exe)

**Mac:** `brew tap heroku/brew && brew install heroku`

**Linux:** `curl https://cli-assets.heroku.com/install.sh | sh`

### 2. Login to Heroku

```bash
heroku login
```

This opens your browser to authenticate.

### 3. Create Your App

```bash
# Navigate to project directory
cd google_alerts_ai_filter

# Create app (use your own unique name)
heroku create your-app-name

# Or let Heroku generate a random name
heroku create
```

### 4. Add PostgreSQL Database

```bash
# Add PostgreSQL addon ($5/month, 1GB storage)
heroku addons:create heroku-postgresql:essential-0
```

This automatically sets `DATABASE_URL` environment variable.

### 5. Set Environment Variables

```bash
# Required: Set production mode
heroku config:set NODE_ENV=production

# Required: Generate and set JWT secret (run this to generate a secure secret)
heroku config:set JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"

# Required: Set your Claude API key
heroku config:set CLAUDE_API_KEY="sk-ant-api03-your-key-here"

# Required: Set your frontend URL (replace with your actual frontend domain)
heroku config:set FRONTEND_URL="https://your-frontend.com"

# Optional: Set Claude model (default: claude-haiku-4.5-20250929)
heroku config:set CLAUDE_MODEL="claude-haiku-4.5-20250929"

# Optional: Set monthly cost limit in USD (default: $20)
heroku config:set MONTHLY_COST_LIMIT="20.00"

# Optional: Set max tokens per request (default: 4096)
heroku config:set CLAUDE_MAX_TOKENS="4096"

# Optional: Set log level (default: info)
heroku config:set LOG_LEVEL="info"
```

### 6. Deploy to Heroku

```bash
# Make sure all changes are committed
git add .
git commit -m "Prepare for Heroku deployment"

# Push code to Heroku (triggers automatic deployment)
git push heroku main
```

**What happens during deployment:**
1. Heroku detects Node.js app from package.json
2. Installs dependencies (`npm install`)
3. Builds TypeScript code (`npm run build` via heroku-postbuild)
4. Runs database migrations automatically (via Procfile release phase)
5. Starts your API server on Heroku-assigned PORT

**Expected output:**
```
-----> Node.js app detected
-----> Installing dependencies
-----> Building
-----> Running migrations
-----> Launching...
       https://your-app.herokuapp.com deployed to Heroku
```

### 7. Verify Deployment

```bash
# Check if app is running (should return {"success":true,"status":"healthy"})
heroku open /health

# Or use curl
curl https://your-app-name.herokuapp.com/health

# View real-time logs to check for errors
heroku logs --tail

# Verify database migrations completed successfully
heroku run node scripts/migrate-built.js status
```

**Expected health response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-01-16T12:00:00.000Z",
  "database": "connected"
}
```

**If health check fails:**
1. Check logs: `heroku logs --tail`
2. Verify all required env vars are set: `heroku config`
3. Check database is provisioned: `heroku pg:info`
4. Restart the app: `heroku restart`

---

## Common Deployment Issues

### Issue 1: Missing Required Environment Variables
**Symptoms:** App crashes immediately after deployment

**Solution:**
```bash
# Check which variables are set
heroku config

# Set missing required variables (see section 5 above)
heroku config:set CLAUDE_API_KEY="your-key"
heroku config:set JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
heroku config:set FRONTEND_URL="https://your-frontend.com"
```

### Issue 2: Build Fails During TypeScript Compilation
**Symptoms:** Deployment fails with "tsc: command not found" or TypeScript errors

**Solution:**
```bash
# Test build locally first
npm run build

# If local build succeeds but Heroku fails, ensure package.json has correct scripts
# Check that devDependencies include typescript and all @types packages
```

### Issue 3: Database Migrations Not Running
**Symptoms:** Tables don't exist, app crashes with "relation does not exist" errors

**Solution:**
```bash
# Check migration status
heroku run node scripts/migrate-built.js status

# Run migrations manually
heroku run node scripts/migrate-built.js up

# Restart app
heroku restart
```

### Issue 4: Wrong Branch Pushed to Heroku
**Symptoms:** Old code is deployed

**Solution:**
```bash
# If you're not on main branch, push your current branch to Heroku's main
git push heroku your-branch-name:main

# Or checkout main first
git checkout main
git push heroku main
```

---

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `JWT_SECRET` | Secret for JWT tokens (32+ hex chars) | `a1b2c3d4e5f6...` (64 chars) |
| `CLAUDE_API_KEY` | Anthropic Claude API key | `sk-ant-api03-...` |
| `FRONTEND_URL` | Your frontend URL for CORS | `https://yourapp.com` |
| `DATABASE_URL` | PostgreSQL connection string | Auto-configured by Heroku |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CLAUDE_MODEL` | `claude-haiku-4.5-20250929` | Claude model (haiku-4.5, sonnet-4.5, opus-4.5) |
| `CLAUDE_MAX_TOKENS` | `4096` | Max tokens per request |
| `CLAUDE_REQUESTS_PER_MINUTE` | `50` | Rate limit for Claude API |
| `MONTHLY_COST_LIMIT` | `20.00` | Monthly spending limit in USD |
| `LOG_LEVEL` | `info` | Logging level (debug/info/warn/error) |
| `API_PORT` | `3001` | API server port (Heroku overrides with PORT) |
| `RATE_LIMIT_MAX_REQUESTS` | `10000` | API rate limit per 15 minutes |
| `RATE_LIMIT_JOB_MAX` | `50` | Job creation limit per minute |

### Alternative: OpenAI (Optional Fallback)

If you want to use OpenAI as a fallback, you can also set:

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | None | OpenAI API key (used if Claude key not available) |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model to use |
| `OPENAI_MAX_TOKENS` | `1000` | Max tokens per OpenAI request |
| `OPENAI_REQUESTS_PER_MINUTE` | `3` | OpenAI rate limit (adjust per your tier) |
| `OPENAI_MAX_CONCURRENT` | `1` | Max concurrent OpenAI requests |

---

## Database Management

### View Database Info

```bash
# Get database credentials
heroku pg:credentials:url

# View database info
heroku pg:info
```

### Run Migrations Manually

```bash
# Check migration status
heroku run node scripts/migrate-built.js status

# Run pending migrations (if needed)
heroku run node scripts/migrate-built.js up
```

### Connect to Database

```bash
# Open psql console
heroku pg:psql

# View tables
\dt

# Exit
\q
```

### Backup Database

```bash
# Create backup
heroku pg:backups:capture

# Download latest backup
heroku pg:backups:download
```

---

## Monitoring & Logs

### View Logs

```bash
# View recent logs
heroku logs

# Follow logs in real-time
heroku logs --tail

# Filter by source
heroku logs --source app

# View specific number of lines
heroku logs -n 500
```

### Monitor Application

```bash
# View dyno status
heroku ps

# View app info
heroku info

# Restart app
heroku restart
```

### Check Health

```bash
# Health check endpoint
curl https://your-app.herokuapp.com/health

# Expected response:
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-01-10T12:00:00.000Z",
  "database": "connected"
}
```

---

## Updating Your App

### Deploy New Changes

```bash
# Commit your changes
git add .
git commit -m "Your update message"

# Push to Heroku
git push heroku main
```

### Update Environment Variables

```bash
# Set a variable
heroku config:set VARIABLE_NAME="value"

# View all variables
heroku config

# Remove a variable
heroku config:unset VARIABLE_NAME
```

---

## Troubleshooting

### Check Build Logs

```bash
heroku logs --tail --source app
```

### Common Issues

**Issue: Build fails with TypeScript errors**
```bash
# Run build locally first
npm run build

# Fix any TypeScript errors, then redeploy
git push heroku main
```

**Issue: Database connection fails**
```bash
# Verify DATABASE_URL is set
heroku config:get DATABASE_URL

# Check database status
heroku pg:info

# Restart app
heroku restart
```

**Issue: Migrations not running**
```bash
# Check migration status
heroku run node scripts/migrate-built.js status

# Run migrations manually
heroku run node scripts/migrate-built.js up

# Restart app
heroku restart
```

**Issue: Application crashes on startup**
```bash
# View crash logs
heroku logs --tail

# Check environment variables are set
heroku config

# Verify required variables (NODE_ENV, JWT_SECRET, CLAUDE_API_KEY, FRONTEND_URL, DATABASE_URL)
# Missing variables will cause startup failure
```

**Issue: CORS errors from frontend**
```bash
# Update FRONTEND_URL to match your frontend domain
heroku config:set FRONTEND_URL="https://your-frontend.com"

# For development/testing only, allow all origins (NOT for production)
heroku config:set FRONTEND_URL="*"
```

**Issue: Claude API errors (401 Unauthorized)**
```bash
# Verify API key is set correctly
heroku config:get CLAUDE_API_KEY

# Update with correct key from https://console.anthropic.com/settings/keys
heroku config:set CLAUDE_API_KEY="sk-ant-api03-your-key-here"

# Restart app
heroku restart
```

**Issue: Monthly cost limit reached**
```bash
# Check current usage (view cost tracking in logs)
heroku logs --tail | grep "cost"

# Increase limit if needed
heroku config:set MONTHLY_COST_LIMIT="50.00"

# Or wait until next month (tracking resets monthly)
```

---

## Scaling & Performance

### Scale Dynos

```bash
# View current dyno setup
heroku ps

# Scale to multiple dynos (costs more)
heroku ps:scale web=2

# Scale back to one
heroku ps:scale web=1
```

### Upgrade Database

```bash
# View current plan
heroku pg:info

# Upgrade to larger plan
heroku addons:upgrade heroku-postgresql:standard-0
```

---

## Cost Estimate

**Heroku Costs:**
- Eco Dyno: $5/month (shared, sleeps after 30 min inactivity)
- Basic Dyno: $7/month (never sleeps, recommended)
- PostgreSQL Essential-0: $5/month (1GB storage, 20 connections)
- **Total: ~$10-12/month**

**Claude API Costs (as of 2025):**
- Claude Haiku 4.5: ~$0.80 per 1M input tokens, ~$4.00 per 1M output tokens
- Estimated cost: ~$0.01-0.05 per article analyzed (varies by content length)
- Configure `MONTHLY_COST_LIMIT` to prevent overspending
- Default limit: $20/month
- Example: $20 can analyze ~400-2000 articles per month

---

## Production Checklist

Before going live, verify:

- [ ] `JWT_SECRET` is set (64 character hex string from crypto.randomBytes)
- [ ] `CLAUDE_API_KEY` is set with valid API key from Anthropic Console
- [ ] `FRONTEND_URL` is set to your actual frontend domain
- [ ] `NODE_ENV=production` is set
- [ ] `DATABASE_URL` is auto-configured by Heroku PostgreSQL addon
- [ ] `MONTHLY_COST_LIMIT` is set appropriately (default: $20)
- [ ] Database migrations ran successfully (`heroku run node scripts/migrate-built.js status`)
- [ ] Health endpoint works: `curl https://your-app.herokuapp.com/health`
- [ ] Can register user: `POST /api/auth/register`
- [ ] Can login: `POST /api/auth/login`
- [ ] Frontend can connect to backend without CORS errors
- [ ] Enable Heroku automated database backups
- [ ] Monitor logs for first 24 hours after deployment

---

## API Endpoints

Once deployed, your API will be available at:

```
https://your-app.herokuapp.com/api
```

### Core Endpoints

- `GET /health` - Health check
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/feeds` - List RSS feeds
- `POST /api/feeds` - Create RSS feed
- `POST /api/jobs` - Create analysis job
- `GET /api/jobs` - List jobs
- `GET /api/jobs/:id` - Get job details
- `GET /api/jobs/:id/results` - Get analysis results

### Authentication

All API endpoints (except `/health` and auth endpoints) require JWT token:

```bash
# Login to get token
curl -X POST https://your-app.herokuapp.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Use token in requests
curl https://your-app.herokuapp.com/api/feeds \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Support

- **Heroku Docs:** https://devcenter.heroku.com/
- **PostgreSQL Addon:** https://devcenter.heroku.com/articles/heroku-postgresql
- **Heroku CLI:** https://devcenter.heroku.com/articles/heroku-cli

---

## Alternative: Render.com

If you prefer Render over Heroku:

1. Sign up at [render.com](https://render.com)
2. Create PostgreSQL database
3. Create Web Service from Git repo
4. Set build command: `npm run build`
5. Set start command: `npm start`
6. Add environment variables
7. Deploy

Render offers similar features with a free tier.
