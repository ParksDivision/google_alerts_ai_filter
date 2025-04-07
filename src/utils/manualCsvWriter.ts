// src/utils/manualCsvWriter.ts
import { promises as fs } from 'node:fs';
import { dirname } from 'node:path';
import { ArticleInput, ArticleOutput } from '../scraper/index.js';
import { AnalyzedArticle } from '../analysis/index.js';

/**
 * Escape CSV field to handle commas, quotes, and newlines
 */
function escapeCsvField(field: any): string {
  if (field === null || field === undefined) {
    return '';
  }
  
  // Convert to string
  let value: string;
  
  if (typeof field === 'object') {
    try {
      // For dates
      if (field instanceof Date) {
        value = field.toISOString();
      } else {
        // For other objects, convert to JSON
        value = JSON.stringify(field);
      }
    } catch (e) {
      value = '[Object]';
    }
  } else {
    value = String(field);
  }
  
  // Escape double quotes by doubling them
  value = value.replace(/"/g, '""');
  
  // If the field contains commas, newlines, or quotes, wrap in quotes
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value}"`;
  }
  
  return value;
}

/**
 * Convert row object to CSV line
 */
function rowToCsvLine(row: Record<string, any>, headers: string[]): string {
  return headers.map(header => escapeCsvField(row[header])).join(',');
}

/**
 * Manually write data to CSV file
 */
export async function writeToCSV(
  data: Record<string, any>[],
  headers: string[],
  outputPath: string
): Promise<string> {
  try {
    // Ensure output directory exists
    await fs.mkdir(dirname(outputPath), { recursive: true });
    
    // Generate CSV content
    const headerLine = headers.join(',');
    
    // Process data rows with error handling for each row
    const rows: string[] = [];
    rows.push(headerLine);
    
    data.forEach((item, index) => {
      try {
        const line = rowToCsvLine(item, headers);
        rows.push(line);
      } catch (error) {
        console.error(`Error processing row ${index}:`, error);
        // Add a placeholder row instead of failing entirely
        const errorRow = headers.map(h => h === 'Error' ? 'Error processing row' : '').join(',');
        rows.push(errorRow);
      }
    });
    
    // Write to file
    await fs.writeFile(outputPath, rows.join('\n'), 'utf8');
    console.log(`Successfully wrote ${data.length} rows to ${outputPath}`);
    
    return outputPath;
  } catch (error) {
    console.error(`Error writing CSV file ${outputPath}:`, error);
    throw error;
  }
}

/**
 * Write RSS feed articles to CSV
 */
export async function writeArticlesToCsv(
  articles: ArticleInput[],
  outputPath: string
): Promise<string> {
  const headers = ['Alert Name', 'Title', 'Link'];
  
  const data = articles.map(article => ({
    'Alert Name': article.alertName,
    'Title': article.title,
    'Link': article.link
  }));
  
  return writeToCSV(data, headers, outputPath);
}

/**
 * Write scraped articles to CSV
 */
export async function writeScrapedArticlesToCsv(
  articles: ArticleOutput[],
  outputPath: string
): Promise<string> {
  const headers = ['Alert Name', 'Title', 'Link', 'Content', 'Error'];
  
  const data = articles.map(article => ({
    'Alert Name': article.alertName,
    'Title': article.title,
    'Link': article.link,
    'Content': article.content,
    'Error': article.error || ''
  }));
  
  return writeToCSV(data, headers, outputPath);
}

/**
 * Write analyzed articles to CSV
 */
export async function writeAnalyzedArticlesToCsv(
  articles: AnalyzedArticle[],
  outputPath: string
): Promise<string> {
  const headers = ['Relevance Score', 'Alert Name', 'Title', 'Link', 'Relevance Explanation', 'Content', 'Error'];
  
  const data = articles.map(article => ({
    'Relevance Score': article.relevanceScore,
    'Alert Name': article.alertName,
    'Title': article.title,
    'Link': article.link,
    'Relevance Explanation': article.relevanceExplanation,
    'Content': article.content,
    'Error': article.error || ''
  }));
  
  return writeToCSV(data, headers, outputPath);
}