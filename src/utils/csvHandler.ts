// src/utils/csvHandler.ts
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { parse } from 'fast-csv';
import { createReadStream } from 'node:fs';
import { format as formatCsv } from '@fast-csv/format';
import { createWriteStream } from 'node:fs';
import { ArticleInput, ArticleOutput } from '../scraper/index.js';
import { AnalyzedArticle } from '../analysis/index.js';

/**
 * Read article links from CSV (basic format for initial scraping)
 */
export async function readArticleLinks(filePath: string): Promise<ArticleInput[]> {
  return new Promise((resolve, reject) => {
    const articles: ArticleInput[] = [];
    
    createReadStream(filePath)
      .pipe(parse({ headers: true, trim: true }))
      .on('error', error => reject(error))
      .on('data', (row: any) => {
        articles.push({
          alertName: row['Alert Name'] || '',
          title: row['Title'] || '',
          link: row['Link'] || '',
        });
      })
      .on('end', () => resolve(articles));
  });
}

/**
 * Read previously scraped articles from CSV (including content)
 */
export async function readScrapedArticles(filePath: string): Promise<ArticleOutput[]> {
  return new Promise((resolve, reject) => {
    const articles: ArticleOutput[] = [];
    
    createReadStream(filePath)
      .pipe(parse({ headers: true, trim: true }))
      .on('error', error => reject(error))
      .on('data', (row: any) => {
        articles.push({
          alertName: row['Alert Name'] || '',
          title: row['Title'] || '',
          link: row['Link'] || '',
          content: row['Content'] || '',
          error: row['Error'] || undefined
        });
      })
      .on('end', () => resolve(articles));
  });
}

/**
 * Ensure CSV-safe values by converting objects to strings
 */
function ensureCsvSafeValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  if (typeof value === 'object') {
    // Convert objects to JSON strings
    return JSON.stringify(value);
  }
  
  // Convert all other types to string
  return String(value);
}

/**
 * Write scraped articles to CSV
 */
export async function writeScrapedArticles(
  articles: (ArticleInput & { content: string; error?: string })[],
  outputPath: string
): Promise<string> {
  try {
    // Ensure output directory exists
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });
    
    return new Promise((resolve, reject) => {
      const writeStream = createWriteStream(outputPath);
      const csvStream = formatCsv({ headers: true });
      
      csvStream.pipe(writeStream);
      
      articles.forEach(article => {
        csvStream.write({
          'Alert Name': ensureCsvSafeValue(article.alertName),
          'Title': ensureCsvSafeValue(article.title),
          'Link': ensureCsvSafeValue(article.link),
          'Content': ensureCsvSafeValue(article.content),
          'Error': ensureCsvSafeValue(article.error || '')
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
 * Write analyzed articles to CSV
 */
export async function writeAnalyzedArticles(
  articles: AnalyzedArticle[],
  outputPath: string
): Promise<string> {
  try {
    // Ensure output directory exists
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });
    
    return new Promise((resolve, reject) => {
      const writeStream = createWriteStream(outputPath);
      const csvStream = formatCsv({ headers: true });
      
      csvStream.pipe(writeStream);
      
      articles.forEach(article => {
        csvStream.write({
          'Relevance Score': ensureCsvSafeValue(article.relevanceScore),
          'Alert Name': ensureCsvSafeValue(article.alertName),
          'Title': ensureCsvSafeValue(article.title),
          'Link': ensureCsvSafeValue(article.link),
          'Relevance Explanation': ensureCsvSafeValue(article.relevanceExplanation),
          'Content': ensureCsvSafeValue(article.content),
          'Error': ensureCsvSafeValue(article.error || '')
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