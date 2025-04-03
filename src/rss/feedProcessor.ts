// src/rss/feedProcessor.ts
import { promises as fs } from 'node:fs';
import { join, dirname } from 'node:path';
import { parse } from 'fast-csv';
import { createReadStream, createWriteStream } from 'node:fs';
import { format as formatCsv } from '@fast-csv/format';
import pLimit from 'p-limit';
import Parser from 'rss-parser';
import { setTimeout as sleep } from 'node:timers/promises';
import CONFIG from '../config.js';
import { ArticleInput } from '../scraper/index.js';

// Define the structure for RSS feed configuration
export interface RssFeedConfig {
  url: string;
  alertName: string;
}

// Define the parser with custom fields
interface CustomFeed {
  feedUrl: string;
  title: string;
  description?: string;
  link?: string;
}

interface CustomItem {
  title: string;
  link: string;
  pubDate?: string;
  content?: string;
  contentSnippet?: string;
  guid?: string;
}

const parser = new Parser<CustomFeed, CustomItem>({
  customFields: {
    item: [
      ['media:content', 'mediaContent'],
      ['content:encoded', 'contentEncoded']
    ]
  }
});

/**
 * Read RSS feed URLs from a CSV file
 */
export async function readRssFeeds(filePath: string): Promise<RssFeedConfig[]> {
  return new Promise((resolve, reject) => {
    const feeds: RssFeedConfig[] = [];
    
    createReadStream(filePath)
      .pipe(parse({ headers: true, trim: true }))
      .on('error', error => reject(error))
      .on('data', (row: any) => {
        feeds.push({
          url: row['Feed URL'] || row['URL'] || '',
          alertName: row['Alert Name'] || row['Name'] || 'Unknown Alert',
        });
      })
      .on('end', () => resolve(feeds));
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
 * Export the processed articles to CSV in the format expected by the analyzer
 */
export async function exportArticlesToCsv(
  articles: ArticleInput[],
  outputPath: string
): Promise<string> {
  try {
    // Ensure output directory exists
    await fs.mkdir(dirname(outputPath), { recursive: true });
    
    return new Promise((resolve, reject) => {
      const writeStream = createWriteStream(outputPath);
      const csvStream = formatCsv({ headers: true });
      
      csvStream.pipe(writeStream);
      
      articles.forEach(article => {
        csvStream.write({
          'Alert Name': article.alertName,
          'Title': article.title,
          'Link': article.link
        });
      });
      
      csvStream.end();
      
      writeStream.on('finish', () => resolve(outputPath));
      writeStream.on('error', reject);
    });
  } catch (error) {
    console.error(`Error writing CSV file ${outputPath}:`, error);
    throw error;
  }
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
  
  // Export to CSV
  const exportedPath = await exportArticlesToCsv(articles, actualOutputPath);
  console.log(`Exported ${articles.length} articles to ${exportedPath}`);
  
  return exportedPath;
}