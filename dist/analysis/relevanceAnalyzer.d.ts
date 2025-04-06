import { ArticleOutput } from '../scraper/index.js';
export interface AnalyzedArticle extends ArticleOutput {
    relevanceScore: number;
    relevanceExplanation: string;
}
/**
 * Creates a prompt for analyzing multiple articles' relevance based on criteria
 */
export declare function createBatchAnalysisPrompt(criteria: string, articlesCount: number): string;
/**
 * Parses the batch analysis result from Claude with enhanced error handling
 */
export declare function parseBatchAnalysisResult(result: string | null, expectedArticleIds: string[]): Map<string, {
    score: number;
    explanation: string;
}>;
/**
 * Process articles in batches to reduce Claude API calls
 */
export declare function analyzeArticlesBatch(articles: ArticleOutput[], criteria: string, batchSize?: number): Promise<AnalyzedArticle[]>;
export declare function analyzeArticles(articles: ArticleOutput[], criteria: string): Promise<AnalyzedArticle[]>;
