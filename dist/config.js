import { config } from 'dotenv';
import { z } from 'zod';
// Load environment variables
config();
// Define configuration schema with zod for validation
const ConfigSchema = z.object({
    // Input/Output
    inputDir: z.string().default('./input'),
    outputDir: z.string().default('./output'),
    // Scraper settings
    scraper: z.object({
        maxConcurrent: z.coerce.number().int().positive().default(10),
        requestTimeout: z.coerce.number().int().positive().default(30000),
        requestDelay: z.coerce.number().int().positive().default(1000),
        retries: z.coerce.number().int().nonnegative().default(3),
        useProxy: z.coerce.boolean().default(false),
    }),
    // Claude API settings
    claude: z.object({
        apiKey: z.string().min(1),
        model: z.string().default('claude-3-haiku-20240307'),
        maxTokensPerRequest: z.coerce.number().int().positive().default(100000),
        // Cost management
        monthlyCostLimit: z.coerce.number().positive().default(20.0),
        haiku_input_cost_per_1k: z.coerce.number().positive().default(0.25),
        haiku_output_cost_per_1k: z.coerce.number().positive().default(1.25),
        // Rate limiting
        requestsPerMinute: z.coerce.number().int().positive().default(15),
        maxConcurrent: z.coerce.number().int().positive().default(5),
    }),
    // Export settings
    export: z.object({
        defaultFormat: z.enum(['csv', 'excel', 'json', 'markdown', 'html']).default('html'),
        includeFullContent: z.coerce.boolean().default(true),
        chunkSize: z.coerce.number().int().positive().default(500),
        minRelevanceScore: z.coerce.number().int().min(0).max(100).default(0),
    }),
    // Performance settings
    performance: z.object({
        enableBatching: z.coerce.boolean().default(true),
        batchSize: z.coerce.number().int().positive().default(50),
        lowMemoryMode: z.coerce.boolean().default(false),
    }),
    // Logging
    logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});
// Parse environment variables and apply defaults
export const CONFIG = ConfigSchema.parse({
    inputDir: process.env.INPUT_DIR,
    outputDir: process.env.OUTPUT_DIR,
    scraper: {
        maxConcurrent: process.env.SCRAPER_MAX_CONCURRENT,
        requestTimeout: process.env.SCRAPER_TIMEOUT,
        requestDelay: process.env.SCRAPER_DELAY,
        retries: process.env.SCRAPER_RETRIES,
        useProxy: process.env.USE_PROXY,
    },
    claude: {
        apiKey: process.env.CLAUDE_API_KEY || '',
        model: process.env.CLAUDE_MODEL,
        maxTokensPerRequest: process.env.CLAUDE_MAX_TOKENS,
        monthlyCostLimit: process.env.MONTHLY_COST_LIMIT,
        haiku_input_cost_per_1k: 0.25,
        haiku_output_cost_per_1k: 1.25,
        requestsPerMinute: process.env.CLAUDE_REQUESTS_PER_MINUTE,
        maxConcurrent: process.env.CLAUDE_MAX_CONCURRENT,
    },
    export: {
        defaultFormat: process.env.DEFAULT_EXPORT_FORMAT,
        includeFullContent: process.env.INCLUDE_FULL_CONTENT,
        chunkSize: process.env.EXPORT_CHUNK_SIZE,
        minRelevanceScore: process.env.MIN_RELEVANCE_SCORE,
    },
    performance: {
        enableBatching: process.env.ENABLE_BATCHING,
        batchSize: process.env.BATCH_SIZE,
        lowMemoryMode: process.env.LOW_MEMORY_MODE,
    },
    logLevel: process.env.LOG_LEVEL,
});
export default CONFIG;
//# sourceMappingURL=config.js.map