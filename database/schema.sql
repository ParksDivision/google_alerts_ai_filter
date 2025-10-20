-- RSS Content Analyzer Database Schema
-- PostgreSQL 12+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT true,

  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- ============================================================================
-- RSS FEEDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS rss_feeds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url VARCHAR(2048) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_fetched_at TIMESTAMP,
  fetch_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  last_error TEXT,

  CONSTRAINT unique_user_feed_url UNIQUE (user_id, url),
  CONSTRAINT url_format CHECK (url ~* '^https?://')
);

-- ============================================================================
-- ANALYSIS PROMPTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS analysis_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  prompt_text TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  usage_count INTEGER DEFAULT 0,

  CONSTRAINT unique_user_prompt_name UNIQUE (user_id, name),
  CONSTRAINT prompt_text_length CHECK (char_length(prompt_text) >= 10)
);

-- ============================================================================
-- ANALYSIS JOBS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS analysis_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prompt_id UUID REFERENCES analysis_prompts(id) ON DELETE SET NULL,

  -- Job status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  current_step VARCHAR(255),
  total_articles INTEGER DEFAULT 0,
  processed_articles INTEGER DEFAULT 0,

  -- Configuration
  min_relevance_score INTEGER DEFAULT 0,
  export_format VARCHAR(20) DEFAULT 'html',
  include_full_content BOOLEAN DEFAULT true,

  -- Results
  result_file_path TEXT,
  articles_analyzed INTEGER DEFAULT 0,
  articles_above_threshold INTEGER DEFAULT 0,

  -- Costs & Performance
  ai_cost DECIMAL(10, 4) DEFAULT 0,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  duration_seconds INTEGER,

  -- Metadata
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Selected feeds for this job (JSONB array of feed IDs)
  feed_ids JSONB,

  CONSTRAINT check_progress CHECK (progress >= 0 AND progress <= 100),
  CONSTRAINT check_status CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  CONSTRAINT check_min_score CHECK (min_relevance_score >= 0 AND min_relevance_score <= 100),
  CONSTRAINT check_export_format CHECK (export_format IN ('html', 'csv', 'excel', 'json', 'markdown'))
);

-- ============================================================================
-- ANALYZED ARTICLES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS analyzed_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
  feed_id UUID REFERENCES rss_feeds(id) ON DELETE SET NULL,

  -- Article metadata
  title VARCHAR(1024),
  url VARCHAR(2048) NOT NULL,
  published_at TIMESTAMP,

  -- Content
  content TEXT,
  content_excerpt TEXT,

  -- Analysis results
  relevance_score INTEGER NOT NULL,
  relevance_explanation TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_job_article_url UNIQUE (job_id, url),
  CONSTRAINT check_relevance_score CHECK (relevance_score >= 0 AND relevance_score <= 100)
);

-- ============================================================================
-- API TOKENS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS api_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,

  CONSTRAINT unique_token_hash UNIQUE (token_hash)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true;

-- RSS Feeds indexes
CREATE INDEX IF NOT EXISTS idx_rss_feeds_user_id ON rss_feeds(user_id);
CREATE INDEX IF NOT EXISTS idx_rss_feeds_active ON rss_feeds(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_rss_feeds_user_active ON rss_feeds(user_id, is_active);

-- Analysis Prompts indexes
CREATE INDEX IF NOT EXISTS idx_analysis_prompts_user_id ON analysis_prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_prompts_default ON analysis_prompts(is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_analysis_prompts_user_default ON analysis_prompts(user_id, is_default);

-- Analysis Jobs indexes
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_user_id ON analysis_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_status ON analysis_jobs(status);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_created_at ON analysis_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_user_status ON analysis_jobs(user_id, status);

-- Analyzed Articles indexes
CREATE INDEX IF NOT EXISTS idx_analyzed_articles_job_id ON analyzed_articles(job_id);
CREATE INDEX IF NOT EXISTS idx_analyzed_articles_relevance ON analyzed_articles(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_analyzed_articles_job_relevance ON analyzed_articles(job_id, relevance_score DESC);

-- API Tokens indexes
CREATE INDEX IF NOT EXISTS idx_api_tokens_user_id ON api_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_api_tokens_active ON api_tokens(is_active) WHERE is_active = true;

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rss_feeds_updated_at BEFORE UPDATE ON rss_feeds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analysis_prompts_updated_at BEFORE UPDATE ON analysis_prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View for user statistics
CREATE OR REPLACE VIEW user_stats AS
SELECT
  u.id as user_id,
  u.email,
  COUNT(DISTINCT f.id) as feed_count,
  COUNT(DISTINCT p.id) as prompt_count,
  COUNT(DISTINCT j.id) as job_count,
  COUNT(DISTINCT CASE WHEN j.status = 'completed' THEN j.id END) as completed_jobs,
  COALESCE(SUM(j.ai_cost), 0) as total_ai_cost,
  MAX(j.created_at) as last_job_created
FROM users u
LEFT JOIN rss_feeds f ON u.id = f.user_id AND f.is_active = true
LEFT JOIN analysis_prompts p ON u.id = p.user_id
LEFT JOIN analysis_jobs j ON u.id = j.user_id
GROUP BY u.id, u.email;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE users IS 'User accounts for the RSS analyzer system';
COMMENT ON TABLE rss_feeds IS 'RSS feed sources configured by users';
COMMENT ON TABLE analysis_prompts IS 'Custom AI analysis prompts created by users';
COMMENT ON TABLE analysis_jobs IS 'Analysis job executions with status and results';
COMMENT ON TABLE analyzed_articles IS 'Individual article analysis results';
COMMENT ON TABLE api_tokens IS 'API tokens for programmatic access';
