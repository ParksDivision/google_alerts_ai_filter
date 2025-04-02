import { getCostInformation } from './claudeClient.js';
import { AnalyzedArticle } from './relevanceAnalyzer.js';
import { ArticleOutput } from '../scraper/index.js';
/**
 * Analyzes content based on provided criteria and returns sorted results
 */
export declare function analyzeContent(articles: ArticleOutput[], criteria: string): Promise<AnalyzedArticle[]>;
export { AnalyzedArticle, getCostInformation };
