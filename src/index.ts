// src/index.ts
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { promises as fs } from 'node:fs';
import { z } from 'zod';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { scrapeArticles, ArticleOutput } from './scraper/index.js';
import { analyzeContent, getCostInformation } from './analysis/index.js';
import { readArticleLinks, readScrapedArticles, writeScrapedArticles } from './utils/csvHandler.js';
import { exportAnalyzedArticles } from './utils/exportFormatter.js';
import CONFIG, { ExportFormat } from './config.js';
import { createServer } from './server.js';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const OptionsSchema = z.object({
  inputCsvPath: z.string(),
  criteria: z.string(),
  outputDir: z.string().optional().default(CONFIG.outputDir),
  skipScraping: z.boolean().optional().default(false),
  scrapedDataPath: z.string().optional(),
  exportFormat: z.enum(['csv', 'excel', 'json', 'markdown', 'html']).optional().default(CONFIG.export.defaultFormat),
  minRelevanceScore: z.number().min(0).max(100).optional().default(CONFIG.export.minRelevanceScore),
  includeFullContent: z.boolean().optional().default(CONFIG.export.includeFullContent),
  startServer: z.boolean().optional().default(false),
  port: z.number().optional().default(3000),
});

export type RssAnalyzerOptions = z.infer<typeof OptionsSchema>;

/**
 * Main function to run the RSS feed analysis process
 */
export async function runAnalysis(options: RssAnalyzerOptions): Promise<string> {
  // Validate options
  const validatedOptions = OptionsSchema.parse(options);
  
  const {
    inputCsvPath,
    criteria,
    outputDir,
    skipScraping: initialSkipScraping,
    scrapedDataPath,
    exportFormat,
    minRelevanceScore,
    includeFullContent,
    startServer,
    port
  } = validatedOptions;
  
  console.log('Starting RSS feed analysis process...');
  
  // Create output directory if it doesn't exist
  await fs.mkdir(outputDir, { recursive: true });
  
  // Generate timestamp for filenames
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  
  // Define output paths
  const scrapedOutputPath = scrapedDataPath || join(
    outputDir, 
    `scraped-articles-${timestamp}.csv`
  );
  
  // Generate output filename based on export format
  const extension = exportFormat === 'excel' ? 'xlsx' : exportFormat;
  const analyzedOutputPath = join(
    outputDir, 
    `analyzed-articles-${timestamp}.${extension}`
  );
  
  // Step 1: Read input CSV
  console.log(`Reading article links from ${inputCsvPath}`);
  const articleLinks = await readArticleLinks(inputCsvPath);
  console.log(`Found ${articleLinks.length} article links`);
  
  // Step 2: Scrape articles (or use existing data)
  let shouldScrape = !initialSkipScraping;
  let scrapedArticles: ArticleOutput[] = [];
  
  if (initialSkipScraping && scrapedDataPath) {
    try {
      await fs.access(scrapedDataPath);
      console.log(`Using existing scraped data from ${scrapedDataPath}`);
      scrapedArticles = await readScrapedArticles(scrapedDataPath);
    } catch (error) {
      console.warn(`Could not access ${scrapedDataPath}, proceeding with scraping`);
      shouldScrape = true;
    }
  }
  
  if (shouldScrape) {
    console.log('Starting article scraping...');
    
    // Use batching for large datasets if enabled
    if (CONFIG.performance.enableBatching && articleLinks.length > CONFIG.performance.batchSize) {
      console.log(`Using batch processing for ${articleLinks.length} articles`);
      
      // Process in batches
      const batchSize = CONFIG.performance.batchSize;
      const batches = Math.ceil(articleLinks.length / batchSize);
      scrapedArticles = [];
      
      for (let i = 0; i < batches; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, articleLinks.length);
        console.log(`Processing batch ${i+1}/${batches} (articles ${start+1}-${end})`);
        
        const batchLinks = articleLinks.slice(start, end);
        const batchResults = await scrapeArticles(batchLinks);
        scrapedArticles.push(...batchResults);
        
        // Optionally save intermediate results
        if (CONFIG.performance.lowMemoryMode) {
          const batchOutputPath = join(
            outputDir,
            `scraped-articles-batch-${i+1}-${timestamp}.csv`
          );
          await writeScrapedArticles(batchResults, batchOutputPath);
        }
      }
    } else {
      // Process all at once
      scrapedArticles = await scrapeArticles(articleLinks);
    }
    
    await writeScrapedArticles(scrapedArticles, scrapedOutputPath);
    console.log(`Scraped articles saved to ${scrapedOutputPath}`);
  }
  
  // Step 3: Analyze articles with Claude
  console.log('Starting content analysis with Claude...');
  const analyzedArticles = await analyzeContent(
    scrapedArticles,
    criteria
  );
  
  // Step 4: Export analyzed articles
  const exportOptions = {
    format: exportFormat,
    outputPath: analyzedOutputPath,
    includeFullContent,
    minRelevanceScore,
    chunkSize: CONFIG.export.chunkSize
  };
  
  const exportedPath = await exportAnalyzedArticles(analyzedArticles, exportOptions);
  console.log(`Analyzed articles exported to ${exportedPath}`);
  
  // Step 5: Report cost information
  const costInfo = await getCostInformation();
  console.log('\nClaude API usage:');
  console.log(`Total cost: $${costInfo.totalCost.toFixed(4)}`);
  console.log(`Total input tokens: ${costInfo.inputTokens}`);
  console.log(`Total output tokens: ${costInfo.outputTokens}`);
  console.log(`Total requests: ${costInfo.requestCount}`);
  
  // Step 6: Start server if requested
  if (startServer) {
    console.log(`\nStarting server to serve the results...`);
    const server = await createServer(port, outputDir);
    console.log(`\nYou can view the results at:`);
    console.log(`- Latest report: http://localhost:${port}/`);
    console.log(`- All reports: http://localhost:${port}/reports`);
    
    // If we're specifically exporting HTML, give a direct link
    if (exportFormat === 'html') {
      const filename = exportedPath.split('/').pop();
      console.log(`- Current report: http://localhost:${port}/${filename}`);
    }
  }
  
  return exportedPath;
}

// Command line interface handler
async function cli() {
  const argv = await yargs(hideBin(process.argv))
    .command(
      'analyze <inputCsv> <criteriaFile>',
      'Analyze RSS feed articles based on criteria',
      (yargs) => {
        return yargs
          .positional('inputCsv', {
            describe: 'Path to the input CSV file with article links',
            type: 'string',
          })
          .positional('criteriaFile', {
            describe: 'Path to the file containing analysis criteria',
            type: 'string',
          })
          .option('output-dir', {
            describe: 'Directory to save output files',
            type: 'string',
            default: CONFIG.outputDir,
          })
          .option('skip-scraping', {
            describe: 'Skip scraping and use existing data',
            type: 'boolean',
            default: false,
          })
          .option('scraped-data', {
            describe: 'Path to existing scraped data (if skip-scraping is true)',
            type: 'string',
          })
          .option('export-format', {
            describe: 'Format for exporting results (csv, excel, json, markdown, html)',
            type: 'string',
            choices: ['csv', 'excel', 'json', 'markdown', 'html'] as const,
            default: CONFIG.export.defaultFormat,
          })
          .option('min-score', {
            describe: 'Minimum relevance score (0-100) for including articles',
            type: 'number',
            default: CONFIG.export.minRelevanceScore,
          })
          .option('include-content', {
            describe: 'Include full article content in export',
            type: 'boolean',
            default: CONFIG.export.includeFullContent,
          })
          .option('start-server', {
            describe: 'Start a web server to view results immediately',
            type: 'boolean',
            default: false,
          })
          .option('port', {
            describe: 'Port for the web server (if enabled)',
            type: 'number',
            default: 3000,
          });
      }
    )
    .command(
      'serve [outputDir]',
      'Start a server to serve existing reports',
      (yargs) => {
        return yargs
          .positional('outputDir', {
            describe: 'Directory containing report files',
            type: 'string',
            default: CONFIG.outputDir,
          })
          .option('port', {
            describe: 'Port for the web server',
            type: 'number',
            default: 3000,
          });
      }
    )
    .demandCommand(1)
    .help()
    .strict()
    .parseAsync();
  
  if (argv._[0] === 'analyze' && argv.inputCsv && argv.criteriaFile) {
    try {
      // Read criteria from file
      const criteria = await fs.readFile(argv.criteriaFile as string, 'utf8');
      
      const result = await runAnalysis({
        inputCsvPath: argv.inputCsv as string,
        criteria,
        outputDir: argv.outputDir as string,
        skipScraping: argv.skipScraping as boolean,
        scrapedDataPath: argv.scrapedData as string | undefined,
        exportFormat: argv.exportFormat as ExportFormat,
        minRelevanceScore: argv.minScore as number,
        includeFullContent: argv.includeContent as boolean,
        startServer: argv.startServer as boolean,
        port: argv.port as number,
      });
      
      console.log(`\nAnalysis complete! Results saved to: ${result}`);
      
      if (!argv.startServer) {
        console.log('\nTo view the results with a web server, run:');
        console.log(`npm run serve -- --port 3000 --output-dir ${argv.outputDir}`);
      }
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  }
  else if (argv._[0] === 'serve') {
    try {
      const port = argv.port as number;
      const outputDir = argv.outputDir as string;
      
      console.log(`Starting server for reports in ${outputDir}...`);
      await createServer(port, outputDir);
    } catch (error: any) {
      console.error('Error starting server:', error.message);
      process.exit(1);
    }
  }
}

// Execute the CLI if this file is run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  cli().catch(console.error);
}

export default runAnalysis;