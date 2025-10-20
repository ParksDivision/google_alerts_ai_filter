import { z } from 'zod';

/**
 * RSS Feed model schema and types
 */

// Database RSS Feed type
export interface RssFeed {
  id: string;
  user_id: string;
  url: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  last_fetched_at: Date | null;
  fetch_count: number;
  error_count: number;
  last_error: string | null;
}

// Create RSS Feed input
export const CreateRssFeedSchema = z.object({
  url: z.string().url('Invalid URL format').max(2048, 'URL too long'),
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  is_active: z.boolean().default(true),
});

export type CreateRssFeedInput = z.infer<typeof CreateRssFeedSchema>;

// Update RSS Feed input
export const UpdateRssFeedSchema = z.object({
  url: z.string().url('Invalid URL format').max(2048, 'URL too long').optional(),
  name: z.string().min(1, 'Name is required').max(255, 'Name too long').optional(),
  description: z.string().max(1000, 'Description too long').optional().nullable(),
  is_active: z.boolean().optional(),
});

export type UpdateRssFeedInput = z.infer<typeof UpdateRssFeedSchema>;

// Query parameters for listing feeds
export interface ListFeedsQuery {
  is_active?: boolean;
  limit: string;
  offset: string;
}

export const ListFeedsQuerySchema = z.object({
  is_active: z
    .string()
    .transform(val => val === 'true')
    .optional(),
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

// Bulk import schema (for CSV import)
export const BulkImportFeedSchema = z.object({
  feeds: z.array(
    z.object({
      url: z.string().url('Invalid URL format'),
      name: z.string().min(1, 'Name is required'),
      description: z.string().optional(),
    })
  ).min(1, 'At least one feed is required'),
});

export type BulkImportFeedInput = z.infer<typeof BulkImportFeedSchema>;

// Feed test result
export interface FeedTestResult {
  valid: boolean;
  url: string;
  title?: string;
  itemCount?: number;
  error?: string;
}
