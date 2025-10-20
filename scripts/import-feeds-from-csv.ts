#!/usr/bin/env ts-node
/**
 * Import RSS feeds from CSV file into database
 * Useful for migrating from file-based to database-based storage
 */

import { promises as fs } from 'node:fs';
import { parse } from 'fast-csv';
import { createReadStream } from 'node:fs';
import { bulkImportFeeds } from '../src/services/feedService.js';
import { closePool } from '../src/db/connection.js';

interface CsvRow {
  'Feed URL': string;
  'Alert Name': string;
  'Description'?: string;
}

async function importFeedsFromCsv(csvPath: string, userId: string): Promise<void> {
  console.log(`Importing feeds from ${csvPath} for user ${userId}...\n`);

  const feeds: Array<{ url: string; name: string; description?: string }> = [];

  return new Promise((resolve, reject) => {
    createReadStream(csvPath)
      .pipe(parse({ headers: true, trim: true }))
      .on('error', error => reject(error))
      .on('data', (row: CsvRow) => {
        if (row['Feed URL'] && row['Alert Name']) {
          feeds.push({
            url: row['Feed URL'],
            name: row['Alert Name'],
            description: row['Description'] || undefined,
          });
        }
      })
      .on('end', async () => {
        try {
          console.log(`Found ${feeds.length} feeds in CSV\n`);

          const result = await bulkImportFeeds(userId, feeds);

          console.log('Import complete!');
          console.log(`  ✓ Imported: ${result.imported}`);
          console.log(`  ⋯ Skipped: ${result.skipped} (already exist)`);

          if (result.errors.length > 0) {
            console.log(`  ✗ Errors: ${result.errors.length}`);
            result.errors.forEach(err => console.log(`    ${err}`));
          }

          resolve();
        } catch (error) {
          reject(error);
        }
      });
  });
}

// CLI usage
async function main() {
  const csvPath = process.argv[2];
  const userId = process.argv[3];

  if (!csvPath || !userId) {
    console.log('Usage: npm run import-feeds <csv-path> <user-id>');
    console.log('\nExample:');
    console.log('  npm run import-feeds ./rss-feeds.csv 550e8400-e29b-41d4-a716-446655440000');
    console.log('\nTo get your user ID, login and check the response or query the database:');
    console.log('  psql $DATABASE_URL -c "SELECT id, email FROM users;"');
    process.exit(1);
  }

  try {
    // Check if file exists
    await fs.access(csvPath);

    await importFeedsFromCsv(csvPath, userId);
    await closePool();
    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    await closePool();
    process.exit(1);
  }
}

main();
