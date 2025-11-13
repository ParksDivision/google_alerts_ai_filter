#!/usr/bin/env node
/**
 * Database migration script using built code
 * Run this after building the project
 */

import { config } from 'dotenv';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import pkg from 'pg';
const { Pool } = pkg;

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MIGRATIONS_DIR = join(__dirname, '../database/migrations');

// Create database pool with SSL support for production
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/rss_analyzer',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * Run a query
 */
async function query(sql, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result;
  } finally {
    client.release();
  }
}

/**
 * Create migrations tracking table if it doesn't exist
 */
async function createMigrationsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

/**
 * Get list of executed migrations
 */
async function getExecutedMigrations() {
  const result = await query('SELECT filename FROM migrations ORDER BY id');
  return result.rows.map(row => row.filename);
}

/**
 * Get list of migration files
 */
async function getMigrationFiles() {
  const files = await fs.readdir(MIGRATIONS_DIR);
  return files
    .filter(f => f.endsWith('.sql'))
    .sort()
    .map(filename => ({
      filename,
      timestamp: parseInt(filename.split('_')[0])
    }));
}

/**
 * Run a single migration
 */
async function runMigration(migration) {
  const filepath = join(MIGRATIONS_DIR, migration.filename);
  const sql = await fs.readFile(filepath, 'utf-8');

  console.log(`  Running: ${migration.filename}`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO migrations (filename) VALUES ($1)', [migration.filename]);
    await client.query('COMMIT');
    console.log(`  ✅ Completed: ${migration.filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Run all pending migrations
 */
async function runMigrations() {
  try {
    console.log('🔄 Starting database migrations...\n');

    // Create migrations table
    await createMigrationsTable();

    // Get executed and pending migrations
    const executed = await getExecutedMigrations();
    const allMigrations = await getMigrationFiles();
    const pending = allMigrations.filter(m => !executed.includes(m.filename));

    if (pending.length === 0) {
      console.log('✅ No pending migrations. Database is up to date.\n');
      return;
    }

    console.log(`Found ${pending.length} pending migration(s):\n`);

    // Run each pending migration
    for (const migration of pending) {
      await runMigration(migration);
    }

    console.log(`\n✅ Successfully ran ${pending.length} migration(s)\n`);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

/**
 * Show migration status
 */
async function showStatus() {
  try {
    await createMigrationsTable();

    const executed = await getExecutedMigrations();
    const allMigrations = await getMigrationFiles();

    console.log('\n📊 Migration Status:\n');
    console.log(`Total migrations: ${allMigrations.length}`);
    console.log(`Executed: ${executed.length}`);
    console.log(`Pending: ${allMigrations.length - executed.length}\n`);

    if (executed.length > 0) {
      console.log('Executed migrations:');
      executed.forEach(f => console.log(`  ✅ ${f}`));
    }

    const pending = allMigrations.filter(m => !executed.includes(m.filename));
    if (pending.length > 0) {
      console.log('\nPending migrations:');
      pending.forEach(m => console.log(`  ⏳ ${m.filename}`));
    }

    console.log('');
  } catch (error) {
    console.error('Error checking status:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Main execution
const command = process.argv[2] || 'up';

if (command === 'up') {
  runMigrations();
} else if (command === 'status') {
  showStatus();
} else {
  console.error('Unknown command. Use "up" or "status"');
  process.exit(1);
}
