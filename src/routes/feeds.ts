import { Router, Response } from 'express';
import {
  createFeed,
  getFeedById,
  listFeeds,
  updateFeed,
  deleteFeed,
  toggleFeedActive,
  testFeedUrl,
  bulkImportFeeds,
  exportFeedsToCSV,
} from '../services/feedService.js';
import {
  CreateRssFeedSchema,
  UpdateRssFeedSchema,
  ListFeedsQuerySchema,
  BulkImportFeedSchema,
} from '../models/RssFeed.js';
import { validateBody, validateQuery } from '../middleware/validation.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

// All feed routes require authentication
router.use(authenticateToken);

/**
 * GET /api/feeds
 * List all RSS feeds for the authenticated user
 */
router.get(
  '/',
  validateQuery(ListFeedsQuerySchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const { feeds, total } = await listFeeds(req.user.userId, req.query as any);

      res.json({
        success: true,
        data: {
          feeds,
          total,
          limit: req.query.limit,
          offset: req.query.offset,
        },
      });
    } catch (error: any) {
      console.error('List feeds error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list feeds',
      });
    }
  }
);

/**
 * GET /api/feeds/:id
 * Get a single RSS feed by ID
 */
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const feed = await getFeedById(req.params.id, req.user.userId);

    if (!feed) {
      res.status(404).json({
        success: false,
        error: 'Feed not found',
      });
      return;
    }

    res.json({
      success: true,
      data: { feed },
    });
  } catch (error: any) {
    console.error('Get feed error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get feed',
    });
  }
});

/**
 * POST /api/feeds
 * Create a new RSS feed
 */
router.post(
  '/',
  validateBody(CreateRssFeedSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const feed = await createFeed(req.user.userId, req.body);

      res.status(201).json({
        success: true,
        message: 'Feed created successfully',
        data: { feed },
      });
    } catch (error: any) {
      console.error('Create feed error:', error);

      if (error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create feed',
      });
    }
  }
);

/**
 * PUT /api/feeds/:id
 * Update an RSS feed
 */
router.put(
  '/:id',
  validateBody(UpdateRssFeedSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const feed = await updateFeed(req.params.id, req.user.userId, req.body);

      res.json({
        success: true,
        message: 'Feed updated successfully',
        data: { feed },
      });
    } catch (error: any) {
      console.error('Update feed error:', error);

      if (error.message === 'Feed not found') {
        res.status(404).json({
          success: false,
          error: 'Feed not found',
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update feed',
      });
    }
  }
);

/**
 * DELETE /api/feeds/:id
 * Delete an RSS feed
 */
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    await deleteFeed(req.params.id, req.user.userId);

    res.json({
      success: true,
      message: 'Feed deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete feed error:', error);

    if (error.message === 'Feed not found') {
      res.status(404).json({
        success: false,
        error: 'Feed not found',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete feed',
    });
  }
});

/**
 * PATCH /api/feeds/:id/toggle
 * Toggle feed active status
 */
router.patch('/:id/toggle', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const feed = await toggleFeedActive(req.params.id, req.user.userId);

    res.json({
      success: true,
      message: `Feed ${feed.is_active ? 'activated' : 'deactivated'} successfully`,
      data: { feed },
    });
  } catch (error: any) {
    console.error('Toggle feed error:', error);

    if (error.message === 'Feed not found') {
      res.status(404).json({
        success: false,
        error: 'Feed not found',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to toggle feed',
    });
  }
});

/**
 * POST /api/feeds/test
 * Test an RSS feed URL without saving
 */
router.post(
  '/test',
  validateBody(z.object({ url: z.string().url() })),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const result = await testFeedUrl(req.body.url);

      if (result.valid) {
        res.json({
          success: true,
          message: 'Feed is valid',
          data: result,
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Invalid feed',
          data: result,
        });
      }
    } catch (error: any) {
      console.error('Test feed error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to test feed',
      });
    }
  }
);

/**
 * POST /api/feeds/bulk-import
 * Bulk import feeds
 */
router.post(
  '/bulk-import',
  validateBody(BulkImportFeedSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const result = await bulkImportFeeds(req.user.userId, req.body.feeds);

      res.json({
        success: true,
        message: `Imported ${result.imported} feeds, skipped ${result.skipped}`,
        data: result,
      });
    } catch (error: any) {
      console.error('Bulk import error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to import feeds',
      });
    }
  }
);

/**
 * GET /api/feeds/export
 * Export feeds to CSV format
 */
router.get('/export/csv', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const csv = await exportFeedsToCSV(req.user.userId);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="rss-feeds.csv"');
    res.send(csv);
  } catch (error: any) {
    console.error('Export feeds error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export feeds',
    });
  }
});

export default router;
