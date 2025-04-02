import { AnalyzedArticle } from '../analysis/index.js';
import { ExportFormat } from '../config.js';
export interface ExportOptions {
    format: ExportFormat;
    outputPath: string;
    chunkSize?: number;
    includeFullContent?: boolean;
    minRelevanceScore?: number;
}
/**
 * Export analyzed articles to the specified format
 */
export declare function exportAnalyzedArticles(articles: AnalyzedArticle[], options: ExportOptions): Promise<string>;
/**
 * Export to Excel format with optimizations for large datasets
 */
export declare function exportToExcel(articles: AnalyzedArticle[], outputPath: string, includeFullContent: boolean, chunkSize: number): Promise<string>;
/**
 * Export to JSON format
 */
export declare function exportToJson(articles: AnalyzedArticle[], outputPath: string, includeFullContent: boolean): Promise<string>;
/**
 * Export to Markdown format
 */
export declare function exportToMarkdown(articles: AnalyzedArticle[], outputPath: string, includeFullContent: boolean): Promise<string>;
/**
 * Export to HTML format with interactive features
 */
export declare function exportToHtml(articles: AnalyzedArticle[], outputPath: string, includeFullContent: boolean): Promise<string>;
