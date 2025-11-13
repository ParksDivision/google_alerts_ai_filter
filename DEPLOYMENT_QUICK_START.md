# Quick Start: Deploy to Heroku

## One-Time Setup (5 minutes)

### 1. Install & Login
```bash
# Install Heroku CLI (Windows)
# Download: https://cli-assets.heroku.com/heroku-x64.exe

# Login
heroku login
```

### 2. Create App & Database
```bash
# Create app
heroku create your-app-name

# Add PostgreSQL
heroku addons:create heroku-postgresql:essential-0
```

### 3. Set Environment Variables
```bash
# Production mode
heroku config:set NODE_ENV=production

# JWT Secret
heroku config:set JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"

# OpenAI API Key (REQUIRED)
heroku config:set OPENAI_API_KEY="sk-proj-YOUR-KEY-HERE"

# Frontend URL (REQUIRED)
heroku config:set FRONTEND_URL="https://your-frontend.com"
```

### 4. Deploy
```bash
git push heroku main
```

### 5. Verify
```bash
# Check health
heroku open /health

# View logs
heroku logs --tail
```

## Future Updates

```bash
git add .
git commit -m "Update message"
git push heroku main
```

## Quick Commands

```bash
# View logs
heroku logs --tail

# Restart app
heroku restart

# Check database
heroku pg:info

# Run migrations
heroku run node scripts/migrate-built.js status

# Open app
heroku open
```

## Need Help?

See full guide: [DEPLOYMENT.md](./DEPLOYMENT.md)
