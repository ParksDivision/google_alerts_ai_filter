-- Migration: Initial Schema
-- Created: 2025-10-19
-- Description: Creates all initial tables, indexes, and triggers for the RSS analyzer

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- UP MIGRATION
-- ============================================================================

-- Users table
CREATE TABLE users (
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

-- RSS Feeds table
CREATE TABLE rss_feeds (
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

-- Analysis Prompts table
CREATE TABLE analysis_prompts (
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

-- Analysis Jobs table
CREATE TABLE analysis_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prompt_id UUID REFERENCES analysis_prompts(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  current_step VARCHAR(255),
  total_articles INTEGER DEFAULT 0,
  processed_articles INTEGER DEFAULT 0,
  min_relevance_score INTEGER DEFAULT 0,
  export_format VARCHAR(20) DEFAULT 'html',
  include_full_content BOOLEAN DEFAULT true,
  result_file_path TEXT,
  articles_analyzed INTEGER DEFAULT 0,
  articles_above_threshold INTEGER DEFAULT 0,
  ai_cost DECIMAL(10, 4) DEFAULT 0,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  duration_seconds INTEGER,
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  feed_ids JSONB,
  CONSTRAINT check_progress CHECK (progress >= 0 AND progress <= 100),
  CONSTRAINT check_status CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  CONSTRAINT check_min_score CHECK (min_relevance_score >= 0 AND min_relevance_score <= 100),
  CONSTRAINT check_export_format CHECK (export_format IN ('html', 'csv', 'excel', 'json', 'markdown'))
);

-- Analyzed Articles table
CREATE TABLE analyzed_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
  feed_id UUID REFERENCES rss_feeds(id) ON DELETE SET NULL,
  title VARCHAR(1024),
  url VARCHAR(2048) NOT NULL,
  published_at TIMESTAMP,
  content TEXT,
  content_excerpt TEXT,
  relevance_score INTEGER NOT NULL,
  relevance_explanation TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_job_article_url UNIQUE (job_id, url),
  CONSTRAINT check_relevance_score CHECK (relevance_score >= 0 AND relevance_score <= 100)
);

-- API Tokens table
CREATE TABLE api_tokens (
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

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;
CREATE INDEX idx_rss_feeds_user_id ON rss_feeds(user_id);
CREATE INDEX idx_rss_feeds_active ON rss_feeds(is_active) WHERE is_active = true;
CREATE INDEX idx_rss_feeds_user_active ON rss_feeds(user_id, is_active);
CREATE INDEX idx_analysis_prompts_user_id ON analysis_prompts(user_id);
CREATE INDEX idx_analysis_prompts_default ON analysis_prompts(is_default) WHERE is_default = true;
CREATE INDEX idx_analysis_prompts_user_default ON analysis_prompts(user_id, is_default);
CREATE INDEX idx_analysis_jobs_user_id ON analysis_jobs(user_id);
CREATE INDEX idx_analysis_jobs_status ON analysis_jobs(status);
CREATE INDEX idx_analysis_jobs_created_at ON analysis_jobs(created_at DESC);
CREATE INDEX idx_analysis_jobs_user_status ON analysis_jobs(user_id, status);
CREATE INDEX idx_analyzed_articles_job_id ON analyzed_articles(job_id);
CREATE INDEX idx_analyzed_articles_relevance ON analyzed_articles(relevance_score DESC);
CREATE INDEX idx_analyzed_articles_job_relevance ON analyzed_articles(job_id, relevance_score DESC);
CREATE INDEX idx_api_tokens_user_id ON api_tokens(user_id);
CREATE INDEX idx_api_tokens_active ON api_tokens(is_active) WHERE is_active = true;

-- Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rss_feeds_updated_at BEFORE UPDATE ON rss_feeds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analysis_prompts_updated_at BEFORE UPDATE ON analysis_prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views
CREATE VIEW user_stats AS
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
