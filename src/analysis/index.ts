import { getCostInformation } from './claudeClient.js';
import { analyzeArticles, AnalyzedArticle } from './relevanceAnalyzer.js';
import { ArticleOutput } from '../scraper/index.js';

/**
 * Analyzes content based on provided criteria and returns sorted results
 */
export async function analyzeContent(
  articles: ArticleOutput[],
  criteria: string
): Promise<AnalyzedArticle[]> {
  // Filter out articles with no content or errors
  const validArticles = articles.filter(  
    article => {
      if (article.content && !article.error) return true;
      else console.log('article content: ', article.content)
      return false;
    }
  );
  
  console.log(`Analyzing ${validArticles.length} valid articles out of ${articles.length} total`);
  
  // Analyze articles based on criteria
  const analyzedArticles = await analyzeArticles(
    validArticles,
    criteria
  );
  
  return analyzedArticles;
}

export { AnalyzedArticle, getCostInformation };