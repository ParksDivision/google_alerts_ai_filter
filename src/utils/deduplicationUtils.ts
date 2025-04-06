// Create a new file: src/utils/deduplicationUtils.ts

import { ArticleInput, ArticleOutput } from '../scraper/index.js';
import { AnalyzedArticle } from '../analysis/index.js';

/**
 * Calculate similarity hash for article content
 * Simple implementation - can be enhanced with more sophisticated algorithms if needed
 */
function calculateContentHash(content: string): string {
  // Normalize the content (lowercase, remove extra spaces, common filler words)
  const normalized = content
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\b(the|and|or|but|a|an|in|on|at|for|to|of|with|by)\b/g, '')
    .trim();
  
  // Return a substring hash (first 200 chars) for quick comparison
  // Could be improved with better hashing algorithms if needed
  return normalized.substring(0, 200);
}

/**
 * Calculate similarity hash for article URLs
 * Normalizes URLs to catch duplicates with tracking parameters
 */
function normalizeUrl(url: string): string {
  try {
    // Parse the URL
    const parsedUrl = new URL(url);
    
    // Remove common tracking parameters
    const searchParams = parsedUrl.searchParams;
    const paramsToRemove = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', 'ocid', 'msclkid', 'ref', 'source', 'ref_src'
    ];
    
    paramsToRemove.forEach(param => {
      searchParams.delete(param);
    });
    
    // Reconstruct the URL without tracking parameters
    parsedUrl.search = searchParams.toString();
    
    // Return normalized URL (remove trailing slash if present)
    return parsedUrl.toString().replace(/\/$/, '');
  } catch (e) {
    // If URL parsing fails, return the original URL
    return url;
  }
}

/**
 * Detects and removes duplicate articles from a list
 * Uses both URL and content similarity for detection
 */
export function deduplicateArticles<T extends ArticleInput>(
  articles: T[],
  useContentComparison = true
): T[] {
  console.log(`Starting deduplication of ${articles.length} articles...`);
  
  const uniqueArticles: T[] = [];
  const seenUrls = new Set<string>();
  const seenContentHashes = new Set<string>();
  
  for (const article of articles) {
    // Skip articles with missing URLs
    if (!article.link) {
      uniqueArticles.push(article);
      continue;
    }
    
    // Normalize the URL to detect duplicates with different tracking parameters
    const normalizedUrl = normalizeUrl(article.link);
    
    // Skip if we've seen this URL before
    if (seenUrls.has(normalizedUrl)) {
      console.log(`Duplicate URL detected: ${article.link}`);
      continue;
    }
    
    // Check content similarity if enabled and content exists
    if (useContentComparison && 'content' in article && typeof (article as any).content === 'string') {
      const content = (article as any).content as string;
      
      // Skip empty content
      if (!content || content.trim().length === 0) {
        seenUrls.add(normalizedUrl);
        uniqueArticles.push(article);
        continue;
      }
      
      // Calculate content hash for similarity check
      const contentHash = calculateContentHash(content);
      
      // Skip if we've seen very similar content before
      if (seenContentHashes.has(contentHash)) {
        console.log(`Duplicate content detected: ${article.title}`);
        continue;
      }
      
      seenContentHashes.add(contentHash);
    }
    
    // If we get here, the article is considered unique
    seenUrls.add(normalizedUrl);
    uniqueArticles.push(article);
  }
  
  console.log(`Deduplication complete: ${articles.length} input, ${uniqueArticles.length} unique articles`);
  return uniqueArticles;
}

// Function specifically for ArticleOutput type
export function deduplicateScrapedArticles(articles: ArticleOutput[]): ArticleOutput[] {
  return deduplicateArticles(articles, true);
}

// Function specifically for AnalyzedArticle type
export function deduplicateAnalyzedArticles(articles: AnalyzedArticle[]): AnalyzedArticle[] {
  return deduplicateArticles(articles, true);
}

// Function specifically for ArticleInput type (doesn't have content)
export function deduplicateArticleInputs(articles: ArticleInput[]): ArticleInput[] {
  return deduplicateArticles(articles, false);
}