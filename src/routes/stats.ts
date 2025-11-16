import { Router, Response } from 'express';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';
import { getCostInformation as getClaudeCost } from '../analysis/claudeClient.js';
import { getCostInformation as getOpenAICost } from '../analysis/openaiClient.js';
import CONFIG from '../config.js';

const router = Router();

/**
 * GET /api/stats/cost
 * Get AI API cost tracking information for the current month
 */
router.get('/cost', authenticateToken, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Get cost information from both AI providers
    const claudeCost = await getClaudeCost();
    const openaiCost = await getOpenAICost();

    // Calculate combined totals
    const totalCost = claudeCost.totalCost + openaiCost.totalCost;
    const totalInputTokens = claudeCost.inputTokens + openaiCost.inputTokens;
    const totalOutputTokens = claudeCost.outputTokens + openaiCost.outputTokens;
    const totalRequests = claudeCost.requestCount + openaiCost.requestCount;

    // Get the monthly cost limit from config
    const costLimit = CONFIG.claude.monthlyCostLimit;
    const percentOfLimit = (totalCost / costLimit) * 100;

    // Determine which AI provider is being used
    const primaryProvider = process.env.CLAUDE_API_KEY ? 'claude' :
                           process.env.OPENAI_API_KEY ? 'openai' : 'none';

    res.json({
      success: true,
      data: {
        // Combined totals
        total: {
          cost: parseFloat(totalCost.toFixed(4)),
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          totalTokens: totalInputTokens + totalOutputTokens,
          requests: totalRequests,
        },

        // Cost limit information
        limit: {
          monthly: parseFloat(costLimit.toFixed(2)),
          remaining: parseFloat(Math.max(0, costLimit - totalCost).toFixed(4)),
          percentUsed: parseFloat(percentOfLimit.toFixed(2)),
          isNearLimit: percentOfLimit >= 80,
          isOverLimit: totalCost >= costLimit,
        },

        // Per-provider breakdown
        providers: {
          claude: {
            cost: parseFloat(claudeCost.totalCost.toFixed(4)),
            inputTokens: claudeCost.inputTokens,
            outputTokens: claudeCost.outputTokens,
            requests: claudeCost.requestCount,
            lastUpdated: claudeCost.lastUpdated,
            model: CONFIG.claude.model,
            isActive: primaryProvider === 'claude',
          },
          openai: {
            cost: parseFloat(openaiCost.totalCost.toFixed(4)),
            inputTokens: openaiCost.inputTokens,
            outputTokens: openaiCost.outputTokens,
            requests: openaiCost.requestCount,
            lastUpdated: openaiCost.lastUpdated,
            model: CONFIG.openai.model,
            isActive: primaryProvider === 'openai',
          },
        },

        // Current configuration
        config: {
          primaryProvider,
          model: primaryProvider === 'claude' ? CONFIG.claude.model : CONFIG.openai.model,
          rateLimits: {
            claude: {
              requestsPerMinute: CONFIG.claude.requestsPerMinute,
              maxConcurrent: CONFIG.claude.maxConcurrent,
              maxTokens: CONFIG.claude.maxTokensPerRequest,
            },
            openai: {
              requestsPerMinute: CONFIG.openai.requestsPerMinute,
              maxConcurrent: CONFIG.openai.maxConcurrent,
              maxTokens: CONFIG.openai.maxTokensPerRequest,
            },
          },
        },

        // Metadata
        period: {
          month: new Date().toISOString().substring(0, 7), // YYYY-MM format
          resetsOn: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching cost information:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve cost information',
    });
  }
});

export default router;
