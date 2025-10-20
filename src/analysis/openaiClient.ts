import OpenAI from 'openai';
import PQueue from 'p-queue';
import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * OpenAI GPT-5 Client
 * Handles AI text analysis using OpenAI's GPT-5 models
 */

// Interface for cost tracking
export interface CostTracking {
  totalCost: number;
  inputTokens: number;
  outputTokens: number;
  lastUpdated: string;
  requestCount: number;
}

// GPT-5 Model pricing (as of 2025)
// Note: Update these based on actual OpenAI pricing
const MODEL_PRICING = {
  'gpt-5': {
    inputCostPer1k: 0.01,      // $0.01 per 1K input tokens
    outputCostPer1k: 0.03,     // $0.03 per 1K output tokens
  },
  'gpt-5-mini': {
    inputCostPer1k: 0.001,     // $0.001 per 1K input tokens
    outputCostPer1k: 0.003,    // $0.003 per 1K output tokens
  },
  'gpt-5-nano': {
    inputCostPer1k: 0.0001,    // $0.0001 per 1K input tokens
    outputCostPer1k: 0.0003,   // $0.0003 per 1K output tokens
  },
};

// Initialize OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

if (!process.env.OPENAI_API_KEY && process.env.NODE_ENV === 'production') {
  console.warn('WARNING: OPENAI_API_KEY not set in production environment!');
}

// Initialize request queue with rate limiting
const requestQueue = new PQueue({
  concurrency: parseInt(process.env.OPENAI_MAX_CONCURRENT || '10', 10),
  interval: 60 * 1000, // 1 minute
  intervalCap: parseInt(process.env.OPENAI_REQUESTS_PER_MINUTE || '60', 10),
  autoStart: true,
});

// Set up cost tracking file path
const costTrackingPath = path.join(
  process.env.OUTPUT_DIR || './output',
  'openai_cost_tracking.json'
);

// Initialize cost tracking with default values
let costTracking: CostTracking = {
  totalCost: 0,
  inputTokens: 0,
  outputTokens: 0,
  lastUpdated: new Date().toISOString(),
  requestCount: 0,
};

/**
 * Load existing cost tracking data
 */
export async function loadCostTracking(): Promise<void> {
  try {
    await fs.mkdir(path.dirname(costTrackingPath), { recursive: true });

    const data = await fs.readFile(costTrackingPath, 'utf-8');
    const loadedData = JSON.parse(data) as CostTracking;

    // Check if we need to reset for a new month
    const lastUpdated = new Date(loadedData.lastUpdated);
    const currentDate = new Date();

    if (
      lastUpdated.getMonth() !== currentDate.getMonth() ||
      lastUpdated.getFullYear() !== currentDate.getFullYear()
    ) {
      console.log('New month detected, resetting OpenAI cost tracking');
      await saveCostTracking();
    } else {
      costTracking = loadedData;
    }
  } catch (error) {
    console.log('No existing OpenAI cost tracking found, creating new one');
    await saveCostTracking();
  }
}

/**
 * Save cost tracking data to file
 */
export async function saveCostTracking(): Promise<void> {
  try {
    await fs.mkdir(path.dirname(costTrackingPath), { recursive: true });
    await fs.writeFile(
      costTrackingPath,
      JSON.stringify(costTracking, null, 2),
      'utf-8'
    );
  } catch (error) {
    console.error('Error saving OpenAI cost tracking:', error);
  }
}

/**
 * Calculate cost based on token usage and model
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: string = 'gpt-5-mini'
): number {
  const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING] || MODEL_PRICING['gpt-5-mini'];

  const inputCost = (inputTokens / 1000) * pricing.inputCostPer1k;
  const outputCost = (outputTokens / 1000) * pricing.outputCostPer1k;

  return inputCost + outputCost;
}

/**
 * Update cost tracking with new usage data
 */
export async function updateCostTracking(
  inputTokens: number,
  outputTokens: number,
  model: string
): Promise<void> {
  const cost = calculateCost(inputTokens, outputTokens, model);

  costTracking.totalCost += cost;
  costTracking.inputTokens += inputTokens;
  costTracking.outputTokens += outputTokens;
  costTracking.lastUpdated = new Date().toISOString();
  costTracking.requestCount += 1;

  await saveCostTracking();

  console.log(`Request cost: $${cost.toFixed(4)} (${model})`);
  console.log(`Total cost this month: $${costTracking.totalCost.toFixed(4)}`);
}

/**
 * Check if the current cost is under the monthly limit
 */
export async function checkCostLimit(): Promise<boolean> {
  await loadCostTracking();

  const costLimit = parseFloat(process.env.MONTHLY_COST_LIMIT || '20');

  if (costTracking.totalCost >= costLimit) {
    console.error(`Monthly cost limit of $${costLimit} reached!`);
    return false;
  }

  return true;
}

/**
 * Analyze text with OpenAI GPT-5
 */
export async function analyzeText(
  text: string,
  prompt: string,
  maxResponseTokens = 1000
): Promise<string | null> {
  // Check if we're under the cost limit
  const canProceed = await checkCostLimit();
  if (!canProceed) {
    console.error('Cannot analyze: Monthly cost limit reached');
    return 'RELEVANCE_SCORE: 0\nEXPLANATION: Analysis skipped due to cost limits.';
  }

  // Handle empty or undefined text gracefully
  const safeText = text || 'No content available';
  const model = process.env.OPENAI_MODEL || 'gpt-5-mini';

  try {
    // Estimate cost before making request
    const estimatedInputTokens = Math.ceil((safeText.length + prompt.length) / 4);
    const estimatedCost = calculateCost(estimatedInputTokens, maxResponseTokens, model);

    const costLimit = parseFloat(process.env.MONTHLY_COST_LIMIT || '20');
    if (costTracking.totalCost + estimatedCost > costLimit * 1.5) {
      console.error(`This request would exceed the monthly cost limit of $${costLimit}`);
      return 'RELEVANCE_SCORE: 0\nEXPLANATION: Analysis skipped due to cost constraints.';
    }

    // Add the request to the rate-limited queue
    const completion = await requestQueue.add(async () => {
      console.log(`Sending request to OpenAI API (${model}) with max_tokens=${maxResponseTokens}...`);

      return await client.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: prompt,
          },
          {
            role: 'user',
            content: safeText,
          },
        ],
        max_tokens: maxResponseTokens,
        temperature: 0.7,
      });
    });

    // Check if completion exists
    if (!completion) {
      console.error('No completion returned from OpenAI API');
      return 'RELEVANCE_SCORE: 0\nEXPLANATION: No analysis could be generated.';
    }

    // Extract usage information
    const usage = completion.usage;
    if (usage) {
      await updateCostTracking(usage.prompt_tokens, usage.completion_tokens, model);
    } else {
      // Fallback to estimates if usage not available
      console.warn('Token usage information not available in response, using estimates');
      await updateCostTracking(estimatedInputTokens, maxResponseTokens / 2, model);
    }

    // Extract content from response
    const responseContent = completion.choices[0]?.message?.content;

    if (!responseContent) {
      console.error('No content returned from OpenAI API');
      return 'RELEVANCE_SCORE: 0\nEXPLANATION: No analysis could be generated.';
    }

    return responseContent;
  } catch (error: any) {
    console.error('Error analyzing text with OpenAI:', error.message);

    // Handle specific OpenAI errors
    if (error.status === 429) {
      return 'RELEVANCE_SCORE: 0\nEXPLANATION: Rate limit exceeded, please try again later.';
    }

    if (error.status === 401) {
      return 'RELEVANCE_SCORE: 0\nEXPLANATION: Invalid API key.';
    }

    return `RELEVANCE_SCORE: 0\nEXPLANATION: Error during analysis: ${error.message}`;
  }
}

/**
 * Get current cost information
 */
export async function getCostInformation(): Promise<CostTracking> {
  await loadCostTracking();
  return { ...costTracking };
}

/**
 * Get model information
 */
export function getModelInfo(): {
  model: string;
  pricing: { inputCostPer1k: number; outputCostPer1k: number };
} {
  const model = process.env.OPENAI_MODEL || 'gpt-5-mini';
  const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING] || MODEL_PRICING['gpt-5-mini'];

  return { model, pricing };
}

// Initialize the cost tracking on module load
loadCostTracking().catch(err => console.error('Failed to load OpenAI cost tracking:', err));
