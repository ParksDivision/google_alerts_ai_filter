export interface CostTracking {
    totalCost: number;
    inputTokens: number;
    outputTokens: number;
    lastUpdated: string;
    requestCount: number;
}
/**
 * Load existing cost tracking data
 */
export declare function loadCostTracking(): Promise<void>;
/**
 * Save cost tracking data to file
 */
export declare function saveCostTracking(): Promise<void>;
/**
 * Calculate cost based on token usage
 * Current Claude Haiku pricing: $0.00025/1K input tokens, $0.00125/1K output tokens
 */
export declare function calculateCost(inputTokens: number, outputTokens: number): number;
/**
 * Update cost tracking with new usage data
 */
export declare function updateCostTracking(inputTokens: number, outputTokens: number): Promise<void>;
/**
 * Check if the current cost is under the monthly limit
 */
export declare function checkCostLimit(): Promise<boolean>;
/**
 * Analyze text with Claude API
 */
export declare function analyzeText(text: string, prompt: string, maxResponseTokens?: number): Promise<string | null>;
/**
 * Get current cost information
 */
export declare function getCostInformation(): Promise<CostTracking>;
