import { promises as fs } from 'node:fs';
import path from 'node:path';
import { parse } from 'fast-csv';
import { createReadStream } from 'node:fs';
import { format as formatCsv } from '@fast-csv/format';
import { createWriteStream } from 'node:fs';
/**
 * Read article links from CSV (basic format for initial scraping)
 */
export async function readArticleLinks(filePath) {
    return new Promise((resolve, reject) => {
        const articles = [];
        createReadStream(filePath)
            .pipe(parse({ headers: true, trim: true }))
            .on('error', error => reject(error))
            .on('data', (row) => {
            articles.push({
                alertName: row['Alert Name'] || '',
                title: row['Title'] || '',
                link: row['Link'] || '',
            });
        })
            .on('end', () => resolve(articles));
    });
}
/**
 * Read previously scraped articles from CSV (including content)
 */
export async function readScrapedArticles(filePath) {
    return new Promise((resolve, reject) => {
        const articles = [];
        createReadStream(filePath)
            .pipe(parse({ headers: true, trim: true }))
            .on('error', error => reject(error))
            .on('data', (row) => {
            articles.push({
                alertName: row['Alert Name'] || '',
                title: row['Title'] || '',
                link: row['Link'] || '',
                content: row['Content'] || '',
                error: row['Error'] || undefined
            });
        })
            .on('end', () => resolve(articles));
    });
}
/**
 * Write scraped articles to CSV
 */
export async function writeScrapedArticles(articles, outputPath) {
    try {
        // Ensure output directory exists
        const dir = path.dirname(outputPath);
        await fs.mkdir(dir, { recursive: true });
        return new Promise((resolve, reject) => {
            const writeStream = createWriteStream(outputPath);
            const csvStream = formatCsv({ headers: true });
            csvStream.pipe(writeStream);
            articles.forEach(article => {
                csvStream.write({
                    'Alert Name': article.alertName,
                    'Title': article.title,
                    'Link': article.link,
                    'Content': article.content,
                    'Error': article.error || ''
                });
            });
            csvStream.end();
            writeStream.on('finish', () => resolve(outputPath));
            writeStream.on('error', reject);
        });
    }
    catch (error) {
        console.error(`Error writing CSV file ${outputPath}:`, error);
        throw error;
    }
}
/**
 * Write analyzed articles to CSV
 */
export async function writeAnalyzedArticles(articles, outputPath) {
    try {
        // Ensure output directory exists
        const dir = path.dirname(outputPath);
        await fs.mkdir(dir, { recursive: true });
        return new Promise((resolve, reject) => {
            const writeStream = createWriteStream(outputPath);
            const csvStream = formatCsv({ headers: true });
            csvStream.pipe(writeStream);
            articles.forEach(article => {
                csvStream.write({
                    'Relevance Score': article.relevanceScore,
                    'Alert Name': article.alertName,
                    'Title': article.title,
                    'Link': article.link,
                    'Relevance Explanation': article.relevanceExplanation,
                    'Content': article.content,
                    'Error': article.error || ''
                });
            });
            csvStream.end();
            writeStream.on('finish', () => resolve(outputPath));
            writeStream.on('error', reject);
        });
    }
    catch (error) {
        console.error(`Error writing CSV file ${outputPath}:`, error);
        throw error;
    }
}
//# sourceMappingURL=csvHandler.js.map