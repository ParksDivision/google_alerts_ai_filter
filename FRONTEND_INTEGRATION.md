# Frontend Integration Guide - Simple Single Prompt UI

This is a **complete guide** for building a frontend that connects to the RSS Content Analyzer API. This guide assumes a **simple UI with one prompt per user** (the easiest approach).

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [Required Pages](#required-pages)
- [API Base URL](#api-base-url)
- [Complete API Reference](#complete-api-reference)
- [TypeScript Types (Copy-Paste Ready)](#typescript-types-copy-paste-ready)
- [Authentication Implementation](#authentication-implementation)
- [Dashboard Implementation](#dashboard-implementation)
- [Results Page Implementation](#results-page-implementation)
- [Error Handling](#error-handling)
- [CORS Configuration](#cors-configuration)
- [Deployment Notes](#deployment-notes)

---

## Architecture Overview

### Pages You Need to Build

1. **Login/Register Page** - User authentication
2. **Dashboard Page** - Main interface with:
   - Prompt editor (textarea)
   - RSS feed management
   - "Run Analysis" button
3. **Results Page** - Display analyzed articles with scores

### Data Flow

```
User Login → Store JWT Token → Dashboard (Edit Prompt, Manage Feeds)
  ↓
Run Analysis → Job Created → Track Progress (Real-time)
  ↓
Job Complete → Show Results → Display Articles Ranked by Score
```

---

## API Base URL

**Development:** `http://localhost:3001`
**Production:** `https://your-app-name.herokuapp.com`

Replace `API_BASE_URL` in all examples below with your actual URL.

---

## Complete API Reference

### Authentication Endpoints

#### 1. Register User
```
POST /api/auth/register
Content-Type: application/json

Request Body:
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}

Response (200):
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "created_at": "2025-01-09T..."
    },
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc..."
  }
}

Error (400/409):
{
  "success": false,
  "error": "Email already exists"
}
```

#### 2. Login
```
POST /api/auth/login
Content-Type: application/json

Request Body:
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response (200):
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc..."
  }
}

Error (401):
{
  "success": false,
  "error": "Invalid credentials"
}
```

#### 3. Get Current User
```
GET /api/auth/me
Authorization: Bearer <access_token>

Response (200):
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "created_at": "2025-01-09T..."
    }
  }
}
```

#### 4. Logout
```
POST /api/auth/logout
Authorization: Bearer <access_token>

Response (200):
{
  "success": true,
  "message": "Logged out successfully"
}

Action: Delete tokens from localStorage
```

---

### Prompt Management (Simple - Single Prompt)

#### 1. Get Default Prompt
```
GET /api/prompts/default
Authorization: Bearer <access_token>

Response (200):
{
  "success": true,
  "data": {
    "prompt": {
      "id": "uuid",
      "user_id": "uuid",
      "name": "My Analysis Criteria",
      "description": "AI relevance filter",
      "prompt_text": "Analyze this article for...",
      "is_default": true,
      "usage_count": 5,
      "created_at": "2025-01-09T...",
      "updated_at": "2025-01-09T..."
    }
  }
}

Response (404) - No prompt exists yet:
{
  "success": false,
  "error": "No default prompt set"
}
```

#### 2. Create Prompt (First Time Setup)
```
POST /api/prompts
Authorization: Bearer <access_token>
Content-Type: application/json

Request Body:
{
  "name": "My Analysis Criteria",
  "description": "Filter for AI and tech articles",
  "prompt_text": "Analyze this article for relevance to artificial intelligence...",
  "is_default": true
}

Response (201):
{
  "success": true,
  "message": "Prompt created successfully",
  "data": {
    "prompt": {
      "id": "uuid",
      "user_id": "uuid",
      "name": "My Analysis Criteria",
      "description": "Filter for AI and tech articles",
      "prompt_text": "Analyze this article for...",
      "is_default": true,
      "usage_count": 0,
      "created_at": "2025-01-09T...",
      "updated_at": "2025-01-09T..."
    }
  }
}
```

#### 3. Update Prompt (When User Edits)
```
PUT /api/prompts/:id
Authorization: Bearer <access_token>
Content-Type: application/json

Request Body (all fields optional):
{
  "name": "Updated Name",
  "description": "Updated description",
  "prompt_text": "Updated analysis criteria..."
}

Response (200):
{
  "success": true,
  "message": "Prompt updated successfully",
  "data": {
    "prompt": {
      "id": "uuid",
      "prompt_text": "Updated analysis criteria...",
      ...
    }
  }
}
```

---

### RSS Feed Management

#### 1. Get All Feeds
```
GET /api/feeds?active=true
Authorization: Bearer <access_token>

Query Parameters (optional):
- active: "true" | "false" (filter by active status)
- limit: number (default: 50)
- offset: number (default: 0)

Response (200):
{
  "success": true,
  "data": {
    "feeds": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "url": "https://news.ycombinator.com/rss",
        "name": "Hacker News",
        "description": "Tech news",
        "is_active": true,
        "last_fetched_at": "2025-01-09T...",
        "last_article_count": 30,
        "created_at": "2025-01-09T...",
        "updated_at": "2025-01-09T..."
      }
    ],
    "total": 1
  }
}
```

#### 2. Create Feed
```
POST /api/feeds
Authorization: Bearer <access_token>
Content-Type: application/json

Request Body:
{
  "url": "https://feeds.bbci.co.uk/news/technology/rss.xml",
  "name": "BBC Tech News",
  "description": "BBC technology news feed",
  "is_active": true
}

Response (201):
{
  "success": true,
  "message": "Feed created successfully",
  "data": {
    "feed": {
      "id": "uuid",
      "url": "https://feeds.bbci.co.uk/news/technology/rss.xml",
      "name": "BBC Tech News",
      "description": "BBC technology news feed",
      "is_active": true,
      ...
    }
  }
}

Error (400):
{
  "success": false,
  "error": "Invalid RSS feed URL"
}
```

#### 3. Update Feed
```
PUT /api/feeds/:id
Authorization: Bearer <access_token>
Content-Type: application/json

Request Body (all optional):
{
  "name": "Updated Name",
  "description": "Updated description",
  "is_active": false
}

Response (200):
{
  "success": true,
  "message": "Feed updated successfully",
  "data": {
    "feed": { ... }
  }
}
```

#### 4. Delete Feed
```
DELETE /api/feeds/:id
Authorization: Bearer <access_token>

Response (200):
{
  "success": true,
  "message": "Feed deleted successfully"
}
```

#### 5. Test Feed URL (Before Creating)
```
POST /api/feeds/test
Authorization: Bearer <access_token>
Content-Type: application/json

Request Body:
{
  "url": "https://feeds.bbci.co.uk/news/rss.xml"
}

Response (200):
{
  "success": true,
  "data": {
    "valid": true,
    "title": "BBC News",
    "item_count": 50,
    "sample_items": [
      {
        "title": "Article title",
        "link": "https://...",
        "pubDate": "2025-01-09T..."
      }
    ]
  }
}

Error (400):
{
  "success": false,
  "error": "Failed to fetch RSS feed"
}
```

---

### Analysis Jobs

#### 1. Create and Start Job
```
POST /api/jobs
Authorization: Bearer <access_token>
Content-Type: application/json

Request Body (all optional):
{
  "prompt_id": "uuid",           // Optional: defaults to user's default prompt
  "feed_ids": ["uuid1", "uuid2"], // Optional: defaults to all active feeds
  "min_relevance_score": 50,      // 0-100, default: 0
  "export_format": "html",        // "html" | "csv" | "excel" | "json" | "markdown"
  "include_full_content": true    // Include article content, default: true
}

Response (201):
{
  "success": true,
  "data": {
    "job": {
      "id": "uuid",
      "user_id": "uuid",
      "prompt_id": "uuid",
      "status": "pending",
      "progress": 0,
      "current_step": "Initializing",
      "feed_ids": ["uuid1", "uuid2"],
      "min_relevance_score": 50,
      "export_format": "html",
      "include_full_content": true,
      "result_file_path": null,
      "total_articles": null,
      "relevant_articles": null,
      "input_tokens": null,
      "output_tokens": null,
      "estimated_cost": null,
      "duration_seconds": null,
      "error_message": null,
      "started_at": null,
      "completed_at": null,
      "created_at": "2025-01-09T..."
    },
    "message": "Job created and started. Use the progress endpoint to track status."
  }
}
```

#### 2. Get Job Status
```
GET /api/jobs/:id
Authorization: Bearer <access_token>

Response (200):
{
  "success": true,
  "data": {
    "job": {
      "id": "uuid",
      "status": "running",
      "progress": 45,
      "current_step": "Analyzing articles",
      "total_articles": 100,
      "relevant_articles": 23,
      ...
    }
  }
}
```

#### 3. Real-time Progress (Server-Sent Events)
```
GET /api/jobs/:id/progress?token=<access_token>

Content-Type: text/event-stream

Stream Data (every few seconds):
data: {"jobId":"uuid","status":"running","progress":10,"currentStep":"Fetching RSS feeds","totalArticles":0,"processedArticles":0}

data: {"jobId":"uuid","status":"running","progress":30,"currentStep":"Scraping articles","totalArticles":50,"processedArticles":15}

data: {"jobId":"uuid","status":"running","progress":70,"currentStep":"Analyzing with AI","totalArticles":50,"processedArticles":35}

data: {"jobId":"uuid","status":"completed","progress":100,"currentStep":"Complete","totalArticles":50,"processedArticles":50}
```

#### 4. Get Job Results
```
GET /api/jobs/:id/results?min_score=50&limit=100&offset=0
Authorization: Bearer <access_token>

Query Parameters (optional):
- min_score: number (filter by relevance score)
- limit: number (default: 100)
- offset: number (default: 0)

Response (200):
{
  "success": true,
  "data": {
    "articles": [
      {
        "id": "uuid",
        "job_id": "uuid",
        "title": "AI Breakthrough in Healthcare",
        "url": "https://example.com/article",
        "published_at": "2025-01-09T...",
        "content": "Full article text...",
        "excerpt": "Short excerpt...",
        "relevance_score": 95,
        "relevance_explanation": "This article discusses cutting-edge AI applications in medical diagnosis...",
        "analyzed_at": "2025-01-09T..."
      }
    ],
    "total": 25,
    "job": {
      "id": "uuid",
      "status": "completed",
      "total_articles": 50,
      "relevant_articles": 25,
      "estimated_cost": 0.45,
      ...
    }
  }
}
```

#### 5. List User's Jobs
```
GET /api/jobs?status=completed&limit=20&offset=0
Authorization: Bearer <access_token>

Query Parameters (optional):
- status: "pending" | "running" | "completed" | "failed" | "cancelled"
- limit: number (default: 50)
- offset: number (default: 0)

Response (200):
{
  "success": true,
  "data": {
    "jobs": [
      {
        "id": "uuid",
        "status": "completed",
        "progress": 100,
        "total_articles": 50,
        "relevant_articles": 25,
        "created_at": "2025-01-09T...",
        ...
      }
    ],
    "total": 5
  }
}
```

#### 6. Cancel Running Job
```
DELETE /api/jobs/:id
Authorization: Bearer <access_token>

Response (200):
{
  "success": true,
  "message": "Job cancelled successfully"
}
```

---

## TypeScript Types (Copy-Paste Ready)

```typescript
// ============================================================================
// API Response Wrapper
// ============================================================================
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================================================
// Authentication
// ============================================================================
interface User {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login: string | null;
}

interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

// ============================================================================
// Prompts
// ============================================================================
interface Prompt {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  prompt_text: string;
  is_default: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

interface CreatePromptRequest {
  name: string;
  description?: string;
  prompt_text: string;
  is_default?: boolean;
}

interface UpdatePromptRequest {
  name?: string;
  description?: string;
  prompt_text?: string;
  is_default?: boolean;
}

// ============================================================================
// RSS Feeds
// ============================================================================
interface RSSFeed {
  id: string;
  user_id: string;
  url: string;
  name: string;
  description: string | null;
  is_active: boolean;
  last_fetched_at: string | null;
  last_article_count: number | null;
  created_at: string;
  updated_at: string;
}

interface CreateFeedRequest {
  url: string;
  name: string;
  description?: string;
  is_active?: boolean;
}

interface UpdateFeedRequest {
  url?: string;
  name?: string;
  description?: string;
  is_active?: boolean;
}

interface TestFeedRequest {
  url: string;
}

interface TestFeedResponse {
  valid: boolean;
  title?: string;
  item_count?: number;
  sample_items?: Array<{
    title: string;
    link: string;
    pubDate?: string;
  }>;
}

// ============================================================================
// Analysis Jobs
// ============================================================================
type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
type ExportFormat = 'html' | 'csv' | 'excel' | 'json' | 'markdown';

interface Job {
  id: string;
  user_id: string;
  prompt_id: string;
  status: JobStatus;
  progress: number; // 0-100
  current_step: string;
  feed_ids: string[] | null;
  min_relevance_score: number;
  export_format: ExportFormat;
  include_full_content: boolean;
  result_file_path: string | null;
  total_articles: number | null;
  relevant_articles: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  estimated_cost: number | null;
  duration_seconds: number | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface CreateJobRequest {
  prompt_id?: string;           // Optional: defaults to user's default prompt
  feed_ids?: string[];          // Optional: defaults to all active feeds
  min_relevance_score?: number; // 0-100, default: 0
  export_format?: ExportFormat; // default: 'html'
  include_full_content?: boolean; // default: true
}

interface JobProgress {
  jobId: string;
  status: JobStatus;
  progress: number; // 0-100
  currentStep: string;
  totalArticles: number;
  processedArticles: number;
  estimatedTimeRemaining?: number;
}

// ============================================================================
// Analyzed Articles
// ============================================================================
interface AnalyzedArticle {
  id: string;
  job_id: string;
  title: string;
  url: string;
  published_at: string | null;
  content: string | null;
  excerpt: string | null;
  relevance_score: number; // 0-100
  relevance_explanation: string | null;
  analyzed_at: string;
}

interface JobResultsResponse {
  articles: AnalyzedArticle[];
  total: number;
  job: Job;
}

// ============================================================================
// List Responses
// ============================================================================
interface FeedsListResponse {
  feeds: RSSFeed[];
  total: number;
}

interface JobsListResponse {
  jobs: Job[];
  total: number;
}

interface PromptsListResponse {
  prompts: Prompt[];
  total: number;
}
```

---

## Authentication Implementation

### Complete Auth Service (Copy-Paste Ready)

```typescript
// auth.service.ts
const API_BASE_URL = 'https://your-app.herokuapp.com'; // Change to your URL

class AuthService {
  private static TOKEN_KEY = 'access_token';
  private static REFRESH_KEY = 'refresh_token';
  private static USER_KEY = 'user';

  // Register new user
  async register(email: string, password: string, name: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    });

    const data: ApiResponse<AuthResponse> = await response.json();

    if (!data.success || !data.data) {
      throw new Error(data.error || 'Registration failed');
    }

    // Store tokens and user
    this.setTokens(data.data.access_token, data.data.refresh_token);
    this.setUser(data.data.user);

    return data.data.user;
  }

  // Login existing user
  async login(email: string, password: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data: ApiResponse<AuthResponse> = await response.json();

    if (!data.success || !data.data) {
      throw new Error(data.error || 'Login failed');
    }

    // Store tokens and user
    this.setTokens(data.data.access_token, data.data.refresh_token);
    this.setUser(data.data.user);

    return data.data.user;
  }

  // Logout
  async logout(): Promise<void> {
    try {
      const token = this.getAccessToken();
      if (token) {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } finally {
      this.clearAuth();
    }
  }

  // Get current user from API
  async getCurrentUser(): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: this.getAuthHeaders()
    });

    const data: ApiResponse<{ user: User }> = await response.json();

    if (!data.success || !data.data) {
      throw new Error(data.error || 'Failed to get user');
    }

    this.setUser(data.data.user);
    return data.data.user;
  }

  // Token management
  getAccessToken(): string | null {
    return localStorage.getItem(AuthService.TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(AuthService.REFRESH_KEY);
  }

  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(AuthService.TOKEN_KEY, accessToken);
    localStorage.setItem(AuthService.REFRESH_KEY, refreshToken);
  }

  // User management
  getUser(): User | null {
    const userStr = localStorage.getItem(AuthService.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  setUser(user: User): void {
    localStorage.setItem(AuthService.USER_KEY, JSON.stringify(user));
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.getAccessToken() !== null;
  }

  // Clear all auth data
  clearAuth(): void {
    localStorage.removeItem(AuthService.TOKEN_KEY);
    localStorage.removeItem(AuthService.REFRESH_KEY);
    localStorage.removeItem(AuthService.USER_KEY);
  }

  // Get headers for authenticated requests
  getAuthHeaders(): HeadersInit {
    const token = this.getAccessToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }
}

export const authService = new AuthService();
```

---

## Dashboard Implementation

### Complete Dashboard Service (Copy-Paste Ready)

```typescript
// dashboard.service.ts
import { authService } from './auth.service';

const API_BASE_URL = 'https://your-app.herokuapp.com'; // Change to your URL

class DashboardService {
  // ============================================================================
  // Prompt Management (Simple - Single Prompt)
  // ============================================================================

  /**
   * Get or create the user's default prompt
   * Call this on dashboard load
   */
  async getOrCreateDefaultPrompt(): Promise<Prompt> {
    try {
      // Try to get existing default prompt
      const response = await fetch(`${API_BASE_URL}/api/prompts/default`, {
        headers: authService.getAuthHeaders()
      });

      const data: ApiResponse<{ prompt: Prompt }> = await response.json();

      if (data.success && data.data) {
        return data.data.prompt;
      }
    } catch (error) {
      console.log('No default prompt found, creating one...');
    }

    // No default prompt exists, create one
    return this.createDefaultPrompt();
  }

  /**
   * Create the first default prompt
   */
  private async createDefaultPrompt(): Promise<Prompt> {
    const defaultPromptText = `Analyze this article for relevance to artificial intelligence and technology applications.

Consider the following factors:
1. Mentions of AI technologies (machine learning, deep learning, NLP, computer vision)
2. Real-world applications and use cases
3. Technical depth and implementation details
4. Business impact and measurable outcomes
5. Innovation and significance

Rate the article from 0-100 based on:
- 0-30: Not relevant or minimal AI/tech content
- 31-60: Somewhat relevant, mentions AI/tech but lacks depth
- 61-85: Highly relevant with substantial AI/tech content and insights
- 86-100: Exceptional content with deep technical insights and real-world impact

Provide a brief explanation (2-3 sentences) for your score.`;

    const response = await fetch(`${API_BASE_URL}/api/prompts`, {
      method: 'POST',
      headers: authService.getAuthHeaders(),
      body: JSON.stringify({
        name: 'My Analysis Criteria',
        description: 'AI and Technology Relevance Filter',
        prompt_text: defaultPromptText,
        is_default: true
      })
    });

    const data: ApiResponse<{ prompt: Prompt }> = await response.json();

    if (!data.success || !data.data) {
      throw new Error(data.error || 'Failed to create prompt');
    }

    return data.data.prompt;
  }

  /**
   * Update prompt text when user edits it
   */
  async updatePrompt(promptId: string, promptText: string): Promise<Prompt> {
    const response = await fetch(`${API_BASE_URL}/api/prompts/${promptId}`, {
      method: 'PUT',
      headers: authService.getAuthHeaders(),
      body: JSON.stringify({ prompt_text: promptText })
    });

    const data: ApiResponse<{ prompt: Prompt }> = await response.json();

    if (!data.success || !data.data) {
      throw new Error(data.error || 'Failed to update prompt');
    }

    return data.data.prompt;
  }

  // ============================================================================
  // RSS Feed Management
  // ============================================================================

  /**
   * Get all feeds (optionally filter by active status)
   */
  async getFeeds(activeOnly = false): Promise<RSSFeed[]> {
    const url = activeOnly
      ? `${API_BASE_URL}/api/feeds?active=true`
      : `${API_BASE_URL}/api/feeds`;

    const response = await fetch(url, {
      headers: authService.getAuthHeaders()
    });

    const data: ApiResponse<FeedsListResponse> = await response.json();

    if (!data.success || !data.data) {
      throw new Error(data.error || 'Failed to get feeds');
    }

    return data.data.feeds;
  }

  /**
   * Create new RSS feed
   */
  async createFeed(feed: CreateFeedRequest): Promise<RSSFeed> {
    const response = await fetch(`${API_BASE_URL}/api/feeds`, {
      method: 'POST',
      headers: authService.getAuthHeaders(),
      body: JSON.stringify(feed)
    });

    const data: ApiResponse<{ feed: RSSFeed }> = await response.json();

    if (!data.success || !data.data) {
      throw new Error(data.error || 'Failed to create feed');
    }

    return data.data.feed;
  }

  /**
   * Update RSS feed
   */
  async updateFeed(feedId: string, updates: UpdateFeedRequest): Promise<RSSFeed> {
    const response = await fetch(`${API_BASE_URL}/api/feeds/${feedId}`, {
      method: 'PUT',
      headers: authService.getAuthHeaders(),
      body: JSON.stringify(updates)
    });

    const data: ApiResponse<{ feed: RSSFeed }> = await response.json();

    if (!data.success || !data.data) {
      throw new Error(data.error || 'Failed to update feed');
    }

    return data.data.feed;
  }

  /**
   * Delete RSS feed
   */
  async deleteFeed(feedId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/feeds/${feedId}`, {
      method: 'DELETE',
      headers: authService.getAuthHeaders()
    });

    const data: ApiResponse = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to delete feed');
    }
  }

  /**
   * Test feed URL before creating
   */
  async testFeed(url: string): Promise<TestFeedResponse> {
    const response = await fetch(`${API_BASE_URL}/api/feeds/test`, {
      method: 'POST',
      headers: authService.getAuthHeaders(),
      body: JSON.stringify({ url })
    });

    const data: ApiResponse<TestFeedResponse> = await response.json();

    if (!data.success || !data.data) {
      throw new Error(data.error || 'Failed to test feed');
    }

    return data.data;
  }

  // ============================================================================
  // Analysis Jobs
  // ============================================================================

  /**
   * Create and start a new analysis job
   * Uses default prompt and all active feeds if not specified
   */
  async createJob(options?: CreateJobRequest): Promise<Job> {
    const response = await fetch(`${API_BASE_URL}/api/jobs`, {
      method: 'POST',
      headers: authService.getAuthHeaders(),
      body: JSON.stringify({
        min_relevance_score: 50,
        export_format: 'html',
        include_full_content: true,
        ...options
      })
    });

    const data: ApiResponse<{ job: Job }> = await response.json();

    if (!data.success || !data.data) {
      throw new Error(data.error || 'Failed to create job');
    }

    return data.data.job;
  }

  /**
   * Get job status
   */
  async getJob(jobId: string): Promise<Job> {
    const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`, {
      headers: authService.getAuthHeaders()
    });

    const data: ApiResponse<{ job: Job }> = await response.json();

    if (!data.success || !data.data) {
      throw new Error(data.error || 'Failed to get job');
    }

    return data.data.job;
  }

  /**
   * Track job progress with Server-Sent Events
   * Returns EventSource that you should close when done
   */
  trackJobProgress(
    jobId: string,
    onProgress: (progress: JobProgress) => void,
    onError?: (error: Event) => void
  ): EventSource {
    const token = authService.getAccessToken();
    const url = `${API_BASE_URL}/api/jobs/${jobId}/progress?token=${token}`;

    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      const progress: JobProgress = JSON.parse(event.data);
      onProgress(progress);

      // Auto-close when job is done
      if (['completed', 'failed', 'cancelled'].includes(progress.status)) {
        eventSource.close();
      }
    };

    eventSource.onerror = (error) => {
      console.error('Progress tracking error:', error);
      if (onError) onError(error);
      eventSource.close();
    };

    return eventSource;
  }

  /**
   * List user's jobs
   */
  async listJobs(status?: JobStatus, limit = 20, offset = 0): Promise<JobsListResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      ...(status && { status })
    });

    const response = await fetch(`${API_BASE_URL}/api/jobs?${params}`, {
      headers: authService.getAuthHeaders()
    });

    const data: ApiResponse<JobsListResponse> = await response.json();

    if (!data.success || !data.data) {
      throw new Error(data.error || 'Failed to list jobs');
    }

    return data.data;
  }

  /**
   * Cancel running job
   */
  async cancelJob(jobId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`, {
      method: 'DELETE',
      headers: authService.getAuthHeaders()
    });

    const data: ApiResponse = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to cancel job');
    }
  }
}

export const dashboardService = new DashboardService();
```

---

## Results Page Implementation

### Complete Results Service (Copy-Paste Ready)

```typescript
// results.service.ts
import { authService } from './auth.service';

const API_BASE_URL = 'https://your-app.herokuapp.com'; // Change to your URL

class ResultsService {
  /**
   * Get analyzed articles for a job
   */
  async getJobResults(
    jobId: string,
    minScore?: number,
    limit = 100,
    offset = 0
  ): Promise<JobResultsResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      ...(minScore !== undefined && { min_score: minScore.toString() })
    });

    const response = await fetch(
      `${API_BASE_URL}/api/jobs/${jobId}/results?${params}`,
      { headers: authService.getAuthHeaders() }
    );

    const data: ApiResponse<JobResultsResponse> = await response.json();

    if (!data.success || !data.data) {
      throw new Error(data.error || 'Failed to get results');
    }

    return data.data;
  }

  /**
   * Get job details (for results page header)
   */
  async getJob(jobId: string): Promise<Job> {
    const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`, {
      headers: authService.getAuthHeaders()
    });

    const data: ApiResponse<{ job: Job }> = await response.json();

    if (!data.success || !data.data) {
      throw new Error(data.error || 'Failed to get job');
    }

    return data.data.job;
  }
}

export const resultsService = new ResultsService();
```

---

## Error Handling

### Complete Error Handler (Copy-Paste Ready)

```typescript
// error-handler.ts
import { authService } from './auth.service';

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public isAuthError = false
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Wrap API calls with error handling
 */
export async function handleApiCall<T>(
  apiFunction: () => Promise<T>,
  errorMessage = 'An error occurred'
): Promise<T> {
  try {
    return await apiFunction();
  } catch (error) {
    console.error('API Error:', error);

    if (error instanceof ApiError) {
      // Already formatted error
      throw error;
    }

    if (error instanceof Error) {
      // Check for auth errors
      if (
        error.message.includes('Unauthorized') ||
        error.message.includes('Invalid token') ||
        error.message.includes('Token expired')
      ) {
        // Clear tokens and redirect to login
        authService.clearAuth();
        window.location.href = '/login';
        throw new ApiError('Session expired. Please login again.', 401, true);
      }

      // Other errors
      throw new ApiError(error.message || errorMessage);
    }

    throw new ApiError(errorMessage);
  }
}

/**
 * Display user-friendly error messages
 */
export function displayError(error: unknown): void {
  if (error instanceof ApiError) {
    if (error.isAuthError) {
      alert('Your session has expired. Please login again.');
    } else {
      alert(`Error: ${error.message}`);
    }
  } else if (error instanceof Error) {
    alert(`Error: ${error.message}`);
  } else {
    alert('An unexpected error occurred. Please try again.');
  }
}

/**
 * Example usage in your components:
 *
 * try {
 *   const feeds = await handleApiCall(
 *     () => dashboardService.getFeeds(),
 *     'Failed to load feeds'
 *   );
 * } catch (error) {
 *   displayError(error);
 * }
 */
```

---

## CORS Configuration

**IMPORTANT:** The backend must be configured with your frontend URL for CORS to work.

When deploying backend to Heroku, set this environment variable:

```bash
heroku config:set FRONTEND_URL="https://your-frontend-domain.com"

# For local development:
heroku config:set FRONTEND_URL="http://localhost:3000"
```

The backend is already configured to accept requests from the `FRONTEND_URL`.

---

## Deployment Notes

### Backend Deployment (Heroku)

1. Deploy backend first (see [DEPLOYMENT.md](./DEPLOYMENT.md))
2. Get your backend URL: `https://your-app-name.herokuapp.com`
3. Set `FRONTEND_URL` environment variable on Heroku

### Frontend Deployment

1. **Update `API_BASE_URL`** in all service files:
   ```typescript
   // For production:
   const API_BASE_URL = 'https://your-app-name.herokuapp.com';

   // Or use environment variables:
   const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
   ```

2. **Deploy frontend** to:
   - Vercel (recommended for Next.js/React)
   - Netlify (for static sites)
   - GitHub Pages
   - Any static hosting

3. **Update backend `FRONTEND_URL`**:
   ```bash
   heroku config:set FRONTEND_URL="https://your-frontend.vercel.app"
   ```

---

## Complete Frontend Workflow Example

```typescript
// ============================================================================
// 1. LOGIN PAGE
// ============================================================================
async function handleLogin(email: string, password: string) {
  try {
    const user = await handleApiCall(
      () => authService.login(email, password),
      'Login failed'
    );

    console.log('Logged in as:', user.name);

    // Redirect to dashboard
    window.location.href = '/dashboard';
  } catch (error) {
    displayError(error);
  }
}

// ============================================================================
// 2. DASHBOARD PAGE - ON LOAD
// ============================================================================
async function initializeDashboard() {
  try {
    // Load prompt
    const prompt = await handleApiCall(
      () => dashboardService.getOrCreateDefaultPrompt(),
      'Failed to load prompt'
    );

    // Display prompt in textarea
    document.getElementById('prompt-textarea').value = prompt.prompt_text;

    // Load feeds
    const feeds = await handleApiCall(
      () => dashboardService.getFeeds(),
      'Failed to load feeds'
    );

    // Display feeds in UI
    displayFeeds(feeds);

    // Load recent jobs
    const { jobs } = await handleApiCall(
      () => dashboardService.listJobs(undefined, 10, 0),
      'Failed to load jobs'
    );

    displayRecentJobs(jobs);
  } catch (error) {
    displayError(error);
  }
}

// ============================================================================
// 3. DASHBOARD - SAVE PROMPT
// ============================================================================
async function handleSavePrompt() {
  try {
    const promptText = document.getElementById('prompt-textarea').value;
    const promptId = getCurrentPromptId(); // Store this when loading prompt

    await handleApiCall(
      () => dashboardService.updatePrompt(promptId, promptText),
      'Failed to save prompt'
    );

    alert('Prompt saved successfully!');
  } catch (error) {
    displayError(error);
  }
}

// ============================================================================
// 4. DASHBOARD - ADD FEED
// ============================================================================
async function handleAddFeed(url: string, name: string) {
  try {
    // First test the feed
    const testResult = await handleApiCall(
      () => dashboardService.testFeed(url),
      'Failed to validate feed'
    );

    if (!testResult.valid) {
      alert('Invalid RSS feed URL');
      return;
    }

    // Create the feed
    const feed = await handleApiCall(
      () => dashboardService.createFeed({ url, name, is_active: true }),
      'Failed to add feed'
    );

    // Add to UI
    addFeedToList(feed);
    alert('Feed added successfully!');
  } catch (error) {
    displayError(error);
  }
}

// ============================================================================
// 5. DASHBOARD - RUN ANALYSIS
// ============================================================================
async function handleRunAnalysis() {
  try {
    // Create job
    const job = await handleApiCall(
      () => dashboardService.createJob({
        min_relevance_score: 50
      }),
      'Failed to start analysis'
    );

    console.log('Job created:', job.id);

    // Show progress modal/section
    showProgressUI();

    // Track progress in real-time
    const eventSource = dashboardService.trackJobProgress(
      job.id,
      (progress) => {
        // Update UI with progress
        updateProgressBar(progress.progress);
        updateStatusText(progress.currentStep);
        updateArticleCount(progress.processedArticles, progress.totalArticles);

        // Job complete - redirect to results
        if (progress.status === 'completed') {
          window.location.href = `/results?jobId=${job.id}`;
        }

        // Job failed - show error
        if (progress.status === 'failed') {
          alert('Analysis failed. Please try again.');
          hideProgressUI();
        }
      },
      (error) => {
        console.error('Progress tracking error:', error);
        alert('Lost connection. Refreshing status...');
        // Poll job status instead
        pollJobStatus(job.id);
      }
    );

    // Store eventSource to cancel if needed
    window.currentEventSource = eventSource;
  } catch (error) {
    displayError(error);
  }
}

// Fallback: Poll job status if SSE fails
async function pollJobStatus(jobId: string) {
  const interval = setInterval(async () => {
    try {
      const job = await dashboardService.getJob(jobId);

      updateProgressBar(job.progress);
      updateStatusText(job.current_step);

      if (job.status === 'completed') {
        clearInterval(interval);
        window.location.href = `/results?jobId=${jobId}`;
      }

      if (job.status === 'failed' || job.status === 'cancelled') {
        clearInterval(interval);
        alert('Analysis failed. Please try again.');
      }
    } catch (error) {
      clearInterval(interval);
      displayError(error);
    }
  }, 2000); // Poll every 2 seconds
}

// ============================================================================
// 6. RESULTS PAGE - LOAD RESULTS
// ============================================================================
async function loadResults(jobId: string) {
  try {
    // Get job details
    const job = await handleApiCall(
      () => resultsService.getJob(jobId),
      'Failed to load job details'
    );

    // Display job info
    displayJobInfo(job);

    // Get results (articles with score >= 50)
    const results = await handleApiCall(
      () => resultsService.getJobResults(jobId, 50),
      'Failed to load results'
    );

    // Display articles sorted by relevance_score (backend already sorts)
    displayArticles(results.articles);

    console.log(`Showing ${results.articles.length} of ${results.total} articles`);
  } catch (error) {
    displayError(error);
  }
}

// ============================================================================
// HELPER FUNCTIONS FOR UI
// ============================================================================

function displayArticles(articles: AnalyzedArticle[]) {
  const container = document.getElementById('articles-container');

  articles.forEach(article => {
    const articleCard = `
      <div class="article-card" data-score="${article.relevance_score}">
        <div class="score-badge">${article.relevance_score}</div>
        <h3><a href="${article.url}" target="_blank">${article.title}</a></h3>
        <p class="explanation">${article.relevance_explanation}</p>
        ${article.excerpt ? `<p class="excerpt">${article.excerpt}</p>` : ''}
        <div class="metadata">
          ${article.published_at ? `<span>Published: ${new Date(article.published_at).toLocaleDateString()}</span>` : ''}
        </div>
      </div>
    `;
    container.innerHTML += articleCard;
  });
}

function updateProgressBar(progress: number) {
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');

  progressBar.style.width = `${progress}%`;
  progressText.textContent = `${progress}%`;
}

function updateStatusText(step: string) {
  document.getElementById('status-text').textContent = step;
}

function updateArticleCount(processed: number, total: number) {
  document.getElementById('article-count').textContent =
    `Articles: ${processed} / ${total}`;
}
```

---

## Summary Checklist

Before you start building, make sure you have:

- [ ] Backend deployed to Heroku with DATABASE_URL, JWT_SECRET, OPENAI_API_KEY set
- [ ] Backend URL (e.g., `https://your-app.herokuapp.com`)
- [ ] Updated `API_BASE_URL` in all service files
- [ ] Copied TypeScript types to your project
- [ ] Copied `auth.service.ts`, `dashboard.service.ts`, `results.service.ts`
- [ ] Copied `error-handler.ts`
- [ ] Set `FRONTEND_URL` on backend to match your frontend domain

### Pages to Build:

1. **Login/Register Page**
   - Email, password, name inputs
   - Call `authService.login()` or `authService.register()`
   - Redirect to dashboard on success

2. **Dashboard Page**
   - Load prompt with `getOrCreateDefaultPrompt()`
   - Textarea for editing prompt text
   - "Save" button to update prompt
   - RSS feeds list (add/delete/toggle)
   - "Run Analysis" button
   - Progress indicator (progress bar + status text)

3. **Results Page**
   - Get `jobId` from URL query param
   - Load results with `getJobResults(jobId)`
   - Display articles sorted by score (highest first)
   - Show score badge, title (link to article), explanation
   - Optional: Filter by minimum score

---

## That's Everything You Need!

This guide contains:
- ✅ Complete API documentation with request/response examples
- ✅ All TypeScript types (copy-paste ready)
- ✅ Complete service implementations (auth, dashboard, results)
- ✅ Error handling utilities
- ✅ Real-time progress tracking with SSE
- ✅ Complete workflow examples
- ✅ Deployment instructions

**You now have everything needed to build the frontend without any backend mismatches or confusion!**

Good luck building! 🚀
