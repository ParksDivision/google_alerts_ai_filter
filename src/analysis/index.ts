// src/analysis/index.ts
import { getCostInformation } from './claudeClient.js';
import { analyzeArticlesBatch, AnalyzedArticle } from './relevanceAnalyzer.js';
import { ArticleOutput } from '../scraper/index.js';
import { deduplicateScrapedArticles } from '../utils/deduplicationUtils.js';
import CONFIG from '../config.js';

/**
 * Analyzes content based on provided criteria and returns sorted results
 */
export async function analyzeContent(
  articles: ArticleOutput[],
  criteria: string
): Promise<AnalyzedArticle[]> {
  console.log(`Starting with ${articles.length} total articles`);
  
  // Debug the current state of articles
  const emptyContent = articles.filter(a => !a.content || a.content.trim().length === 0).length;
  const withErrors = articles.filter(a => a.error).length;
  
  console.log(`Articles with empty content: ${emptyContent}`);
  console.log(`Articles with errors: ${withErrors}`);
  
  // Ensure we're working with deduplicated articles
  const uniqueArticles = deduplicateScrapedArticles(articles);
  console.log(`After deduplication: ${uniqueArticles.length} unique articles (removed ${articles.length - uniqueArticles.length} duplicates)`);
  
  // Log sample of first few articles to debug content issues
  for (let i = 0; i < Math.min(3, uniqueArticles.length); i++) {
    const article = uniqueArticles[i];
    console.log(`Sample article ${i+1}:`);
    console.log(`  Title: ${article.title}`);
    console.log(`  Content length: ${article.content?.length || 0}`);
    if (article.content) {
      console.log(`  Content snippet: ${article.content.substring(0, 100)}...`);
    }
  }
  
  // Get batch size from config
  const batchSize = CONFIG.performance.batchSize || 5;
  console.log(`Using batch size of ${batchSize} for Claude analysis`);
  
  // Analyze articles in batches based on criteria
  const analyzedArticles = await analyzeArticlesBatch(
    uniqueArticles,
    criteria,
    batchSize
  );
  
  return analyzedArticles;
}

export { AnalyzedArticle, getCostInformation };