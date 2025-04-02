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
    $('script, style, meta, link, noscript, iframe, form, nav, footer, aside').remove();
    
    // Extract title (try different approaches)
    const title = $('meta[property="og:title"]').attr('content') || 
                  $('meta[name="twitter:title"]').attr('content') || 
                  $('title').text() || 
                  $('h1').first().text() || '';
    
    // Extract article content (prioritize article, main, then body)
    const mainContent = $('article').html() || 
                      $('main').html() || 
                      $('.content, .post-content, .entry-content, .article-content').html() ||
                      $('body').html() || '';
    
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