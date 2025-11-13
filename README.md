# RSS Content Analyzer

A secure, full-stack application to fetch RSS feeds, scrape, analyze, and rank content using AI (OpenAI GPT-5 or Claude).

## Features

### API Server (Production-Ready)
- **RESTful API**: Complete Express.js API with JWT authentication
- **User Management**: Secure registration, login, and profile management
- **RSS Feed Management**: CRUD operations for RSS feeds with validation
- **AI Analysis**: Use OpenAI GPT-5-mini or Claude to analyze content relevance
- **Background Jobs**: Asynchronous analysis with real-time progress tracking
- **Custom Prompts**: Create and manage analysis criteria templates
- **Multiple Export Formats**: HTML, Excel, CSV, JSON, and Markdown
- **Cost Management**: Built-in API cost tracking and budget limits
- **Rate Limiting**: Protect against abuse with configurable rate limits
- **PostgreSQL Database**: Full relational database with migrations

### CLI Tool (Development & Standalone)
- **RSS Feed Processing**: Fetch and process multiple RSS feeds to extract article links
- **Secure Content Scraping**: Extract clean article content from RSS feed links
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

# Set up your environment variables
cp .env.example .env
# Edit .env with your database URL, JWT secret, and OpenAI API key

# Build the project
npm run build

# Run database migrations
npm run migrate
```

## Modes of Operation

This application can run in two modes:

### 1. API Server Mode (Recommended for Production)
Full-featured REST API with authentication, database, and multi-user support.

```bash
# Development
npm run dev

# Production
npm start
```

### 2. CLI Mode (Standalone)
Command-line tool for quick analysis without database or authentication.

```bash
npm run cli
```

## API Server Quick Start

### Prerequisites
1. PostgreSQL database
2. OpenAI API key
3. Strong JWT secret (generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)

### Start the Server

```bash
# Set up .env file (see .env.example)
# Ensure DATABASE_URL, JWT_SECRET, and OPENAI_API_KEY are set

# Run migrations
npm run migrate

# Start development server
npm run dev

# Or build and start production
npm run build
npm start
```

Server will start on `http://localhost:3001` (or your configured PORT)

### API Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/me` - Update user profile

#### RSS Feeds (Protected)
- `GET /api/feeds` - List all feeds
- `POST /api/feeds` - Create new feed
- `GET /api/feeds/:id` - Get single feed
- `PUT /api/feeds/:id` - Update feed
- `DELETE /api/feeds/:id` - Delete feed
- `POST /api/feeds/test` - Test feed URL

#### Analysis Prompts (Protected)
- `GET /api/prompts` - List prompts
- `POST /api/prompts` - Create prompt
- `GET /api/prompts/:id` - Get prompt
- `PUT /api/prompts/:id` - Update prompt
- `DELETE /api/prompts/:id` - Delete prompt

#### Analysis Jobs (Protected)
- `POST /api/jobs` - Create and start analysis job
- `GET /api/jobs` - List jobs
- `GET /api/jobs/:id` - Get job details
- `GET /api/jobs/:id/progress` - Real-time progress (SSE)
- `GET /api/jobs/:id/results` - Get analyzed articles
- `DELETE /api/jobs/:id` - Cancel job

All protected endpoints require `Authorization: Bearer <token>` header.

### Example: Running an Analysis

```bash
# 1. Register user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123!","name":"User"}'

# 2. Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123!"}'
# Save the access_token from response

# 3. Add RSS feed
curl -X POST http://localhost:3001/api/feeds \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"url":"https://news.ycombinator.com/rss","name":"Hacker News"}'

# 4. Create analysis prompt
curl -X POST http://localhost:3001/api/prompts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"AI Filter","prompt_text":"Analyze for AI relevance...","is_default":true}'

# 5. Run analysis job
curl -X POST http://localhost:3001/api/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"min_relevance_score":50,"export_format":"html"}'
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment instructions.

---

## CLI Mode Quick Start

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