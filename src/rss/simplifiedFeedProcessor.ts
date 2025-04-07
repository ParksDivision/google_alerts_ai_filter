// src/rss/simplifiedFeedProcessor.ts
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'fast-csv';
import { createReadStream } from 'node:fs';
import pLimit from 'p-limit';
import Parser from 'rss-parser';
import { setTimeout as sleep } from 'node:timers/promises';
import CONFIG from '../config.js';
import { ArticleInput } from '../scraper/index.js';
import { writeArticlesToCsv } from '../utils/manualCsvWriter.js';

// Define the structure for RSS feed configuration
export interface RssFeedConfig {
  url: string;
  alertName: string;
}

// Create parser for RSS feeds
const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['content:encoded', 'contentEncoded']
    ]
  }
});

/**
 * Read RSS feed URLs from a CSV file with better error handling
 */
export async function readRssFeeds(filePath: string): Promise<RssFeedConfig[]> {
  console.log(`Reading RSS feeds from ${filePath}`);
  
  // Verify the file exists first
  try {
    await fs.access(filePath);
  } catch (error) {
    console.error(`File does not exist or is not accessible: ${filePath}`);
    throw new Error(`Cannot access file: ${filePath}`);
  }
  
  return new Promise((resolve, reject) => {
    const feeds: RssFeedConfig[] = [];
    
    createReadStream(filePath)
      .on('error', (error) => {
        console.error(`Error reading file: ${error.message}`);
        reject(error);
      })
      .pipe(parse({ headers: true, trim: true }))
      .on('error', error => {
        console.error(`Error parsing CSV: ${error.message}`);
        reject(error);
      })
      .on('data', (row: any) => {
        try {
          // Try to handle different column naming conventions
          const feedUrl = row['Feed URL'] || row['URL'] || '';
          const alertName = row['Alert Name'] || row['Name'] || '';
          
          if (feedUrl) {
            feeds.push({
              url: feedUrl,
              alertName: alertName || String(row[Object.keys(row)[1]]) || 'Unknown'
            });
          }
        } catch (error) {
          console.warn('Error processing row:', error);
          // Continue processing other rows
        }
      })
      .on('end', () => {
        console.log(`Successfully read ${feeds.length} feeds from CSV`);
        resolve(feeds);
      });
  });
}

/**
 * Fetch and parse a single RSS feed
 */
export async function fetchRssFeed(feedConfig: RssFeedConfig, retryCount = 0): Promise<ArticleInput[]> {
  try {
    console.log(`Fetching RSS feed: ${feedConfig.url}`);
    const feed = await parser.parseURL(feedConfig.url);
    
    return feed.items.map(item => ({
      alertName: feedConfig.alertName,
      title: item.title || 'Untitled',
      link: item.link || '',
    }));
  } catch (error: any) {
    console.error(`Error fetching RSS feed ${feedConfig.url}:`, error.message);
    
    // Basic retry logic
    if (retryCount < CONFIG.rss.retries) {
      console.log(`Retrying (${retryCount + 1}/${CONFIG.rss.retries}): ${feedConfig.url}`);
      // Wait before retrying with exponential backoff
      await sleep(Math.pow(2, retryCount) * 1000);
      return fetchRssFeed(feedConfig, retryCount + 1);
    }
    
    console.warn(`Failed to fetch RSS feed after ${retryCount} retries: ${feedConfig.url}`);
    return [];
  }
}

/**
 * Process multiple RSS feeds with concurrency control
 */
export async function processRssFeeds(feedsConfig: RssFeedConfig[]): Promise<ArticleInput[]> {
  console.log(`Starting to process ${feedsConfig.length} RSS feeds...`);
  
  // Create concurrency limiter
  const limit = pLimit(CONFIG.rss.maxConcurrent);
  
  // Queue all fetching tasks with defined concurrency
  const fetchPromises = feedsConfig.map((feedConfig, index) => 
    limit(async () => {
      console.log(`Processing feed ${index + 1}/${feedsConfig.length}: ${feedConfig.alertName}`);
      
      // Add delay between requests if configured
      if (index > 0 && CONFIG.rss.requestDelay > 0) {
        await sleep(CONFIG.rss.requestDelay);
      }
      
      return fetchRssFeed(feedConfig);
    })
  );
  
  // Wait for all fetching tasks to complete
  const results = await Promise.all(fetchPromises);
  
  // Flatten the results
  const articles = results.flat();
  
  console.log(`Completed processing ${feedsConfig.length} feeds, found ${articles.length} articles`);
  return articles;
}

/**
 * Main function to process RSS feeds and export to CSV
 */
export async function processAndExportRssFeeds(
  feedsFilePath: string,
  outputPath?: string
): Promise<string> {
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const actualOutputPath = outputPath || join(
    CONFIG.inputDir, 
    `processed-feeds-${timestamp}.csv`
  );
  
  // Ensure input directory exists
  await fs.mkdir(CONFIG.inputDir, { recursive: true });
  
  // Read feed configurations
  const feedsConfig = await readRssFeeds(feedsFilePath);
  console.log(`Read ${feedsConfig.length} RSS feed configurations`);
  
  // Process feeds
  const articles = await processRssFeeds(feedsConfig);
  
  // Export to CSV using our custom writer instead of fast-csv
  const exportedPath = await writeArticlesToCsv(articles, actualOutputPath);
  console.log(`Exported ${articles.length} articles to ${exportedPath}`);
  
  return exportedPath;
}