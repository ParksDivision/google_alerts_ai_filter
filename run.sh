#!/bin/bash

# Check if required files exist
if [ ! -f ".env" ]; then
  echo "Error: .env file not found. Please create it from the .env.example template."
  exit 1
fi

if [ ! -f "rss-feeds.csv" ]; then
  echo "Error: rss-feeds.csv file not found. Please create it with your RSS feed URLs."
  echo "Creating a sample rss-feeds.csv file..."
  cat > rss-feeds.csv << EOL
Feed URL,Alert Name
https://example.com/feed.xml,Technology News
https://another-example.com/rss,Industry Updates
EOL
  echo "Sample rss-feeds.csv created. Please edit it with your actual RSS feed URLs."
  exit 1
fi

# Check if promptCriteria.txt exists, create a default one if not
if [ ! -f "promptCriteria.txt" ]; then
  echo "Warning: promptCriteria.txt not found. Creating a default criteria file..."
  cat > promptCriteria.txt << EOL
Analyze this article for general relevance and quality.
Consider:
1. Information accuracy and factual content
2. Depth of analysis and insight
3. Writing quality and clarity
4. Credibility of sources
5. Timeliness and newsworthiness

The most relevant articles will contain specific, accurate, and insightful information from credible sources.
EOL
  echo "Default promptCriteria.txt created. You may want to edit it for your specific needs."
fi

# Make sure the project is built
npm run build

# Run the complete pipeline
npm run run-all -- --port 3000 --export-format html --min-score 30

echo "Process completed! You can access the results at http://localhost:3000/"