# RSS Content Analyzer

A secure, modern tool to fetch RSS feeds, scrape, analyze, and sort content using Claude Haiku.

## Features

- **RSS Feed Processing**: Fetch and process multiple RSS feeds to extract article links
- **Secure Content Scraping**: Extract clean article content from RSS feed links
- **AI Analysis**: Use Claude Haiku to analyze content relevance based on custom criteria
- **Multiple Export Formats**: Export sorted results as HTML, Excel, CSV, JSON, or Markdown
- **Cost Management**: Stay within your budget with built-in API cost tracking
- **Type Safety**: Uses Zod for runtime validation and TypeScript for compile-time safety
- **Batch Processing**: Handle large datasets efficiently
- **Interactive Reports**: Filter and sort results with interactive HTML exports
- **One-Command Execution**: Process everything from RSS feeds to HTML dashboard in a single command

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

## Quick Start

The easiest way to run the complete pipeline:

1. Create a `rss-feeds.csv` file with your RSS feed URLs:
```csv
Feed URL,Alert Name
https://news.ycombinator.com/rss,Hacker News
https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml,NYT Technology
https://feeds.bbci.co.uk/news/technology/rss.xml,BBC Tech News
```

2. Create a `promptCriteria.txt` file with your analysis criteria:
```
Analyze this article for information about artificial intelligence applications in business.
Consider:
1. Mentions of specific AI technologies (machine learning, deep learning, etc.)
2. Applications in business processes, decision-making, or customer service
3. Implementation details, challenges, and benefits
4. Case studies or examples with measurable results

The most relevant articles will contain specific examples with real-world outcomes.
```

3. Run the complete pipeline:
```bash
# Make the run script executable
chmod +x run.sh

# Run the complete pipeline
./run.sh
```

This will:
- Process RSS feeds to extract article links
- Scrape article content
- Analyze content relevance with Claude
- Generate an HTML report
- Start a local server to view results

## Usage

### Complete Pipeline (One Command)

```bash
npm run run-all -- --export-format html --min-score 30
```

### Individual Steps

If you prefer to run each step separately:

#### 1. Process RSS Feeds to CSV

```bash
npm run process-rss -- ./rss-feeds.csv ./input/processed.csv
```

#### 2. Analyze Content

```bash
npm run analyze -- ./input/processed.csv ./promptCriteria.txt \
  --export-format html \
  --min-score 50 \
  --include-content true \
  --start-server true
```

#### 3. View Results

```bash
npm run serve -- --port 3000
```

### Options

#### RSS Processing
- `--feedsFile`: Path to CSV file with RSS feed URLs (default: ./rss-feeds.csv)
- `--outputPath`: Path for the processed CSV output

#### Analysis
- `--output-dir`: Directory for output files (default: ./output)
- `--skip-scraping`: Skip scraping and use existing data
- `--scraped-data`: Path to existing scraped data
- `--export-format`: Format for results (csv, excel, json, markdown, html)
- `--min-score`: Minimum relevance score (0-100) for inclusion
- `--include-content`: Include full article content in export

#### Server
- `--port`: Port for the web server (default: 3000)

## Input Format

### RSS Feeds CSV

The tool expects a CSV file with the following columns:
- `Feed URL`: The URL to the RSS feed
- `Alert Name`: A name/category for the feed

Example:
```csv
Feed URL,Alert Name
https://news.ycombinator.com/rss,Hacker News
https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml,NYT Technology
```

### Analysis Criteria

Create a text file (e.g., `promptCriteria.txt`) with your analysis criteria. This will be used to instruct Claude on how to evaluate article relevance.

## Configuration

Configuration can be set via environment variables in an `.env` file:

- **API Keys**: Set your `CLAUDE_API_KEY`
- **Paths**: Configure input/output directories
- **RSS Settings**: Concurrent requests, timeouts, retries
- **Scraper Settings**: Concurrent requests, timeouts, retries
- **Claude API Settings**: Model, token limits, cost management
- **Export Settings**: Default format, minimum score
- **Performance Settings**: Batching, memory usage

See `.env.example` for all available configuration options.

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

## Project Structure

```
rss-content-analyzer/
├── src/
│   ├── rss/                 # RSS feed processing
│   │   └── feedProcessor.ts
│   ├── scraper/             # Article content scraping
│   ├── analysis/            # Claude analysis
│   ├── utils/               # Utility functions
│   │   ├── csvHandler.ts
│   │   ├── criteriaUtils.ts
│   │   └── exportFormatter.ts
│   ├── config.ts            # Configuration
│   ├── index.ts             # Main entry point
│   └── server.ts            # Web server
├── input/                   # Input directory
├── output/                  # Output directory
├── promptCriteria.txt       # Analysis criteria
├── rss-feeds.csv            # RSS feed URLs
├── .env                     # Environment variables
└── run.sh                   # Easy start script
```

## License

MIT