# Database Setup Guide

This directory contains the database schema and migrations for the RSS Content Analyzer.

## Prerequisites

- PostgreSQL 12 or higher installed
- Node.js 18+ and npm

## Quick Start

### 1. Install PostgreSQL

**macOS (using Homebrew):**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Download and install from [postgresql.org](https://www.postgresql.org/download/windows/)

### 2. Create Database

```bash
# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE rss_analyzer;

# Create user (optional, if not using default postgres user)
CREATE USER rss_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE rss_analyzer TO rss_user;

# Exit psql
\q
```

### 3. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and set your DATABASE_URL
# Example: postgresql://postgres:password@localhost:5432/rss_analyzer
```

### 4. Test Database Connection

```bash
npm run db:test
```

You should see:
```
✓ Database connection successful
✓ Database connection test passed!
```

### 5. Run Migrations

```bash
# Check migration status
npm run migrate:status

# Run pending migrations
npm run migrate
```

## Database Commands

```bash
# Run migrations
npm run migrate

# Check migration status
npm run migrate:status

# Test database connection
npm run db:test
```

## Using Alternative Database Services

Instead of local PostgreSQL, you can use managed database services:

### Railway

1. Create a new project at [railway.app](https://railway.app)
2. Add a PostgreSQL database
3. Copy the `DATABASE_URL` from the connection details
4. Update your `.env` file with the Railway database URL

### Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > Database
3. Copy the connection string (use "Connection Pooling" URL for production)
4. Update your `.env` file

### Neon

1. Create a new project at [neon.tech](https://neon.tech)
2. Copy the connection string
3. Update your `.env` file

### Render

1. Create a new PostgreSQL database at [render.com](https://render.com)
2. Copy the "Internal Database URL" for your application
3. Update your `.env` file

## Schema Overview

The database schema includes:

- **users** - User accounts
- **rss_feeds** - RSS feed sources
- **analysis_prompts** - Custom AI analysis prompts
- **analysis_jobs** - Analysis job execution records
- **analyzed_articles** - Individual article analysis results
- **api_tokens** - API authentication tokens

See [schema.sql](schema.sql) for the complete schema definition.

## Manual Schema Setup (Alternative)

If you prefer to set up the schema manually instead of using migrations:

```bash
# Connect to your database
psql postgresql://postgres:password@localhost:5432/rss_analyzer

# Run the schema file
\i database/schema.sql

# Exit
\q
```

## Troubleshooting

### Connection Issues

**Error: `ECONNREFUSED`**
- Ensure PostgreSQL is running: `brew services list` (macOS) or `sudo systemctl status postgresql` (Linux)
- Check that the port (default 5432) is correct

**Error: `authentication failed`**
- Verify your username and password in DATABASE_URL
- Check PostgreSQL authentication settings in `pg_hba.conf`

**Error: `database does not exist`**
- Create the database first (see step 2 above)

### Migration Issues

**Error: `relation already exists`**
- The migration may have been partially applied
- Check the migrations table: `SELECT * FROM migrations;`
- You may need to manually clean up and re-run

### Permission Issues

**Error: `permission denied`**
- Ensure the database user has proper permissions
- Grant all privileges: `GRANT ALL PRIVILEGES ON DATABASE rss_analyzer TO your_user;`

## Backup and Restore

### Create Backup

```bash
pg_dump -U postgres -d rss_analyzer -F c -f backup.dump
```

### Restore Backup

```bash
pg_restore -U postgres -d rss_analyzer -F c backup.dump
```

## Development Tips

1. **Use a GUI tool** for easier database management:
   - [pgAdmin](https://www.pgadmin.org/) (free, cross-platform)
   - [Postico](https://eggerapps.at/postico/) (macOS only)
   - [TablePlus](https://tableplus.com/) (cross-platform)

2. **Enable query logging** during development:
   Set `NODE_ENV=development` in `.env` to see all SQL queries

3. **Reset database** if needed:
   ```bash
   psql postgres
   DROP DATABASE rss_analyzer;
   CREATE DATABASE rss_analyzer;
   \q
   npm run migrate
   ```

## Security Notes

- Never commit `.env` file with real credentials
- Use strong passwords for database users
- In production, use SSL/TLS connections
- Regularly backup your database
- Use connection pooling for better performance
- Set appropriate `max` pool size based on your load

## Next Steps

After setting up the database:

1. Run migrations: `npm run migrate`
2. Continue with Phase 2: Authentication System
3. See [IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md) for the full roadmap
