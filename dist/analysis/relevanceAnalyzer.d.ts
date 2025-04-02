import { ArticleOutput } from '../scraper/index.js';
export interface AnalyzedArticle extends ArticleOutput {
    relevanceScore: number;
    relevanceExplanation: string;
}
/**
 * Creates a prompt for analyzing an article's relevance based on criteria
 */
export declare function createAnalysisPrompt(criteria: string): string;
/**
 * Parses the analysis result from Claude
 */
export declare function parseAnalysisResult(result: string | null): {
    score: number;
    explanation: string;
};
/**
 * Analyzes a single article for relevance
 */
export declare function analyzeArticle(article: ArticleOutput, criteria: string): Promise<AnalyzedArticle>;
/**
 * Analyzes multiple articles and sorts by relevance
 */
export declare function analyzeArticles(articles: ArticleOutput[], criteria: string): Promise<AnalyzedArticle[]>;
