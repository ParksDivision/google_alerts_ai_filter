import { analyzeText } from './claudeClient.js';
import { ArticleOutput } from '../scraper/index.js';

export interface AnalyzedArticle extends ArticleOutput {
  relevanceScore: number;
  relevanceExplanation: string;
}

/**
 * Creates a prompt for analyzing an article's relevance based on criteria
 */
export function createAnalysisPrompt(criteria: string): string {
  return `
You are an expert content analyzer. Your task is to analyze the article and determine its relevance based on the following criteria:

${criteria}

Please evaluate the article and provide:
1. A relevance score between 0 and 100, where 100 is extremely relevant and 0 is not relevant at all.
2. A brief explanation (2-3 sentences) of why you assigned this score.

Format your response exactly like this:
RELEVANCE_SCORE: [score]
EXPLANATION: [your brief explanation]

Remember to only focus on the criteria provided. Be objective and consistent in your evaluation.
  `.trim();
}

/**
 * Parses the analysis result from Claude
 */
export function parseAnalysisResult(result: string | null): { score: number, explanation: string } {
  if (!result) {
    return { score: 0, explanation: 'Failed to analyze with Claude' };
  }
  
  // Extract score
  const scoreMatch = result.match(/RELEVANCE_SCORE:\s*(\d+)/i);
  const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
  
  // Extract explanation
  const explanationMatch = result.match(/EXPLANATION:\s*([\s\S]+)/i);
  const explanation = explanationMatch ? explanationMatch[1].trim() : 'No explanation provided';
  
  return { 
    score: Math.min(Math.max(score, 0), 100), // Ensure score is between 0-100
    explanation 
  };
}

/**
 * Analyzes a single article for relevance
 */
export async function analyzeArticle(
  article: ArticleOutput, 
  criteria: string
): Promise<AnalyzedArticle> {
  console.log(`Analyzing article: ${article.title}`);
  
  // Create a text excerpt if the content is too long
  // This helps control costs and ensures we don't exceed token limits
  const maxContentLength = 10000; // Limit to control token usage
  const content = article.content.length > maxContentLength 
    ? article.content.substring(0, maxContentLength) + '...[truncated]'
    : article.content;
  
  // Generate the prompt
  const prompt = createAnalysisPrompt(criteria);
  
  // Send to Claude for analysis
  const result = await analyzeText(content, prompt, 400);
  
  // Parse the result
  const { score, explanation } = parseAnalysisResult(result);
  
  return {
    ...article,
    relevanceScore: score,
    relevanceExplanation: explanation
  };
}

/**
 * Analyzes multiple articles and sorts by relevance
 */
export async function analyzeArticles(
  articles: ArticleOutput[], 
  criteria: string
): Promise<AnalyzedArticle[]> {
  console.log(`Starting analysis of ${articles.length} articles...`);
  
  const results: AnalyzedArticle[] = [];
  
  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    console.log(`Analyzing article ${i + 1}/${articles.length}: ${article.title}`);
    
    const result = await analyzeArticle(article, criteria);
    results.push(result);
    
    if (i % 5 === 0 && i > 0) {
      console.log(`Progress: ${i}/${articles.length} articles analyzed`);
    }
  }
  
  // Sort by relevance score (descending)
  const sortedResults = [...results].sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  console.log(`Completed analysis of ${results.length} articles`);
  
  return sortedResults;
}