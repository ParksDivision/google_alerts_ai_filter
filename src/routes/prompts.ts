import { Router, Response } from 'express';
import {
  createPrompt,
  getPromptById,
  listPrompts,
  updatePrompt,
  deletePrompt,
  setDefaultPrompt,
  getDefaultPrompt,
  getPromptsWithStats,
  duplicatePrompt,
} from '../services/promptService.js';
import {
  CreateAnalysisPromptSchema,
  UpdateAnalysisPromptSchema,
  ListPromptsQuerySchema,
} from '../models/AnalysisPrompt.js';
import { validateBody, validateQuery } from '../middleware/validation.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

// All prompt routes require authentication
router.use(authenticateToken);

/**
 * GET /api/prompts
 * List all analysis prompts for the authenticated user
 */
router.get(
  '/',
  validateQuery(ListPromptsQuerySchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const { prompts, total } = await listPrompts(req.user.userId, req.query as any);

      res.json({
        success: true,
        data: {
          prompts,
          total,
          limit: req.query.limit,
          offset: req.query.offset,
        },
      });
    } catch (error: any) {
      console.error('List prompts error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list prompts',
      });
    }
  }
);

/**
 * GET /api/prompts/stats
 * Get prompts with usage statistics
 */
router.get('/stats', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const prompts = await getPromptsWithStats(req.user.userId);

    res.json({
      success: true,
      data: { prompts },
    });
  } catch (error: any) {
    console.error('Get prompts stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get prompt statistics',
    });
  }
});

/**
 * GET /api/prompts/default
 * Get the default prompt for the user
 */
router.get('/default', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const prompt = await getDefaultPrompt(req.user.userId);

    if (!prompt) {
      res.status(404).json({
        success: false,
        error: 'No default prompt set',
      });
      return;
    }

    res.json({
      success: true,
      data: { prompt },
    });
  } catch (error: any) {
    console.error('Get default prompt error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get default prompt',
    });
  }
});

/**
 * GET /api/prompts/:id
 * Get a single analysis prompt by ID
 */
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const prompt = await getPromptById(req.params.id, req.user.userId);

    if (!prompt) {
      res.status(404).json({
        success: false,
        error: 'Prompt not found',
      });
      return;
    }

    res.json({
      success: true,
      data: { prompt },
    });
  } catch (error: any) {
    console.error('Get prompt error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get prompt',
    });
  }
});

/**
 * POST /api/prompts
 * Create a new analysis prompt
 */
router.post(
  '/',
  validateBody(CreateAnalysisPromptSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const prompt = await createPrompt(req.user.userId, req.body);

      res.status(201).json({
        success: true,
        message: 'Prompt created successfully',
        data: { prompt },
      });
    } catch (error: any) {
      console.error('Create prompt error:', error);

      if (error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create prompt',
      });
    }
  }
);

/**
 * PUT /api/prompts/:id
 * Update an analysis prompt
 */
router.put(
  '/:id',
  validateBody(UpdateAnalysisPromptSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const prompt = await updatePrompt(req.params.id, req.user.userId, req.body);

      res.json({
        success: true,
        message: 'Prompt updated successfully',
        data: { prompt },
      });
    } catch (error: any) {
      console.error('Update prompt error:', error);

      if (error.message === 'Prompt not found') {
        res.status(404).json({
          success: false,
          error: 'Prompt not found',
        });
        return;
      }

      if (error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update prompt',
      });
    }
  }
);

/**
 * DELETE /api/prompts/:id
 * Delete an analysis prompt
 */
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    await deletePrompt(req.params.id, req.user.userId);

    res.json({
      success: true,
      message: 'Prompt deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete prompt error:', error);

    if (error.message === 'Prompt not found') {
      res.status(404).json({
        success: false,
        error: 'Prompt not found',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete prompt',
    });
  }
});

/**
 * PATCH /api/prompts/:id/default
 * Set a prompt as the default
 */
router.patch('/:id/default', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const prompt = await setDefaultPrompt(req.params.id, req.user.userId);

    res.json({
      success: true,
      message: 'Prompt set as default successfully',
      data: { prompt },
    });
  } catch (error: any) {
    console.error('Set default prompt error:', error);

    if (error.message === 'Prompt not found') {
      res.status(404).json({
        success: false,
        error: 'Prompt not found',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to set default prompt',
    });
  }
});

/**
 * POST /api/prompts/:id/duplicate
 * Duplicate a prompt with a new name
 */
router.post(
  '/:id/duplicate',
  validateBody(z.object({ name: z.string().min(1).max(255) })),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const prompt = await duplicatePrompt(req.params.id, req.user.userId, req.body.name);

      res.status(201).json({
        success: true,
        message: 'Prompt duplicated successfully',
        data: { prompt },
      });
    } catch (error: any) {
      console.error('Duplicate prompt error:', error);

      if (error.message === 'Prompt not found') {
        res.status(404).json({
          success: false,
          error: 'Prompt not found',
        });
        return;
      }

      if (error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to duplicate prompt',
      });
    }
  }
);

export default router;
