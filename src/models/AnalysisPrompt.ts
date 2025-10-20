import { z } from 'zod';

/**
 * Analysis Prompt model schema and types
 *
 * NOTE: User prompts are wrapped with a system template to ensure
 * consistent structured output (relevance score + explanation format)
 */

// Database Analysis Prompt type
export interface AnalysisPrompt {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  prompt_text: string; // User's custom criteria
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
  usage_count: number;
}

// Create Analysis Prompt input
export const CreateAnalysisPromptSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  prompt_text: z.string().min(10, 'Prompt must be at least 10 characters').max(10000, 'Prompt too long'),
  is_default: z.boolean().default(false),
});

export type CreateAnalysisPromptInput = z.infer<typeof CreateAnalysisPromptSchema>;

// Update Analysis Prompt input
export const UpdateAnalysisPromptSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').optional(),
  description: z.string().max(1000, 'Description too long').optional().nullable(),
  prompt_text: z.string().min(10, 'Prompt must be at least 10 characters').max(10000, 'Prompt too long').optional(),
  is_default: z.boolean().optional(),
});

export type UpdateAnalysisPromptInput = z.infer<typeof UpdateAnalysisPromptSchema>;

// Query parameters for listing prompts
export interface ListPromptsQuery {
  limit: string;
  offset: string;
  search?: string;
}

export const ListPromptsQuerySchema = z.object({
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
  search: z.string().optional(),
});

// Prompt with usage statistics
export interface PromptWithStats extends AnalysisPrompt {
  recent_job_count?: number;
  last_used?: Date | null;
}

/**
 * Build the complete prompt for AI analysis
 * Wraps user's custom criteria with structured output template
 * This ensures consistent response format regardless of user prompt
 */
export function buildAnalysisPrompt(userCriteria: string, articleCount: number = 1): string {
  return `You are an expert content analyzer. Your task is to analyze ${articleCount} article(s) and determine their relevance based on the following criteria:

${userCriteria}

I will provide each article with a unique ID. For each article, you must provide:
1. A relevance score between 0 and 100, where 100 is extremely relevant and 0 is not relevant at all.
2. A brief explanation (2-3 sentences) of why you assigned this score.

Evaluate EACH article independently based on the criteria above.

Format your response EXACTLY like this for EACH article:
ARTICLE_ID: [id]
RELEVANCE_SCORE: [score]
EXPLANATION: [your brief explanation]

Make sure to include ALL article IDs in your response, maintaining the exact format shown above for each article.

It's critical that you follow this exact format with these exact labels and correct article IDs.
Remember to only focus on the criteria provided. Be objective and consistent in your evaluation.`;
}

/**
 * Example of what user stores vs what gets sent to AI:
 *
 * User's prompt_text (stored in DB):
 * "Analyze this article for information about artificial intelligence in healthcare.
 *  Focus on: AI diagnosis tools, treatment planning, patient outcomes."
 *
 * What gets sent to AI (via buildAnalysisPrompt):
 * "You are an expert content analyzer. Your task is to analyze 1 article...
 *  [User's criteria here]
 *  ...Format your response EXACTLY like this:
 *  ARTICLE_ID: [id]
 *  RELEVANCE_SCORE: [score]
 *  EXPLANATION: [explanation]"
 */
