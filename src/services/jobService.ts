import { query } from '../db/connection.js';
import {
  AnalysisJob,
  CreateAnalysisJobInput,
  ListJobsQuery,
  JobStats,
} from '../models/AnalysisJob.js';
import { getActiveFeeds, getFeedsByIds, updateFeedStats } from './feedService.js';
import { getPromptById, getDefaultPrompt, incrementPromptUsage } from './promptService.js';
import { buildAnalysisPrompt } from '../models/AnalysisPrompt.js';
import { progressTracker } from './progressTracker.js';
import { processRssFeeds } from '../rss/feedProcessor.js';
import { scrapeArticles } from '../scraper/index.js';
import { analyzeArticlesBatch } from '../analysis/relevanceAnalyzer.js';
import { exportAnalyzedArticles } from '../utils/exportFormatter.js';
import { getCostInformation } from '../analysis/openaiClient.js';
import { deduplicateArticleInputs, deduplicateScrapedArticles } from '../utils/deduplicationUtils.js';
import { join } from 'node:path';
import CONFIG from '../config.js';

/**
 * Job Service
 * Handles creation, execution, and management of analysis jobs
 */

/**
 * Create a new analysis job
 */
export async function createJob(
  userId: string,
  input: CreateAnalysisJobInput
): Promise<AnalysisJob> {
  // Get prompt (use provided or default)
  let promptId = input.prompt_id;
  let promptText: string;

  if (promptId) {
    const prompt = await getPromptById(promptId, userId);
    if (!prompt) {
      throw new Error('Prompt not found');
    }
    promptText = prompt.prompt_text;
  } else {
    const defaultPrompt = await getDefaultPrompt(userId);
    if (!defaultPrompt) {
      throw new Error('No default prompt set. Please specify a prompt or set a default.');
    }
    promptId = defaultPrompt.id;
    promptText = defaultPrompt.prompt_text;
  }

  // Get feed IDs (use provided or all active)
  let feedIds: string[];
  if (input.feed_ids && input.feed_ids.length > 0) {
    const feeds = await getFeedsByIds(userId, input.feed_ids);
    if (feeds.length === 0) {
      throw new Error('No active feeds found with provided IDs');
    }
    feedIds = feeds.map(f => f.id);
  } else {
    const feeds = await getActiveFeeds(userId);
    if (feeds.length === 0) {
      throw new Error('No active feeds found. Please create and activate at least one feed.');
    }
    feedIds = feeds.map(f => f.id);
  }

  // Create job in database
  const result = await query<AnalysisJob>(
    `INSERT INTO analysis_jobs (
      user_id, prompt_id, status, feed_ids,
      min_relevance_score, export_format, include_full_content
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [
      userId,
      promptId,
      'pending',
      JSON.stringify(feedIds),
      input.min_relevance_score,
      input.export_format,
      input.include_full_content,
    ]
  );

  const job = result.rows[0];

  // Start job execution asynchronously (don't await)
  executeJob(job.id, userId, promptText, feedIds).catch(error => {
    console.error(`Job ${job.id} execution error:`, error);
  });

  return job;
}

/**
 * Execute an analysis job
 * This runs asynchronously in the background
 */
async function executeJob(
  jobId: string,
  userId: string,
  promptText: string,
  feedIds: string[]
): Promise<void> {
  const startTime = Date.now();

  try {
    // Update job status to running
    await query(
      `UPDATE analysis_jobs
       SET status = 'running', started_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [jobId]
    );

    // Step 1: Fetch RSS feeds
    progressTracker.startJob(jobId);
    progressTracker.updateProgress(jobId, {
      progress: 5,
      currentStep: 'Fetching RSS feeds',
    });

    const feeds = await getFeedsByIds(userId, feedIds);
    const feedConfigs = feeds.map(f => ({ url: f.url, alertName: f.name }));

    const articleLinks = await processRssFeeds(feedConfigs);

    // Update feed statistics
    for (const feed of feeds) {
      await updateFeedStats(feed.id, true);
    }

    progressTracker.updateProgress(jobId, {
      progress: 15,
      currentStep: `Found ${articleLinks.length} articles`,
      totalArticles: articleLinks.length,
    });

    // Step 2: Deduplicate
    const uniqueArticles = deduplicateArticleInputs(articleLinks);
    console.log(`After deduplication: ${uniqueArticles.length} unique articles`);

    await query(
      `UPDATE analysis_jobs SET total_articles = $1 WHERE id = $2`,
      [uniqueArticles.length, jobId]
    );

    progressTracker.updateProgress(jobId, {
      progress: 20,
      currentStep: `Scraping ${uniqueArticles.length} articles`,
      totalArticles: uniqueArticles.length,
    });

    // Step 3: Scrape articles
    const scrapedArticles = [];
    const batchSize = 10; // Scrape in smaller batches for progress updates

    for (let i = 0; i < uniqueArticles.length; i += batchSize) {
      const batch = uniqueArticles.slice(i, i + batchSize);
      const scraped = await scrapeArticles(batch);
      scrapedArticles.push(...scraped);

      const scrapedCount = Math.min(i + batchSize, uniqueArticles.length);
      const scrapingProgress = 20 + (30 * scrapedCount / uniqueArticles.length);

      progressTracker.updateProgress(jobId, {
        progress: Math.round(scrapingProgress),
        currentStep: `Scraped ${scrapedCount}/${uniqueArticles.length} articles`,
        processedArticles: scrapedCount,
      });
    }

    const uniqueScraped = deduplicateScrapedArticles(scrapedArticles);
    console.log(`After scraping dedup: ${uniqueScraped.length} unique articles`);

    progressTracker.updateProgress(jobId, {
      progress: 50,
      currentStep: `Analyzing ${uniqueScraped.length} articles with AI`,
    });

    // Step 4: Analyze with AI
    const completePrompt = buildAnalysisPrompt(promptText, 1); // 1 article at a time for reliability
    const analyzed = [];
    const analysisBatchSize = 1;

    for (let i = 0; i < uniqueScraped.length; i += analysisBatchSize) {
      const batch = uniqueScraped.slice(i, i + analysisBatchSize);
      const batchResults = await analyzeArticlesBatch(batch, completePrompt, analysisBatchSize);
      analyzed.push(...batchResults);

      const analyzedCount = Math.min(i + analysisBatchSize, uniqueScraped.length);
      const analysisProgress = 50 + (40 * analyzedCount / uniqueScraped.length);

      progressTracker.updateProgress(jobId, {
        progress: Math.round(analysisProgress),
        currentStep: `Analyzed ${analyzedCount}/${uniqueScraped.length} articles`,
        processedArticles: analyzedCount,
      });
    }

    progressTracker.updateProgress(jobId, {
      progress: 90,
      currentStep: 'Saving results',
    });

    // Step 5: Save results to database
    const jobData = await getJobById(jobId);
    const minScore = jobData?.min_relevance_score || 0;
    const articlesAboveThreshold = analyzed.filter(a => a.relevanceScore >= minScore).length;

    for (const article of analyzed) {
      await query(
        `INSERT INTO analyzed_articles (
          job_id, title, url, content, content_excerpt,
          relevance_score, relevance_explanation
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (job_id, url) DO NOTHING`,
        [
          jobId,
          article.title,
          article.link,
          article.content,
          article.content?.substring(0, 500),
          article.relevanceScore,
          article.relevanceExplanation,
        ]
      );
    }

    // Step 6: Export results
    progressTracker.updateProgress(jobId, {
      progress: 95,
      currentStep: 'Exporting results',
    });

    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const extension = jobData?.export_format === 'excel' ? 'xlsx' : jobData?.export_format;
    const outputPath = join(CONFIG.outputDir, `analysis-${jobId}-${timestamp}.${extension}`);

    await exportAnalyzedArticles(analyzed, {
      format: (jobData?.export_format as any) || 'html',
      outputPath,
      includeFullContent: jobData?.include_full_content ?? true,
      minRelevanceScore: minScore,
    });

    // Step 7: Get cost information
    const costInfo = await getCostInformation();
    const duration = Math.round((Date.now() - startTime) / 1000);

    // Update job as completed
    await query(
      `UPDATE analysis_jobs
       SET status = 'completed',
           progress = 100,
           current_step = 'Completed',
           processed_articles = $1,
           articles_analyzed = $2,
           articles_above_threshold = $3,
           result_file_path = $4,
           ai_cost = $5,
           input_tokens = $6,
           output_tokens = $7,
           duration_seconds = $8,
           completed_at = CURRENT_TIMESTAMP
       WHERE id = $9`,
      [
        uniqueScraped.length,
        analyzed.length,
        articlesAboveThreshold,
        outputPath,
        costInfo.totalCost,
        costInfo.inputTokens,
        costInfo.outputTokens,
        duration,
        jobId,
      ]
    );

    // Increment prompt usage
    if (jobData?.prompt_id) {
      await incrementPromptUsage(jobData.prompt_id);
    }

    progressTracker.completeJob(jobId, `Analysis complete! ${articlesAboveThreshold} relevant articles found.`);

  } catch (error: any) {
    console.error(`Job ${jobId} failed:`, error);

    await query(
      `UPDATE analysis_jobs
       SET status = 'failed',
           error_message = $1,
           completed_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [error.message, jobId]
    );

    progressTracker.failJob(jobId, error.message);
  }
}

/**
 * Get job by ID
 */
export async function getJobById(jobId: string, userId?: string): Promise<AnalysisJob | null> {
  const queryText = userId
    ? 'SELECT * FROM analysis_jobs WHERE id = $1 AND user_id = $2'
    : 'SELECT * FROM analysis_jobs WHERE id = $1';

  const params = userId ? [jobId, userId] : [jobId];

  const result = await query<AnalysisJob>(queryText, params);

  if (result.rows.length === 0) {
    return null;
  }

  const job = result.rows[0];
  // Parse feed_ids from JSONB
  if (job.feed_ids && typeof job.feed_ids === 'string') {
    job.feed_ids = JSON.parse(job.feed_ids as any);
  }

  return job;
}

/**
 * List jobs for a user
 */
export async function listJobs(
  userId: string,
  filters: ListJobsQuery = { limit: '50', offset: '0' }
): Promise<{ jobs: AnalysisJob[]; total: number }> {
  const conditions: string[] = ['user_id = $1'];
  const params: any[] = [userId];
  let paramIndex = 2;

  if (filters.status) {
    conditions.push(`status = $${paramIndex++}`);
    params.push(filters.status);
  }

  const whereClause = conditions.join(' AND ');

  // Get total count
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM analysis_jobs WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Get jobs with pagination
  params.push(filters.limit, filters.offset);
  const result = await query<AnalysisJob>(
    `SELECT * FROM analysis_jobs
     WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    params
  );

  // Parse feed_ids for each job
  const jobs = result.rows.map(job => {
    if (job.feed_ids && typeof job.feed_ids === 'string') {
      job.feed_ids = JSON.parse(job.feed_ids as any);
    }
    return job;
  });

  return { jobs, total };
}

/**
 * Get job statistics for a user
 */
export async function getJobStats(userId: string): Promise<JobStats> {
  const result = await query<any>(
    `SELECT
      COUNT(*) as total_jobs,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs,
      COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_jobs,
      COUNT(CASE WHEN status = 'running' THEN 1 END) as running_jobs,
      COALESCE(SUM(articles_analyzed), 0) as total_articles_analyzed,
      COALESCE(SUM(ai_cost), 0) as total_cost,
      COALESCE(AVG(duration_seconds), 0) as average_duration
     FROM analysis_jobs
     WHERE user_id = $1`,
    [userId]
  );

  const row = result.rows[0];

  return {
    totalJobs: parseInt(row.total_jobs, 10),
    completedJobs: parseInt(row.completed_jobs, 10),
    failedJobs: parseInt(row.failed_jobs, 10),
    runningJobs: parseInt(row.running_jobs, 10),
    totalArticlesAnalyzed: parseInt(row.total_articles_analyzed, 10),
    totalCost: parseFloat(row.total_cost),
    averageDuration: parseFloat(row.average_duration),
  };
}

/**
 * Cancel a running job
 */
export async function cancelJob(jobId: string, userId: string): Promise<void> {
  const result = await query(
    `UPDATE analysis_jobs
     SET status = 'cancelled', completed_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND user_id = $2 AND status IN ('pending', 'running')`,
    [jobId, userId]
  );

  if (result.rowCount === 0) {
    throw new Error('Job not found or cannot be cancelled');
  }

  progressTracker.clearProgress(jobId);
}

/**
 * Get analyzed articles for a job
 */
export async function getJobResults(
  jobId: string,
  userId: string,
  limit: number = 100,
  offset: number = 0
): Promise<any[]> {
  // Verify job belongs to user
  const job = await getJobById(jobId, userId);
  if (!job) {
    throw new Error('Job not found');
  }

  const result = await query(
    `SELECT * FROM analyzed_articles
     WHERE job_id = $1
     ORDER BY relevance_score DESC
     LIMIT $2 OFFSET $3`,
    [jobId, limit, offset]
  );

  return result.rows;
}
