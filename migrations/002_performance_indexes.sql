-- Migration: Performance Indexes
-- Description: Add critical indexes for query performance
-- Date: 2025-10-20

-- Index for feed lookups by user and active status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rss_feeds_user_active
ON rss_feeds(user_id, is_active)
WHERE is_active = true;

-- Index for finding default prompts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analysis_prompts_user_default
ON analysis_prompts(user_id, is_default)
WHERE is_default = true;

-- Index for job filtering and sorting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analysis_jobs_user_status_created
ON analysis_jobs(user_id, status, created_at DESC);

-- Index for job status lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analysis_jobs_status
ON analysis_jobs(status)
WHERE status IN ('pending', 'running');

-- Index for article results by job
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analyzed_articles_job_score
ON analyzed_articles(job_id, relevance_score DESC);

-- Index for user lookups by email (for login)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email
ON users(email);

-- Index for prompt search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analysis_prompts_user_name
ON analysis_prompts(user_id, name);

-- Index for feed search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rss_feeds_user_name
ON rss_feeds(user_id, name);

-- Composite index for job cost tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analysis_jobs_user_created_cost
ON analysis_jobs(user_id, created_at DESC, ai_cost);

COMMENT ON INDEX idx_rss_feeds_user_active IS 'Optimizes active feed lookups per user';
COMMENT ON INDEX idx_analysis_prompts_user_default IS 'Optimizes default prompt lookups';
COMMENT ON INDEX idx_analysis_jobs_user_status_created IS 'Optimizes job listing and filtering';
COMMENT ON INDEX idx_analysis_jobs_status IS 'Optimizes running job queries';
COMMENT ON INDEX idx_analyzed_articles_job_score IS 'Optimizes article result retrieval';
COMMENT ON INDEX idx_users_email IS 'Optimizes login queries';
COMMENT ON INDEX idx_analysis_prompts_user_name IS 'Optimizes prompt search';
COMMENT ON INDEX idx_rss_feeds_user_name IS 'Optimizes feed search';
COMMENT ON INDEX idx_analysis_jobs_user_created_cost IS 'Optimizes cost reporting';
