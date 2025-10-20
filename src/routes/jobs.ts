import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import {
  createJob,
  getJobById,
  listJobs,
  getJobStats,
  cancelJob,
  getJobResults,
} from '../services/jobService.js';
import { progressTracker } from '../services/progressTracker.js';
import { CreateAnalysisJobSchema, ListJobsQuery } from '../models/AnalysisJob.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * POST /api/jobs
 * Create and start a new analysis job
 */
router.post(
  '/',
  validateRequest(CreateAnalysisJobSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const jobInput = req.body;

      const job = await createJob(userId, jobInput);

      res.status(201).json({
        success: true,
        data: {
          job,
          message: 'Job created and started. Use the progress endpoint to track status.',
        },
      });
    } catch (error: any) {
      console.error('Error creating job:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create job',
      });
    }
  }
);

/**
 * GET /api/jobs
 * List all jobs for the authenticated user
 */
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const filters: ListJobsQuery = {
      status: req.query.status as any,
      limit: (req.query.limit as string) || '50',
      offset: (req.query.offset as string) || '0',
    };

    const result = await listJobs(userId, filters);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error listing jobs:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to list jobs',
    });
  }
});

/**
 * GET /api/jobs/stats
 * Get job statistics for the authenticated user
 */
router.get('/stats', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const stats = await getJobStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Error getting job stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get job statistics',
    });
  }
});

/**
 * GET /api/jobs/:id
 * Get details for a specific job
 */
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const jobId = req.params.id;

    const job = await getJobById(jobId, userId);

    if (!job) {
      res.status(404).json({
        success: false,
        error: 'Job not found',
      });
      return;
    }

    res.json({
      success: true,
      data: { job },
    });
  } catch (error: any) {
    console.error('Error getting job:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get job',
    });
  }
});

/**
 * GET /api/jobs/:id/progress
 * Server-Sent Events endpoint for real-time progress tracking
 */
router.get('/:id/progress', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const jobId = req.params.id;

    // Verify job belongs to user
    const job = await getJobById(jobId, userId);
    if (!job) {
      res.status(404).json({
        success: false,
        error: 'Job not found',
      });
      return;
    }

    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Send initial progress state
    const currentProgress = progressTracker.getProgress(jobId);
    res.write(`data: ${JSON.stringify(currentProgress)}\n\n`);

    // If job is already completed/failed, close connection
    if (currentProgress && (currentProgress.status === 'completed' || currentProgress.status === 'failed')) {
      res.end();
      return;
    }

    // Listen for progress updates
    const progressHandler = (update: any) => {
      res.write(`data: ${JSON.stringify(update)}\n\n`);

      // Close connection if job is done
      if (update.status === 'completed' || update.status === 'failed') {
        res.end();
      }
    };

    progressTracker.on(`progress:${jobId}`, progressHandler);

    // Clean up when client disconnects
    req.on('close', () => {
      progressTracker.off(`progress:${jobId}`, progressHandler);
      res.end();
    });

    // Send keep-alive every 30 seconds
    const keepAliveInterval = setInterval(() => {
      res.write(':keep-alive\n\n');
    }, 30000);

    // Clean up interval on connection close
    req.on('close', () => {
      clearInterval(keepAliveInterval);
    });
  } catch (error: any) {
    console.error('Error in progress endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to track progress',
    });
  }
});

/**
 * GET /api/jobs/:id/results
 * Get analyzed articles for a completed job
 */
router.get('/:id/results', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const jobId = req.params.id;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const articles = await getJobResults(jobId, userId, limit, offset);

    res.json({
      success: true,
      data: {
        articles,
        limit,
        offset,
        count: articles.length,
      },
    });
  } catch (error: any) {
    console.error('Error getting job results:', error);

    if (error.message === 'Job not found') {
      res.status(404).json({
        success: false,
        error: 'Job not found',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get job results',
    });
  }
});

/**
 * DELETE /api/jobs/:id
 * Cancel a running job
 */
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const jobId = req.params.id;

    await cancelJob(jobId, userId);

    res.json({
      success: true,
      data: {
        message: 'Job cancelled successfully',
      },
    });
  } catch (error: any) {
    console.error('Error cancelling job:', error);

    if (error.message === 'Job not found or cannot be cancelled') {
      res.status(404).json({
        success: false,
        error: 'Job not found or cannot be cancelled',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to cancel job',
    });
  }
});

export default router;
