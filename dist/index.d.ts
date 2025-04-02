import { z } from 'zod';
export declare const OptionsSchema: z.ZodObject<{
    inputCsvPath: z.ZodString;
    criteria: z.ZodString;
    outputDir: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    skipScraping: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    scrapedDataPath: z.ZodOptional<z.ZodString>;
    exportFormat: z.ZodDefault<z.ZodOptional<z.ZodEnum<["csv", "excel", "json", "markdown", "html"]>>>;
    minRelevanceScore: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    includeFullContent: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    outputDir: string;
    includeFullContent: boolean;
    minRelevanceScore: number;
    inputCsvPath: string;
    criteria: string;
    skipScraping: boolean;
    exportFormat: "csv" | "excel" | "json" | "markdown" | "html";
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
}>;
export type RssAnalyzerOptions = z.infer<typeof OptionsSchema>;
/**
 * Main function to run the RSS feed analysis process
 */
export declare function runAnalysis(options: RssAnalyzerOptions): Promise<string>;
export default runAnalysis;
