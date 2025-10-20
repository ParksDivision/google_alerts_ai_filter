#!/usr/bin/env ts-node
/**
 * Database migration script
 * Runs SQL migrations from the database/migrations directory
 */

import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { pool, query, closePool } from '../src/db/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MIGRATIONS_DIR = join(__dirname, '../database/migrations');

interface Migration {
  filename: string;
  timestamp: number;
}

/**
 * Create migrations tracking table if it doesn't exist
 */
async function createMigrationsTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✓ Migrations table ready');
}

/**
 * Get list of executed migrations
 */
async function getExecutedMigrations(): Promise<string[]> {
  const result = await query<{ filename: string }>(
    'SELECT filename FROM migrations ORDER BY filename'
  );
  return result.rows.map(row => row.filename);
}

/**
 * Get list of pending migrations
 */
async function getPendingMigrations(): Promise<Migration[]> {
  const files = await fs.readdir(MIGRATIONS_DIR);
  const sqlFiles = files.filter(f => f.endsWith('.sql'));

  const executed = await getExecutedMigrations();

  const pending = sqlFiles
    .filter(f => !executed.includes(f))
    .map(f => ({
      filename: f,
      timestamp: parseInt(f.split('_')[0], 10),
    }))
    .sort((a, b) => a.timestamp - b.timestamp);

  return pending;
}

/**
 * Execute a single migration file
 */
async function executeMigration(migration: Migration): Promise<void> {
  const filepath = join(MIGRATIONS_DIR, migration.filename);
  const sql = await fs.readFile(filepath, 'utf-8');

  console.log(`\nExecuting migration: ${migration.filename}`);

  try {
    // Execute the migration SQL
    await query(sql);

    // Record the migration
    await query(
      'INSERT INTO migrations (filename) VALUES ($1)',
      [migration.filename]
    );

    console.log(`✓ Migration ${migration.filename} completed`);
  } catch (error) {
    console.error(`✗ Migration ${migration.filename} failed:`, error);
    throw error;
  }
}

/**
 * Run all pending migrations
 */
async function runMigrations(): Promise<void> {
  console.log('Starting database migrations...\n');

  try {
    // Test connection
    await query('SELECT 1');
    console.log('✓ Database connection successful');

    // Ensure migrations table exists
    await createMigrationsTable();

    // Get pending migrations
    const pending = await getPendingMigrations();

    if (pending.length === 0) {
      console.log('\n✓ No pending migrations');
      return;
    }

    console.log(`\nFound ${pending.length} pending migration(s):`);
    pending.forEach(m => console.log(`  - ${m.filename}`));

    // Execute each migration
    for (const migration of pending) {
      await executeMigration(migration);
    }

    console.log('\n✓ All migrations completed successfully');
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

/**
 * Show migration status
 */
async function showStatus(): Promise<void> {
  console.log('Database Migration Status\n');

  try {
    await query('SELECT 1');
    console.log('✓ Database connection successful\n');

    await createMigrationsTable();

    const executed = await getExecutedMigrations();
    const pending = await getPendingMigrations();

    console.log(`Executed migrations: ${executed.length}`);
    if (executed.length > 0) {
      executed.forEach(m => console.log(`  ✓ ${m}`));
    }

    console.log(`\nPending migrations: ${pending.length}`);
    if (pending.length > 0) {
      pending.forEach(m => console.log(`  ⋯ ${m.filename}`));
    }

    if (pending.length === 0 && executed.length > 0) {
      console.log('\n✓ Database is up to date');
    }
  } catch (error) {
    console.error('✗ Error checking migration status:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// CLI handling
const command = process.argv[2];

if (command === 'status') {
  showStatus();
} else if (command === 'up' || !command) {
  runMigrations();
} else {
  console.log('Usage:');
  console.log('  npm run migrate       - Run pending migrations');
  console.log('  npm run migrate up    - Run pending migrations');
  console.log('  npm run migrate status - Show migration status');
  process.exit(1);
}
