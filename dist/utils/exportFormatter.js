import { promises as fs } from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx-js-style';
import { writeAnalyzedArticles } from './csvHandler.js';
import CONFIG from '../config.js';
/**
 * Ensure CSV-safe values by converting objects to strings
 */
function ensureCsvSafeValue(value) {
    if (value === null || value === undefined) {
        return '';
    }
    if (typeof value === 'object') {
        // Convert objects to JSON strings
        return JSON.stringify(value);
    }
    // Convert all other types to string
    return String(value);
}
/**
 * Export analyzed articles to the specified format
 */
export async function exportAnalyzedArticles(articles, options) {
    const { format, outputPath, chunkSize = CONFIG.export.chunkSize, includeFullContent = CONFIG.export.includeFullContent, minRelevanceScore = CONFIG.export.minRelevanceScore } = options;
    // Filter articles by minimum relevance score if specified
    const filteredArticles = articles.filter(article => article.relevanceScore >= minRelevanceScore);
    console.log(`Exporting ${filteredArticles.length} articles to ${format} format`);
    // Create output directory if it doesn't exist
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });
    // Choose export method based on format
    switch (format) {
        case 'csv':
            return await writeAnalyzedArticles(filteredArticles, outputPath);
        case 'excel':
            return await exportToExcel(filteredArticles, outputPath, includeFullContent, chunkSize);
        case 'json':
            return await exportToJson(filteredArticles, outputPath, includeFullContent);
        case 'markdown':
            return await exportToMarkdown(filteredArticles, outputPath, includeFullContent);
        case 'html':
            return await exportToHtml(filteredArticles, outputPath, includeFullContent);
        default:
            throw new Error(`Unsupported export format: ${format}`);
    }
}
/**
 * Export to Excel format with optimizations for large datasets
 */
export async function exportToExcel(articles, outputPath, includeFullContent, chunkSize) {
    // Create workbook
    const workbook = XLSX.utils.book_new();
    // Define headers
    const headers = [
        'Relevance Score',
        'Alert Name',
        'Title',
        'Link',
        'Relevance Explanation'
    ];
    if (includeFullContent) {
        headers.push('Content');
    }
    // Prepare data for the worksheet
    const processChunk = (chunk) => {
        return chunk.map(article => {
            const row = [
                article.relevanceScore,
                article.alertName,
                article.title,
                article.link,
                article.relevanceExplanation
            ];
            if (includeFullContent) {
                // Truncate content if too long for Excel
                const maxContentLength = 30000;
                const content = article.content.length > maxContentLength
                    ? article.content.substring(0, maxContentLength) + '... [truncated]'
                    : article.content;
                row.push(content);
            }
            return row;
        });
    };
    // Process data in chunks for memory efficiency
    const wsData = [headers];
    // Process chunks for memory efficiency
    for (let i = 0; i < articles.length; i += chunkSize) {
        const chunk = articles.slice(i, i + chunkSize);
        console.log(`Processing Excel export chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(articles.length / chunkSize)}`);
        wsData.push(...processChunk(chunk));
    }
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    // Style the header row
    const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "4F81BD" } },
        alignment: { horizontal: "center" }
    };
    // Apply styles to header cells
    for (let i = 0; i < headers.length; i++) {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
        if (!ws[cellRef])
            ws[cellRef] = {};
        ws[cellRef].s = headerStyle;
    }
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, ws, "Analyzed Articles");
    // Create summary sheet
    const summaryData = [
        ["Analysis Summary", ""],
        ["Total Articles", articles.length],
        ["Average Relevance Score", articles.reduce((sum, a) => sum + a.relevanceScore, 0) / articles.length],
        ["Articles with Score > 75", articles.filter(a => a.relevanceScore > 75).length],
        ["Articles with Score > 50", articles.filter(a => a.relevanceScore > 50).length],
        ["Articles with Score > 25", articles.filter(a => a.relevanceScore > 25).length],
        ["Generated On", new Date().toLocaleString()]
    ];
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summaryWs, "Summary");
    // Write to file
    XLSX.writeFile(workbook, outputPath);
    return outputPath;
}
/**
 * Export to JSON format
 */
export async function exportToJson(articles, outputPath, includeFullContent) {
    const exportData = articles.map(article => {
        // Create a safe copy of the article data
        const data = {
            relevanceScore: article.relevanceScore,
            alertName: article.alertName,
            title: article.title,
            link: article.link,
            relevanceExplanation: article.relevanceExplanation,
        };
        if (includeFullContent) {
            data.content = article.content;
        }
        return data;
    });
    await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2), 'utf8');
    return outputPath;
}
/**
 * Export to Markdown format
 */
export async function exportToMarkdown(articles, outputPath, includeFullContent) {
    let markdown = `# Analyzed Articles\n\n`;
    markdown += `*Generated on ${new Date().toLocaleString()}*\n\n`;
    markdown += `## Summary\n\n`;
    markdown += `- **Total Articles**: ${articles.length}\n`;
    markdown += `- **Average Relevance Score**: ${(articles.reduce((sum, a) => sum + a.relevanceScore, 0) / articles.length).toFixed(2)}\n\n`;
    markdown += `## Articles by Relevance\n\n`;
    // Add each article
    for (const article of articles) {
        markdown += `### ${article.title} (Score: ${article.relevanceScore})\n\n`;
        markdown += `- **Alert Source**: ${article.alertName}\n`;
        markdown += `- **Link**: [${article.link}](${article.link})\n`;
        markdown += `- **Relevance**: ${article.relevanceExplanation}\n\n`;
        if (includeFullContent) {
            markdown += `#### Content\n\n`;
            markdown += `${article.content}\n\n`;
            markdown += `---\n\n`;
        }
    }
    await fs.writeFile(outputPath, markdown, 'utf8');
    return outputPath;
}
/**
 * Export to HTML format with interactive features
 */
export async function exportToHtml(articles, outputPath, includeFullContent) {
    // Create an interactive HTML report
    let html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Analyzed Articles Report</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 20px;
        border-bottom: 1px solid #eee;
      }
      .controls {
        background: #f5f5f5;
        padding: 15px;
        border-radius: 5px;
        margin-bottom: 20px;
      }
      .article {
        margin-bottom: 30px;
        padding: 20px;
        border: 1px solid #ddd;
        border-radius: 5px;
        transition: all 0.3s ease;
      }
      .article:hover {
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
      }
      .score {
        display: inline-block;
        padding: 5px 10px;
        color: white;
        border-radius: 15px;
        font-weight: bold;
        margin-right: 10px;
      }
      .score-high {
        background-color: #4CAF50;
      }
      .score-medium {
        background-color: #FF9800;
      }
      .score-low {
        background-color: #F44336;
      }
      .article-content {
        max-height: 300px;
        overflow-y: auto;
        padding: 15px;
        background: #f9f9f9;
        border-radius: 5px;
        margin-top: 15px;
        display: none;
      }
      button {
        background: #2196F3;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      }
      button:hover {
        background: #0b7dda;
      }
      .pagination {
        display: flex;
        justify-content: center;
        margin: 20px 0;
      }
      .pagination button {
        margin: 0 5px;
      }
      #minScore {
        width: 80px;
      }
      .summary {
        background: #e8f4fd;
        padding: 15px;
        border-radius: 5px;
        margin-bottom: 20px;
      }
      .hidden {
        display: none;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>Analyzed Articles Report</h1>
      <p>Generated: ${new Date().toLocaleString()}</p>
    </div>
    
    <div class="summary">
      <h2>Summary</h2>
      <p>Total Articles: <strong>${articles.length}</strong></p>
      <p>Average Relevance Score: <strong>${(articles.reduce((sum, a) => sum + a.relevanceScore, 0) / articles.length).toFixed(2)}</strong></p>
      <p>High Relevance (>75): <strong>${articles.filter(a => a.relevanceScore > 75).length}</strong></p>
      <p>Medium Relevance (50-75): <strong>${articles.filter(a => a.relevanceScore >= 50 && a.relevanceScore <= 75).length}</strong></p>
      <p>Low Relevance (<50): <strong>${articles.filter(a => a.relevanceScore < 50).length}</strong></p>
    </div>
    
    <div class="controls">
      <h3>Filter & Sort</h3>
      <div>
        <label for="minScore">Minimum Score:</label>
        <input type="number" id="minScore" min="0" max="100" value="0">
        
        <label for="sortBy">Sort By:</label>
        <select id="sortBy">
          <option value="score">Relevance Score</option>
          <option value="title">Title</option>
          <option value="alertName">Alert Name</option>
        </select>
        
        <button onclick="applyFilters()">Apply</button>
        <button onclick="resetFilters()">Reset</button>
      </div>
    </div>
    
    <div id="articleContainer">
  `;
    // Add articles
    articles.forEach((article, index) => {
        const scoreClass = article.relevanceScore > 75 ? 'score-high' :
            article.relevanceScore >= 50 ? 'score-medium' : 'score-low';
        html += `
      <div class="article" data-score="${article.relevanceScore}" data-title="${article.title}" data-alert="${article.alertName}">
        <h3>
          <span class="score ${scoreClass}">${article.relevanceScore}</span>
          ${article.title}
        </h3>
        <p><strong>Alert:</strong> ${article.alertName}</p>
        <p><strong>Link:</strong> <a href="${article.link}" target="_blank">${article.link}</a></p>
        <p><strong>Relevance:</strong> ${article.relevanceExplanation}</p>
    `;
        if (includeFullContent) {
            html += `
        <button onclick="toggleContent(${index})">Show/Hide Content</button>
        <div id="content-${index}" class="article-content">
          ${article.content.replace(/\n/g, '<br>')}
        </div>
      `;
        }
        html += `</div>`;
    });
    // Add pagination and JavaScript for interactivity
    html += `
    </div>
    
    <div class="pagination">
      <button onclick="prevPage()">Previous</button>
      <span id="pageInfo">Page 1 of 1</span>
      <button onclick="nextPage()">Next</button>
    </div>
    
    <script>
      const articlesPerPage = 20;
      let currentPage = 1;
      let filteredArticles = [];
      const allArticles = Array.from(document.querySelectorAll('.article'));
      
      // Initialize
      function init() {
        filteredArticles = allArticles;
        updatePagination();
        showPage(1);
      }
      
      // Show specific page
      function showPage(page) {
        const startIdx = (page - 1) * articlesPerPage;
        const endIdx = startIdx + articlesPerPage;
        
        filteredArticles.forEach((article, idx) => {
          if (idx >= startIdx && idx < endIdx) {
            article.classList.remove('hidden');
          } else {
            article.classList.add('hidden');
          }
        });
        
        currentPage = page;
        document.getElementById('pageInfo').textContent = \`Page \${currentPage} of \${Math.ceil(filteredArticles.length / articlesPerPage)}\`;
      }
      
      // Pagination controls
      function nextPage() {
        const totalPages = Math.ceil(filteredArticles.length / articlesPerPage);
        if (currentPage < totalPages) {
          showPage(currentPage + 1);
        }
      }
      
      function prevPage() {
        if (currentPage > 1) {
          showPage(currentPage - 1);
        }
      }
      
      // Toggle content visibility
      function toggleContent(index) {
        const content = document.getElementById(\`content-\${index}\`);
        content.style.display = content.style.display === 'block' ? 'none' : 'block';
      }
      
      // Apply filters and sorting
      function applyFilters() {
        const minScore = parseInt(document.getElementById('minScore').value) || 0;
        const sortBy = document.getElementById('sortBy').value;
        
        // Filter by minimum score
        filteredArticles = allArticles.filter(article => {
          const score = parseInt(article.dataset.score);
          return score >= minScore;
        });
        
        // Sort articles
        filteredArticles.sort((a, b) => {
          if (sortBy === 'score') {
            return parseInt(b.dataset.score) - parseInt(a.dataset.score);
          } else if (sortBy === 'title') {
            return a.dataset.title.localeCompare(b.dataset.title);
          } else if (sortBy === 'alertName') {
            return a.dataset.alert.localeCompare(b.dataset.alert);
          }
        });
        
        // Reset container
        const container = document.getElementById('articleContainer');
        container.innerHTML = '';
        
        // Add sorted/filtered articles back
        filteredArticles.forEach(article => {
          container.appendChild(article);
        });
        
        updatePagination();
        showPage(1);
      }
      
      function resetFilters() {
        document.getElementById('minScore').value = '0';
        document.getElementById('sortBy').value = 'score';
        applyFilters();
      }
      
      function updatePagination() {
        const totalPages = Math.ceil(filteredArticles.length / articlesPerPage);
        document.getElementById('pageInfo').textContent = \`Page 1 of \${totalPages}\`;
      }
      
      // Initialize on load
      window.onload = init;
    </script>
  </body>
  </html>
  `;
    await fs.writeFile(outputPath, html, 'utf8');
    return outputPath;
}
//# sourceMappingURL=exportFormatter.js.map