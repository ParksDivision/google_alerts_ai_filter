import { analyzeText } from './claudeClient.js';
import CONFIG from '../config.js';
/**
 * Creates a prompt for analyzing multiple articles' relevance based on criteria
 */
export function createBatchAnalysisPrompt(criteria, articlesCount) {
    return `
You are an expert content analyzer. Your task is to analyze ${articlesCount} articles and determine their relevance based on the following criteria:

${criteria}

I will provide each article with a unique ID. For each article, you must provide:
1. A relevance score between 0 and 100, where 100 is extremely relevant and 0 is not relevant at all.
2. A brief explanation (2-3 sentences) of why you assigned this score.

Evaluate EACH article independently based on the criteria.

Format your response EXACTLY like this for EACH article:
ARTICLE_ID: [id]
RELEVANCE_SCORE: [score]
EXPLANATION: [your brief explanation]

Make sure to include ALL article IDs in your response, maintaining the exact format shown above for each article.

It's critical that you follow this exact format with these exact labels and correct article IDs.
Remember to only focus on the criteria provided. Be objective and consistent in your evaluation.
`.trim();
}
/**
 * Parses the batch analysis result from Claude with enhanced error handling
 */
export function parseBatchAnalysisResult(result, expectedArticleIds) {
    const articleResults = new Map();
    if (!result) {
        console.error("Failed to get a response from Claude");
        return articleResults;
    }
    console.log("Parsing Claude response...");
    // Try multiple parsing approaches to handle different response formats
    // First approach: Try the regex split method
    const articleSections = result.split(/ARTICLE_ID:\s*(\d+)/);
    // Start from index 1 since splitting with capture groups will put the first match at index 1
    for (let i = 1; i < articleSections.length; i += 2) {
        if (i + 1 >= articleSections.length)
            break;
        const articleId = articleSections[i].trim();
        const articleContent = articleSections[i + 1].trim();
        // Extract score with pattern matching
        const scoreMatch = articleContent.match(/RELEVANCE_SCORE:\s*(\d+)/);
        const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
        // Extract explanation with pattern matching
        const explanationMatch = articleContent.match(/EXPLANATION:\s*([\s\S]+?)(?=ARTICLE_ID:|$)/);
        const explanation = explanationMatch
            ? explanationMatch[1].trim()
            : 'No explanation provided';
        articleResults.set(articleId, {
            score: Math.min(Math.max(score, 0), 100), // Ensure score is between 0-100
            explanation
        });
        // Log processing for debugging
        if (!scoreMatch) {
            console.warn(`Failed to extract score for article ID ${articleId}`);
        }
    }
    // If we didn't get any results with the first approach, try a simpler approach
    if (articleResults.size === 0) {
        console.log("First parsing approach failed, trying alternative...");
        // Backup approach: Try to find each article ID directly
        for (const articleId of expectedArticleIds) {
            const idPattern = new RegExp(`ARTICLE_ID:\\s*${articleId}[\\s\\S]*?(?=ARTICLE_ID:|$)`, 'i');
            const match = result.match(idPattern);
            if (match && match[0]) {
                const section = match[0];
                // Extract score
                const scoreMatch = section.match(/RELEVANCE_SCORE:\s*(\d+)/);
                const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
                // Extract explanation
                const explanationMatch = section.match(/EXPLANATION:\s*([\s\S]+?)(?=ARTICLE_ID:|$)/);
                const explanation = explanationMatch
                    ? explanationMatch[1].trim()
                    : 'No explanation provided';
                articleResults.set(articleId, {
                    score: Math.min(Math.max(score, 0), 100),
                    explanation
                });
            }
        }
    }
    // Check if we're missing any expected article IDs
    for (const id of expectedArticleIds) {
        if (!articleResults.has(id)) {
            console.warn(`Result for article ID ${id} not found in Claude's response`);
            // Add a default entry with a score of 0
            articleResults.set(id, {
                score: 0,
                explanation: "Could not extract result from Claude's response"
            });
        }
    }
    console.log(`Successfully parsed ${articleResults.size} article results`);
    return articleResults;
}
/**
 * Process articles in batches to reduce Claude API calls
 */
export async function analyzeArticlesBatch(articles, criteria, batchSize = CONFIG.performance.batchSize) {
    console.log(`Starting batch analysis of ${articles.length} articles...`);
    // Limit batch size to 1 article to reduce errors
    const maxSafeBatchSize = 1; // Process one article at a time for maximum reliability
    const actualBatchSize = Math.min(batchSize, maxSafeBatchSize);
    if (batchSize > maxSafeBatchSize) {
        console.warn(`Reducing batch size from ${batchSize} to ${maxSafeBatchSize} for increased reliability`);
    }
    const results = [];
    const batches = [];
    // Split articles into batches
    for (let i = 0; i < articles.length; i += actualBatchSize) {
        batches.push(articles.slice(i, i + actualBatchSize));
    }
    console.log(`Created ${batches.length} batches with max ${actualBatchSize} articles per batch`);
    let successCount = 0;
    let errorCount = 0;
    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} articles`);
        // Build the batch content
        let batchContent = '';
        // Keep track of expected article IDs
        const expectedArticleIds = [];
        batch.forEach((article, index) => {
            // Use the index within the batch as a unique ID
            const articleId = `${index + 1}`;
            expectedArticleIds.push(articleId);
            const articleContent = article.content || '';
            // Create a text excerpt if the content is too long
            // Use 7500 character limit per article as requested
            const maxContentLength = 7500;
            const truncatedContent = articleContent.length > maxContentLength
                ? articleContent.substring(0, maxContentLength) + '...[truncated]'
                : articleContent;
            // Add article to batch with ID, title, source, and content
            batchContent += `\n\nARTICLE_ID: ${articleId}\n`;
            batchContent += `TITLE: ${article.title || 'No title available'}\n`;
            batchContent += `URL: ${article.link || 'No URL available'}\n`;
            batchContent += `SOURCE: ${article.alertName || 'Unknown source'}\n`;
            batchContent += `CONTENT:\n${truncatedContent || 'No content available'}\n`;
        });
        // Generate the prompt
        const prompt = createBatchAnalysisPrompt(criteria, batch.length);
        try {
            // Send to Claude for analysis
            // Conservative token limit because we're keeping more content
            const maxResponseTokens = Math.min(CONFIG.claude.maxTokensPerRequest, 2000);
            const result = await analyzeText(batchContent, prompt, maxResponseTokens);
            // Parse the batch result with expected article IDs
            const articleResults = parseBatchAnalysisResult(result, expectedArticleIds);
            // Map results back to original articles
            batch.forEach((article, index) => {
                const articleId = `${index + 1}`;
                const resultData = articleResults.get(articleId);
                if (resultData && resultData.score > 0) {
                    results.push({
                        ...article,
                        relevanceScore: resultData.score,
                        relevanceExplanation: resultData.explanation
                    });
                    successCount++;
                }
                else {
                    console.error(`Missing or zero-scored result for article ID ${articleId} in batch ${batchIndex + 1}`);
                    results.push({
                        ...article,
                        relevanceScore: 0,
                        relevanceExplanation: resultData ?
                            resultData.explanation :
                            `Error: Failed to get analysis result for this article in batch.`
                    });
                    errorCount++;
                }
            });
        }
        catch (error) {
            console.error(`Error during batch analysis (batch ${batchIndex + 1}):`, error);
            // Add all articles in the failed batch with zero scores
            batch.forEach(article => {
                results.push({
                    ...article,
                    relevanceScore: 0,
                    relevanceExplanation: `Error during batch analysis: ${error}`
                });
            });
            errorCount += batch.length;
        }
        console.log(`Batch ${batchIndex + 1} complete. Current stats: ${successCount} successful, ${errorCount} errors`);
    }
    // Sort by relevance score (descending)
    const sortedResults = [...results].sort((a, b) => b.relevanceScore - a.relevanceScore);
    console.log(`Analysis complete: ${successCount} successful, ${errorCount} errors`);
    console.log(`Articles with scores > 0: ${sortedResults.filter(a => a.relevanceScore > 0).length}`);
    return sortedResults;
}
// Update the original analyzeArticles function to use the new batch method
export async function analyzeArticles(articles, criteria) {
    // Use a fixed batch size of 1 to handle one article at a time
    const safeBatchSize = 1;
    // Use batch processing with safer settings
    return analyzeArticlesBatch(articles, criteria, safeBatchSize);
}
//# sourceMappingURL=relevanceAnalyzer.js.map