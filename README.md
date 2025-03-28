# RSS Content Analyzer

A secure, modern tool to scrape, analyze, and sort RSS feed content using Claude Haiku.

## Features

- **Secure Content Scraping**: Extract clean article content from RSS feed links
- **AI Analysis**: Use Claude Haiku to analyze content relevance based on custom criteria
- **Multiple Export Formats**: Export sorted results as HTML, Excel, CSV, JSON, or Markdown
- **Cost Management**: Stay within your budget with built-in API cost tracking
- **Type Safety**: Uses Zod for runtime validation and TypeScript for compile-time safety
- **Batch Processing**: Handle large datasets efficiently
- **Interactive Reports**: Filter and sort results with interactive HTML exports

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd rss-content-analyzer

# Install dependencies
npm install

# Build the project
npm run build

# Set up your .env file with your Claude API key
cp .env.example .env
# Edit .env with your Claude API key
```

## Usage

### Basic Usage

```bash
npm run analyze -- path/to/google-alerts-export.csv path/to/criteria.txt
```

### Advanced Options

```bash
npm run analyze -- path/to/google-alerts-export.csv path/to/criteria.txt \
  --export-format html \
  --min-score 50 \
  --include-content true
```

### Options

- `--output-dir`: Directory for output files (default: ./output)
- `--skip-scraping`: Skip scraping and use existing data
- `--scraped-data`: Path to existing scraped data
- `--export-format`: Format for results (csv, excel, json, markdown, html)
- `--min-score`: Minimum relevance score (0-100) for inclusion
- `--include-content`: Include full article content in export

## Input Format

The tool expects a CSV file with, at minimum, the following columns:
- `Alert Name`: The source or category name
- `Title`: The article title
- `Link`: The URL to the article

This matches the format from Google Alerts exports.

## Output Formats

### HTML Report (Recommended)

The HTML export creates an interactive report with:
- Summary statistics
- Filtering and sorting controls
- Pagination for large datasets
- Collapsible content sections
- Color-coded relevance scores

This is the most user-friendly format for reviewing results.

### Excel Export

Excel exports include:
- Formatted data with filtering
- Summary statistics sheet
- Color-coded headers
- Auto-width columns

### Other Formats

Also supported:
- CSV (for spreadsheet compatibility)
- JSON (for programmatic processing)
- Markdown (for documentation)

## Writing Effective Analysis Criteria

The quality of your results depends on your analysis criteria. Here are some examples:

### Sample Criteria File

```
Analyze this article for information about artificial intelligence applications in healthcare.
Consider:
1. Mentions of specific AI technologies (machine learning, deep learning, etc.)
2. Applications in diagnosis, treatment, or patient care
3. Implementation in hospitals or healthcare systems
4. Benefits, challenges, and ethical considerations
5. Clinical trials or research studies with outcomes

The most relevant articles will contain specific examples of AI technologies being deployed in healthcare settings with measurable results.
```

### Tips for Better Results

1. Be specific about what makes content relevant
2. Include both general and specific criteria
3. Mention what would make an article highly relevant
4. Consider including what would make an article less relevant
5. Use clear, objective language

## Improving the Tool

You can customize the tool by:

1. **Customizing criteria**: Write more specific analysis prompts
2. **Adjusting thresholds**: Change minimum relevance scores for inclusion
3. **Modifying the Claude prompt**: Edit the `createAnalysisPrompt` function in `relevanceAnalyzer.ts`
4. **Extending export formats**: Add new export formats in `exportFormatter.ts`
5. **Refining content extraction**: Enhance the HTML parsing in `articleExtractor.ts`

## Security and Costs

- All dependencies are modern and secure
- Rate limiting prevents excessive costs
- Monthly budget limits protect against unexpected charges
- No browser automation dependencies (uses lightweight HTML parsing)

## License

MIT