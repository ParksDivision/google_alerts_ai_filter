export interface ArticleContent {
    title: string;
    content: string;
    textContent: string;
    markdownContent?: string;
    length: number;
    excerpt: string;
    byline: string;
    siteName: string;
    date?: string;
    language?: string;
    error?: string;
}
export interface ExtractionOptions {
    timeout?: number;
    retries?: number;
    proxyUrl?: string;
}
/**
 * Extract the main article content from a given URL
 */
export declare function extractArticleContent(url: string, options?: ExtractionOptions): Promise<ArticleContent>;
