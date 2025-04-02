import { z } from 'zod';
declare const ConfigSchema: z.ZodObject<{
    inputDir: z.ZodDefault<z.ZodString>;
    outputDir: z.ZodDefault<z.ZodString>;
    scraper: z.ZodObject<{
        maxConcurrent: z.ZodDefault<z.ZodNumber>;
        requestTimeout: z.ZodDefault<z.ZodNumber>;
        requestDelay: z.ZodDefault<z.ZodNumber>;
        retries: z.ZodDefault<z.ZodNumber>;
        useProxy: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        maxConcurrent: number;
        requestTimeout: number;
        requestDelay: number;
        retries: number;
        useProxy: boolean;
    }, {
        maxConcurrent?: number | undefined;
        requestTimeout?: number | undefined;
        requestDelay?: number | undefined;
        retries?: number | undefined;
        useProxy?: boolean | undefined;
    }>;
    claude: z.ZodObject<{
        apiKey: z.ZodString;
        model: z.ZodDefault<z.ZodString>;
        maxTokensPerRequest: z.ZodDefault<z.ZodNumber>;
        monthlyCostLimit: z.ZodDefault<z.ZodNumber>;
        haiku_input_cost_per_1k: z.ZodDefault<z.ZodNumber>;
        haiku_output_cost_per_1k: z.ZodDefault<z.ZodNumber>;
        requestsPerMinute: z.ZodDefault<z.ZodNumber>;
        maxConcurrent: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        maxConcurrent: number;
        apiKey: string;
        model: string;
        maxTokensPerRequest: number;
        monthlyCostLimit: number;
        haiku_input_cost_per_1k: number;
        haiku_output_cost_per_1k: number;
        requestsPerMinute: number;
    }, {
        apiKey: string;
        maxConcurrent?: number | undefined;
        model?: string | undefined;
        maxTokensPerRequest?: number | undefined;
        monthlyCostLimit?: number | undefined;
        haiku_input_cost_per_1k?: number | undefined;
        haiku_output_cost_per_1k?: number | undefined;
        requestsPerMinute?: number | undefined;
    }>;
    export: z.ZodObject<{
        defaultFormat: z.ZodDefault<z.ZodEnum<["csv", "excel", "json", "markdown", "html"]>>;
        includeFullContent: z.ZodDefault<z.ZodBoolean>;
        chunkSize: z.ZodDefault<z.ZodNumber>;
        minRelevanceScore: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        defaultFormat: "csv" | "excel" | "json" | "markdown" | "html";
        includeFullContent: boolean;
        chunkSize: number;
        minRelevanceScore: number;
    }, {
        defaultFormat?: "csv" | "excel" | "json" | "markdown" | "html" | undefined;
        includeFullContent?: boolean | undefined;
        chunkSize?: number | undefined;
        minRelevanceScore?: number | undefined;
    }>;
    performance: z.ZodObject<{
        enableBatching: z.ZodDefault<z.ZodBoolean>;
        batchSize: z.ZodDefault<z.ZodNumber>;
        lowMemoryMode: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        enableBatching: boolean;
        batchSize: number;
        lowMemoryMode: boolean;
    }, {
        enableBatching?: boolean | undefined;
        batchSize?: number | undefined;
        lowMemoryMode?: boolean | undefined;
    }>;
    logLevel: z.ZodDefault<z.ZodEnum<["error", "warn", "info", "debug"]>>;
}, "strip", z.ZodTypeAny, {
    inputDir: string;
    outputDir: string;
    scraper: {
        maxConcurrent: number;
        requestTimeout: number;
        requestDelay: number;
        retries: number;
        useProxy: boolean;
    };
    claude: {
        maxConcurrent: number;
        apiKey: string;
        model: string;
        maxTokensPerRequest: number;
        monthlyCostLimit: number;
        haiku_input_cost_per_1k: number;
        haiku_output_cost_per_1k: number;
        requestsPerMinute: number;
    };
    export: {
        defaultFormat: "csv" | "excel" | "json" | "markdown" | "html";
        includeFullContent: boolean;
        chunkSize: number;
        minRelevanceScore: number;
    };
    performance: {
        enableBatching: boolean;
        batchSize: number;
        lowMemoryMode: boolean;
    };
    logLevel: "error" | "warn" | "info" | "debug";
}, {
    scraper: {
        maxConcurrent?: number | undefined;
        requestTimeout?: number | undefined;
        requestDelay?: number | undefined;
        retries?: number | undefined;
        useProxy?: boolean | undefined;
    };
    claude: {
        apiKey: string;
        maxConcurrent?: number | undefined;
        model?: string | undefined;
        maxTokensPerRequest?: number | undefined;
        monthlyCostLimit?: number | undefined;
        haiku_input_cost_per_1k?: number | undefined;
        haiku_output_cost_per_1k?: number | undefined;
        requestsPerMinute?: number | undefined;
    };
    export: {
        defaultFormat?: "csv" | "excel" | "json" | "markdown" | "html" | undefined;
        includeFullContent?: boolean | undefined;
        chunkSize?: number | undefined;
        minRelevanceScore?: number | undefined;
    };
    performance: {
        enableBatching?: boolean | undefined;
        batchSize?: number | undefined;
        lowMemoryMode?: boolean | undefined;
    };
    inputDir?: string | undefined;
    outputDir?: string | undefined;
    logLevel?: "error" | "warn" | "info" | "debug" | undefined;
}>;
export declare const CONFIG: {
    inputDir: string;
    outputDir: string;
    scraper: {
        maxConcurrent: number;
        requestTimeout: number;
        requestDelay: number;
        retries: number;
        useProxy: boolean;
    };
    claude: {
        maxConcurrent: number;
        apiKey: string;
        model: string;
        maxTokensPerRequest: number;
        monthlyCostLimit: number;
        haiku_input_cost_per_1k: number;
        haiku_output_cost_per_1k: number;
        requestsPerMinute: number;
    };
    export: {
        defaultFormat: "csv" | "excel" | "json" | "markdown" | "html";
        includeFullContent: boolean;
        chunkSize: number;
        minRelevanceScore: number;
    };
    performance: {
        enableBatching: boolean;
        batchSize: number;
        lowMemoryMode: boolean;
    };
    logLevel: "error" | "warn" | "info" | "debug";
};
export type ExportFormat = z.infer<typeof ConfigSchema>['export']['defaultFormat'];
export default CONFIG;
