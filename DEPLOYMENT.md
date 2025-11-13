# Heroku Deployment Guide

Deploy your RSS Content Analyzer API to Heroku in minutes with PostgreSQL database.

---

## Prerequisites

Before deploying, you need:

1. **Heroku Account** - [Sign up free](https://signup.heroku.com/)
2. **Heroku CLI** - [Download installer](https://devcenter.heroku.com/articles/heroku-cli)
3. **OpenAI API Key** - [Get from OpenAI](https://platform.openai.com/api-keys)
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

# Required: Generate and set JWT secret
heroku config:set JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"

# Required: Set your OpenAI API key
heroku config:set OPENAI_API_KEY="your-openai-api-key-here"

# Required: Set your frontend URL (or use * for development)
heroku config:set FRONTEND_URL="https://your-frontend.com"

# Optional: Set OpenAI model (default: gpt-5-mini)
heroku config:set OPENAI_MODEL="gpt-5-mini"

# Optional: Set monthly cost limit (default: $50)
heroku config:set MONTHLY_COST_LIMIT="50.00"

# Optional: Set log level (default: info)
heroku config:set LOG_LEVEL="info"
```

### 6. Deploy to Heroku

```bash
# Push code to Heroku (deploys automatically)
git push heroku main
```

**What happens during deployment:**
1. Heroku detects Node.js app
2. Installs dependencies (`npm install`)
3. Builds TypeScript code (`npm run build`)
4. Runs database migrations (automatic via Procfile)
5. Starts your API server

### 7. Verify Deployment

```bash
# Check if app is running
heroku open /health

# View logs
heroku logs --tail

# Check database migrations
heroku run node scripts/migrate-built.js status
```

---

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `JWT_SECRET` | Secret for JWT tokens (32+ chars) | Generate with crypto |
| `OPENAI_API_KEY` | OpenAI API key | `sk-proj-...` |
| `FRONTEND_URL` | Your frontend URL for CORS | `https://yourapp.com` |
| `DATABASE_URL` | PostgreSQL connection (auto-set) | Auto-configured by Heroku |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_MODEL` | `gpt-5-mini` | OpenAI model to use |
| `OPENAI_MAX_TOKENS` | `4000` | Max tokens per request |
| `OPENAI_REQUESTS_PER_MINUTE` | `60` | Rate limit for API |
| `MONTHLY_COST_LIMIT` | `50.00` | Monthly spending limit (USD) |
| `LOG_LEVEL` | `info` | Logging level (debug/info/warn/error) |
| `RATE_LIMIT_MAX_REQUESTS` | `10000` | API rate limit (per 15 min) |
| `RATE_LIMIT_JOB_MAX` | `50` | Job creation limit (per min) |

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

# Check environment variables
heroku config

# Verify all required variables are set
```

**Issue: CORS errors from frontend**
```bash
# Update FRONTEND_URL
heroku config:set FRONTEND_URL="https://your-frontend.com"

# For development/testing, allow all origins (NOT recommended for production)
heroku config:set FRONTEND_URL="*"
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
- Basic Dyno: $7/month (never sleeps)
- PostgreSQL Essential-0: $5/month (1GB storage)
- **Total: ~$10-12/month**

**AI API Costs:**
- Based on your usage
- Configure `MONTHLY_COST_LIMIT` to prevent overspending
- Default limit: $50/month

---

## Production Checklist

Before going live:

- [ ] Set strong `JWT_SECRET` (32+ characters)
- [ ] Configure `FRONTEND_URL` to your actual domain
- [ ] Set `NODE_ENV=production`
- [ ] Configure OpenAI API key with billing enabled
- [ ] Set appropriate `MONTHLY_COST_LIMIT`
- [ ] Test health endpoint: `/health`
- [ ] Test authentication: `/api/auth/login`
- [ ] Verify database migrations ran successfully
- [ ] Set up monitoring/alerts
- [ ] Enable Heroku automated backups
- [ ] Document your environment variables

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
