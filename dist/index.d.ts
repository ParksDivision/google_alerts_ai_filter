import { z } from 'zod';
import { ExportFormat } from './config.js';
export declare const OptionsSchema: z.ZodObject<{
    inputCsvPath: z.ZodString;
    criteria: z.ZodString;
    outputDir: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    skipScraping: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    scrapedDataPath: z.ZodOptional<z.ZodString>;
    exportFormat: z.ZodDefault<z.ZodOptional<z.ZodEnum<["csv", "excel", "json", "markdown", "html"]>>>;
    minRelevanceScore: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    includeFullContent: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    startServer: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    port: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    outputDir: string;
    includeFullContent: boolean;
    minRelevanceScore: number;
    inputCsvPath: string;
    criteria: string;
    skipScraping: boolean;
    exportFormat: "csv" | "excel" | "json" | "markdown" | "html";
    startServer: boolean;
    port: number;
    scrapedDataPath?: string | undefined;
}, {
    inputCsvPath: string;
    criteria: string;
    outputDir?: string | undefined;
    includeFullContent?: boolean | undefined;
    minRelevanceScore?: number | undefined;
    skipScraping?: boolean | undefined;
    scrapedDataPath?: string | undefined;
    exportFormat?: "csv" | "excel" | "json" | "markdown" | "html" | undefined;
    startServer?: boolean | undefined;
    port?: number | undefined;
}>;
export type RssAnalyzerOptions = z.infer<typeof OptionsSchema>;
/**
 * Main function to run the RSS feed analysis process
 */
export declare function runAnalysis(options: RssAnalyzerOptions): Promise<string>;
/**
 * Process RSS feeds from a file and export to CSV format
 */
export declare function processRss(feedsFilePath: string, outputPath?: string): Promise<string>;
/**
 * Run the entire pipeline: process RSS feeds, analyze content, and start server
 */
export declare function runEntirePipeline(options: {
    feedsFilePath: string;
    criteriaFilePath?: string;
    exportFormat?: ExportFormat;
    minRelevanceScore?: number;
    includeFullContent?: boolean;
    port?: number;
}): Promise<string>;
declare const _default: {
    runAnalysis: typeof runAnalysis;
    processRss: typeof processRss;
    runEntirePipeline: typeof runEntirePipeline;
};
export default _default;
