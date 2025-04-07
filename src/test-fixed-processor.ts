// src/test-fixed-processor.ts
import { processAndExportRssFeeds } from './rss/simplifiedFeedProcessor.js';
import { join } from 'node:path';
import CONFIG from './config.js';

async function main() {
  try {
    console.log('Starting RSS feed processing with fixed CSV writer...');
    
    // Get the feeds file path from config or use a default
    const feedsFilePath = process.argv[2] || CONFIG.rss.feedsFilePath || './rss-feeds.csv';
    
    // Generate output path
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const outputPath = join(CONFIG.inputDir, `processed-feeds-fixed-${timestamp}.csv`);
    
    console.log(`Processing feeds from: ${feedsFilePath}`);
    console.log(`Output will be saved to: ${outputPath}`);
    
    // Process feeds and export to CSV
    const result = await processAndExportRssFeeds(feedsFilePath, outputPath);
    
    console.log(`Successfully processed feeds and exported to: ${result}`);
    console.log('Done!');
  } catch (error) {
    console.error('Error in test script:', error);
    process.exit(1);
  }
}

main().catch(console.error);