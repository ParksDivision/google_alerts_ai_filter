import { query, transaction } from '../db/connection.js';
import {
  RssFeed,
  CreateRssFeedInput,
  UpdateRssFeedInput,
  ListFeedsQuery,
  FeedTestResult,
} from '../models/RssFeed.js';
import Parser from 'rss-parser';

const parser = new Parser();

/**
 * RSS Feed Service
 * Handles CRUD operations for RSS feeds
 */

/**
 * Create a new RSS feed
 */
export async function createFeed(
  userId: string,
  input: CreateRssFeedInput
): Promise<RssFeed> {
  // Check if feed URL already exists for this user
  const existing = await query<RssFeed>(
    'SELECT id FROM rss_feeds WHERE user_id = $1 AND url = $2',
    [userId, input.url]
  );

  if (existing.rows.length > 0) {
    throw new Error('Feed with this URL already exists');
  }

  // Create feed
  const result = await query<RssFeed>(
    `INSERT INTO rss_feeds (user_id, url, name, description, is_active)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, input.url, input.name, input.description || null, input.is_active ?? true]
  );

  return result.rows[0];
}

/**
 * Get feed by ID
 */
export async function getFeedById(
  feedId: string,
  userId: string
): Promise<RssFeed | null> {
  const result = await query<RssFeed>(
    'SELECT * FROM rss_feeds WHERE id = $1 AND user_id = $2',
    [feedId, userId]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * List all feeds for a user
 */
export async function listFeeds(
  userId: string,
  filters: ListFeedsQuery = { limit: '50', offset: '0' }
): Promise<{ feeds: RssFeed[]; total: number }> {
  // Build query dynamically based on filters
  const conditions: string[] = ['user_id = $1'];
  const params: any[] = [userId];
  let paramIndex = 2;

  if (filters.is_active !== undefined) {
    conditions.push(`is_active = $${paramIndex++}`);
    params.push(filters.is_active);
  }

  const whereClause = conditions.join(' AND ');

  // Get total count
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM rss_feeds WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Get feeds with pagination
  params.push(filters.limit, filters.offset);
  const result = await query<RssFeed>(
    `SELECT * FROM rss_feeds
     WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    params
  );

  return {
    feeds: result.rows,
    total,
  };
}

/**
 * Update feed
 */
export async function updateFeed(
  feedId: string,
  userId: string,
  updates: UpdateRssFeedInput
): Promise<RssFeed> {
  // Check if feed exists and belongs to user
  const existing = await getFeedById(feedId, userId);
  if (!existing) {
    throw new Error('Feed not found');
  }

  // Build update query dynamically
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.url !== undefined) {
    setClauses.push(`url = $${paramIndex++}`);
    values.push(updates.url);
  }

  if (updates.name !== undefined) {
    setClauses.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }

  if (updates.description !== undefined) {
    setClauses.push(`description = $${paramIndex++}`);
    values.push(updates.description);
  }

  if (updates.is_active !== undefined) {
    setClauses.push(`is_active = $${paramIndex++}`);
    values.push(updates.is_active);
  }

  if (setClauses.length === 0) {
    // No updates, just return existing feed
    return existing;
  }

  // Add updated_at
  setClauses.push(`updated_at = CURRENT_TIMESTAMP`);

  // Add feedId and userId for WHERE clause
  values.push(feedId, userId);

  const result = await query<RssFeed>(
    `UPDATE rss_feeds
     SET ${setClauses.join(', ')}
     WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
     RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new Error('Feed not found');
  }

  return result.rows[0];
}

/**
 * Delete feed
 */
export async function deleteFeed(feedId: string, userId: string): Promise<void> {
  const result = await query(
    'DELETE FROM rss_feeds WHERE id = $1 AND user_id = $2',
    [feedId, userId]
  );

  if (result.rowCount === 0) {
    throw new Error('Feed not found');
  }
}

/**
 * Toggle feed active status
 */
export async function toggleFeedActive(
  feedId: string,
  userId: string
): Promise<RssFeed> {
  const result = await query<RssFeed>(
    `UPDATE rss_feeds
     SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [feedId, userId]
  );

  if (result.rows.length === 0) {
    throw new Error('Feed not found');
  }

  return result.rows[0];
}

/**
 * Test RSS feed URL
 * Attempts to fetch and parse the feed
 */
export async function testFeedUrl(url: string): Promise<FeedTestResult> {
  try {
    const feed = await parser.parseURL(url);

    return {
      valid: true,
      url,
      title: feed.title,
      itemCount: feed.items.length,
    };
  } catch (error: any) {
    return {
      valid: false,
      url,
      error: error.message || 'Failed to fetch or parse feed',
    };
  }
}

/**
 * Update feed fetch statistics
 */
export async function updateFeedStats(
  feedId: string,
  success: boolean,
  error?: string
): Promise<void> {
  if (success) {
    await query(
      `UPDATE rss_feeds
       SET last_fetched_at = CURRENT_TIMESTAMP,
           fetch_count = fetch_count + 1,
           last_error = NULL
       WHERE id = $1`,
      [feedId]
    );
  } else {
    await query(
      `UPDATE rss_feeds
       SET last_fetched_at = CURRENT_TIMESTAMP,
           fetch_count = fetch_count + 1,
           error_count = error_count + 1,
           last_error = $2
       WHERE id = $1`,
      [feedId, error || 'Unknown error']
    );
  }
}

/**
 * Bulk import feeds
 */
export async function bulkImportFeeds(
  userId: string,
  feeds: Array<{ url: string; name: string; description?: string }>
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  await transaction(async (client) => {
    for (const feed of feeds) {
      try {
        // Check if feed already exists
        const existing = await client.query(
          'SELECT id FROM rss_feeds WHERE user_id = $1 AND url = $2',
          [userId, feed.url]
        );

        if (existing.rows.length > 0) {
          skipped++;
          continue;
        }

        // Import feed
        await client.query(
          `INSERT INTO rss_feeds (user_id, url, name, description)
           VALUES ($1, $2, $3, $4)`,
          [userId, feed.url, feed.name, feed.description || null]
        );

        imported++;
      } catch (error: any) {
        errors.push(`${feed.url}: ${error.message}`);
      }
    }
  });

  return { imported, skipped, errors };
}

/**
 * Get feeds by IDs (for job processing)
 */
export async function getFeedsByIds(
  userId: string,
  feedIds: string[]
): Promise<RssFeed[]> {
  if (feedIds.length === 0) {
    return [];
  }

  const placeholders = feedIds.map((_, i) => `$${i + 2}`).join(', ');
  const result = await query<RssFeed>(
    `SELECT * FROM rss_feeds
     WHERE user_id = $1 AND id IN (${placeholders}) AND is_active = true`,
    [userId, ...feedIds]
  );

  return result.rows;
}

/**
 * Get all active feeds for a user (for job processing)
 */
export async function getActiveFeeds(userId: string): Promise<RssFeed[]> {
  const result = await query<RssFeed>(
    'SELECT * FROM rss_feeds WHERE user_id = $1 AND is_active = true ORDER BY name',
    [userId]
  );

  return result.rows;
}

/**
 * Export feeds to CSV format
 */
export async function exportFeedsToCSV(userId: string): Promise<string> {
  const feeds = await getActiveFeeds(userId);

  // CSV header
  let csv = 'Feed URL,Alert Name,Description\n';

  // CSV rows
  for (const feed of feeds) {
    const url = `"${feed.url.replace(/"/g, '""')}"`;
    const name = `"${feed.name.replace(/"/g, '""')}"`;
    const description = feed.description
      ? `"${feed.description.replace(/"/g, '""')}"`
      : '""';

    csv += `${url},${name},${description}\n`;
  }

  return csv;
}
