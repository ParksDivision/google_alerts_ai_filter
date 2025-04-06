// src/analysis/relevanceAnalyzer.ts
import { analyzeText } from './claudeClient.js';
/**
 * Creates a prompt for analyzing an article's relevance based on criteria
 */
export function createAnalysisPrompt(criteria) {
    return `
You are an expert content analyzer. Your task is to analyze the article and determine its relevance based on the following criteria:

${criteria}

Please evaluate the article and provide:
1. A relevance score between 0 and 100, where 100 is extremely relevant and 0 is not relevant at all.
2. A brief explanation (2-3 sentences) of why you assigned this score.

If the article content is empty, very short, or seems incomplete, please analyze based on just the title and any available content.

Format your response EXACTLY like this:
RELEVANCE_SCORE: [score]
EXPLANATION: [your brief explanation]

It's critical that you follow this exact format with these exact labels.
Remember to only focus on the criteria provided. Be objective and consistent in your evaluation.
  `.trim();
}
/**
 * Parses the analysis result from Claude
 */
export function parseAnalysisResult(result) {
    if (!result) {
        return { score: 0, explanation: 'Failed to analyze with Claude' };
    }
    // Log the first part of the response for debugging
    console.log("Claude response begins with:", result.substring(0, 200).replace(/\n/g, ' '));
    // Extract score with more flexible pattern matching
    const scoreMatch = result.match(/RELEVANCE_SCORE:?\s*(\d+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
    if (!scoreMatch) {
        console.warn("Failed to extract score from Claude's response!");
    }
    // Extract explanation with more flexible pattern matching
    const explanationMatch = result.match(/EXPLANATION:?\s*([\s\S]+)/i);
    const explanation = explanationMatch
        ? explanationMatch[1].trim()
        : 'No explanation provided';
    return {
        score: Math.min(Math.max(score, 0), 100), // Ensure score is between 0-100
        explanation
    };
}
/**
 * Analyzes a single article for relevance
 */
export async function analyzeArticle(article, criteria) {
    console.log(`Analyzing article: ${article.title}`);
    // Default to empty string if content is null/undefined
    const articleContent = article.content || '';
    // Always analyze, even with minimal content
    if (articleContent.trim().length < 100) {
        console.log(`Note: Article has minimal content (${articleContent.length} chars): ${article.title}`);
    }
    // Create a text excerpt if the content is too long
    // This helps control costs and ensures we don't exceed token limits
    const maxContentLength = 10000; // Limit to control token usage
    const content = articleContent.length > maxContentLength
        ? articleContent.substring(0, maxContentLength) + '...[truncated]'
        : articleContent;
    // Include title and URL to give more context, especially for short content
    const enrichedContent = `
TITLE: ${article.title || 'No title available'}
URL: ${article.link || 'No URL available'}
SOURCE: ${article.alertName || 'Unknown source'}
CONTENT:
${content || 'No content available'}
  `;
    // Generate the prompt
    const prompt = createAnalysisPrompt(criteria);
    try {
        // Send to Claude for analysis
        const result = await analyzeText(enrichedContent, prompt, 400);
        // Parse the result
        const { score, explanation } = parseAnalysisResult(result);
        return {
            ...article,
            relevanceScore: score,
            relevanceExplanation: explanation
        };
    }
    catch (error) {
        console.error(`Error during Claude analysis for "${article.title}":`, error);
        // Return a default value instead of throwing
        return {
            ...article,
            relevanceScore: 0,
            relevanceExplanation: `Error during analysis: ${error}`
        };
    }
}
/**
 * Analyzes multiple articles and sorts by relevance
 */
export async function analyzeArticles(articles, criteria) {
    console.log(`Starting analysis of ${articles.length} articles...`);
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    for (let i = 0; i < articles.length; i++) {
        const article = articles[i];
        console.log(`Analyzing article ${i + 1}/${articles.length}: ${article.title}`);
        try {
            const result = await analyzeArticle(article, criteria);
            results.push(result);
            successCount++;
            if (i % 5 === 0 && i > 0) {
                console.log(`Progress: ${i}/${articles.length} articles analyzed (${successCount} successful, ${errorCount} errors)`);
            }
        }
        catch (error) {
            console.error(`Error analyzing article ${article.title}:`, error);
            errorCount++;
            // Add the article with zero score rather than skipping it
            results.push({
                ...article,
                relevanceScore: 0,
                relevanceExplanation: `Error during analysis: ${error}`
            });
        }
    }
    // Sort by relevance score (descending)
    const sortedResults = [...results].sort((a, b) => b.relevanceScore - a.relevanceScore);
    console.log(`Analysis complete: ${successCount} successful, ${errorCount} errors`);
    console.log(`Articles with scores > 0: ${sortedResults.filter(a => a.relevanceScore > 0).length}`);
    return sortedResults;
}
//# sourceMappingURL=relevanceAnalyzer.js.map