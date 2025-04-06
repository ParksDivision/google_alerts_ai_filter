// src/scraper/articleExtractor.ts
import * as cheerio from 'cheerio';
import sanitizeHtml from 'sanitize-html';
import TurndownService from 'turndown';
import { fetch, RequestInit } from 'undici';
import { backOff } from 'exponential-backoff';
import CONFIG from '../config.js';

export interface ArticleContent {
  title: string;
  content: string;
  textContent: string;
  markdownContent?: string;
  length: number;
  excerpt: string;
  byline: string;
  siteName: string;
  date?: string;
  language?: string;
  error?: string;
}

export interface ExtractionOptions {
  timeout?: number;
  retries?: number;
  proxyUrl?: string;
}

/**
 * Configure fetch options with timeouts and headers
 */
function configureFetchOptions(options: ExtractionOptions = {}): RequestInit {
  return {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
    },
    signal: AbortSignal.timeout(options.timeout || CONFIG.scraper.requestTimeout),
  };
}

/**
 * Extract the main article content from a given URL
 */
export async function extractArticleContent(
  url: string, 
  options: ExtractionOptions = {}
): Promise<ArticleContent> {
  try {
    // Try to fetch with retries and exponential backoff
    const html = await backOff(
      async () => {
        const response = await fetch(url, configureFetchOptions(options));
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        return await response.text();
      },
      { 
        numOfAttempts: options.retries || CONFIG.scraper.retries,
        startingDelay: 1000,
        timeMultiple: 2,
        maxDelay: 10000,
      }
    );

    // Extract content using cheerio
    const $ = cheerio.load(html);
    
    // Remove script, style, and other non-content elements
    $('script, style, meta, link, noscript, iframe, form, nav, footer, aside, [role="complementary"], .comment, .comments, .ad, .ads, .advertisement').remove();
    
    // Extract title (try different approaches)
    const title = $('meta[property="og:title"]').attr('content') || 
                  $('meta[name="twitter:title"]').attr('content') || 
                  $('title').text() || 
                  $('h1').first().text() || '';
    
    // Try multiple selectors with fallbacks for content extraction
    // Common content containers in various CMS and news websites
    const contentSelectors = [
      'article', 
      'main', 
      '.article-content',
      '.post-content',
      '.entry-content',
      '.content',
      '.article-body',
      '.story-content',
      '.story-body',
      '.news-content',
      '#article-content',
      '#content-main',
      '[itemprop="articleBody"]',
      'div[data-component="text-block"]'
    ];
    
    let mainContent = '';
    // Try each selector until we find content
    for (const selector of contentSelectors) {
      const selectedContent = $(selector).html();
      if (selectedContent && selectedContent.length > 500) {  // Ensuring it's substantial content
        mainContent = selectedContent;
        break;
      }
    }
    
    // If no specific content container found, try to extract article-like content
    if (!mainContent || mainContent.length < 500) {
      // Look for sections with substantial paragraphs that likely contain article text
      let bestElement: cheerio.Element | null = null;
      let mostParagraphs = 0;
      
      $('div, section').each((_, element) => {
        const paragraphs = $(element).find('p');
        if (paragraphs.length >= 3 && paragraphs.length > mostParagraphs) {
          mostParagraphs = paragraphs.length;
          bestElement = element;
        }
      });
      
      if (bestElement) {
        mainContent = $(bestElement).html() || '';
      } else {
        // Last resort: try to collect all paragraphs from the body
        const paragraphs = $('body p').filter((_, el) => {
          const text = $(el).text().trim();
          return text.length > 80;  // Only substantial paragraphs
        }).toArray();
        
        const contentBuilder = [];
        for (const p of paragraphs) {
          contentBuilder.push($.html(p));
        }
        
        mainContent = contentBuilder.join('\n');
      }
    }
    
    // Fallback to body content if all else fails
    if (!mainContent || mainContent.length < 300) {
      mainContent = $('body').html() || '';
    }
    
    // Clean the HTML content
    const cleanHtml = sanitizeHtml(mainContent, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'figure']),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        img: ['src', 'alt', 'title'],
      },
    });
    
    // Convert to plain text (remove all tags)
    const textContent = sanitizeHtml(cleanHtml, {
      allowedTags: [],
      allowedAttributes: {},
    }).trim();
    
    // Log warning if text content is suspiciously small
    if (textContent.length < 300 && textContent.length > 0) {
      console.warn(`Warning: Extracted text from ${url} is suspiciously short (${textContent.length} chars)`);
    }
    
    // Generate markdown version
    const turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced'
    });
    const markdown = turndownService.turndown(cleanHtml);
    
    // Extract metadata when available
    const byline = $('meta[name="author"]').attr('content') || 
                  $('meta[property="article:author"]').attr('content') || 
                  $('.author, .byline').first().text().trim() || '';
    
    const siteName = $('meta[property="og:site_name"]').attr('content') || 
                    $('meta[name="application-name"]').attr('content') || 
                    $('.site-name, .site-title').first().text().trim() || 
                    new URL(url).hostname;
    
    const date = $('meta[property="article:published_time"]').attr('content') || 
                $('time').attr('datetime') || 
                $('meta[name="date"]').attr('content') || '';
    
    // Extract excerpt/description
    const excerpt = $('meta[name="description"]').attr('content') || 
                   $('meta[property="og:description"]').attr('content') || 
                   $('meta[name="twitter:description"]').attr('content') || 
                   $('.excerpt, .description, .summary').first().text().trim() || 
                   textContent.substring(0, 200) + '...';
    
    console.log(cleanHtml);
    // Return the extracted content
    return {
      title,
      content: cleanHtml,
      textContent,
      markdownContent: markdown,
      length: textContent.length,
      excerpt,
      byline,
      siteName,
      date,
      language: $('html').attr('lang') || 'en',
    };
  } catch (error: any) {
    console.error(`Error extracting content from ${url}:`, error.message);
    return {
      title: '',
      content: '',
      textContent: '',
      markdownContent: '',
      length: 0,
      excerpt: '',
      byline: '',
      siteName: '',
      error: error.message
    };
  }
}