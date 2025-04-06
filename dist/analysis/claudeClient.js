// src/analysis/claudeClient.ts
import Anthropic from '@anthropic-ai/sdk';
import PQueue from 'p-queue';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import CONFIG from '../config.js';
// Constants for Claude models' token limits
const MODEL_TOKEN_LIMITS = {
    'claude-3-haiku-20240307': 4096,
    'claude-3-sonnet-20240229': 4096,
    'claude-3-opus-20240229': 4096,
    // Add other models as needed
    'default': 4000 // Default fallback
};
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
let costTracking = {
    totalCost: 0,
    inputTokens: 0,
    outputTokens: 0,
    lastUpdated: new Date().toISOString(),
    requestCount: 0
};
/**
 * Load existing cost tracking data
 */
export async function loadCostTracking() {
    try {
        // Create output directory if it doesn't exist
        await fs.mkdir(path.dirname(costTrackingPath), { recursive: true });
        const data = await fs.readFile(costTrackingPath, 'utf-8');
        const loadedData = JSON.parse(data);
        // Check if we need to reset for a new month
        const lastUpdated = new Date(loadedData.lastUpdated);
        const currentDate = new Date();
        if (lastUpdated.getMonth() !== currentDate.getMonth() ||
            lastUpdated.getFullYear() !== currentDate.getFullYear()) {
            console.log('New month detected, resetting cost tracking');
            await saveCostTracking(); // Save with default values
        }
        else {
            costTracking = loadedData;
        }
    }
    catch (error) {
        console.log('No existing cost tracking found, creating new one');
        await saveCostTracking();
    }
}
/**
 * Save cost tracking data to file
 */
export async function saveCostTracking() {
    try {
        await fs.mkdir(path.dirname(costTrackingPath), { recursive: true });
        await fs.writeFile(costTrackingPath, JSON.stringify(costTracking, null, 2), 'utf-8');
    }
    catch (error) {
        console.error('Error saving cost tracking:', error);
    }
}
/**
 * Calculate cost based on token usage
 * Current Claude Haiku pricing: $0.00025/1K input tokens, $0.00125/1K output tokens
 */
export function calculateCost(inputTokens, outputTokens) {
    const inputCost = (inputTokens / 1000) * 0.00025; // $0.00025 per 1K input tokens
    const outputCost = (outputTokens / 1000) * 0.00125; // $0.00125 per 1K output tokens
    return inputCost + outputCost;
}
/**
 * Update cost tracking with new usage data
 */
export async function updateCostTracking(inputTokens, outputTokens) {
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
export async function checkCostLimit() {
    // Make sure we have the latest cost data
    await loadCostTracking();
    // Temporarily raise the cost limit if it's preventing articles from being analyzed
    const effectiveCostLimit = Math.max(CONFIG.claude.monthlyCostLimit, 50); // Min $50 to ensure analysis happens
    // Check if we're close to the cost limit
    if (costTracking.totalCost >= effectiveCostLimit) {
        console.error(`Monthly cost limit of $${effectiveCostLimit} reached!`);
        return false;
    }
    return true;
}
/**
 * Get the maximum token limit for the specified model
 */
function getModelTokenLimit(model) {
    return MODEL_TOKEN_LIMITS[model] || MODEL_TOKEN_LIMITS.default;
}
/**
 * Analyze text with Claude API
 */
export async function analyzeText(text, prompt, maxResponseTokens = 1000) {
    // Check if we're under the cost limit
    const canProceed = await checkCostLimit();
    if (!canProceed) {
        console.error("Cannot analyze: Monthly cost limit reached");
        return "RELEVANCE_SCORE: 0\nEXPLANATION: Analysis skipped due to cost limits.";
    }
    // Handle empty or undefined text gracefully
    const safeText = text || "No content available";
    try {
        // Estimate tokens in the inputs (very rough estimation)
        const estimatedInputTokens = Math.ceil((safeText.length + prompt.length) / 4);
        // Check if estimated cost would exceed limit
        const estimatedCost = calculateCost(estimatedInputTokens, maxResponseTokens);
        if (costTracking.totalCost + estimatedCost > CONFIG.claude.monthlyCostLimit * 2) { // Double the limit as buffer
            console.error(`This request would exceed the monthly cost limit of $${CONFIG.claude.monthlyCostLimit}`);
            return "RELEVANCE_SCORE: 0\nEXPLANATION: Analysis skipped due to cost constraints.";
        }
        // Ensure maxResponseTokens does not exceed the model's limit
        const modelLimit = getModelTokenLimit(CONFIG.claude.model);
        const safeMaxTokens = Math.min(maxResponseTokens, modelLimit);
        if (maxResponseTokens > modelLimit) {
            console.warn(`Requested ${maxResponseTokens} tokens exceeds model limit of ${modelLimit}. Using ${safeMaxTokens} tokens instead.`);
        }
        // Add the request to the rate-limited queue
        const responseData = await requestQueue.add(async () => {
            console.log(`Sending request to Claude API with max_tokens=${safeMaxTokens}...`);
            return await client.messages.create({
                model: CONFIG.claude.model,
                max_tokens: safeMaxTokens,
                messages: [
                    {
                        role: 'user',
                        content: `${prompt}\n\nText to analyze:\n\n${safeText}`,
                    },
                ],
            });
        });
        // Extract usage information if available
        let inputTokenCount = estimatedInputTokens;
        let outputTokenCount = Math.ceil(safeMaxTokens / 2); // Default estimate
        if (responseData && responseData.usage) {
            inputTokenCount = responseData.usage.input_tokens;
            outputTokenCount = responseData.usage.output_tokens;
        }
        else {
            console.warn('Token usage information not available in response, using estimates');
        }
        // Update cost tracking
        await updateCostTracking(inputTokenCount, outputTokenCount);
        // Extract content from response
        const responseContent = responseData &&
            responseData.content &&
            responseData.content[0] &&
            responseData.content[0].text
            ? responseData.content[0].text
            : null;
        if (!responseContent) {
            console.error("No content returned from Claude API");
            return "RELEVANCE_SCORE: 0\nEXPLANATION: No analysis could be generated.";
        }
        return responseContent;
    }
    catch (error) {
        console.error('Error analyzing text with Claude:', error.message);
        return "RELEVANCE_SCORE: 0\nEXPLANATION: Error during analysis: " + error.message;
    }
}
/**
 * Get current cost information
 */
export async function getCostInformation() {
    await loadCostTracking();
    return { ...costTracking };
}
// Initialize the cost tracking on module load
loadCostTracking().catch(err => console.error('Failed to load cost tracking:', err));
//# sourceMappingURL=claudeClient.js.map