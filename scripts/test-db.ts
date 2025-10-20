#!/usr/bin/env ts-node
/**
 * Test database connection
 * Simple script to verify database connectivity
 */

import { testConnection, closePool } from '../src/db/connection.js';

async function main() {
  console.log('Testing database connection...\n');

  const connected = await testConnection();

  if (connected) {
    console.log('\n✓ Database connection test passed!');
    process.exit(0);
  } else {
    console.error('\n✗ Database connection test failed!');
    console.error('\nPlease check:');
    console.error('  1. DATABASE_URL is set in .env');
    console.error('  2. PostgreSQL server is running');
    console.error('  3. Database credentials are correct');
    process.exit(1);
  }
}

main();
