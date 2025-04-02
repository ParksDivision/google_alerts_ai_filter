// src/server.ts
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promises as fs } from 'node:fs';
import CONFIG from './config.js';

/**
 * Create and configure the Express server
 */
export async function createServer(port = 3000, customOutputDir?: string) {
  const app = express();
  const outputDir = customOutputDir || CONFIG.outputDir;
  
  // Create output directory if it doesn't exist
  await fs.mkdir(outputDir, { recursive: true });
  
  // Serve static files from the output directory
  app.use(express.static(outputDir));
  
  // Define route handlers
  async function serveLatestReport(req: any, res: any) {
    try {
      const files = await fs.readdir(outputDir);
      
      // Filter HTML files and sort by creation date (most recent first)
      const htmlFiles = files
        .filter(file => file.endsWith('.html'))
        .map(file => path.join(outputDir, file));
      
      if (htmlFiles.length === 0) {
        return res.send('No HTML reports found. Run the analyzer first.');
      }
      
      // Get file stats to sort by creation time
      const fileStats = await Promise.all(
        htmlFiles.map(async (file) => {
          const stats = await fs.stat(file);
          return { file, stats };
        })
      );
      
      // Sort by creation time, most recent first
      fileStats.sort((a, b) => b.stats.ctimeMs - a.stats.ctimeMs);
      
      // Redirect to the most recent file
      const mostRecentFile = path.basename(fileStats[0].file);
      res.redirect(`/${mostRecentFile}`);
    } catch (error) {
      console.error('Error serving index:', error);
      res.status(500).send('Server error');
    }
  }

  async function listReports(req: any, res: any) {
    try {
      const files = await fs.readdir(outputDir);
      
      // Filter report files and get their stats
      const reportFiles = await Promise.all(
        files
          .filter(file => file.endsWith('.html') || file.endsWith('.csv') || 
                         file.endsWith('.xlsx') || file.endsWith('.json') || 
                         file.endsWith('.md'))
          .map(async (file) => {
            const stats = await fs.stat(path.join(outputDir, file));
            return {
              filename: file,
              path: `/${file}`,
              created: stats.ctime,
              size: stats.size
            };
          })
      );
      
      // Sort by creation time, most recent first
      reportFiles.sort((a, b) => b.created.getTime() - a.created.getTime());
      
      // Generate a simple HTML report list
      const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>RSS Analyzer Reports</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            max-width: 1000px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
          }
          h1 {
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            padding: 10px;
            border-bottom: 1px solid #eee;
            text-align: left;
          }
          th {
            background-color: #f5f5f5;
          }
          tr:hover {
            background-color: #f9f9f9;
          }
          a {
            color: #0366d6;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
          .file-size {
            color: #666;
          }
        </style>
      </head>
      <body>
        <h1>Available Reports</h1>
        <table>
          <thead>
            <tr>
              <th>Filename</th>
              <th>Created</th>
              <th>Size</th>
            </tr>
          </thead>
          <tbody>
            ${reportFiles.map(file => `
              <tr>
                <td><a href="${file.path}">${file.filename}</a></td>
                <td>${file.created.toLocaleString()}</td>
                <td class="file-size">${formatFileSize(file.size)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
      `;
      
      res.send(html);
    } catch (error) {
      console.error('Error serving reports:', error);
      res.status(500).send('Server error');
    }
  }

  async function getApiReports(req: any, res: any) {
    try {
      const files = await fs.readdir(outputDir);
      
      // Filter report files and get their stats
      const reportFiles = await Promise.all(
        files
          .filter(file => file.endsWith('.html') || file.endsWith('.csv') || 
                         file.endsWith('.xlsx') || file.endsWith('.json') || 
                         file.endsWith('.md'))
          .map(async (file) => {
            const stats = await fs.stat(path.join(outputDir, file));
            return {
              filename: file,
              path: `/${file}`,
              created: stats.ctime.toISOString(),
              size: stats.size
            };
          })
      );
      
      // Sort by creation time, most recent first
      reportFiles.sort((a, b) => 
        new Date(b.created).getTime() - new Date(a.created).getTime()
      );
      
      res.json(reportFiles);
    } catch (error) {
      console.error('Error serving API reports:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
  
  // Register routes
  app.get('/', serveLatestReport);
  app.get('/reports', listReports);
  app.get('/api/reports', getApiReports);
  
  // Start the server
  const server = app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`View all reports at http://localhost:${port}/reports`);
  });
  
  return { app, server };
}

/**
 * Format file size in human-readable form
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' bytes';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

// If this file is executed directly, start the server
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  createServer(port).catch(console.error);
}