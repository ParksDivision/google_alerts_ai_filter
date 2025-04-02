import { ArticleInput, ArticleOutput } from '../scraper/index.js';
import { AnalyzedArticle } from '../analysis/index.js';
/**
 * Read article links from CSV (basic format for initial scraping)
 */
export declare function readArticleLinks(filePath: string): Promise<ArticleInput[]>;
/**
 * Read previously scraped articles from CSV (including content)
 */
export declare function readScrapedArticles(filePath: string): Promise<ArticleOutput[]>;
/**
 * Write scraped articles to CSV
 */
export declare function writeScrapedArticles(articles: (ArticleInput & {
    content: string;
    error?: string;
})[], outputPath: string): Promise<string>;
/**
 * Write analyzed articles to CSV
 */
export declare function writeAnalyzedArticles(articles: AnalyzedArticle[], outputPath: string): Promise<string>;
