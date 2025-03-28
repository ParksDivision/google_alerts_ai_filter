import Anthropic from '@anthropic-ai/sdk';
import PQueue from 'p-queue';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import CONFIG from '../config.js';

// Interface for cost tracking
export interface CostTracking {
  totalCost: number;
  inputTokens: number;
  outputTokens: number;
  lastUpdated: string;
  requestCount: number;
}

// Initialize Anthropic client with API key validation
const client = new Anthropic({
  apiKey: CONFIG.claude.apiKey || process.env.ANTHROPIC_API_KEY,
});

// Initialize request queue with rate limiting
const requestQueue = new PQueue({
  concurrency: CONFIG.claude.maxConcurrent,
  interval: 60 * 1000, // 1 minute
  intervalCap: CONFIG.claude.requestsPerMinute, // Max requests per minute
  autoStart: true
});

// Set up cost tracking file path
const costTrackingPath = path.join(CONFIG.outputDir, 'claude_cost_tracking.json');

// Initialize cost tracking with default values
let costTracking: CostTracking = {
  totalCost: 0,
  inputTokens: 0,
  outputTokens: 0,
  lastUpdated: new Date().toISOString(),
  requestCount: 0
};

/**
 * Load existing cost tracking data
 */
export async function loadCostTracking(): Promise<void> {
  try {
    // Create output directory if it doesn't exist
    await fs.mkdir(path.dirname(costTrackingPath), { recursive: true });
    
    const data = await fs.readFile(costTrackingPath, 'utf-8');
    const loadedData = JSON.parse(data) as CostTracking;
    
    // Check if we need to reset for a new month
    const lastUpdated = new Date(loadedData.lastUpdated);
    const currentDate = new Date();
    
    if (lastUpdated.getMonth() !== currentDate.getMonth() || 
        lastUpdated.getFullYear() !== currentDate.getFullYear()) {
      console.log('New month detected, resetting cost tracking');
      await saveCostTracking(); // Save with default values
    } else {
      costTracking = loadedData;
    }
  } catch (error) {
    console.log('No existing cost tracking found, creating new one');
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
    console.error('Error saving cost tracking:', error);
  }
}

/**
 * Calculate cost based on token usage
 */
export function calculateCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1000) * CONFIG.claude.haiku_input_cost_per_1k;
  const outputCost = (outputTokens / 1000) * CONFIG.claude.haiku_output_cost_per_1k;
  return inputCost + outputCost;
}

/**
 * Update cost tracking with new usage data
 */
export async function updateCostTracking(inputTokens: number, outputTokens: number): Promise<void> {
  const cost = calculateCost(inputTokens, outputTokens);
  
  costTracking.totalCost += cost;
  costTracking.inputTokens += inputTokens;
  costTracking.outputTokens += outputTokens;
  costTracking.lastUpdated = new Date().toISOString();
  costTracking.requestCount += 1;
  
  await saveCostTracking();
  
  console.log(`Request cost: $${cost.toFixed(4)}`);
  console.log(`Total cost this month: $${costTracking.totalCost.toFixed(4)}`);
}

/**
 * Check if the current cost is under the monthly limit
 */
export async function checkCostLimit(): Promise<boolean> {
  // Make sure we have the latest cost data
  await loadCostTracking();
  
  // Check if we're close to the cost limit
  if (costTracking.totalCost >= CONFIG.claude.monthlyCostLimit) {
    console.error(`Monthly cost limit of $${CONFIG.claude.monthlyCostLimit} reached!`);
    return false;
  }
  
  return true;
}

/**
 * Analyze text with Claude API
 */
export async function analyzeText(
  text: string, 
  prompt: string, 
  maxResponseTokens = 1000
): Promise<string | null> {
  // Check if we're under the cost limit
  const canProceed = await checkCostLimit();
  if (!canProceed) {
    return null;
  }
  
  try {
    // Estimate tokens in the inputs (very rough estimation)
    const estimatedInputTokens = Math.ceil((text.length + prompt.length) / 4);
    
    // Check if estimated cost would exceed limit
    const estimatedCost = calculateCost(
      estimatedInputTokens, 
      maxResponseTokens
    );
    
    if (costTracking.totalCost + estimatedCost > CONFIG.claude.monthlyCostLimit) {
      console.error(`This request would exceed the monthly cost limit of $${CONFIG.claude.monthlyCostLimit}`);
      return null;
    }
    
    // Add the request to the rate-limited queue
    const message = await requestQueue.add(() => 
      client.messages.create({
        model: CONFIG.claude.model,
        max_tokens: maxResponseTokens,
        messages: [
          {
            role: 'user',
            content: `${prompt}\n\nText to analyze:\n\n${text}`,
          },
        ],
      })
    );
    
    // Update cost tracking with actual token usage
    await updateCostTracking(
      message.usage.input_tokens,
      message.usage.output_tokens
    );
    
    return message.content[0].text;
  } catch (error: any) {
    console.error('Error analyzing text with Claude:', error.message);
    return null;
  }
}

/**
 * Get current cost information
 */
export async function getCostInformation(): Promise<CostTracking> {
  await loadCostTracking();
  return { ...costTracking };
}

// Initialize the cost tracking on module load
loadCostTracking().catch(err => console.error('Failed to load cost tracking:', err));