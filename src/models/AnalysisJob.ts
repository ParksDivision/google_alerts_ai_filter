import { z } from 'zod';

/**
 * Analysis Job model schema and types
 */

// Job status enum
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

// Database Analysis Job type
export interface AnalysisJob {
  id: string;
  user_id: string;
  prompt_id: string | null;
  status: JobStatus;
  progress: number; // 0-100
  current_step: string | null;
  total_articles: number;
  processed_articles: number;

  // Configuration
  min_relevance_score: number;
  export_format: string;
  include_full_content: boolean;

  // Results
  result_file_path: string | null;
  articles_analyzed: number;
  articles_above_threshold: number;

  // Costs & Performance
  ai_cost: number;
  input_tokens: number;
  output_tokens: number;
  duration_seconds: number | null;

  // Metadata
  error_message: string | null;
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;

  // Selected feeds
  feed_ids: string[] | null;
}

// Create Analysis Job input
export const CreateAnalysisJobSchema = z.object({
  prompt_id: z.string().uuid('Invalid prompt ID').optional(),
  feed_ids: z.array(z.string().uuid()).min(1, 'At least one feed is required').optional(),
  min_relevance_score: z.number().int().min(0).max(100).default(0),
  export_format: z.enum(['html', 'csv', 'excel', 'json', 'markdown']).default('html'),
  include_full_content: z.boolean().default(true),
});

export type CreateAnalysisJobInput = z.infer<typeof CreateAnalysisJobSchema>;

// Job progress update
export interface JobProgress {
  jobId: string;
  status: JobStatus;
  progress: number; // 0-100
  currentStep: string;
  totalArticles: number;
  processedArticles: number;
  estimatedTimeRemaining?: number;
  message?: string;
}

// Job statistics
export interface JobStats {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  runningJobs: number;
  totalArticlesAnalyzed: number;
  totalCost: number;
  averageDuration: number;
}

// List jobs query
export interface ListJobsQuery {
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  limit: string;
  offset: string;
}

export const ListJobsQuerySchema = z.object({
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']).optional(),
  limit: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(100))
    .default('50'),
  offset: z
    .string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().int().min(0))
    .default('0'),
});
