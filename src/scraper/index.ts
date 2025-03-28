import pLimit from 'p-limit';
import { setTimeout as sleep } from 'node:timers/promises';
import { extractArticleContent } from './articleExtractor.js';
import CONFIG from '../config.js';

export interface ArticleInput {
  alertName: string;
  title: string;
  link: string;
}

export interface ArticleOutput extends ArticleInput {
  content: string;
  error?: string;
}

/**
 * Scrapes a single article with retries
 */
export async function scrapeArticle(article: ArticleInput, retryCount = 0): Promise<ArticleOutput> {
  try {
    // Extract content with retry logic built into the extractor
    const content = await extractArticleContent(article.link, {
      retries: CONFIG.scraper.retries,
    });
    
    if (content.error) {
      console.log(`Error extracting content from ${article.link}: ${content.error}`);
    }
    
    return {
      ...article,
      content: content.textContent || '',
      error: content.error
    };
  } catch (error: any) {
    console.error(`Error scraping article ${article.link}:`, error.message);
    
    // Basic retry logic
    if (retryCount < CONFIG.scraper.retries) {
      console.log(`Retrying (${retryCount + 1}/${CONFIG.scraper.retries}): ${article.link}`);
      // Wait before retrying with exponential backoff
      await sleep(Math.pow(2, retryCount) * 1000);
      return scrapeArticle(article, retryCount + 1);
    }
    
    return {
      ...article,
      content: '',
      error: error.message
    };
  }
}

/**
 * Scrapes multiple articles with concurrency control
 */
export async function scrapeArticles(articles: ArticleInput[]): Promise<ArticleOutput[]> {
  console.log(`Starting to scrape ${articles.length} articles...`);
  
  // Create concurrency limiter
  const limit = pLimit(CONFIG.scraper.maxConcurrent);
  
  // Queue all scraping tasks with defined concurrency
  const scrapingPromises = articles.map((article, index) => 
    limit(async () => {
      console.log(`Scraping article ${index + 1}/${articles.length}: ${article.title}`);
      
      // Add delay between requests if configured
      if (index > 0 && CONFIG.scraper.requestDelay > 0) {
        await sleep(CONFIG.scraper.requestDelay);
      }
      
      return scrapeArticle(article);
    })
  );
  
  // Wait for all scraping tasks to complete
  const results = await Promise.all(scrapingPromises);
  
  console.log(`Completed scraping ${results.length} articles`);
  return results;
}