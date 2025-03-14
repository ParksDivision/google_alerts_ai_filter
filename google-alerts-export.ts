import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { XMLParser } from 'fast-xml-parser';
import { createObjectCsvWriter } from 'csv-writer';
import dotenv from 'dotenv';

dotenv.config();

interface AlertItem {
  title: string;
  link: string;
  alertName: string;
}

// Configuration
const CONFIG = {
  // Maximum number of concurrent requests to prevent rate limiting
  maxConcurrent: 5,
  // Timeout for requests in milliseconds
  requestTimeout: 10000,
  // Output directory for CSV files
  outputDir: './output',
  // Rate limiting: milliseconds between requests
  requestDelay: 1000,
};

// Create output directory if it doesn't exist
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

// Load Google Alert RSS feed URLs from .env file or specify them directly
// Each alert should be in format: ALERT_1=https://www.google.com/alerts/feeds/...
const alertFeeds: { name: string; url: string }[] = [];

// Load from environment variables
Object.keys(process.env).forEach((key) => {
  if (key.startsWith('ALERT_')) {
    const url = process.env[key];
    if (url) {
      alertFeeds.push({
        name: key.replace('ALERT_', ''),
        url,
      });
    }
  }
});

// If no alerts found in environment variables, you can add them manually
if (alertFeeds.length === 0) {
  console.log('No alert feeds found in environment variables. Please add them to .env file or directly in the script.');
}

/**
 * Fetches and parses a Google Alert RSS feed
 */
async function fetchAlertFeed(feed: { name: string; url: string }): Promise<AlertItem[]> {
  try {
    console.log(`Fetching alerts for: ${feed.name}`);
    
    const response = await axios.get(feed.url, {
      timeout: CONFIG.requestTimeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });
    
    // Parse XML with specific options for Google Alerts format
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
      textNodeName: "#text",
      isArray: (name) => name === "entry",
    });
    
    const result = parser.parse(response.data);
    const entries = result.feed?.entry || [];
    
    return entries.map((entry: any) => {
      // Extract title - handle the "type" attribute in title
      let title = '';
      if (typeof entry.title === 'string') {
        title = entry.title;
      } else if (entry.title && typeof entry.title === 'object') {
        // Google Alerts has title with attribute "type" and content in #text
        title = entry.title["#text"] || '';
      }
      
      // Clean up the title - decode HTML entities
      title = title.replace(/&amp;/g, '&')
                   .replace(/&lt;/g, '<')
                   .replace(/&gt;/g, '>')
                   .replace(/&quot;/g, '"')
                   .replace(/&nbsp;/g, ' ');
      
      // Extract link - Google Alerts uses "href" attribute
      let link = '';
      if (entry.link && typeof entry.link === 'object') {
        link = entry.link.href || '';
      }
      
      // Extract the actual URL from Google's redirect URL
      let actualUrl = '';
      if (link.includes('google.com/url')) {
        try {
          const urlObj = new URL(link);
          const urlParam = urlObj.searchParams.get('url');
          if (urlParam) {
            // Just get the actual URL part without any tracking parameters
            actualUrl = urlParam.split('&')[0];
          } else {
            actualUrl = link;
          }
        } catch (e: any) {
          console.log(`Error extracting URL: ${e.message}`);
          actualUrl = link;
        }
      } else {
        actualUrl = link;
      }
      
      return {
        title: title.trim(),
        link: actualUrl,
        alertName: feed.name
      };
    });
  } catch (error: any) {
    console.error(`Error fetching feed ${feed.name}:`, error);
    return [];
  }
}

/**
 * Writes alert items to a CSV file
 */
async function writeToCSV(items: AlertItem[], filename: string): Promise<void> {
  const outputPath = path.join(CONFIG.outputDir, filename);
  
  const csvWriter = createObjectCsvWriter({
    path: outputPath,
    header: [
      { id: 'alertName', title: 'Alert Name' },
      { id: 'title', title: 'Title' },
      { id: 'link', title: 'Link' }
    ],
  });
  
  await csvWriter.writeRecords(items);
  console.log(`CSV file created: ${filename}`);
}

/**
 * Alternative to p-limit that handles concurrency
 */
function createLimiter(concurrency: number) {
  const queue: Array<() => void> = [];
  let activeCount = 0;

  const next = () => {
    activeCount--;
    if (queue.length > 0) {
      queue.shift()!();
    }
  };

  return async <T>(fn: () => Promise<T>): Promise<T> => {
    return new Promise<T>((resolve) => {
      const run = async () => {
        activeCount++;
        try {
          const result = await fn();
          resolve(result);
        } finally {
          next();
        }
      };

      if (activeCount < concurrency) {
        run();
      } else {
        queue.push(run);
      }
    });
  };
}

/**
 * Main function to export Google Alerts to CSV
 */
async function exportAlertsToCSV() {
  try {
    console.log(`Starting export of ${alertFeeds.length} Google Alerts...`);
    
    // Use our limiter for concurrency control
    const limit = createLimiter(CONFIG.maxConcurrent);
    
    // Create promises for each feed fetch with rate limiting
    const fetchPromises = alertFeeds.map((feed, index) => 
      limit(async () => {
        // Add delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, index * CONFIG.requestDelay));
        return fetchAlertFeed(feed);
      })
    );
    
    // Wait for all fetches to complete
    const allAlertItems = await Promise.all(fetchPromises);
    
    // Flatten the array of arrays
    const flattenedItems = allAlertItems.flat();
    
    if (flattenedItems.length === 0) {
      console.log('No alert items found.');
      return;
    }
    
    console.log(`Found ${flattenedItems.length} alerts.`);
    
    // Generate timestamp for filename
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = `google-alerts-export-${timestamp}.csv`;
    
    // Write to CSV
    await writeToCSV(flattenedItems, filename);
    
    console.log(`Export completed. Total alerts: ${flattenedItems.length}`);
    console.log(`Output file: ${path.join(CONFIG.outputDir, filename)}`);
  } catch (error: any) {
    console.error('Error in export process:', error);
  }
}

// Execute the export
exportAlertsToCSV();