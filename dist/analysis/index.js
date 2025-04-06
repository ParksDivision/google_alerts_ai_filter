// src/analysis/index.ts
import { getCostInformation } from './claudeClient.js';
import { analyzeArticles } from './relevanceAnalyzer.js';
/**
 * Analyzes content based on provided criteria and returns sorted results
 */
export async function analyzeContent(articles, criteria) {
    console.log(`Starting with ${articles.length} total articles`);
    // Debug the current state of articles
    const emptyContent = articles.filter(a => !a.content || a.content.trim().length === 0).length;
    const withErrors = articles.filter(a => a.error).length;
    console.log(`Articles with empty content: ${emptyContent}`);
    console.log(`Articles with errors: ${withErrors}`);
    // IMPORTANT CHANGE: Don't filter out articles at all - attempt to analyze everything
    // This lets Claude decide relevance even for partial or problematic content
    const validArticles = articles;
    console.log(`Analyzing all ${validArticles.length} articles`);
    // Log sample of first few articles to debug content issues
    for (let i = 0; i < Math.min(3, articles.length); i++) {
        const article = articles[i];
        console.log(`Sample article ${i + 1}:`);
        console.log(`  Title: ${article.title}`);
        console.log(`  Content length: ${article.content?.length || 0}`);
        if (article.content) {
            console.log(`  Content snippet: ${article.content.substring(0, 100)}...`);
        }
    }
    // Analyze articles based on criteria
    const analyzedArticles = await analyzeArticles(validArticles, criteria);
    return analyzedArticles;
}
export { getCostInformation };
//# sourceMappingURL=index.js.map