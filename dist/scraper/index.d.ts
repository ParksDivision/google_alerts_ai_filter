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
export declare function scrapeArticle(article: ArticleInput, retryCount?: number): Promise<ArticleOutput>;
/**
 * Scrapes multiple articles with concurrency control
 */
export declare function scrapeArticles(articles: ArticleInput[]): Promise<ArticleOutput[]>;
